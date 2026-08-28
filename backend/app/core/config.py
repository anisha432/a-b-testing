from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "ExperimentIQ"
    APP_ENV: str = "development"
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "postgresql://experimentiq:experimentiq@localhost:5432/experimentiq"

    # JWT
    JWT_SECRET: str = "dev-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # File uploads
    MAX_UPLOAD_SIZE_MB: int = 100

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
