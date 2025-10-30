from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from schemas import ChatRequest, ChatResponse
from prompts import SYSTEM_PROMPT, CONDENSE_PROMPT
from rag.core import LLM, get_index, history_to_text, trim, unique_sources

app = FastAPI(title="Commencement RAG API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    # Reconstruct query
    history_txt = history_to_text(req.history)
    condense = LLM.generate_content(
        CONDENSE_PROMPT.format(history=history_txt, message=req.message)
    )
    standalone_q = (condense.text or req.message).strip()

    # Retrieve
    index = get_index(req.collection)
    retriever = index.as_retriever(similarity_top_k=req.top_k)
    nodes = retriever.retrieve(standalone_q)

    # Synthesize answer
    ctx = "\n\n---\n\n".join(trim(n.get_text() or "", 1200) for n in nodes)
    answer = LLM.generate_content(SYSTEM_PROMPT.format(context=ctx, question=standalone_q))
    reply_txt = (answer.text or "I am not sure.").strip()

    # Cite sources
    sources = unique_sources(nodes, max_items=3)
    return ChatResponse(reply=reply_txt, sources=sources)
