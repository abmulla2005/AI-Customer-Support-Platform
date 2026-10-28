from functools import lru_cache
import os
from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    APP_NAME: str = "AI Customer Support Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    # MongoDB Atlas Connection
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "ai_support_platform"

    # JWT Authentication
    JWT_SECRET: str = "changethis_super_secret_jwt_access_key_minimum_32_characters_long_12345"
    JWT_REFRESH_SECRET: str = "changethis_super_secret_jwt_refresh_key_minimum_32_characters_long_12345"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Initial Admin Provisioning
    INITIAL_ADMIN_EMAIL: str = "admin@aisupport.local"
    INITIAL_ADMIN_PASSWORD: str = "AdminSecurePassword123!"
    INITIAL_ADMIN_NAME: str = "System Administrator"

    # LLM Settings (OpenRouter)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "anthropic/claude-3-haiku"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # Embeddings
    EMBEDDING_PROVIDER: str = "local"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # RAG Settings
    UPLOAD_DIR: str = str(BASE_DIR / "uploads")
    MAX_UPLOAD_SIZE_MB: int = 25
    CHUNK_SIZE: int = 600
    CHUNK_OVERLAP: int = 80

    # SMTP Configuration (Optional)
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "support@aisupport.local"

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
