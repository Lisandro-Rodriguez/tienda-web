from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.core.security import require_admin
from app.models.models import CatalogoSEPA
import io
import csv

router = APIRouter(prefix="/api/catalogo", tags=["catalogo"])

@router.get("/buscar/{codigo}")
def buscar_en_catalogo(codigo: str, db: Session = Depends(get_db)):
    """Busca un producto en el catálogo SEPA por código de barras."""
    item = db.query(CatalogoSEPA).filter(CatalogoSEPA.codigo == codigo).first()
    if not item:
        raise HTTPException(status_code=404, detail="No encontrado en catálogo")
    return {
        "codigo": item.codigo,
        "nombre": item.nombre,
        "marca": item.marca,
        "tipo": item.tipo,
        "precio_ref": item.precio_ref
    }

@router.get("/stats")
def stats_catalogo(db: Session = Depends(get_db)):
    """Devuelve cantidad de productos en el catálogo."""
    total = db.query(CatalogoSEPA).count()
    return {"total": total}

@router.post("/importar")
def importar_sepa(
    archivo: UploadFile = File(...),
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Importa el archivo SEPA al catálogo global.
    Solo admins pueden hacerlo. No afecta el inventario de ningún negocio.
    """
    if not archivo.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser .csv")

    contenido = archivo.file.read().decode('utf-8', errors='replace')
    reader = csv.reader(io.StringIO(contenido), delimiter='|')

    # Leer encabezados
    try:
        headers = [h.strip().lower() for h in next(reader)]
    except StopIteration:
        raise HTTPException(status_code=400, detail="Archivo vacío")

    # Detectar columnas
    def idx(nombre):
        try: return headers.index(nombre)
        except ValueError: return -1

    idx_ean    = idx('id_producto')
    idx_desc   = idx('productos_descripcion')
    idx_marca  = idx('productos_marca')
    idx_precio = idx('productos_precio_lista')

    if idx_ean == -1 or idx_desc == -1:
        raise HTTPException(status_code=400, detail="Formato SEPA no reconocido. Verificá que sea el archivo correcto.")

    importados  = 0
    duplicados  = 0
    errores     = 0
    batch       = []
    BATCH_SIZE  = 500

    def flush_batch():
        nonlocal importados
        if not batch:
            return
        for item in batch:
            existe = db.query(CatalogoSEPA).filter(CatalogoSEPA.codigo == item['codigo']).first()
            if existe:
                # Actualizar precio de referencia
                existe.nombre = item['nombre']
                existe.marca  = item['marca']
                existe.tipo   = item['tipo']
                existe.precio_ref = item['precio_ref']
            else:
                db.add(CatalogoSEPA(**item))
                importados += 1
        db.commit()
        batch.clear()

    for fila in reader:
        try:
            if len(fila) <= idx_desc:
                continue

            ean  = fila[idx_ean].strip()
            desc = fila[idx_desc].strip()

            if not ean or ean == '0' or len(ean) < 7:
                continue

            marca = fila[idx_marca].strip() if idx_marca >= 0 and idx_marca < len(fila) else '-'
            precio_str = fila[idx_precio].strip() if idx_precio >= 0 and idx_precio < len(fila) else '0'

            try:
                precio = float(precio_str.replace(',', '.'))
            except Exception:
                precio = 0.0

            tipo = inferir_tipo(desc)

            batch.append({
                'codigo':     ean,
                'nombre':     capitalizar(desc),
                'marca':      capitalizar(marca) if marca else '-',
                'tipo':       tipo,
                'precio_ref': precio
            })

            if len(batch) >= BATCH_SIZE:
                flush_batch()

        except Exception:
            errores += 1

    flush_batch()

    return {
        "ok": True,
        "importados": importados,
        "errores": errores,
        "total_en_catalogo": db.query(CatalogoSEPA).count()
    }

@router.delete("/limpiar")
def limpiar_catalogo(usuario=Depends(require_admin), db: Session = Depends(get_db)):
    """Limpia el catálogo completo (para reimportar)."""
    cantidad = db.query(CatalogoSEPA).count()
    db.query(CatalogoSEPA).delete()
    db.commit()
    return {"ok": True, "eliminados": cantidad}


# ── Helpers ───────────────────────────────────────────────────────────────────

PALABRAS_TIPO = {
    "Bebida":          ["coca", "pepsi", "sprite", "fanta", "7up", "manaos", "agua", "jugo",
                        "cerveza", "vino", "fernet", "cunnington", "schweppes", "gatorade"],
    "Golosina/Snack":  ["alfajor", "chocol", "caramel", "gallet", "chicle", "snack",
                        "papa frita", "maiz", "palomita", "oblea"],
    "Lacteo":          ["leche", "yogur", "queso", "mantec", "crema", "ricota"],
    "Limpieza/Higiene":["jabon", "shampoo", "desodor", "dentifric", "papel", "servillet",
                        "detergente", "lavandina", "suaviz", "pañal", "toalla"],
    "Infusion":        ["cafe", "yerba", "mate", "te ", "tostado", "cacao"],
    "Almacen":         ["arroz", "fideos", "harina", "aceite", "azucar", "sal",
                        "vinagre", "mayones", "ketchup", "polenta", "lentejas"],
    "Cigarrillo":      ["cigarr", "tabaco"],
    "Varios":          ["pila", "fosforo", "encendedor", "vela"],
}

def inferir_tipo(descripcion: str) -> str:
    d = descripcion.lower()
    for tipo, palabras in PALABRAS_TIPO.items():
        for p in palabras:
            if p in d:
                return tipo
    return "General"

def capitalizar(texto: str) -> str:
    if not texto:
        return texto
    return texto[0].upper() + texto[1:].lower()
