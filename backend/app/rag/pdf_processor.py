import io
import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class PDFProcessor:
    @staticmethod
    def sanitize_text(text: str) -> str:
        """Defend against prompt injections and malicious patterns inside untrusted PDF content."""
        if not text:
            return ""
        # Remove null characters and abnormal control sequences
        sanitized = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", text)
        # Normalize excessive whitespace
        sanitized = re.sub(r"[ \t]+", " ", sanitized)
        sanitized = re.sub(r"\n{3,}", "\n\n", sanitized)
        # Flag/neutralize system instruction overrides
        suspicious_patterns = [
            r"ignore all previous instructions",
            r"disregard previous commands",
            r"system prompt:",
            r"you are now in developer mode",
        ]
        for pattern in suspicious_patterns:
            sanitized = re.sub(pattern, "[FILTERED_INSTRUCTION]", sanitized, flags=re.IGNORECASE)
        return sanitized.strip()

    @classmethod
    def extract_text_from_bytes(cls, file_bytes: bytes, filename: str = "document.pdf") -> List[Dict[str, Any]]:
        """Extract pages and text from raw PDF bytes using PyMuPDF (fitz) or PyPDF."""
        pages = []
        
        # 1. Try PyMuPDF (fitz)
        try:
            import fitz
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                raw_text = page.get_text()
                clean_text = cls.sanitize_text(raw_text)
                if clean_text:
                    pages.append({
                        "page_number": page_num + 1,
                        "text": clean_text
                    })
            doc.close()
            if pages:
                return pages
        except Exception as e:
            logger.info(f"PyMuPDF parser skipped or encountered: {e}. Falling back to pypdf.")

        # 2. Fallback to PyPDF
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            for page_num, page in enumerate(reader.pages):
                raw_text = page.extract_text() or ""
                clean_text = cls.sanitize_text(raw_text)
                if clean_text:
                    pages.append({
                        "page_number": page_num + 1,
                        "text": clean_text
                    })
            if pages:
                return pages
        except Exception as e:
            logger.error(f"PyPDF parser error: {e}")

        # If both fail or text was empty (e.g. scanned image without OCR), return empty list
        return pages
