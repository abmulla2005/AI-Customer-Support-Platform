from typing import List, Dict, Any

class RecursiveTextSplitter:
    def __init__(self, chunk_size: int = 600, chunk_overlap: int = 80):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_page(self, page_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        text = page_data.get("text", "")
        page_num = page_data.get("page_number", 1)
        if not text:
            return []

        chunks = []
        start = 0
        text_length = len(text)
        chunk_idx = 0

        while start < text_length:
            end = min(start + self.chunk_size, text_length)
            
            # If not at the end of text, try to find a natural break (newline or period)
            if end < text_length:
                break_point = -1
                for sep in ["\n\n", "\n", ". ", " "]:
                    idx = text.rfind(sep, start + self.chunk_size // 2, end)
                    if idx != -1:
                        break_point = idx + len(sep)
                        break
                if break_point != -1:
                    end = break_point

            chunk_text = text[start:end].strip()
            if chunk_text:
                chunks.append({
                    "chunk_index": chunk_idx,
                    "page_number": page_num,
                    "text": chunk_text
                })
                chunk_idx += 1

            if end >= text_length:
                break

            start = max(start + 1, end - self.chunk_overlap)

        return chunks

    def split_pages(self, pages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        all_chunks = []
        for p in pages:
            chunks = self.split_page(p)
            all_chunks.extend(chunks)
        return all_chunks
