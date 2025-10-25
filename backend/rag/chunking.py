from __future__ import annotations
import re, datetime, hashlib as _h
from typing import Dict, Any, List, Iterable

def _sha1(s: str) -> str:
    return _h.sha1(s.encode("utf-8")).hexdigest()

def _normalize_ws(s: str) -> str:
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()

def _sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[\.\!\?])\s+", text.strip())
    out: List[str] = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if out and len(out[-1]) < 60:
            out[-1] = out[-1] + " " + p
        else:
            out.append(p)
    return out

def _char_chunk(text: str, max_chars: int = 1200, overlap: int = 150) -> List[str]:
    text = _normalize_ws(text)
    sents = _sentences(text)
    chunks: List[str] = []
    buf: List[str] = []
    size = 0
    for s in sents:
        if size + (len(s) + 1) <= max_chars:
            buf.append(s)
            size += len(s) + 1
        else:
            if buf:
                chunks.append(" ".join(buf))
            if chunks and overlap > 0:
                tail = chunks[-1][-overlap:]
                tail_words = tail.split()
                buf = [" ".join(tail_words)]
                size = len(buf[0])
            else:
                buf = []
                size = 0
            buf.append(s)
            size += len(s) + 1
    if buf:
        chunks.append(" ".join(buf))
    return [c.strip() for c in chunks if c.strip()]

def _chunk_id(url: str, section: str, idx: int, content: str) -> str:
    return _sha1(f"{url}::{section}::{idx}::{_sha1(content)}")

def chunk_records(
    pages: Iterable[Dict[str, Any]],
    max_chars: int = 1200,
    overlap: int = 150,
    pipeline_version: str = "v1"
) -> List[Dict[str, Any]]:
    all_chunks: List[Dict[str, Any]] = []
    now_iso = datetime.datetime.utcnow().isoformat()
    for page in pages:
        url = page.get("url", "")
        page_title = page.get("page_title") or url
        fetched_at = page.get("fetched_at") or now_iso
        content_sha1 = page.get("content_sha1")
        sections = page.get("sections") or []
        for sec in sections:
            title = sec.get("title") or "Untitled"
            text = _normalize_ws(sec.get("text", ""))
            if not text:
                continue
            body = (f"{title}\n\n" if title else "") + text
            sec_hash = _sha1(text)
            parts = _char_chunk(body, max_chars=max_chars, overlap=overlap)
            for i, part in enumerate(parts):
                cid = _chunk_id(url, title, i, part)
                all_chunks.append({
                    "text": part,
                    "meta": {
                        "url": url,
                        "page_title": page_title,
                        "section_title": title,
                        "fetched_at": fetched_at,
                        "chunk_index": i,
                        "chunk_id": cid,
                        "content_sha1": content_sha1,
                        "section_sha1": sec_hash,
                        "pipeline_version": pipeline_version,
                        "source_type": "web",
                    }
                })
    return all_chunks

def chunk_from_cache(cache, max_chars: int = 1200, overlap: int = 150, pipeline_version: str = "v1"):
    pages = cache.list_all()
    return chunk_records(pages, max_chars=max_chars, overlap=overlap, pipeline_version=pipeline_version)
