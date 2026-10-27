_SEV_ORDER = ["low", "medium", "high", "critical"]

def build_alert_payload(identity_info, violations, ctx):
    sevs = [v.get("severity", "low") for v in violations]
    top = "low"
    idx = -1
    for s in sevs:
        cur = _SEV_ORDER.index(s) if s in _SEV_ORDER else -1
        if cur > idx:
            idx = cur
            top = s
    viol_names = [v.get("rule", "") for v in violations]
    name = identity_info.get("name") or "Unknown"
    zone = ctx.get("zone") or {}
    zone_label = zone.get("label") if isinstance(zone, dict) else None
    if zone_label is None and isinstance(zone, dict):
        zone_label = zone.get("id")
    message = f"[{top.upper()}] {name} violated: {', '.join(viol_names)} | Zone: {zone_label}"
    return {
        "priority": top,
        "identity": identity_info.get("identity"),
        "name": identity_info.get("name"),
        "role": identity_info.get("role"),
        "camera": ctx.get("camera"),
        "timestamp": ctx.get("timestamp"),
        "zone": zone_label,
        "snapshot": ctx.get("snapshot_path"),
        "violations": violations,
        "message": message,
    }
