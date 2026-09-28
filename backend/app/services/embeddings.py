from __future__ import annotations

from typing import Protocol

import voyageai

from app.core.config import settings


class EmbeddingProvider(Protocol):
    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...
    def embed_query(self, text: str) -> list[float]: ...


class VoyageEmbeddingProvider:
    def __init__(self) -> None:
        self._client = (
            voyageai.Client(api_key=settings.voyage_api_key)
            if settings.voyage_api_key
            else None
        )

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if self._client is None:
            raise RuntimeError("Embeddings are unavailable: VOYAGE_API_KEY is not configured.")
        result = self._client.embed(texts, model="voyage-4-lite", input_type="document")
        return result.embeddings

    def embed_query(self, text: str) -> list[float]:
        if self._client is None:
            raise RuntimeError("Embeddings are unavailable: VOYAGE_API_KEY is not configured.")
        result = self._client.embed([text], model="voyage-4-lite", input_type="query")
        return result.embeddings[0]


_embedding_provider: EmbeddingProvider = VoyageEmbeddingProvider()


def get_embedding_provider() -> EmbeddingProvider:
    return _embedding_provider