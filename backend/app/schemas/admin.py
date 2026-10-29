from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class AdminStatsResponse(BaseModel):
    total_users: int
    total_customers: int
    total_employees: int
    total_tickets: int
    open_tickets: int
    total_chats: int
    total_documents: int
    ai_tokens_used: int = 0
    activity_timeline: List[Dict[str, Any]] = []

class CompanyKnowledgeCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    category: str = Field(..., min_length=2, max_length=50)
    content: str = Field(..., min_length=10)
    tags: List[str] = []
    is_published: bool = True

class CompanyKnowledgeUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None

class CompanyKnowledgeResponse(BaseModel):
    id: str
    title: str
    category: str
    content: str
    tags: List[str]
    is_published: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    resource: str
    details: Dict[str, Any] = {}
    ip_address: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class AppSettingsUpdate(BaseModel):
    settings: Dict[str, Any]
