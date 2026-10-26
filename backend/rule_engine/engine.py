import os
from .rule_loader import load_rules

_SEV = ["low", "medium", "high", "critical"]

def _model_available(alias):
    try:
        from detectors import model_registry as mr
        mr.load_all()
        return mr.get(alias) is not None
    except Exception:
        return False

class RuleEngine:
    def __init__(self, rules=None):
        self.rules = rules or load_rules()
        self._log_status()

    def _detector_needed(self, name):
        n = name.lower()
        if "mask" in n:
            return "mask"
        if "weapon" in n:
            return "weapon"
        if "fire" in n or "smoke" in n:
            return "fire_smoke"
        if "fight" in n:
            return "pose"
        if "climb" in n:
            return "climbing"
        return None

    def _detector_is_available(self, needed):
        if needed is None:
            return True
        if needed == "mask":
            return _model_available("mask")
        if needed == "weapon":
            return _model_available("weapon")
        if needed == "pose":
            return _model_available("pose")
        if needed == "fire_smoke":
            return False
        if needed == "climbing":
            return False
        return True

    def _is_violated(self, rule, identity_info, ctx):
        name = rule["name"].lower()
        zone = ctx.get("zone") or {}
        role = (ctx.get("role") or identity_info.get("role") or "").lower()
        identity = (identity_info.get("identity") or ctx.get("identity") or "").lower()
        allowed = zone.get("allowed_roles", ["all"])
        if "all" in allowed:
            zone_ok = True
        else:
            zone_ok = role in allowed

        if name in ("restricted_zone",) or "zone_entry" in name or "intrusion" in name or "access" in name or "exit" in name:
            return not zone_ok
        if "after_hours" in name:
            return bool(ctx.get("after_hours"))
        if "mask" in name:
            return bool(zone.get("mask_required", False)) and not bool(ctx.get("has_mask", True))
        if "fall" in name:
            if ctx.get("is_fallen"):
                return True
            per = ctx.get("per_person", {}) or {}
            return any(v.get("is_fallen") for v in per.values())
        if "fight" in name:
            return ctx.get("action") == "fight" or ctx.get("in_fight") is True
        if "weapon" in name:
            return ctx.get("action") == "weapon" or ctx.get("has_weapon") is True
        if "fire" in name or "smoke" in name:
            return ctx.get("action") == "fire_smoke"
        if "loiter" in name:
            ls = ctx.get("loiter_seconds", 0)
            return (ls or 0) > 0
        if "crowd" in name:
            limit = zone.get("crowd_limit", 20)
            return (ctx.get("group_size", 0) or 0) > limit
        if "tailgat" in name:
            return bool(ctx.get("tailgating"))
        if "child" in name:
            return bool(ctx.get("child_unaccompanied"))
        if "abandoned" in name:
            return bool(ctx.get("abandoned_object"))
        if "shoplift" in name or "suspicious" in name:
            return bool(ctx.get("suspicious_behavior"))
        if "staff_unauthorized_zone" in name:
            # Staff in unauthorized zone — check if staff's allowed_zones contains current zone
            allowed_zones = ctx.get("allowed_zones") or []
            zone_label = zone.get("label") or zone.get("id") or "unknown"
            if identity == "staff" and allowed_zones and "all" not in allowed_zones and zone_label not in allowed_zones:
                return True
            return False
        return False

    def evaluate(self, identity_info, ctx):
        violations = []
        for rule in self.rules:
            applies = rule.get("applies_to", [])
            if identity_info.get("identity") not in applies:
                continue
            role = (identity_info.get("role") or ctx.get("role") or "").lower()
            if role in [r.lower() for r in rule.get("exempt_roles", [])]:
                continue
            needed = self._detector_needed(rule["name"])
            if not self._detector_is_available(needed):
                continue
            if not self._is_violated(rule, identity_info, ctx):
                continue
            sev = rule.get("severity", "medium")
            zone = ctx.get("zone") or {}
            if zone.get("severity_override"):
                sev = zone["severity_override"]
            violations.append({
                "rule": rule["name"],
                "severity": sev,
                "description": rule.get("description", ""),
            })
        return violations

    def _log_status(self):
        active, skipped = [], []
        for r in self.rules:
            needed = self._detector_needed(r["name"])
            if needed is None:
                active.append(r["name"])
            elif self._detector_is_available(needed):
                active.append(r["name"])
            else:
                skipped.append(r["name"])
        print("[RuleEngine] Active rules:", active)
        print("[RuleEngine] Skipped rules (missing models):", skipped)
