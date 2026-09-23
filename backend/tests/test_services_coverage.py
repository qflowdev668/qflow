"""Broad mocked coverage for FastAPI services (auth, queue, staff, admin helpers)."""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request

from main import app
from qflow_api.admin_access import (
    get_admin_otp_config,
    is_bootstrap_admin_phone,
    normalize_sa_phone,
    resolve_admin_by_phone,
)
from qflow_api.admin_auth import (
    create_password_reset_token,
    get_password_reset_token,
    mark_password_reset_verified,
    require_admin,
)
from qflow_api.auth import get_current_user, jwt_exp_unverified, supabase_headers, verify_supabase_token
from qflow_api.queue_service import _friendly_join_error, join_queue, leave_queue
from qflow_api.rate_limit import (
    IDENTITY_MAX,
    RATE_LIMIT_MESSAGE,
    _hits,
    client_ip,
    enforce_otp_rate_limit,
)
from qflow_api.resend_client import (
    format_resend_error,
    get_resend_api_key,
    get_resend_from,
    resolve_resend_recipient,
    send_login_code_email,
    send_password_reset_email,
)
from qflow_api.routers.admin import validate_strong_password
from qflow_api.staff_auth import StaffContext, require_staff
from qflow_api.staff_service import (
    add_walk_in,
    build_queue_entry_item,
    build_serving_payload,
    claim_entry,
    find_active_serving,
    finish_entry,
    format_ticket,
    get_staff_queue,
    load_next_waiting,
    minutes_since,
    resolve_customer_name,
)
from qflow_api.supabase_admin import rest_get, rest_get_one, rest_insert, rest_patch, service_headers
from qflow_api.config import settings as app_settings
from qflow_api.supabase_auth_admin import (
    create_user,
    delete_user,
    extract_email_otp,
    generate_link,
    get_user_by_token,
    sign_in_with_password,
)

client = TestClient(app)


def _request(ip: str = "1.2.3.4", forwarded: str | None = None) -> Request:
    headers = []
    if forwarded:
        headers.append((b"x-forwarded-for", forwarded.encode()))
    else:
        headers.append((b"x-real-ip", ip.encode()))
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/test",
        "headers": headers,
        "query_string": b"",
        "client": (ip, 12345),
        "server": ("test", 80),
        "scheme": "http",
    }
    return Request(scope)


# --- rate_limit ---


def test_client_ip_from_forwarded_and_real():
    assert client_ip(_request(forwarded="9.9.9.9, 8.8.8.8")) == "9.9.9.9"
    assert client_ip(_request(ip="7.7.7.7")) == "7.7.7.7"


@pytest.mark.asyncio
async def test_otp_rate_limit_blocks_after_max():
    _hits.clear()
    req = _request(ip="10.0.0.99")
    identity = f"rate-test-{time.time()}"
    for _ in range(IDENTITY_MAX):
        result = await enforce_otp_rate_limit(
            req, identity=identity, identity_kind="email", route="/t"
        )
        assert result.ok is True
    with pytest.raises(HTTPException) as exc:
        await enforce_otp_rate_limit(
            req, identity=identity, identity_kind="email", route="/t"
        )
    assert exc.value.status_code == 429
    assert RATE_LIMIT_MESSAGE in str(exc.value.detail)
    _hits.clear()


# --- admin_access ---


def test_normalize_sa_phone_variants():
    assert normalize_sa_phone("+27821234567") == "0821234567"
    assert normalize_sa_phone("821234567") == "0821234567"
    assert normalize_sa_phone("082123456789") == "0821234567"


def test_admin_otp_config_and_bootstrap(monkeypatch):
    monkeypatch.delenv("ADMIN_OTP_PHONE", raising=False)
    monkeypatch.delenv("ADMIN_OTP_EMAIL", raising=False)
    assert get_admin_otp_config() is None
    assert is_bootstrap_admin_phone("0821234567") is False

    monkeypatch.setenv("ADMIN_OTP_PHONE", "0821234567")
    monkeypatch.setenv("ADMIN_OTP_EMAIL", "admin@example.com")
    cfg = get_admin_otp_config()
    assert cfg == {"phone": "0821234567", "email": "admin@example.com"}
    assert is_bootstrap_admin_phone("082 123 4567") is True


