from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from qflow_api.admin_access import get_admin_otp_config, is_bootstrap_admin_phone, normalize_sa_phone
from qflow_api.admin_auth import require_admin_dep
from qflow_api.supabase_admin import rest_get, rest_get_one, rest_insert, rest_patch, rest_upsert
from qflow_api.supabase_auth_admin import create_user, set_user_banned, sign_in_with_password, update_user
from qflow_api.user_cleanup import purge_user_account

router = APIRouter(tags=["admin"])


class AdminCreateBody(BaseModel):
    name: str = ""
    cellNumber: str = ""
    email: str = ""


class AdminPatchBody(BaseModel):
    id: str = ""
    isActive: bool | None = None


class StaffCreateBody(BaseModel):
    name: str = ""
    email: str = ""
    password: str = ""
    locationId: str | None = None


class StaffPatchBody(BaseModel):
    id: str = ""
    locationId: str | None = None
    password: str | None = None
    removeStaff: bool = False  # legacy alias for deleteStaff
    deleteStaff: bool = False
    suspendStaff: bool = False
    unsuspendStaff: bool = False


async def assign_staff_profile(
    user_id: str,
    *,
    name: str,
    email: str,
    location_id: str | None,
) -> None:
    """Ensure profiles.role is staff (trigger creates user role; service role upserts staff)."""
    await rest_upsert(
        "profiles",
        {
            "id": user_id,
            "name": name,
            "email": email,
            "role": "staff",
            "location_id": location_id,
            "staff_suspended_at": None,
        },
    )
    profile = await rest_get_one(
        "profiles",
        {"id": f"eq.{user_id}", "select": "role"},
    )
    if not profile or profile.get("role") != "staff":
        raise HTTPException(
            status_code=500,
            detail=(
                "Staff account was created but the staff role could not be assigned. "
                "Confirm SUPABASE_SERVICE_ROLE_KEY is set and run pending Supabase migrations."
            ),
        )


def validate_strong_password(password: str) -> str | None:
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not any(c.isupper() for c in password):
        return "Password must include an uppercase letter."
    if not any(c.islower() for c in password):
        return "Password must include a lowercase letter."
    if not any(c.isdigit() for c in password):
        return "Password must include a number."
    return None


@router.get("/api/admin/admins")
async def list_admins(admin: dict[str, Any] = Depends(require_admin_dep)) -> dict[str, Any]:
    rows = await rest_get(
        "admin_accounts",
        {
            "select": "id,name,cell_number,email,is_active,last_login_at,created_at",
            "order": "created_at.asc",
        },
    )
    bootstrap = get_admin_otp_config()
    admins = []
    if bootstrap:
        admins.append(
            {
                "id": "env-bootstrap",
                "name": "Super Admin",
                "cellNumber": bootstrap["phone"],
                "email": bootstrap["email"],
                "isActive": True,
                "isBootstrap": True,
                "lastLoginAt": None,
                "createdAt": None,
            }
        )
    for row in rows:
        admins.append(
            {
                "id": row["id"],
                "name": row["name"],
                "cellNumber": row["cell_number"],
                "email": row["email"],
                "isActive": row["is_active"],
                "isBootstrap": False,
                "lastLoginAt": row.get("last_login_at"),
                "createdAt": row.get("created_at"),
            }
        )
    return {"admins": admins}


@router.post("/api/admin/admins")
async def create_admin(
    body: AdminCreateBody, admin: dict[str, Any] = Depends(require_admin_dep)
) -> dict[str, Any]:
    name = body.name.strip()
    cell_number = normalize_sa_phone(body.cellNumber)
    email = body.email.strip().lower()
    if not name or len(cell_number) < 10 or "@" not in email:
        raise HTTPException(status_code=400, detail="Name, cellphone, and email are required.")

    if is_bootstrap_admin_phone(cell_number):
        raise HTTPException(status_code=400, detail="That cellphone is reserved for the bootstrap super-admin.")

    bootstrap = get_admin_otp_config()
    if bootstrap and email == bootstrap["email"]:
        raise HTTPException(status_code=400, detail="That email is reserved for the bootstrap super-admin.")

    existing = await rest_get_one("profiles", {"email": f"eq.{email}", "select": "id,role"})
    if not existing:
        try:
            created = await create_user(email, name=name, email_confirm=True)
            user_id = created.get("id") or (created.get("user") or {}).get("id")
            if user_id:
                await rest_patch("profiles", {"id": f"eq.{user_id}"}, {"name": name, "role": "admin", "email": email})
        except HTTPException:
            pass
    elif existing.get("role") != "admin":
        await rest_patch("profiles", {"id": f"eq.{existing['id']}"}, {"role": "admin", "name": name})

    try:
        row = await rest_insert(
            "admin_accounts",
            {"name": name, "cell_number": cell_number, "email": email, "is_active": True},
        )
    except Exception as err:
        message = str(err)
        if "duplicate" in message.lower() or "23505" in message:
            raise HTTPException(status_code=409, detail="An admin with that cellphone or email already exists.")
        raise HTTPException(status_code=500, detail=message)

    await rest_insert(
        "audit_log",
        {
            "actor_id": admin["id"],
            "actor_name": admin["name"],
            "action": "Admin Added",
            "detail": f"{name} <{email}> {cell_number}",
        },
        prefer="return=minimal",
    )

    return {
        "ok": True,
        "admin": {
            "id": row["id"],
            "name": row["name"],
            "cellNumber": row["cell_number"],
            "email": row["email"],
            "isActive": row["is_active"],
            "isBootstrap": False,
            "lastLoginAt": row.get("last_login_at"),
            "createdAt": row.get("created_at"),
        },
    }


