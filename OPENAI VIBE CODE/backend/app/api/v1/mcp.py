from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.auth.dependencies import get_current_user
from app.mcp.mcp_client import MCPClient
from app.schemas.mcp import MCPExecutionRequest, MCPExecutionResponse, MCPToolDefinition

router = APIRouter(prefix="/mcp", tags=["Model Context Protocol (MCP)"])

@router.get("/tools", response_model=List[MCPToolDefinition])
async def list_available_mcp_tools(current_user: dict = Depends(get_current_user)):
    user_role = current_user.get("role", "customer")
    tools = MCPClient.get_available_tools(user_role)
    return [
        MCPToolDefinition(
            name=t["name"],
            description=t["description"],
            input_schema=t["input_schema"],
            permitted_roles=t["permitted_roles"]
        )
        for t in tools
    ]

@router.post("/execute", response_model=MCPExecutionResponse)
async def execute_mcp_tool(
    body: MCPExecutionRequest,
    current_user: dict = Depends(get_current_user)
):
    result = await MCPClient.execute_tool(
        tool_name=body.tool_name,
        arguments=body.arguments,
        current_user=current_user
    )
    if "error" in result:
        return MCPExecutionResponse(
            tool_name=body.tool_name,
            success=False,
            result=None,
            error=result["error"]
        )
    return MCPExecutionResponse(
        tool_name=body.tool_name,
        success=True,
        result=result,
        error=None
    )
