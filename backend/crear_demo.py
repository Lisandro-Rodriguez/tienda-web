"""
Script para crear un negocio de demo con datos realistas.
Ejecutar desde la carpeta backend con el venv activado:

    python crear_demo.py

NO subir este archivo a GitHub.
"""

import requests
import json

BASE_URL = "https://web-production-c646b.up.railway.app/api"

# ─── 1. Crear negocio demo ────────────────────────────────────────────────────
print("Creando negocio demo...")
res = requests.post(f"{BASE_URL}/negocios/registro", json={
    "nombre": "Kiosco San Martin (DEMO)",
    "direccion": "Av. San Martin 450, Salta",
    "cuit": "20-12345678-9",
    "telefono": "387-4123456",
    "email": "demo@sistematienda.com",
    "admin_username": "demo",
    "admin_password": "demo1234"
})
if res.status_code != 200:
    print(f"Error: {res.json()}")
    exit(1)

negocio = res.json()
negocio_id = negocio['id']
print(f"Negocio creado: {negocio['nombre']} (ID: {negocio_id})")

# ─── 2. Login para obtener token ──────────────────────────────────────────────
print("\nIniciando sesion...")
res = requests.post(f"{BASE_URL}/auth/login", json={
    "username": "demo",
    "password": "demo1234",
    "negocio_id": negocio_id
})
token = res.json()['access_token']
headers = {"Authorization": f"Bearer {token}"}
print("Sesion iniciada OK")

# ─── 3. Crear cajero de demo ──────────────────────────────────────────────────
print("\nCreando cajero de demo...")
requests.post(f"{BASE_URL}/negocios/usuarios", json={
    "username": "cajero",
    "password": "cajero1234",
    "rol": "CAJERO"
}, headers=headers)
print("Cajero creado: cajero / cajero1234")

# ─── 4. Cargar productos ──────────────────────────────────────────────────────
print("\nCargando productos...")
productos = [
    {"codigo_barras": "7790895000997", "nombre": "Coca Cola 2.25L",      "tipo": "Bebida",          "marca": "Coca Cola",   "precio_costo": 1200, "margen_ganancia": 30, "stock": 24},
    {"codigo_barras": "7790895001000", "nombre": "Coca Cola 500ml",       "tipo": "Bebida",          "marca": "Coca Cola",   "precio_costo": 550,  "margen_ganancia": 30, "stock": 48},
    {"codigo_barras": "7790040061049", "nombre": "Agua Villavicencio 1.5L","tipo": "Bebida",         "marca": "Villavicencio","precio_costo": 480, "margen_ganancia": 25, "stock": 36},
    {"codigo_barras": "7792799001004", "nombre": "Fanta Naranja 2.25L",   "tipo": "Bebida",          "marca": "Fanta",       "precio_costo": 1100, "margen_ganancia": 30, "stock": 12},
    {"codigo_barras": "7790580551019", "nombre": "Alfajor Milka",          "tipo": "Golosina/Snack", "marca": "Milka",       "precio_costo": 350,  "margen_ganancia": 40, "stock": 30},
    {"codigo_barras": "7790580100016", "nombre": "Alfajor Oreo",           "tipo": "Golosina/Snack", "marca": "Oreo",        "precio_costo": 280,  "margen_ganancia": 40, "stock": 25},
    {"codigo_barras": "7791813001004", "nombre": "Papas Lays 55gr",        "tipo": "Golosina/Snack", "marca": "Lays",        "precio_costo": 420,  "margen_ganancia": 35, "stock": 20},
    {"codigo_barras": "7790338001001", "nombre": "Cigarrillos Marlboro x20","tipo": "Cigarrillo",    "marca": "Marlboro",    "precio_costo": 1800, "margen_ganancia": 20, "stock": 15},
    {"codigo_barras": "7791813002001", "nombre": "Yerba Taragui 500gr",    "tipo": "Infusion",       "marca": "Taragui",     "precio_costo": 1500, "margen_ganancia": 25, "stock": 10},
    {"codigo_barras": "7790904000011", "nombre": "Leche La Serenisima 1L", "tipo": "Lacteo",         "marca": "La Serenisima","precio_costo": 650, "margen_ganancia": 20, "stock": 18},
    {"codigo_barras": "7792222001004", "nombre": "Arroz Gallo Oro 1kg",    "tipo": "Almacen",        "marca": "Gallo",       "precio_costo": 800,  "margen_ganancia": 25, "stock": 8},
    {"codigo_barras": "7790701001006", "nombre": "Fideos Matarazzo 500gr", "tipo": "Almacen",        "marca": "Matarazzo",   "precio_costo": 620,  "margen_ganancia": 25, "stock": 3},
    {"codigo_barras": "7790040100018", "nombre": "Aceite Natura 900ml",    "tipo": "Almacen",        "marca": "Natura",      "precio_costo": 1400, "margen_ganancia": 20, "stock": 6},
    {"codigo_barras": "7791234001001", "nombre": "Jabon Dove 90gr",        "tipo": "Limpieza/Higiene","marca": "Dove",       "precio_costo": 450,  "margen_ganancia": 30, "stock": 4},
    {"codigo_barras": "7790040200015", "nombre": "Detergente Magistral 300ml","tipo": "Limpieza/Higiene","marca": "Magistral","precio_costo": 580, "margen_ganancia": 25, "stock": 0},
]

