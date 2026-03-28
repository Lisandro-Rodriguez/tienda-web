# Sistema de Gestión para Comercios — Tienda Web

## Contexto para el asistente IA

Estás ayudando a desarrollar un sistema POS (punto de venta) web para pequeños comercios argentinos. El objetivo es presentarlo a la Municipalidad de Salta como herramienta gratuita para egresados de la Escuela de Emprendedores. El sistema debe ser simple, responsive y fácil de usar para personas sin conocimientos técnicos.

El desarrollador es Lisandro Rodríguez, estudiante de informática en Salta, Argentina. Las respuestas deben ser en español argentino, directas y sin rodeos.

---

## URLs y accesos

- **App:** https://tienda-web-tawny.vercel.app
- **API:** https://web-production-c646b.up.railway.app
- **Docs API:** https://web-production-c646b.up.railway.app/docs
- **Repo:** https://github.com/Lisandro-Rodriguez/tienda-web
- **Local:** `C:\Users\rodri\OneDrive\Documentos\Gestión Tienda Web\tienda-web`

### Credenciales demo
- **Negocio:** Kiosco San Martin (DEMO)
- **Admin:** `demo` / `demo1234`
- **Cajero:** `cajero` / `cajero1234`

### Base de datos Railway (pública)
```
postgresql://postgres:TiendaApp2026Segura#99@autorack.proxy.rlwy.net:41777/railway
```

---

## Stack tecnológico

- **Backend:** Python 3.11 + FastAPI + SQLAlchemy 2.0 + PostgreSQL 15
- **Frontend:** React 18 + Vite + Tailwind CSS + Zustand
- **Auth:** JWT tokens + bcrypt 4.0.1 (sin passlib)
- **Deploy:** Railway (backend + DB) + Vercel (frontend)
- **Escáner:** html5-qrcode
- **Ticket PDF:** jsPDF

---

## Estructura del proyecto

```
tienda-web/
├── backend/
│   ├── main.py                      # Entry point, registra routers: auth, negocios, productos, ventas, clientes, catalogo, stock
│   ├── requirements.txt             # bcrypt==4.0.1 (sin passlib)
│   ├── .gitignore                   # Incluye: importar_sepa_railway.py, importar_sepa_completo.py, crear_demo.py
│   └── app/
│       ├── api/
│       │   ├── auth.py              # POST /api/auth/login, GET /api/auth/me
│       │   ├── negocios.py          # Registro, datos negocio, usuarios, cambiar contraseña
│       │   ├── productos.py         # CRUD productos, búsqueda por código, catálogo SEPA
│       │   ├── ventas.py            # Registrar ventas, GET /{id}, dashboard, cierre de caja
│       │   ├── clientes.py          # CRUD clientes con PUT para editar, movimientos
│       │   ├── catalogo.py          # Catálogo SEPA global (buscar, stats)
│       │   └── stock.py             # Umbrales de stock bajo (SQL directo, crea tabla si no existe)
│       ├── core/
│       │   ├── config.py
│       │   ├── database.py
│       │   └── security.py          # bcrypt directo, JWT, get_usuario_actual, require_admin
│       ├── models/models.py
│       └── schemas/schemas.py       # Incluye CambiarPasswordRequest
└── frontend/
    └── src/
        ├── App.jsx                  # Rutas con ProtectedRoute, IndexRoute (admin→dashboard, cajero→ventas)
        ├── pages/
        │   ├── Login.jsx            # Diseño dark con grilla, DM Serif Display, resplandor verde
        │   ├── Registro.jsx
        │   ├── Dashboard.jsx        # Diseño editorial minimalista, bienvenida para negocios nuevos
        │   ├── Inventario.jsx       # CRUD, autocompletado tipos/marcas, umbrales stock, escáner
        │   ├── Ventas.jsx           # Caja con ticket PDF automático, búsqueda nombre/código, escáner
        │   ├── Clientes.jsx         # Fiado con editar/eliminar/buscador
        │   ├── Historial.jsx        # Modal detalle venta, ticket PDF, cajero visible, filtros período
        │   └── Configuracion.jsx    # Datos negocio, ticket toggles, cambiar contraseña, usuarios, SEPA
        ├── components/
        │   ├── layout/Layout.jsx    # Sidebar desktop + bottom nav móvil, filtra items por rol
        │   └── ui/EscanerCamara.jsx # Escáner fullscreen, botón reenfocar (reinicia scanner)
        ├── services/api.js          # baseURL: import.meta.env.VITE_API_URL || '/api'
        ├── store/authStore.js       # Zustand: token, usuario, negocio_nombre
        └── utils/ticketPDF.js       # jsPDF, ticket 80mm, datos negocio + items + total
```

---

## Arquitectura multi-tenant

