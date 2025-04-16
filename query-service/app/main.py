from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from langchain.llms import OpenAI
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@db:5432/personas")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# LLM setup
llm = OpenAI(temperature=0)

class QueryRequest(BaseModel):
    query: str

class QueryResponse(BaseModel):
    answer: str
    relevant_data: Optional[List[dict]] = None

def get_relevant_data(query: str) -> List[dict]:
    db = SessionLocal()
    try:
        search_terms = query.lower().split()
        
        conditions = []
        params = {}
        
        for i, term in enumerate(search_terms):
            if term.isdigit():
                # Search in document number
                conditions.append(f"numero_documento LIKE :doc_{i}")
                params[f"doc_{i}"] = f"%{term}%"
            else:
                # Search in names and other text fields
                conditions.append(f"""
                    (LOWER(primer_nombre) LIKE :name_{i} OR 
                     LOWER(segundo_nombre) LIKE :name_{i} OR 
                     LOWER(apellidos) LIKE :name_{i} OR 
                     LOWER(email) LIKE :name_{i})
                """)
                params[f"name_{i}"] = f"%{term}%"
        
        where_clause = " OR ".join(conditions)
        sql = f"""
            SELECT * FROM personas 
            WHERE {where_clause}
            LIMIT 5
        """
        
        result = db.execute(text(sql), params)
        return [dict(row) for row in result]
    finally:
        db.close()

def generate_answer(query: str, relevant_data: List[dict]) -> str:
    template = """
    Basado en la siguiente consulta y los datos relevantes, proporciona una respuesta clara y concisa:

    Consulta: {query}

    Datos relevantes:
    {relevant_data}

    Respuesta:
    """
    
    prompt = PromptTemplate(
        input_variables=["query", "relevant_data"],
        template=template
    )
    
    chain = LLMChain(llm=llm, prompt=prompt)
    
    formatted_data = "\n".join([str(data) for data in relevant_data])
    response = chain.run(query=query, relevant_data=formatted_data)
    
    return response

@app.post("/query/", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    try:
        relevant_data = get_relevant_data(request.query)
        
        answer = generate_answer(request.query, relevant_data)
        
        return QueryResponse(
            answer=answer,
            relevant_data=relevant_data if relevant_data else None
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 