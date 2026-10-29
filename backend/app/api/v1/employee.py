from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.auth.dependencies import require_role
from app.database.mongodb import get_database

router = APIRouter(prefix="/employee", tags=["Employee Workspace"])

class SuggestionRequest(BaseModel):
    customer_query: str
    ticket_id: str = None

@router.get("/dashboard")
async def get_employee_dashboard(
    current_user: dict = Depends(require_role(["employee", "admin"]))
):
    db = get_database()
    emp_id = str(current_user["_id"])

    assigned_count = await db.support_tickets.count_documents({
        "assigned_employee_id": emp_id,
        "status": {"$in": ["open", "in_progress"]}
    })
    unassigned_count = await db.support_tickets.count_documents({
        "assigned_employee_id": None,
        "status": "open"
    })
    resolved_count = await db.support_tickets.count_documents({
        "assigned_employee_id": emp_id,
        "status": "resolved"
    })

    return {
        "assigned_active_tickets": assigned_count,
        "unassigned_queue_tickets": unassigned_count,
        "resolved_tickets": resolved_count,
        "employee_name": current_user.get("full_name"),
        "employee_id": emp_id
    }

@router.get("/assignments")
async def get_employee_assignments(
    current_user: dict = Depends(require_role(["employee", "admin"]))
):
    db = get_database()
    emp_id = str(current_user["_id"])

    cursor = db.support_tickets.find({"assigned_employee_id": emp_id}).sort("updated_at", -1)
    assigned_tickets = await cursor.to_list(length=100)

    # Aggregate distinct assigned customers
    customer_ids = list({t["customer_id"] for t in assigned_tickets if "customer_id" in t})
    customers = []
    if customer_ids:
        c_cursor = db.users.find({"_id": {"$in": customer_ids}})
        customers = await c_cursor.to_list(length=100)

    return {
        "assigned_tickets": [
            {
                "id": str(t["_id"]),
                "customer_id": t["customer_id"],
                "customer_name": t.get("customer_name"),
                "customer_email": t.get("customer_email"),
                "title": t["title"],
                "status": t["status"],
                "priority": t["priority"],
                "updated_at": t.get("updated_at")
            }
            for t in assigned_tickets
        ],
        "assigned_customers": [
            {
                "id": str(c["_id"]),
                "email": c["email"],
                "full_name": c.get("full_name"),
                "created_at": c.get("created_at")
            }
            for c in customers
        ]
    }

@router.post("/suggestions")
async def generate_reply_suggestion(
    body: SuggestionRequest,
    current_user: dict = Depends(require_role(["employee", "admin"]))
):
    q = body.customer_query.lower()
    
    # Generate 3 distinct contextual reply recommendations (Formal, Empathetic, Action-oriented)
    suggestions = [
        f"Thank you for contacting our support team regarding '{body.customer_query[:40]}...'. I have reviewed your account and would be glad to help resolve this for you immediately.",
        f"I sincerely apologize for the inconvenience this has caused. We are actively prioritizing your request and will provide a status update shortly.",
        f"Could you please confirm if you have already tried restarting or clearing the application cache? If the issue persists, we will escalate this directly to our technical engineering tier."
    ]

    return {
        "query": body.customer_query,
        "suggestions": suggestions
    }
