class FallDetector:
    def is_fallen(self, bbox):
        try:
            x1, y1, x2, y2 = [float(v) for v in bbox]
            w = max(1.0, x2 - x1)
            h = max(1.0, y2 - y1)
            return (w / h) > 1.4
        except Exception:
            return False