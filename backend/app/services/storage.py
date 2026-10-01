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
    """MinIO/S3-compatible implementation of StorageBackend — used for local dev."""

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


class R2StorageBackend:
    """Cloudflare R2 implementation of StorageBackend — used in production.

    R2 speaks the S3 API, so we reuse the same `minio` client library,
    just pointed at R2's endpoint instead of a local MinIO server.
    """

    def __init__(self) -> None:
        endpoint = f"{settings.r2_account_id}.r2.cloudflarestorage.com"
        self._client = Minio(
            endpoint,
            access_key=settings.r2_access_key,
            secret_key=settings.r2_secret_key,
            secure=True,       # R2 requires HTTPS, unlike local MinIO
            region="auto",     # R2 doesn't use AWS-style regions; "auto" skips a lookup call that can fail against R2
        )
        self._bucket = settings.r2_bucket

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


def _build_storage_backend() -> StorageBackend:
    if settings.storage_backend == "r2":
        return R2StorageBackend()
    return MinioStorageBackend()


# Single shared instance — which backend gets built is controlled by settings.storage_backend
_storage_backend: StorageBackend = _build_storage_backend()


def get_storage_backend() -> StorageBackend:
    """FastAPI dependency — routes ask for 'a StorageBackend', not 'MinIO' or 'R2' specifically."""
    return _storage_backend