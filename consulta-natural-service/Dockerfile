FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
COPY app /app/app

RUN pip install --no-cache-dir -r /app/requirements.txt

EXPOSE 8003
ENV GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase-sa

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]