from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, validator
from typing import Optional, List
from datetime import date
import os
import requests
import json
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
    try:
        cred = credentials.Certificate(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
        firebase_admin.initialize_app(cred)
        print("Firebase inicializado correctamente")
    except Exception as e:
        print(f"Error al inicializar Firebase: {e}")
        raise

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
    id: str
    foto_url: Optional[str] = None

    class Config:
        from_attributes = True

@app.post("/personas/", response_model=Persona)
async def create_persona(
    persona: str = Form(...),
    foto: UploadFile = File(None)
):
    try:
        print("=== INICIO DE CREACIÓN DE PERSONA ===")
        print("Datos recibidos:", persona)
        
        # Convertir el string JSON a diccionario
        persona_data = json.loads(persona)
        print("Datos parseados:", persona_data)
        
        # Convertir los valores del frontend a los valores esperados por el backend
        if persona_data['tipo_documento'] == 'CC':
            persona_data['tipo_documento'] = 'Cédula'
        elif persona_data['tipo_documento'] == 'TI':
            persona_data['tipo_documento'] = 'Tarjeta de identidad'

        if persona_data['genero'] == 'M':
            persona_data['genero'] = 'Masculino'
        elif persona_data['genero'] == 'F':
            persona_data['genero'] = 'Femenino'
        elif persona_data['genero'] == 'NB':
            persona_data['genero'] = 'No binario'
        elif persona_data['genero'] == 'NR':
            persona_data['genero'] = 'Prefiero no reportar'

        print("Datos convertidos:", persona_data)

        # Crear objeto PersonaCreate para validación
        persona_obj = PersonaCreate(**persona_data)
        print("Objeto validado:", persona_obj.dict())

        # Manejar la foto
        foto_url = None
        if foto:
            contenido = await foto.read()
            if len(contenido) > 2 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="La foto no debe superar los 2MB")
            foto_url = f"/uploads/{foto.filename}"

        # Preparar datos para Firestore
        data = persona_obj.dict()
        # Convertir la fecha de nacimiento a string en formato ISO para Firestore
        if data.get("fecha_nacimiento"):
            data["fecha_nacimiento"] = data["fecha_nacimiento"].isoformat()
            
        data["foto_url"] = foto_url
        print("Datos preparados para Firestore:", data)

        # Verificar si ya existe
        doc_ref = COL.document(persona_obj.numero_documento)
        doc_snapshot = doc_ref.get()
        print("Documento existe:", doc_snapshot.exists)
        
        if doc_snapshot.exists:
            raise HTTPException(status_code=400, detail="Ya existe una persona con ese número de documento")

        # Guardar en Firestore
        try:
            print("Intentando guardar en Firestore...")
            doc_ref.set(data)
            print("Datos guardados exitosamente en Firestore")
            
            # Verificar que se guardó
            doc_verificado = doc_ref.get()
            print("Verificación de guardado:", doc_verificado.exists)
            if doc_verificado.exists:
                print("Datos guardados:", doc_verificado.to_dict())
            else:
                print("ERROR: Los datos no se guardaron correctamente")
                raise Exception("Los datos no se guardaron en Firestore")
                
        except Exception as e:
            print(f"Error al guardar en Firestore: {str(e)}")
            print(f"Tipo de error: {type(e)}")
            raise HTTPException(status_code=500, detail=f"Error al guardar en la base de datos: {str(e)}")

        # Registrar en el log
        try:
            log_data = {
                "tipo": "CREATE",
                "documento": persona_obj.numero_documento,
                "detalles": f"Creación de persona: {persona_obj.primer_nombre} {persona_obj.apellidos}"
            }
            print("Enviando log:", log_data)
            log_response = requests.post(f"{os.getenv('LOG_SERVICE_URL')}/logs/", json=log_data)
            print("Respuesta del log service:", log_response.status_code)
            if not log_response.ok:
                print(f"Error al registrar log: {log_response.status_code}")
        except Exception as e:
            print(f"Error al registrar log: {str(e)}")

        print("=== FIN DE CREACIÓN DE PERSONA ===")
        return {"id": persona_obj.numero_documento, **data}

    except json.JSONDecodeError as e:
        print(f"Error al decodificar JSON: {str(e)}")
        raise HTTPException(status_code=400, detail="Formato de datos inválido")
    except Exception as e:
        print(f"Error en create_persona: {str(e)}")
        print(f"Tipo de error: {type(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/personas/{numero_documento}", response_model=Persona)
