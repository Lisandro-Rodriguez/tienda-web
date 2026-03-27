from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from app.core.database import get_db
from app.core.security import get_usuario_actual, require_admin

router = APIRouter(prefix="/api/stock", tags=["stock"])

class UmbralIn(BaseModel):
    tipo: str
    referencia: str = ""
    umbral: int

class UmbralOut(BaseModel):
    id: int
    tipo: str
    referencia: str
    umbral: int
    class Config: from_attributes = True

@router.get("/umbrales")
def listar_umbrales(usuario=Depends(get_usuario_actual), db: Session = Depends(get_db)):
    # Crear tabla si no existe
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS umbrales_stock (
            id SERIAL PRIMARY KEY,
            negocio_id INTEGER NOT NULL,
            tipo VARCHAR(20) NOT NULL,
            referencia VARCHAR(200) DEFAULT '',
            umbral INTEGER NOT NULL DEFAULT 5,
            creado_en TIMESTAMP DEFAULT NOW()
        )
    """))
    db.commit()
    
    result = db.execute(text(
        "SELECT id, tipo, referencia, umbral FROM umbrales_stock WHERE negocio_id = :nid"
    ), {"nid": usuario.negocio_id}).fetchall()
    
    return [{"id": r[0], "tipo": r[1], "referencia": r[2], "umbral": r[3]} for r in result]

@router.post("/umbrales")
def guardar_umbral(
    data: UmbralIn,
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    # Crear tabla si no existe
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS umbrales_stock (
            id SERIAL PRIMARY KEY,
            negocio_id INTEGER NOT NULL,
            tipo VARCHAR(20) NOT NULL,
            referencia VARCHAR(200) DEFAULT '',
            umbral INTEGER NOT NULL DEFAULT 5,
            creado_en TIMESTAMP DEFAULT NOW()
        )
    """))
    db.commit()

    # Verificar si ya existe
    existente = db.execute(text("""
        SELECT id FROM umbrales_stock 
        WHERE negocio_id = :nid AND tipo = :tipo AND referencia = :ref
    """), {"nid": usuario.negocio_id, "tipo": data.tipo, "ref": data.referencia}).fetchone()

    if existente:
        db.execute(text(
            "UPDATE umbrales_stock SET umbral = :umbral WHERE id = :id"
        ), {"umbral": data.umbral, "id": existente[0]})
        db.commit()
        return {"id": existente[0], "tipo": data.tipo, "referencia": data.referencia, "umbral": data.umbral}
    else:
        result = db.execute(text("""
            INSERT INTO umbrales_stock (negocio_id, tipo, referencia, umbral)
            VALUES (:nid, :tipo, :ref, :umbral)
            RETURNING id
        """), {"nid": usuario.negocio_id, "tipo": data.tipo, "ref": data.referencia, "umbral": data.umbral})
        db.commit()
        new_id = result.fetchone()[0]
        return {"id": new_id, "tipo": data.tipo, "referencia": data.referencia, "umbral": data.umbral}

@router.delete("/umbrales/{umbral_id}")
def eliminar_umbral(
    umbral_id: int,
    usuario=Depends(require_admin),
    db: Session = Depends(get_db)
):
    db.execute(text(
        "DELETE FROM umbrales_stock WHERE id = :id AND negocio_id = :nid"
    ), {"id": umbral_id, "nid": usuario.negocio_id})
    db.commit()
    return {"ok": True}
