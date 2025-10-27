from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import os
from dotenv import load_dotenv

load_dotenv()

@dataclass
class AppSettings:
    # Chroma vector store setup
    chroma_path: Path = Path("vectorstore")
    chroma_collection: str = "qc_commencement_v1"
    # Google Gemini (embeddings & chat) setup
    google_api_key: str = os.getenv("GEMINI_API_KEY", "")
    gemini_embedding_model: str = os.getenv("GEMINI_EMBED_MODEL")
    gemini_chat_model: str = os.getenv("GEMINI_CHAT_MODEL")
    embed_batch_size: int = int(os.getenv("EMBED_BATCH_SIZE"))
    # Index
    index_state_path: Path = Path("vectorstore/state.json")
    chunk_max_chars: int = int(os.getenv("CHUNK_MAX_CHARS"))
    chunk_overlap: int = int(os.getenv("CHUNK_OVERLAP"))

settings = AppSettings()
