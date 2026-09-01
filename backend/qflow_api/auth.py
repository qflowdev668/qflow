import base64
import json
import time
from typing import Any

import httpx
from fastapi import Header, HTTPException

from qflow_api.config import settings

SESSION_EXPIRED_CODE = "session_expired"
SESSION_EXPIRED_MESSAGE = "Your session has expired. Please sign in again."


def session_expired_detail(message: str | None = None) -> dict[str, str]:
    return {
        "error": message or SESSION_EXPIRED_MESSAGE,
        "code": SESSION_EXPIRED_CODE,
    }


def raise_session_expired(message: str | None = None) -> None:
    raise HTTPException(status_code=401, detail=session_expired_detail(message))


def jwt_exp_unverified(token: str) -> int | None:
    """Read ``exp`` from a JWT payload without verifying the signature.

    Signature / issuer checks still go through Supabase Auth. This early
    expiry gate lets us return a stable ``session_expired`` code before the
    network round-trip when the access token is clearly past its lifetime.
    """
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        payload_b64 = parts[1]
        padding = "=" * (-len(payload_b64) % 4)
        raw = base64.urlsafe_b64decode(payload_b64 + padding)
        payload = json.loads(raw)
        exp = payload.get("exp")
        return int(exp) if exp is not None else None
    except Exception:
        return None


async def verify_supabase_token(token: str) -> dict[str, Any]:
    exp = jwt_exp_unverified(token)
    if exp is not None and exp <= int(time.time()):
        raise_session_expired()

    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=503, detail="Supabase is not configured.")

    last_network_error: Exception | None = None
    response: httpx.Response | None = None
    # One retry — transient DNS / connect blips are common on Windows + Cloudflare.
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(
                    f"{settings.supabase_auth_url}/user",
                    headers={
                        "apikey": settings.supabase_anon_key,
                        "Authorization": f"Bearer {token}",
                    },
                )
            break
        except (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError) as exc:
            last_network_error = exc
            if attempt == 0:
                continue
            raise HTTPException(
                status_code=503,
                detail=(
                    "Could not reach Supabase Auth to verify your session "
                    f"({type(exc).__name__}). Check network / DNS, then try again."
                ),
            ) from exc

    if response is None:
        raise HTTPException(
            status_code=503,
            detail=f"Could not reach Supabase Auth ({type(last_network_error).__name__}).",
        )

    if response.status_code != 200:
        raise_session_expired()

    payload = response.json()
    user_id = payload.get("id")
    if not user_id:
        raise_session_expired()
    return payload


async def get_current_user(
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    """FastAPI dependency: require a valid (non-expired) Supabase access token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Sign in required.")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Sign in required.")
    user = await verify_supabase_token(token)
    user["_token"] = token
    return user


def supabase_headers(token: str) -> dict[str, str]:
    return {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
