from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database.mongodb import db_manager
from app.services.auth_service import AuthService

from app.api.v1.auth import router as auth_router
from app.api.v1.chats import router as chats_router
from app.api.v1.documents import router as documents_router
from app.api.v1.tickets import router as tickets_router
from app.api.v1.employee import router as employee_router
from app.api.v1.admin import router as admin_router
from app.api.v1.mcp import router as mcp_router
from app.api.v1.health import router as health_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ai_support_platform")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB Atlas and seed admin
    logger.info("Initializing AI Customer Support Platform backend...")
    await db_manager.connect()
    await AuthService.seed_initial_admin()
    yield
    # Shutdown
    await db_manager.disconnect()
    logger.info("AI Customer Support Platform shutdown complete.")

app = FastAPI(
    title=settings.APP_NAME,
    description="Modern, ChatGPT-like AI Customer Support Platform powered by FastAPI, LangChain, LangGraph, MCP, RAG, and MongoDB Atlas.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health_router)
app.include_router(auth_router, prefix="/api")
app.include_router(chats_router, prefix="/api")
app.include_router(documents_router, prefix="/api")
app.include_router(tickets_router, prefix="/api")
app.include_router(employee_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(mcp_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "online",
        "documentation": "/docs",
        "api_v1": "/api"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
