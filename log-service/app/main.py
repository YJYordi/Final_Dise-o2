from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

app = FastAPI()

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:password@db:5432/personas")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String)
    documento = Column(String)
    detalles = Column(String)
    fecha = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

class LogCreate(BaseModel):
    tipo: str
    documento: str
    detalles: str

class LogResponse(LogCreate):
    id: int
    fecha: datetime

    class Config:
        from_attributes = True

@app.post("/logs/", response_model=LogResponse)
async def create_log(log: LogCreate):
    db = SessionLocal()
    try:
        db_log = Log(**log.dict())
        db.add(db_log)
        db.commit()
        db.refresh(db_log)
        return db_log
    finally:
        db.close()

@app.get("/logs/")
async def get_logs(
    tipo: Optional[str] = None,
    documento: Optional[str] = None,
    fecha_inicio: Optional[datetime] = None,
    fecha_fin: Optional[datetime] = None
):
    db = SessionLocal()
    try:
        query = db.query(Log)
        
        if tipo:
            query = query.filter(Log.tipo == tipo)
        if documento:
            query = query.filter(Log.documento == documento)
        if fecha_inicio:
            query = query.filter(Log.fecha >= fecha_inicio)
        if fecha_fin:
            query = query.filter(Log.fecha <= fecha_fin)
        
        logs = query.order_by(Log.fecha.desc()).all()
        return logs
    finally:
        db.close() 