async def read_persona(numero_documento: str):
    doc = COL.document(numero_documento).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    data = doc.to_dict()
    return {"id": numero_documento, **data}


@app.put("/personas/{numero_documento}", response_model=Persona)
async def update_persona(
    numero_documento: str,
    persona: str = Form(...),
    foto: UploadFile = File(None)
):
    try:
        print("=== INICIO DE ACTUALIZACIÓN DE PERSONA ===")
        print("Datos recibidos:", persona)
        
        # Convertir el string JSON a diccionario
        persona_data = json.loads(persona)
        print("Datos parseados:", persona_data)
        
        # Convertir los valores del frontend a los valores esperados por el backend
        if persona_data['tipo_documento'] == 'CC':
            persona_data['tipo_documento'] = 'Cédula'
        elif persona_data['tipo_documento'] == 'TI':
            persona_data['tipo_documento'] = 'Tarjeta de identidad'

        if persona_data['genero'] == 'M':
            persona_data['genero'] = 'Masculino'
        elif persona_data['genero'] == 'F':
            persona_data['genero'] = 'Femenino'
        elif persona_data['genero'] == 'NB':
            persona_data['genero'] = 'No binario'
        elif persona_data['genero'] == 'NR':
            persona_data['genero'] = 'Prefiero no reportar'

        print("Datos convertidos:", persona_data)

        # Crear objeto PersonaCreate para validación
        persona_obj = PersonaCreate(**persona_data)
        print("Objeto validado:", persona_obj.dict())
        
        # Verificar que existe
        doc_ref = COL.document(numero_documento)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Persona no encontrada")

        # Manejar la foto
        foto_url = None
        if foto:
            contenido = await foto.read()
            if len(contenido) > 2 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="La foto no debe superar los 2MB")
            foto_url = f"/uploads/{foto.filename}"

        # Preparar datos para Firestore
        data = persona_obj.dict()
        # Convertir la fecha de nacimiento a string en formato ISO para Firestore
        if data.get("fecha_nacimiento"):
            data["fecha_nacimiento"] = data["fecha_nacimiento"].isoformat()
            
        if foto_url:
            data["foto_url"] = foto_url

        print("Datos preparados para Firestore:", data)

        # Actualizar en Firestore
        try:
            print("Intentando actualizar en Firestore...")
            doc_ref.update(data)
            print("Datos actualizados exitosamente en Firestore")
            
            # Verificar que se actualizó
            doc_verificado = doc_ref.get()
            print("Verificación de actualización:", doc_verificado.exists)
            if doc_verificado.exists:
                print("Datos actualizados:", doc_verificado.to_dict())
            else:
                print("ERROR: Los datos no se actualizaron correctamente")
                raise Exception("Los datos no se actualizaron en Firestore")
                
        except Exception as e:
            print(f"Error al actualizar en Firestore: {str(e)}")
            print(f"Tipo de error: {type(e)}")
            raise HTTPException(status_code=500, detail=f"Error al actualizar en la base de datos: {str(e)}")

        # Registrar en el log
        try:
            log_data = {
                "tipo": "UPDATE",
                "documento": numero_documento,
                "detalles": f"Actualización de persona: {persona_obj.primer_nombre} {persona_obj.apellidos}"
            }
            print("Enviando log:", log_data)
            log_response = requests.post(f"{os.getenv('LOG_SERVICE_URL')}/logs/", json=log_data)
            print("Respuesta del log service:", log_response.status_code)
            if not log_response.ok:
                print(f"Error al registrar log: {log_response.status_code}")
        except Exception as e:
            print(f"Error al registrar log: {str(e)}")

        print("=== FIN DE ACTUALIZACIÓN DE PERSONA ===")
        return {"id": numero_documento, **data}

    except json.JSONDecodeError as e:
        print(f"Error al decodificar JSON: {str(e)}")
        raise HTTPException(status_code=400, detail="Formato de datos inválido")
    except Exception as e:
        print(f"Error en update_persona: {str(e)}")
        print(f"Tipo de error: {type(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
