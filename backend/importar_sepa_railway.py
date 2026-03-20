import csv
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres:NuevaClaveSegura2026!@autorack.proxy.rlwy.net:41777/railway"
RUTA_CSV     = r"C:\Users\rodri\OneDrive\Documentos\Gestión Tienda Web\productos_sepa_completo.csv"
BATCH_SIZE   = 1000

PALABRAS_TIPO = {
    "Bebida":          ["coca","pepsi","sprite","fanta","7up","manaos","agua","jugo","cerveza","vino","fernet"],
    "Golosina/Snack":  ["alfajor","chocol","caramel","gallet","chicle","snack","papa frita","maiz"],
    "Lacteo":          ["leche","yogur","queso","mantec","crema","ricota"],
    "Limpieza/Higiene":["jabon","shampoo","desodor","dentifric","papel","detergente","lavandina"],
    "Infusion":        ["cafe","yerba","mate","te ","tostado","cacao"],
    "Almacen":         ["arroz","fideos","harina","aceite","azucar","sal","vinagre","mayones","ketchup"],
    "Cigarrillo":      ["cigarr","tabaco"],
    "Varios":          ["pila","fosforo","encendedor","vela"],
}

def inferir_tipo(desc):
    d = desc.lower()
    for tipo, palabras in PALABRAS_TIPO.items():
        for p in palabras:
            if p in d: return tipo
    return "General"

def capitalizar(texto):
    if not texto: return texto
    return texto[0].upper() + texto[1:].lower()

def flush(conn, batch):
    conn.execute(text("""
        INSERT INTO catalogo_sepa (codigo, nombre, marca, tipo, precio_ref)
        VALUES (:codigo, :nombre, :marca, :tipo, :precio_ref)
        ON CONFLICT (codigo) DO UPDATE SET
            nombre=EXCLUDED.nombre, marca=EXCLUDED.marca,
            tipo=EXCLUDED.tipo, precio_ref=EXCLUDED.precio_ref
    """), batch)
    conn.commit()

def importar():
    print("Conectando a Railway...")
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS catalogo_sepa (
                id SERIAL PRIMARY KEY,
                codigo VARCHAR(50) UNIQUE,
                nombre VARCHAR(200) NOT NULL,
                marca VARCHAR(80) DEFAULT '-',
                tipo VARCHAR(80) DEFAULT '-',
                precio_ref FLOAT DEFAULT 0
            )
        """))
        conn.commit()
        total_actual = conn.execute(text("SELECT COUNT(*) FROM catalogo_sepa")).scalar()
        print(f"Productos actuales: {total_actual:,}")

    print(f"\nLeyendo archivo...")
    print("Esto puede tardar 20-40 minutos...\n")

    importados = 0
    errores = 0
    batch = []

    with open(RUTA_CSV, 'r', encoding='utf-8', errors='replace') as f:
        reader = csv.reader(f, delimiter='|')
        headers = [h.strip().lower() for h in next(reader)]

        def idx(n):
            try: return headers.index(n)
            except ValueError: return -1

        idx_ean    = idx('id_producto')
        idx_desc   = idx('productos_descripcion')
        idx_marca  = idx('productos_marca')
        idx_precio = idx('productos_precio_lista')

        if idx_ean == -1 or idx_desc == -1:
            print("ERROR: Formato no reconocido.")
            return

        with engine.connect() as conn:
            for fila in reader:
                try:
                    if len(fila) <= idx_desc: continue
                    ean  = fila[idx_ean].strip()
                    desc = fila[idx_desc].strip()
                    if not ean or ean == '0' or len(ean) < 7: continue
                    marca = fila[idx_marca].strip() if idx_marca >= 0 and idx_marca < len(fila) else '-'
                    precio_str = fila[idx_precio].strip() if idx_precio >= 0 and idx_precio < len(fila) else '0'
                    try: precio = float(precio_str.replace(',', '.'))
                    except: precio = 0.0
                    batch.append({'codigo': ean, 'nombre': capitalizar(desc),
                                  'marca': capitalizar(marca) or '-',
                                  'tipo': inferir_tipo(desc), 'precio_ref': precio})
                    if len(batch) >= BATCH_SIZE:
                        flush(conn, batch)
                        importados += len(batch)
                        batch = []
                        print(f"  {importados:,} importados...", end='\r')
                except: errores += 1

            if batch:
                flush(conn, batch)
                importados += len(batch)

    with engine.connect() as conn:
        total_final = conn.execute(text("SELECT COUNT(*) FROM catalogo_sepa")).scalar()

    print(f"\n{'='*40}")
    print(f"Completado! Importados: {importados:,} | Errores: {errores:,}")
    print(f"Total en catalogo: {total_final:,}")
    print(f"{'='*40}")

if __name__ == '__main__':
    importar()
