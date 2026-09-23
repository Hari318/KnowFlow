from __future__ import annotations

import io
import uuid
from datetime import timedelta
from typing import Protocol

from minio import Minio

from app.core.config import settings

ALLOWED_EXTENSIONS = {"pdf", "txt", "md", "markdown", "docx"}

class StorageBackend(Protocol):
    """Contract any storage backend (MinIO, S3, local disk, etc.) must satisfy."""

    def upload(self, key: str, data: bytes, content_type: str) -> None: ...
    def download_url(self, key: str, expires_seconds: int) -> str: ...
    def delete(self, key: str) -> None: ...


class MinioStorageBackend:
    """MinIO/S3-compatible implementation of StorageBackend."""

    def __init__(self) -> None:
        self._client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_access_key,
            secret_key=settings.minio_secret_key,
            secure=False,
        )
        self._bucket = settings.minio_bucket

    def upload(self, key: str, data: bytes, content_type: str) -> None:
        self._client.put_object(
            self._bucket,
            key,
            data=io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )

    def download_url(self, key: str, expires_seconds: int = 3600) -> str:
        return self._client.presigned_get_object(
            self._bucket,
            key,
            expires=timedelta(seconds=expires_seconds),
        )

    def delete(self, key: str) -> None:
        self._client.remove_object(self._bucket, key)


def build_storage_key(workspace_id: uuid.UUID, collection_id: uuid.UUID, filename: str) -> str:
    unique_name = f"{uuid.uuid4()}_{filename}"
    return f"{workspace_id}/{collection_id}/{unique_name}"


# Single shared instance — swap this line alone to change backend app-wide
_storage_backend: StorageBackend = MinioStorageBackend()


def get_storage_backend() -> StorageBackend:
    """FastAPI dependency — routes ask for 'a StorageBackend', not 'MinIO' specifically."""
    return _storage_backend