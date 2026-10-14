"""Ask QFlow: Llama prompt grounding, rate limit, and PII redaction."""

from fastapi.testclient import TestClient

from main import app
from qflow_api import assistant as assistant_mod
from qflow_api.auth import get_current_user
from qflow_api.rate_limit import ASSISTANT_MAX, reset_rate_limits
from qflow_api.support_email import support_email

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


def test_support_email_defaults_to_useqflow(monkeypatch):
    monkeypatch.delenv("NEXT_PUBLIC_SUPPORT_EMAIL", raising=False)
    assert support_email() == "support@useqflow.app"


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
    assert assistant_mod.LLAMA_TIMEOUT.read == 15
    assert "couldn't reach the assistant" in response.json()["reply"].lower()
    assert support_email() in response.json()["reply"]
    assert "model" not in response.json()
    assert "Traceback" not in response.json()["reply"]


def _install_chip_db(monkeypatch, documents="Green ID book"):
    async def fake_get_one(path, params):
        if path == "profiles":
            assert params.get("select") == "name"
            return {
                "name": "Thabo Mokoena",
                "email": "secret.user@example.com",
                "phone": "+27821234567",
            }
        if path == "locations":
            assert params.get("select") == "name,required_documents"
            return {"name": "Hillbrow Clinic", "required_documents": documents}
        raise AssertionError(path)

    async def fake_get(path, params):
        assert path == "queue_entries"
        if params.get("select") == "id":
            return [
                {"id": "other-1", "name": "Lerato Nkosi"},
                {"id": "other-2", "name": "Sipho Dlamini"},
            ]
        return [
            {
                "position": 4,
                "status": "waiting",
                "priority": "fast-track",
                "location_id": "loc-1",
                "locations": {"name": "Hillbrow Clinic"},
            }
        ]

    async def fake_insert(path, body, prefer="return=representation"):
        assert path == "assistant_messages"
        blob = f"{body.get('message', '')}\n{body.get('reply', '')}"
        assert "secret.user@example.com" not in blob
        assert "+27821234567" not in blob
        assert "Lerato" not in blob
        return {}

    monkeypatch.setattr(assistant_mod, "rest_get_one", fake_get_one)
    monkeypatch.setattr(assistant_mod, "rest_get", fake_get)
    monkeypatch.setattr(assistant_mod, "rest_insert", fake_insert)


def _chip(json):
    reset_rate_limits()
    assistant_mod.reset_chip_cache()
    _FakeWorkers.captured = []
    _override_user()
    try:
        return client.post("/api/assistant/chip", json=json)
    finally:
        _clear_override()


def test_chip_answers_from_documents_and_live_queue(monkeypatch):
    _use_workers(monkeypatch)
    monkeypatch.setattr(assistant_mod.httpx, "AsyncClient", _FakeWorkers)
    _install_chip_db(monkeypatch)
    response = _chip({"chip": "documents", "location_id": "loc-1", "language": "en"})

    assert response.status_code == 200
    assert response.json()["reply"].startswith("You are number 4")
    assert _FakeWorkers.captured
    blob = _prompt_blob(_FakeWorkers.captured[0])
    assert "Green ID book" in blob
    assert "Position: 4" in blob
    assert "People ahead: 2" in blob
    assert "Estimated wait minutes:" in blob
    assert "Ticket status: waiting" in blob
    assert "Thabo" in blob
    assert "Do not give medical advice" in blob
    assert "Call 10177 or 112 now." in blob
    assert "Get directions" not in blob
    assert "Priority type" not in blob
    assert "secret.user@example.com" not in blob
    assert "+27821234567" not in blob
    assert "Lerato" not in blob
    assert "Sipho" not in blob


def test_chip_empty_documents_does_not_guess(monkeypatch):
    _use_workers(monkeypatch)
    monkeypatch.setattr(assistant_mod.httpx, "AsyncClient", _FakeWorkers)
    _install_chip_db(monkeypatch, documents="")
    response = _chip({"chip": "documents", "location_id": "loc-1"})

    assert response.status_code == 200
    assert response.json()["reply"] == assistant_mod.EMPTY_DOCUMENTS_REPLY
    assert _FakeWorkers.captured == []