for p in productos:
    res = requests.post(f"{BASE_URL}/productos/", json=p, headers=headers)
    if res.status_code == 200:
        pv = res.json()['precio_venta']
        print(f"  ✓ {p['nombre']} — venta: ${pv:.0f}")
    else:
        print(f"  ✗ {p['nombre']}: {res.json()}")

# ─── 5. Crear clientes con deuda ──────────────────────────────────────────────
print("\nCreando clientes...")
clientes = [
    {"nombre": "Juan Perez",    "telefono": "387-4001234"},
    {"nombre": "Maria Gonzalez","telefono": "387-4005678"},
    {"nombre": "Carlos Romero", "telefono": "387-4009012"},
]
cliente_ids = []
for c in clientes:
    res = requests.post(f"{BASE_URL}/clientes/", json=c, headers=headers)
    if res.status_code == 200:
        cliente_ids.append(res.json()['id'])
        print(f"  ✓ {c['nombre']}")

# ─── 6. Registrar ventas del día ──────────────────────────────────────────────
print("\nRegistrando ventas del dia...")

ventas = [
    {
        "metodo_pago": "Efectivo",
        "cliente_id": None,
        "items": [
            {"producto_id": None, "nombre_producto": "Coca Cola 2.25L",  "cantidad": 2, "precio_unitario": 1560, "precio_costo": 1200},
            {"producto_id": None, "nombre_producto": "Alfajor Milka",     "cantidad": 3, "precio_unitario": 490,  "precio_costo": 350},
        ]
    },
    {
        "metodo_pago": "Transferencia",
        "cliente_id": None,
        "items": [
            {"producto_id": None, "nombre_producto": "Cigarrillos Marlboro x20", "cantidad": 1, "precio_unitario": 2160, "precio_costo": 1800},
            {"producto_id": None, "nombre_producto": "Coca Cola 500ml",           "cantidad": 2, "precio_unitario": 715,  "precio_costo": 550},
        ]
    },
    {
        "metodo_pago": "Fiado",
        "cliente_id": cliente_ids[0] if cliente_ids else None,
        "items": [
            {"producto_id": None, "nombre_producto": "Leche La Serenisima 1L", "cantidad": 2, "precio_unitario": 780, "precio_costo": 650},
            {"producto_id": None, "nombre_producto": "Fideos Matarazzo 500gr", "cantidad": 1, "precio_unitario": 775, "precio_costo": 620},
        ]
    },
    {
        "metodo_pago": "Efectivo",
        "cliente_id": None,
        "items": [
            {"producto_id": None, "nombre_producto": "Papas Lays 55gr",       "cantidad": 2, "precio_unitario": 567, "precio_costo": 420},
            {"producto_id": None, "nombre_producto": "Agua Villavicencio 1.5L","cantidad": 1, "precio_unitario": 600, "precio_costo": 480},
        ]
    },
    {
        "metodo_pago": "Fiado",
        "cliente_id": cliente_ids[1] if len(cliente_ids) > 1 else None,
        "items": [
            {"producto_id": None, "nombre_producto": "Yerba Taragui 500gr", "cantidad": 1, "precio_unitario": 1875, "precio_costo": 1500},
            {"producto_id": None, "nombre_producto": "Arroz Gallo Oro 1kg", "cantidad": 2, "precio_unitario": 1000, "precio_costo": 800},
        ]
    },
]

for v in ventas:
    res = requests.post(f"{BASE_URL}/ventas/", json=v, headers=headers)
    if res.status_code == 200:
        total = res.json()['total']
        print(f"  ✓ Venta {v['metodo_pago']} — ${total:.0f}")
    else:
        print(f"  ✗ Error: {res.json()}")

print("\n" + "="*50)
print("DEMO CREADA EXITOSAMENTE")
print("="*50)
print(f"URL: https://tienda-web-tawny.vercel.app")
print(f"Negocio: Kiosco San Martin (DEMO)")
print(f"Admin:   demo / demo1234")
print(f"Cajero:  cajero / cajero1234")
print("="*50)
