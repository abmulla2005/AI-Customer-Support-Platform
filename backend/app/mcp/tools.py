import math
from typing import Dict, Any, List
from app.database.mongodb import get_database

MCP_TOOLS_DEFINITIONS = [
    {
        "name": "calculate",
        "description": "Perform basic arithmetic, financial, or mathematical calculations accurately.",
        "permitted_roles": ["customer", "employee", "admin"],
        "requires_confirmation": False,
        "input_schema": {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression to evaluate, e.g. '(5000 * 0.18) + 120'"
                }
            },
            "required": ["expression"]
        }
    },
    {
        "name": "search_faq",
        "description": "Search common frequently asked questions, refund policies, billing, and warranty terms.",
        "permitted_roles": ["customer", "employee", "admin"],
        "requires_confirmation": False,
        "input_schema": {
            "type": "object",
            "properties": {
                "topic": {
                    "type": "string",
                    "description": "Topic or question keywords to search in FAQs"
                }
            },
            "required": ["topic"]
        }
    },
    {
        "name": "search_company_knowledge",
        "description": "Search official company knowledge base articles, standard operating procedures, and product specifications.",
        "permitted_roles": ["customer", "employee", "admin"],
        "requires_confirmation": False,
        "input_schema": {
            "type": "object",
            "properties": {
                "keyword": {
                    "type": "string",
                    "description": "Search keyword or category"
                }
            },
            "required": ["keyword"]
        }
    },
    {
        "name": "lookup_support_ticket",
        "description": "Lookup existing support ticket details by ticket ID. Enforces customer or employee ownership.",
        "permitted_roles": ["customer", "employee", "admin"],
        "requires_confirmation": False,
        "input_schema": {
            "type": "object",
            "properties": {
                "ticket_id": {
                    "type": "string",
                    "description": "The unique ID of the support ticket"
                }
            },
            "required": ["ticket_id"]
        }
    },
    {
        "name": "create_support_ticket",
        "description": "Escalate customer issue by creating an official support ticket for human agent resolution.",
        "permitted_roles": ["customer", "employee", "admin"],
        "requires_confirmation": False,
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Short summary of the customer's problem"
                },
                "description": {
                    "type": "string",
                    "description": "Detailed explanation of the issue"
                },
                "priority": {
                    "type": "string",
                    "enum": ["low", "medium", "high", "urgent"],
                    "description": "Severity level of the problem"
                }
            },
            "required": ["title", "description"]
        }
    },
    {
        "name": "search_authorized_documents",
        "description": "Semantic search in user's uploaded PDF documents.",
        "permitted_roles": ["customer", "employee", "admin"],
        "requires_confirmation": False,
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Question or semantic search phrase"
                }
            },
            "required": ["query"]
        }
    }
]

# FAQ static reference bank
FAQ_KNOWLEDGE = [
    {
        "topic": "refund policy",
        "keywords": ["refund", "return", "money back", "cancel"],
        "answer": "Our standard refund policy allows full refunds within 30 days of purchase for unused products with original proof of purchase. Refunds are processed back to the original payment method within 5-7 business days."
    },
    {
        "topic": "warranty",
        "keywords": ["warranty", "guarantee", "repair", "replace", "defect"],
        "answer": "All hardware products carry a comprehensive 1-year manufacturer warranty against factory defects. Accidental damage can be covered with our Support Care Plus plan."
    },
    {
        "topic": "billing and invoices",
        "keywords": ["bill", "billing", "invoice", "receipt", "gst", "tax"],
        "answer": "Invoices with applicable GST details are generated automatically and sent to your registered email upon purchase. You can also download past receipts in Account Settings > Billing."
    },
    {
        "topic": "shipping and delivery",
        "keywords": ["shipping", "delivery", "track", "courier", "arrival"],
        "answer": "Standard domestic delivery takes 3 to 5 business days. Express shipping delivers within 24-48 hours in metro areas. Tracking numbers are emailed upon courier dispatch."
    },
    {
        "topic": "account security",
        "keywords": ["password", "reset", "security", "login", "auth", "2fa"],
        "answer": "You can change or reset your password using the 'Forgot Password' link on the login page. We recommend 8+ characters and enabling security notifications."
    }
]

