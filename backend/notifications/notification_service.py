import queue
import time
import uuid

from notifications.websocket_manager import manager

notification_queue = queue.Queue()

_REQUIRED_NODE = {
    "type": "info", "severity": "low", "identity": None, "name": None,
    "role": None, "camera": None, "zone": None, "timestamp": None,
    "snapshot_url": None, "message": "", "violations": [], "requires_ack": False,
}


def build_notification(identity_info, violations, ctx):
    """Build a notification dict from identity info, violations, and context."""
    violations = violations or []
    ctx = ctx or {}
    identity = (identity_info or {}).get("identity", "unknown")
    zone = ctx.get("zone") or {}
    zone_label = zone.get("label") if isinstance(zone, dict) else zone
    if violations:
        ntype = "violation"
    elif identity == "unknown":
        ntype = "unknown_person"
    else:
        ntype = "info"
    top_sev = "low"
    try:
        order = ["low", "medium", "high", "critical"]
        idx = -1
        for v in violations:
            s = v.get("severity", "low")
            if s in order and order.index(s) > idx:
                idx = order.index(s)
                top_sev = s
    except Exception:
        pass
    if identity == "unknown" and not violations:
        top_sev = max(top_sev, "medium", key=lambda x: ["low", "medium", "high", "critical"].index(x))
    name = (identity_info or {}).get("name")
    role = (identity_info or {}).get("role")
    msg = "Unknown person detected" if identity == "unknown" else "Activity detected"
    if violations:
        msg = "; ".join(v.get("rule", "") for v in violations)
    notif = {
        "id": str(uuid.uuid4()),
        "type": ntype,
        "severity": top_sev,
        "identity": identity,
        "name": name,
        "role": role,
        "camera": ctx.get("camera"),
        "zone": zone_label,
        "timestamp": ctx.get("timestamp", time.time()),
        "snapshot_url": ctx.get("snapshot_url") or ctx.get("snapshot_path"),
        "message": msg,
        "violations": violations,
        "requires_ack": top_sev in ("high", "critical"),
        "acknowledged": False,
    }
    return notif


def enqueue(notif):
    """Enqueue a notification for broadcasting."""
    try:
        notification_queue.put_nowait(notif)
    except Exception:
        pass


async def notify_owner(notification):
    """Broadcast a notification to all connected WebSocket clients."""
    try:
        await manager.broadcast(notification)
    except Exception:
        pass
