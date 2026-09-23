from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DocumentOut(BaseModel):
    id: uuid.UUID
    collection_id: uuid.UUID
    uploaded_by: uuid.UUID
    name: str
    original_filename: str
    file_type: str
    mime_type: str
    file_size: int
    version_number: int
    summary: str | None
    summary_generated_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentDownloadOut(BaseModel):
    download_url: str

class DocumentVersionOut(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    version_number: int
    file_size: int
    mime_type: str
    uploaded_by: uuid.UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)