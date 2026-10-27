import time

ROLE_THRESH = {
    "security": 3600, "cleaner": 3600, "nurse": 3600,
    "owner": 10**9, "doctor": 3600,
}

class LoiterTracker:
    def __init__(self, default_seconds=1800):
        self.default = default_seconds
        self.state = {}

    def update(self, track_id, zone_id, role=None):
        now = time.time()
        if track_id is None:
            return 0
        prev = self.state.get(track_id)
        if prev is None or prev.get("zone") != zone_id:
            self.state[track_id] = {"first_seen": now, "zone": zone_id}
            return 0
        elapsed = now - prev["first_seen"]
        threshold = ROLE_THRESH.get((role or "").lower(), self.default)
        if elapsed >= threshold:
            return int(elapsed)
        return 0

    def forget(self, track_id):
        self.state.pop(track_id, None)