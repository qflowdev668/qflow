import pytest
from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_ok():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] is True
    assert data["service"] == "qflow-api"
    assert "supabaseConfigured" in data


def test_join_requires_auth():
    response = client.post(
        "/queue/join",
        json={"locationId": "00000000-0000-0000-0000-000000000001"},
    )
    assert response.status_code == 401


def test_leave_requires_auth():
    response = client.post(
        "/queue/leave",
        json={"entryId": "00000000-0000-0000-0000-000000000001"},
    )
    assert response.status_code == 401


def test_exported_location_paths_rewrite_to_placeholder():
    from main import _exported_page_redirect

    loc = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    assert _exported_page_redirect(f"location/{loc}") == f"/location/_/?id={loc}"
    assert _exported_page_redirect(f"location/{loc}/join") == f"/location/_/join/?id={loc}"
    assert _exported_page_redirect("location/_") is None
    assert _exported_page_redirect(f"location/{loc}/index.txt") == "/location/_/index.txt"


def test_location_uuid_http_redirects_to_placeholder():
    loc = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    response = client.get(f"/location/{loc}", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == f"/location/_/?id={loc}"


def test_join_rejects_empty_location():
    response = client.post(
        "/queue/join",
        json={"locationId": ""},
        headers={"Authorization": "Bearer fake-token"},
    )
    assert response.status_code in (401, 422)
