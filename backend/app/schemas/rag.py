from __future__ import annotations

import uuid

from pydantic import BaseModel, Field
from typing import Literal

class AskRequest(BaseModel):
    question: str
    collection_id: uuid.UUID | None = None
    document_id: uuid.UUID | None = None
    history: list[HistoryMessage] = Field(default_factory=list, max_length=12)

class SourceChunk(BaseModel):
    document_id: uuid.UUID
    document_name: str
    chunk_index: int
    content: str
    similarity: float
    collection_id: uuid.UUID | None = None


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]

class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str