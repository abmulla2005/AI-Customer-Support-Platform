from typing import Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from app.langgraph.state import SupportAgentState
from app.langgraph.nodes import (
    detect_intent_node,
    rag_retrieval_node,
    tool_execution_node,
    generate_answer_node,
    validate_response_node,
    persistence_node,
)

def create_support_graph():
    """Build and compile the LangGraph workflow for AI Customer Support."""
    builder = StateGraph(SupportAgentState)

    # Register nodes
    builder.add_node("detect_intent", detect_intent_node)
    builder.add_node("rag_retrieval", rag_retrieval_node)
    builder.add_node("tool_execution", tool_execution_node)
    builder.add_node("generate_answer", generate_answer_node)
    builder.add_node("validate_response", validate_response_node)
    builder.add_node("persistence", persistence_node)

    # Define edges & routing
    builder.set_entry_point("detect_intent")

    # Routing from detect_intent
    def route_after_intent(state: SupportAgentState) -> str:
        if state.get("requires_rag"):
            return "rag_retrieval"
        elif state.get("requires_tool"):
            return "tool_execution"
        else:
            return "generate_answer"

    builder.add_conditional_edges(
        "detect_intent",
        route_after_intent,
        {
            "rag_retrieval": "rag_retrieval",
            "tool_execution": "tool_execution",
            "generate_answer": "generate_answer"
        }
    )

    # From rag_retrieval, check if tool also needed
    def route_after_rag(state: SupportAgentState) -> str:
        if state.get("requires_tool"):
            return "tool_execution"
        return "generate_answer"

    builder.add_conditional_edges(
        "rag_retrieval",
        route_after_rag,
        {
            "tool_execution": "tool_execution",
            "generate_answer": "generate_answer"
        }
    )

    # From tool_execution, always proceed to generate_answer
    builder.add_edge("tool_execution", "generate_answer")

    # Generation -> Validation -> Persistence -> End
    builder.add_edge("generate_answer", "validate_response")
    builder.add_edge("validate_response", "persistence")
    builder.add_edge("persistence", END)

    return builder.compile()

# Global compiled graph
support_workflow = create_support_graph()

async def run_support_workflow(
    thread_id: str,
    user_query: str,
    current_user: Dict[str, Any],
    history: List[Dict[str, Any]],
    language: str = "en",
    selected_document_ids: Optional[List[str]] = None
) -> SupportAgentState:
    """Execute support workflow for a user turn."""
    initial_state: SupportAgentState = {
        "thread_id": thread_id,
        "user_id": str(current_user["_id"]),
        "user_role": current_user.get("role", "customer"),
        "current_user": current_user,
        "user_query": user_query,
        "language": language,
        "selected_document_ids": selected_document_ids,
        "history": history,
        "retrieved_sources": [],
        "generated_content": "",
        "final_sources": []
    }

    result = await support_workflow.ainvoke(initial_state)
    return result
