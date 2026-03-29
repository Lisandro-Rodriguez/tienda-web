from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import secrets
import httpx

from app.core.database import get_db
from app.core.security import verificar_password, hashear_password, crear_token, get_usuario_actual
from app.core.config import settings
from app.models.models import Usuario, Negocio, TokenRecuperacion
from app.schemas.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

RESEND_API_KEY = getattr(settings, 'RESEND_API_KEY', '')
EMAIL_FROM = "Sistema Tienda <onboarding@resend.dev>"
EMAIL_SOPORTE = getattr(settings, 'EMAIL_SOPORTE', 'soporte@municipalidad.gob.ar')


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
    token = crear_token({"sub": str(usuario.id)})

    return {
        "access_token": token,
        "token_type": "bearer",
        "rol": usuario.rol,
        "username": usuario.username,
        "negocio_nombre": negocio.nombre if negocio else ""
    }


@router.get("/me")
def me(usuario=Depends(get_usuario_actual)):
    return {
        "id": usuario.id,
        "username": usuario.username,
        "rol": usuario.rol,
        "negocio_id": usuario.negocio_id
    }


# ─── Recuperación de contraseña ───────────────────────────────────────────────

@router.post("/recuperar")
def solicitar_recuperacion(data: dict, db: Session = Depends(get_db)):
    email = data.get("email", "").strip().lower()
    negocio_id = data.get("negocio_id")

    if not email or not negocio_id:
        raise HTTPException(status_code=400, detail="Email y negocio son requeridos")

    # Verificar que el negocio existe
    negocio = db.query(Negocio).filter(
        Negocio.id == negocio_id,
        Negocio.activo == True
    ).first()

    if not negocio:
        raise HTTPException(status_code=404, detail="Negocio no encontrado")

    # Verificar que el email coincide con el registrado
    if not negocio.email or negocio.email.strip() == "":
        raise HTTPException(
            status_code=400,
            detail=f"Este negocio no tiene un email registrado. Contactá a soporte: {EMAIL_SOPORTE}"
        )

    if negocio.email.strip().lower() != email:
        raise HTTPException(
            status_code=400,
            detail=f"El email ingresado no coincide con el registrado para este negocio. Contactá a soporte: {EMAIL_SOPORTE}"
        )

    # Email coincide — buscar admin
    admin = db.query(Usuario).filter(
        Usuario.negocio_id == negocio_id,
        Usuario.rol == "ADMIN",
        Usuario.activo == True
    ).first()

    if not admin:
        raise HTTPException(status_code=400, detail="No se encontró un administrador para este negocio")

    # Invalidar tokens anteriores
    db.query(TokenRecuperacion).filter(
        TokenRecuperacion.usuario_id == admin.id,
        TokenRecuperacion.usado == False
    ).update({"usado": True})

    # Crear token nuevo
    token_str = secrets.token_urlsafe(32)
    token_rec = TokenRecuperacion(
        usuario_id=admin.id,
        token=token_str,
        expira_en=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db.add(token_rec)
    db.commit()

    # Enviar email
    if RESEND_API_KEY:
        exito = _enviar_email_recuperacion(email, negocio.nombre, token_str)
        if not exito:
            raise HTTPException(
                status_code=500,
                detail=f"El email está registrado pero hubo un error al enviarlo. Contactá a soporte: {EMAIL_SOPORTE}"
            )
    else:
        # Sin API key configurada — informar claramente
        raise HTTPException(
            status_code=503,
            detail=f"El envío de emails no está configurado aún. Contactá a soporte: {EMAIL_SOPORTE}"
        )

    return {"ok": True, "mensaje": "Te enviamos un link de recuperación. Revisá tu bandeja de entrada y la carpeta de spam."}


@router.post("/resetear")
def resetear_password(data: dict, db: Session = Depends(get_db)):
    token_str = data.get("token", "")
    password_nuevo = data.get("password_nuevo", "")

    if not token_str or not password_nuevo:
        raise HTTPException(status_code=400, detail="Token y contraseña son requeridos")

    if len(password_nuevo) < 4:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 4 caracteres")

    token_rec = db.query(TokenRecuperacion).filter(
        TokenRecuperacion.token == token_str,
        TokenRecuperacion.usado == False
    ).first()

    if not token_rec:
        raise HTTPException(status_code=400, detail="El link es inválido o ya fue usado")

    if token_rec.expira_en.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El link expiró. Solicitá uno nuevo.")

    usuario = db.query(Usuario).filter(Usuario.id == token_rec.usuario_id).first()
    usuario.password_hash = hashear_password(password_nuevo)
    token_rec.usado = True
    db.commit()

    return {"ok": True, "mensaje": "Contraseña actualizada correctamente"}


@router.get("/verificar-token/{token}")
def verificar_token(token: str, db: Session = Depends(get_db)):
    token_rec = db.query(TokenRecuperacion).filter(
        TokenRecuperacion.token == token,
        TokenRecuperacion.usado == False
    ).first()

    if not token_rec or token_rec.expira_en.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El link es inválido o expiró")

    return {"ok": True}


def _enviar_email_recuperacion(email: str, negocio_nombre: str, token: str) -> bool:
    frontend_url = getattr(settings, 'FRONTEND_URL', 'https://tienda-web-tawny.vercel.app')
    link = f"{frontend_url}/nueva-password?token={token}"

    html = f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <h2 style="font-size: 1.4rem; color: #111; margin-bottom: 8px;">Recuperar contraseña</h2>
      <p style="color: #666; margin-bottom: 24px;">
        Recibimos una solicitud para restablecer la contraseña del negocio <strong>{negocio_nombre}</strong>.
      </p>
      <a href="{link}" style="display:inline-block;background:#10b981;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:0.9rem;margin-bottom:24px;">
        Restablecer contraseña
      </a>
      <p style="color:#999;font-size:0.8rem;">Este link expira en 2 horas. Si no solicitaste este cambio, ignorá este email.</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="color:#bbb;font-size:0.75rem;">Sistema Tienda — Municipalidad de Salta</p>
    </div>
    """

    try:
        r = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "from": EMAIL_FROM,
                "to": [email],
                "subject": f"Recuperar contraseña — {negocio_nombre}",
                "html": html
            },
            timeout=10
        )
        return r.status_code in (200, 201)
    except Exception as e:
        print(f"Error enviando email: {e}")
        return False
