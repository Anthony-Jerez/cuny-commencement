# backend/qa_llama.py
from __future__ import annotations
import sys
from typing import List

import chromadb
import google.generativeai as genai

from llama_index.core import VectorStoreIndex, Settings
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding

from settings import settings

def build_prompt(query: str, contexts: List[str]) -> str:
    header = (
        "Answer the user's question using ONLY the provided context. "
        'If the context is insufficient, say "I am not sure," then offer a short best-effort guess. '
        "Cite specific facts from the context. Keep the answer concise and structured.\n\n"
    )
    ctx = "\n\n---\n\n".join(contexts)
    return f"{header}# Question\n{query}\n\n# Context\n{ctx}"

def run_query(prompt: str, top_k: int = 6, collection_name: str | None = None):
    if not settings.google_api_key:
        print("ERROR: GEMINI_API_KEY / GOOGLE_API_KEY is not set.")
        raise SystemExit(2)

    # Connect to existing Chroma collection (no embedding_function configured on Chroma)
    client = chromadb.PersistentClient(path=str(settings.chroma_path))
    col = client.get_or_create_collection(name=collection_name or settings.chroma_collection)

    # LlamaIndex: read from vector store and use Gemini embeddings for the query
    vector_store = ChromaVectorStore(chroma_collection=col)
    Settings.embed_model = GoogleGenAIEmbedding(
        model_name=settings.gemini_embedding_model,   # e.g. "text-embedding-004"
        api_key=settings.google_api_key,
        embed_batch_size=settings.embed_batch_size,
    )

    index = VectorStoreIndex.from_vector_store(vector_store)

    # Retrieve top_k nodes via LI retriever
    retriever = index.as_retriever(similarity_top_k=top_k)
    nodes = retriever.retrieve(prompt)

    # Build contexts for the generator
    contexts: List[str] = []
    for n in nodes:
        txt = (n.get_text() or "").strip()
        if len(txt) > 1200:
            txt = txt[:1200] + " …"
        contexts.append(txt)

    # Generate with Gemini chat (direct)
    genai.configure(api_key=settings.google_api_key)
    model = genai.GenerativeModel(settings.gemini_chat_model)
    resp = model.generate_content(build_prompt(prompt, contexts))

    print("\n=== Answer ===")
    print((getattr(resp, "text", "") or "").strip())

    print("\n=== Sources ===")
    for i, n in enumerate(nodes, 1):
        meta = n.metadata or {}
        url = meta.get("url", "N/A")
        sec = meta.get("section_title", "")
        score = getattr(n, "score", None)
        s = f"{score:.4f}" if isinstance(score, (int, float)) else "-"
        print(f"{i}. {sec} — {url}  [score={s}]")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python qa_llama.py \"your question here\" [--topk 6] [--collection NAME]")
        raise SystemExit(2)

    args = sys.argv[1:]
    topk = 6
    coll = None
    if "--topk" in args:
        i = args.index("--topk")
        try:
            topk = int(args[i + 1]); del args[i:i+2]
        except Exception:
            pass
    if "--collection" in args:
        i = args.index("--collection")
        try:
            coll = args[i + 1]; del args[i:i+2]
        except Exception:
            pass

    question = " ".join(args).strip()
    run_query(question, top_k=topk, collection_name=coll)
