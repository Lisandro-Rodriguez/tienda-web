from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, cast, Date
from typing import Optional
from datetime import date, timedelta, datetime, timezone
from app.core.database import get_db
from app.core.security import get_usuario_actual, require_admin
from app.models.models import Venta, ItemVenta, Producto, Cliente, MovimientoCliente, CierreCaja
from app.schemas.schemas import VentaCreate, CierreCreate, CierreOut

router = APIRouter(prefix="/api/ventas", tags=["ventas"])


def venta_to_out(venta: Venta) -> dict:
    return {
        "id": venta.id,
        "total": venta.total,
        "costo_total": venta.costo_total,
        "metodo_pago": venta.metodo_pago,
        "fecha": venta.fecha,
        "cajero_username": venta.cajero.username if venta.cajero else None,
        "anulada": venta.anulada,
        "anulada_por": venta.anulada_por.username if venta.anulada_por else None,
        "anulada_en": venta.anulada_en,
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


def query_base(db, negocio_id):
    """Query base con todas las relaciones cargadas."""
    return db.query(Venta).options(
        joinedload(Venta.cajero),
        joinedload(Venta.items),
        joinedload(Venta.anulada_por),
    ).filter(Venta.negocio_id == negocio_id)


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
        metodo_pago=data.metodo_pago,
        anulada=False,
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
            db.add(MovimientoCliente(
                cliente_id=data.cliente_id,
                tipo="FIADO",
                monto=round(total, 2),
                detalle=f"Venta #{venta.id}"
            ))

    db.commit()

    venta = query_base(db, usuario.negocio_id).filter(Venta.id == venta.id).first()
    return venta_to_out(venta)


@router.get("/")
def listar_ventas(
    periodo: Optional[str] = Query("hoy"),
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    # Solo ventas activas (no anuladas)
    q = query_base(db, usuario.negocio_id).filter(Venta.anulada == False)

    hoy = date.today()
    if periodo == "hoy":
        q = q.filter(cast(Venta.fecha, Date) == hoy)
    elif periodo == "semana":
        q = q.filter(Venta.fecha >= hoy - timedelta(days=7))
    elif periodo == "mes":
        q = q.filter(Venta.fecha >= hoy - timedelta(days=30))

    return [venta_to_out(v) for v in q.order_by(Venta.fecha.desc()).limit(200).all()]


@router.get("/anuladas")
def listar_anuladas(
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Solo admins pueden ver el historial de ventas anuladas."""
    ventas = query_base(db, usuario.negocio_id).options(
        joinedload(Venta.cliente)
    ).filter(
        Venta.anulada == True
    ).order_by(Venta.anulada_en.desc()).limit(200).all()

    result = []
    for v in ventas:
        d = venta_to_out(v)
        d["cliente_nombre"] = v.cliente.nombre if v.cliente else None
        result.append(d)
    return result


@router.get("/dashboard")
def dashboard(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    hoy = date.today()
    nid = usuario.negocio_id

    # Excluir ventas anuladas de todos los cálculos
    def stats_query(filtro_fecha):
        return db.query(
            func.coalesce(func.sum(Venta.total), 0),
            func.coalesce(func.sum(Venta.costo_total), 0)
        ).filter(
            Venta.negocio_id == nid,
            Venta.anulada == False,
            filtro_fecha
        ).first()

    hoy_stats    = stats_query(cast(Venta.fecha, Date) == hoy)
    semana_stats = stats_query(Venta.fecha >= hoy - timedelta(days=7))
    mes_stats    = stats_query(Venta.fecha >= hoy - timedelta(days=30))

    total_prod = db.query(func.count(Producto.id)).filter(
        Producto.negocio_id == nid, Producto.activo == True).scalar()
    bajo_stock = db.query(func.count(Producto.id)).filter(
        Producto.negocio_id == nid, Producto.activo == True, Producto.stock <= 5).scalar()
    total_clientes = db.query(func.count(Cliente.id)).filter(
        Cliente.negocio_id == nid, Cliente.activo == True).scalar()
    con_deuda = db.query(func.count(Cliente.id)).filter(
        Cliente.negocio_id == nid, Cliente.activo == True, Cliente.deuda_total > 0).scalar()

    def calc(r):
        return {"ventas": round(float(r[0]), 2), "ganancia": round(float(r[0]) - float(r[1]), 2)}

    return {
        **{f"hoy_{k}": v for k, v in calc(hoy_stats).items()},
        **{f"semana_{k}": v for k, v in calc(semana_stats).items()},
        **{f"mes_{k}": v for k, v in calc(mes_stats).items()},
        "total_productos": total_prod,
        "productos_bajo_stock": bajo_stock,
        "total_clientes": total_clientes,
        "clientes_con_deuda": con_deuda,
    }


@router.post("/cierre", response_model=CierreOut)
def cerrar_caja(
    data: CierreCreate,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    # Solo ventas activas en el cierre
    ventas_abiertas = db.query(Venta).filter(
        Venta.negocio_id == usuario.negocio_id,
        Venta.estado_caja == "ABIERTA",
        Venta.anulada == False
    ).all()

    efectivo = sum(v.total for v in ventas_abiertas if v.metodo_pago == "Efectivo")
    digital  = sum(v.total for v in ventas_abiertas if v.metodo_pago in ("Tarjeta", "Transferencia"))
    fiadas   = sum(v.total for v in ventas_abiertas if v.metodo_pago == "Fiado")
    total    = sum(v.total for v in ventas_abiertas)

    cierre = CierreCaja(
        negocio_id=usuario.negocio_id,
        cajero=usuario.username,
        fondo_inicial=data.fondo_inicial,
        ventas_efectivo=round(efectivo, 2),
        ventas_digital=round(digital, 2),
        ventas_fiadas=round(fiadas, 2),
        pagos_fiado=0,
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


# ── Anular venta — marca como anulada, NO borra ───────────────────────────────

@router.delete("/{venta_id}")
def anular_venta(
    venta_id: int,
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    venta = db.query(Venta).options(joinedload(Venta.items)).filter(
        Venta.id == venta_id,
        Venta.negocio_id == usuario.negocio_id
    ).first()

    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    if venta.anulada:
        raise HTTPException(status_code=400, detail="Esta venta ya fue anulada")

    # Devolver stock
    for item in venta.items:
        if item.producto_id:
            producto = db.query(Producto).filter(Producto.id == item.producto_id).first()
            if producto:
                producto.stock += item.cantidad

    # Si era fiado, reducir deuda (sin quedar negativo)
    if venta.metodo_pago == "Fiado" and venta.cliente_id:
        cliente = db.query(Cliente).filter(Cliente.id == venta.cliente_id).first()
        if cliente:
            deuda_anterior = cliente.deuda_total
            cliente.deuda_total = round(max(0, cliente.deuda_total - venta.total), 2)
            monto_revertido = round(deuda_anterior - cliente.deuda_total, 2)
            if monto_revertido > 0:
                db.add(MovimientoCliente(
                    cliente_id=cliente.id,
                    tipo="ABONO",
                    monto=monto_revertido,
                    detalle=f"Anulación venta #{venta.id} por {usuario.username}"
                ))

    # Marcar como anulada — NO borrar
    venta.anulada = True
    venta.anulada_por_id = usuario.id
    venta.anulada_en = datetime.now(timezone.utc)

    db.commit()
    return {"ok": True, "mensaje": "Venta anulada correctamente"}


# ── Obtener venta por ID ──────────────────────────────────────────────────────

@router.get("/{venta_id}")
def obtener_venta(
    venta_id: int,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    venta = db.query(Venta).options(
        joinedload(Venta.cajero),
        joinedload(Venta.items),
        joinedload(Venta.cliente),
        joinedload(Venta.anulada_por),
    ).filter(
        Venta.id == venta_id,
        Venta.negocio_id == usuario.negocio_id
    ).first()

    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")

    result = venta_to_out(venta)
    result["cliente_nombre"] = venta.cliente.nombre if venta.cliente else None
    return result
