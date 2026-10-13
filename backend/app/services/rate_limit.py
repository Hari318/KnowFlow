from __future__ import annotations

import logging
import threading
import time

from fastapi import HTTPException, Request, status

from app.core.config import settings

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_redis_client = None
_redis_ready = False

# In-memory fallback: key -> (count, expires_at). Used when REDIS_URL is not
# set (local dev) or when Redis is unreachable.
_memory: dict[str, tuple[int, float]] = {}
_MEMORY_SWEEP_AT = 10_000


def _get_redis():
    global _redis_client, _redis_ready
    if _redis_ready:
        return _redis_client
    with _lock:
        if not _redis_ready:
            if settings.redis_url:
                try:
                    import redis

                    _redis_client = redis.Redis.from_url(
                        settings.redis_url,
                        socket_timeout=2,
                        socket_connect_timeout=2,
                        decode_responses=True,
                    )
                except Exception:
                    logger.exception("Could not create Redis client; using in-memory limiter")
            _redis_ready = True
    return _redis_client


def _hit_redis(client, key: str, window: int) -> int:
    pipe = client.pipeline()
    pipe.incr(key)
    pipe.expire(key, window * 2)  # key name already contains the window; this is just cleanup
    count, _ = pipe.execute()
    return int(count)


def _hit_memory(key: str, window: int, now: float) -> int:
    with _lock:
        if len(_memory) > _MEMORY_SWEEP_AT:
            for k in [k for k, (_, exp) in _memory.items() if exp <= now]:
                del _memory[k]
        count, expires = _memory.get(key, (0, 0.0))
        if expires <= now:
            count = 0
        count += 1
        _memory[key] = (count, now + window * 2)
        return count


def _human(seconds: int) -> str:
    if seconds < 90:
        return f"{seconds} seconds"
    return f"{round(seconds / 60)} minutes"


def check_rate_limit(scope: str, ident: str, limit: int, window_seconds: int) -> None:
    """Count one hit for (scope, ident); raise 429 if it exceeds `limit`
    within the current fixed window. A limit <= 0 disables the check."""
    if limit <= 0:
        return

    now = time.time()
    key = f"rl:{scope}:{ident}:{int(now // window_seconds)}"

    count: int | None = None
    client = _get_redis()
    if client is not None:
        try:
            count = _hit_redis(client, key, window_seconds)
        except Exception as e:
            logger.warning("Redis rate limit failed (%s); using in-memory counter", e)
    if count is None:
        count = _hit_memory(key, window_seconds, now)

    if count > limit:
        retry_after = max(1, int(window_seconds - (now % window_seconds)))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many requests. Please try again in {_human(retry_after)}.",
            headers={"Retry-After": str(retry_after)},
        )


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"