import os
import time
from dataclasses import dataclass

from fastapi import HTTPException, Request

from qflow_api.supabase_admin import rest_insert

RATE_LIMIT_MESSAGE = "Too many attempts. Try again in 15 minutes."
IDENTITY_WINDOW_MS = 15 * 60 * 1000
IDENTITY_MAX = 8
IP_WINDOW_MS = 60 * 60 * 1000
IP_MAX = 30

_hits: dict[str, list[float]] = {}

ASSISTANT_WINDOW_MS = 60 * 60 * 1000
ASSISTANT_MAX = 20
ASSISTANT_LIMIT_MESSAGE = (
    "You've asked a lot of questions this hour. Please wait a bit and try again."
)


def reset_rate_limits() -> None:
    """Test helper — drop in-memory counters."""
    _hits.clear()


async def enforce_assistant_rate_limit(user_id: str) -> None:
    """Max 20 Ask QFlow messages per user per hour (in-memory, same style as OTP)."""
    now = time.time()
    key = f"assistant:{user_id}"
    if _would_exceed(key, ASSISTANT_WINDOW_MS, ASSISTANT_MAX, now):
        await _log_rate_limit_hit(f"/api/assistant/chat: user {user_id} (memory)")
        raise HTTPException(status_code=429, detail=ASSISTANT_LIMIT_MESSAGE)
    _record(key, ASSISTANT_WINDOW_MS, now)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    return request.headers.get("x-real-ip", "").strip() or "unknown"


def _prune(key: str, window_ms: int, now: float) -> list[float]:
    kept = [t for t in _hits.get(key, []) if now - t < window_ms / 1000]
    if kept:
        _hits[key] = kept
    elif key in _hits:
        del _hits[key]
    return kept


def _would_exceed(key: str, window_ms: int, max_hits: int, now: float) -> bool:
    return len(_prune(key, window_ms, now)) >= max_hits


def _record(key: str, window_ms: int, now: float) -> None:
    kept = _prune(key, window_ms, now)
    kept.append(now)
    _hits[key] = kept


async def _log_rate_limit_hit(detail: str) -> None:
    if not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        return
    try:
        await rest_insert(
            "audit_log",
            {
                "actor_id": None,
                "actor_name": "system",
                "action": "Rate limit hit",
                "detail": detail,
            },
            prefer="return=minimal",
        )
    except Exception:
        pass


@dataclass
class RateLimitResult:
    ok: bool


async def enforce_otp_rate_limit(
    request: Request,
    *,
    identity: str,
    identity_kind: str,
    route: str,
) -> RateLimitResult:
    now = time.time()
    ip = client_ip(request)
    identity_key = f"{identity_kind}:{identity}"
    ip_key = f"ip:{ip}"

    identity_blocked = _would_exceed(identity_key, IDENTITY_WINDOW_MS, IDENTITY_MAX, now)
    ip_blocked = _would_exceed(ip_key, IP_WINDOW_MS, IP_MAX, now)

    if identity_blocked or ip_blocked:
        reason = f"{identity_kind} {identity}" if identity_blocked else f"ip {ip}"
        await _log_rate_limit_hit(f"{route}: {reason} (memory)")
        raise HTTPException(status_code=429, detail=RATE_LIMIT_MESSAGE)

    _record(identity_key, IDENTITY_WINDOW_MS, now)
    _record(ip_key, IP_WINDOW_MS, now)
    return RateLimitResult(ok=True)
