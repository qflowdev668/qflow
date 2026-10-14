from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from qflow_api.push_service import require_push_actor, send_push_to_user

router = APIRouter(tags=["misc"])


class PushDispatchBody(BaseModel):
    userId: str = Field(min_length=1)
    title: str = "QFlow"
    body: str = Field(min_length=1)
    url: str = "/notifications"
    icon: str = "/icon-192.png?v=2"


@router.post("/api/push/dispatch")
async def push_dispatch(request: Request, body: PushDispatchBody) -> Any:
    """Send Web Push to a user's stored subscriptions (staff session or shared secret)."""
    await require_push_actor(request)
    result = await send_push_to_user(
        body.userId.strip(),
        title=(body.title or "QFlow").strip() or "QFlow",
        body=body.body.strip(),
        url=(body.url or "/notifications").strip() or "/notifications",
        icon=(body.icon or "/icon-192.png?v=2").strip() or "/icon-192.png?v=2",
    )
    status = 200 if result.get("ok", True) else 502
    if status != 200:
        return JSONResponse(status_code=status, content=result)
    return result
