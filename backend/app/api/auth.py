from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verificar_password, crear_token, get_usuario_actual
from app.models.models import Usuario, Negocio
from app.schemas.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(
        Usuario.username == data.username,
        Usuario.negocio_id == data.negocio_id,
        Usuario.activo == True
    ).first()

    if not usuario or not verificar_password(data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos"
        )

    negocio = db.query(Negocio).filter(Negocio.id == data.negocio_id).first()
    token = crear_token({"sub": str(usuario.id), "negocio_id": usuario.negocio_id})

    return TokenResponse(
        access_token=token,
        rol=usuario.rol,
        username=usuario.username,
        negocio_nombre=negocio.nombre if negocio else ""
    )

@router.get("/me")
def me(usuario=Depends(get_usuario_actual)):
    return {"id": usuario.id, "username": usuario.username, "rol": usuario.rol,
            "negocio_id": usuario.negocio_id}
