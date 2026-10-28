from typing import List, Dict, Any, Optional
from typing_extensions import TypedDict
from app.schemas.chat import MessageSource

class SupportAgentState(TypedDict, total=False):
    # Core context
    thread_id: str
    user_id: str
    user_role: str
    current_user: Dict[str, Any]
    user_query: str
    language: str  # en, hi, mr
    selected_document_ids: Optional[List[str]]
    
    # History
    history: List[Dict[str, Any]]
    
    # Flow flags & decisions
    intent: str  # general, document_qa, tool_request, escalation
    requires_rag: bool
    requires_tool: bool
    
    # Retrieved & tool artifacts
    retrieved_sources: List[Dict[str, Any]]
    selected_tool: Optional[str]
    tool_arguments: Optional[Dict[str, Any]]
    tool_result: Optional[Dict[str, Any]]
    
    # Output
    generated_content: str
    final_sources: List[MessageSource]
    error: Optional[str]
