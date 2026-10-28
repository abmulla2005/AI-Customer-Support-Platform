from typing import Optional
from pydantic import BaseModel
from app.schemas.user import UserResponse

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class TokenPayload(BaseModel):
    sub: str
    role: str
    email: str
    exp: int
    type: str
