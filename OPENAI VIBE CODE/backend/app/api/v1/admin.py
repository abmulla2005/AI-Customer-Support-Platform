import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from app.auth.dependencies import require_role
from app.database.mongodb import get_database
from app.schemas.admin import (
    AdminStatsResponse,
    AuditLogResponse,
    CompanyKnowledgeCreate,
    CompanyKnowledgeResponse,
    CompanyKnowledgeUpdate,
)
from app.schemas.user import UserResponse, UserUpdate
from app.services.auth_service import _format_user
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/admin", tags=["Admin Control Panel"])

@router.get("/analytics", response_model=AdminStatsResponse)
async def get_analytics(current_user: dict = Depends(require_role(["admin"]))):
    db = get_database()
    total_users = await db.users.count_documents({})
    total_customers = await db.users.count_documents({"role": "customer"})
    total_employees = await db.users.count_documents({"role": "employee"})
    total_tickets = await db.support_tickets.count_documents({})
    open_tickets = await db.support_tickets.count_documents({"status": "open"})
    total_chats = await db.chat_threads.count_documents({})
    total_docs = await db.documents.count_documents({})
    total_messages = await db.messages.count_documents({})

    # Mock or aggregate token consumption
    estimated_tokens = total_messages * 180

    timeline = [
        {"day": "Mon", "chats": max(5, total_chats // 5), "tickets": max(2, total_tickets // 4)},
        {"day": "Tue", "chats": max(8, total_chats // 4), "tickets": max(3, total_tickets // 3)},
        {"day": "Wed", "chats": max(12, total_chats // 3), "tickets": max(4, total_tickets // 3)},
        {"day": "Thu", "chats": max(15, total_chats // 2), "tickets": max(6, total_tickets // 2)},
        {"day": "Fri", "chats": total_chats, "tickets": total_tickets},
    ]

    return AdminStatsResponse(
        total_users=total_users,
        total_customers=total_customers,
        total_employees=total_employees,
        total_tickets=total_tickets,
        open_tickets=open_tickets,
        total_chats=total_chats,
        total_documents=total_docs,
        ai_tokens_used=estimated_tokens,
        activity_timeline=timeline
    )

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    role: Optional[str] = None,
    current_user: dict = Depends(require_role(["admin"]))
):
    db = get_database()
    q = {}
    if role:
        q["role"] = role
    cursor = db.users.find(q).sort("created_at", -1)
    users = await cursor.to_list(length=100)
    return [_format_user(u) for u in users]

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    update: UserUpdate,
    current_user: dict = Depends(require_role(["admin"]))
):
    db = get_database()
    target = await db.users.find_one({"_id": user_id})
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    fields: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
    if update.role:
        fields["role"] = update.role.value
    if update.is_active is not None:
        fields["is_active"] = update.is_active
    if update.full_name is not None:
        fields["full_name"] = update.full_name

    await db.users.update_one({"_id": user_id}, {"$set": fields})
    updated = await db.users.find_one({"_id": user_id})

    await record_audit_log(
        action="ADMIN_UPDATE_USER",
        resource="users",
        user_id=str(current_user["_id"]),
        user_email=current_user.get("email"),
        details={"target_user_id": user_id, "changes": fields}
    )

    return _format_user(updated)

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    if user_id == str(current_user["_id"]):
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account")

    db = get_database()
    await db.users.delete_one({"_id": user_id})
    await db.refresh_sessions.delete_many({"user_id": user_id})
    await db.chat_threads.delete_many({"user_id": user_id})
    await db.messages.delete_many({"user_id": user_id})

    await record_audit_log(
        action="ADMIN_DELETE_USER",
        resource="users",
        user_id=str(current_user["_id"]),
        user_email=current_user.get("email"),
        details={"deleted_user_id": user_id}
    )

    return {"message": "User and associated records removed successfully"}

# Company Knowledge Base Management
@router.get("/knowledge", response_model=List[CompanyKnowledgeResponse])
async def list_knowledge(current_user: dict = Depends(require_role(["admin", "employee"]))):
    db = get_database()
    cursor = db.company_knowledge.find({}).sort("created_at", -1)
    articles = await cursor.to_list(length=100)
    return [
        CompanyKnowledgeResponse(
            id=str(a["_id"]),
            title=a["title"],
            category=a["category"],
            content=a["content"],
            tags=a.get("tags", []),
            is_published=a.get("is_published", True),
            created_at=a.get("created_at", datetime.now(timezone.utc)),
            updated_at=a.get("updated_at", datetime.now(timezone.utc))
        )
        for a in articles
    ]

@router.post("/knowledge", response_model=CompanyKnowledgeResponse)
async def create_knowledge(
    body: CompanyKnowledgeCreate,
    current_user: dict = Depends(require_role(["admin"]))
):
    db = get_database()
    k_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "_id": k_id,
        "title": body.title,
        "category": body.category,
        "content": body.content,
        "tags": body.tags,
        "is_published": body.is_published,
        "created_at": now,
        "updated_at": now
    }
    await db.company_knowledge.insert_one(doc)
    return CompanyKnowledgeResponse(
        id=k_id,
        title=doc["title"],
        category=doc["category"],
        content=doc["content"],
        tags=doc["tags"],
        is_published=doc["is_published"],
        created_at=now,
        updated_at=now
    )

@router.delete("/knowledge/{knowledge_id}")
async def delete_knowledge(
    knowledge_id: str,
    current_user: dict = Depends(require_role(["admin"]))
):
    db = get_database()
    await db.company_knowledge.delete_one({"_id": knowledge_id})
    return {"message": "Knowledge article deleted"}

@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_role(["admin"]))
):
    db = get_database()
    cursor = db.audit_logs.find({}).sort("timestamp", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    return [
        AuditLogResponse(
            id=str(l["_id"]),
            user_id=l.get("user_id"),
            user_email=l.get("user_email"),
            action=l["action"],
            resource=l["resource"],
            details=l.get("details", {}),
            ip_address=l.get("ip_address"),
            timestamp=l.get("timestamp", datetime.now(timezone.utc))
        )
        for l in logs
    ]

@router.get("/settings")
async def get_settings(current_user: dict = Depends(require_role(["admin"]))):
    db = get_database()
    stored = await db.application_settings.find_one({"_id": "global_config"})
    return stored.get("value") if stored else {
        "openrouter_model": "anthropic/claude-3-haiku",
        "temperature": 0.2,
        "rag_chunk_size": 600,
        "rag_chunk_overlap": 80,
        "mcp_enabled_tools": ["calculate", "search_faq", "search_company_knowledge", "lookup_support_ticket", "create_support_ticket", "search_authorized_documents"],
        "max_upload_size_mb": 25
    }

@router.patch("/settings")
async def update_settings(
    settings_data: Dict[str, Any],
    current_user: dict = Depends(require_role(["admin"]))
):
    db = get_database()
    await db.application_settings.update_one(
        {"_id": "global_config"},
        {"$set": {"value": settings_data, "updated_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "System settings updated successfully", "settings": settings_data}
