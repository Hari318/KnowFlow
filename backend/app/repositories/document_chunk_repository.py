from __future__ import annotations

import uuid
from typing import Protocol

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.document_chunk import DocumentChunk
from sqlalchemy import select

from app.models.collection import Collection
from app.models.document import Document

class DocumentChunkRepository(Protocol):
    def delete_for_document(self, document_id: uuid.UUID) -> None: ...
    def create_many(self, chunks: list[DocumentChunk]) -> None: ...
    def search_similar(
        self, workspace_id: uuid.UUID, query_embedding: list[float], limit: int = 5
    ) -> list[tuple[DocumentChunk, float]]: ...

class SqlAlchemyDocumentChunkRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def delete_for_document(self, document_id: uuid.UUID) -> None:
        self._db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))
        self._db.commit()

    def create_many(self, chunks: list[DocumentChunk]) -> None:
        self._db.add_all(chunks)
        self._db.commit()

    def search_similar(
        self, workspace_id: uuid.UUID, query_embedding: list[float], limit: int = 5
    ) -> list[tuple[DocumentChunk, float]]:
        distance = DocumentChunk.embedding.cosine_distance(query_embedding)

        results = self._db.execute(
            select(DocumentChunk, distance.label("distance"))
            .join(Document, Document.id == DocumentChunk.document_id)
            .join(Collection, Collection.id == Document.collection_id)
            .where(Collection.workspace_id == workspace_id)
            .order_by(distance)
            .limit(limit)
        ).all()

        return [(row[0], row[1]) for row in results]

def get_document_chunk_repository(db: Session) -> DocumentChunkRepository:
    return SqlAlchemyDocumentChunkRepository(db)