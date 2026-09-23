from typing import Any

import httpx
from fastapi import HTTPException

from qflow_api.config import settings
from qflow_api.supabase_admin import service_headers


def storage_base() -> str:
    return f"{settings.supabase_url.rstrip('/')}/storage/v1"


def _storage_error_detail(response: httpx.Response, fallback: str) -> str:
    text = (response.text or "").strip()
    if not text:
        return fallback
    try:
        payload = response.json()
    except Exception:
        return text[:500]
    if isinstance(payload, dict):
        for key in ("message", "error", "msg"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
    return text[:500]


async def storage_upload_bytes(
    *,
    bucket: str,
    path: str,
    data: bytes,
    content_type: str,
    upsert: bool = True,
) -> None:
    headers = service_headers()
    headers["Content-Type"] = content_type
    headers["x-upsert"] = "true" if upsert else "false"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{storage_base()}/object/{bucket}/{path.lstrip('/')}",
            headers=headers,
            content=data,
        )
    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=_storage_error_detail(response, "Storage upload failed"),
        )


async def storage_remove(bucket: str, paths: list[str]) -> None:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.request(
            "DELETE",
            f"{storage_base()}/object/{bucket}",
            headers=service_headers(),
            json=paths,
        )
        if response.status_code in (200, 404):
            return
        # Some Storage versions expect { prefixes: [...] }
        response2 = await client.request(
            "DELETE",
            f"{storage_base()}/object/{bucket}",
            headers=service_headers(),
            json={"prefixes": paths},
        )
        if response2.status_code not in (200, 404):
            raise HTTPException(
                status_code=502,
                detail=response.text or response2.text or "Storage delete failed",
            )


def public_object_url(bucket: str, path: str) -> str:
    return (
        f"{settings.supabase_url.rstrip('/')}/storage/v1/object/public/"
        f"{bucket}/{path.lstrip('/')}"
    )
