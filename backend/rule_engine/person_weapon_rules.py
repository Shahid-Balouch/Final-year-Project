"""Additive rule engine for person / weapon / abandoned-object / phone / vehicle rules.

Implements exactly the specified categories and severities. Intended to be used
alongside the existing RuleEngine; existing code paths are untouched.
"""
import os
import time

SEV_ORDER = ["low", "medium", "high", "critical"]
WEAPON_CLASSES = {"knife", "scissors", "baseball bat"}
WEAPON_THRESHOLD = 0.30
ABANDONED_CLASSES = {"backpack", "suitcase", "handbag"}
ABANDONED_SECONDS = 60
ABANDONED_PERSON_DIST_PX = 120
VEHICLE_CLASSES = {"car", "motorcycle", "truck", "bus"}
VEHICLE_NO_PARKING_SECONDS = 300
LOITER_SECONDS = int(os.getenv("LOITER_DEFAULT_SECONDS", "1800"))


class StationaryTracker:
    """Tracks object center positions to detect stationary / abandoned objects."""

    def __init__(self):
        self._state = {}  # key -> {cx, cy, since, cls}

    def update(self, key, cx, cy, cls_name, now=None):
        now = now or time.time()
        prev = self._state.get(key)
        if prev is None:
            self._state[key] = {"cx": cx, "cy": cy, "since": now, "cls": cls_name}
            return 0.0
        if abs(cx - prev["cx"]) > 30 or abs(cy - prev["cy"]) > 30:
            self._state[key] = {"cx": cx, "cy": cy, "since": now, "cls": cls_name}
            return 0.0
        return now - prev["since"]

    def forget(self, key):
        self._state.pop(key, None)


def _v(rule, severity, description, track_id, label, box):
    return {
        "rule": rule,
        "severity": severity,
        "description": description,
        "track_id": track_id,
        "label": label,
        "box": [float(v) for v in box],
    }


class PersonWeaponRuleEngine:
    """Rule engine for person / weapon / abandoned-object / phone / vehicle rules."""

    def __init__(self, stationary_tracker=None, loiter_tracker=None):
        self.stationary = stationary_tracker or StationaryTracker()
        self.loiter = loiter_tracker

    def evaluate(self, detections, identity_infos, ctx):
        """Evaluate detections and return a list of violation dicts.

        detections: [{"label","confidence","box":[x1,y1,x2,y2],"track_id":...}, ...]
        identity_infos: parallel list of {"identity","name","role",...}
        ctx: {camera, timestamp, zone:{...}, loiter_seconds, group_size,
              crowded, person_boxes:[[x1,y1,x2,y2],...]}
        """
        zone = ctx.get("zone") or {}
        zone_label = zone.get("label") or zone.get("id") or "unknown"
        now = ctx.get("timestamp") or time.time()
        violations = []
        person_boxes = ctx.get("person_boxes") or []
        group_size = ctx.get("group_size") or 0

        for idx, det in enumerate(detections or []):
            label = (det.get("label") or "").lower()
            conf = float(det.get("confidence") or 0)
            box = det.get("box") or [0, 0, 0, 0]
            track_id = det.get("track_id") or f"{ctx.get('camera')}:{idx}"
            x1, y1, x2, y2 = box
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2
            info = (identity_infos[idx] if idx < len(identity_infos or []) else {}) or {}
            identity = (info.get("identity") or "unknown").lower()

            # ---- PERSON RULES ----
            if label == "person":
                if identity == "unknown" and zone.get("is_restricted"):
                    violations.append(_v("restricted_zone_intrusion", "critical",
                                         f"Unknown person in restricted zone '{zone_label}'", track_id, label, box))
                if identity == "unknown" and bool(zone.get("is_after_hours")):
                    violations.append(_v("after_hours_entry", "high",
                                         f"Unknown person after hours in '{zone_label}'", track_id, label, box))
                loiter = ctx.get("loiter_seconds")
                if loiter is None and self.loiter:
                    loiter = self.loiter.update(track_id, zone.get("id") or zone_label, "", now)
                if loiter and loiter > LOITER_SECONDS:
                    violations.append(_v("loitering", "medium",
                                         f"Person loitering {int(loiter)}s in '{zone_label}'", track_id, label, box))
                cap = int(zone.get("max_capacity", 0) or 0)
                if cap and group_size > cap:
                    violations.append(_v("crowd_gathering", "high",
                                         f"Crowd {group_size} exceeds capacity {cap}", track_id, label, box))
                if ctx.get("crowded"):
                    violations.append(_v("crowd_gathering", "high",
                                         f"Crowd threshold exceeded in '{zone_label}'", track_id, label, box))

            # ---- WEAPON RULES ----
            elif label in WEAPON_CLASSES:
                if conf >= WEAPON_THRESHOLD:
                    violations.append(_v("weapon_threat", "critical",
                                         f"Weapon detected: {label} ({conf:.2f})", track_id, label, box))

            # ---- ABANDONED OBJECT RULES ----
            elif label in ABANDONED_CLASSES:
                stationary = self.stationary.update(track_id, cx, cy, label, now)
                person_near = self._person_near(cx, cy, person_boxes)
                if stationary > ABANDONED_SECONDS and not person_near:
                    violations.append(_v("abandoned_object", "high",
                                         f"Suspicious unattended {label} stationary {int(stationary)}s",
                                         track_id, label, box))

            # ---- PHONE RULES ----
            elif label == "cell phone":
                if zone.get("phone_restricted"):
                    violations.append(_v("phone_policy_violation", "medium",
                                         f"Cell phone in restricted zone '{zone_label}'", track_id, label, box))

            # ---- VEHICLE RULES ----
            elif label in VEHICLE_CLASSES:
                if zone.get("no_parking"):
                    stationary = self.stationary.update(track_id, cx, cy, label, now)
                    if stationary > VEHICLE_NO_PARKING_SECONDS:
                        violations.append(_v("unauthorized_parking", "low",
                                             f"{label} parked in no-parking zone {int(stationary)}s",
                                             track_id, label, box))

        # Zone severity override applies to all violations from this frame.
        if zone.get("severity_override"):
            for v in violations:
                v["severity"] = zone["severity_override"]
        return violations

    def _person_near(self, cx, cy, person_boxes):
        for pb in person_boxes or []:
            pcx = (pb[0] + pb[2]) / 2
            pcy = (pb[1] + pb[3]) / 2
            if ((cx - pcx) ** 2 + (cy - pcy) ** 2) ** 0.5 < ABANDONED_PERSON_DIST_PX:
                return True
        return False