@router.patch("/api/admin/admins")
async def patch_admin(
    body: AdminPatchBody, admin: dict[str, Any] = Depends(require_admin_dep)
) -> dict[str, bool]:
    if not body.id or body.id == "env-bootstrap":
        raise HTTPException(status_code=400, detail="The bootstrap super-admin cannot be changed here.")
    if body.isActive is None:
        raise HTTPException(status_code=400, detail="isActive is required.")

    existing = await rest_get_one(
        "admin_accounts",
        {"id": f"eq.{body.id}", "select": "id,name,email,cell_number"},
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Admin account not found.")
    if is_bootstrap_admin_phone(existing["cell_number"]):
        raise HTTPException(status_code=400, detail="The bootstrap super-admin cannot be deactivated.")

    await rest_patch("admin_accounts", {"id": f"eq.{body.id}"}, {"is_active": body.isActive})
    await rest_insert(
        "audit_log",
        {
            "actor_id": admin["id"],
            "actor_name": admin["name"],
            "action": "Admin Reactivated" if body.isActive else "Admin Deactivated",
            "detail": f"{existing['name']} <{existing['email']}>",
        },
        prefer="return=minimal",
    )
    return {"ok": True}


@router.get("/api/admin/staff")
async def list_staff(admin: dict[str, Any] = Depends(require_admin_dep)) -> dict[str, Any]:
    rows = await rest_get(
        "profiles",
        {
            "role": "eq.staff",
            "select": "id,name,email,role,location_id,created_at,staff_suspended_at,locations(name)",
            "order": "name.asc",
        },
    )
    staff = []
    for row in rows:
        location = row.get("locations") or {}
        staff.append(
            {
                "id": row["id"],
                "name": row["name"],
                "email": row["email"],
                "locationId": row.get("location_id"),
                "locationName": location.get("name") if isinstance(location, dict) else None,
                "createdAt": row.get("created_at"),
                "suspended": bool(row.get("staff_suspended_at")),
            }
        )
    return {"staff": staff}


@router.post("/api/admin/staff")
async def create_staff(
    body: StaffCreateBody, admin: dict[str, Any] = Depends(require_admin_dep)
) -> dict[str, Any]:
    name = body.name.strip()
    email = body.email.strip().lower()
    password = body.password
    location_id = body.locationId

    if not name or not email or not password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required.")

    strength = validate_strong_password(password)
    if strength:
        raise HTTPException(status_code=400, detail=strength)

    if location_id:
        loc = await rest_get_one("locations", {"id": f"eq.{location_id}", "select": "id,name"})
        if not loc:
            raise HTTPException(status_code=400, detail="Location not found.")

    existing = await rest_get_one("profiles", {"email": f"eq.{email}", "select": "id,role,staff_suspended_at"})
    if existing:
        role = existing.get("role")
        if role == "staff" and not existing.get("staff_suspended_at"):
            raise HTTPException(
                status_code=409, detail="A staff account with this email already exists."
            )
        if role == "admin":
            raise HTTPException(status_code=400, detail="This email belongs to an admin account.")
        user_id = existing["id"]
        await update_user(
            user_id,
            password=password,
            name=name,
            email_confirm=True,
            app_metadata={"profile_role": "staff"},
        )
    else:
        created = await create_user(
            email,
            password=password,
            name=name,
            email_confirm=True,
            app_metadata={"profile_role": "staff"},
        )
        user_id = created.get("id") or (created.get("user") or {}).get("id")
        if not user_id:
            raise HTTPException(status_code=400, detail="Could not create staff account.")

    await assign_staff_profile(
        user_id,
        name=name,
        email=email,
        location_id=location_id,
    )

    await set_user_banned(user_id, banned=False)

    # Prove Auth will accept this password before returning success to the admin UI.
    try:
        await sign_in_with_password(email, password)
    except HTTPException as exc:
        raise HTTPException(
            status_code=500,
            detail=(
                "Staff profile was created but the password could not be used to sign in. "
                f"Reset the password from Manage access. ({exc.detail})"
            ),
        ) from exc

    await rest_insert(
        "audit_log",
        {
            "actor_id": admin["id"],
            "actor_name": admin["name"],
            "action": "Staff Added",
            "detail": f"{name} <{email}> assigned to location {location_id or 'none'}",
        },
        prefer="return=minimal",
    )

    return {"ok": True, "staff": {"id": user_id, "name": name, "email": email, "locationId": location_id}}


@router.patch("/api/admin/staff")
async def patch_staff(
    body: StaffPatchBody, admin: dict[str, Any] = Depends(require_admin_dep)
) -> dict[str, bool]:
    if not body.id:
        raise HTTPException(status_code=400, detail="Staff id is required.")

    existing = await rest_get_one(
        "profiles",
        {"id": f"eq.{body.id}", "select": "id,name,email,role,staff_suspended_at"},
    )
    if not profile or profile.get("role") != "staff":
        raise HTTPException(status_code=404, detail="Staff member not found.")

    if body.password is not None and body.password.strip():
        strength = validate_strong_password(body.password)
        if strength:
            raise HTTPException(status_code=400, detail=strength)
        await update_user(
            existing["id"],
            password=body.password,
            email_confirm=True,
            app_metadata={"profile_role": "staff"},
        )
        await set_user_banned(existing["id"], banned=False)
        # Confirm Auth accepts the new password before telling the admin it worked.
        try:
            await sign_in_with_password(existing["email"], body.password)
        except HTTPException as exc:
            raise HTTPException(
                status_code=500,
                detail=(
                    "Password was written but could not be verified for sign-in. "
                    f"({exc.detail})"
                ),
            ) from exc
        await rest_insert(
            "audit_log",
            {
                "actor_id": admin["id"],
                "actor_name": admin["name"],
                "action": "Staff Password Reset",
                "detail": f"{existing['name']} <{existing['email']}> password reset by admin",
            },
            prefer="return=minimal",
        )
        return {"ok": True}

    delete_staff = body.deleteStaff or body.removeStaff

    if delete_staff:
        await purge_user_account(
            existing["id"],
            email=existing.get("email"),
            anonymize_queue=True,
        )
        await rest_insert(
            "audit_log",
            {
                "actor_id": admin["id"],
                "actor_name": admin["name"],
                "action": "Staff Deleted",
                "detail": f"{existing['name']} <{existing['email']}> account permanently deleted",
            },
            prefer="return=minimal",
        )
        return {"ok": True}

    if body.suspendStaff:
        if existing.get("staff_suspended_at"):
            raise HTTPException(status_code=400, detail="This staff member is already suspended.")
        suspended_at = datetime.now(timezone.utc).isoformat()
        await rest_patch(
            "profiles",
            {"id": f"eq.{body.id}"},
            {"staff_suspended_at": suspended_at},
        )
        await set_user_banned(existing["id"], banned=True)
        await rest_insert(
            "audit_log",
            {
                "actor_id": admin["id"],
                "actor_name": admin["name"],
                "action": "Staff Suspended",
                "detail": f"{existing['name']} <{existing['email']}> suspended",
            },
            prefer="return=minimal",
        )
        return {"ok": True}

    if body.unsuspendStaff:
        if not existing.get("staff_suspended_at"):
            raise HTTPException(status_code=400, detail="This staff member is not suspended.")
        await rest_patch(
            "profiles",
            {"id": f"eq.{body.id}"},
            {"staff_suspended_at": None},
        )
        await set_user_banned(existing["id"], banned=False)
        await rest_insert(
            "audit_log",
            {
                "actor_id": admin["id"],
                "actor_name": admin["name"],
                "action": "Staff Reactivated",
                "detail": f"{existing['name']} <{existing['email']}> reactivated",
            },
            prefer="return=minimal",
        )
        return {"ok": True}

    if body.locationId:
        loc = await rest_get_one("locations", {"id": f"eq.{body.locationId}", "select": "id"})
        if not loc:
            raise HTTPException(status_code=400, detail="Location not found.")

    await rest_patch(
        "profiles", {"id": f"eq.{body.id}"}, {"location_id": body.locationId}
    )
    await rest_insert(
        "audit_log",
        {
            "actor_id": admin["id"],
            "actor_name": admin["name"],
            "action": "Staff Reassigned",
            "detail": f"{existing['name']} → location {body.locationId or 'none'}",
        },
        prefer="return=minimal",
    )
    return {"ok": True}
