from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

# ─── Negocio (multi-tenant) ──────────────────────────────────────────────────

class Negocio(Base):
    __tablename__ = "negocios"

    id             = Column(Integer, primary_key=True, index=True)
    nombre         = Column(String(120), nullable=False)
    direccion      = Column(String(200), default="")
    cuit           = Column(String(30), default="")
    telefono       = Column(String(30), default="")
    email          = Column(String(100), default="")
    mensaje_ticket = Column(String(200), default="Gracias por su compra!")
    activo         = Column(Boolean, default=True)
    creado_en      = Column(DateTime(timezone=True), server_default=func.now())

    usuarios  = relationship("Usuario", back_populates="negocio")
    productos = relationship("Producto", back_populates="negocio")
    ventas    = relationship("Venta", back_populates="negocio")
    clientes  = relationship("Cliente", back_populates="negocio")
    cierres   = relationship("CierreCaja", back_populates="negocio")

# ─── Usuario ─────────────────────────────────────────────────────────────────

class Usuario(Base):
    __tablename__ = "usuarios"

    id            = Column(Integer, primary_key=True, index=True)
    negocio_id    = Column(Integer, ForeignKey("negocios.id"), nullable=False)
    username      = Column(String(50), nullable=False)
    password_hash = Column(String(200), nullable=False)
    rol           = Column(String(20), default="CAJERO")
    activo        = Column(Boolean, default=True)
    creado_en     = Column(DateTime(timezone=True), server_default=func.now())

    negocio = relationship("Negocio", back_populates="usuarios")
    ventas  = relationship("Venta", back_populates="cajero", foreign_keys="Venta.cajero_id")

# ─── Token de recuperación de contraseña ─────────────────────────────────────

class TokenRecuperacion(Base):
    __tablename__ = "tokens_recuperacion"

    id         = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    token      = Column(String(64), unique=True, nullable=False, index=True)
    usado      = Column(Boolean, default=False)
    expira_en  = Column(DateTime(timezone=True), nullable=False)
    creado_en  = Column(DateTime(timezone=True), server_default=func.now())

    usuario = relationship("Usuario")

# ─── Producto ─────────────────────────────────────────────────────────────────

class Producto(Base):
    __tablename__ = "productos"

    id              = Column(Integer, primary_key=True, index=True)
    negocio_id      = Column(Integer, ForeignKey("negocios.id"), nullable=False)
    codigo_barras   = Column(String(50), nullable=False, index=True)
    nombre          = Column(String(200), nullable=False)
    tipo            = Column(String(80), default="-")
    marca           = Column(String(80), default="-")
    precio_costo    = Column(Float, nullable=False, default=0)
    margen_ganancia = Column(Float, nullable=False, default=30)
    precio_venta    = Column(Float, nullable=False, default=0)
    stock           = Column(Integer, nullable=False, default=0)
    activo          = Column(Boolean, default=True)
    creado_en       = Column(DateTime(timezone=True), server_default=func.now())
    actualizado_en  = Column(DateTime(timezone=True), onupdate=func.now())

    negocio     = relationship("Negocio", back_populates="productos")
    items_venta = relationship("ItemVenta", back_populates="producto")

# ─── Cliente (fiado) ─────────────────────────────────────────────────────────

class Cliente(Base):
    __tablename__ = "clientes"

    id          = Column(Integer, primary_key=True, index=True)
    negocio_id  = Column(Integer, ForeignKey("negocios.id"), nullable=False)
    nombre      = Column(String(120), nullable=False)
    telefono    = Column(String(30), default="")
    deuda_total = Column(Float, default=0)
    activo      = Column(Boolean, default=True)
    creado_en   = Column(DateTime(timezone=True), server_default=func.now())

    negocio     = relationship("Negocio", back_populates="clientes")
    ventas      = relationship("Venta", back_populates="cliente")
    movimientos = relationship("MovimientoCliente", back_populates="cliente")

class MovimientoCliente(Base):
    __tablename__ = "movimientos_clientes"

    id         = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("clientes.id"), nullable=False)
    tipo       = Column(String(20), nullable=False)   # FIADO | ABONO
    monto      = Column(Float, nullable=False)
    detalle    = Column(Text, default="")
    fecha      = Column(DateTime(timezone=True), server_default=func.now())

    cliente = relationship("Cliente", back_populates="movimientos")

# ─── Venta ────────────────────────────────────────────────────────────────────

class Venta(Base):
    __tablename__ = "ventas"

    id          = Column(Integer, primary_key=True, index=True)
    negocio_id  = Column(Integer, ForeignKey("negocios.id"), nullable=False)
    cajero_id   = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    cliente_id  = Column(Integer, ForeignKey("clientes.id"), nullable=True)
    total       = Column(Float, nullable=False)
    costo_total = Column(Float, default=0)
    metodo_pago = Column(String(50), nullable=False)
    estado_caja = Column(String(20), default="ABIERTA")   # ABIERTA | CERRADA
    fecha       = Column(DateTime(timezone=True), server_default=func.now())

    # ── Campos de anulación ──────────────────────────────────────────────────
    anulada        = Column(Boolean, default=False, nullable=False)
    anulada_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    anulada_en     = Column(DateTime(timezone=True), nullable=True)

    negocio    = relationship("Negocio", back_populates="ventas")
    cajero     = relationship("Usuario", back_populates="ventas",    foreign_keys=[cajero_id])
    anulada_por= relationship("Usuario", foreign_keys=[anulada_por_id])
    cliente    = relationship("Cliente", back_populates="ventas")
    items      = relationship("ItemVenta", back_populates="venta", cascade="all, delete-orphan")

class ItemVenta(Base):
    __tablename__ = "items_venta"

    id              = Column(Integer, primary_key=True, index=True)
    venta_id        = Column(Integer, ForeignKey("ventas.id"), nullable=False)
    producto_id     = Column(Integer, ForeignKey("productos.id"), nullable=True)
    nombre_producto = Column(String(200), nullable=False)
    cantidad        = Column(Integer, nullable=False)
    precio_unitario = Column(Float, nullable=False)
    precio_costo    = Column(Float, default=0)
    subtotal        = Column(Float, nullable=False)

    venta    = relationship("Venta", back_populates="items")
    producto = relationship("Producto", back_populates="items_venta")

# ─── Cierre de caja ───────────────────────────────────────────────────────────

class CierreCaja(Base):
    __tablename__ = "cierres_caja"

    id              = Column(Integer, primary_key=True, index=True)
    negocio_id      = Column(Integer, ForeignKey("negocios.id"), nullable=False)
    cajero          = Column(String(80), nullable=False)
    fondo_inicial   = Column(Float, default=0)
    ventas_efectivo = Column(Float, default=0)
    ventas_digital  = Column(Float, default=0)
    ventas_fiadas   = Column(Float, default=0)
    pagos_fiado     = Column(Float, default=0)
    total_facturado = Column(Float, default=0)
    fecha           = Column(DateTime(timezone=True), server_default=func.now())

    negocio = relationship("Negocio", back_populates="cierres")

# ─── Catálogo SEPA ────────────────────────────────────────────────────────────

class CatalogoSEPA(Base):
    __tablename__ = "catalogo_sepa"

    id         = Column(Integer, primary_key=True, index=True)
    codigo     = Column(String(50), unique=True, index=True)
    nombre     = Column(String(200), nullable=False)
    marca      = Column(String(80), default="-")
    tipo       = Column(String(80), default="-")
    precio_ref = Column(Float, default=0)
