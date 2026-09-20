from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import HTTPException

from qflow_api.staff_auth import StaffContext
from qflow_api.supabase_admin import rest_get, rest_get_one, rest_insert, rest_patch

WAITING_STATUSES = ("waiting", "almost", "your-turn")


def priority_rank(priority: str | None) -> int:
    if priority == "emergency":
        return 0
    if priority == "fast-track":
        return 1
    return 2


def minutes_since(iso: str) -> int:
    joined = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    delta = datetime.now(timezone.utc) - joined.astimezone(timezone.utc)
    return max(round(delta.total_seconds() / 60), 0)


def format_ticket(position: int) -> str:
    return f"#{str(position).zfill(3)}"


async def resolve_customer_name(entry: dict[str, Any]) -> str:
    if entry.get("is_walk_in"):
        return entry.get("walk_in_name") or "Walk-in"
    user_id = entry.get("user_id")
    if not user_id:
        return "Customer"
    profile = await rest_get_one(
        "profiles",
        {"id": f"eq.{user_id}", "select": "name"},
    )
    return (profile or {}).get("name") or "Customer"


async def load_next_waiting(location_id: str) -> dict[str, Any] | None:
    rows = await rest_get(
        "queue_entries",
        {
            "location_id": f"eq.{location_id}",
            "status": f"in.({','.join(WAITING_STATUSES)})",
            "select": "position,joined_at,priority",
            "order": "position.asc",
        },
    )
    if not rows:
        return None
    rows = sorted(
        rows,
        key=lambda row: (
            priority_rank(row.get("priority")),
            int(row.get("position") or 0),
        ),
    )
    return rows[0]


async def find_active_serving(location_id: str) -> dict[str, Any] | None:
    rows = await rest_get(
        "queue_entries",
        {
            "location_id": f"eq.{location_id}",
            "status": "eq.serving",
            "select": "*",
            "order": "serving_started_at.desc",
            "limit": "1",
        },
    )
    return rows[0] if rows else None


def build_serving_payload(
    entry: dict[str, Any],
    customer_name: str,
    nxt: dict[str, Any] | None,
) -> dict[str, Any]:
    position = entry["position"]
    return {
        "id": entry["id"],
        "position": position,
        "ticketNumber": format_ticket(position),
        "waitTime": minutes_since(entry["joined_at"]),
        "customerName": customer_name,
        "priorityType": entry.get("priority") or "standard",
        "priorityCategory": entry.get("priority_category"),
        "isWalkIn": entry.get("is_walk_in") is True,
        "userId": entry.get("user_id"),
        "locationId": entry.get("location_id"),
        "next": (
            {
                "ticketNumber": format_ticket(nxt["position"]),
                "waitTime": minutes_since(nxt["joined_at"]),
            }
            if nxt
            else None
        ),
    }


async def build_queue_entry_item(entry: dict[str, Any], profile_name: str | None) -> dict[str, Any]:
    is_walk_in = entry.get("is_walk_in") is True
    return {
        "id": entry["id"],
        "position": entry["position"],
        "name": (entry.get("walk_in_name") or "Walk-in") if is_walk_in else (profile_name or "Customer"),
        "waitDuration": minutes_since(entry["joined_at"]),
        "isWalkIn": is_walk_in,
        "priorityType": entry.get("priority") or "standard",
        "priorityCategory": entry.get("priority_category"),
        "hasSpecialNeeds": bool(entry.get("walk_in_notes")),
    }


async def get_staff_queue(staff: StaffContext) -> dict[str, Any]:
    location_id = staff.location_id
    rows = await rest_get(
        "queue_entries",
        {
            "location_id": f"eq.{location_id}",
            "status": f"in.({','.join(WAITING_STATUSES)})",
            "select": "id,position,joined_at,priority,priority_category,is_walk_in,walk_in_name,walk_in_notes,user_id",
            "order": "position.asc",
        },
    )

    # Priority first so a new emergency join is never buried under older standards.
    rows = sorted(
        rows,
        key=lambda row: (
            priority_rank(row.get("priority")),
            int(row.get("position") or 0),
        ),
    )

    entries: list[dict[str, Any]] = []
    for row in rows:
        profile_name = None
        if row.get("user_id"):
            profile = await rest_get_one(
                "profiles",
                {"id": f"eq.{row['user_id']}", "select": "name"},
            )
            profile_name = (profile or {}).get("name")
        entries.append(await build_queue_entry_item(row, profile_name))

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    served = await rest_get(
        "queue_entries",
        {
            "location_id": f"eq.{location_id}",
            "status": "eq.served",
            "served_at": f"gte.{today.isoformat()}",
            "select": "joined_at,served_at",
        },
    )
    no_shows = await rest_get(
        "queue_entries",
        {
            "location_id": f"eq.{location_id}",
            "status": "eq.no-show",
            "served_at": f"gte.{today.isoformat()}",
            "select": "id",
        },
    )
    waiting_count = await rest_get(
        "queue_entries",
        {
            "location_id": f"eq.{location_id}",
            "status": f"in.({','.join(WAITING_STATUSES)})",
            "select": "id",
        },
    )

    durations = []
    for row in served:
        if row.get("served_at"):
            j = datetime.fromisoformat(row["joined_at"].replace("Z", "+00:00"))
            s = datetime.fromisoformat(row["served_at"].replace("Z", "+00:00"))
            durations.append((s - j).total_seconds() / 60)

    serving = await find_active_serving(location_id)
    currently_serving = None
    if serving:
        name = await resolve_customer_name(serving)
        nxt = await load_next_waiting(location_id)
        currently_serving = build_serving_payload(serving, name, nxt)

    return {
        "ok": True,
        "locationId": location_id,
        "entries": entries,
        "currentlyServing": currently_serving,
        "summary": {
            "customersServed": len(served),
            "noShows": len(no_shows),
            "avgServiceTime": (
                round(sum(durations) / len(durations), 1) if durations else None
            ),
            "queueRemaining": len(waiting_count),
        },
    }


