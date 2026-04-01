from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Date
from typing import Optional
from datetime import date
from app.core.database import get_db
from app.core.security import get_usuario_actual
from app.models.models import Venta, ItemVenta, Producto

router = APIRouter(prefix="/api/reportes", tags=["reportes"])


@router.get("/productos")
def reporte_productos(
    desde:  Optional[date] = Query(None),
    hasta:  Optional[date] = Query(None),
    tipo:   Optional[str]  = Query(None),
    marca:  Optional[str]  = Query(None),
    orden:  Optional[str]  = Query("cantidad_desc"),
    limite: Optional[int]  = Query(50),
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    """
    Reporte de productos vendidos agrupado por producto.
    Filtra por rango de fechas, tipo y marca.
    La ganancia solo se incluye si el rol es ADMIN.
    orden: cantidad_desc | cantidad_asc | ingresos_desc | ingresos_asc | ganancia_desc | ganancia_asc
    """
    es_admin = usuario.rol == "ADMIN"

    q = db.query(
        ItemVenta.producto_id,
        ItemVenta.nombre_producto,
        func.coalesce(Producto.tipo,  "-").label("tipo"),
        func.coalesce(Producto.marca, "-").label("marca"),
        func.sum(ItemVenta.cantidad).label("cantidad_vendida"),
        func.sum(ItemVenta.subtotal).label("ingresos"),
        func.sum(ItemVenta.precio_costo * ItemVenta.cantidad).label("costo_total"),
    ).join(
        Venta, Venta.id == ItemVenta.venta_id
    ).outerjoin(
        Producto, Producto.id == ItemVenta.producto_id
    ).filter(
        Venta.negocio_id == usuario.negocio_id,
        Venta.anulada == False,
    )

    if desde:
        q = q.filter(cast(Venta.fecha, Date) >= desde)
    if hasta:
        q = q.filter(cast(Venta.fecha, Date) <= hasta)
    if tipo:
        q = q.filter(Producto.tipo == tipo)
    if marca:
        q = q.filter(Producto.marca == marca)

    q = q.group_by(
        ItemVenta.producto_id,
        ItemVenta.nombre_producto,
        Producto.tipo,
        Producto.marca,
    )

    orden_map = {
        "cantidad_desc":  func.sum(ItemVenta.cantidad).desc(),
        "cantidad_asc":   func.sum(ItemVenta.cantidad).asc(),
        "ingresos_desc":  func.sum(ItemVenta.subtotal).desc(),
        "ingresos_asc":   func.sum(ItemVenta.subtotal).asc(),
        "ganancia_desc":  (func.sum(ItemVenta.subtotal) - func.sum(ItemVenta.precio_costo * ItemVenta.cantidad)).desc(),
        "ganancia_asc":   (func.sum(ItemVenta.subtotal) - func.sum(ItemVenta.precio_costo * ItemVenta.cantidad)).asc(),
    }
    q = q.order_by(orden_map.get(orden, func.sum(ItemVenta.cantidad).desc()))
    q = q.limit(max(1, min(limite, 200)))  # entre 1 y 200

    resultado = []
    for r in q.all():
        item = {
            "producto_id":     r.producto_id,
            "nombre_producto": r.nombre_producto,
            "tipo":            r.tipo  or "-",
            "marca":           r.marca or "-",
            "cantidad_vendida": int(r.cantidad_vendida or 0),
            "ingresos":        round(float(r.ingresos or 0), 2),
        }
        if es_admin:
            item["ganancia"] = round(float(r.ingresos or 0) - float(r.costo_total or 0), 2)
        resultado.append(item)

    return resultado


@router.get("/filtros")
def filtros_disponibles(
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    """Tipos y marcas disponibles para poblar los selects del frontend."""
    tipos = db.query(Producto.tipo).filter(
        Producto.negocio_id == usuario.negocio_id,
        Producto.activo == True,
        Producto.tipo.notin_(["-", "", None]),
    ).distinct().all()

    marcas = db.query(Producto.marca).filter(
        Producto.negocio_id == usuario.negocio_id,
        Producto.activo == True,
        Producto.marca.notin_(["-", "", None]),
    ).distinct().all()

    return {
        "tipos":  sorted([t[0] for t in tipos if t[0]]),
        "marcas": sorted([m[0] for m in marcas if m[0]]),
    }