@pytest.mark.asyncio
async def test_resolve_admin_by_phone_bootstrap_and_db(monkeypatch):
    monkeypatch.setenv("ADMIN_OTP_PHONE", "0821111222")
    monkeypatch.setenv("ADMIN_OTP_EMAIL", "boot@example.com")
    boot = await resolve_admin_by_phone("0821111222")
    assert boot is not None and boot.is_bootstrap is True

    assert await resolve_admin_by_phone("12") is None

    with patch(
        "qflow_api.admin_access.rest_get_one",
        new_callable=AsyncMock,
        return_value={
            "id": "a1",
            "name": "Ada",
            "cell_number": "0829999888",
            "email": "Ada@Example.com",
            "is_active": True,
        },
    ):
        admin = await resolve_admin_by_phone("0829999888")
    assert admin is not None
    assert admin.email == "ada@example.com"
    assert admin.is_bootstrap is False


# --- queue_service ---


def test_friendly_join_error_mapping():
    assert _friendly_join_error(409, "duplicate")[0] == 409
    assert _friendly_join_error(403, "row-level security")[0] == 403
    assert _friendly_join_error(500, "boom")[0] == 500


@pytest.mark.asyncio
async def test_join_queue_happy_path():
    with (
        patch(
            "qflow_api.queue_service.rest_get_one",
            new_callable=AsyncMock,
            return_value={"id": "loc", "name": "Clinic", "queue_count": 2, "is_open": True},
        ),
        patch("qflow_api.queue_service.rest_get", new_callable=AsyncMock, return_value=[]),
        patch(
            "qflow_api.queue_service.rest_insert",
            new_callable=AsyncMock,
            return_value={"id": "e1", "position": 3},
        ),
    ):
        result = await join_queue("tok", "user-1", "loc", priority="bogus")
    assert result["ok"] is True
    assert result["position"] == 3
    assert result["locationName"] == "Clinic"


@pytest.mark.asyncio
async def test_join_queue_closed_and_already_in():
    with (
        patch(
            "qflow_api.queue_service.rest_get_one",
            new_callable=AsyncMock,
            return_value={"id": "loc", "name": "C", "queue_count": 0, "is_open": False},
        ),
        patch("qflow_api.queue_service.rest_get", new_callable=AsyncMock, return_value=[]),
    ):
        with pytest.raises(HTTPException) as closed:
            await join_queue("t", "u", "loc")
        assert closed.value.status_code == 409

    with (
        patch(
            "qflow_api.queue_service.rest_get_one",
            new_callable=AsyncMock,
            return_value={"id": "loc", "name": "C", "queue_count": 1, "is_open": True},
        ),
        patch(
            "qflow_api.queue_service.rest_get",
            new_callable=AsyncMock,
            return_value=[{"id": "e", "location_id": "loc"}],
        ),
    ):
        with pytest.raises(HTTPException) as exists:
            await join_queue("t", "u", "loc")
        assert "already" in str(exists.value.detail).lower()


@pytest.mark.asyncio
async def test_leave_queue_success_via_patch():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.content = b'[{"id":"e1"}]'
    mock_response.json.return_value = [{"id": "e1"}]

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.patch = AsyncMock(return_value=mock_response)

    with patch("qflow_api.queue_service.httpx.AsyncClient", return_value=mock_client):
        result = await leave_queue("tok", "user-1", "e1")
    assert result == {"ok": True}


# --- staff_service ---


def test_staff_helpers_format_and_payload():
    assert format_ticket(7) == "#007"
    joined = (datetime.now(timezone.utc) - timedelta(minutes=12)).isoformat()
    assert minutes_since(joined) >= 11
    payload = build_serving_payload(
        {
            "id": "e1",
            "position": 5,
            "joined_at": joined,
            "priority": "emergency",
            "priority_category": "police",
            "is_walk_in": False,
            "user_id": "u1",
            "location_id": "loc",
        },
        "Thabo",
        {"position": 6, "joined_at": joined},
    )
    assert payload["ticketNumber"] == "#005"
    assert payload["next"]["ticketNumber"] == "#006"


@pytest.mark.asyncio
async def test_resolve_customer_name_variants():
    assert await resolve_customer_name({"is_walk_in": True, "walk_in_name": "Walk"}) == "Walk"
    assert await resolve_customer_name({"is_walk_in": False}) == "Customer"
    with patch(
        "qflow_api.staff_service.rest_get_one",
        new_callable=AsyncMock,
        return_value={"name": "Lerato"},
    ):
        assert await resolve_customer_name({"user_id": "u1"}) == "Lerato"


