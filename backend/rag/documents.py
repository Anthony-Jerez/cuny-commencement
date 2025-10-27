from __future__ import annotations
from typing import List, Dict, Any
import hashlib
from llama_index.core import Document

def _sha1(s: str) -> str:
    return hashlib.sha1(s.encode("utf-8")).hexdigest()

def pages_to_documents(pages: List[Dict[str, Any]]) -> List[Document]:
    """
    Turn cached page JSON (from DiskCache) into LlamaIndex Documents.
    One Document per section (title + text), with rich metadata.
    """
    out: List[Document] = []
    for p in pages:
        url = p.get("url", "")
        page_title = p.get("page_title") or url
        fetched_at = p.get("fetched_at", "")
        content_sha1 = p.get("content_sha1", "")
        sections = p.get("sections") or []

        for sec in sections:
            title = (sec.get("title") or "").strip()
            text = (sec.get("text") or "").strip()
            if not text:
                continue

            body = f"{title}\n\n{str(text)}" if title else str(text)
            sec_hash = _sha1(text)

            meta = {
                "url": url,
                "page_title": page_title,
                "section_title": title,
                "fetched_at": fetched_at,
                "content_sha1": content_sha1,
                "section_sha1": sec_hash,
                "source_type": "web",
            }

            out.append(Document(text=body, metadata=meta))
    return out
