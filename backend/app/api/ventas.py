from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, cast, Date
from typing import Optional
from datetime import date, timedelta
from app.core.database import get_db
from app.core.security import get_usuario_actual
from app.models.models import Venta, ItemVenta, Producto, Cliente, MovimientoCliente
from app.schemas.schemas import VentaCreate, VentaOut, CierreCreate, CierreOut
from app.models.models import CierreCaja

router = APIRouter(prefix="/api/ventas", tags=["ventas"])


def venta_to_out(venta: Venta) -> dict:
    """Serializa una Venta incluyendo el username del cajero."""
    return {
        "id": venta.id,
        "total": venta.total,
        "costo_total": venta.costo_total,
        "metodo_pago": venta.metodo_pago,
        "fecha": venta.fecha,
        "cajero_username": venta.cajero.username if venta.cajero else None,
        "items": [
            {
                "id": item.id,
                "nombre_producto": item.nombre_producto,
                "cantidad": item.cantidad,
                "precio_unitario": item.precio_unitario,
                "subtotal": item.subtotal,
            }
            for item in venta.items
        ],
    }


@router.post("/")
def registrar_venta(
    data: VentaCreate,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    total = 0
    costo_total = 0
    items_db = []

    for item in data.items:
        subtotal = round(item.precio_unitario * item.cantidad, 2)
        total += subtotal
        costo_total += item.precio_costo * item.cantidad

        item_db = ItemVenta(
            producto_id=item.producto_id,
            nombre_producto=item.nombre_producto,
            cantidad=item.cantidad,
            precio_unitario=item.precio_unitario,
            precio_costo=item.precio_costo,
            subtotal=subtotal
        )
        items_db.append(item_db)

        if item.producto_id:
            producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
            if producto:
                producto.stock = max(0, producto.stock - item.cantidad)

    venta = Venta(
        negocio_id=usuario.negocio_id,
        cajero_id=usuario.id,
        cliente_id=data.cliente_id,
        total=round(total, 2),
        costo_total=round(costo_total, 2),
        metodo_pago=data.metodo_pago
    )
    db.add(venta)
    db.flush()

    for item_db in items_db:
        item_db.venta_id = venta.id
        db.add(item_db)

    if data.metodo_pago == "Fiado" and data.cliente_id:
        cliente = db.query(Cliente).filter(Cliente.id == data.cliente_id).first()
        if cliente:
            cliente.deuda_total += round(total, 2)
            mov = MovimientoCliente(
                cliente_id=data.cliente_id,
                tipo="FIADO",
                monto=round(total, 2),
                detalle=f"Venta #{venta.id}"
            )
            db.add(mov)

    db.commit()

    venta = db.query(Venta).options(
        joinedload(Venta.cajero),
        joinedload(Venta.items)
    ).filter(Venta.id == venta.id).first()

    return venta_to_out(venta)


@router.get("/")
def listar_ventas(
    periodo: Optional[str] = Query("hoy"),
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    q = db.query(Venta).options(
        joinedload(Venta.cajero),
        joinedload(Venta.items)
    ).filter(Venta.negocio_id == usuario.negocio_id)

    hoy = date.today()
    if periodo == "hoy":
        q = q.filter(cast(Venta.fecha, Date) == hoy)
    elif periodo == "semana":
        q = q.filter(Venta.fecha >= hoy - timedelta(days=7))
    elif periodo == "mes":
        q = q.filter(Venta.fecha >= hoy - timedelta(days=30))

    ventas = q.order_by(Venta.fecha.desc()).limit(200).all()
    return [venta_to_out(v) for v in ventas]


@router.get("/{venta_id}")
def obtener_venta(
    venta_id: int,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    venta = db.query(Venta).options(
        joinedload(Venta.cajero),
        joinedload(Venta.items),
        joinedload(Venta.cliente)
    ).filter(
        Venta.id == venta_id,
        Venta.negocio_id == usuario.negocio_id  # seguridad multi-tenant
    ).first()

    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    result = venta_to_out(venta)
    # Agregar nombre del cliente si aplica
    result["cliente_nombre"] = venta.cliente.nombre if venta.cliente else None
    return result


@router.get("/dashboard")
def dashboard(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    hoy = date.today()
    nid = usuario.negocio_id

    hoy_stats = db.query(
        func.coalesce(func.sum(Venta.total), 0),
        func.coalesce(func.sum(Venta.costo_total), 0)
    ).filter(Venta.negocio_id == nid, cast(Venta.fecha, Date) == hoy).first()

    semana_stats = db.query(
        func.coalesce(func.sum(Venta.total), 0),
        func.coalesce(func.sum(Venta.costo_total), 0)
    ).filter(Venta.negocio_id == nid, Venta.fecha >= hoy - timedelta(days=7)).first()

    mes_stats = db.query(
        func.coalesce(func.sum(Venta.total), 0),
        func.coalesce(func.sum(Venta.costo_total), 0)
    ).filter(Venta.negocio_id == nid, Venta.fecha >= hoy - timedelta(days=30)).first()

    total_prod = db.query(func.count(Producto.id)).filter(
        Producto.negocio_id == nid, Producto.activo == True).scalar()
    bajo_stock = db.query(func.count(Producto.id)).filter(
        Producto.negocio_id == nid, Producto.activo == True, Producto.stock <= 5).scalar()
    total_clientes = db.query(func.count(Cliente.id)).filter(
        Cliente.negocio_id == nid, Cliente.activo == True).scalar()
    con_deuda = db.query(func.count(Cliente.id)).filter(
        Cliente.negocio_id == nid, Cliente.activo == True, Cliente.deuda_total > 0).scalar()

    def calc(r): return {"ventas": round(float(r[0]), 2), "ganancia": round(float(r[0]) - float(r[1]), 2)}

    return {
        **{f"hoy_{k}": v for k, v in calc(hoy_stats).items()},
        **{f"semana_{k}": v for k, v in calc(semana_stats).items()},
        **{f"mes_{k}": v for k, v in calc(mes_stats).items()},
        "total_productos": total_prod,
        "productos_bajo_stock": bajo_stock,
        "total_clientes": total_clientes,
        "clientes_con_deuda": con_deuda,
    }


# ─── Cierre de caja ───────────────────────────────────────────────────────────

@router.post("/cierre", response_model=CierreOut)
def cerrar_caja(
    data: CierreCreate,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    ventas_abiertas = db.query(Venta).filter(
        Venta.negocio_id == usuario.negocio_id,
        Venta.estado_caja == "ABIERTA"
    ).all()

    efectivo = sum(v.total for v in ventas_abiertas if v.metodo_pago == "Efectivo")
    digital  = sum(v.total for v in ventas_abiertas if v.metodo_pago in ("Tarjeta", "Transferencia"))
    fiadas   = sum(v.total for v in ventas_abiertas if v.metodo_pago == "Fiado")
    total    = sum(v.total for v in ventas_abiertas)

    pagos_fiado = 0

    cierre = CierreCaja(
        negocio_id=usuario.negocio_id,
        cajero=usuario.username,
        fondo_inicial=data.fondo_inicial,
        ventas_efectivo=round(efectivo, 2),
        ventas_digital=round(digital, 2),
        ventas_fiadas=round(fiadas, 2),
        pagos_fiado=round(pagos_fiado, 2),
        total_facturado=round(total, 2)
    )
    db.add(cierre)

    for v in ventas_abiertas:
        v.estado_caja = "CERRADA"

    db.commit()
    db.refresh(cierre)
    return cierre


@router.get("/cierres", response_model=list[CierreOut])
def historial_cierres(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    return db.query(CierreCaja).filter(
        CierreCaja.negocio_id == usuario.negocio_id
    ).order_by(CierreCaja.fecha.desc()).limit(50).all()
