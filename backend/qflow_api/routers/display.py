from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

from qflow_api.supabase_admin import rest_get, rest_get_one

router = APIRouter(tags=["display"])


def format_ticket(position: int) -> str:
    return str(position).zfill(3)


@router.get("/api/display/{location_id}")
async def display_payload(location_id: str) -> JSONResponse:
    if not location_id:
        raise HTTPException(status_code=400, detail="Location id required.")

    location = await rest_get_one("locations", {"id": f"eq.{location_id}", "select": "id,name"})
    if not location:
        raise HTTPException(status_code=404, detail="Location not found.")

    now_rows = await rest_get(
        "queue_entries",
        {
            "location_id": f"eq.{location_id}",
            "status": "in.(serving,your-turn)",
            "select": "id,position,status,serving_started_at,served_at",
            "order": "serving_started_at.desc",
            "limit": "1",
        },
    )
    now = now_rows[0] if now_rows else None

    recent_rows = await rest_get(
        "queue_entries",
        {
            "location_id": f"eq.{location_id}",
            "status": "eq.served",
            "served_at": "not.is.null",
            "select": "id,position,served_at,serving_started_at",
            "order": "served_at.desc",
            "limit": "5",
        },
    )

    recently_called = [
        {
            "ticket": format_ticket(row["position"]),
            "calledAt": row.get("served_at") or row.get("serving_started_at"),
        }
        for row in recent_rows
    ]

    return JSONResponse(
        content={
            "locationId": location["id"],
            "locationName": location["name"],
            "nowServing": (
                {
                    "ticket": format_ticket(now["position"]),
                    "startedAt": now.get("serving_started_at") or now.get("served_at"),
                }
                if now
                else None
            ),
            "recentlyCalled": recently_called,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        },
        headers={"Cache-Control": "no-store, max-age=0"},
    )
