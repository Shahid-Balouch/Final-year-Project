import os

def _import(name):
    try:
        mod = __import__(name, fromlist=[name.split(".")[-1]])
        return mod
    except Exception:
        return None

_wa_mod = _import("alerts.whatsapp") or _import("whatsapp")
_email_mod = _import("alerts.email_sender") or _import("email_sender")
_dash_mod = _import("alerts.dashboard") or _import("dashboard")
_sms_mod = _import("alerts.sms") or _import("sms")


def _wa(to, msg):
    fn = getattr(_wa_mod, "send_whatsapp", None) if _wa_mod else None
    if fn:
        try:
            return fn(to, msg)
        except Exception as e:
            print("[alerts] WhatsApp error:", e)
    print(f"[alerts][WhatsApp -> {to}] {msg}")


def _email(to, msg):
    fn = getattr(_email_mod, "send_email", None) if _email_mod else None
    if fn:
        try:
            return fn(to, msg)
        except Exception as e:
            print("[alerts] Email error:", e)
    print(f"[alerts][Email -> {to}] {msg}")


def _dashboard(msg):
    fn = getattr(_dash_mod, "push_dashboard_alert", None) if _dash_mod else None
    if fn:
        try:
            return fn(msg)
        except Exception as e:
            print("[alerts] Dashboard error:", e)
    print(f"[alerts][Dashboard] {msg}")


def _sms(to, msg):
    if _sms_mod is None:
        return None
    fn = getattr(_sms_mod, "send_sms", None)
    if fn:
        try:
            return fn(to, msg)
        except Exception as e:
            print("[alerts] SMS error:", e)
    return None


def dispatch_alert(payload):
    msg = payload.get("message", "")
    priority = payload.get("priority", "low")
    role = payload.get("role", "unknown")  # staff role: owner, manager, guard, employee
    identity = payload.get("identity", "unknown")

    to_wa = os.getenv("OWNER_WHATSAPP", "+92XXXXXXXXXX")
    to_email = os.getenv("OWNER_EMAIL", "owner@example.com")
    to_sms = os.getenv("OWNER_SMS")
    _dashboard(msg)

    # Determine recipients based on identity and role
    recipients = set()
    if identity == "unknown":
        recipients = {"owner", "manager", "guard"}
    elif identity == "staff":
        if role == "guard":
            recipients = {"owner", "manager"}
        elif role == "employee":
            recipients = {"owner", "manager", "guard"}
        elif role == "manager":
            recipients = {"owner"}
        elif role == "owner":
            recipients = {"owner"}

    # Route based on severity and recipients
    if priority in ("medium", "high", "critical"):
        if "owner" in recipients:
            _wa(to_wa, msg)
        if priority in ("high", "critical"):
            if "owner" in recipients:
                _email(to_email, msg)
        if priority == "critical" and to_sms:
            if "owner" in recipients:
                _sms(to_sms, msg)
    return True
