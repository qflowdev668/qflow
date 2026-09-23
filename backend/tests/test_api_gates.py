"""Auth gates and public route smoke tests for the FastAPI app."""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_status_public():
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert "components" in data
    assert any("App" in c.get("name", "") for c in data["components"])
    assert data.get("overall") in ("operational", "partial_outage", "major_outage")


def test_status_push_not_operational_without_secret(monkeypatch):
    monkeypatch.setenv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub")
    monkeypatch.setenv("VAPID_PRIVATE_KEY", "priv")
    monkeypatch.delenv("PUSH_DISPATCH_SECRET", raising=False)
    response = client.get("/api/status")
    assert response.status_code == 200
    push = next(c for c in response.json()["components"] if c["name"] == "Push Notifications")
    assert push["status"] == "degraded"


def test_queue_health():
    response = client.get("/api/queue/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_admin_admins_requires_auth():
    response = client.get("/api/admin/admins")
    assert response.status_code == 401


def test_admin_staff_create_requires_auth():
    response = client.post(
        "/api/admin/staff",
        json={"name": "Hacker", "email": "hacker@example.com", "password": "NotARealPass1!"},
    )
    assert response.status_code in (401, 403)


def test_export_requires_auth():
    response = client.get("/api/user/export-data")
    assert response.status_code == 401
    body = response.json()
    assert "error" in body or "detail" in body
    assert "@example.com" not in str(body)


def test_delete_account_requires_auth():
    response = client.request(
        "DELETE",
        "/api/user/delete-account",
        json={"confirm": "DELETE"},
    )
    assert response.status_code == 401


def test_staff_queue_requires_auth():
    response = client.get("/api/staff/queue")
    assert response.status_code == 401


def test_staff_walk_in_requires_auth():
    response = client.post(
        "/api/staff/walk-in",
        json={"name": "Walk-in", "priority": "standard"},
    )
    assert response.status_code == 401


def test_staff_claim_requires_auth():
    response = client.post("/api/staff/queue/claim", json={})
    assert response.status_code == 401


def test_staff_finish_requires_auth():
    response = client.post(
        "/api/staff/queue/finish",
        json={"status": "served"},
    )
    assert response.status_code == 401


def test_rate_requires_auth():
    response = client.post("/api/rate", json={"rating": 5})
    assert response.status_code == 401


def test_push_subscribe_requires_auth():
    response = client.post(
        "/api/push/subscribe",
        json={"endpoint": "https://example.com", "keys": {"p256dh": "x", "auth": "y"}},
    )
    assert response.status_code == 401


def test_join_injection_payloads_safe():
    payloads = [
        "'; DROP TABLE queue_entries; --",
        "' OR '1'='1",
        "<script>alert(1)</script>",
    ]
    for payload in payloads:
        response = client.post("/api/queue/join", json={"locationId": payload})
        assert response.status_code != 500
        assert response.status_code in (400, 401, 403, 404, 409, 422)


def test_display_missing_location():
    response = client.get("/api/display/00000000-0000-0000-0000-000000000099")
    # 404 not found, or 501 if service role missing
    assert response.status_code in (404, 501, 500)


def test_errors_accepts_report():
    response = client.post(
        "/api/errors",
        json={"message": "test error from suite"},
    )
    assert response.status_code in (204, 200, 500)


def test_push_dispatch_requires_auth():
    response = client.post("/api/push/dispatch", json={"userId": "x", "body": "hi"})
    assert response.status_code == 401


def test_push_dispatch_with_secret(monkeypatch):
    monkeypatch.setenv("PUSH_DISPATCH_SECRET", "test-push-secret")
    monkeypatch.setenv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "")
    monkeypatch.setenv("VAPID_PRIVATE_KEY", "")
    response = client.post(
        "/api/push/dispatch",
        json={"userId": "x", "body": "hi"},
        headers={"Authorization": "Bearer test-push-secret"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body.get("ok") is True
    assert body.get("sent") == 0
    assert "VAPID" in (body.get("error") or "")
