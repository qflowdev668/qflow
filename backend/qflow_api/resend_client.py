import os
import re

import httpx
from fastapi import HTTPException


def get_resend_api_key() -> str | None:
    key = os.environ.get("RESEND_API_KEY", "").strip()
    return key or None


def get_resend_from() -> str:
    return os.environ.get("RESEND_FROM_EMAIL", "").strip() or "QFlow <onboarding@resend.dev>"


def resolve_resend_recipient(intended: str) -> tuple[str, str | None]:
    normalized = intended.strip().lower()
    redirect = os.environ.get("RESEND_DEV_REDIRECT_TO", "").strip().lower()
    if os.environ.get("NODE_ENV") != "production" and redirect and normalized != redirect:
        return redirect, normalized
    return normalized, None


def format_resend_error(message: str) -> str:
    if re.search(r"only send testing emails to your own email", message, re.I):
        return (
            "Resend test mode: emails can only go to your Resend account address right now.\n\n"
            "Quick fixes:\n"
            "• Local dev — add RESEND_DEV_REDIRECT_TO to .env.local and restart\n"
            "• Production — verify your domain at resend.com/domains"
        )
    return message


async def _send_email(*, to: str, subject: str, text: str, html: str) -> None:
    api_key = get_resend_api_key()
    if not api_key:
        raise HTTPException(
            status_code=501,
            detail="Resend is not configured. Add RESEND_API_KEY to .env.local.",
        )

    recipient, dev_from = resolve_resend_recipient(to)
    if dev_from:
        text += f"\n\n[Dev] This code was requested for {dev_from}."
        html += (
            f'<p style="color:#b45309;font-size:13px;margin:16px 0 0;">'
            f"Dev redirect: code requested for <strong>{dev_from}</strong></p>"
        )

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": get_resend_from(), "to": [recipient], "subject": subject, "text": text, "html": html},
        )

    if response.status_code >= 400:
        payload = response.json() if response.content else {}
        message = payload.get("message") or response.text or "Failed to send email via Resend."
        raise HTTPException(status_code=502, detail=format_resend_error(message))


async def send_login_code_email(to: str, code: str, kind: str = "admin") -> None:
    who = "staff" if kind == "staff" else "admin"
    title = f"QFlow {who} sign-in"
    await _send_email(
        to=to,
        subject=f"Your QFlow {who} sign-in code",
        text=(
            f"Your QFlow {who} sign-in code is: {code}\n\n"
            "This code expires in about 1 hour.\n"
            "If you did not request this, you can ignore this email."
        ),
        html=f"""
        <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px;">
          <h1 style="font-size:20px;color:#0f172a;margin:0 0 12px;">{title}</h1>
          <p style="color:#475569;margin:0 0 20px;">Use this code to finish signing in:</p>
          <p style="font-size:32px;letter-spacing:0.35em;font-weight:700;color:#0f172a;margin:0 0 20px;">{code}</p>
          <p style="color:#94a3b8;font-size:13px;margin:0;">Expires in about 1 hour.</p>
        </div>
        """,
    )


async def send_password_reset_email(to: str, code: str) -> None:
    await _send_email(
        to=to,
        subject="Your QFlow password reset code",
        text=(
            f"Your QFlow password reset code is: {code}\n\n"
            "Enter this code in the app, then choose a new password.\n"
            "This code expires in about 1 hour."
        ),
        html=f"""
        <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px;">
          <h1 style="font-size:20px;color:#0f172a;margin:0 0 12px;">Reset your QFlow password</h1>
          <p style="color:#475569;margin:0 0 20px;">Enter this code in the app, then choose a new password.</p>
          <p style="font-size:32px;letter-spacing:0.35em;font-weight:700;color:#0f172a;margin:0 0 20px;">{code}</p>
        </div>
        """,
    )
