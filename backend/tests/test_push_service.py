"""Unit tests for Web Push dispatch helpers."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from qflow_api import push_service


def _request(authorization: str | None = None) -> Request:
    headers = []
    if authorization:
        headers.append((b"authorization", authorization.encode("utf-8")))
    return Request({"type": "http", "method": "POST", "headers": headers, "path": "/api/push/dispatch"})


def test_vapid_and_dispatch_ready(monkeypatch):
    monkeypatch.delenv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", raising=False)
    monkeypatch.delenv("VAPID_PRIVATE_KEY", raising=False)
    monkeypatch.delenv("PUSH_DISPATCH_SECRET", raising=False)
    assert push_service.vapid_configured() is False
    assert push_service.push_dispatch_ready() is False

    monkeypatch.setenv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub")
    monkeypatch.setenv("VAPID_PRIVATE_KEY", "priv")
    assert push_service.vapid_configured() is True
    assert push_service.push_dispatch_ready() is False

    monkeypatch.setenv("PUSH_DISPATCH_SECRET", "secret")
    assert push_service.push_dispatch_ready() is True


def test_is_push_dispatch_authorized(monkeypatch):
    monkeypatch.setenv("PUSH_DISPATCH_SECRET", "secret")
    assert push_service.is_push_dispatch_authorized(_request("Bearer secret")) is True
    assert push_service.is_push_dispatch_authorized(_request("Bearer wrong")) is False
    assert push_service.is_push_dispatch_authorized(_request(), user={"id": "u1"}) is True
    assert push_service.is_push_dispatch_authorized(_request()) is False


@pytest.mark.asyncio
async def test_require_push_actor_secret(monkeypatch):
    monkeypatch.setenv("PUSH_DISPATCH_SECRET", "secret")
    assert await push_service.require_push_actor(_request("Bearer secret")) is None


@pytest.mark.asyncio
async def test_require_push_actor_missing_auth(monkeypatch):
    monkeypatch.delenv("PUSH_DISPATCH_SECRET", raising=False)
    with pytest.raises(HTTPException) as exc:
        await push_service.require_push_actor(_request())
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_require_push_actor_staff_jwt(monkeypatch):
    monkeypatch.delenv("PUSH_DISPATCH_SECRET", raising=False)
    with (
        patch(
            "qflow_api.auth.verify_supabase_token",
            new_callable=AsyncMock,
            return_value={"id": "u1", "email": "s@x.com"},
        ),
        patch(
            "qflow_api.supabase_admin.rest_get_one",
            new_callable=AsyncMock,
            return_value={"role": "staff"},
        ),
    ):
        user = await push_service.require_push_actor(_request("Bearer user-tok"))
    assert user["id"] == "u1"
    assert user["_token"] == "user-tok"


@pytest.mark.asyncio
async def test_require_push_actor_rejects_customer(monkeypatch):
    monkeypatch.delenv("PUSH_DISPATCH_SECRET", raising=False)
    with (
        patch(
            "qflow_api.auth.verify_supabase_token",
            new_callable=AsyncMock,
            return_value={"id": "u1"},
        ),
        patch(
            "qflow_api.supabase_admin.rest_get_one",
            new_callable=AsyncMock,
            return_value={"role": "user"},
        ),
    ):
        with pytest.raises(HTTPException) as exc:
            await push_service.require_push_actor(_request("Bearer user-tok"))
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_send_push_to_user_no_vapid(monkeypatch):
    monkeypatch.delenv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", raising=False)
    monkeypatch.delenv("VAPID_PRIVATE_KEY", raising=False)
    result = await push_service.send_push_to_user("u1", title="T", body="B")
    assert result == {"ok": True, "sent": 0, "error": "VAPID keys are not configured."}


@pytest.mark.asyncio
async def test_send_push_to_user_sends_and_clears_stale(monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub")
    monkeypatch.setenv("VAPID_PRIVATE_KEY", "priv")

    rows = [
        {"id": "s1", "endpoint": "https://push/1", "p256dh": "a", "auth": "b"},
        {"id": "s2", "endpoint": "https://push/2", "p256dh": "c", "auth": "d"},
    ]

    class FakeWebPushExc(Exception):
        def __init__(self):
            self.response = MagicMock(status_code=410)

    def fake_webpush(**_kwargs):
        if fake_webpush.calls == 0:
            fake_webpush.calls += 1
            return None
        raise FakeWebPushExc()

    fake_webpush.calls = 0

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.delete = AsyncMock(return_value=MagicMock())

    with (
        patch("qflow_api.push_service.rest_get", new_callable=AsyncMock, return_value=rows),
        patch("qflow_api.push_service.webpush", side_effect=fake_webpush),
        patch("qflow_api.push_service.WebPushException", FakeWebPushExc),
        patch("qflow_api.push_service.httpx.AsyncClient", return_value=mock_client),
        patch("qflow_api.push_service.service_headers", return_value={}),
        patch("qflow_api.push_service.settings") as settings,
    ):
        settings.supabase_rest_url = "https://example.supabase.co/rest/v1"
        result = await push_service.send_push_to_user("u1", title="T", body="Hello")

    assert result["ok"] is True
    assert result["sent"] == 1
    mock_client.delete.assert_awaited()


@pytest.mark.asyncio
async def test_send_push_to_user_rest_error(monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub")
    monkeypatch.setenv("VAPID_PRIVATE_KEY", "priv")
    request = MagicMock()
    response = MagicMock(status_code=500, text="boom")
    with patch(
        "qflow_api.push_service.rest_get",
        new_callable=AsyncMock,
        side_effect=httpx.HTTPStatusError("fail", request=request, response=response),
    ):
        result = await push_service.send_push_to_user("u1", title="T", body="x")
    assert result["ok"] is False
    assert result["sent"] == 0
