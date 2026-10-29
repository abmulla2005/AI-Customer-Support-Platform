from fastapi import APIRouter
from app.core.config import settings
from app.database.mongodb import db_manager

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "database": "mock_memory" if db_manager.is_mock else "mongodb_atlas",
        "llm_provider": "openrouter" if settings.OPENROUTER_API_KEY else "contextual_assistant"
    }
