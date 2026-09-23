"""Web Push delivery for queue lifecycle alerts."""

from __future__ import annotations

import json
import os
from typing import Any

import httpx
from fastapi import HTTPException, Request
from pywebpush import WebPushException, webpush

from qflow_api.config import settings
from qflow_api.supabase_admin import rest_get, service_headers


def vapid_configured() -> bool:
    public_key = os.environ.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "").strip()
    private_key = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
    return bool(public_key and private_key)


def push_dispatch_ready() -> bool:
    """True when the server can actually send pushes (keys + secret for webhooks)."""
    return vapid_configured() and bool(os.environ.get("PUSH_DISPATCH_SECRET", "").strip())


def is_push_dispatch_authorized(request: Request, *, user: dict[str, Any] | None = None) -> bool:
    """Allow PUSH_DISPATCH_SECRET (DB/Edge) or a signed-in staff/admin JWT (app)."""
    secret = os.environ.get("PUSH_DISPATCH_SECRET", "").strip()
    header = (request.headers.get("authorization") or "").strip()
    if secret and header == f"Bearer {secret}":
        return True
    if user and user.get("id"):
        return True
    return False


async def send_push_to_user(
    user_id: str,
    *,
    title: str,
    body: str,
    url: str = "/notifications",
    icon: str = "/icon-192x192.png",
) -> dict[str, Any]:
    if not vapid_configured():
        return {"ok": True, "sent": 0, "error": "VAPID keys are not configured."}

    public_key = os.environ["NEXT_PUBLIC_VAPID_PUBLIC_KEY"].strip()
    private_key = os.environ["VAPID_PRIVATE_KEY"].strip()
    subject = os.environ.get("VAPID_SUBJECT", "mailto:qflow@localhost").strip() or "mailto:qflow@localhost"

    try:
        rows = await rest_get(
            "push_subscriptions",
            {"user_id": f"eq.{user_id}", "select": "id,endpoint,p256dh,auth"},
        )
    except httpx.HTTPStatusError as exc:
        return {"ok": False, "sent": 0, "error": str(exc)}

    if not rows:
        return {"ok": True, "sent": 0}

    payload = json.dumps(
        {
            "title": title or "QFlow",
            "body": body,
            "url": url or "/notifications",
            "icon": icon or "/icon-192x192.png",
        }
    )

    sent = 0
    stale_ids: list[str] = []

    for row in rows:
        try:
            webpush(
                subscription_info={
                    "endpoint": row["endpoint"],
                    "keys": {"p256dh": row["p256dh"], "auth": row["auth"]},
                },
                data=payload,
                vapid_private_key=private_key,
                vapid_claims={"sub": subject},
                vapid_public_key=public_key,
            )
            sent += 1
        except WebPushException as exc:
            status = getattr(exc, "response", None)
            code = getattr(status, "status_code", None) if status is not None else None
            if code in (404, 410):
                stale_ids.append(str(row["id"]))
        except Exception:
            continue

    if stale_ids:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.delete(
                    f"{settings.supabase_rest_url}/push_subscriptions",
                    params={"id": f"in.({','.join(stale_ids)})"},
                    headers=service_headers(),
                )
        except Exception:
            pass

    return {"ok": True, "sent": sent}


async def require_push_actor(request: Request) -> dict[str, Any] | None:
    """
    Return auth user dict when Authorization is a user JWT; None when using
    the shared PUSH_DISPATCH_SECRET. Raises 401/403 when neither is valid.
    """
    from qflow_api.auth import verify_supabase_token

    secret = os.environ.get("PUSH_DISPATCH_SECRET", "").strip()
    header = (request.headers.get("authorization") or "").strip()
    if secret and header == f"Bearer {secret}":
        return None

    if not header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Push dispatch authorization required.")

    token = header.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Push dispatch authorization required.")

    try:
        user = await verify_supabase_token(token)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid push dispatch credentials.") from None

    profile = None
    try:
        from qflow_api.supabase_admin import rest_get_one

        profile = await rest_get_one(
            "profiles",
            {"id": f"eq.{user['id']}", "select": "role"},
        )
    except Exception:
        profile = None

    role = (profile or {}).get("role")
    if role not in ("staff", "admin"):
        raise HTTPException(status_code=403, detail="Only staff or admin can dispatch push.")

    user["_token"] = token
    return user
