import pytest
from app.mcp.mcp_client import MCPClient
from app.mcp.tools import execute_calculate, execute_faq_search

@pytest.mark.asyncio
async def test_mcp_calculator():
    res = await execute_calculate("(250 * 4) + 50")
    assert res.get("result") == 1050

@pytest.mark.asyncio
async def test_mcp_faq_search():
    res = await execute_faq_search("what is your refund policy?")
    assert len(res.get("matches", [])) > 0
    top = res["matches"][0]
    assert "refund" in top["topic"]

@pytest.mark.asyncio
async def test_mcp_client_permission_enforcement():
    # Customer user
    user = {"_id": "cust_1", "role": "customer", "email": "customer@test.com"}
    res = await MCPClient.execute_tool(
        tool_name="calculate",
        arguments={"expression": "100 + 20"},
        current_user=user
    )
    assert res.get("result") == 120