@pytest.mark.asyncio
async def test_build_queue_entry_item_and_get_staff_queue():
    joined = datetime.now(timezone.utc).isoformat()
    item = await build_queue_entry_item(
        {
            "id": "e1",
            "position": 2,
            "joined_at": joined,
            "is_walk_in": True,
            "walk_in_name": "A",
            "walk_in_notes": "note",
            "priority": "standard",
        },
        None,
    )
    assert item["isWalkIn"] is True
    assert item["hasSpecialNeeds"] is True

    staff = StaffContext("s1", "s@x.com", "Staff", "staff", "loc-1")

    async def fake_rest_get(_path: str, params: dict[str, str] | None = None):
        params = params or {}
        status = params.get("status", "")
        if "served" in status:
            return [{"joined_at": joined, "served_at": joined}]
        if "no-show" in status:
            return []
        if "serving" in status:
            return []
        return [
            {
                "id": "e1",
                "position": 1,
                "joined_at": joined,
                "priority": "standard",
                "priority_category": None,
                "is_walk_in": True,
                "walk_in_name": "W",
                "walk_in_notes": None,
                "user_id": None,
            }
        ]

    with patch(
        "qflow_api.staff_service.rest_get",
        new_callable=AsyncMock,
        side_effect=fake_rest_get,
    ):
        data = await get_staff_queue(staff)
    assert data["summary"]["customersServed"] == 1
    assert data["summary"]["queueRemaining"] == 1
    assert len(data["entries"]) == 1


@pytest.mark.asyncio
async def test_add_walk_in_claim_finish():
    staff = StaffContext("s1", "s@x.com", "Staff", "staff", "loc-1", access_token="tok")
    joined = datetime.now(timezone.utc).isoformat()

    with (
        patch(
            "qflow_api.staff_service.rest_insert",
            new_callable=AsyncMock,
            side_effect=[{"id": "w1", "position": 4}, {}],
        ),
    ):
        created = await add_walk_in(staff, "Walk", priority="standard")
    assert created == {"id": "w1", "position": 4}

    with pytest.raises(HTTPException):
        await add_walk_in(staff, "X", priority="invalid")

    entry = {
        "id": "e1",
        "position": 1,
        "joined_at": joined,
        "priority": "standard",
        "is_walk_in": False,
        "user_id": "u1",
        "location_id": "loc-1",
    }
    with (
        patch("qflow_api.staff_service.find_active_serving", new_callable=AsyncMock, return_value=None),
        patch("qflow_api.staff_service.rest_rpc", new_callable=AsyncMock, return_value=entry),
        patch("qflow_api.staff_service.resolve_customer_name", new_callable=AsyncMock, return_value="Pat"),
        patch("qflow_api.staff_service.load_next_waiting", new_callable=AsyncMock, return_value=None),
    ):
        claimed = await claim_entry(staff)
    assert claimed["ticketNumber"] == "#001"

    with (
        patch(
            "qflow_api.staff_service.find_active_serving",
            new_callable=AsyncMock,
            return_value=entry,
        ),
        patch(
            "qflow_api.staff_service.rest_patch",
            new_callable=AsyncMock,
            return_value={**entry, "user_id": "u1"},
        ),
    ):
        finished = await finish_entry(staff, "served")
    assert finished["ok"] is True
    assert finished["userId"] == "u1"

    with pytest.raises(HTTPException):
        await finish_entry(staff, "cancelled")


@pytest.mark.asyncio
async def test_claim_conflict_when_already_serving():
    staff = StaffContext("s1", "s@x.com", "Staff", "staff", "loc-1")
    joined = datetime.now(timezone.utc).isoformat()
    serving = {
        "id": "e9",
        "position": 9,
        "joined_at": joined,
        "priority": "standard",
        "is_walk_in": False,
        "user_id": None,
        "location_id": "loc-1",
    }
    with (
        patch("qflow_api.staff_service.find_active_serving", new_callable=AsyncMock, return_value=serving),
        patch("qflow_api.staff_service.resolve_customer_name", new_callable=AsyncMock, return_value="A"),
        patch("qflow_api.staff_service.load_next_waiting", new_callable=AsyncMock, return_value=None),
    ):
        result = await claim_entry(staff, entry_id="other")
    assert result["_status"] == 409


# --- auth / admin_auth ---


@pytest.mark.asyncio
async def test_verify_supabase_token_success():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"id": "u1", "email": "a@b.com"}
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.get = AsyncMock(return_value=mock_response)

    with (
        patch("qflow_api.auth.settings") as settings,
        patch("qflow_api.auth.httpx.AsyncClient", return_value=mock_client),
    ):
        settings.supabase_url = "https://example.supabase.co"
        settings.supabase_anon_key = "anon"
        settings.supabase_auth_url = "https://example.supabase.co/auth/v1"
        user = await verify_supabase_token(
            "eyJhbGciOiJIUzI1NiJ9."
            + __import__("base64").urlsafe_b64encode(
                b'{"exp":9999999999,"sub":"u1"}'
            ).decode().rstrip("=")
            + ".sig"
        )
    assert user["id"] == "u1"
    assert "Authorization" in supabase_headers("tok")


