import os, json, math
import numpy as np
from .staff_db import load_staff

SIM_THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", "0.65"))
OWNER_EMBEDDING = None
try:
    raw = os.getenv("OWNER_EMBEDDING_JSON")
    if raw:
        OWNER_EMBEDDING = [float(x) for x in json.loads(raw)]
except Exception:
    OWNER_EMBEDDING = None


def _cos(a, b):
    a = np.asarray(a, dtype=float).ravel()
    b = np.asarray(b, dtype=float).ravel()
    if a.shape != b.shape:
        return 0.0
    na = np.linalg.norm(a); nb = np.linalg.norm(b)
    if na < 1e-9 or nb < 1e-9:
        return 0.0
    return float(np.dot(a, b) / (na * nb))


def resolve_identity(embedding):
    # owner check
    if OWNER_EMBEDDING is not None:
        if _cos(embedding, OWNER_EMBEDDING) >= SIM_THRESHOLD:
            return {"identity": "owner", "name": "Owner", "role": "owner", "staff_id": None, "allowed_zones": ["all"]}
    best = None; best_sim = -1.0
    for s in load_staff():
        if not s.get("active", True):
            continue
        if (s.get("role") or "").lower() == "owner":
            sim = _cos(embedding, s.get("embedding", []))
            if sim > best_sim:
                best_sim, best = sim, s
        sim = _cos(embedding, s.get("embedding", []))
        if sim > best_sim:
            best_sim, best = sim, s
    if best is not None and best_sim >= SIM_THRESHOLD:
        return {
            "identity": "staff",
            "name": best.get("name"),
            "role": best.get("role"),
            "staff_id": best.get("id"),
            "allowed_zones": best.get("allowed_zones", []),
        }
    return {"identity": "unknown", "name": None, "role": None, "staff_id": None, "allowed_zones": []}