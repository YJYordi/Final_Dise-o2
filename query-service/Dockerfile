FROM python:3.11-slim

WORKDIR /app

# Instala solo las dependencias necesarias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia el código
COPY . .

# Ruta del secreto montado por Docker
ENV GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase-sa

# Expone el puerto y arranca Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]