@pytest.mark.asyncio
async def test_verify_supabase_token_connect_timeout_returns_503():
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.get = AsyncMock(side_effect=httpx.ConnectTimeout("timed out"))

    with (
        patch("qflow_api.auth.settings") as settings,
        patch("qflow_api.auth.httpx.AsyncClient", return_value=mock_client),
        pytest.raises(HTTPException) as raised,
    ):
        settings.supabase_url = "https://example.supabase.co"
        settings.supabase_anon_key = "anon"
        settings.supabase_auth_url = "https://example.supabase.co/auth/v1"
        await verify_supabase_token(
            "eyJhbGciOiJIUzI1NiJ9."
            + __import__("base64").urlsafe_b64encode(
                b'{"exp":9999999999,"sub":"u1"}'
            ).decode().rstrip("=")
            + ".sig"
        )

    assert raised.value.status_code == 503
    assert "Supabase Auth" in str(raised.value.detail)
    assert mock_client.get.await_count == 2


@pytest.mark.asyncio
async def test_require_admin_and_password_reset_tokens():
    with patch(
        "qflow_api.admin_auth.rest_get_one",
        new_callable=AsyncMock,
        return_value={"id": "a1", "name": "A", "email": "a@x.com", "role": "admin"},
    ):
        admin = await require_admin(MagicMock(), {"id": "a1"})
    assert admin["role"] == "admin"

    with patch(
        "qflow_api.admin_auth.rest_get_one",
        new_callable=AsyncMock,
        return_value={"id": "u1", "role": "user"},
    ):
        with pytest.raises(HTTPException) as forbidden:
            await require_admin(MagicMock(), {"id": "u1"})
        assert forbidden.value.status_code == 403

    with patch("qflow_api.admin_auth.rest_insert", new_callable=AsyncMock, return_value={}):
        token = await create_password_reset_token("a@b.com")
    assert token

    future = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    with patch(
        "qflow_api.admin_auth.rest_get_one",
        new_callable=AsyncMock,
        return_value={
            "id": "t1",
            "email": "a@b.com",
            "stage": "otp_sent",
            "expires_at": future,
            "consumed_at": None,
        },
    ):
        row = await get_password_reset_token("t1")
    assert row is not None

    with (
        patch(
            "qflow_api.admin_auth.get_password_reset_token",
            new_callable=AsyncMock,
            return_value={"id": "t1", "stage": "otp_sent"},
        ),
        patch(
            "qflow_api.admin_auth.rest_patch",
            new_callable=AsyncMock,
            return_value={"id": "t1", "stage": "verified"},
        ),
    ):
        verified = await mark_password_reset_verified("t1")
    assert verified["stage"] == "verified"


# --- supabase admin / auth admin / resend ---


def _configure_supabase_for_tests(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        app_settings,
        "supabase_url",
        "https://abcdefghijklmnopqrst.supabase.co",
    )
    monkeypatch.setattr(
        app_settings,
        "supabase_service_role_key",
        "test-service-role-key-" + ("x" * 40),
    )
    monkeypatch.setattr(
        app_settings,
        "supabase_anon_key",
        "test-anon-key-" + ("y" * 40),
    )


def test_service_headers_and_validate_password(monkeypatch):
    _configure_supabase_for_tests(monkeypatch)
    headers = service_headers({"Prefer": "return=minimal"})
    assert "Authorization" in headers
    assert headers["Prefer"] == "return=minimal"
    assert validate_strong_password("short") is not None
    assert validate_strong_password("Password1") is None


@pytest.mark.asyncio
async def test_rest_helpers_success_and_error(monkeypatch):
    _configure_supabase_for_tests(monkeypatch)
    ok = MagicMock()
    ok.status_code = 200
    ok.json.return_value = [{"id": "1"}]
    ok.request = MagicMock()

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.get = AsyncMock(return_value=ok)
    mock_client.post = AsyncMock(return_value=MagicMock(status_code=201, json=lambda: [{"id": "2"}], content=b"[]", request=MagicMock(), text=""))
    mock_client.patch = AsyncMock(return_value=MagicMock(status_code=200, content=b'[{"id":"3"}]', json=lambda: [{"id": "3"}], request=MagicMock(), text=""))

    with patch("qflow_api.supabase_admin.httpx.AsyncClient", return_value=mock_client):
        rows = await rest_get("locations", {"limit": "1"})
        assert rows[0]["id"] == "1"
        one = await rest_get_one("locations", {"id": "eq.1"})
        assert one["id"] == "1"
        inserted = await rest_insert("x", {"a": 1})
        assert inserted["id"] == "2"
        patched = await rest_patch("x", {"id": "eq.1"}, {"a": 2})
        assert patched["id"] == "3"

    minimal = MagicMock()
    minimal.status_code = 201
    minimal.content = b""
    minimal.request = MagicMock()
    minimal.text = ""
    mock_client.post = AsyncMock(return_value=minimal)
    with patch("qflow_api.supabase_admin.httpx.AsyncClient", return_value=mock_client):
        inserted = await rest_insert("audit_log", {"action": "x"}, prefer="return=minimal")
        assert inserted == {}

    bad = MagicMock()
    bad.status_code = 500
    bad.text = "fail"
    bad.request = MagicMock()
    mock_client.get = AsyncMock(return_value=bad)
    with patch("qflow_api.supabase_admin.httpx.AsyncClient", return_value=mock_client):
        with pytest.raises(httpx.HTTPStatusError):
            await rest_get("locations")


