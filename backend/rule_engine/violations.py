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
    name = identity_info.get("name") or "Unknown"
    identity = identity_info.get("identity") or "unknown"
    zone = ctx.get("zone") or {}
    zone_label = zone.get("label") if isinstance(zone, dict) else None
    if zone_label is None and isinstance(zone, dict):
        zone_label = zone.get("id")
    camera = ctx.get("camera") or "unknown"

    # Build detailed reason-based messages
    reason_parts = []
    for v in violations:
        rule_name = v.get("rule", "")
        desc = v.get("description", "")
        if "weapon" in rule_name.lower():
            reason_parts.append(f"Carrying a weapon ({desc})")
        elif "target" in rule_name.lower() or "watchlist" in rule_name.lower():
            reason_parts.append(f"Person is in the targeted watchlist ({desc})")
        else:
            reason_parts.append(desc)

    reason_text = "; ".join(reason_parts) if reason_parts else "No specific violation"
    identity_label = "Unknown person" if identity == "unknown" else (name or "Person")
    message = f"[{top.upper()}] ALERT: {identity_label} detected at {camera}. Reason: {reason_text}."

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
