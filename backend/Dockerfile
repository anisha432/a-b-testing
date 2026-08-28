# ExperimentIQ Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Use environment variable for port (Render compatible)
ENV PORT=8000

EXPOSE $PORT

# Production command - no --reload
CMD uvicorn app.main:app --host 0.0.0.0 --port $PORT
