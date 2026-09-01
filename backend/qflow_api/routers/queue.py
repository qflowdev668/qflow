from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from qflow_api.auth import get_current_user
from qflow_api.queue_service import join_queue, leave_queue

router = APIRouter(tags=["queue"])


class JoinBody(BaseModel):
    locationId: str = Field(min_length=1)
    priority: str = "standard"
    priorityCategory: str | None = None


class LeaveBody(BaseModel):
    entryId: str = Field(min_length=1)


@router.get("/api/queue/health")
async def queue_health() -> dict[str, Any]:
    return {"ok": True, "service": "qflow-api"}


@router.post("/api/queue/join")
@router.post("/queue/join")
async def api_queue_join(
    body: JoinBody,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    return await join_queue(
        token=user["_token"],
        user_id=user["id"],
        location_id=body.locationId.strip(),
        priority=body.priority or "standard",
        priority_category=body.priorityCategory,
    )


@router.post("/api/queue/leave")
@router.post("/queue/leave")
async def api_queue_leave(
    body: LeaveBody,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, bool]:
    return await leave_queue(
        token=user["_token"],
        user_id=user["id"],
        entry_id=body.entryId.strip(),
    )
