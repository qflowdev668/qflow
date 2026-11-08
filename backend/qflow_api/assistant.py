"""Ask QFlow — Cloudflare Workers AI (Llama), grounded in the caller's live queue."""

from __future__ import annotations

import logging
import os
import re
import time
from typing import Any
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from qflow_api.auth import get_current_user
from qflow_api.queue_service import ACTIVE_STATUSES, estimate_wait
from qflow_api.rate_limit import enforce_assistant_rate_limit
from qflow_api.support_email import support_email
from qflow_api.supabase_admin import rest_get, rest_get_one, rest_insert

logger = logging.getLogger("qflow.assistant")

router = APIRouter(tags=["assistant"])

DEFAULT_LLAMA_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
# Cold Workers AI calls can exceed 10s. 15s still fails closed with the fallback.
LLAMA_TIMEOUT = httpx.Timeout(connect=10.0, read=15.0, write=10.0, pool=10.0)
MAX_MESSAGE_CHARS = 800
MAX_HISTORY_TURNS = 8

def fallback_reply() -> str:
    return (
        "I couldn't reach the assistant just now. Please try again in a moment, "
        f"or open Help and support. You can also email {support_email()}."
    )

FEATURE_SUMMARY = """
QFlow is a phone app for waiting in line at a clinic, bank, government office, or service counter.
- Joining a queue: on Home or the Map, pick a place and tap Join the line. A person can be in only one line at a time.
- Fast Track: a shorter line for people who qualify, such as pregnancy, disability, or learners. Staff check proof at the counter. If they cannot verify it, the person returns to the standard line.
- Emergency: emergency workers with ID are served first.
- The map: shows places and how busy each one is.
- Directions: Get directions draws a walking or driving route on the QFlow map to that exact place.
- Accessibility settings: text size, high contrast, and a simpler layout. They live under Profile, then Accessibility.
- Notification settings: alerts when the line moves or it is the person's turn. They live under Profile, then Notifications.
""".strip()

_EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
# Phone numbers (international or local). Does not match a short queue position like "4".
_PHONE = re.compile(
    r"(?:\+\d{1,3}[\s.\-]?)?(?:\(?\d{2,4}\)?[\s.\-]?)?\d{3}[\s.\-]?\d{3,4}(?:[\s.\-]?\d{3,4})?"
)


class HistoryTurn(BaseModel):
    role: str = ""
    content: str = ""


class ChatBody(BaseModel):
    message: str = ""
    conversation_id: str | None = Field(default=None, max_length=80)
    history: list[HistoryTurn] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS)
    place_name: str | None = Field(default=None, max_length=80)


class QueueFacts:
    def __init__(
        self,
        *,
        location_name: str,
        position: int | None,
        people_ahead: int | None,
        status: str,
        priority: str,
        location_id: str = "",
    ) -> None:
        self.location_name = location_name
        self.position = position
        self.people_ahead = people_ahead
        self.status = status
        self.priority = priority
        self.location_id = location_id


def redact_pii(text: str) -> str:
    """Remove email addresses and phone numbers. Keep short numbers such as a queue position."""
    without_email = _EMAIL.sub("[removed]", text or "")
    return _PHONE.sub("[removed]", without_email)


def first_name(raw: str | None) -> str:
    token = (raw or "").strip().split()
    if not token:
        return "there"
    name = token[0].strip(".,")
    if not name or "@" in name or _EMAIL.search(name) or _PHONE.search(name):
        return "there"
    return name[:40]


def _priority_label(priority: str | None) -> str:
    if priority == "emergency":
        return "Emergency"
    if priority == "fast-track":
        return "Fast Track"
    if priority == "standard":
        return "Standard"
    return "not listed"


def _status_label(status: str | None) -> str:
    labels = {
        "waiting": "waiting",
        "almost": "almost their turn",
        "your-turn": "it is their turn",
        "serving": "being served",
    }
    return labels.get(status or "", "not listed")


def _location_name(row: dict[str, Any]) -> str:
    embedded = row.get("locations")
    name = ""
    if isinstance(embedded, dict):
        name = str(embedded.get("name") or "")
    elif isinstance(embedded, list) and embedded and isinstance(embedded[0], dict):
        name = str(embedded[0].get("name") or "")
    name = name.strip() or "their place"
    if _EMAIL.search(name):
        return "their place"
    return name[:80]


