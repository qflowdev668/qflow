"""X-Session-Expires-In response header from JWT exp."""

import base64
import json
import time

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _b64url(data: dict) -> str:
    raw = json.dumps(data, separators=(",", ":")).encode()
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def test_session_expires_in_header_on_bearer_request():
    exp = int(time.time()) + 600
    token = f"{_b64url({'alg': 'HS256'})}.{_b64url({'exp': exp, 'sub': 'u'})}.sig"
    # Public route still receives the middleware header when Bearer is sent
    response = client.get("/api/queue/health", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    header = response.headers.get("X-Session-Expires-In")
    assert header is not None
    remaining = int(header)
    assert 590 <= remaining <= 600


def test_no_session_header_without_bearer():
    response = client.get("/api/queue/health")
    assert response.status_code == 200
    assert response.headers.get("X-Session-Expires-In") is None
