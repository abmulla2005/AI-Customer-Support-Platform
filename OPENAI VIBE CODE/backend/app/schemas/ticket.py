from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field

class TicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class TicketPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class TicketCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    description: str = Field(..., min_length=10)
    priority: TicketPriority = TicketPriority.MEDIUM
    chat_thread_id: Optional[str] = None

class TicketUpdate(BaseModel):
    status: Optional[TicketStatus] = None
    priority: Optional[TicketPriority] = None
    assigned_employee_id: Optional[str] = None

class TicketResponse(BaseModel):
    id: str
    customer_id: str
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    assigned_employee_id: Optional[str] = None
    assigned_employee_name: Optional[str] = None
    title: str
    description: str
    status: TicketStatus
    priority: TicketPriority
    chat_thread_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EmployeeNoteCreate(BaseModel):
    content: str = Field(..., min_length=2)

class EmployeeNoteResponse(BaseModel):
    id: str
    ticket_id: str
    author_id: str
    author_name: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

class TicketReplyRequest(BaseModel):
    message: str = Field(..., min_length=1)
