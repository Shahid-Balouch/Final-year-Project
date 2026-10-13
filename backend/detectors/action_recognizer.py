from .mask_detector import MaskDetector
from .weapon_detector import WeaponDetector
from .fight_detector import FightDetector
from .fall_detector import FallDetector

class ActionRecognizer:
    def __init__(self):
        self.mask = MaskDetector()
        self.weapon = WeaponDetector()
        self.fight = FightDetector()
        self.fall = FallDetector()

    def analyze_frame(self, frame, persons):
        # persons: list of {"track_id", "bbox"}
        weapons = self.weapon.detect(frame) if self.weapon.available else []
        fights = self.fight.analyze(frame, persons) if self.fight.available else {"fight": False, "involved_ids": [], "per_person": {}}
        action = "weapon" if weapons else ("fight" if fights.get("fight") else None)
        in_fight_ids = set(fights.get("involved_ids", []))
        per_person = {}
        for p in persons:
            tid = p["track_id"]
            pm = fights.get("per_person", {}).get(tid, {})
            has_w = False
            for w in weapons:
                wb = w["bbox"]
                # weapon inside / near person bbox (simple check)
                if (wb[0] >= p["bbox"][0] - 20 and wb[2] <= p["bbox"][2] + 20 and wb[1] >= p["bbox"][1] - 20 and wb[3] <= p["bbox"][3] + 20):
                    has_w = True
            per_person[tid] = {
                "has_mask": self.mask.has_mask(frame, p["bbox"]) if self.mask.available else True,
                "is_fallen": self.fall.is_fallen(p["bbox"]),
                "in_fight": tid in in_fight_ids,
                "has_weapon": has_w,
            }
        return {
            "action": action,
            "weapons": weapons,
            "fight_ids": fights.get("involved_ids", []),
            "per_person": per_person,
        }