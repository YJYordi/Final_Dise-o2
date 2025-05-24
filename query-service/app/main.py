from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from dotenv import load_dotenv
import openai

load_dotenv()
app = FastAPI()

# —— FIRESTORE SETUP (reemplaza SQLAlchemy) ——
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

# —— get_relevant_data refactorizado para Firestore ——

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
    resp = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    return resp.choices[0].message.content

# —— Endpoint ——

@app.post("/query/", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    try:
        relevant_data = get_relevant_data(request.query)
        answer = generate_answer(request.query, relevant_data)
        return QueryResponse(answer=answer, relevant_data=relevant_data or None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
