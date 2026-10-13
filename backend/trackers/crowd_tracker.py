class CrowdTracker:
    DEFAULT_LIMITS = {
        "lobby": 15, "corridor": 8, "entrance": 10,
        "food_court": 25, "ward": 6, "icu": 3,
    }

    def is_crowded(self, zone_id, count):
        limit = self.DEFAULT_LIMITS.get(zone_id, 20)
        return (count or 0) > limit