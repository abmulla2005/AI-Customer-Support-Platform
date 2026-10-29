from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.security import decode_token
from app.database.mongodb import get_database
from app.schemas.user import UserRole, UserResponse

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    """Validate access token and return current user document."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token, is_refresh=False)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "access":
            raise credentials_exception
    except Exception:
        raise credentials_exception

    db = get_database()
    user = await db.users.find_one({"_id": user_id})
    if user is None:
        raise credentials_exception
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated"
        )
    
    # Format document
    user["id"] = str(user["_id"])
    return user

async def get_current_active_user(current_user: dict = Depends(get_current_user)) -> dict:
    return current_user

def require_role(allowed_roles: List[str]):
    """Role-based access control dependency factory."""
    async def role_checker(current_user: dict = Depends(get_current_user)) -> dict:
        user_role = current_user.get("role")
        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Operation requires one of the following roles: {allowed_roles}"
            )
        return current_user
    return role_checker

async def verify_chat_access(chat_id: str, current_user: dict) -> dict:
    """Verify that current user is authorized to access the specific chat thread."""
    db = get_database()
    thread = await db.chat_threads.find_one({"_id": chat_id})
    if not thread:
        raise HTTPException(status_code=404, detail="Chat thread not found")
    
    user_id = str(current_user["_id"])
    user_role = current_user.get("role")
    
    # Customer can only access their own chats
    if user_role == UserRole.CUSTOMER.value and thread.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You cannot access other users' chats")
    
    # Employee or Admin can access chats
    return thread

async def verify_document_access(document_id: str, current_user: dict) -> dict:
    """Verify that current user is authorized to access the specific document."""
    db = get_database()
    doc = await db.documents.find_one({"_id": document_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    user_id = str(current_user["_id"])
    user_role = current_user.get("role")
    
    # Company documents are readable by authenticated users
    if doc.get("scope") == "company":
        return doc
        
    # User owns the document
    if doc.get("user_id") == user_id:
        return doc
        
    # Admins have full document oversight
    if user_role == UserRole.ADMIN.value:
        return doc
        
    raise HTTPException(status_code=403, detail="Forbidden: You cannot access this document")
