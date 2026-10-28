from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class MessageSource(BaseModel):
    document_id: str
    filename: str
    page_number: int
    snippet: str
    relevance_score: float = 1.0

class MessageBase(BaseModel):
    content: str

class MessageCreate(MessageBase):
    language: Optional[str] = "en"  # en, hi, mr
    selected_document_ids: Optional[List[str]] = None

class MessageFeedback(BaseModel):
    feedback: str = Field(..., pattern="^(like|dislike)$")
    comment: Optional[str] = None

class MessageResponse(BaseModel):
    id: str
    thread_id: str
    user_id: str
    role: str  # user, assistant, system, tool
    content: str
    sources: List[MessageSource] = []
    tool_calls: Optional[List[Dict[str, Any]]] = None
    feedback: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ChatThreadCreate(BaseModel):
    title: Optional[str] = "New Conversation"

class ChatThreadUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)

class ChatThreadResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message: Optional[str] = None

    class Config:
        from_attributes = True
