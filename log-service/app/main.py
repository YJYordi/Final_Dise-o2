from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import os

# —— FIREBASE ADMIN SDK ——
import firebase_admin
from firebase_admin import credentials, firestore

app = FastAPI()

# Inicializar Firebase una sola vez
if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    firebase_admin.initialize_app(cred)
db = firestore.client()
COL = db.collection("logs")


class LogCreate(BaseModel):
    tipo: str
    documento: str
    detalles: str

class LogResponse(LogCreate):
    id: str
    fecha: datetime

    class Config:
        from_attributes = True


@app.post("/logs/", response_model=LogResponse)
async def create_log(log: LogCreate):
    data = log.dict()
    data["fecha"] = datetime.utcnow()
    doc_ref = COL.document()     # Firestore genera un ID automático
    doc_ref.set(data)
    return {"id": doc_ref.id, **data}


@app.get("/logs/", response_model=List[LogResponse])
async def get_logs(
    tipo: Optional[str] = None,
    documento: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None
):
    q = COL
    if tipo:
        q = q.where("tipo", "==", tipo)
    if documento:
        q = q.where("documento", "==", documento)
    if fecha_inicio:
        q = q.where("fecha", ">=", fecha_inicio)
    if fecha_fin:
        q = q.where("fecha", "<=", fecha_fin)
    # Orden descendente por fecha
    docs = q.order_by("fecha", direction=firestore.Query.DESCENDING).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]
