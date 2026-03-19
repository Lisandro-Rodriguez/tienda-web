from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_usuario_actual
from app.models.models import Cliente, MovimientoCliente
from app.schemas.schemas import ClienteCreate, ClienteOut, MovimientoCreate, MovimientoOut

router = APIRouter(prefix="/api/clientes", tags=["clientes"])

@router.get("/", response_model=list[ClienteOut])
def listar_clientes(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    return db.query(Cliente).filter(
        Cliente.negocio_id == usuario.negocio_id,
        Cliente.activo == True
    ).order_by(Cliente.nombre).all()

@router.post("/", response_model=ClienteOut)
def crear_cliente(
    data: ClienteCreate,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    cliente = Cliente(negocio_id=usuario.negocio_id, **data.model_dump())
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente

@router.get("/{cliente_id}/movimientos", response_model=list[MovimientoOut])
def movimientos(cliente_id: int, usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.negocio_id == usuario.negocio_id
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return db.query(MovimientoCliente).filter(
        MovimientoCliente.cliente_id == cliente_id
    ).order_by(MovimientoCliente.fecha.desc()).all()

@router.post("/{cliente_id}/movimientos", response_model=ClienteOut)
def registrar_movimiento(
    cliente_id: int,
    data: MovimientoCreate,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.negocio_id == usuario.negocio_id
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    mov = MovimientoCliente(cliente_id=cliente_id, **data.model_dump())
    db.add(mov)

    if data.tipo == "ABONO":
        cliente.deuda_total = max(0, cliente.deuda_total - data.monto)
    elif data.tipo == "FIADO":
        cliente.deuda_total += data.monto

    db.commit()
    db.refresh(cliente)
    return cliente

@router.delete("/{cliente_id}")
def eliminar_cliente(
    cliente_id: int,
    usuario=Depends(get_usuario_actual),
    db: Session = Depends(get_db)
):
    cliente = db.query(Cliente).filter(
        Cliente.id == cliente_id,
        Cliente.negocio_id == usuario.negocio_id
    ).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="No encontrado")
    if cliente.deuda_total > 0:
        raise HTTPException(status_code=400, detail="El cliente tiene deuda pendiente")
    cliente.activo = False
    db.commit()
    return {"ok": True}
