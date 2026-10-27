import os, json, threading, time, uuid

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
PATH = os.path.join(BASE, "notifications.jsonl")
os.makedirs(BASE, exist_ok=True)
_lock = threading.Lock()

def save_notification(notif):
    """Append-only notification log."""
    os.makedirs(BASE, exist_ok=True)
    with _lock:
        with open(PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(notif, default=str) + "\n")
    return notif

def load_notifications(limit=50):
    """Load most recent notifications (newest first)."""
    if not os.path.exists(PATH):
        return []
    with open(PATH, "r", encoding="utf-8") as f:
        lines = [l for l in f if l.strip()]
    out = []
    for ln in reversed(lines):
        try:
            out.append(json.loads(ln))
        except Exception:
            continue
        if len(out) >= limit:
            break
    return out

def ack_notification(notif_id):
    """Mark a notification as acknowledged."""
    with _lock:
        if not os.path.exists(PATH):
            return {"status": "not_found"}
        with open(PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()
        changed = False
        new = []
        for ln in lines:
            try:
                obj = json.loads(ln)
            except Exception:
                new.append(ln); continue
            if obj.get("id") == notif_id:
                obj["acknowledged"] = True
                changed = True
                ln = json.dumps(obj, default=str) + "\n"
            new.append(ln)
        if changed:
            with open(PATH, "w", encoding="utf-8") as f:
                f.writelines(new)
            return {"status": "acknowledged", "id": notif_id}
        return {"status": "not_found", "id": notif_id}
