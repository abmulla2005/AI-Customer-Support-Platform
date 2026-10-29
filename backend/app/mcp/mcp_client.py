import asyncio
import logging
from typing import Dict, Any, List, Optional
from app.mcp.tools import (
    MCP_TOOLS_DEFINITIONS,
    execute_calculate,
    execute_faq_search,
    execute_knowledge_search,
    execute_ticket_lookup,
    execute_create_ticket,
)
from app.rag.vector_store import VectorStore
from app.services.audit_service import record_audit_log

logger = logging.getLogger(__name__)

class MCPClient:
    """Client for invoking Model Context Protocol (MCP) compatible tools with strict RBAC."""

    @staticmethod
    def get_available_tools(user_role: str) -> List[Dict[str, Any]]:
        """Return tool definitions permitted for the user's role."""
        return [
            tool for tool in MCP_TOOLS_DEFINITIONS
            if user_role in tool.get("permitted_roles", [])
        ]

    @classmethod
    async def execute_tool(
        cls,
        tool_name: str,
        arguments: Dict[str, Any],
        current_user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute tool with input validation, role checks, timeouts, and auditing."""
        user_role = current_user.get("role", "customer")
        user_id = str(current_user["_id"])
        
        # 1. Permission check
        tool_def = next((t for t in MCP_TOOLS_DEFINITIONS if t["name"] == tool_name), None)
        if not tool_def:
            return {"error": f"Tool '{tool_name}' not found in registry."}

        if user_role not in tool_def.get("permitted_roles", []):
            return {
                "error": f"Security Exception: Role '{user_role}' is not authorized to execute tool '{tool_name}'."
            }

        # 2. Execution with timeout
        try:
            async with asyncio.timeout(10.0):
                if tool_name == "calculate":
                    res = await execute_calculate(arguments.get("expression", ""))
                elif tool_name == "search_faq":
                    res = await execute_faq_search(arguments.get("topic", ""))
                elif tool_name == "search_company_knowledge":
                    res = await execute_knowledge_search(arguments.get("keyword", ""))
                elif tool_name == "lookup_support_ticket":
                    res = await execute_ticket_lookup(arguments.get("ticket_id", ""), current_user)
                elif tool_name == "create_support_ticket":
                    res = await execute_create_ticket(
                        title=arguments.get("title", ""),
                        description=arguments.get("description", ""),
                        priority=arguments.get("priority", "medium"),
                        current_user=current_user
                    )
                elif tool_name == "search_authorized_documents":
                    query = arguments.get("query", "")
                    sources = await VectorStore.search(
                        query=query,
                        user_id=user_id,
                        user_role=user_role,
                        top_k=3
                    )
                    res = {"results": [s.model_dump() for s in sources]}
                else:
                    return {"error": f"Tool execution handler not implemented for '{tool_name}'."}

                # Audit log execution without leaking raw private parameters
                await record_audit_log(
                    action=f"EXECUTE_MCP_TOOL:{tool_name}",
                    resource="mcp",
                    user_id=user_id,
                    user_email=current_user.get("email"),
                    details={"tool_name": tool_name, "success": "error" not in res}
                )

                return res

        except asyncio.TimeoutError:
            logger.error(f"Timeout executing MCP tool {tool_name}")
            return {"error": f"Tool '{tool_name}' timed out after 10 seconds."}
        except Exception as e:
            logger.error(f"Error executing MCP tool {tool_name}: {e}")
            return {"error": f"Execution error: {str(e)}"}
