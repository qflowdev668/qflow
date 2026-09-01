"""Session expiry, role gates, and rating-window API tests."""

from __future__ import annotations

import base64
import json
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app
from qflow_api.auth import SESSION_EXPIRED_CODE, jwt_exp_unverified

client = TestClient(app)


def _b64url(data: dict[str, Any]) -> str:
    raw = json.dumps(data, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def make_jwt(*, exp: int, sub: str = "user-test-1") -> str:
    header = _b64url({"alg": "HS256", "typ": "JWT"})
    payload = _b64url({"sub": sub, "exp": exp, "role": "authenticated"})
    return f"{header}.{payload}.fakesig"


def test_jwt_exp_unverified_reads_exp():
    exp = int(time.time()) + 60
    token = make_jwt(exp=exp)
    assert jwt_exp_unverified(token) == exp


def test_expired_jwt_rejected_with_session_expired_code():
    expired = make_jwt(exp=int(time.time()) - 120)
    response = client.get(
        "/api/user/export-data",
        headers={"Authorization": f"Bearer {expired}"},
    )
    assert response.status_code == 401
    body = response.json()
    assert body.get("code") == SESSION_EXPIRED_CODE
    assert "session" in (body.get("error") or "").lower()


def test_expired_jwt_rejected_on_admin_route():
    expired = make_jwt(exp=int(time.time()) - 60)
    response = client.get(
        "/api/admin/admins",
        headers={"Authorization": f"Bearer {expired}"},
    )
    assert response.status_code == 401
    assert response.json().get("code") == SESSION_EXPIRED_CODE


def test_expired_jwt_rejected_on_staff_route():
    expired = make_jwt(exp=int(time.time()) - 60)
    response = client.get(
        "/api/staff/queue",
        headers={"Authorization": f"Bearer {expired}"},
    )
    assert response.status_code == 401
    assert response.json().get("code") == SESSION_EXPIRED_CODE


def test_user_role_cannot_access_admin_routes():
    user = {"id": "user-1", "email": "user@example.com", "_token": "tok"}

    from qflow_api.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with patch(
            "qflow_api.admin_auth.rest_get_one",
            new_callable=AsyncMock,
            return_value={
                "id": "user-1",
                "name": "U",
                "email": "user@example.com",
                "role": "user",
            },
        ):
            response = client.get(
                "/api/admin/admins",
                headers={"Authorization": "Bearer valid-looking"},
            )
        assert response.status_code == 403
        assert "admin" in (response.json().get("error") or "").lower()
    finally:
        app.dependency_overrides.clear()


def test_user_role_cannot_access_staff_routes():
    user = {"id": "user-1", "email": "user@example.com", "_token": "tok"}

    with patch(
        "qflow_api.staff_auth.rest_get_one",
        new_callable=AsyncMock,
        return_value={"role": "user", "location_id": "loc-1", "name": "U"},
    ):
        from qflow_api.auth import get_current_user

        app.dependency_overrides[get_current_user] = lambda: user
        try:
            response = client.get(
                "/api/staff/queue",
                headers={"Authorization": "Bearer valid-looking"},
            )
            assert response.status_code == 403
            assert "staff" in (response.json().get("error") or "").lower()
        finally:
            app.dependency_overrides.clear()


def test_rate_blocked_outside_two_hour_window():
    user = {"id": "user-1", "email": "user@example.com", "_token": "tok"}
    old_served = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
    entry = {
        "id": "entry-1",
        "location_id": "loc-1",
        "status": "served",
        "served_at": old_served,
    }

    from qflow_api.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with patch(
            "qflow_api.routers.user.rest_get_one",
            new_callable=AsyncMock,
            return_value=entry,
        ):
            response = client.post(
                "/api/rate",
                headers={"Authorization": "Bearer valid-looking"},
                json={"rating": 5, "queueEntryId": "entry-1"},
            )
        assert response.status_code == 403
        err = (response.json().get("error") or "").lower()
        assert "window" in err or "2 hour" in err or "rate" in err
    finally:
        app.dependency_overrides.clear()


def test_rate_blocked_outside_window_without_entry_id():
    user = {"id": "user-1", "email": "user@example.com", "_token": "tok"}
    old_served = (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()
    rows = [
        {
            "id": "entry-2",
            "location_id": "loc-1",
            "served_at": old_served,
        }
    ]

    from qflow_api.auth import get_current_user

    app.dependency_overrides[get_current_user] = lambda: user
    try:
        with patch(
            "qflow_api.routers.user.rest_get",
            new_callable=AsyncMock,
            return_value=rows,
        ):
            response = client.post(
                "/api/rate",
                headers={"Authorization": "Bearer valid-looking"},
                json={"rating": 4},
            )
        assert response.status_code == 403
        err = (response.json().get("error") or "").lower()
        assert "window" in err or "2 hour" in err or "rate" in err
    finally:
        app.dependency_overrides.clear()
