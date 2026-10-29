import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from app.auth.dependencies import get_current_user, verify_document_access
from app.core.config import settings
from app.database.mongodb import get_database
from app.rag.pdf_processor import PDFProcessor
from app.rag.text_splitter import RecursiveTextSplitter
from app.rag.vector_store import VectorStore
from app.schemas.chat import MessageSource
from app.schemas.document import DocumentQueryRequest, DocumentQueryResponse, DocumentResponse, DocumentScope, DocumentStatus
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    file: UploadFile = File(...),
    scope: DocumentScope = Form(DocumentScope.CUSTOMER),
    current_user: dict = Depends(get_current_user)
):
    # 1. Validation
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF documents (.pdf) are permitted."
        )

    file_bytes = await file.read()
    file_size = len(file_bytes)
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    if file_size > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum upload size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # Restrict company scope uploads to employees and admins
    user_role = current_user.get("role")
    actual_scope = scope.value
    if actual_scope in ["company", "employee"] and user_role not in ["employee", "admin"]:
        actual_scope = DocumentScope.CUSTOMER.value

    user_id = str(current_user["_id"])
    doc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # 2. Extract pages and text
    pages = PDFProcessor.extract_text_from_bytes(file_bytes, filename=file.filename)
    num_pages = len(pages)

    if not pages:
        doc_record = {
            "_id": doc_id,
            "user_id": user_id,
            "scope": actual_scope,
            "filename": file.filename,
            "file_size": file_size,
            "num_pages": 0,
            "status": DocumentStatus.FAILED.value,
            "error_message": "Could not extract text. The document may be empty or contain non-OCR scanned images.",
            "created_at": now
        }
        db = get_database()
        await db.documents.insert_one(doc_record)
        return DocumentResponse(
            id=doc_id,
            user_id=user_id,
            scope=actual_scope,
            filename=file.filename,
            file_size=file_size,
            num_pages=0,
            status=DocumentStatus.FAILED,
            error_message=doc_record["error_message"],
            created_at=now
        )

    # 3. Chunk text
    splitter = RecursiveTextSplitter(chunk_size=settings.CHUNK_SIZE, chunk_overlap=settings.CHUNK_OVERLAP)
    chunks = splitter.split_pages(pages)

    # 4. Store chunks and vector embeddings
    await VectorStore.index_chunks(
        document_id=doc_id,
        filename=file.filename,
        user_id=user_id,
        scope=actual_scope,
        chunks=chunks
    )

    # 5. Persist document metadata
    db = get_database()
    doc_record = {
        "_id": doc_id,
        "user_id": user_id,
        "scope": actual_scope,
        "filename": file.filename,
        "file_size": file_size,
        "num_pages": num_pages,
        "status": DocumentStatus.INDEXED.value,
        "error_message": None,
        "created_at": now
    }
    await db.documents.insert_one(doc_record)

    await record_audit_log(
        action="UPLOAD_DOCUMENT",
        resource="documents",
        user_id=user_id,
        user_email=current_user.get("email"),
        details={"filename": file.filename, "pages": num_pages, "chunks": len(chunks)}
    )

    return DocumentResponse(
        id=doc_id,
        user_id=user_id,
        scope=actual_scope,
        filename=file.filename,
        file_size=file_size,
        num_pages=num_pages,
        status=DocumentStatus.INDEXED,
        created_at=now
    )

@router.get("", response_model=List[DocumentResponse])
async def list_documents(current_user: dict = Depends(get_current_user)):
    db = get_database()
    user_id = str(current_user["_id"])
    role = current_user.get("role")

    query = {}
    if role == "customer":
        query = {"$or": [{"user_id": user_id}, {"scope": "company"}]}
    elif role == "employee":
        query = {"$or": [{"user_id": user_id}, {"scope": {"$in": ["company", "employee"]}}]}
    # admin sees all

    cursor = db.documents.find(query).sort("created_at", -1)
    docs = await cursor.to_list(length=100)

    return [
        DocumentResponse(
            id=str(d["_id"]),
            user_id=d["user_id"],
            scope=d.get("scope", DocumentScope.CUSTOMER.value),
            filename=d["filename"],
            file_size=d.get("file_size", 0),
            num_pages=d.get("num_pages", 1),
            status=d.get("status", DocumentStatus.INDEXED.value),
            error_message=d.get("error_message"),
            created_at=d.get("created_at", datetime.now(timezone.utc))
        )
        for d in docs
    ]

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    doc = await verify_document_access(document_id, current_user)
    return DocumentResponse(
        id=str(doc["_id"]),
        user_id=doc["user_id"],
        scope=doc.get("scope", DocumentScope.CUSTOMER.value),
        filename=doc["filename"],
        file_size=doc.get("file_size", 0),
        num_pages=doc.get("num_pages", 1),
        status=doc.get("status", DocumentStatus.INDEXED.value),
        error_message=doc.get("error_message"),
        created_at=doc.get("created_at", datetime.now(timezone.utc))
    )

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    doc = await verify_document_access(document_id, current_user)
    db = get_database()
    await db.documents.delete_one({"_id": document_id})
    await db.document_chunks.delete_many({"document_id": document_id})
    
    await record_audit_log(
        action="DELETE_DOCUMENT",
        resource="documents",
        user_id=str(current_user["_id"]),
        details={"document_id": document_id, "filename": doc.get("filename")}
    )
    return {"message": "Document and extracted index chunks removed successfully"}

@router.post("/{document_id}/query", response_model=DocumentQueryResponse)
async def query_document(
    document_id: str,
    query_in: DocumentQueryRequest,
    current_user: dict = Depends(get_current_user)
):
    await verify_document_access(document_id, current_user)
    results = await VectorStore.search(
        query=query_in.query,
        user_id=str(current_user["_id"]),
        user_role=current_user.get("role", "customer"),
        document_ids=[document_id],
        top_k=query_in.top_k
    )
    return DocumentQueryResponse(query=query_in.query, results=results)