async def execute_calculate(expression: str) -> Dict[str, Any]:
    # Safe calculator sandbox
    allowed_chars = set("0123456789+-*/(). %e")
    if not all(c in allowed_chars for c in expression):
        return {"error": "Invalid characters in mathematical expression. Only standard arithmetic operations are permitted."}
    try:
        # evaluate in restricted scope
        res = eval(expression, {"__builtins__": None, "math": math}, {})
        return {"result": res, "expression": expression}
    except Exception as e:
        return {"error": f"Evaluation error: {str(e)}"}

async def execute_faq_search(topic: str) -> Dict[str, Any]:
    query_lower = topic.lower()
    matches = []
    for item in FAQ_KNOWLEDGE:
        score = 0
        if any(kw in query_lower for kw in item["keywords"]):
            score += 2
        if item["topic"] in query_lower or query_lower in item["topic"]:
            score += 3
        if score > 0:
            matches.append((score, item))
    matches.sort(key=lambda x: x[0], reverse=True)
    if matches:
        return {"matches": [{"topic": m[1]["topic"], "answer": m[1]["answer"]} for m in matches[:3]]}
    return {"matches": [], "message": "No matching FAQ articles found. Consider escalating to a human support agent or creating a ticket."}

async def execute_knowledge_search(keyword: str) -> Dict[str, Any]:
    db = get_database()
    regex = {"$regex": keyword, "$options": "i"}
    cursor = db.company_knowledge.find({
        "is_published": True,
        "$or": [{"title": regex}, {"content": regex}, {"category": regex}, {"tags": keyword.lower()}]
    }).limit(3)
    docs = await cursor.to_list(length=3)
    if docs:
        return {
            "articles": [
                {"title": d["title"], "category": d["category"], "content": d["content"]}
                for d in docs
            ]
        }
    return {"articles": [], "message": "No matching published knowledge base articles."}

async def execute_ticket_lookup(ticket_id: str, current_user: Dict[str, Any]) -> Dict[str, Any]:
    db = get_database()
    ticket = await db.support_tickets.find_one({"_id": ticket_id})
    if not ticket:
        return {"error": f"Ticket #{ticket_id} was not found."}
    
    # Ownership permission check
    user_id = str(current_user["_id"])
    role = current_user.get("role")
    if role == "customer" and ticket.get("customer_id") != user_id:
        return {"error": "Access denied: You are not authorized to view this ticket."}

    return {
        "ticket": {
            "id": ticket["_id"],
            "title": ticket.get("title"),
            "status": ticket.get("status"),
            "priority": ticket.get("priority"),
            "created_at": str(ticket.get("created_at")),
            "description": ticket.get("description")
        }
    }

async def execute_create_ticket(
    title: str,
    description: str,
    priority: str = "medium",
    current_user: Dict[str, Any] = None
) -> Dict[str, Any]:
    import uuid
    from datetime import datetime, timezone
    
    db = get_database()
    user_id = str(current_user["_id"])
    ticket_id = f"TICK-{uuid.uuid4().hex[:8].upper()}"

    doc = {
        "_id": ticket_id,
        "customer_id": user_id,
        "customer_email": current_user.get("email"),
        "customer_name": current_user.get("full_name"),
        "assigned_employee_id": None,
        "assigned_employee_name": None,
        "title": title,
        "description": description,
        "status": "open",
        "priority": priority,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.support_tickets.insert_one(doc)
    return {
        "success": True,
        "ticket_id": ticket_id,
        "message": f"Support ticket #{ticket_id} has been created successfully with priority '{priority}'."
    }
