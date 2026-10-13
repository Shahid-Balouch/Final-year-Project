import time

class TailgateTracker:
    def __init__(self, window_sec=4):
        self.window = window_sec
        self.badges = []

    def register_badge(self):
        self.badges.append(time.time())
        self.badges = self.badges[-50:]

    def is_tailgating(self, person_count_near_door):
        now = time.time()
        fresh = [t for t in self.badges if now - t <= self.window]
        return bool(fresh) and (person_count_near_door or 0) > 1