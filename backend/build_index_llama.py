# backend/build_index_llama.py
from __future__ import annotations
import sys, json
from pathlib import Path
from typing import Dict, Any, Iterable, List

import chromadb

from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding

from settings import settings
from rag.cache import DiskCache
from rag.documents import pages_to_documents

# -------------------- small helpers --------------------

def load_index_state(path: Path) -> Dict[str, str]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}

def save_index_state(path: Path, state: Dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")

def pages_needing_index(cache: DiskCache, state: Dict[str, str]) -> Iterable[Dict[str, Any]]:
    for page in cache.list_all():
        url = page.get("url")
        sha = page.get("content_sha1")
        if not url or not sha:
            continue
        if state.get(url) == sha:
            continue
        yield page

# -------------------- main --------------------

def main(reindex_all: bool = False, collection_name: str | None = None) -> int:
    if not settings.google_api_key:
        print("ERROR: GEMINI_API_KEY / GOOGLE_API_KEY is not set in your environment.")
        return 2

    cache = DiskCache(Path("cache"))
    state_path = settings.index_state_path
    state = {} if reindex_all else load_index_state(state_path)

    pages = list(cache.list_all() if reindex_all else pages_needing_index(cache, state))
    if not pages:
        print("Nothing to index (all up to date).")
        return 0

    print(f"Pages to index: {len(pages)}")

    # Convert cached pages -> LlamaIndex Documents (one per section)
    documents = pages_to_documents(pages)
    print(f"Prepared {len(documents)} documents (one per section).")

    # LlamaIndex chunking (character-ish splitting)
    splitter = SentenceSplitter(
        separator=" ",
        chunk_size=settings.chunk_max_chars,
        chunk_overlap=settings.chunk_overlap,
    )
    pipeline = IngestionPipeline(transformations=[splitter])

    nodes = pipeline.run(
        documents=documents,
        in_place=False,
        show_progress=True,
    )
    print(f"Produced {len(nodes)} nodes (chunks).")

    # Chroma client — IMPORTANT: do NOT pass an embedding_function (Approach B).
    client = chromadb.PersistentClient(path=str(settings.chroma_path))

    colname = collection_name or settings.chroma_collection
    chroma_col = client.get_or_create_collection(name=colname)

    # Wire Chroma into LlamaIndex
    vector_store = ChromaVectorStore(chroma_collection=chroma_col)
    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    # Use the official LlamaIndex Google GenAI embedding wrapper
    embed_model = GoogleGenAIEmbedding(
        model_name=settings.gemini_embedding_model,   # e.g., "text-embedding-004"
        api_key=settings.google_api_key,              # or set GOOGLE_API_KEY in env
        embed_batch_size=settings.embed_batch_size,   # from your .env
    )

    # Build index: LlamaIndex computes embeddings & upserts to Chroma
    _ = VectorStoreIndex(
        nodes=nodes,
        storage_context=storage_context,
        embed_model=embed_model,
        show_progress=True,
    )
    print(f"Upserted {len(nodes)} vectors into Chroma collection '{colname}' at '{settings.chroma_path}'.")

    # Update state.json to mark these pages as indexed
    for p in pages:
        state[p["url"]] = p["content_sha1"]
    save_index_state(state_path, state)
    print(f"Updated index state → {state_path}")
    return 0

if __name__ == "__main__":
    reindex = "--reindex-all" in sys.argv
    # Optional: allow --collection NEW_NAME to avoid mixing with your old collection
    try:
        col_flag = "--collection"
        coll = None
        if col_flag in sys.argv:
            idx = sys.argv.index(col_flag)
            coll = sys.argv[idx + 1]
    except Exception:
        coll = None
    raise SystemExit(main(reindex_all=reindex, collection_name=coll))
