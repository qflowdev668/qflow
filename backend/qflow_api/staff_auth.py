from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException

from qflow_api.auth import get_current_user
from qflow_api.supabase_admin import rest_get_one


@dataclass
class StaffContext:
    user_id: str
    email: str | None
    name: str | None
    role: str
    location_id: str


async def require_staff(user: dict[str, Any] = Depends(get_current_user)) -> StaffContext:
    profile = await rest_get_one(
        "profiles",
        {
            "id": f"eq.{user['id']}",
            "select": "role,location_id,name,staff_suspended_at",
        },
    )
    if not profile:
        raise HTTPException(status_code=403, detail="Could not load your staff profile.")

    if profile.get("staff_suspended_at"):
        raise HTTPException(
            status_code=403,
            detail="Your staff account is suspended. Contact your administrator.",
        )

    role = profile.get("role")
    if role not in ("staff", "admin"):
        raise HTTPException(status_code=403, detail="Only staff can access this.")

    location_id = profile.get("location_id")
    if not location_id:
        raise HTTPException(
            status_code=403,
            detail="Your staff account has no location assigned. Ask an admin to assign your clinic.",
        )

    return StaffContext(
        user_id=user["id"],
        email=user.get("email"),
        name=profile.get("name"),
        role=role,
        location_id=location_id,
    )
