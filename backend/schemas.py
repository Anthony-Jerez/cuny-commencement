from typing import List, Optional, Literal
from pydantic import BaseModel, Field

class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    message: str
    history: List[ChatTurn] = Field(default_factory=list)
    top_k: int = 6
    collection: Optional[str] = None

class SourceItem(BaseModel):
    url: str
    title: Optional[str] = None
    snippet: Optional[str] = None

class ChatResponse(BaseModel):
    reply: str
    sources: List[SourceItem] = Field(default_factory=list)
