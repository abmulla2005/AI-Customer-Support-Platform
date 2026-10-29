from typing import List, Optional, Dict, Any
from app.database.mongodb import get_database
from app.rag.embedding_service import EmbeddingService, cosine_similarity
from app.schemas.chat import MessageSource

class VectorStore:
    @staticmethod
    async def index_chunks(
        document_id: str,
        filename: str,
        user_id: str,
        scope: str,
        chunks: List[Dict[str, Any]]
    ):
        """Generate embeddings and persist document chunks to MongoDB."""
        if not chunks:
            return

        texts = [c["text"] for c in chunks]
        embeddings = await EmbeddingService.get_embeddings(texts)

        import uuid
        db = get_database()
        chunk_docs = []
        for i, chunk in enumerate(chunks):
            doc = {
                "_id": str(uuid.uuid4()),
                "document_id": document_id,
                "filename": filename,
                "user_id": user_id,
                "scope": scope,
                "page_number": chunk.get("page_number", 1),
                "chunk_index": chunk.get("chunk_index", i),
                "text": chunk["text"],
                "embedding": embeddings[i] if i < len(embeddings) else [0.0] * 384,
            }
            chunk_docs.append(doc)

        await db.document_chunks.insert_many(chunk_docs)

    @classmethod
    async def search(
        cls,
        query: str,
        user_id: str,
        user_role: str,
        document_ids: Optional[List[str]] = None,
        top_k: int = 4,
        score_threshold: float = 0.15
    ) -> List[MessageSource]:
        """Search authorized chunks strictly scoped to user or company permissions."""
        db = get_database()
        query_embedding = await EmbeddingService.get_embedding(query)

        # Build authorized query filter
        # Customers can only access their own documents or general company documents
        scope_filter: Dict[str, Any] = {}
        if user_role == "customer":
            scope_filter = {
                "$or": [
                    {"user_id": user_id},
                    {"scope": "company"}
                ]
            }
        elif user_role == "employee":
            # Employees can search employee knowledge and company knowledge
            scope_filter = {
                "$or": [
                    {"user_id": user_id},
                    {"scope": {"$in": ["company", "employee"]}}
                ]
            }
        else:
            # Admin can search all scopes or specific requested docs
            scope_filter = {}

        if document_ids:
            scope_filter["document_id"] = {"$in": document_ids}

        # Try MongoDB Atlas Vector Search pipeline if live index exists
        # In Atlas: collection.aggregate([{"$vectorSearch": {...}}])
        try:
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "vector_index",
                        "path": "embedding",
                        "queryVector": query_embedding,
                        "numCandidates": top_k * 10,
                        "limit": top_k,
                        "filter": scope_filter
                    }
                },
                {
                    "$project": {
                        "document_id": 1,
                        "filename": 1,
                        "page_number": 1,
                        "text": 1,
                        "score": {"$meta": "vectorSearchScore"}
                    }
                }
            ]
            cursor = db.document_chunks.aggregate(pipeline)
            results = await cursor.to_list(length=top_k)
            if results:
                return [
                    MessageSource(
                        document_id=r.get("document_id", ""),
                        filename=r.get("filename", "Unknown Document"),
                        page_number=r.get("page_number", 1),
                        snippet=r.get("text", "")[:400],
                        relevance_score=round(r.get("score", 1.0), 3)
                    )
                    for r in results
                ]
        except Exception:
            pass  # Fallback to in-database cosine similarity

        # Resilient similarity search
        cursor = db.document_chunks.find(scope_filter)
        candidates = await cursor.to_list(length=200)

        scored = []
        for doc in candidates:
            doc_vec = doc.get("embedding", [])
            sim = cosine_similarity(query_embedding, doc_vec)
            if sim >= score_threshold:
                scored.append((sim, doc))

        # Sort descending by similarity score
        scored.sort(key=lambda x: x[0], reverse=True)
        top_candidates = scored[:top_k]

        return [
            MessageSource(
                document_id=doc.get("document_id", ""),
                filename=doc.get("filename", "document.pdf"),
                page_number=doc.get("page_number", 1),
                snippet=doc.get("text", "")[:400],
                relevance_score=round(score, 3)
            )
            for score, doc in top_candidates
        ]
