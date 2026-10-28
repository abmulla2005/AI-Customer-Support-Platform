import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sse_starlette.sse import EventSourceResponse
from app.auth.dependencies import get_current_user, verify_chat_access
from app.database.mongodb import get_database
from app.langgraph.workflow import run_support_workflow
from app.schemas.chat import (
    ChatThreadCreate,
    ChatThreadResponse,
    ChatThreadUpdate,
    MessageCreate,
    MessageFeedback,
    MessageResponse,
    MessageSource,
)

router = APIRouter(prefix="/chats", tags=["Chats"])

@router.post("", response_model=ChatThreadResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_thread(
    body: ChatThreadCreate,
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    thread_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "_id": thread_id,
        "user_id": str(current_user["_id"]),
        "title": body.title or "New Conversation",
        "created_at": now,
        "updated_at": now
    }
    await db.chat_threads.insert_one(doc)
    return ChatThreadResponse(
        id=thread_id,
        user_id=str(current_user["_id"]),
        title=doc["title"],
        created_at=now,
        updated_at=now,
        message_count=0
    )

@router.get("", response_model=List[ChatThreadResponse])
async def list_chat_threads(
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    db = get_database()
    user_id = str(current_user["_id"])
    cursor = db.chat_threads.find({"user_id": user_id}).sort("updated_at", -1).limit(limit)
    threads = await cursor.to_list(length=limit)

    results = []
    for t in threads:
        count = await db.messages.count_documents({"thread_id": t["_id"]})
        results.append(ChatThreadResponse(
            id=str(t["_id"]),
            user_id=t["user_id"],
            title=t.get("title", "Conversation"),
            created_at=t.get("created_at", datetime.now(timezone.utc)),
            updated_at=t.get("updated_at", datetime.now(timezone.utc)),
            message_count=count
        ))
    return results

@router.get("/{chat_id}")
async def get_chat_thread(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    thread = await verify_chat_access(chat_id, current_user)
    db = get_database()
    cursor = db.messages.find({"thread_id": chat_id}).sort("created_at", 1)
    msgs = await cursor.to_list(length=200)

    formatted_msgs = []
    for m in msgs:
        formatted_msgs.append({
            "id": str(m["_id"]),
            "thread_id": chat_id,
            "user_id": m.get("user_id"),
            "role": m.get("role", "user"),
            "content": m.get("content", ""),
            "sources": m.get("sources", []),
            "tool_calls": m.get("tool_calls", []),
            "feedback": m.get("feedback"),
            "created_at": m.get("created_at")
        })

    return {
        "thread": {
            "id": str(thread["_id"]),
            "user_id": thread["user_id"],
            "title": thread.get("title"),
            "created_at": thread.get("created_at"),
            "updated_at": thread.get("updated_at")
        },
        "messages": formatted_msgs
    }

@router.patch("/{chat_id}", response_model=ChatThreadResponse)
async def rename_chat_thread(
    chat_id: str,
    body: ChatThreadUpdate,
    current_user: dict = Depends(get_current_user)
):
    thread = await verify_chat_access(chat_id, current_user)
    db = get_database()
    now = datetime.now(timezone.utc)
    await db.chat_threads.update_one(
        {"_id": chat_id},
        {"$set": {"title": body.title, "updated_at": now}}
    )
    return ChatThreadResponse(
        id=chat_id,
        user_id=thread["user_id"],
        title=body.title,
        created_at=thread["created_at"],
        updated_at=now
    )

@router.delete("/{chat_id}")
async def delete_chat_thread(
    chat_id: str,
    current_user: dict = Depends(get_current_user)
):
    await verify_chat_access(chat_id, current_user)
    db = get_database()
    await db.chat_threads.delete_one({"_id": chat_id})
    await db.messages.delete_many({"thread_id": chat_id})
    return {"message": "Chat thread and associated message history deleted."}

@router.post("/{chat_id}/messages")
async def send_chat_message(
    chat_id: str,
    message_in: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    await verify_chat_access(chat_id, current_user)
    db = get_database()

    # Load history
    cursor = db.messages.find({"thread_id": chat_id}).sort("created_at", 1).limit(10)
    history_docs = await cursor.to_list(length=10)

    result_state = await run_support_workflow(
        thread_id=chat_id,
        user_query=message_in.content,
        current_user=current_user,
        history=history_docs,
        language=message_in.language or "en",
        selected_document_ids=message_in.selected_document_ids
    )

    return {
        "reply": result_state.get("generated_content", ""),
        "sources": [s.model_dump() for s in result_state.get("final_sources", [])],
        "tool_result": result_state.get("tool_result")
    }

@router.post("/{chat_id}/stream")
async def stream_chat_message(
    chat_id: str,
    message_in: MessageCreate,
    current_user: dict = Depends(get_current_user)
):
    await verify_chat_access(chat_id, current_user)
    db = get_database()

    cursor = db.messages.find({"thread_id": chat_id}).sort("created_at", 1).limit(10)
    history_docs = await cursor.to_list(length=10)

    async def event_generator():
        yield {
            "event": "message",
            "data": json.dumps({"type": "start", "message": "Processing request..."})
        }

        result_state = await run_support_workflow(
            thread_id=chat_id,
            user_query=message_in.content,
            current_user=current_user,
            history=history_docs,
            language=message_in.language or "en",
            selected_document_ids=message_in.selected_document_ids
        )

        full_content = result_state.get("generated_content", "")
        sources = [s.model_dump() for s in result_state.get("final_sources", [])]

        # Stream words/chunks to emulate ChatGPT typing
        words = full_content.split(" ")
        chunk_buf = []
        for word in words:
            chunk_buf.append(word)
            if len(chunk_buf) >= 3:
                chunk_str = " ".join(chunk_buf) + " "
                yield {
                    "event": "message",
                    "data": json.dumps({"type": "chunk", "content": chunk_str})
                }
                chunk_buf = []
                await asyncio.sleep(0.04)

        if chunk_buf:
            yield {
                "event": "message",
                "data": json.dumps({"type": "chunk", "content": " ".join(chunk_buf)})
            }

        yield {
            "event": "message",
            "data": json.dumps({
                "type": "done",
                "content": full_content,
                "sources": sources,
                "tool_result": result_state.get("tool_result")
            })
        }

    return EventSourceResponse(event_generator())

@router.post("/{chat_id}/messages/{message_id}/feedback")
async def submit_message_feedback(
    chat_id: str,
    message_id: str,
    feedback: MessageFeedback,
    current_user: dict = Depends(get_current_user)
):
    await verify_chat_access(chat_id, current_user)
    db = get_database()
    res = await db.messages.update_one(
        {"_id": message_id, "thread_id": chat_id},
        {"$set": {"feedback": feedback.feedback, "feedback_comment": feedback.comment}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Feedback recorded. Thank you!"}

@router.get("/{chat_id}/export")
async def export_chat_history(
    chat_id: str,
    format: str = Query("markdown", pattern="^(markdown|json)$"),
    current_user: dict = Depends(get_current_user)
):
    thread = await verify_chat_access(chat_id, current_user)
    db = get_database()
    cursor = db.messages.find({"thread_id": chat_id}).sort("created_at", 1)
    msgs = await cursor.to_list(length=500)

    if format == "json":
        return {"thread": thread, "messages": msgs}

    # Markdown format
    lines = [
        f"# Conversation: {thread.get('title')}",
        f"*Exported on: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}*",
        "\n---\n"
    ]
    for m in msgs:
        role_label = "**User**" if m.get("role") == "user" else "**AI Assistant**"
        lines.append(f"{role_label} ({m.get('created_at')}):")
        lines.append(m.get("content", ""))
        if m.get("sources"):
            lines.append("\n*Citations:*")
            for s in m["sources"]:
                lines.append(f"- {s.get('filename')} (Page {s.get('page_number')})")
        lines.append("\n---\n")

    md_text = "\n".join(lines)
    return Response(
        content=md_text,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename=chat_{chat_id}.md"}
    )
