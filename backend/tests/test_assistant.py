"""Ask QFlow: Llama prompt grounding, rate limit, and PII redaction."""

from fastapi.testclient import TestClient

from main import app
from qflow_api import assistant as assistant_mod
from qflow_api.auth import get_current_user
from qflow_api.rate_limit import ASSISTANT_MAX, reset_rate_limits

client = TestClient(app)

USER = {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "secret.user@example.com",
    "phone": "+27821234567",
    "user_metadata": {"name": "Not From Metadata"},
}


def _override_user():
    app.dependency_overrides[get_current_user] = lambda: USER


def _clear_override():
    app.dependency_overrides.pop(get_current_user, None)


LLAMA = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"


class _FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {
            "result": {"response": "You are number 4 at Netcare Clinic Rosebank."},
            "success": True,
            "errors": [],
            "messages": [],
        }

    def json(self):
        return self._payload


class _FakeWorkers:
    captured: list[dict] = []

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def post(self, url, headers=None, json=None):
        _FakeWorkers.captured.append({"url": url, "json": json, "auth": (headers or {}).get("Authorization")})
        return _FakeResponse()


def _install_db(monkeypatch):
    async def fake_get_one(path, params):
        assert path == "profiles"
        assert params.get("select") == "name"
        return {"name": "Thabo Mokoena", "email": "secret.user@example.com", "phone": "+27821234567"}

    async def fake_get(path, params):
        assert path == "queue_entries"
        if str(params.get("position", "")).startswith("lt."):
            return [{"id": "a"}, {"id": "b"}, {"id": "c"}]
        return [
            {
                "position": 4,
                "status": "waiting",
                "priority": "fast-track",
                "location_id": "loc-1",
                "locations": {"name": "Netcare Clinic Rosebank"},
            }
        ]

    async def fake_insert(path, body, prefer="return=representation"):
        assert path == "assistant_messages"
        assert "secret.user@example.com" not in body["message"]
        assert "+27821234567" not in body["message"]
        return {}

    monkeypatch.setattr(assistant_mod, "rest_get_one", fake_get_one)
    monkeypatch.setattr(assistant_mod, "rest_get", fake_get)
    monkeypatch.setattr(assistant_mod, "rest_insert", fake_insert)


def _prompt_blob(payload: dict) -> str:
    messages = payload["json"]["messages"]
    return "\n".join(m["content"] for m in messages)


def test_chat_requires_auth():
    response = client.post("/api/assistant/chat", json={"message": "How long is my wait?"})
    assert response.status_code == 401


def _use_workers(monkeypatch):
    monkeypatch.setenv("CLOUDFLARE_ACCOUNT_ID", "account-id")
    monkeypatch.setenv("CLOUDFLARE_API_TOKEN", "test-token-not-real")
    monkeypatch.setenv("LLAMA_MODEL", LLAMA)


def test_model_endpoint_reports_configured_id(monkeypatch):
    monkeypatch.setenv("LLAMA_MODEL", LLAMA)
    response = client.get("/api/assistant/model")
    assert response.status_code == 200
    assert response.json()["model"] == LLAMA


def test_prompt_includes_live_queue_and_strips_pii(monkeypatch):
    reset_rate_limits()
    _FakeWorkers.captured = []
    _use_workers(monkeypatch)
    monkeypatch.setattr(assistant_mod.httpx, "AsyncClient", _FakeWorkers)
    _install_db(monkeypatch)
    _override_user()
    try:
        response = client.post(
            "/api/assistant/chat",
            json={
                "message": "Email me at secret.user@example.com or call +27821234567. How long is my wait?",
                "place_name": "ABSA Bank Sandton",
            },
        )
    finally:
        _clear_override()

    assert response.status_code == 200
    body = response.json()
    assert body["reply"].startswith("You are number 4")
    assert body["model"] == LLAMA
    assert _FakeWorkers.captured, "Workers AI was not called"
    blob = _prompt_blob(_FakeWorkers.captured[0])
    assert "Netcare Clinic Rosebank" in blob
    assert "Position: 4" in blob
    assert "People ahead: 3" in blob
    assert "Estimated wait minutes:" in blob
    assert "ACTIVE LINE: yes" in blob
    assert "cannot see an active line" not in blob
    assert "Status: waiting" in blob
    assert "Priority type: Fast Track" in blob
    assert "Thabo" in blob
    assert "Fast Track" in blob
    assert "Get directions" in blob
    assert "The place open on their screen is ABSA Bank Sandton" in blob
    assert "secret.user@example.com" not in blob
    assert "+27821234567" not in blob
    assert "Not From Metadata" not in blob
    sent = _FakeWorkers.captured[0]["json"]
    assert sent["max_tokens"] == 300
    assert sent["messages"][0]["role"] == "system"
    assert sent["messages"][-1]["role"] == "user"
    assert "api.cloudflare.com" in _FakeWorkers.captured[0]["url"]
    assert LLAMA in _FakeWorkers.captured[0]["url"]
    assert _FakeWorkers.captured[0]["auth"] == "Bearer test-token-not-real"


def test_rate_limit_after_threshold(monkeypatch):
    reset_rate_limits()
    _FakeWorkers.captured = []
    _use_workers(monkeypatch)
    monkeypatch.setattr(assistant_mod.httpx, "AsyncClient", _FakeWorkers)

    async def no_facts(user):
        return "there", None

    async def no_insert(*args, **kwargs):
        return {}

    monkeypatch.setattr(assistant_mod, "gather_facts", no_facts)
    monkeypatch.setattr(assistant_mod, "rest_insert", no_insert)
    _override_user()
    try:
        last = None
        for _ in range(ASSISTANT_MAX):
            last = client.post("/api/assistant/chat", json={"message": "What is Fast Track?"})
            assert last.status_code == 200
        blocked = client.post("/api/assistant/chat", json={"message": "One more question"})
    finally:
        _clear_override()
        reset_rate_limits()

    assert blocked.status_code == 429
    assert "wait" in blocked.json()["error"].lower()
    ai_calls = [item for item in _FakeWorkers.captured if "api.cloudflare.com" in item["url"]]
    assert len(ai_calls) == ASSISTANT_MAX
    assert all(
        item["json"]["messages"][-1]["content"] != "One more question" for item in ai_calls
    )


def test_workers_timeout_returns_fallback(monkeypatch):
    reset_rate_limits()
    _use_workers(monkeypatch)

    class _TimeoutClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def post(self, *args, **kwargs):
            raise assistant_mod.httpx.TimeoutException("timed out")

    async def no_facts(user):
        return "there", None

    async def no_insert(*args, **kwargs):
        return {}

    monkeypatch.setattr(assistant_mod.httpx, "AsyncClient", _TimeoutClient)
    monkeypatch.setattr(assistant_mod, "gather_facts", no_facts)
    monkeypatch.setattr(assistant_mod, "rest_insert", no_insert)
    _override_user()
    try:
        response = client.post("/api/assistant/chat", json={"message": "Hello"})
    finally:
        _clear_override()
        reset_rate_limits()

    assert response.status_code == 200
    assert "couldn't reach the assistant" in response.json()["reply"].lower()
    assert "model" not in response.json()
    assert "Traceback" not in response.json()["reply"]
