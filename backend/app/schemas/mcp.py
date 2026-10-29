from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class MCPToolDefinition(BaseModel):
    name: str
    description: str
    input_schema: Dict[str, Any]
    permitted_roles: List[str]

class MCPExecutionRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]

class MCPExecutionResponse(BaseModel):
    tool_name: str
    success: bool
    result: Any
    error: Optional[str] = None
