#!/bin/bash
set -e

echo "ExperimentIQ Backend Starting..."
echo "Environment: ${APP_ENV:-development}"
echo "Port: ${PORT:-8000}"

# Wait for database to be ready
echo "Waiting for database..."
python -c "
import time, os, sys
import psycopg2
url = os.environ.get('DATABASE_URL', '')
for i in range(30):
    try:
        psycopg2.connect(url)
        print('Database is ready!')
        sys.exit(0)
    except Exception:
        print(f'  Attempt {i+1}/30...')
        time.sleep(2)
print('ERROR: Could not connect to database after 60s', file=sys.stderr)
sys.exit(1)
"

# Run database migrations / create tables
echo "Running database migrations..."
python -c "
from app.db.session import engine, Base
from app.models import *  # Import all models to register them
Base.metadata.create_all(bind=engine)
print('Database tables ready.')
"

# Start the application
echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WORKERS:-2}
