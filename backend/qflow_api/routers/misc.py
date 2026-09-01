from fastapi import APIRouter

router = APIRouter(tags=["misc"])


@router.post("/api/push/dispatch")
async def push_dispatch_stub() -> dict:
    """OS push fan-out. In-app rows are written to `notifications` (and may trigger this)."""
    return {"ok": True, "sent": 0}
