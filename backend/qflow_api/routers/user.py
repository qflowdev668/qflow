from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile
from pydantic import BaseModel, Field

from qflow_api.auth import get_current_user
from qflow_api.storage_admin import public_object_url, storage_remove, storage_upload_bytes
from qflow_api.supabase_admin import rest_get, rest_get_one, rest_insert, rest_patch
from qflow_api.user_cleanup import purge_user_account

router = APIRouter(tags=["user"])

VISIT_RATING_WINDOW_SECONDS = 2 * 60 * 60
AVATAR_BUCKET = "avatars"
AVATAR_MAX_BYTES = 5 * 1024 * 1024
ALLOWED_AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp", "image/jpg"}


def _assert_within_rating_window(served_at: str | None) -> None:
    """Reject ratings outside the 2-hour post-served window (API-level guard)."""
    if not served_at:
        raise HTTPException(status_code=403, detail="This visit cannot be rated.")
    try:
        served = datetime.fromisoformat(served_at.replace("Z", "+00:00"))
    except ValueError as exc:
        raise HTTPException(status_code=403, detail="This visit cannot be rated.") from exc
    if served.tzinfo is None:
        served = served.replace(tzinfo=timezone.utc)
    age = (datetime.now(timezone.utc) - served).total_seconds()
    if age > VISIT_RATING_WINDOW_SECONDS or age < 0:
        raise HTTPException(
            status_code=403,
            detail="Rating window has closed. You can only rate within 2 hours of being served.",
        )


class DeleteAccountBody(BaseModel):
    confirm: str = ""


class PushSubscribeBody(BaseModel):
    endpoint: str = ""
    keys: dict[str, str] | None = None
    expirationTime: int | None = None


class PushUnsubscribeBody(BaseModel):
    endpoint: str = ""


class RateBody(BaseModel):
    rating: int = 0
    comment: str = ""
    queueEntryId: str | None = None


class ErrorBody(BaseModel):
    message: str = ""
    name: str | None = None
    stack: str | None = None
    component_stack: str | None = None
    path: str | None = None
    user_agent: str | None = None


@router.delete("/api/user/delete-account")
async def delete_account(
    body: DeleteAccountBody, user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, bool]:
    if body.confirm != "DELETE":
        raise HTTPException(status_code=400, detail='Confirmation required. Send { "confirm": "DELETE" }.')

    user_id = user["id"]
    email = user.get("email")

    await purge_user_account(user_id, email=email, anonymize_queue=True)
    return {"ok": True}


