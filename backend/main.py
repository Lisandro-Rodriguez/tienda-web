from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.api import auth, negocios, productos, ventas, clientes, catalogo, stock

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Sistema Tienda API",
    description="API para gestión de ventas e inventario de pequeños comercios",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(negocios.router)
app.include_router(productos.router)
app.include_router(ventas.router)
app.include_router(clientes.router)
app.include_router(catalogo.router)
app.include_router(stock.router)

@app.get("/")
def root():
    return {"status": "ok", "version": "1.0.0", "sistema": "Tienda Web"}

@app.get("/health")
def health():
    return {"status": "healthy"}
