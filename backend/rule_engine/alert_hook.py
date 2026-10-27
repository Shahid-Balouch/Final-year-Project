"""Additive hook invoked from the detection loop to run the rule engine and
dispatch multi-channel alerts. Existing YOLO / FaceNet / WebSocket logic is
untouched.
"""
import os
import time

from rule_engine.person_weapon_rules import PersonWeaponRuleEngine, StationaryTracker, SEV_ORDER
from alerts.multi_channel_dispatcher import MultiChannelDispatcher
from trackers import LoiterTracker, CrowdTracker
from zones import ZoneManager

_zone_mgr = ZoneManager()
_loiter = LoiterTracker(default_seconds=int(os.getenv("LOITER_DEFAULT_SECONDS", "1800")))
_crowd = CrowdTracker()
_stationary = StationaryTracker()
_pw_engine = PersonWeaponRuleEngine(stationary_tracker=_stationary, loiter_tracker=_loiter)
_mc_dispatcher = MultiChannelDispatcher()

_LAST_DISPATCH = {}  # (camera, rule, zone, track_id) -> last_ts


def _rate_limited(key, min_gap=60):
    now = time.time()
    last = _LAST_DISPATCH.get(key, 0)
    if now - last < min_gap:
        return True
    _LAST_DISPATCH[key] = now
    return False


def evaluate_frame(camera_id, frame, detections, face_results, user_id=None, db=None):
    """Run rule engine + dispatch alerts for one frame.

    detections: YOLO detections [{"label","confidence","box":[x1,y1,x2,y2],"track_id":...}, ...]
    face_results: parallel FaceNet results [{"identity","name","role","box":[...]}, ...]
    Returns list of dispatched violations (empty if none / rate-limited).
    """
    now = time.time()
    all_violations = []
    person_boxes = []
    group_size = 0

    for det in detections or []:
        label = (det.get("label") or "").lower()
        box = det.get("box") or [0, 0, 0, 0]
        if label == "person":
            group_size += 1
            person_boxes.append(box)
        x1, y1, x2, y2 = [float(v) for v in box]
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2

        zone = _zone_mgr.locate(camera_id, cx, cy)
        zone_id = (zone.get("id") or zone.get("label") or "global") if zone else "global"

        loiter = 0
        track_id = det.get("track_id")
        if label == "person" and track_id and _loiter:
            loiter = _loiter.update(track_id, zone_id, "", now)

        info = {}
        for fr in face_results or []:
            fbox = fr.get("box") or [0, 0, 0, 0]
            if abs(fbox[0] - x1) < 40 and abs(fbox[1] - y1) < 40:
                info = fr
                break

        ctx = {
            "camera": camera_id,
            "timestamp": now,
            "zone": zone or {},
            "zone_id": zone_id,
            "loiter_seconds": loiter or 0,
            "group_size": group_size,
            "crowded": _crowd.is_crowded(zone_id, group_size),
            "person_boxes": person_boxes,
            "after_hours": bool((zone or {}).get("is_after_hours")),
        }
        violations = _pw_engine.evaluate([det], [info] if info else [], ctx)
        for v in violations:
            v["track_id"] = v.get("track_id") or track_id or f"{camera_id}:{group_size}"
            rkey = f"{camera_id}:{v['rule']}:{zone_id}:{v['track_id']}"
            if _rate_limited(rkey, int(os.getenv("ALERT_RATE_LIMIT_SECONDS", "60"))):
                continue
            all_violations.append({**v, "camera": camera_id, "zone_id": zone_id,
                                   "zone_label": (zone or {}).get("label")})

    if not all_violations:
        return []

    snapshot_url = None
    snapshot_path = None
    try:
        import cv2
        snap_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "snapshots"))
        os.makedirs(snap_dir, exist_ok=True)
        snapshot_path = os.path.join(snap_dir, f"rule_{int(now * 1000)}.jpg")
        cv2.imwrite(snapshot_path, frame)
        snapshot_url = f"/snapshots/{os.path.basename(snapshot_path)}"
    except Exception:
        pass

    top = max((v["severity"] for v in all_violations),
              key=lambda s: SEV_ORDER.index(s) if s in SEV_ORDER else -1)
    payload = {
        "type": "alert",
        "severity": top,
        "camera": camera_id,
        "violations": all_violations,
        "snapshot_url": snapshot_url,
        "snapshot_path": snapshot_path,
        "timestamp": now,
        "message": "; ".join(v["description"] for v in all_violations),
    }
    _mc_dispatcher.dispatch(payload, user_id=user_id, db=db)
    return all_violations
