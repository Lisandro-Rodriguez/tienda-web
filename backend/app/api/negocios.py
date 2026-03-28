from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hashear_password, verificar_password, get_usuario_actual, require_admin
from app.models.models import Negocio, Usuario
from app.schemas.schemas import NegocioCreate, NegocioUpdate, NegocioOut, UsuarioCreate, UsuarioOut, CambiarPasswordRequest

router = APIRouter(prefix="/api/negocios", tags=["negocios"])

@router.post("/registro", response_model=NegocioOut)
def registrar_negocio(data: NegocioCreate, db: Session = Depends(get_db)):
    """Registra un nuevo negocio con su usuario admin. Endpoint público."""
    if db.query(Negocio).filter(Negocio.nombre == data.nombre).first():
        raise HTTPException(status_code=400, detail="Ya existe un negocio con ese nombre")
    if data.email:
        if db.query(Negocio).filter(Negocio.email == data.email, Negocio.email != "").first():
            raise HTTPException(status_code=400, detail="Ya existe un negocio registrado con ese email")

    negocio = Negocio(
        nombre=data.nombre, direccion=data.direccion,
        cuit=data.cuit, telefono=data.telefono, email=data.email
    )
    db.add(negocio)
    db.flush()

    admin = Usuario(
        negocio_id=negocio.id,
        username=data.admin_username,
        password_hash=hashear_password(data.admin_password),
        rol="ADMIN"
    )
    db.add(admin)
    db.commit()
    db.refresh(negocio)
    return negocio

@router.get("/", response_model=list[NegocioOut])
def listar_negocios(db: Session = Depends(get_db)):
    """Lista negocios activos — para el selector de login."""
    return db.query(Negocio).filter(Negocio.activo == True).all()

@router.get("/mi-negocio", response_model=NegocioOut)
def mi_negocio(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    negocio = db.query(Negocio).filter(Negocio.id == usuario.negocio_id).first()
    if not negocio:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")
    return negocio

@router.put("/mi-negocio", response_model=NegocioOut)
def actualizar_negocio(
    data: NegocioUpdate,
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    negocio = db.query(Negocio).filter(Negocio.id == usuario.negocio_id).first()
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(negocio, field, value)
    db.commit()
    db.refresh(negocio)
    return negocio

# ─── Cambiar contraseña propia ────────────────────────────────────────────────

@router.put("/mi-password")
def cambiar_password(
    data: CambiarPasswordRequest,
    usuario=Depends(get_usuario_actual),  # cualquier rol puede cambiar la suya
    db: Session = Depends(get_db)
):
    u = db.query(Usuario).filter(Usuario.id == usuario.id).first()

    if not verificar_password(data.password_actual, u.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta")

    if len(data.password_nuevo) < 4:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe tener al menos 4 caracteres")

    u.password_hash = hashear_password(data.password_nuevo)
    db.commit()
    return {"ok": True}

# ─── Usuarios del negocio ─────────────────────────────────────────────────────

@router.get("/usuarios", response_model=list[UsuarioOut])
def listar_usuarios(usuario=Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(Usuario).filter(Usuario.negocio_id == usuario.negocio_id).all()

@router.post("/usuarios", response_model=UsuarioOut)
def crear_usuario(
    data: UsuarioCreate,
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    existe = db.query(Usuario).filter(
        Usuario.username == data.username,
        Usuario.negocio_id == usuario.negocio_id
    ).first()
    if existe:
        raise HTTPException(status_code=400, detail="El usuario ya existe")

    nuevo = Usuario(
        negocio_id=usuario.negocio_id,
        username=data.username,
        password_hash=hashear_password(data.password),
        rol=data.rol
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.delete("/usuarios/{usuario_id}")
def eliminar_usuario(
    usuario_id: int,
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    u = db.query(Usuario).filter(
        Usuario.id == usuario_id,
        Usuario.negocio_id == usuario.negocio_id
    ).first()
    if not u:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if u.id == usuario.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a vos mismo")
    u.activo = False
    db.commit()
    return {"ok": True}
