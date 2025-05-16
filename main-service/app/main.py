from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import date
import os
import requests
from enum import Enum

# —— FIREBASE ADMIN SDK ——
import firebase_admin
from firebase_admin import credentials, firestore

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar Firebase una sola vez
if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    firebase_admin.initialize_app(cred)
db = firestore.client()
COL = db.collection("personas")


# validación (sin cambios)
class DocumentType(str, Enum):
    TARJETA_IDENTIDAD = "Tarjeta de identidad"
    CEDULA = "Cédula"

class Gender(str, Enum):
    MASCULINO = "Masculino"
    FEMENINO = "Femenino"
    NO_BINARIO = "No binario"
    PREFIERO_NO_REPORTAR = "Prefiero no reportar"

class PersonaBase(BaseModel):
    tipo_documento: DocumentType
    numero_documento: str
    primer_nombre: str
    segundo_nombre: Optional[str] = None
    apellidos: str
    fecha_nacimiento: date
    genero: Gender
    email: EmailStr
    celular: str

    @validator('numero_documento')
    def validate_document_number(cls, v):
        if not v.isdigit() or len(v) > 10:
            raise ValueError('Número de documento inválido')
        return v

    @validator('primer_nombre', 'segundo_nombre')
    def validate_names(cls, v):
        if v and (v.isdigit() or len(v) > 30):
            raise ValueError('Nombre inválido')
        return v

    @validator('apellidos')
    def validate_last_names(cls, v):
        if v.isdigit() or len(v) > 60:
            raise ValueError('Apellidos inválidos')
        return v

    @validator('celular')
    def validate_phone(cls, v):
        if not v.isdigit() or len(v) != 10:
            raise ValueError('Número de celular inválido')
        return v

class PersonaCreate(PersonaBase):
    pass

class Persona(PersonaBase):
    id: int                 # Pydantic convertirá el string de Firestore a int
    foto_url: Optional[str] = None

    class Config:
        from_attributes = True


# —— CRUD usando Firestore en lugar de SQLAlchemy —— #

@app.post("/personas/", response_model=Persona)
async def create_persona(persona: PersonaCreate, foto: UploadFile = File(None)):
    # Validación de tamaño de foto (igual que antes)
    foto_url = None
    if foto:
        contenido = await foto.read()
        if len(contenido) > 2 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="La foto no debe superar los 2MB")
        foto_url = f"/uploads/{foto.filename}"

    # Preparamos datos y guardamos en Firestore
    data = persona.dict()
    data["foto_url"] = foto_url
    doc_ref = COL.document(persona.numero_documento)
    if doc_ref.get().exists:
        raise HTTPException(status_code=400, detail="Ya existe esa persona")
    doc_ref.set(data)

    # Registro de log (igual que antes)
    log_data = {
        "tipo": "CREATE",
        "documento": persona.numero_documento,
        "detalles": f"Creación de persona: {persona.primer_nombre} {persona.apellidos}"
    }
    requests.post(f"{os.getenv('LOG_SERVICE_URL')}/logs/", json=log_data)

    # Devolvemos un dict para que Pydantic cree la Persona (id se castea de str a int)
    return {"id": persona.numero_documento, **data}


@app.get("/personas/{numero_documento}", response_model=Persona)
async def read_persona(numero_documento: str):
    doc = COL.document(numero_documento).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    data = doc.to_dict()
    return {"id": numero_documento, **data}


@app.put("/personas/{numero_documento}", response_model=Persona)
async def update_persona(numero_documento: str, persona: PersonaCreate):
    doc_ref = COL.document(numero_documento)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    data = persona.dict()
    doc_ref.update(data)

    log_data = {
        "tipo": "UPDATE",
        "documento": numero_documento,
        "detalles": f"Actualización de persona: {persona.primer_nombre} {persona.apellidos}"
    }
    requests.post(f"{os.getenv('LOG_SERVICE_URL')}/logs/", json=log_data)

    return {"id": numero_documento, **data}


@app.delete("/personas/{numero_documento}")
async def delete_persona(numero_documento: str):
    doc_ref = COL.document(numero_documento)
    snap = doc_ref.get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail="Persona no encontrada")

    data = snap.to_dict()
    log_data = {
        "tipo": "DELETE",
        "documento": numero_documento,
        "detalles": f"Eliminación de persona: {data['primer_nombre']} {data['apellidos']}"
    }
    requests.post(f"{os.getenv('LOG_SERVICE_URL')}/logs/", json=log_data)

    doc_ref.delete()
    return {"message": "Persona eliminada exitosamente"}
