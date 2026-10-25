"""Central additive config for the rule engine / multi-channel alert system.
Loaded from .env with safe defaults. Do not touch existing code paths.
"""
import os
from dotenv import load_dotenv
load_dotenv()


def _env(key, default=None):
    return os.getenv(key, default)


def _csv(key):
    v = _env(key)
    if not v:
        return []
    return [x.strip() for x in v.split(",") if x.strip()]


OWNER_EMAIL = _env("OWNER_EMAIL", "owner@example.com")
OWNER_PHONE = _env("OWNER_PHONE", "+92XXXXXXXXXX")
ADMIN_EMAIL = _env("ADMIN_EMAIL", "admin@example.com")
ADMIN_PHONE = _env("ADMIN_PHONE", "+92XXXXXXXXXX")

SMTP_CONFIG = {
    "server": _env("SMTP_SERVER", "smtp.gmail.com"),
    "port": int(_env("SMTP_PORT", "465") or 465),
    "username": _env("SMTP_EMAIL"),
    "password": _env("SMTP_PASSWORD"),
    "use_ssl": _env("SMTP_USE_SSL", "true").lower() == "true",
}

TWILIO_KEYS = {
    "account_sid": _env("TWILIO_ACCOUNT_SID"),
    "auth_token": _env("TWILIO_AUTH_TOKEN"),
    "from_number": _env("TWILIO_FROM_NUMBER"),
}

ALERT_RATE_LIMIT_SECONDS = int(_env("ALERT_RATE_LIMIT_SECONDS", "60"))