@router.get("/api/user/export-data")
async def export_data(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    user_id = user["id"]
    profile = await rest_get_one("profiles", {"id": f"eq.{user_id}", "select": "*"})
    history = await rest_get("queue_history", {"user_id": f"eq.{user_id}", "select": "*"})
    ratings = await rest_get("visit_ratings", {"user_id": f"eq.{user_id}", "select": "*"})
    notifications = await rest_get("notifications", {"user_id": f"eq.{user_id}", "select": "*"})
    push = await rest_get("push_subscriptions", {"user_id": f"eq.{user_id}", "select": "id"})
    assistant_messages = await rest_get(
        "assistant_messages",
        {"user_id": f"eq.{user_id}", "select": "id,message,reply,created_at", "order": "created_at.asc"},
    )
    queue = await rest_get(
        "queue_entries",
        {
            "user_id": f"eq.{user_id}",
            "select": "id,location_id,position,status,priority,priority_category,joined_at,served_at,serving_started_at",
        },
    )

    return {
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "user": {"id": user_id, "email": user.get("email")},
        "profile": profile,
        "queueHistory": history,
        "visitRatings": ratings,
        "notifications": notifications,
        "pushSubscriptionCount": len(push),
        "queueEntries": queue,
        "assistantMessages": assistant_messages,
    }


@router.post("/api/user/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Upload profile photo via service role (works before Storage RLS is applied)."""
    user_id = user["id"]
    content_type = (file.content_type or "").split(";")[0].strip().lower()
    if content_type == "image/jpg":
        content_type = "image/jpeg"
    if content_type not in ALLOWED_AVATAR_TYPES:
        raise HTTPException(status_code=400, detail="Please choose a JPEG, PNG, or WebP image.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > AVATAR_MAX_BYTES:
        raise HTTPException(status_code=400, detail="Photo must be under 5 MB.")

    object_path = f"{user_id}.jpg"
    await storage_upload_bytes(
        bucket=AVATAR_BUCKET,
        path=object_path,
        data=data,
        content_type=content_type if content_type != "image/jpg" else "image/jpeg",
        upsert=True,
    )

    public_url = (
        f"{public_object_url(AVATAR_BUCKET, object_path)}"
        f"?t={int(datetime.now(timezone.utc).timestamp())}"
    )
    await rest_patch("profiles", {"id": f"eq.{user_id}"}, {"avatar_url": public_url})
    return {"ok": True, "avatarUrl": public_url}


@router.delete("/api/user/avatar")
async def delete_avatar(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    user_id = user["id"]
    object_path = f"{user_id}.jpg"
    try:
        await storage_remove(AVATAR_BUCKET, [object_path])
    except HTTPException:
        pass
    await rest_patch("profiles", {"id": f"eq.{user_id}"}, {"avatar_url": None})
    return {"ok": True, "avatarUrl": None}


@router.post("/api/push/subscribe")
async def push_subscribe(
    request: Request,
    body: PushSubscribeBody,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, bool]:
    endpoint = body.endpoint.strip()
    p256dh = (body.keys or {}).get("p256dh", "").strip()
    auth = (body.keys or {}).get("auth", "").strip()
    if not endpoint or not p256dh or not auth:
        raise HTTPException(status_code=400, detail="Incomplete push subscription.")

    user_agent = (request.headers.get("user-agent") or "")[:300] or None
    await rest_insert(
        "push_subscriptions",
        {
            "user_id": user["id"],
            "endpoint": endpoint,
            "p256dh": p256dh,
            "auth": auth,
            "user_agent": user_agent,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        },
        prefer="resolution=merge-duplicates,return=minimal",
    )
    return {"ok": True}


@router.delete("/api/push/subscribe")
async def push_unsubscribe(
    body: PushUnsubscribeBody, user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, bool]:
    endpoint = body.endpoint.strip()
    if not endpoint:
        raise HTTPException(status_code=400, detail="endpoint is required.")

    async with __import__("httpx").AsyncClient(timeout=15.0) as client:
        from qflow_api.config import settings
        from qflow_api.supabase_admin import service_headers

        await client.delete(
            f"{settings.supabase_rest_url}/push_subscriptions",
            params={"user_id": f"eq.{user['id']}", "endpoint": f"eq.{endpoint}"},
            headers=service_headers(),
        )
    return {"ok": True}


@router.post("/api/rate")
async def submit_rating(
    body: RateBody, user: dict[str, Any] = Depends(get_current_user)
) -> dict[str, bool]:
    rating = body.rating
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5.")

    user_id = user["id"]
    entry_id = (body.queueEntryId or "").strip()

    if entry_id:
        entry = await rest_get_one(
            "queue_entries",
            {"id": f"eq.{entry_id}", "user_id": f"eq.{user_id}", "select": "id,location_id,status,served_at"},
        )
        if not entry or entry.get("status") != "served":
            raise HTTPException(status_code=403, detail="This visit cannot be rated.")
        _assert_within_rating_window(entry.get("served_at"))
        location_id = entry["location_id"]
        queue_entry_id = entry_id
    else:
        rows = await rest_get(
            "queue_entries",
            {
                "user_id": f"eq.{user_id}",
                "status": "eq.served",
                "select": "id,location_id,served_at",
                "order": "served_at.desc",
                "limit": "1",
            },
        )
        if not rows:
            raise HTTPException(status_code=403, detail="No recent visit to rate.")
        entry = rows[0]
        _assert_within_rating_window(entry.get("served_at"))
        location_id = entry["location_id"]
        queue_entry_id = entry["id"]

    comment = body.comment.strip() if body.comment else ""
    try:
        await rest_insert(
            "visit_ratings",
            {
                "user_id": user_id,
                "location_id": location_id,
                "queue_entry_id": queue_entry_id,
                "rating": rating,
                "comment": comment or None,
            },
        )
    except Exception as err:
        if "23505" in str(err) or "duplicate" in str(err).lower():
            raise HTTPException(status_code=409, detail="You have already rated this visit.")
        raise HTTPException(status_code=500, detail=str(err))

    return {"ok": True}


@router.post("/api/errors")
async def log_client_error(body: ErrorBody) -> Response:
    message = body.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required.")

    try:
        await rest_insert(
            "client_errors",
            {
                "message": message[:2000],
                "name": (body.name or "")[:200] or None,
                "stack": (body.stack or "")[:8000] or None,
                "component_stack": (body.component_stack or "")[:8000] or None,
                "path": (body.path or "")[:500] or None,
                "user_agent": (body.user_agent or "")[:500] or None,
            },
            prefer="return=minimal",
        )
    except Exception:
        return Response(status_code=204)

    return Response(status_code=204)
