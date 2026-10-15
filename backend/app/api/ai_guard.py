from fastapi import Depends, HTTPException, status

from app.core.config import settings
from app.api.deps import get_current_user


def ai_block_reason(user) -> tuple[int, str] | None:
    """Return (status_code, message) if this user may not use AI features."""
    if not settings.ai_enabled:
        return (
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "AI features are temporarily disabled. Please try again later.",
        )
    if settings.ai_require_verified_email and not user.is_verified:
        return (
            status.HTTP_403_FORBIDDEN,
            "Please verify your email to use AI features.",
        )
    return None


def require_ai_access(current_user=Depends(get_current_user)):
    block = ai_block_reason(current_user)
    if block:
        raise HTTPException(status_code=block[0], detail=block[1])
    return current_user