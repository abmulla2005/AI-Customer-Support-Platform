import math
import hashlib
import re
from typing import List
import httpx
from app.core.config import settings

class EmbeddingService:
    @staticmethod
    def _local_embedding(text: str, dim: int = 384) -> List[float]:
        """Generate high-quality normalized deterministic vector embedding for offline use."""
        clean = text.lower()
        words = re.findall(r"\b\w+\b", clean)
        
        vec = [0.0] * dim
        if not words:
            return vec

        for word in words:
            # Hash word into bucket
            h = int(hashlib.sha256(word.encode("utf-8")).hexdigest(), 16)
            idx = h % dim
            sign = 1.0 if ((h >> 8) & 1) == 1 else -1.0
            # Weight common characters / word length
            weight = math.log1p(len(word))
            vec[idx] += sign * weight

        # L2 Normalize
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [round(x / norm, 6) for x in vec]
        return vec

    @classmethod
    async def get_embedding(cls, text: str) -> List[float]:
        """Fetch vector embedding for single text string."""
        results = await cls.get_embeddings([text])
        return results[0] if results else [0.0] * 384

    @classmethod
    async def get_embeddings(cls, texts: List[str]) -> List[List[float]]:
        """Fetch vector embeddings for batch of strings."""
        if not texts:
            return []

        # If OpenRouter or OpenAI embedding API key is present
        if settings.OPENROUTER_API_KEY and settings.EMBEDDING_PROVIDER == "openrouter":
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    resp = await client.post(
                        "https://openrouter.ai/api/v1/embeddings",
                        headers={
                            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": settings.EMBEDDING_MODEL or "text-embedding-3-small",
                            "input": texts
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        return [item["embedding"] for item in data.get("data", [])]
            except Exception as e:
                print(f"Embedding API call error: {e}. Falling back to resilient local embedding.")

        # Local deterministic fallback
        return [cls._local_embedding(t) for t in texts]

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculate cosine similarity between two unit vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    return float(dot)
