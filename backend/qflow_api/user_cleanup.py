"""Shared user teardown for self-serve delete and admin staff removal."""

from typing import Any

import httpx

from qflow_api.config import settings
from qflow_api.supabase_admin import rest_patch, service_headers
from qflow_api.supabase_auth_admin import delete_user


async def purge_user_account(
    user_id: str,
    *,
    email: str | None = None,
    anonymize_queue: bool = True,
) -> None:
    """Remove a user's data and auth record. Profile is dropped via auth.users cascade."""
    await rest_patch(
        "queue_entries",
        {"user_id": f"eq.{user_id}", "status": "in.(waiting,almost,your-turn,serving)"},
        {"status": "cancelled", "serving_by": None, "serving_started_at": None},
        prefer="return=minimal",
    )

    async with httpx.AsyncClient(timeout=15.0) as client:
        await client.delete(
            f"{settings.supabase_rest_url}/push_subscriptions",
            params={"user_id": f"eq.{user_id}"},
            headers=service_headers(),
        )

    if anonymize_queue:
        await rest_patch(
            "queue_entries",
            {"user_id": f"eq.{user_id}"},
            {"user_id": None, "serving_by": None},
            prefer="return=minimal",
        )

    for table in ("notifications", "queue_history", "visit_ratings"):
        async with httpx.AsyncClient(timeout=15.0) as client:
            await client.delete(
                f"{settings.supabase_rest_url}/{table}",
                params={"user_id": f"eq.{user_id}"},
                headers=service_headers(),
            )

    if email:
        async with httpx.AsyncClient(timeout=15.0) as client:
            await client.delete(
                f"{settings.supabase_rest_url}/password_reset_tokens",
                params={"email": f"eq.{email.lower()}"},
                headers=service_headers(),
            )

    await delete_user(user_id)
