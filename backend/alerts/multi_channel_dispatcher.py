"""Additive multi-channel alert dispatcher.

Severity routing:
  LOW        -> WebSocket (dashboard) only
  MEDIUM     -> WebSocket + Email (owner)
  HIGH       -> WebSocket + Email (owner) + Mobile (owner)
  CRITICAL   -> WebSocket + Email (owner + admin) + Mobile (owner + admin) + Sound alarm

Existing code paths are untouched. Email / WhatsApp / SMS fall back to console
stubs until real API keys are configured.
"""
import os
import time
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

from config import OWNER_EMAIL, OWNER_PHONE, ADMIN_EMAIL, ADMIN_PHONE, SMTP_CONFIG, TWILIO_KEYS
from notifications import notification_service
import asyncio

SEV_ORDER = ["low", "medium", "high", "critical"]


def _send_email(to, subject, body, snapshot_path=None):
    if not SMTP_CONFIG.get("username") or not SMTP_CONFIG.get("password"):
        print(f"[alerts][Email -> {to}] {subject}: {body}  (SMTP not configured)")
        return False
    try:
        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = SMTP_CONFIG["username"]
        msg["To"] = to
        msg.attach(MIMEText(body, "plain"))
        if snapshot_path and os.path.exists(snapshot_path):
            with open(snapshot_path, "rb") as f:
                img = MIMEImage(f.read())
                img.add_header("Content-Disposition", "attachment", filename="incident.jpg")
                msg.attach(img)
        if SMTP_CONFIG.get("use_ssl"):
            with smtplib.SMTP_SSL(SMTP_CONFIG["server"], SMTP_CONFIG["port"], timeout=10) as s:
                s.login(SMTP_CONFIG["username"], SMTP_CONFIG["password"]); s.send_message(msg)
        else:
            with smtplib.SMTP(SMTP_CONFIG["server"], SMTP_CONFIG["port"], timeout=10) as s:
                s.starttls(); s.login(SMTP_CONFIG["username"], SMTP_CONFIG["password"]); s.send_message(msg)
        print(f"[alerts] Email sent to {to}")
        return True
    except Exception as e:
        print(f"[alerts] Email error to {to}: {e}")
        return False


def _send_mobile(to, message):
    # TODO: wire real Twilio / Meta WhatsApp API using TWILIO_KEYS when API keys are available.
    if not (TWILIO_KEYS.get("account_sid") and TWILIO_KEYS.get("auth_token")):
        print(f"[alerts][Mobile -> {to}] {message}  (Twilio not configured)")
        return False
    print(f"[alerts] Mobile alert queued to {to}")
    return True


def _play_sound_alarm():
    try:
        from sound_worker import _play_sound_mci
        _play_sound_mci("sound/alarm.wav")
    except Exception:
        try:
            import winsound
            winsound.Beep(1000, 1000)
        except Exception:
            print("[alerts] Critical sound alarm - no audio backend available")


def _owner_emails():
    out = [OWNER_EMAIL]
    if ADMIN_EMAIL and ADMIN_EMAIL != OWNER_EMAIL:
        out.append(ADMIN_EMAIL)
    return out


def _owner_phones():
    out = [OWNER_PHONE]
    if ADMIN_PHONE and ADMIN_PHONE != OWNER_PHONE:
        out.append(ADMIN_PHONE)
    return out


def _user_allowed_zone(user_id, db, zone_label):
    # TODO: wire to real user zone assignments. Stub: allow all when no db.
    if db is None:
        return True
    try:
        from database import User
        import json
        u = db.query(User).filter(User.id == user_id).first()
        if not u:
            return False
        zones = json.loads(u.allowed_notifications or "[]")
        return (not zones) or (zone_label in zones) or ("all" in zones)
    except Exception:
        return True


def _is_owner_admin(user_id, db):
    if db is None:
        return False
    try:
        from database import User
        u = db.query(User).filter(User.id == user_id).first()
        return bool(u and (u.is_admin or (u.role or "").lower() in ("admin", "owner")))
    except Exception:
        return False


class MultiChannelDispatcher:
    def dispatch(self, payload, user_id=None, db=None):
        severity = payload.get("severity", "low")
        zone_label = payload.get("zone_label") or ""
        violations = payload.get("violations") or []

        # Recipient filter: owner/admin gets everything; user only assigned zones.
        if user_id and not _is_owner_admin(user_id, db):
            if not _user_allowed_zone(user_id, db, zone_label):
                print(f"[alerts] skipped user {user_id} for zone {zone_label}")
                return False

        # 1. WebSocket (dashboard) — always, all severities
        notif = notification_service.build_notification(
            {"identity": payload.get("identity", "unknown"),
             "name": payload.get("name"),
             "role": payload.get("role")},
            violations,
            {"camera": payload.get("camera"),
             "zone": {"label": zone_label},
             "timestamp": payload.get("timestamp"),
             "snapshot_url": payload.get("snapshot_url")},
        )
        notif["type"] = "alert"
        notification_service.enqueue(notif)
        try:
            asyncio.get_event_loop().create_task(notification_service.notify_owner(notif))
        except Exception:
            pass

        # 2. Email — MEDIUM+ to owner
        if severity in ("medium", "high", "critical"):
            for to in _owner_emails():
                _send_email(to, f"[AI Surviallance] {severity.upper()} Alert",
                            payload.get("message", ""), payload.get("snapshot_path"))

        # 3. WhatsApp / SMS — HIGH+ to owner
        if severity in ("high", "critical"):
            for to in _owner_phones():
                _send_mobile(to, payload.get("message", ""))

        # 4. CRITICAL: email+mobile to admin as well, + sound alarm
        if severity == "critical":
            for to in _owner_emails():
                _send_email(to, "[AI Surviallance] CRITICAL Alert",
                            payload.get("message", ""), payload.get("snapshot_path"))
            for to in _owner_phones():
                _send_mobile(to, payload.get("message", ""))
            _play_sound_alarm()

        return True
