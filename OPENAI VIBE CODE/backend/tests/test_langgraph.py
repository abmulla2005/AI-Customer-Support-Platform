import pytest
from app.langgraph.nodes import detect_intent_node
from app.langgraph.workflow import create_support_graph

@pytest.mark.asyncio
async def test_detect_intent():
    # Calculator intent
    calc_state = {"user_query": "calculate (450 * 2) + 10", "selected_document_ids": None}
    res = await detect_intent_node(calc_state)
    assert res["requires_tool"] is True
    assert res["selected_tool"] == "calculate"

    # PDF RAG intent
    doc_state = {"user_query": "what does section 4 of the uploaded pdf say?", "selected_document_ids": None}
    res_doc = await detect_intent_node(doc_state)
    assert res_doc["requires_rag"] is True

def test_workflow_compilation():
    graph = create_support_graph()
    assert graph is not None
