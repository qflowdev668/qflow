"""Public support inbox. Same env var as the UI constant SUPPORT_EMAIL."""

from __future__ import annotations

import os

_DEFAULT = "support@useqflow.app"


def support_email() -> str:
    value = os.environ.get("NEXT_PUBLIC_SUPPORT_EMAIL", "").strip()
    return value or _DEFAULT


SUPPORT_EMAIL = support_email()
