from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import openai
from openai import OpenAIError
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai

load_dotenv()
app = FastAPI()

# Firestore setup
import firebase_admin
from firebase_admin import credentials, firestore

if not firebase_admin._apps:
    cred = credentials.Certificate(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    firebase_admin.initialize_app(cred)

db = firestore.client()
COL = db.collection("personas")

openai.api_key = os.getenv("OPENAI_API_KEY")

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    answer: str
    relevant_data: Optional[List[dict]] = None

def get_relevant_data(query: str) -> List[dict]:
    terms = query.lower().split()
    docs = COL.stream()
    filtered = []
    for doc in docs:
        rec = doc.to_dict()
        text = " ".join(str(v).lower() for v in rec.values())
        if any(term in text for term in terms):
            filtered.append(rec)
            if len(filtered) >= 5:
                break
    return filtered

def generate_answer(query: str, relevant_data: List[dict]) -> str:
    prompt = (
        f"Consulta: {query}\n\n"
        f"Datos relevantes:\n{relevant_data}\n\n"
        "Proporciona una respuesta clara y concisa:"
    )
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel("gemini-2.0-flash")
    response = model.generate_content(prompt)
    return response.text

@app.post("/llm/", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    try:
        print(f"Consulta recibida del frontend: {request.query}")  # <-- Agrega esta línea
        relevant_data = get_relevant_data(request.query)
        answer = generate_answer(request.query, relevant_data)
        return QueryResponse(answer=answer, relevant_data=relevant_data or None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

