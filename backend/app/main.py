"""
ExperimentIQ - AI-Powered A/B Testing & Experimentation Intelligence Platform
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.db.session import engine, Base
from app.api.v1 import auth, experiments, datasets, analytics, reports

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ExperimentIQ API",
    description="AI-Powered A/B Testing & Experimentation Intelligence Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/api/v1")
app.include_router(experiments.router, prefix="/api/v1")
app.include_router(datasets.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": "ExperimentIQ", "version": "1.0.0"}


@app.get("/")
async def root():
    return {
        "name": "ExperimentIQ",
        "description": "AI-Powered A/B Testing & Experimentation Intelligence Platform",
        "version": "1.0.0",
        "docs": "/docs",
    }
