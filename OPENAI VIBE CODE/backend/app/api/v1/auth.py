from fastapi import APIRouter, Depends, Request, status
from app.auth.dependencies import get_current_user
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    PasswordResetRequest,
    PasswordResetConfirm,
)
from app.schemas.token import TokenResponse, RefreshTokenRequest
from app.services.auth_service import AuthService, _format_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_in: UserCreate, request: Request):
    ip = request.client.host if request.client else None
    return await AuthService.signup(user_in, ip_address=ip)

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request):
    ip = request.client.host if request.client else None
    return await AuthService.login(credentials, ip_address=ip)

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshTokenRequest):
    return await AuthService.refresh_tokens(body.refresh_token)

@router.post("/logout")
async def logout(
    current_user: dict = Depends(get_current_user),
    body: RefreshTokenRequest = None
):
    refresh_tok = body.refresh_token if body else None
    await AuthService.logout(str(current_user["_id"]), refresh_tok)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return _format_user(current_user)

@router.patch("/me", response_model=UserResponse)
async def update_me(
    update: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    return await AuthService.update_profile(str(current_user["_id"]), update)

@router.delete("/me")
async def delete_me(current_user: dict = Depends(get_current_user)):
    await AuthService.delete_account(str(current_user["_id"]))
    return {"message": "Account and all associated personal data permanently erased."}

@router.post("/forgot-password")
async def forgot_password(body: PasswordResetRequest):
    return await AuthService.forgot_password(body.email)

@router.post("/reset-password")
async def reset_password(body: PasswordResetConfirm):
    return await AuthService.reset_password(body.token, body.new_password)
