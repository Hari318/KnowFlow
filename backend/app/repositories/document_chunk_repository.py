from __future__ import annotations

import uuid
from typing import Protocol

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.models.document_chunk import DocumentChunk
from sqlalchemy import select

from app.models.collection import Collection
from app.models.document import Document

import re

from sqlalchemy import column, func
from sqlalchemy.dialects.postgresql import TSVECTOR

_WORD = re.compile(r"\w+")


def _keyword_terms(text: str, max_terms: int = 12) -> list[str]:
    """Plain lowercase words only, so user text can never break the tsquery syntax."""
    terms: list[str] = []
    for word in _WORD.findall(text.lower()):
        if len(word) >= 2 and word not in terms:
            terms.append(word)
    return terms[:max_terms]

class DocumentChunkRepository(Protocol):
    def delete_for_document(self, document_id: uuid.UUID) -> None: ...
    def create_many(self, chunks: list[DocumentChunk]) -> None: ...
    def search_similar(
        self, workspace_id: uuid.UUID, query_embedding: list[float], limit: int = 5, collection_id: uuid.UUID | None = None,
            document_id: uuid.UUID | None = None,
    ) -> list[tuple[DocumentChunk, float]]: ...

class SqlAlchemyDocumentChunkRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def delete_for_document(self, document_id: uuid.UUID) -> None:
        self._db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))
        self._db.commit()

    def indexed_document_ids(self, document_ids: list[uuid.UUID]) -> set[uuid.UUID]:
        if not document_ids:
            return set()
        rows = self._db.execute(
            select(DocumentChunk.document_id)
            .where(DocumentChunk.document_id.in_(document_ids))
            .distinct()
        ).scalars().all()
        return set(rows)

    def create_many(self, chunks: list[DocumentChunk]) -> None:
        self._db.add_all(chunks)
        self._db.commit()

    def search_similar(
            self,
            workspace_id: uuid.UUID,
            query_embedding: list[float],
            limit: int = 5,
            collection_id: uuid.UUID | None = None,
            document_id: uuid.UUID | None = None,
    ) -> list[tuple[DocumentChunk, float]]:
        distance = DocumentChunk.embedding.cosine_distance(query_embedding)

        stmt = (
            select(DocumentChunk, distance.label("distance"))
            .join(Document, Document.id == DocumentChunk.document_id)
            .join(Collection, Collection.id == Document.collection_id)
            .where(Collection.workspace_id == workspace_id)  # always enforced
        )
        if collection_id is not None:
            stmt = stmt.where(Document.collection_id == collection_id)
        if document_id is not None:
            stmt = stmt.where(Document.id == document_id)

        results = self._db.execute(stmt.order_by(distance).limit(limit)).all()
        return [(row[0], row[1]) for row in results]

    def search_keyword(
            self,
            workspace_id: uuid.UUID,
            query_text: str,
            query_embedding: list[float],
            limit: int = 40,
            collection_id: uuid.UUID | None = None,
            document_id: uuid.UUID | None = None,
            match_all: bool = False,
    ) -> list[tuple[DocumentChunk, float]]:
        """Full-text matches, best keyword rank first. Returns (chunk, vector distance)
        so results have the same shape as search_similar."""
        terms = _keyword_terms(query_text)
        if not terms:
            return []

        tsv = column("content_tsv", TSVECTOR)
        joiner = " & " if match_all else " | "
        tsq = func.to_tsquery("english", joiner.join(terms))
        rank = func.ts_rank_cd(tsv, tsq)
        distance = DocumentChunk.embedding.cosine_distance(query_embedding)

        stmt = (
            select(DocumentChunk, distance.label("distance"))
            .join(Document, Document.id == DocumentChunk.document_id)
            .join(Collection, Collection.id == Document.collection_id)
            .where(Collection.workspace_id == workspace_id)  # always enforced
            .where(tsv.op("@@")(tsq))
        )
        if collection_id is not None:
            stmt = stmt.where(Document.collection_id == collection_id)
        if document_id is not None:
            stmt = stmt.where(Document.id == document_id)

        rows = self._db.execute(stmt.order_by(rank.desc()).limit(limit)).all()
        return [(row[0], row[1]) for row in rows]

def get_document_chunk_repository(db: Session) -> DocumentChunkRepository:
    return SqlAlchemyDocumentChunkRepository(db)