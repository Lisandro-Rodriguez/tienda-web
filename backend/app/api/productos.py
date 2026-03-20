from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import get_usuario_actual, require_admin
from app.models.models import Producto, CatalogoSEPA
from app.schemas.schemas import ProductoCreate, ProductoUpdate, ProductoOut

router = APIRouter(prefix="/api/productos", tags=["productos"])

@router.get("/", response_model=list[ProductoOut])
def listar_productos(
    busqueda: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    bajo_stock: Optional[bool] = Query(None),
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    q = db.query(Producto).filter(
        Producto.negocio_id == usuario.negocio_id,
        Producto.activo == True
    )
    if busqueda:
        q = q.filter(
            Producto.nombre.ilike(f"%{busqueda}%") |
            Producto.codigo_barras.ilike(f"%{busqueda}%") |
            Producto.marca.ilike(f"%{busqueda}%")
        )
    if tipo:
        q = q.filter(Producto.tipo == tipo)
    if bajo_stock:
        q = q.filter(Producto.stock <= 5)
    return q.order_by(Producto.nombre).all()

@router.get("/buscar/{codigo}", response_model=Optional[ProductoOut])
def buscar_por_codigo(
    codigo: str,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    """Busca en inventario del negocio. Si no está, busca en catálogo SEPA."""
    producto = db.query(Producto).filter(
        Producto.codigo_barras == codigo,
        Producto.negocio_id == usuario.negocio_id,
        Producto.activo == True
    ).first()
    return producto

@router.get("/catalogo/{codigo}")
def buscar_en_catalogo(codigo: str, db: Session = Depends(get_db)):
    """Busca en el catálogo SEPA para autocompletar. Redirige al router de catálogo."""
    from app.models.models import CatalogoSEPA
    item = db.query(CatalogoSEPA).filter(CatalogoSEPA.codigo == codigo).first()
    if not item:
        raise HTTPException(status_code=404, detail="No encontrado en catálogo")
    return {"nombre": item.nombre, "marca": item.marca, "tipo": item.tipo, "precio_ref": item.precio_ref}

@router.get("/tipos")
def listar_tipos(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    tipos = db.query(Producto.tipo).filter(
        Producto.negocio_id == usuario.negocio_id,
        Producto.activo == True,
        Producto.tipo != "-"
    ).distinct().all()
    return [t[0] for t in tipos]

@router.post("/", response_model=ProductoOut)
def crear_producto(
    data: ProductoCreate,
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    existe = db.query(Producto).filter(
        Producto.codigo_barras == data.codigo_barras,
        Producto.negocio_id == usuario.negocio_id,
        Producto.activo == True
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="Código de barras ya existe")

    precio_venta = round(data.precio_costo * (1 + data.margen_ganancia / 100), 2)
    producto = Producto(
        negocio_id=usuario.negocio_id,
        precio_venta=precio_venta,
        **data.model_dump()
    )
    db.add(producto)
    db.commit()
    db.refresh(producto)
    return producto

@router.put("/{producto_id}", response_model=ProductoOut)
def actualizar_producto(
    producto_id: int,
    data: ProductoUpdate,
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    producto = db.query(Producto).filter(
        Producto.id == producto_id,
        Producto.negocio_id == usuario.negocio_id
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(producto, field, value)

    # Recalcular precio venta si cambió costo o margen
    if data.precio_costo or data.margen_ganancia:
        producto.precio_venta = round(
            producto.precio_costo * (1 + producto.margen_ganancia / 100), 2)

    db.commit()
    db.refresh(producto)
    return producto

@router.delete("/{producto_id}")
def eliminar_producto(
    producto_id: int,
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    producto = db.query(Producto).filter(
        Producto.id == producto_id,
        Producto.negocio_id == usuario.negocio_id
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    producto.activo = False
    db.commit()
    return {"ok": True}
