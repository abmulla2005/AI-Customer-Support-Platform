import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate, UserLogin, UserRole

def test_password_hashing():
    pw = "SuperSecurePassword123!"
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False

def test_jwt_token_creation_and_decoding():
    token = create_access_token("user_12345", "customer", "customer@test.com")
    payload = decode_token(token)
    assert payload["sub"] == "user_12345"
    assert payload["role"] == "customer"
    assert payload["email"] == "customer@test.com"
    assert payload["type"] == "access"

@pytest.mark.asyncio
async def test_signup_and_login_flow():
    user_in = UserCreate(
        email="john_doe@example.com",
        full_name="John Doe",
        password="ValidPassword123!",
        role=UserRole.CUSTOMER
    )
    # Signup
    token_resp = await AuthService.signup(user_in)
    assert token_resp.access_token is not None
    assert token_resp.user.email == "john_doe@example.com"
    assert token_resp.user.role == UserRole.CUSTOMER

    # Login
    login_in = UserLogin(email="john_doe@example.com", password="ValidPassword123!")
    login_resp = await AuthService.login(login_in)
    assert login_resp.access_token is not None
    assert login_resp.user.id == token_resp.user.id
