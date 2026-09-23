from typing import Any

import httpx
from fastapi import HTTPException

from qflow_api.auth import supabase_headers
from qflow_api.config import settings
from qflow_api.supabase_admin import rest_get, rest_get_one, rest_insert, rest_patch


ACTIVE_STATUSES = "waiting,almost,your-turn,serving"
VALID_PRIORITIES = frozenset({"emergency", "fast-track", "standard"})


def estimate_wait(people_ahead: int) -> int:
    if people_ahead <= 0:
        return 0
    return max(
        round((people_ahead * settings.avg_service_minutes) / settings.active_staff),
        1,
    )


def _friendly_join_error(status: int, body: str) -> tuple[int, str]:
    lower = (body or "").lower()
    if status == 409 or "unique" in lower or "duplicate" in lower:
        return 409, "You are already in this queue."
    if status in (401, 403) or "row-level security" in lower:
        return 403, "Could not join the queue. Please sign out and sign in again."
    # Surface a short upstream hint so ops/dev are not stuck on a blank 500.
    snippet = (body or "").strip().replace("\n", " ")
    if len(snippet) > 180:
        snippet = snippet[:177] + "..."
    if snippet:
        return 500, f"Could not join the queue. ({snippet})"
    return 500, "Could not join the queue."


async def join_queue(
    token: str,
    user_id: str,
    location_id: str,
    priority: str = "standard",
    priority_category: str | None = None,
) -> dict[str, Any]:
    """Join after Bearer auth. Inserts with the service role so RLS cannot block a valid user."""
    _ = token  # auth already verified the caller; service role performs the write
    if priority not in VALID_PRIORITIES:
        priority = "standard"

    try:
        location = await rest_get_one(
            "locations",
            {
                "id": f"eq.{location_id}",
                "select": "id,name,queue_count,is_open",
            },
        )
        existing = await rest_get(
            "queue_entries",
            {
                "user_id": f"eq.{user_id}",
                "status": f"in.({ACTIVE_STATUSES})",
                "select": "id,location_id",
                "limit": "1",
            },
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail="Could not load queue data.") from exc
    except (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Could not reach the database ({type(exc).__name__}). Try again.",
        ) from exc

    if not location:
        raise HTTPException(status_code=404, detail="Location not found.")
    if not location.get("is_open"):
        raise HTTPException(status_code=409, detail="This location is closed.")

    if existing:
        if existing[0].get("location_id") == location_id:
            raise HTTPException(status_code=409, detail="You are already in this queue.")
        raise HTTPException(
            status_code=409,
            detail="You are already in another queue. Leave it first.",
        )

    try:
        entry = await rest_insert(
            "queue_entries",
            {
                "user_id": user_id,
                "location_id": location_id,
                "priority": priority,
                "priority_category": priority_category,
                "is_walk_in": False,
            },
        )
    except httpx.HTTPStatusError as exc:
        status, message = _friendly_join_error(
            exc.response.status_code if exc.response is not None else 500,
            exc.response.text if exc.response is not None else "",
        )
        raise HTTPException(status_code=status, detail=message) from exc
    except (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Could not reach the database ({type(exc).__name__}). Try again.",
        ) from exc

    position = entry.get("position") or (location.get("queue_count") or 0) + 1
    wait_minutes = estimate_wait(max(position - 1, 0))

    return {
        "ok": True,
        "entryId": entry.get("id"),
        "locationId": location_id,
        "position": position,
        "waitMinutes": wait_minutes,
        "locationName": location.get("name"),
        "status": entry.get("status") or "waiting",
        "priority": priority,
    }


async def leave_queue(token: str, user_id: str, entry_id: str) -> dict[str, bool]:
    headers = supabase_headers(token)
    headers["Prefer"] = "return=representation"

    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.patch(
            f"{settings.supabase_rest_url}/queue_entries",
            params={
                "id": f"eq.{entry_id}",
                "user_id": f"eq.{user_id}",
                "status": "in.(waiting,almost)",
            },
            headers=headers,
            json={"status": "cancelled"},
        )

        if response.status_code not in (200, 204):
            owned = await rest_get_one(
                "queue_entries",
                {
                    "id": f"eq.{entry_id}",
                    "user_id": f"eq.{user_id}",
                    "status": "in.(waiting,almost)",
                    "select": "id",
                },
            )
            if not owned:
                raise HTTPException(
                    status_code=409,
                    detail="You cannot leave the line while being served.",
                )
            try:
                await rest_patch(
                    "queue_entries",
                    {"id": f"eq.{entry_id}", "user_id": f"eq.{user_id}"},
                    {"status": "cancelled"},
                )
            except httpx.HTTPStatusError as exc:
                raise HTTPException(status_code=400, detail="Could not leave the queue.") from exc
            return {"ok": True}

        rows = response.json() if response.content else []
        if isinstance(rows, list) and len(rows) == 0:
            raise HTTPException(
                status_code=409,
                detail="You cannot leave the line while being served.",
            )

        return {"ok": True}
