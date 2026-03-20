from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_usuario_actual, require_admin
from app.models.models import UmbralStock, Producto

router = APIRouter(prefix="/api/stock", tags=["stock"])

class UmbralIn(BaseModel):
    tipo: str        # global | tipo | marca | producto
    referencia: str = ""
    umbral: int

class UmbralOut(BaseModel):
    id: int
    tipo: str
    referencia: str
    umbral: int
    class Config: from_attributes = True

@router.get("/umbrales", response_model=List[UmbralOut])
def listar_umbrales(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    return db.query(UmbralStock).filter(UmbralStock.negocio_id == usuario.negocio_id).all()

@router.post("/umbrales", response_model=UmbralOut)
def guardar_umbral(
    data: UmbralIn,
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Buscar si ya existe
    existente = db.query(UmbralStock).filter(
        UmbralStock.negocio_id == usuario.negocio_id,
        UmbralStock.tipo == data.tipo,
        UmbralStock.referencia == data.referencia
    ).first()

    if existente:
        existente.umbral = data.umbral
        db.commit()
        db.refresh(existente)
        return existente

    nuevo = UmbralStock(
        negocio_id=usuario.negocio_id,
        tipo=data.tipo,
        referencia=data.referencia,
        umbral=data.umbral
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.delete("/umbrales/{umbral_id}")
def eliminar_umbral(
    umbral_id: int,
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    u = db.query(UmbralStock).filter(
        UmbralStock.id == umbral_id,
        UmbralStock.negocio_id == usuario.negocio_id
    ).first()
    if not u:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(u)
    db.commit()
    return {"ok": True}

@router.get("/calcular/{producto_id}")
def calcular_umbral(
    producto_id: int,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    """Devuelve el umbral efectivo para un producto dado."""
    producto = db.query(Producto).filter(
        Producto.id == producto_id,
        Producto.negocio_id == usuario.negocio_id
    ).first()
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    umbrales = db.query(UmbralStock).filter(
        UmbralStock.negocio_id == usuario.negocio_id
    ).all()

    umbral = _calcular_umbral(producto, umbrales)
    return {"umbral": umbral, "bajo_stock": producto.stock <= umbral}

def _calcular_umbral(producto, umbrales):
    """Prioridad: producto individual > tipo > marca > global > default 5"""
    # 1. Producto individual
    for u in umbrales:
        if u.tipo == "producto" and u.referencia == producto.codigo_barras:
            return u.umbral
    # 2. Por tipo
    for u in umbrales:
        if u.tipo == "tipo" and u.referencia == producto.tipo:
            return u.umbral
    # 3. Por marca
    for u in umbrales:
        if u.tipo == "marca" and u.referencia == producto.marca:
            return u.umbral
    # 4. Global
    for u in umbrales:
        if u.tipo == "global":
            return u.umbral
    return 5
