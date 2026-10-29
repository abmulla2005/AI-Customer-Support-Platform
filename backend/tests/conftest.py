import asyncio
import pytest
from httpx import AsyncClient
from app.main import app
from app.database.mongodb import db_manager

@pytest.fixture(autouse=True)
def setup_db():
    asyncio.run(db_manager.connect())
    yield
    asyncio.run(db_manager.disconnect())

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as c:
        yield c