async def add_walk_in(
    staff: StaffContext,
    name: str,
    priority: str = "standard",
    priority_category: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    if priority not in ("emergency", "fast-track", "standard"):
        raise HTTPException(status_code=400, detail="Invalid priority.")

    entry = await rest_insert(
        "queue_entries",
        {
            "location_id": staff.location_id,
            "is_walk_in": True,
            "walk_in_name": name,
            "walk_in_notes": notes,
            "priority": priority,
            "priority_category": priority_category,
        },
    )
    if not entry.get("id") or entry.get("position") is None:
        raise HTTPException(status_code=502, detail="Walk-in was created but could not be read back.")

    try:
        await rest_insert(
            "audit_log",
            {
                "actor_id": staff.user_id,
                "actor_name": staff.name or staff.email or "Staff",
                "action": "Walk-in added",
                "detail": name,
            },
        )
    except httpx.HTTPStatusError:
        pass

    return {"id": entry["id"], "position": entry["position"]}


async def claim_entry(staff: StaffContext, entry_id: str | None = None) -> dict[str, Any]:
    location_id = staff.location_id
    serving = await find_active_serving(location_id)

    if entry_id and serving and serving.get("id") == entry_id:
        entry = serving
    elif serving:
        name = await resolve_customer_name(serving)
        nxt = await load_next_waiting(location_id)
        return {
            "_status": 409,
            "error": "Someone is already being served. Complete or skip them first.",
            "currentlyServing": build_serving_payload(serving, name, nxt),
        }
    else:
        if entry_id:
            entry = await rest_get_one(
                "queue_entries",
                {
                    "id": f"eq.{entry_id}",
                    "location_id": f"eq.{location_id}",
                    "status": f"in.({','.join(WAITING_STATUSES)})",
                    "select": "*",
                },
            )
            if not entry:
                raise HTTPException(
                    status_code=404,
                    detail="That queue entry is no longer waiting.",
                )
        else:
            rows = await rest_get(
                "queue_entries",
                {
                    "location_id": f"eq.{location_id}",
                    "status": f"in.({','.join(WAITING_STATUSES)})",
                    "select": "*",
                    "order": "position.asc",
                },
            )
            if not rows:
                raise HTTPException(status_code=404, detail="No one is waiting in this queue.")
            rows = sorted(
                rows,
                key=lambda row: (
                    priority_rank(row.get("priority")),
                    int(row.get("position") or 0),
                ),
            )
            entry = rows[0]

        now = datetime.now(timezone.utc).isoformat()
        claimed = await rest_patch(
            "queue_entries",
            {
                "id": f"eq.{entry['id']}",
                "location_id": f"eq.{location_id}",
                "status": f"in.({','.join(WAITING_STATUSES)})",
            },
            {
                "status": "serving",
                "serving_by": staff.user_id,
                "serving_started_at": now,
            },
        )
        if not claimed:
            raise HTTPException(status_code=409, detail="Could not claim the queue entry.")
        entry = claimed
        user_id = entry.get("user_id")
        if user_id:
            loc = await rest_get_one("locations", {"id": f"eq.{location_id}", "select": "name"})
            loc_name = (loc or {}).get("name") or "the location"
            try:
                await rest_insert(
                    "notifications",
                    {
                        "user_id": user_id,
                        "message": f"It is your turn at {loc_name}. Please head to the counter.",
                        "icon": "turn",
                    },
                    prefer="return=minimal",
                )
            except httpx.HTTPStatusError:
                pass

    name = await resolve_customer_name(entry)
    nxt = await load_next_waiting(location_id)
    return build_serving_payload(entry, name, nxt)


async def finish_entry(
    staff: StaffContext,
    status: str,
    entry_id: str | None = None,
) -> dict[str, Any]:
    if status not in ("served", "no-show"):
        raise HTTPException(status_code=400, detail="status must be served or no-show.")

    location_id = staff.location_id
    target_id = entry_id
    if not target_id:
        serving = await find_active_serving(location_id)
        target_id = serving.get("id") if serving else None

    if not target_id:
        raise HTTPException(status_code=404, detail="No active serving ticket found.")

    now = datetime.now(timezone.utc).isoformat()
    updated = await rest_patch(
        "queue_entries",
        {
            "id": f"eq.{target_id}",
            "location_id": f"eq.{location_id}",
            "status": "eq.serving",
        },
        {
            "status": status,
            "served_at": now,
            "serving_by": None,
            "serving_started_at": None,
        },
    )
    if not updated:
        raise HTTPException(
            status_code=409,
            detail="Could not finish service — this ticket may already be unlocked.",
        )
    return {"ok": True, "userId": updated.get("user_id")}
