"""POPIA export and delete include Ask QFlow logs."""

from pathlib import Path

from fastapi.testclient import TestClient

from main import app
from qflow_api import user_cleanup
from qflow_api.auth import get_current_user
from qflow_api.routers import user as user_router

client = TestClient(app)

USER = {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "person@example.com",
}


def _override_user():
    app.dependency_overrides[get_current_user] = lambda: USER


def _clear_override():
    app.dependency_overrides.pop(get_current_user, None)


def test_export_includes_assistant_messages(monkeypatch):
    seen: list[str] = []

    async def fake_get(table, params):
        seen.append(table)
        if table == "assistant_messages":
            assert params["user_id"] == f"eq.{USER['id']}"
            return [
                {
                    "id": "m1",
                    "message": "How long is my wait?",
                    "reply": "You are next.",
                    "created_at": "2026-10-13T00:00:00Z",
                }
            ]
        return []

    async def fake_one(table, params):
        return {"id": USER["id"], "name": "Ada"}

    monkeypatch.setattr(user_router, "rest_get", fake_get)
    monkeypatch.setattr(user_router, "rest_get_one", fake_one)
    _override_user()
    try:
        response = client.get("/api/user/export-data")
    finally:
        _clear_override()

    assert response.status_code == 200
    body = response.json()
    assert "assistant_messages" in seen
    assert body["assistantMessages"] == [
        {
            "id": "m1",
            "message": "How long is my wait?",
            "reply": "You are next.",
            "created_at": "2026-10-13T00:00:00Z",
        }
    ]


async def test_delete_account_removes_assistant_messages(monkeypatch):
    deleted: list[str] = []

    class _Client:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def delete(self, url, params=None, headers=None):
            deleted.append(url)

    async def noop(*args, **kwargs):
        return None

    monkeypatch.setattr(user_cleanup.httpx, "AsyncClient", _Client)
    monkeypatch.setattr(user_cleanup, "rest_patch", noop)
    monkeypatch.setattr(user_cleanup, "delete_user", noop)
    monkeypatch.setattr(user_cleanup, "service_headers", lambda extra=None: {"apikey": "test"})

    await user_cleanup.purge_user_account(USER["id"], email=USER["email"], anonymize_queue=True)

    assert any(url.endswith("/assistant_messages") for url in deleted)


def test_assistant_messages_cascade_when_profile_is_deleted():
    sql = (
        Path(__file__).resolve().parents[2]
        / "supabase"
        / "migrations"
        / "20261013153000_assistant_messages.sql"
    ).read_text(encoding="utf-8")
    assert "references public.profiles(id) on delete cascade" in sql
