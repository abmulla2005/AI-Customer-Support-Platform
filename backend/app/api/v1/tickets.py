import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.auth.dependencies import get_current_user, require_role
from app.database.mongodb import get_database
from app.schemas.ticket import (
    EmployeeNoteCreate,
    EmployeeNoteResponse,
    TicketCreate,
    TicketPriority,
    TicketReplyRequest,
    TicketResponse,
    TicketStatus,
    TicketUpdate,
)
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/tickets", tags=["Support Tickets"])

@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    body: TicketCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    ticket_id = f"TICK-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)
    user_id = str(current_user["_id"])

    doc = {
        "_id": ticket_id,
        "customer_id": user_id,
        "customer_email": current_user.get("email"),
        "customer_name": current_user.get("full_name"),
        "assigned_employee_id": None,
        "assigned_employee_name": None,
        "title": body.title,
        "description": body.description,
        "status": TicketStatus.OPEN.value,
        "priority": body.priority.value,
        "chat_thread_id": body.chat_thread_id,
        "created_at": now,
        "updated_at": now
    }
    await db.support_tickets.insert_one(doc)

    await record_audit_log(
        action="CREATE_TICKET",
        resource="tickets",
        user_id=user_id,
        user_email=current_user.get("email"),
        details={"ticket_id": ticket_id, "priority": body.priority.value}
    )

    return TicketResponse(
        id=ticket_id,
        customer_id=user_id,
        customer_email=doc["customer_email"],
        customer_name=doc["customer_name"],
        assigned_employee_id=None,
        assigned_employee_name=None,
        title=doc["title"],
        description=doc["description"],
        status=TicketStatus.OPEN,
        priority=body.priority,
        chat_thread_id=body.chat_thread_id,
        created_at=now,
        updated_at=now
    )

@router.get("", response_model=List[TicketResponse])
async def list_tickets(
    status_filter: Optional[TicketStatus] = None,
    priority_filter: Optional[TicketPriority] = None,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["_id"])
    role = current_user.get("role")

    query = {}
    if role == "customer":
        query["customer_id"] = user_id
    elif role == "employee":
        # Show tickets assigned to this employee OR unassigned open tickets
        query["$or"] = [
            {"assigned_employee_id": user_id},
            {"assigned_employee_id": None}
        ]

    if status_filter:
        query["status"] = status_filter.value
    if priority_filter:
        query["priority"] = priority_filter.value

    cursor = db.support_tickets.find(query).sort("created_at", -1)
    tickets = await cursor.to_list(length=100)

    return [
        TicketResponse(
            id=str(t["_id"]),
            customer_id=t["customer_id"],
            customer_email=t.get("customer_email"),
            customer_name=t.get("customer_name"),
            assigned_employee_id=t.get("assigned_employee_id"),
            assigned_employee_name=t.get("assigned_employee_name"),
            title=t["title"],
            description=t["description"],
            status=t.get("status", TicketStatus.OPEN.value),
            priority=t.get("priority", TicketPriority.MEDIUM.value),
            chat_thread_id=t.get("chat_thread_id"),
            created_at=t.get("created_at", datetime.now(timezone.utc)),
            updated_at=t.get("updated_at", datetime.now(timezone.utc))
        )
        for t in tickets
    ]

@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    ticket = await db.support_tickets.find_one({"_id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    user_id = str(current_user["_id"])
    role = current_user.get("role")
    if role == "customer" and ticket["customer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access other customers' tickets")

    return TicketResponse(
        id=str(ticket["_id"]),
        customer_id=ticket["customer_id"],
        customer_email=ticket.get("customer_email"),
        customer_name=ticket.get("customer_name"),
        assigned_employee_id=ticket.get("assigned_employee_id"),
        assigned_employee_name=ticket.get("assigned_employee_name"),
        title=ticket["title"],
        description=ticket["description"],
        status=ticket.get("status", TicketStatus.OPEN.value),
        priority=ticket.get("priority", TicketPriority.MEDIUM.value),
        chat_thread_id=ticket.get("chat_thread_id"),
        created_at=ticket.get("created_at", datetime.now(timezone.utc)),
        updated_at=ticket.get("updated_at", datetime.now(timezone.utc))
    )

@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    update: TicketUpdate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    ticket = await db.support_tickets.find_one({"_id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    user_id = str(current_user["_id"])
    role = current_user.get("role")
    if role == "customer" and ticket["customer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    now = datetime.now(timezone.utc)
    set_fields = {"updated_at": now}

    if update.status:
        set_fields["status"] = update.status.value
    if update.priority and role in ["employee", "admin"]:
        set_fields["priority"] = update.priority.value

    # Assigning employee (authorized employees/admins only)
    if update.assigned_employee_id is not None and role in ["employee", "admin"]:
        if update.assigned_employee_id == "":
            set_fields["assigned_employee_id"] = None
            set_fields["assigned_employee_name"] = None
        else:
            emp = await db.users.find_one({"_id": update.assigned_employee_id})
            if emp:
                set_fields["assigned_employee_id"] = update.assigned_employee_id
                set_fields["assigned_employee_name"] = emp.get("full_name")

    await db.support_tickets.update_one({"_id": ticket_id}, {"$set": set_fields})
    updated = await db.support_tickets.find_one({"_id": ticket_id})

    return TicketResponse(
        id=str(updated["_id"]),
        customer_id=updated["customer_id"],
        customer_email=updated.get("customer_email"),
        customer_name=updated.get("customer_name"),
        assigned_employee_id=updated.get("assigned_employee_id"),
        assigned_employee_name=updated.get("assigned_employee_name"),
        title=updated["title"],
        description=updated["description"],
        status=updated.get("status"),
        priority=updated.get("priority"),
        chat_thread_id=updated.get("chat_thread_id"),
        created_at=updated.get("created_at"),
        updated_at=updated.get("updated_at")
    )

# Internal Employee Notes (Isolation Guarantee: accessible only to employees/admins)
@router.post("/{ticket_id}/notes", response_model=EmployeeNoteResponse, status_code=status.HTTP_201_CREATED)
async def add_employee_note(
    ticket_id: str,
    note_in: EmployeeNoteCreate,
    current_user: dict = Depends(require_role(["employee", "admin"]))
):
    db = get_database()
    ticket = await db.support_tickets.find_one({"_id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    note_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    note_doc = {
        "_id": note_id,
        "ticket_id": ticket_id,
        "author_id": str(current_user["_id"]),
        "author_name": current_user.get("full_name", "Employee"),
        "content": note_in.content,
        "created_at": now
    }
    await db.employee_notes.insert_one(note_doc)

    return EmployeeNoteResponse(
        id=note_id,
        ticket_id=ticket_id,
        author_id=note_doc["author_id"],
        author_name=note_doc["author_name"],
        content=note_doc["content"],
        created_at=now
    )

@router.get("/{ticket_id}/notes", response_model=List[EmployeeNoteResponse])
async def list_employee_notes(
    ticket_id: str,
    current_user: dict = Depends(require_role(["employee", "admin"]))
):
    db = get_database()
    cursor = db.employee_notes.find({"ticket_id": ticket_id}).sort("created_at", 1)
    notes = await cursor.to_list(length=100)
    return [
        EmployeeNoteResponse(
            id=str(n["_id"]),
            ticket_id=n["ticket_id"],
            author_id=n["author_id"],
            author_name=n.get("author_name", "Employee"),
            content=n["content"],
            created_at=n.get("created_at", datetime.now(timezone.utc))
        )
        for n in notes
    ]
