from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# ─── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str
    negocio_id: int

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    rol: str
    username: str
    negocio_nombre: str

# ─── Negocio ──────────────────────────────────────────────────────────────────

class NegocioCreate(BaseModel):
    nombre: str
    direccion: str = ""
    cuit: str = ""
    telefono: str = ""
    email: str = ""
    admin_username: str
    admin_password: str

class NegocioUpdate(BaseModel):
    nombre: Optional[str] = None
    direccion: Optional[str] = None
    cuit: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    mensaje_ticket: Optional[str] = None

class NegocioOut(BaseModel):
    id: int
    nombre: str
    direccion: str
    cuit: str
    telefono: str
    email: str
    mensaje_ticket: str
    class Config: from_attributes = True

# ─── Producto ─────────────────────────────────────────────────────────────────

class ProductoCreate(BaseModel):
    codigo_barras: str
    nombre: str
    tipo: str = "-"
    marca: str = "-"
    precio_costo: float
    margen_ganancia: float = 30
    stock: int = 0

class ProductoUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    marca: Optional[str] = None
    precio_costo: Optional[float] = None
    margen_ganancia: Optional[float] = None
    precio_venta: Optional[float] = None
    stock: Optional[int] = None

class ProductoOut(BaseModel):
    id: int
    codigo_barras: str
    nombre: str
    tipo: str
    marca: str
    precio_costo: float
    margen_ganancia: float
    precio_venta: float
    stock: int
    class Config: from_attributes = True

# ─── Cliente ──────────────────────────────────────────────────────────────────

class ClienteCreate(BaseModel):
    nombre: str
    telefono: str = ""

class ClienteOut(BaseModel):
    id: int
    nombre: str
    telefono: str
    deuda_total: float
    class Config: from_attributes = True

class MovimientoCreate(BaseModel):
    tipo: str  # FIADO | ABONO
    monto: float
    detalle: str = ""

class MovimientoOut(BaseModel):
    id: int
    tipo: str
    monto: float
    detalle: str
    fecha: datetime
    class Config: from_attributes = True

# ─── Venta ────────────────────────────────────────────────────────────────────

class ItemVentaCreate(BaseModel):
    producto_id: Optional[int] = None
    nombre_producto: str
    cantidad: int
    precio_unitario: float
    precio_costo: float = 0

class VentaCreate(BaseModel):
    cliente_id: Optional[int] = None
    metodo_pago: str
    items: List[ItemVentaCreate]

class ItemVentaOut(BaseModel):
    id: int
    nombre_producto: str
    cantidad: int
    precio_unitario: float
    subtotal: float
    class Config: from_attributes = True

class VentaOut(BaseModel):
    id: int
    total: float
    costo_total: float
    metodo_pago: str
    fecha: datetime
    cajero_username: Optional[str] = None   # ← nombre del cajero
    items: List[ItemVentaOut] = []
    class Config: from_attributes = True

# ─── Cierre de caja ───────────────────────────────────────────────────────────

class CierreCreate(BaseModel):
    fondo_inicial: float = 0

class CierreOut(BaseModel):
    id: int
    cajero: str
    fondo_inicial: float
    ventas_efectivo: float
    ventas_digital: float
    ventas_fiadas: float
    pagos_fiado: float
    total_facturado: float
    fecha: datetime
    class Config: from_attributes = True

# ─── Dashboard ────────────────────────────────────────────────────────────────

class DashboardOut(BaseModel):
    ventas_hoy: float
    ganancia_hoy: float
    ventas_semana: float
    ganancia_semana: float
    ventas_mes: float
    ganancia_mes: float
    total_productos: int
    productos_bajo_stock: int
    total_clientes: int
    clientes_con_deuda: int

# ─── Usuario ──────────────────────────────────────────────────────────────────

class UsuarioCreate(BaseModel):
    username: str
    password: str
    rol: str = "CAJERO"

class UsuarioOut(BaseModel):
    id: int
    username: str
    rol: str
    activo: bool
    class Config: from_attributes = True

# ─── Cambiar contraseña ───────────────────────────────────────────────────────

class CambiarPasswordRequest(BaseModel):
    password_actual: str
    password_nuevo: str

# ─── Recuperación de contraseña ───────────────────────────────────────────────

class RecuperarPasswordRequest(BaseModel):
    email: str
    negocio_id: int

class ResetearPasswordRequest(BaseModel):
    token: str
    password_nuevo: str
