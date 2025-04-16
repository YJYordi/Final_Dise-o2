from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import date
import os
import requests
from enum import Enum

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# validacion
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
    id: int
    foto_url: Optional[str] = None

    class Config:
        from_attributes = True

# Database models
from sqlalchemy import create_engine, Column, Integer, String, Date, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@db:5432/personas")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class PersonaDB(Base):
    __tablename__ = "personas"

    id = Column(Integer, primary_key=True, index=True)
    tipo_documento = Column(SQLEnum(DocumentType))
    numero_documento = Column(String, unique=True, index=True)
    primer_nombre = Column(String)
    segundo_nombre = Column(String, nullable=True)
    apellidos = Column(String)
    fecha_nacimiento = Column(Date)
    genero = Column(SQLEnum(Gender))
    email = Column(String)
    celular = Column(String)
    foto_url = Column(String, nullable=True)

Base.metadata.create_all(bind=engine)

# API endpoints
@app.post("/personas/", response_model=Persona)
async def create_persona(persona: PersonaCreate, foto: UploadFile = File(None)):
    db = SessionLocal()
    try:
        
        if foto:
            if foto.size > 2 * 1024 * 1024:  # 2MB
                raise HTTPException(status_code=400, detail="La foto no debe superar los 2MB")
        
            foto_url = f"/uploads/{foto.filename}"
        else:
            foto_url = None

        db_persona = PersonaDB(**persona.dict(), foto_url=foto_url)
        db.add(db_persona)
        db.commit()
        db.refresh(db_persona)

        log_data = {
            "tipo": "CREATE",
            "documento": persona.numero_documento,
            "detalles": f"Creación de persona: {persona.primer_nombre} {persona.apellidos}"
        }
        requests.post(f"{os.getenv('LOG_SERVICE_URL')}/logs/", json=log_data)

        return db_persona
    finally:
        db.close()

@app.get("/personas/{numero_documento}", response_model=Persona)
async def read_persona(numero_documento: str):
    db = SessionLocal()
    try:
        persona = db.query(PersonaDB).filter(PersonaDB.numero_documento == numero_documento).first()
        if persona is None:
            raise HTTPException(status_code=404, detail="Persona no encontrada")
        return persona
    finally:
        db.close()

@app.put("/personas/{numero_documento}", response_model=Persona)
async def update_persona(numero_documento: str, persona: PersonaCreate):
    db = SessionLocal()
    try:
        db_persona = db.query(PersonaDB).filter(PersonaDB.numero_documento == numero_documento).first()
        if db_persona is None:
            raise HTTPException(status_code=404, detail="Persona no encontrada")

        for key, value in persona.dict().items():
            setattr(db_persona, key, value)

        db.commit()
        db.refresh(db_persona)

        
        log_data = {
            "tipo": "UPDATE",
            "documento": numero_documento,
            "detalles": f"Actualización de persona: {persona.primer_nombre} {persona.apellidos}"
        }
        requests.post(f"{os.getenv('LOG_SERVICE_URL')}/logs/", json=log_data)

        return db_persona
    finally:
        db.close()

@app.delete("/personas/{numero_documento}")
async def delete_persona(numero_documento: str):
    db = SessionLocal()
    try:
        db_persona = db.query(PersonaDB).filter(PersonaDB.numero_documento == numero_documento).first()
        if db_persona is None:
            raise HTTPException(status_code=404, detail="Persona no encontrada")

        
        log_data = {
            "tipo": "DELETE",
            "documento": numero_documento,
            "detalles": f"Eliminación de persona: {db_persona.primer_nombre} {db_persona.apellidos}"
        }
        requests.post(f"{os.getenv('LOG_SERVICE_URL')}/logs/", json=log_data)

        db.delete(db_persona)
        db.commit()
        return {"message": "Persona eliminada exitosamente"}
    finally:
        db.close() 