Cada negocio tiene datos aislados por `negocio_id`. El catálogo SEPA es global (sin `negocio_id`). El token JWT incluye `negocio_id` y `rol`.

---

## Roles de usuario

**ADMIN** — acceso total: dashboard con ganancias, inventario con costos, configuración, usuarios.

**CAJERO** — acceso limitado: Caja, Inventario (sin costos), Fiado, Historial. Al entrar va directo a `/ventas`. Las rutas `/dashboard` y `/configuracion` redirigen a `/ventas`.

---

## Modelos de base de datos

```
Negocio           id, nombre, direccion, cuit, telefono, email, mensaje_ticket, activo
Usuario           id, negocio_id, username, password_hash, rol (ADMIN/CAJERO), activo
Producto          id, negocio_id, codigo_barras, nombre, tipo, marca, precio_costo,
                  margen_ganancia, precio_venta, stock, stock_minimo, activo
Venta             id, negocio_id, cajero_id, cliente_id, metodo_pago, total,
                  costo_total, estado_caja, fecha
ItemVenta         id, venta_id, producto_id, nombre_producto, cantidad,
                  precio_unitario, precio_costo, subtotal
Cliente           id, negocio_id, nombre, telefono, deuda_total, activo
MovimientoCliente id, cliente_id, tipo (FIADO/ABONO), monto, detalle, fecha
CatalogoSEPA      id, codigo (UNIQUE), nombre, marca, tipo, precio_ref
UmbralStock       id, negocio_id, tipo (global/tipo/marca/producto), referencia, umbral
CierreCaja        id, negocio_id, cajero, fondo_inicial, ventas_efectivo, etc.
```

---

## Servicios del frontend (api.js)

```javascript
authService      login(username, password, negocio_id), me()
negocioService   listar(), registrar(), miNegocio(), actualizar(),
                 cambiarPassword({password_actual, password_nuevo}),
                 listarUsuarios(), crearUsuario(), eliminarUsuario(id)
productoService  listar(params), buscarPorCodigo(codigo), buscarEnCatalogo(codigo),
                 crear(), actualizar(id), eliminar(id)
ventaService     registrar(), listar(periodo), obtener(id), dashboard(),
                 cerrarCaja(), historialCierres()
clienteService   listar(), crear(), actualizar(id), movimientos(id),
                 registrarMovimiento(id, data), eliminar(id)
catalogoService  buscar(codigo), stats(), importar(archivo), limpiar()
stockService     listarUmbrales(), guardarUmbral(data), eliminarUmbral(id)
```

---

## Endpoints backend importantes

```
POST /api/negocios/registro          público, crea negocio + admin
GET  /api/negocios/                  público, lista negocios para selector login
PUT  /api/negocios/mi-password       cambiar contraseña (cualquier rol)
GET  /api/ventas/{id}                detalle con cliente_nombre y cajero_username
                                     OJO: va AL FINAL del archivo ventas.py para no
                                     interceptar /dashboard y /cierres
GET  /api/stock/umbrales             crea tabla umbrales_stock si no existe (SQL directo)
POST /api/stock/umbrales             upsert por negocio_id+tipo+referencia
```

---

## Variables de entorno

**Railway:** `DATABASE_URL`, `DATABASE_PUBLIC_URL`, `SECRET_KEY`, `PORT=8000`
**Vercel:** `VITE_API_URL=https://web-production-c646b.up.railway.app/api`

---

## Convenciones importantes

- `security.py` usa `bcrypt` directo: `bcrypt.checkpw()` y `bcrypt.hashpw()` — sin passlib
- `stock.py` usa `text()` de SQLAlchemy directo — crea la tabla si no existe
- Push siempre desde la RAÍZ del proyecto, no desde subcarpetas
- Modales móvil: `items-end md:items-center` para efecto sheet desde abajo
- Umbrales: Inventario carga umbrales primero, luego recargar productos al cambiar `umbrales.length`
- Ticket PDF: preferencias en localStorage (`ticket_automatico`, `ticket_abrir_automatico`)

---

## Catálogo SEPA

36,372 productos cargados. Importado con `psql` y `\COPY` a tabla temporal, luego `INSERT ... SELECT DISTINCT ON (id_producto)`. Para reimportar, filtrar con PowerShell: `Where-Object { $_ -match "^\d" }`.

---

## Scripts locales (en backend/.gitignore, NO en el repo)

```
importar_sepa_railway.py     importa un CSV individual a Railway
importar_sepa_completo.py    recorre subcarpetas SEPA (conexión independiente por archivo)
crear_demo.py                crea negocio demo con productos, clientes y ventas
```

---

## Pendiente

- Exportar reportes de ventas a PDF/Excel
- Filtrar historial por cajero
- Notificaciones push de stock bajo
