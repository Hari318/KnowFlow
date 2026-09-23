from __future__ import annotations

import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document


class DocumentRepository(Protocol):
    def get_by_id(self, document_id: uuid.UUID) -> Document | None: ...
    def list_for_collection(
        self, collection_id: uuid.UUID, search: str | None = None
    ) -> list[Document]: ...
    def create(self, document: Document) -> Document: ...
    def delete(self, document: Document) -> None: ...


class SqlAlchemyDocumentRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_id(self, document_id: uuid.UUID) -> Document | None:
        return self._db.get(Document, document_id)

    def list_for_collection(
        self, collection_id: uuid.UUID, search: str | None = None
    ) -> list[Document]:
        query = select(Document).where(Document.collection_id == collection_id)

        if search:
            query = query.where(Document.name.ilike(f"%{search}%"))

        return list(self._db.execute(query).scalars().all())

    def create(self, document: Document) -> Document:
        self._db.add(document)
        self._db.commit()
        self._db.refresh(document)
        return document

    def delete(self, document: Document) -> None:
        self._db.delete(document)
        self._db.commit()


def get_document_repository(db: Session) -> DocumentRepository:
    return SqlAlchemyDocumentRepository(db)