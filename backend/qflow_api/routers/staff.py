from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from qflow_api.staff_auth import StaffContext, require_staff
from qflow_api.staff_service import add_walk_in, claim_entry, finish_entry, get_staff_queue

router = APIRouter(tags=["staff"])


class WalkInBody(BaseModel):
    name: str = Field(min_length=1)
    priority: str = "standard"
    priorityCategory: str | None = None
    notes: str | None = None


class ClaimBody(BaseModel):
    entryId: str | None = None


class FinishBody(BaseModel):
    entryId: str | None = None
    status: str = Field(pattern="^(served|no-show)$")


@router.get("/api/staff/queue")
async def staff_queue(staff: StaffContext = Depends(require_staff)) -> dict[str, Any]:
    return await get_staff_queue(staff)


@router.post("/api/staff/walk-in")
async def staff_walk_in(
    body: WalkInBody, staff: StaffContext = Depends(require_staff)
) -> dict[str, Any]:
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Customer name is required.")
    return await add_walk_in(
        staff,
        name,
        priority=body.priority or "standard",
        priority_category=(body.priorityCategory or "").strip() or None,
        notes=(body.notes or "").strip() or None,
    )


@router.post("/api/staff/queue/claim")
async def staff_claim(
    body: ClaimBody, staff: StaffContext = Depends(require_staff)
) -> dict[str, Any]:
    entry_id = (body.entryId or "").strip() or None
    result = await claim_entry(staff, entry_id)
    if result.get("_status") == 409:
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=409,
            content={
                "error": result["error"],
                "currentlyServing": result.get("currentlyServing"),
            },
        )
    return result


@router.post("/api/staff/queue/finish")
async def staff_finish(
    body: FinishBody, staff: StaffContext = Depends(require_staff)
) -> dict[str, Any]:
    entry_id = (body.entryId or "").strip() or None
    return await finish_entry(staff, body.status, entry_id)
