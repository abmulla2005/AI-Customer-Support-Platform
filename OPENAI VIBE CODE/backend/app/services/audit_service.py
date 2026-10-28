import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.database.mongodb import get_database

async def record_audit_log(
    action: str,
    resource: str,
    user_id: Optional[str] = None,
    user_email: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    """Log an audit event asynchronously."""
    try:
        db = get_database()
        log_entry = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_email": user_email,
            "action": action,
            "resource": resource,
            "details": details or {},
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc)
        }
        await db.audit_logs.insert_one(log_entry)
    except Exception as e:
        # Never break application flow if audit logging encounters an issue
        print(f"Warning: Audit log failure: {e}")