def build_system_prompt(
    name: str,
    queue: QueueFacts | None,
    place_name: str | None = None,
) -> str:
    if queue is None:
        line = "ACTIVE LINE: none. They are not in a line right now."
        line_rule = (
            "- ACTIVE LINE is none. If they ask about their wait, say you cannot see an active line "
            "and tell them to open My line. Do not guess a position or a wait time."
        )
    else:
        position = "not listed" if queue.position is None else str(queue.position)
        ahead = "not listed" if queue.people_ahead is None else str(queue.people_ahead)
        wait = "not listed" if queue.people_ahead is None else str(estimate_wait(queue.people_ahead))
        line = (
            "ACTIVE LINE: yes. "
            f"Location: {queue.location_name}. "
            f"Position: {position}. "
            f"People ahead: {ahead}. "
            f"Estimated wait minutes: {wait}. "
            f"Status: {_status_label(queue.status)}. "
            f"Priority type: {_priority_label(queue.priority)}."
        )
        line_rule = (
            "- ACTIVE LINE is yes. Those facts are this person's real line. "
            "When they ask how long, answer with the position, people ahead, and estimated wait minutes written above. "
            "Do not say you cannot see a line. Do not send them to My line to find a line they are already in."
        )
    place = redact_pii((place_name or "").strip())[:80]
    screen = ""
    if place:
        screen = (
            f"The place open on their screen is {place}. "
            "When they ask how to join or get directions, use that place. "
            "Do not invent a wait time or a position for it unless it is the active line above.\n"
        )
    return (
        "You are Ask QFlow, the helper inside the QFlow app. "
        "Only talk about QFlow. Do not give generic queue advice that is not in the facts below.\n\n"
        f"{FEATURE_SUMMARY}\n\n"
        f"The person's first name is {name}.\n"
        f"Their line right now: {line}\n"
        f"{screen}\n"
        "Rules:\n"
        "- Answer in plain, simple English at a grade 6 to 8 reading level.\n"
        "- Use 2 to 4 sentences. No bullet lists.\n"
        "- Never invent numbers, wait times, places, or a status that is not written above.\n"
        f"{line_rule}\n"
        "- If the question is not about QFlow, say you can only help with QFlow, "
        "and point them to the Help page questions or Contact Support."
    )


async def gather_facts(user: dict[str, Any]) -> tuple[str, QueueFacts | None]:
    """First name plus the caller's active queue row. Never returns email or phone."""
    user_id = str(user.get("id") or "")
    profile_name = ""
    try:
        profile = await rest_get_one(
            "profiles",
            {"id": f"eq.{user_id}", "select": "name"},
        )
        if profile:
            profile_name = str(profile.get("name") or "")
    except Exception:
        logger.exception("Ask QFlow could not load the profile name")

    if not profile_name:
        meta = user.get("user_metadata") if isinstance(user.get("user_metadata"), dict) else {}
        profile_name = str((meta or {}).get("full_name") or (meta or {}).get("name") or "")

    queue: QueueFacts | None = None
    try:
        rows = await rest_get(
            "queue_entries",
            {
                "user_id": f"eq.{user_id}",
                "status": f"in.({ACTIVE_STATUSES})",
                "select": "position,status,priority,location_id,locations(name)",
                "order": "joined_at.desc",
                "limit": "1",
            },
        )
        if rows:
            row = rows[0]
            position_raw = row.get("position")
            position = int(position_raw) if isinstance(position_raw, int) else None
            people_ahead: int | None = None
            location_id = row.get("location_id")
            if position is not None and location_id:
                ahead_rows = await rest_get(
                    "queue_entries",
                    {
                        "location_id": f"eq.{location_id}",
                        "status": f"in.({ACTIVE_STATUSES})",
                        "position": f"lt.{position}",
                        "select": "id",
                    },
                )
                people_ahead = len(ahead_rows)
            queue = QueueFacts(
                location_name=_location_name(row),
                position=position,
                people_ahead=people_ahead,
                status=str(row.get("status") or ""),
                priority=str(row.get("priority") or ""),
                location_id=str(location_id or ""),
            )
    except Exception:
        logger.exception("Ask QFlow could not load the active queue")

    return first_name(profile_name), queue


def llama_model() -> str:
    configured = os.environ.get("LLAMA_MODEL", "").strip()
    return configured or DEFAULT_LLAMA_MODEL


def build_llama_messages(
    system: str,
    history: list[HistoryTurn],
    user_message: str,
) -> list[dict[str, str]]:
    """System prompt, prior turns, then the new question. History is redacted again."""
    messages: list[dict[str, str]] = [{"role": "system", "content": system}]
    for turn in history[-MAX_HISTORY_TURNS:]:
        role = turn.role if turn.role in ("user", "assistant") else ""
        content = redact_pii((turn.content or "").strip())[:MAX_MESSAGE_CHARS]
        if role and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_message})
    return messages


