# Sistema de Gestión para Comercios — Tienda Web

## Contexto para el asistente IA

Estás ayudando a desarrollar un sistema POS (punto de venta) web para pequeños comercios argentinos. El objetivo es presentarlo a la Municipalidad de Salta como herramienta gratuita para egresados de la Escuela de Emprendedores. El sistema debe ser simple, responsive y fácil de usar para personas sin conocimientos técnicos.

El desarrollador principal es Lisandro Rodríguez, estudiante de informática en Salta, Argentina. Las respuestas deben ser en español argentino, directas y sin rodeos.

---

## Stack tecnológico

**Backend:** Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL  
**Frontend:** React 18 + Vite + Tailwind CSS + Zustand (auth store)  
**Deploy:** Railway (backend + DB) + Vercel (frontend)  
**Repo:** https://github.com/Lisandro-Rodriguez/tienda-web  
**App:** https://tienda-web-tawny.vercel.app  
**API:** https://web-production-c646b.up.railway.app  
**Docs API:** https://web-production-c646b.up.railway.app/docs  

---

## Estructura del proyecto

```
tienda-web/
├── backend/
│   ├── main.py                      # Entry point FastAPI, registra todos los routers
│   ├── requirements.txt
│   ├── .gitignore                   # Incluye scripts locales con credenciales
│   └── app/
│       ├── api/
│       │   ├── auth.py              # Login, JWT tokens
│       │   ├── negocios.py          # Registro, datos negocio, usuarios
│       │   ├── productos.py         # CRUD productos, búsqueda
│       │   ├── ventas.py            # Registrar ventas, dashboard, historial
│       │   ├── clientes.py          # CRUD clientes, movimientos, fiado
│       │   ├── catalogo.py          # Catálogo SEPA global (solo lectura para negocios)
│       │   └── stock.py             # Umbrales de stock bajo configurables
│       ├── core/
│       │   ├── config.py            # Variables de entorno
│       │   ├── database.py          # Conexión SQLAlchemy
│       │   └── security.py          # bcrypt, JWT, dependencias de auth
│       ├── models/
│       │   └── models.py            # Modelos SQLAlchemy: Negocio, Usuario, Producto, Venta, etc.
│       └── schemas/
│           └── schemas.py           # Schemas Pydantic para validación
└── frontend/
    └── src/
        ├── App.jsx                  # Rutas, ProtectedRoute, redirección por rol
        ├── main.jsx
        ├── pages/
        │   ├── Login.jsx            # Selector de negocio + usuario/contraseña
        │   ├── Registro.jsx         # Crear nuevo negocio
        │   ├── Dashboard.jsx        # Ganancias, stats, gráfico, bienvenida para nuevos
        │   ├── Inventario.jsx       # CRUD productos, autocompletado tipos/marcas, ajustes stock
        │   ├── Ventas.jsx           # Caja: carrito, búsqueda nombre/código, escáner, cobro
        │   ├── Clientes.jsx         # Fiado: deuda, abonos, editar/eliminar, buscador
        │   ├── Historial.jsx        # Ventas por período, cards móvil + tabla desktop
        │   └── Configuracion.jsx    # Datos negocio, gestión usuarios, estado catálogo SEPA
        ├── components/
        │   ├── layout/
        │   │   └── Layout.jsx       # Sidebar desktop + bottom nav móvil, filtra por rol
        │   └── ui/
        │       └── EscanerCamara.jsx # Escáner QR/barcode con tap-to-focus para iOS/Android
        ├── services/
        │   └── api.js               # Axios con baseURL dinámica, todos los servicios
        └── store/
            └── authStore.js         # Zustand: token, usuario, negocio_id
```

---

## Arquitectura multi-tenant

Cada negocio tiene sus datos completamente aislados. El `negocio_id` se filtra en cada endpoint del backend. Un usuario pertenece a un solo negocio. El catálogo SEPA es global y compartido entre todos los negocios (tabla `catalogo_sepa` sin `negocio_id`).

---

## Roles de usuario

**ADMIN** — acceso total: dashboard con ganancias, inventario con costos, configuración, gestión de usuarios, reportes.

**CAJERO** — acceso limitado: solo Caja, Inventario (sin columna de costo), Fiado e Historial. Al entrar va directo a `/ventas`. No puede ver `/dashboard` ni `/configuracion` — si intenta acceder lo redirige a `/ventas`.

---

## Modelos principales de la base de datos

```
Negocio          — id, nombre, direccion, cuit, telefono, email, mensaje_ticket
Usuario          — id, negocio_id, username, password_hash, rol (ADMIN/CAJERO), activo
Producto         — id, negocio_id, codigo_barras, nombre, tipo, marca, precio_costo, 
                   margen_ganancia, precio_venta, stock, stock_minimo, activo
Venta            — id, negocio_id, usuario_id, cliente_id, metodo_pago, total, 
                   costo_total, fecha
ItemVenta        — id, venta_id, producto_id, nombre_producto, cantidad, 
                   precio_unitario, precio_costo
Cliente          — id, negocio_id, nombre, telefono, deuda_total, activo
MovimientoCliente— id, cliente_id, tipo (FIADO/ABONO), monto, detalle, fecha
CatalogoSEPA     — id, codigo, nombre, marca, tipo, precio_ref (global, sin negocio_id)
UmbralStock      — id, negocio_id, tipo (global/tipo/marca/producto), referencia, umbral
```

