from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import os

# —— FIREBASE ADMIN SDK ——
import firebase_admin
from firebase_admin import credentials, firestore

app = FastAPI()

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar los orígenes permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    try:
        # Obtener todos los logs y filtrar en memoria
        # Esto es más simple y no requiere índices compuestos
        q = COL.order_by("fecha", direction=firestore.Query.DESCENDING)
        docs = q.stream()
        logs = [{"id": doc.id, **doc.to_dict()} for doc in docs]

        # Aplicar filtros en memoria
        if tipo:
            tipos = [t.strip() for t in tipo.split(',')]
            logs = [log for log in logs if log["tipo"] in tipos]
        
        if documento:
            logs = [log for log in logs if log["documento"] == documento]
        
        if fecha_inicio:
            logs = [log for log in logs if log["fecha"] >= fecha_inicio]
        
        if fecha_fin:
            logs = [log for log in logs if log["fecha"] <= fecha_fin]

        return logs

    except Exception as e:
        print(f"Error en get_logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
