from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings
from app.services.storage import ALLOWED_EXTENSIONS

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/upload-limits")
def get_upload_limits():
    return {
        "max_upload_size_mb": settings.max_upload_size_mb,
        "allowed_extensions": sorted(ALLOWED_EXTENSIONS),
    }