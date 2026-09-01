import os
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from qflow_api.config import settings

router = APIRouter(tags=["status"])


@router.get("/api/status")
async def public_status() -> JSONResponse:
    checked_at = datetime.now(timezone.utc).isoformat()
    components: list[dict[str, Any]] = [
        {
            "name": "App Server",
            "status": "operational",
            "detail": "FastAPI responded successfully",
        }
    ]

    if not settings.supabase_url or not settings.supabase_anon_key:
        components.append(
            {"name": "Database", "status": "down", "detail": "Supabase URL or anon key not configured"}
        )
    else:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    f"{settings.supabase_rest_url}/locations",
                    params={"select": "id", "limit": "1"},
                    headers={
                        "apikey": settings.supabase_anon_key,
                        "Authorization": f"Bearer {settings.supabase_anon_key}",
                    },
                )
            components.append(
                {
                    "name": "Database",
                    "status": "operational" if res.is_success else "degraded",
                    "detail": "Supabase REST reachable" if res.is_success else f"HTTP {res.status_code}",
                }
            )
        except Exception as err:
            components.append(
                {"name": "Database", "status": "down", "detail": str(err) if err else "Unreachable"}
            )

    if not settings.supabase_url or not settings.supabase_anon_key:
        components.append(
            {"name": "Authentication", "status": "down", "detail": "Supabase Auth not configured"}
        )
    else:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    f"{settings.supabase_auth_url}/health",
                    headers={
                        "apikey": settings.supabase_anon_key,
                        "Authorization": f"Bearer {settings.supabase_anon_key}",
                    },
                )
            components.append(
                {
                    "name": "Authentication",
                    "status": "operational" if res.is_success else "degraded",
                    "detail": "Auth service healthy" if res.is_success else f"HTTP {res.status_code}",
                }
            )
        except Exception as err:
            components.append(
                {"name": "Authentication", "status": "down", "detail": str(err) if err else "Unreachable"}
            )

    vapid_public = bool(os.environ.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "").strip())
    vapid_private = bool(os.environ.get("VAPID_PRIVATE_KEY", "").strip())
    if vapid_public and vapid_private:
        components.append({"name": "Push Notifications", "status": "operational", "detail": "VAPID keys configured"})
    elif vapid_public or vapid_private:
        components.append({"name": "Push Notifications", "status": "degraded", "detail": "Incomplete VAPID configuration"})
    else:
        components.append({"name": "Push Notifications", "status": "down", "detail": "VAPID keys not set"})

    has_down = any(c["status"] == "down" for c in components)
    has_degraded = any(c["status"] == "degraded" for c in components)
    overall = "major_outage" if has_down else "partial_outage" if has_degraded else "operational"
    overall_label = (
        "All systems operational"
        if overall == "operational"
        else "Partial outage"
        if overall == "partial_outage"
        else "Major outage"
    )

    return JSONResponse(
        content={
            "overall": overall,
            "overallLabel": overall_label,
            "components": components,
            "checkedAt": checked_at,
        },
        headers={"Cache-Control": "no-store, max-age=0"},
    )
