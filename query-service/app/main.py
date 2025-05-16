# query-service/main.py

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from langchain.llms import OpenAI
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv

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


# —— LLM SETUP (sin cambios) ——

llm = OpenAI(temperature=0)


class QueryRequest(BaseModel):
    query: str


class QueryResponse(BaseModel):
    answer: str
    relevant_data: Optional[List[dict]] = None


# —— get_relevant_data refactorizado para Firestore ——

def get_relevant_data(query: str) -> List[dict]:
    terms = query.lower().split()
    docs = COL.stream()
    records = [doc.to_dict() for doc in docs]

    filtered = []
    for rec in records:
        text = " ".join(str(v).lower() for v in rec.values())
        if any(term in text for term in terms):
            filtered.append(rec)
            if len(filtered) >= 5:
                break

    return filtered


# —— generate_answer (igual) ——

def generate_answer(query: str, relevant_data: List[dict]) -> str:
    template = """
    Basado en la siguiente consulta y los datos relevantes, proporciona una respuesta clara y concisa:

    Consulta: {query}

    Datos relevantes:
    {relevant_data}

    Respuesta:
    """
    prompt = PromptTemplate(input_variables=["query", "relevant_data"], template=template)
    chain = LLMChain(llm=llm, prompt=prompt)
    formatted = "\n".join(str(d) for d in relevant_data)
    return chain.run(query=query, relevant_data=formatted)


# —— Endpoint ——

@app.post("/query/", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    try:
        relevant_data = get_relevant_data(request.query)
        answer = generate_answer(request.query, relevant_data)
        return QueryResponse(answer=answer, relevant_data=relevant_data or None)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
