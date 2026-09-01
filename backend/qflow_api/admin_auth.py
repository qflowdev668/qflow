import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, HTTPException, Request

from qflow_api.auth import get_current_user
from qflow_api.supabase_admin import rest_get_one, rest_insert, rest_patch
from qflow_api.supabase_auth_admin import get_user_by_token


async def require_admin(
    request: Request,
    user: dict[str, Any] | None = None,
) -> dict[str, Any]:
    user_id: str | None = user.get("id") if user else None

    if not user_id:
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            token = auth.removeprefix("Bearer ").strip()
            if token:
                try:
                    auth_user = await get_user_by_token(token)
                    user_id = auth_user.get("id")
                except HTTPException:
                    pass

    if not user_id:
        raise HTTPException(status_code=401, detail="Not signed in.")

    profile = await rest_get_one(
        "profiles",
        {"id": f"eq.{user_id}", "select": "id,name,email,role"},
    )
    if not profile or profile.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can access this.")

    return {"id": user_id, **profile}


async def require_admin_dep(
    request: Request,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return await require_admin(request, user)


async def create_password_reset_token(email: str) -> str | None:
    token_id = str(uuid.uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=30)).isoformat()
    try:
        await rest_insert(
            "password_reset_tokens",
            {
                "id": token_id,
                "email": email.strip().lower(),
                "stage": "otp_sent",
                "expires_at": expires_at,
            },
            prefer="return=minimal",
        )
        return token_id
    except Exception:
        return None


async def get_password_reset_token(token_id: str) -> dict[str, Any] | None:
    row = await rest_get_one(
        "password_reset_tokens",
        {
            "id": f"eq.{token_id}",
            "select": "id,email,stage,expires_at,consumed_at",
        },
    )
    if not row or row.get("consumed_at"):
        return None
    expires = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
    if expires < datetime.now(timezone.utc):
        return None
    return row


async def mark_password_reset_verified(token_id: str) -> dict[str, Any] | None:
    existing = await get_password_reset_token(token_id)
    if not existing:
        return None
    if existing.get("stage") == "verified":
        return existing
    if existing.get("stage") != "otp_sent":
        return None

    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    return await rest_patch(
        "password_reset_tokens",
        {"id": f"eq.{token_id}", "consumed_at": "is.null"},
        {"stage": "verified", "expires_at": expires_at},
    )


async def consume_password_reset_token(token_id: str) -> None:
    await rest_patch(
        "password_reset_tokens",
        {"id": f"eq.{token_id}"},
        {"consumed_at": datetime.now(timezone.utc).isoformat()},
        prefer="return=minimal",
    )
