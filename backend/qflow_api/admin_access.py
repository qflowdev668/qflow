import os
import re
from dataclasses import dataclass
from typing import Any

from qflow_api.supabase_admin import rest_get_one


def normalize_sa_phone(input: str) -> str:
    digits = re.sub(r"\D", "", input)
    if digits.startswith("27") and len(digits) >= 11:
        return f"0{digits[2:11]}"
    if len(digits) == 9:
        return f"0{digits}"
    if len(digits) > 10 and digits.startswith("0"):
        return digits[:10]
    return digits


def get_admin_otp_config() -> dict[str, str] | None:
    phone = normalize_sa_phone(os.environ.get("ADMIN_OTP_PHONE", ""))
    email = os.environ.get("ADMIN_OTP_EMAIL", "").strip().lower()
    if not phone or "@" not in email:
        return None
    return {"phone": phone, "email": email}


def is_bootstrap_admin_phone(input: str) -> bool:
    config = get_admin_otp_config()
    if not config:
        return False
    return normalize_sa_phone(input) == config["phone"]


@dataclass
class AdminIdentity:
    phone: str
    email: str
    name: str
    account_id: str | None
    is_bootstrap: bool


async def resolve_admin_by_phone(input: str) -> AdminIdentity | None:
    phone = normalize_sa_phone(input)
    if not phone or len(phone) < 10:
        return None

    bootstrap = get_admin_otp_config()
    if bootstrap and phone == bootstrap["phone"]:
        return AdminIdentity(
            phone=bootstrap["phone"],
            email=bootstrap["email"],
            name="QFlow Admin",
            account_id=None,
            is_bootstrap=True,
        )

    row = await rest_get_one(
        "admin_accounts",
        {
            "cell_number": f"eq.{phone}",
            "select": "id,name,cell_number,email,is_active",
        },
    )
    if not row or not row.get("is_active"):
        return None

    return AdminIdentity(
        phone=row["cell_number"],
        email=row["email"].strip().lower(),
        name=row["name"],
        account_id=row["id"],
        is_bootstrap=False,
    )