---

## Servicios del frontend (api.js)

```javascript
authService      — login, me
negocioService   — listar, registrar, miNegocio, actualizar, listarUsuarios, 
                   crearUsuario, eliminarUsuario
productoService  — listar, buscarPorCodigo, buscarEnCatalogo, tipos, crear, 
                   actualizar, eliminar
ventaService     — registrar, listar, dashboard, cerrarCaja, historialCierres
clienteService   — listar, crear, actualizar, movimientos, registrarMovimiento, eliminar
catalogoService  — buscar, stats, importar, limpiar
stockService     — listarUmbrales, guardarUmbral, eliminarUmbral
```

---

## Variables de entorno

**Railway (backend):**
```
DATABASE_URL     — URL interna PostgreSQL (solo funciona desde Railway)
DATABASE_PUBLIC_URL — URL pública (para scripts locales)
SECRET_KEY       — clave para firmar JWT
PORT             — 8000
```

**Vercel (frontend):**
```
VITE_API_URL     — https://web-production-c646b.up.railway.app/api
```

---

## Convenciones de código

**Backend:**
- Todos los endpoints usan `Depends(get_usuario_actual)` para autenticación
- Los endpoints que requieren admin usan `Depends(require_admin)`
- Cada router tiene prefijo `/api/nombre`
- Las validaciones van primero en cada endpoint antes de tocar la DB

**Frontend:**
- Los componentes usan hooks de React (useState, useEffect, useRef)
- El estado global de auth está en Zustand (`useAuthStore`)
- Los modales en móvil son sheets desde abajo (`items-end` en el overlay)
- Las tablas desktop se reemplazan por cards en móvil con clases `hidden md:block` y `md:hidden`
- Los estilos usan clases de Tailwind CSS — no hay CSS custom excepto en casos puntuales con `style={{}}`
- Los toasts de feedback usan `react-hot-toast`

---

## Credenciales de demo

**Negocio demo:** Kiosco San Martin (DEMO)  
**Admin:** `demo` / `demo1234`  
**Cajero:** `cajero` / `cajero1234`  

El negocio demo tiene 15 productos, 3 clientes con deuda y 5 ventas del día cargadas.

---

## Scripts locales (NO en el repo)

Estos archivos están en `backend/` pero ignorados por `.gitignore`:

- `importar_sepa_railway.py` — importa un único CSV del SEPA a Railway
- `importar_sepa_completo.py` — recorre todas las subcarpetas SEPA e importa todos los `productos.csv`
- `crear_demo.py` — crea el negocio demo con productos, clientes y ventas de prueba

La contraseña actual de la DB de Railway es `TiendaApp2026Segura#99`.  
**Nunca subir scripts con credenciales al repo.**

---

## Catálogo SEPA

El SEPA (Sistema Electrónico de Publicidad de Precios Argentinos) es un dataset del Ministerio de Economía con precios de productos de consumo masivo. Se descarga desde `sepa.produccion.gob.ar` y se importa directo a la tabla `catalogo_sepa` de Railway usando el script local.

Al escanear un código de barras en Inventario o Ventas, el sistema busca en esta tabla y autocompleta nombre, marca y tipo del producto.

---

## Flujo de deploy

1. Hacer cambios en el código
2. `git add . && git commit -m "descripción" && git push`
3. Railway detecta el push y redespliega el backend (2-3 min)
4. Vercel detecta el push y redespliega el frontend (30 seg)
5. Todos los negocios reciben la actualización automáticamente

**Importante:** siempre hacer el push desde la raíz del proyecto, no desde `backend/` ni `frontend/`.

---

## Pendiente de implementar

- Ticket PDF al confirmar venta (usar `jsPDF` o `react-pdf`)
- Exportar reportes de ventas a PDF/Excel
- Editar contraseña de usuario desde Configuración
- Filtrar historial de ventas por cajero
- Ver detalle completo de una venta en historial
- Notificaciones push de stock bajo

---

## Errores conocidos y soluciones

**App en blanco en Vercel:** verificar que `VITE_API_URL` esté configurada en las variables de entorno de Vercel y hacer Purge Cache desde CDN settings.

**Error "Ya existe un negocio con ese nombre":** la DB tiene datos viejos. Usar TRUNCATE desde Python con la `DATABASE_PUBLIC_URL`.

**Scripts con credenciales subidos a GitHub:** rotar la contraseña con `ALTER USER postgres PASSWORD 'nueva'` desde Python, actualizar `DATABASE_URL` en Railway variables, y hacer `git rm --cached archivo.py`.

**Catálogo SEPA no autocompleta:** verificar con `GET /api/catalogo/stats` que haya productos cargados. Si está vacío ejecutar `importar_sepa_completo.py`.
