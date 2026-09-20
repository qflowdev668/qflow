from typing import Any

import httpx
from fastapi import HTTPException

from qflow_api.config import settings
from qflow_api.supabase_admin import service_headers


async def sign_in_with_password(email: str, password: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{settings.supabase_auth_url}/token?grant_type=password",
            headers={
                "apikey": settings.supabase_anon_key,
                "Content-Type": "application/json",
            },
            json={"email": email, "password": password},
        )
    if response.status_code != 200:
        payload = response.json() if response.content else {}
        message = (
            payload.get("error_description")
            or payload.get("msg")
            or payload.get("error")
            or "Invalid email or password."
        )
        if isinstance(message, str) and "invalid" in message.lower():
            message = (
                "Invalid email or password. Check the exact staff email from Admin → Staff "
                "and the temporary password (must include an uppercase letter)."
            )
        raise HTTPException(status_code=401, detail=message)
    return response.json()


async def generate_link(email: str, link_type: str = "magiclink") -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{settings.supabase_auth_url}/admin/generate_link",
            headers=service_headers(),
            json={"type": link_type, "email": email},
        )
    if response.status_code != 200:
        payload = response.json() if response.content else {}
        message = payload.get("msg") or payload.get("message") or "Could not generate link."
        raise HTTPException(status_code=400, detail=message)
    return response.json()


def extract_email_otp(link_data: dict[str, Any]) -> str | None:
    """
    Supabase Auth historically returned email_otp under `properties`.
    Current Admin API puts `email_otp` on the top-level generate_link payload.
    """
    direct = link_data.get("email_otp")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()
    props = link_data.get("properties")
    if isinstance(props, dict):
        nested = props.get("email_otp")
        if isinstance(nested, str) and nested.strip():
            return nested.strip()
    return None


async def create_user(
    email: str,
    *,
    password: str | None = None,
    name: str | None = None,
    email_confirm: bool = True,
    app_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {"email": email, "email_confirm": email_confirm}
    if password:
        body["password"] = password
    if name:
        body["user_metadata"] = {"name": name}
    if app_metadata:
        body["app_metadata"] = app_metadata

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{settings.supabase_auth_url}/admin/users",
            headers=service_headers(),
            json=body,
        )
    if response.status_code not in (200, 201):
        payload = response.json() if response.content else {}
        message = payload.get("msg") or payload.get("message") or "Could not create user."
        raise HTTPException(status_code=400, detail=message)
    return response.json()


async def update_user(
    user_id: str,
    *,
    password: str | None = None,
    name: str | None = None,
    email_confirm: bool | None = None,
    app_metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {}
    if password:
        body["password"] = password
    if name:
        body["user_metadata"] = {"name": name}
    if email_confirm is not None:
        body["email_confirm"] = email_confirm
    if app_metadata:
        body["app_metadata"] = app_metadata
    if not body:
        return {}

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.put(
            f"{settings.supabase_auth_url}/admin/users/{user_id}",
            headers=service_headers(),
            json=body,
        )
    if response.status_code != 200:
        payload = response.json() if response.content else {}
        message = payload.get("msg") or payload.get("message") or "Could not update user."
        raise HTTPException(status_code=400, detail=message)
    return response.json()


async def set_user_banned(user_id: str, *, banned: bool) -> None:
    """Block or restore sign-in via Supabase Auth ban."""
    body = {"ban_duration": "876000h" if banned else "none"}
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.put(
            f"{settings.supabase_auth_url}/admin/users/{user_id}",
            headers=service_headers(),
            json=body,
        )
    if response.status_code != 200:
        payload = response.json() if response.content else {}
        message = payload.get("msg") or payload.get("message") or "Could not update account status."
        raise HTTPException(status_code=400, detail=message)


async def delete_user(user_id: str) -> None:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.delete(
            f"{settings.supabase_auth_url}/admin/users/{user_id}",
            headers=service_headers(),
        )
    if response.status_code not in (200, 204):
        payload = response.json() if response.content else {}
        message = payload.get("msg") or payload.get("message") or "Could not delete user."
        raise HTTPException(status_code=500, detail=message)


async def get_user_by_token(token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{settings.supabase_auth_url}/user",
            headers={
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {token}",
            },
        )
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Not signed in.")
    return response.json()
