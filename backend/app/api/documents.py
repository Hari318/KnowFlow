from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.database import get_db
from app.models.collection import Collection
from app.models.document import Document
from app.models.user import User
from app.models.workspace import Workspace
from app.repositories.document_repository import DocumentRepository, get_document_repository
from app.schemas.document import DocumentDownloadOut, DocumentOut
from app.services.storage import ALLOWED_EXTENSIONS, StorageBackend, build_storage_key, get_storage_backend
from app.models.document_version import DocumentVersion
from app.repositories.document_version_repository import (
    DocumentVersionRepository,
    get_document_version_repository,
)
from app.schemas.document import DocumentVersionOut

from datetime import datetime, timezone

from app.services.llm import LLMProvider, get_llm_provider
from app.services.text_extraction import extract_text

router = APIRouter(
    prefix="/workspaces/{workspace_id}/collections/{collection_id}/documents",
    tags=["documents"],
)


def _get_repo(db: Session = Depends(get_db)) -> DocumentRepository:
    return get_document_repository(db)

def _get_version_repo(db: Session = Depends(get_db)) -> DocumentVersionRepository:
    return get_document_version_repository(db)

def _get_owned_collection(
    workspace_id: uuid.UUID, collection_id: uuid.UUID, current_user: User, db: Session
) -> Collection:
    workspace = db.get(Workspace, workspace_id)
    if workspace is None or workspace.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    collection = db.get(Collection, collection_id)
    if collection is None or collection.workspace_id != workspace_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")

    return collection


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_backend),
    repo: DocumentRepository = Depends(_get_repo),
):
    _get_owned_collection(workspace_id, collection_id, current_user, db)

    if not file.filename or "." not in file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a valid extension",
        )

    file_extension = file.filename.rsplit(".", 1)[-1].lower()

    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '.{file_extension}' is not allowed. "
            f"Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    file_bytes = await file.read()

    from app.core.config import settings
    max_bytes = settings.max_upload_size_mb * 1024 * 1024

    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.max_upload_size_mb}MB size limit",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")

    storage_key = build_storage_key(workspace_id, collection_id, file.filename)
    storage.upload(storage_key, file_bytes, file.content_type or "application/octet-stream")

    document = Document(
        collection_id=collection_id,
        uploaded_by=current_user.id,
        name=file.filename,
        original_filename=file.filename,
        file_type=file_extension,
        mime_type=file.content_type or "application/octet-stream",
        file_size=len(file_bytes),
        storage_key=storage_key,
    )

    return repo.create(document)


@router.get("", response_model=list[DocumentOut])
def list_documents(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    search: str | None = Query(default=None, min_length=1, max_length=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: DocumentRepository = Depends(_get_repo),
):
    _get_owned_collection(workspace_id, collection_id, current_user, db)
    return repo.list_for_collection(collection_id, search=search)


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: DocumentRepository = Depends(_get_repo),
):
    _get_owned_collection(workspace_id, collection_id, current_user, db)
    document = repo.get_by_id(document_id)
    if document is None or document.collection_id != collection_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.get("/{document_id}/download", response_model=DocumentDownloadOut)
def download_document(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_backend),
    repo: DocumentRepository = Depends(_get_repo),
):
    _get_owned_collection(workspace_id, collection_id, current_user, db)
    document = repo.get_by_id(document_id)
    if document is None or document.collection_id != collection_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    url = storage.download_url(document.storage_key)
    return DocumentDownloadOut(download_url=url)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_backend),
    repo: DocumentRepository = Depends(_get_repo),
):
    _get_owned_collection(workspace_id, collection_id, current_user, db)
    document = repo.get_by_id(document_id)
    if document is None or document.collection_id != collection_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    storage.delete(document.storage_key)
    repo.delete(document)

@router.put("/{document_id}", response_model=DocumentOut)
async def replace_document(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    document_id: uuid.UUID,
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_backend),
    repo: DocumentRepository = Depends(_get_repo),
    version_repo: DocumentVersionRepository = Depends(_get_version_repo),
):
    _get_owned_collection(workspace_id, collection_id, current_user, db)

    document = repo.get_by_id(document_id)
    if document is None or document.collection_id != collection_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if not file.filename or "." not in file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must have a valid extension")

    file_extension = file.filename.rsplit(".", 1)[-1].lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '.{file_extension}' is not allowed.",
        )

    file_bytes = await file.read()

    from app.core.config import settings
    max_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(file_bytes) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.max_upload_size_mb}MB size limit",
        )
    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")

    # Archive the current file as a version before overwriting it
    old_version = DocumentVersion(
        document_id=document.id,
        version_number=document.version_number,
        storage_key=document.storage_key,
        file_size=document.file_size,
        mime_type=document.mime_type,
        uploaded_by=document.uploaded_by,
    )
    version_repo.create(old_version)

    # Upload the new file under a fresh storage key (old one stays intact in the version record)
    new_storage_key = build_storage_key(workspace_id, collection_id, file.filename)
    storage.upload(new_storage_key, file_bytes, file.content_type or "application/octet-stream")

    document.name = file.filename
    document.original_filename = file.filename
    document.file_type = file_extension
    document.mime_type = file.content_type or "application/octet-stream"
    document.file_size = len(file_bytes)
    document.storage_key = new_storage_key
    document.version_number += 1
    document.uploaded_by = current_user.id
    document.summary = None
    document.summary_generated_at = None

    db.commit()
    db.refresh(document)
    return document


@router.get("/{document_id}/versions", response_model=list[DocumentVersionOut])
def list_document_versions(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    repo: DocumentRepository = Depends(_get_repo),
    version_repo: DocumentVersionRepository = Depends(_get_version_repo),
):
    _get_owned_collection(workspace_id, collection_id, current_user, db)
    document = repo.get_by_id(document_id)
    if document is None or document.collection_id != collection_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    return version_repo.list_for_document(document_id)


@router.get("/{document_id}/versions/{version_id}/download", response_model=DocumentDownloadOut)
def download_document_version(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    document_id: uuid.UUID,
    version_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_backend),
    repo: DocumentRepository = Depends(_get_repo),
    version_repo: DocumentVersionRepository = Depends(_get_version_repo),
):
    _get_owned_collection(workspace_id, collection_id, current_user, db)
    document = repo.get_by_id(document_id)
    if document is None or document.collection_id != collection_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    version = version_repo.get_by_id(version_id)
    if version is None or version.document_id != document_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")

    url = storage.download_url(version.storage_key)
    return DocumentDownloadOut(download_url=url)

@router.post("/{document_id}/summarize", response_model=DocumentOut)
def summarize_document(
    workspace_id: uuid.UUID,
    collection_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    storage: StorageBackend = Depends(get_storage_backend),
    repo: DocumentRepository = Depends(_get_repo),
    llm: LLMProvider = Depends(get_llm_provider),
):
    _get_owned_collection(workspace_id, collection_id, current_user, db)

    document = repo.get_by_id(document_id)
    if document is None or document.collection_id != collection_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    download_url = storage.download_url(document.storage_key)

    import httpx
    response = httpx.get(download_url)
    response.raise_for_status()
    file_bytes = response.content

    try:
        text = extract_text(file_bytes, document.file_type)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No extractable text found in this document",
        )

    try:
        summary = llm.summarize(text)
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))

    document.summary = summary
    document.summary_generated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(document)

    return document