import os, json, threading, time, uuid

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
PATH = os.path.join(BASE, "detection_records.jsonl")
os.makedirs(BASE, exist_ok=True)
_lock = threading.Lock()

def save_detection(identity_info, violations, ctx):
    os.makedirs(BASE, exist_ok=True)
    rec = {
        "id": str(uuid.uuid4()),
        "timestamp": ctx.get("timestamp", time.time()),
        "camera": ctx.get("camera"),
        "zone": None,
        "identity": identity_info.get("identity"),
        "name": identity_info.get("name"),
        "role": identity_info.get("role"),
        "staff_id": identity_info.get("staff_id"),
        "violations": violations,
        "alert_sent": bool(violations),
        "snapshot": ctx.get("snapshot_path"),
    }
    zone = ctx.get("zone")
    if isinstance(zone, dict):
        rec["zone"] = zone.get("label") or zone.get("id")
    raw = {k: v for k, v in (ctx or {}).items() if k not in ("zone",)}
    rec["raw_ctx"] = raw
    line = json.dumps(rec, default=str) + "\n"
    with _lock:
        with open(PATH, "a", encoding="utf-8") as f:
            f.write(line)
    return rec

def read_records(limit=100):
    if not os.path.exists(PATH):
        return []
    with open(PATH, "r", encoding="utf-8") as f:
        lines = f.readlines()
    out = []
    for ln in reversed(lines):
        ln = ln.strip()
        if not ln:
            continue
        try:
            out.append(json.loads(ln))
        except Exception:
            continue
        if len(out) >= limit:
            break
    return out
