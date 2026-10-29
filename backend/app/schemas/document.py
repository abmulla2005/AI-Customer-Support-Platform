from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.chat import MessageSource

class DocumentScope(str, Enum):
    CUSTOMER = "customer"
    EMPLOYEE = "employee"
    COMPANY = "company"

class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    INDEXED = "indexed"
    FAILED = "failed"

class DocumentResponse(BaseModel):
    id: str
    user_id: str
    scope: DocumentScope
    filename: str
    file_size: int
    num_pages: int
    status: DocumentStatus
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentQueryRequest(BaseModel):
    query: str
    top_k: int = 4

class DocumentQueryResponse(BaseModel):
    query: str
    results: List[MessageSource]
