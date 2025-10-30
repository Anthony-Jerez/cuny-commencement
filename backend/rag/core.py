from __future__ import annotations
from typing import List, Optional, Dict, Any
import chromadb
import google.generativeai as genai
from llama_index.core import VectorStoreIndex, Settings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from settings import settings
from schemas import SourceItem, ChatTurn

# Init LLM + embeddings + Chroma client

if not settings.google_api_key:
    raise RuntimeError("GEMINI_API_KEY is missing. Add it to .env or environment.")

Settings.embed_model = GoogleGenAIEmbedding(
    model_name=settings.gemini_embedding_model,
    api_key=settings.google_api_key,
    embed_batch_size=settings.embed_batch_size,
)

genai.configure(api_key=settings.google_api_key)
LLM = genai.GenerativeModel(settings.gemini_chat_model)

CHROMA = chromadb.PersistentClient(path=str(settings.chroma_path))

def get_index(collection_name: Optional[str] = None) -> VectorStoreIndex:
    col = CHROMA.get_or_create_collection(name=collection_name or settings.chroma_collection)
    vstore = ChromaVectorStore(chroma_collection=col)
    return VectorStoreIndex.from_vector_store(vstore)

# Helpers 
def trim(sn: str, limit: int = 240) -> str:
    sn = (sn or "").strip()
    return sn if len(sn) <= limit else sn[:limit] + "…"

def history_to_text(turns: List[ChatTurn], max_turns: int = 8) -> str:
    recent = turns[-max_turns:]
    return "\n".join(f"{t.role}: {t.content}" for t in recent)

def unique_sources(nodes, max_items: int = 3) -> List[SourceItem]:
    out: List[SourceItem] = []
    seen = set()
    for n in nodes:
        meta: Dict[str, Any] = n.metadata or {}
        url = meta.get("url") or "N/A"
        if url in seen:
            continue
        seen.add(url)
        out.append(SourceItem(
            url=url,
            title=meta.get("section_title") or meta.get("page_title"),
            snippet=trim(n.get_text() or ""),
        ))
        if len(out) >= max_items:
            break
    return out
