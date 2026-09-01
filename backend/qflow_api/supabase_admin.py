from typing import Any

import httpx

from qflow_api.config import settings


def service_headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    key = settings.supabase_service_role_key or settings.supabase_anon_key
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if extra:
        headers.update(extra)
    return headers


async def rest_get(path: str, params: dict[str, str] | None = None) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{settings.supabase_rest_url}/{path.lstrip('/')}",
            params=params,
            headers=service_headers(),
        )
    if response.status_code != 200:
        raise httpx.HTTPStatusError(
            f"Supabase GET failed: {response.text}",
            request=response.request,
            response=response,
        )
    data = response.json()
    return data if isinstance(data, list) else []


async def rest_get_one(path: str, params: dict[str, str]) -> dict[str, Any] | None:
    rows = await rest_get(path, params)
    return rows[0] if rows else None


async def rest_insert(path: str, body: dict[str, Any], *, prefer: str = "return=representation") -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{settings.supabase_rest_url}/{path.lstrip('/')}",
            headers=service_headers({"Prefer": prefer}),
            json=body,
        )
    if response.status_code not in (200, 201):
        raise httpx.HTTPStatusError(
            response.text or "Insert failed",
            request=response.request,
            response=response,
        )
    if not response.content:
        return {}
    rows = response.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    return {}


async def rest_upsert(
    path: str,
    body: dict[str, Any],
    *,
    on_conflict: str = "id",
    prefer: str = "return=representation",
) -> dict[str, Any] | None:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{settings.supabase_rest_url}/{path.lstrip('/')}",
            params={"on_conflict": on_conflict},
            headers=service_headers({"Prefer": f"resolution=merge-duplicates,{prefer}"}),
            json=body,
        )
    if response.status_code not in (200, 201):
        raise httpx.HTTPStatusError(
            response.text or "Upsert failed",
            request=response.request,
            response=response,
        )
    if not response.content:
        return None
    rows = response.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    return None


async def rest_patch(
    path: str,
    params: dict[str, str],
    body: dict[str, Any],
    *,
    prefer: str = "return=representation",
) -> dict[str, Any] | None:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.patch(
            f"{settings.supabase_rest_url}/{path.lstrip('/')}",
            params=params,
            headers=service_headers({"Prefer": prefer}),
            json=body,
        )
    if response.status_code not in (200, 204):
        raise httpx.HTTPStatusError(
            response.text or "Update failed",
            request=response.request,
            response=response,
        )
    if not response.content:
        return None
    rows = response.json()
    if isinstance(rows, list) and rows:
        return rows[0]
    return None
