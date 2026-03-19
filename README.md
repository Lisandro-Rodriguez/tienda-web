# Sistema Tienda Web

Sistema de gestión de ventas e inventario para pequeños comercios. Multi-tenant, 100% web.

## Stack
- **Backend**: Python + FastAPI + SQLAlchemy
- **Frontend**: React + Vite + Tailwind CSS
- **Base de datos**: PostgreSQL
- **Deploy**: Railway (backend + DB) + Vercel (frontend)

---

## Instalación local (desarrollo)

### 1. Base de datos
Necesitás PostgreSQL instalado localmente, o podés usar Railway gratis.

Crear la base de datos:
```sql
CREATE DATABASE tienda_web;
```

### 2. Backend
```bash
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL

# Arrancar el servidor
uvicorn main:app --reload
```

El backend corre en http://localhost:8000
Documentación automática: http://localhost:8000/docs

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

El frontend corre en http://localhost:5173

### 4. Primer uso
1. Ir a http://localhost:5173/login
2. Hacer click en "Registrate acá"  
3. Crear tu negocio con usuario y contraseña admin
4. Iniciar sesión

---

## Deploy en producción (Railway + Vercel)

### Backend en Railway
1. Crear cuenta en https://railway.app
2. New Project → Deploy from GitHub → seleccionar este repo
3. Agregar servicio PostgreSQL
4. Variables de entorno:
   ```
   DATABASE_URL=<la que Railway te da automáticamente>
   SECRET_KEY=<generar una clave larga aleatoria>
   ```
5. Railway detecta el backend automáticamente con el Procfile

### Frontend en Vercel
1. Crear cuenta en https://vercel.com
2. New Project → importar desde GitHub
3. Root Directory: `frontend`
4. Variable de entorno:
   ```
   VITE_API_URL=https://tu-backend.railway.app
   ```
5. Deploy

---

## Flujo para publicar actualizaciones

```bash
# Hacer cambios
git add .
git commit -m "v1.1.0 - descripción del cambio"
git push origin main
```

Railway y Vercel detectan el push y redesplegan automáticamente. Sin downtime.

---

## Estructura del proyecto

```
tienda-web/
├── backend/
│   ├── main.py              # Punto de entrada FastAPI
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── api/             # Endpoints REST
│       │   ├── auth.py
│       │   ├── negocios.py
│       │   ├── productos.py
│       │   ├── ventas.py
│       │   └── clientes.py
│       ├── core/            # Config, DB, seguridad
│       ├── models/          # Tablas SQLAlchemy
│       └── schemas/         # Validación Pydantic
└── frontend/
    └── src/
        ├── pages/           # Dashboard, Ventas, Inventario, etc.
        ├── components/      # Layout, UI reutilizable
        ├── services/        # Cliente API (axios)
        └── store/           # Estado global (Zustand)
```
