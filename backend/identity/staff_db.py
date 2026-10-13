import os, json, threading, uuid

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
PATH = os.path.join(BASE, "staff.json")
os.makedirs(BASE, exist_ok=True)
_lock = threading.Lock()

def _read():
    if not os.path.exists(PATH):
        return []
    try:
        with open(PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def _write(rows):
    os.makedirs(BASE, exist_ok=True)
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(rows, f, default=str, indent=2)

def load_staff():
    with _lock:
        return _read()

def save_staff(rows):
    with _lock:
        _write(rows)

def register_staff(name, role, embedding, allowed_zones=None, allowed_roles=None):
    allowed_zones = allowed_zones or ["all"]
    allowed_roles = allowed_roles or []
    rows = _read()
    sid = f"staff_{len(rows)+1:04d}"
    entry = {
        "id": sid,
        "name": name,
        "role": role,
        "embedding": [float(x) for x in embedding],
        "allowed_zones": allowed_zones,
        "allowed_roles": allowed_roles,
        "active": True,
    }
    rows.append(entry)
    _write(rows)
    return entry

def deactivate(staff_id):
    rows = _read()
    for r in rows:
        if r.get("id") == staff_id:
            r["active"] = False
    _write(rows)
    return True