def extract_llama_reply(data: Any) -> str:
    """Workers AI chat models return text at result.response.

    Documented envelope:
    {"result": {"response": "..."}, "success": true, "errors": [], "messages": []}
    """
    if not isinstance(data, dict):
        raise RuntimeError("Cloudflare returned a non-object")
    if data.get("success") is False:
        errors = data.get("errors")
        detail = ""
        if isinstance(errors, list) and errors and isinstance(errors[0], dict):
            detail = str(errors[0].get("message") or "")
        raise RuntimeError(detail or "Cloudflare Workers AI rejected the request")

    result = data.get("result")
    text = ""
    if isinstance(result, dict):
        response = result.get("response")
        if isinstance(response, str):
            text = response.strip()
    elif isinstance(result, str):
        text = result.strip()
    if not text:
        raise RuntimeError("Cloudflare returned an empty reply")
    return text[:2000]


async def call_llama(system: str, history: list[HistoryTurn], user_message: str) -> str:
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "").strip()
    if not account_id or not token:
        raise RuntimeError("Cloudflare Workers AI is not configured")

    model = llama_model()
    url = (
        "https://api.cloudflare.com/client/v4/accounts/"
        f"{quote(account_id, safe='')}/ai/run/{model}"
    )
    payload = {
        "messages": build_llama_messages(system, history, user_message),
        "max_tokens": 300,
    }
    async with httpx.AsyncClient(timeout=LLAMA_TIMEOUT) as client:
        response = await client.post(
            url,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
    if response.status_code != 200:
        logger.error(
            "Workers AI chat failed status=%s model=%s",
            response.status_code,
            model,
        )
        raise RuntimeError(f"Cloudflare status {response.status_code}")

    return extract_llama_reply(response.json())


async def _log_exchange(user_id: str, message: str, reply: str) -> None:
    try:
        await rest_insert(
            "assistant_messages",
            {
                "user_id": user_id,
                "message": message[:MAX_MESSAGE_CHARS],
                "reply": reply[:2000],
            },
            prefer="return=minimal",
        )
    except Exception:
        logger.exception("Could not store assistant_messages row")


@router.get("/api/assistant/model")
async def assistant_model() -> dict[str, str]:
    """Public model id so the Help badge matches the model that answers."""
    return {"model": llama_model()}


@router.post("/api/assistant/chat")
async def chat(
    body: ChatBody,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    message = (body.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Type a question first.")
    if len(message) > MAX_MESSAGE_CHARS:
        raise HTTPException(
            status_code=400,
            detail="That question is too long. Please shorten it.",
        )

    await enforce_assistant_rate_limit(str(user.get("id") or ""))
    safe_message = redact_pii(message)

    answered = False
    try:
        name, queue = await gather_facts(user)
        system = build_system_prompt(name, queue, body.place_name)
        reply = await call_llama(system, body.history, safe_message)
        answered = True
    except Exception:
        logger.exception("Ask QFlow failed while calling Cloudflare Workers AI")
        reply = fallback_reply()

    await _log_exchange(str(user.get("id") or ""), safe_message, reply)
    payload = {"reply": reply}
    if answered:
        payload["model"] = llama_model()
    return payload


CHIP_QUESTIONS = {
    "documents": "What documents do I need?",
    "wait": "How long is the wait?",
    "arrive": "Where do I go when I arrive?",
}
EMPTY_DOCUMENTS_REPLY = (
    "This location hasn't published a list yet. Please ask staff when you arrive."
)
EMERGENCY_REPLY = "Call 10177 or 112 now."
OFF_TOPIC_REPLY = (
    "I can only help with this queue and the documents this location has published."
)
ENGLISH_ONLY_REPLY = "AI answers are English-only for now"
CHIP_CACHE_SECONDS = 120
_LOCATION_ID = re.compile(r"^[0-9a-zA-Z-]{1,80}$")
_EMERGENCY = re.compile(
    r"\b(?:emergency|emergencies|ambulance|unconscious|chest pain|heart attack|"
    r"stroke|can't breathe|cannot breathe|cant breathe|bleeding|10177)\b|\b112\b",
    re.IGNORECASE,
)
_chip_cache: dict[str, tuple[float, str]] = {}


class ChipBody(BaseModel):
    chip: str = ""
    message: str = ""
    language: str = "en"
    location_id: str | None = Field(default=None, max_length=80)
    conversation_id: str | None = Field(default=None, max_length=80)


def reset_chip_cache() -> None:
    """Test helper — drop cached chip answers."""
    _chip_cache.clear()


def _clean_location_id(raw: str | None) -> str:
    value = (raw or "").strip()
    if not value or not _LOCATION_ID.fullmatch(value):
        return ""
    return value


def _is_emergency(text: str) -> bool:
    return bool(_EMERGENCY.search(text or ""))


def _chip_cache_get(key: str) -> str | None:
    hit = _chip_cache.get(key)
    if not hit:
        return None
    stored_at, reply = hit
    if time.monotonic() - stored_at > CHIP_CACHE_SECONDS:
        _chip_cache.pop(key, None)
        return None
    return reply


def _chip_cache_key(
    location_id: str,
    chip: str,
    documents: str,
    queue: QueueFacts | None,
) -> str:
    if queue is None:
        return f"{location_id}|{chip}|{documents}|none"
    ahead = queue.people_ahead
    wait = "" if ahead is None else str(estimate_wait(ahead))
    return "|".join(
        [
            location_id,
            chip,
            documents,
            str(queue.position),
            str(ahead),
            queue.status,
            wait,
        ]
    )


async def _published_documents(location_id: str) -> str:
    if not location_id:
        return ""
    row = await rest_get_one(
        "locations",
        {"id": f"eq.{location_id}", "select": "name,required_documents"},
    )
    if not row:
        return ""
    return str(row.get("required_documents") or "").strip()


def build_chip_prompt(name: str, documents: str, queue: QueueFacts | None) -> str:
    """Facts the chip model may use. No email, phone, or other customers."""
    published = documents.strip() or "not published"
    if queue is None:
        facts = (
            f"First name: {name or 'there'}. "
            "LIVE QUEUE: none. Position, people ahead, estimated wait, and ticket status "
            "are not available. Do not invent them."
        )
    else:
        ahead = queue.people_ahead
        wait = "not listed" if ahead is None else str(estimate_wait(ahead))
        position = "not listed" if queue.position is None else str(queue.position)
        people = "not listed" if ahead is None else str(ahead)
        facts = (
            f"First name: {name or 'there'}. "
            f"Ticket status: {_status_label(queue.status)}. "
            f"Position: {position}. "
            f"People ahead: {people}. "
            f"Estimated wait minutes: {wait}."
        )
    return (
        "You are Ask QFlow. Answer in English using only PUBLISHED DOCUMENTS and LIVE QUEUE "
        "below. If a fact is missing, say so. Never guess a document list, an address, or a wait time.\n"
        "Safety:\n"
        "- Do not give medical advice or triage.\n"
        "- If this is an emergency, reply exactly: Call 10177 or 112 now.\n"
        "- If the question is not about this queue or the published documents, refuse.\n"
        f"PUBLISHED DOCUMENTS: {published}\n"
        f"{facts}"
    )


@router.post("/api/assistant/chip")
async def chip(
    body: ChipBody,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, str]:
    """Suggested questions. English only, grounded in documents and this person's line."""
    language = (body.language or "en").strip().lower()
    if language != "en":
        return {"reply": ENGLISH_ONLY_REPLY}

    chip_id = (body.chip or "").strip().lower()
    question = CHIP_QUESTIONS.get(chip_id, "")
    free_text = redact_pii((body.message or "").strip())[:MAX_MESSAGE_CHARS]
    if _is_emergency(free_text) or _is_emergency(question):
        await enforce_assistant_rate_limit(str(user.get("id") or ""))
        await _log_exchange(str(user.get("id") or ""), free_text or question, EMERGENCY_REPLY)
        return {"reply": EMERGENCY_REPLY}

    if not question:
        if not free_text:
            raise HTTPException(status_code=400, detail="Type a question first.")
        await enforce_assistant_rate_limit(str(user.get("id") or ""))
        await _log_exchange(str(user.get("id") or ""), free_text, OFF_TOPIC_REPLY)
        return {"reply": OFF_TOPIC_REPLY}

    await enforce_assistant_rate_limit(str(user.get("id") or ""))
    name, queue = await gather_facts(user)
    requested = _clean_location_id(body.location_id)
    if requested and queue is not None and queue.location_id != requested:
        queue = None
    location_id = requested or (queue.location_id if queue is not None else "")
    documents = await _published_documents(location_id)

    if chip_id == "documents" and not documents:
        await _log_exchange(str(user.get("id") or ""), question, EMPTY_DOCUMENTS_REPLY)
        return {"reply": EMPTY_DOCUMENTS_REPLY}

    cache_key = _chip_cache_key(location_id, chip_id, documents, queue)
    cached = _chip_cache_get(cache_key)
    if cached:
        return {"reply": cached, "model": llama_model()}

    answered = False
    try:
        system = build_chip_prompt(name, documents, queue)
        reply = await call_llama(system, [], question)
        _chip_cache[cache_key] = (time.monotonic(), reply)
        answered = True
    except Exception:
        logger.exception("Ask QFlow chip failed while calling Cloudflare Workers AI")
        reply = fallback_reply()

    await _log_exchange(str(user.get("id") or ""), question, reply)
    payload = {"reply": reply}
    if answered:
        payload["model"] = llama_model()
    return payload