@pytest.mark.asyncio
async def test_supabase_auth_admin_wrappers(monkeypatch):
    _configure_supabase_for_tests(monkeypatch)
    ok = MagicMock()
    ok.status_code = 200
    ok.json.return_value = {"access_token": "t", "user": {"id": "u"}}
    ok.content = b"{}"
    ok.request = MagicMock()
    ok.text = ""

    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.post = AsyncMock(return_value=ok)
    mock_client.get = AsyncMock(return_value=ok)
    mock_client.delete = AsyncMock(return_value=MagicMock(status_code=204, content=b"", json=lambda: {}, text="", request=MagicMock()))

    with patch("qflow_api.supabase_auth_admin.httpx.AsyncClient", return_value=mock_client):
        assert (await sign_in_with_password("a@b.com", "x"))["access_token"] == "t"
        assert (await generate_link("a@b.com"))["access_token"] == "t"
        assert (await create_user("a@b.com", password="Password1!", name="A"))["access_token"] == "t"
        await delete_user("u1")
        assert (await get_user_by_token("tok"))["access_token"] == "t"


def test_extract_email_otp_supports_top_level_and_properties():
    assert extract_email_otp({"email_otp": "123456"}) == "123456"
    assert extract_email_otp({"properties": {"email_otp": "654321"}}) == "654321"
    assert extract_email_otp({"email_otp": " 999999 "}) == "999999"
    assert extract_email_otp({"properties": {}}) is None
    assert extract_email_otp({}) is None


