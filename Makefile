.PHONY: help install dev stop seed test docker-up docker-down docker-build

help:
	@echo "ExperimentIQ - Available commands:"
	@echo "  make install    - Install all dependencies"
	@echo "  make dev        - Start development servers"
	@echo "  make stop       - Stop all services"
	@echo "  make seed       - Seed database with demo data"
	@echo "  make test       - Run all tests"
	@echo "  make docker-up  - Start with Docker Compose"
	@echo "  make docker-down- Stop Docker Compose"
	@echo "  make docker-build- Build Docker images"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

dev:
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
	cd frontend && npm run dev

stop:
	pkill -f "uvicorn" || true
	pkill -f "vite" || true

seed:
	cd backend && python -c "import sys; sys.path.insert(0, '.'); from scripts.seed import seed; seed()"

test:
	cd backend && python -m pytest tests/ -v
	cd frontend && npm run build

docker-up:
	docker-compose up -d --build

docker-down:
	docker-compose down

docker-build:
	docker-compose build

db-init:
	cd backend && python -c "from app.db.session import engine, Base; from app.models import *; Base.metadata.create_all(bind=engine)"
