import re
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from qflow_api.admin_access import get_admin_otp_config, normalize_sa_phone, resolve_admin_by_phone
from qflow_api.admin_auth import (
    create_password_reset_token,
    get_password_reset_token,
    mark_password_reset_verified,
)
from qflow_api.config import settings
from qflow_api.rate_limit import enforce_otp_rate_limit
from qflow_api.resend_client import get_resend_api_key, send_login_code_email, send_password_reset_email
from qflow_api.supabase_admin import rest_get_one, rest_patch
from qflow_api.supabase_auth_admin import (
    extract_email_otp,
    generate_link,
    sign_in_with_password,
)

router = APIRouter(tags=["auth"])


class StaffLoginBody(BaseModel):
    email: str = ""
    password: str = ""
    resendOnly: bool = False


class AdminOtpSendBody(BaseModel):
    phone: str = ""


class AdminOtpVerifyBody(BaseModel):
    phone: str = ""
    token: str = ""


async def verify_email_otp(email: str, token: str, otp_type: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{settings.supabase_auth_url}/verify",
            headers={"apikey": settings.supabase_anon_key, "Content-Type": "application/json"},
            json={"email": email, "token": token, "type": otp_type},
        )
    if response.status_code != 200:
        payload = response.json() if response.content else {}
        message = payload.get("msg") or payload.get("error_description") or "Invalid or expired code."
        raise HTTPException(status_code=401, detail=message)
    return response.json()


class ResetSendBody(BaseModel):
    email: str = ""


class ResetAdvanceBody(BaseModel):
    resetToken: str = ""
    otp: str = ""


@router.post("/api/staff/login")
async def staff_login(request: Request, body: StaffLoginBody) -> dict[str, Any]:
    email = body.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required.")
    if not body.password:
        raise HTTPException(status_code=400, detail="Password is required.")

    if not get_resend_api_key():
        raise HTTPException(
            status_code=501,
            detail="Resend is not configured. Add RESEND_API_KEY to environment.",
        )

    # Password check first — failed attempts must not burn the OTP rate limit.
    auth_data = await sign_in_with_password(email, body.password)
    user_id = (auth_data.get("user") or {}).get("id")
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password. Use the exact staff email from Admin → Staff.",
        )

    profile = await rest_get_one("profiles", {"id": f"eq.{user_id}", "select": "id,role,staff_suspended_at"})
    if not profile or profile.get("role") != "staff":
        raise HTTPException(
            status_code=403,
            detail="This account is not a staff account. Ask an admin to create/promote it under Admin → Staff.",
        )
    if profile.get("staff_suspended_at"):
        raise HTTPException(
            status_code=403,
            detail="This staff account is suspended. Contact your administrator.",
        )

    await enforce_otp_rate_limit(
        request, identity=email, identity_kind="email", route="/api/staff/login"
    )

    link_data = await generate_link(email, "magiclink")
    code = extract_email_otp(link_data)
    if not code:
        raise HTTPException(status_code=502, detail="Could not create a login code. Try again.")

    await send_login_code_email(email, code, "staff")

    return {
        "ok": True,
        "email": email,
        "message": "Login code sent to your email."
        if body.resendOnly
        else "Password verified. We sent a login code to your email.",
    }


@router.post("/api/admin/otp/send")
async def admin_otp_send(request: Request, body: AdminOtpSendBody) -> dict[str, Any]:
    phone = normalize_sa_phone(body.phone)
    if not phone:
        raise HTTPException(status_code=403, detail="This cellphone number is not authorized for admin access.")

    await enforce_otp_rate_limit(
        request, identity=phone, identity_kind="phone", route="/api/admin/otp/send"
    )

    if not get_resend_api_key():
        raise HTTPException(status_code=501, detail="Resend is not configured. Add RESEND_API_KEY to .env.local.")

    if not get_admin_otp_config():
        raise HTTPException(
            status_code=501,
            detail="Admin OTP is not configured. Set ADMIN_OTP_PHONE and ADMIN_OTP_EMAIL in .env.local.",
        )

    admin = await resolve_admin_by_phone(phone)
    if not admin:
        raise HTTPException(status_code=403, detail="This cellphone number is not authorized for admin access.")

    # Ensure admin profile exists
    existing = await rest_get_one("profiles", {"email": f"eq.{admin.email}", "select": "id,role"})
    if existing and existing.get("role") != "admin":
        await rest_patch("profiles", {"id": f"eq.{existing['id']}"}, {"role": "admin"})

    link_data = await generate_link(admin.email, "magiclink")
    code = extract_email_otp(link_data)
    if not code:
        raise HTTPException(status_code=500, detail="Could not create a login code. Try again.")

    await send_login_code_email(admin.email, code, "admin")

    return {"ok": True, "message": "Login code sent to the admin email for this number."}