def test_resend_helpers(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    assert get_resend_api_key() is None
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    assert get_resend_api_key() == "re_test"
    assert "QFlow" in get_resend_from()
    monkeypatch.setenv("NODE_ENV", "production")
    monkeypatch.setenv("RESEND_DEV_REDIRECT_TO", "dev@example.com")
    to, original = resolve_resend_recipient("user@example.com")
    assert to == "dev@example.com"
    assert original == "user@example.com"
    monkeypatch.delenv("RESEND_DEV_REDIRECT_TO", raising=False)
    to2, original2 = resolve_resend_recipient("user@example.com")
    assert to2 == "user@example.com"
    assert original2 is None
    assert "test mode" in format_resend_error("only send testing emails to your own email").lower()


@pytest.mark.asyncio
async def test_send_emails_require_key_and_succeed(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    with pytest.raises(HTTPException) as missing:
        await send_login_code_email("a@b.com", "123456")
    assert missing.value.status_code == 501

    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.delenv("RESEND_DEV_REDIRECT_TO", raising=False)
    ok = MagicMock()
    ok.status_code = 200
    ok.content = b"{}"
    ok.json.return_value = {}
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.post = AsyncMock(return_value=ok)
    with patch("qflow_api.resend_client.httpx.AsyncClient", return_value=mock_client):
        await send_login_code_email("a@b.com", "123456", "staff")
        await send_password_reset_email("a@b.com", "654321")


# --- staff / admin HTTP with dependency overrides ---


def test_staff_queue_endpoint_with_override():
    staff = StaffContext("s1", "s@x.com", "Staff", "staff", "loc-1")

    async def fake_staff():
        return staff

    app.dependency_overrides[require_staff] = fake_staff
    try:
        with patch(
            "qflow_api.routers.staff.get_staff_queue",
            new_callable=AsyncMock,
            return_value={"entries": [], "currentlyServing": None, "summary": {}},
        ):
            res = client.get("/api/staff/queue", headers={"Authorization": "Bearer x"})
        assert res.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_admin_list_with_override(monkeypatch):
    monkeypatch.setenv("ADMIN_OTP_PHONE", "0821234567")
    monkeypatch.setenv("ADMIN_OTP_EMAIL", "admin@example.com")

    async def fake_admin():
        return {"id": "a1", "role": "admin", "name": "A", "email": "a@x.com"}

    from qflow_api.admin_auth import require_admin_dep

    app.dependency_overrides[require_admin_dep] = fake_admin
    try:
        with patch(
            "qflow_api.routers.admin.rest_get",
            new_callable=AsyncMock,
            return_value=[],
        ):
            res = client.get("/api/admin/admins", headers={"Authorization": "Bearer x"})
        assert res.status_code == 200
        assert any(a.get("isBootstrap") for a in res.json().get("admins", []))
    finally:
        app.dependency_overrides.clear()


def test_queue_join_leave_endpoints_with_user_override():
    async def fake_user():
        return {"id": "u1", "email": "u@x.com", "_token": "tok"}

    app.dependency_overrides[get_current_user] = fake_user
    try:
        with patch(
            "qflow_api.routers.queue.join_queue",
            new_callable=AsyncMock,
            return_value={"ok": True, "position": 1},
        ):
            res = client.post(
                "/api/queue/join",
                json={"locationId": "loc-1"},
                headers={"Authorization": "Bearer x"},
            )
        assert res.status_code == 200

        with patch(
            "qflow_api.routers.queue.leave_queue",
            new_callable=AsyncMock,
            return_value={"ok": True},
        ):
            res = client.post(
                "/api/queue/leave",
                json={"entryId": "e1"},
                headers={"Authorization": "Bearer x"},
            )
        assert res.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_rate_within_window_with_override():
    async def fake_user():
        return {"id": "u1", "email": "u@x.com", "_token": "tok"}

    served = (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()
    app.dependency_overrides[get_current_user] = fake_user
    try:
        with (
            patch(
                "qflow_api.routers.user.rest_get_one",
                new_callable=AsyncMock,
                return_value={
                    "id": "e1",
                    "location_id": "loc",
                    "status": "served",
                    "served_at": served,
                },
            ),
            patch("qflow_api.routers.user.rest_insert", new_callable=AsyncMock, return_value={}),
        ):
            res = client.post(
                "/api/rate",
                json={"rating": 5, "queueEntryId": "e1"},
                headers={"Authorization": "Bearer x"},
            )
        assert res.status_code == 200
        assert res.json().get("ok") is True
    finally:
        app.dependency_overrides.clear()


def test_jwt_exp_helper_invalid_token():
    assert jwt_exp_unverified("not-a-jwt") is None
    assert jwt_exp_unverified("a.b") is None


def _override_admin():
    async def fake_admin():
        return {"id": "a1", "role": "admin", "name": "Admin", "email": "admin@x.com"}

    from qflow_api.admin_auth import require_admin_dep

    app.dependency_overrides[require_admin_dep] = fake_admin


def test_admin_staff_list_create_patch(monkeypatch):
    monkeypatch.setenv("ADMIN_OTP_PHONE", "0821234567")
    monkeypatch.setenv("ADMIN_OTP_EMAIL", "bootstrap@example.com")
    _override_admin()
    try:
        with patch(
            "qflow_api.routers.admin.rest_get",
            new_callable=AsyncMock,
            return_value=[
                {
                    "id": "s1",
                    "name": "Staff",
                    "email": "s@x.com",
                    "role": "staff",
                    "location_id": "loc",
                    "created_at": "2026-01-01",
                    "locations": {"name": "Clinic"},
                }
            ],
        ):
            listed = client.get("/api/admin/staff", headers={"Authorization": "Bearer x"})
        assert listed.status_code == 200
        assert listed.json()["staff"][0]["locationName"] == "Clinic"

        async def get_one_for_create(path: str, params: dict):
            if path == "profiles":
                if params.get("select") == "role":
                    return {"role": "staff"}
                return None
            if path == "locations":
                return {"id": "loc", "name": "Clinic"}
            return None

        with (
            patch(
                "qflow_api.routers.admin.create_user",
                new_callable=AsyncMock,
                return_value={"id": "new-staff"},
            ),
            patch(
                "qflow_api.routers.admin.set_user_banned",
                new_callable=AsyncMock,
            ),
            patch(
                "qflow_api.routers.admin.sign_in_with_password",
                new_callable=AsyncMock,
                return_value={"access_token": "t"},
            ),
            patch("qflow_api.routers.admin.rest_upsert", new_callable=AsyncMock, return_value={}),
            patch("qflow_api.routers.admin.rest_insert", new_callable=AsyncMock, return_value={}),
            patch(
                "qflow_api.routers.admin.rest_get_one",
                new_callable=AsyncMock,
                side_effect=get_one_for_create,
            ),
        ):
            created = client.post(
                "/api/admin/staff",
                headers={"Authorization": "Bearer x"},
                json={
                    "name": "New Staff",
                    "email": "new@x.com",
                    "password": "Password1!",
                    "locationId": "loc",
                },
            )
        assert created.status_code == 200
        assert created.json()["staff"]["id"] == "new-staff"

        with (
            patch(
                "qflow_api.routers.admin.rest_get_one",
                new_callable=AsyncMock,
                return_value={"id": "s1", "name": "Staff", "email": "s@x.com", "role": "staff"},
            ),
            patch(
                "qflow_api.routers.admin.purge_user_account",
                new_callable=AsyncMock,
            ),
            patch("qflow_api.routers.admin.rest_insert", new_callable=AsyncMock, return_value={}),
        ):
            removed = client.patch(
                "/api/admin/staff",
                headers={"Authorization": "Bearer x"},
                json={"id": "s1", "deleteStaff": True},
            )
        assert removed.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_admin_create_and_patch_admin(monkeypatch):
    monkeypatch.setenv("ADMIN_OTP_PHONE", "0821234567")
    monkeypatch.setenv("ADMIN_OTP_EMAIL", "bootstrap@example.com")
    _override_admin()
    try:
        with (
            patch("qflow_api.routers.admin.rest_get_one", new_callable=AsyncMock, return_value=None),
            patch(
                "qflow_api.routers.admin.create_user",
                new_callable=AsyncMock,
                return_value={"id": "u-admin"},
            ),
            patch("qflow_api.routers.admin.rest_patch", new_callable=AsyncMock, return_value={}),
            patch(
                "qflow_api.routers.admin.rest_insert",
                new_callable=AsyncMock,
                side_effect=[
                    {
                        "id": "acct-1",
                        "name": "Ada",
                        "cell_number": "0829999000",
                        "email": "ada@x.com",
                        "is_active": True,
                    },
                    {},
                ],
            ),
        ):
            created = client.post(
                "/api/admin/admins",
                headers={"Authorization": "Bearer x"},
                json={
                    "name": "Ada",
                    "cellNumber": "0829999000",
                    "email": "ada@x.com",
                },
            )
        assert created.status_code == 200
        assert created.json()["admin"]["id"] == "acct-1"

        with (
            patch(
                "qflow_api.routers.admin.rest_get_one",
                new_callable=AsyncMock,
                return_value={
                    "id": "acct-1",
                    "name": "Ada",
                    "email": "ada@x.com",
                    "cell_number": "0829999000",
                },
            ),
            patch("qflow_api.routers.admin.rest_patch", new_callable=AsyncMock, return_value={}),
            patch("qflow_api.routers.admin.rest_insert", new_callable=AsyncMock, return_value={}),
        ):
            patched = client.patch(
                "/api/admin/admins",
                headers={"Authorization": "Bearer x"},
                json={"id": "acct-1", "isActive": False},
            )
        assert patched.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_auth_reset_and_admin_otp_routes(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("ADMIN_OTP_PHONE", "0821234567")
    monkeypatch.setenv("ADMIN_OTP_EMAIL", "admin@example.com")
    from qflow_api.rate_limit import _hits

    _hits.clear()

    with (
        patch(
            "qflow_api.routers.auth_routes.generate_link",
            new_callable=AsyncMock,
            return_value={"properties": {"email_otp": "123456"}},
        ),
        patch(
            "qflow_api.routers.auth_routes.send_password_reset_email",
            new_callable=AsyncMock,
        ),
        patch(
            "qflow_api.routers.auth_routes.create_password_reset_token",
            new_callable=AsyncMock,
            return_value="rt-1",
        ),
    ):
        sent = client.post("/api/auth/reset/send", json={"email": "user@example.com"})
    assert sent.status_code == 200
    assert sent.json()["resetToken"] == "rt-1"

    future = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    with (
        patch(
            "qflow_api.routers.auth_routes.get_password_reset_token",
            new_callable=AsyncMock,
            return_value={"id": "rt-1", "email": "user@example.com", "stage": "otp_sent", "expires_at": future},
        ),
        patch(
            "qflow_api.routers.auth_routes.verify_email_otp",
            new_callable=AsyncMock,
            return_value={"access_token": "t"},
        ),
        patch(
            "qflow_api.routers.auth_routes.mark_password_reset_verified",
            new_callable=AsyncMock,
            return_value={"email": "user@example.com", "stage": "verified"},
        ),
    ):
        advanced = client.post(
            "/api/auth/reset/advance",
            json={"resetToken": "rt-1", "otp": "123456"},
        )
    assert advanced.status_code == 200

    with patch(
        "qflow_api.routers.auth_routes.get_password_reset_token",
        new_callable=AsyncMock,
        return_value={"email": "user@example.com", "stage": "verified"},
    ):
        session = client.get("/api/auth/reset/session?rt=rt-1")
    assert session.status_code == 200

    with (
        patch(
            "qflow_api.routers.auth_routes.resolve_admin_by_phone",
            new_callable=AsyncMock,
            return_value=__import__("qflow_api.admin_access", fromlist=["AdminIdentity"]).AdminIdentity(
                phone="0821234567",
                email="admin@example.com",
                name="Admin",
                account_id=None,
                is_bootstrap=True,
            ),
        ),
        patch(
            "qflow_api.routers.auth_routes.rest_get_one",
            new_callable=AsyncMock,
            return_value={"id": "p1", "role": "admin"},
        ),
        patch(
            "qflow_api.routers.auth_routes.generate_link",
            new_callable=AsyncMock,
            return_value={"properties": {"email_otp": "654321"}},
        ),
        patch(
            "qflow_api.routers.auth_routes.send_login_code_email",
            new_callable=AsyncMock,
        ),
    ):
        otp = client.post("/api/admin/otp/send", json={"phone": "0821234567"})
    assert otp.status_code == 200

    with (
        patch(
            "qflow_api.routers.auth_routes.resolve_admin_by_phone",
            new_callable=AsyncMock,
            return_value=__import__("qflow_api.admin_access", fromlist=["AdminIdentity"]).AdminIdentity(
                phone="0821234567",
                email="admin@example.com",
                name="Admin",
                account_id="acct",
                is_bootstrap=False,
            ),
        ),
        patch(
            "qflow_api.routers.auth_routes.verify_email_otp",
            new_callable=AsyncMock,
            return_value={"access_token": "at", "refresh_token": "rt", "expires_in": 3600},
        ),
        patch("qflow_api.routers.auth_routes.rest_patch", new_callable=AsyncMock, return_value={}),
    ):
        verified = client.post(
            "/api/admin/otp/verify",
            json={"phone": "0821234567", "token": "654321"},
        )
    assert verified.status_code == 200
    assert verified.json()["session"]["access_token"] == "at"


def test_user_export_and_staff_walk_in_finish():
    async def fake_user():
        return {"id": "u1", "email": "u@x.com", "_token": "tok"}

    app.dependency_overrides[get_current_user] = fake_user
    try:
        with (
            patch("qflow_api.routers.user.rest_get_one", new_callable=AsyncMock, return_value={"id": "u1"}),
            patch("qflow_api.routers.user.rest_get", new_callable=AsyncMock, return_value=[]),
        ):
            exported = client.get("/api/user/export-data", headers={"Authorization": "Bearer x"})
        assert exported.status_code == 200
        assert "exportedAt" in exported.json()
    finally:
        app.dependency_overrides.clear()

    staff = StaffContext("s1", "s@x.com", "Staff", "staff", "loc-1")

    async def fake_staff():
        return staff

    app.dependency_overrides[require_staff] = fake_staff
    try:
        with patch(
            "qflow_api.routers.staff.add_walk_in",
            new_callable=AsyncMock,
            return_value={"id": "w1", "position": 2},
        ):
            walk = client.post(
                "/api/staff/walk-in",
                headers={"Authorization": "Bearer x"},
                json={"name": "Walk", "priority": "standard"},
            )
        assert walk.status_code == 200

        with patch(
            "qflow_api.routers.staff.claim_entry",
            new_callable=AsyncMock,
            return_value={"id": "e1", "ticketNumber": "#001"},
        ):
            claim = client.post(
                "/api/staff/queue/claim",
                headers={"Authorization": "Bearer x"},
                json={},
            )
        assert claim.status_code == 200

        with patch(
            "qflow_api.routers.staff.finish_entry",
            new_callable=AsyncMock,
            return_value={"ok": True, "userId": "u1"},
        ):
            finish = client.post(
                "/api/staff/queue/finish",
                headers={"Authorization": "Bearer x"},
                json={"status": "served"},
            )
        assert finish.status_code == 200
    finally:
        app.dependency_overrides.clear()


def test_staff_login_happy_path(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    from qflow_api.rate_limit import _hits

    _hits.clear()
    with (
        patch(
            "qflow_api.routers.auth_routes.sign_in_with_password",
            new_callable=AsyncMock,
            return_value={"user": {"id": "s1"}},
        ),
        patch(
            "qflow_api.routers.auth_routes.rest_get_one",
            new_callable=AsyncMock,
            return_value={"id": "s1", "role": "staff"},
        ),
        patch(
            "qflow_api.routers.auth_routes.generate_link",
            new_callable=AsyncMock,
            return_value={"properties": {"email_otp": "111222"}},
        ),
        patch(
            "qflow_api.routers.auth_routes.send_login_code_email",
            new_callable=AsyncMock,
        ),
    ):
        res = client.post(
            "/api/staff/login",
            json={"email": "staff@example.com", "password": "Password1"},
        )
    assert res.status_code == 200
    assert res.json()["ok"] is True