def test_chip_emergency_phrase_skips_llama(monkeypatch):
    _use_workers(monkeypatch)
    monkeypatch.setattr(assistant_mod.httpx, "AsyncClient", _FakeWorkers)

    async def no_insert(*args, **kwargs):
        return {}

    monkeypatch.setattr(assistant_mod, "rest_insert", no_insert)
    response = _chip({"message": "I have chest pain and need an ambulance"})

    assert response.status_code == 200
    assert response.json()["reply"] == "Call 10177 or 112 now."
    assert _FakeWorkers.captured == []


def test_chip_refuses_off_topic(monkeypatch):
    _use_workers(monkeypatch)
    monkeypatch.setattr(assistant_mod.httpx, "AsyncClient", _FakeWorkers)

    async def no_insert(*args, **kwargs):
        return {}

    monkeypatch.setattr(assistant_mod, "rest_insert", no_insert)
    response = _chip({"message": "What is the weather in Paris?"})

    assert response.status_code == 200
    assert response.json()["reply"] == assistant_mod.OFF_TOPIC_REPLY
    assert _FakeWorkers.captured == []


def test_chip_rate_limit(monkeypatch):
    _use_workers(monkeypatch)
    monkeypatch.setattr(assistant_mod.httpx, "AsyncClient", _FakeWorkers)
    _install_chip_db(monkeypatch, documents="")
    reset_rate_limits()
    assistant_mod.reset_chip_cache()
    _override_user()
    try:
        last = None
        for _ in range(ASSISTANT_MAX + 1):
            last = client.post(
                "/api/assistant/chip",
                json={"chip": "documents", "location_id": "loc-1"},
            )
    finally:
        _clear_override()
        reset_rate_limits()

    assert last is not None
    assert last.status_code == 429
    assert last.json()["error"] == (
        "You've asked a lot of questions this hour. Please wait a bit and try again."
    )
    assert "Traceback" not in last.text
    ai_calls = [item for item in _FakeWorkers.captured if "api.cloudflare.com" in item["url"]]
    assert ai_calls == []


def test_chip_non_english_does_not_call_llama(monkeypatch):
    _use_workers(monkeypatch)
    monkeypatch.setattr(assistant_mod.httpx, "AsyncClient", _FakeWorkers)
    response = _chip({"chip": "wait", "language": "zu"})

    assert response.status_code == 200
    assert response.json()["reply"] == "AI answers are English-only for now"
    assert _FakeWorkers.captured == []


def test_chip_workers_failure_is_friendly(monkeypatch):
    _install_chip_db(monkeypatch)

    async def boom(*args, **kwargs):
        raise RuntimeError("Traceback (most recent call last): TypeError: boom")

    monkeypatch.setattr(assistant_mod, "call_llama", boom)
    response = _chip({"chip": "wait", "location_id": "loc-1"})

    assert response.status_code == 200
    assert "couldn't reach the assistant" in response.json()["reply"].lower()
    assert "Traceback" not in response.text
    assert "TypeError" not in response.text


def test_chip_caches_identical_answers(monkeypatch):
    _use_workers(monkeypatch)
    monkeypatch.setattr(assistant_mod.httpx, "AsyncClient", _FakeWorkers)
    _install_chip_db(monkeypatch)
    reset_rate_limits()
    assistant_mod.reset_chip_cache()
    _override_user()
    try:
        first = client.post("/api/assistant/chip", json={"chip": "wait", "location_id": "loc-1"})
        second = client.post("/api/assistant/chip", json={"chip": "wait", "location_id": "loc-1"})
    finally:
        _clear_override()
        reset_rate_limits()
        assistant_mod.reset_chip_cache()

    assert first.status_code == 200
    assert second.json()["reply"] == first.json()["reply"]
    assert len(_FakeWorkers.captured) == 1
