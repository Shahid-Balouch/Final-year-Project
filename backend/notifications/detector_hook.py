import os
import time
import uuid
import cv2

_LAST = {}
_THROTTLE = 20.0


def _throttled(camera_id):
    now = time.time()
    last = _LAST.get(camera_id, 0)
    if now - last < _THROTTLE:
        return True
    _LAST[camera_id] = now
    return False


def notify_unknown(frame, box, camera_id="local"):
    """Emit a real-time unknown-person notification with snapshot."""
    try:
        if _throttled(camera_id):
            return
        from identity.resolver import resolve_identity
        import numpy as np
        snap_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "snapshots"))
        os.makedirs(snap_dir, exist_ok=True)
        notif_id = str(uuid.uuid4())
        filename = f"{notif_id}.jpg"
        snapshot_path = os.path.join(snap_dir, filename)
        snapshot_url = f"/snapshots/{filename}"
        try:
            if frame is not None:
                cv2.imwrite(snapshot_path, frame)
        except Exception:
            pass
        ctx = {
            "camera": camera_id,
            "timestamp": time.time(),
            "zone": None,
            "group_size": 1,
            "has_mask": True,
            "action": None,
            "is_fallen": False,
            "loiter_seconds": 0,
            "after_hours": False,
            "tailgating": False,
            "snapshot_url": snapshot_url,
            "snapshot_path": snapshot_path,
            "per_person": {},
        }
        identity_info = {"identity": "unknown", "name": None, "role": None, "staff_id": None, "allowed_zones": []}
        from .notification_service import build_notification, enqueue
        from records.notification_store import save_notification
        notif = build_notification(identity_info, [], ctx)
        notif["id"] = notif_id
        enqueue(notif)
        save_notification(notif)
    except Exception as e:
        print(f"[Notify] error: {e}")