@router.post("/api/admin/otp/verify")
async def admin_otp_verify(body: AdminOtpVerifyBody) -> dict[str, Any]:
    phone = normalize_sa_phone(body.phone)
    token = re.sub(r"\D", "", body.token)

    if not phone:
        raise HTTPException(status_code=403, detail="This cellphone number is not authorized for admin access.")
    if len(token) < 6:
        raise HTTPException(status_code=400, detail="Enter the login code from email.")
    if not get_admin_otp_config():
        raise HTTPException(status_code=501, detail="Admin OTP is not configured.")

    admin = await resolve_admin_by_phone(phone)
    if not admin:
        raise HTTPException(status_code=403, detail="This cellphone number is not authorized for admin access.")

    last_error = "Invalid login code."
    session_data: dict[str, Any] | None = None
    for otp_type in ("magiclink", "email"):
        try:
            session_data = await verify_email_otp(admin.email, token, otp_type)
            break
        except HTTPException as exc:
            last_error = str(exc.detail)

    if not session_data:
        raise HTTPException(status_code=401, detail=last_error)

    if admin.account_id:
        await rest_patch(
            "admin_accounts",
            {"id": f"eq.{admin.account_id}"},
            {"last_login_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()},
            prefer="return=minimal",
        )

    return {
        "ok": True,
        "session": {
            "access_token": session_data.get("access_token"),
            "refresh_token": session_data.get("refresh_token"),
            "expires_in": session_data.get("expires_in"),
        },
    }


@router.post("/api/auth/reset/send")
async def reset_send(request: Request, body: ResetSendBody) -> dict[str, Any]:
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address.")

    await enforce_otp_rate_limit(
        request, identity=email, identity_kind="email", route="/api/auth/reset/send"
    )

    if not get_resend_api_key():
        raise HTTPException(status_code=501, detail="Password reset email is not configured.")

    try:
        link_data = await generate_link(email, "recovery")
        code = extract_email_otp(link_data)
        if code:
            await send_password_reset_email(email, code)
    except HTTPException:
        pass

    reset_token = await create_password_reset_token(email)
    if not reset_token:
        raise HTTPException(status_code=500, detail="Could not start password reset. Try again.")

    return {"ok": True, "resetToken": reset_token}


@router.post("/api/auth/reset/advance")
async def reset_advance(body: ResetAdvanceBody) -> dict[str, Any]:
    token_id = body.resetToken.strip()
    otp = body.otp.strip()
    if not token_id or not otp:
        raise HTTPException(status_code=400, detail="Reset token and code are required.")

    row = await get_password_reset_token(token_id)
    if not row:
        raise HTTPException(status_code=400, detail="Reset session expired. Start again.")

    try:
        await verify_email_otp(row["email"], otp, "recovery")
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid or expired code.")

    verified = await mark_password_reset_verified(token_id)
    if not verified:
        raise HTTPException(status_code=500, detail="Could not advance reset session.")

    return {"ok": True, "email": verified["email"], "stage": verified["stage"]}


@router.get("/api/auth/reset/session")
async def reset_session(rt: str) -> dict[str, Any]:
    row = await get_password_reset_token(rt)
    if not row:
        raise HTTPException(status_code=404, detail="Reset session not found or expired.")
    return {"ok": True, "email": row["email"], "stage": row["stage"]}
