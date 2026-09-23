from __future__ import annotations

import uuid
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document_version import DocumentVersion


class DocumentVersionRepository(Protocol):
    def list_for_document(self, document_id: uuid.UUID) -> list[DocumentVersion]: ...
    def get_by_id(self, version_id: uuid.UUID) -> DocumentVersion | None: ...
    def create(self, version: DocumentVersion) -> DocumentVersion: ...


class SqlAlchemyDocumentVersionRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def list_for_document(self, document_id: uuid.UUID) -> list[DocumentVersion]:
        return list(
            self._db.execute(
                select(DocumentVersion)
                .where(DocumentVersion.document_id == document_id)
                .order_by(DocumentVersion.version_number.desc())
            ).scalars().all()
        )

    def get_by_id(self, version_id: uuid.UUID) -> DocumentVersion | None:
        return self._db.get(DocumentVersion, version_id)

    def create(self, version: DocumentVersion) -> DocumentVersion:
        self._db.add(version)
        self._db.commit()
        self._db.refresh(version)
        return version


def get_document_version_repository(db: Session) -> DocumentVersionRepository:
    return SqlAlchemyDocumentVersionRepository(db)