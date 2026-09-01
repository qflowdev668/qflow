"""Display API must stay public and never return customer PII."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

LOC_ID = "00000000-0000-0000-0000-000000000001"


def test_display_requires_no_auth_header():
    with (
        patch(
            "qflow_api.routers.display.rest_get_one",
            new_callable=AsyncMock,
            return_value={"id": LOC_ID, "name": "Hillbrow Clinic"},
        ),
        patch(
            "qflow_api.routers.display.rest_get",
            new_callable=AsyncMock,
            side_effect=[
                [
                    {
                        "id": "e1",
                        "position": 47,
                        "status": "serving",
                        "serving_started_at": "2026-08-25T10:00:00Z",
                        "served_at": None,
                        # PII present in DB row must not appear in JSON response
                        "customer_name": "Thabo Molefe",
                        "phone": "+27821234567",
                        "user_id": "user-secret",
                        "email": "thabo@example.com",
                    }
                ],
                [],
            ],
        ),
    ):
        response = client.get(f"/api/display/{LOC_ID}")

    assert response.status_code == 200
    body = response.json()
    assert set(body.keys()) <= {
        "locationId",
        "locationName",
        "nowServing",
        "recentlyCalled",
        "updatedAt",
    }
    assert body["nowServing"]["ticket"] == "047"
    assert set(body["nowServing"].keys()) <= {"ticket", "startedAt"}
    dumped = response.text.lower()
    assert "thabo" not in dumped
    assert "molefe" not in dumped
    assert "27821234567" not in dumped
    assert "thabo@example.com" not in dumped
    assert "user-secret" not in dumped
    assert "customer_name" not in dumped
    assert "phone" not in dumped
    assert "email" not in dumped
