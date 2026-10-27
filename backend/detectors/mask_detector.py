import os
import numpy as np

class MaskDetector:
    def __init__(self):
        self.available = False
        self.model = None
        try:
            from .model_registry import get
            self.model = get("mask")
        except Exception as e:
            print(f"[MaskDetector] error: {e}")
        if self.model is None:
            print("[MaskDetector] model missing — skipping (no alert)")
        else:
            self.available = True

    def has_mask(self, frame, person_bbox, conf=0.45):
        if not self.available or self.model is None:
            return True
        try:
            import cv2
            x1, y1, x2, y2 = [int(v) for v in person_bbox]
            h = max(1, y2 - y1)
            head_h = max(8, int(h * 0.4))
            head = frame[y1: y1 + head_h, x1:x2]
            if head.size == 0:
                return True
            res = self.model(head, verbose=False, conf=conf)
            if not res or res[0].boxes is None or len(res[0].boxes) == 0:
                return True
            # majority vote by best confidence class
            best = max(res[0].boxes, key=lambda b: float(b.conf[0]))
            cls = int(best.cls[0])
            # assume class 1 / "mask" means OK; any mask-less class counts as missing
            name = str(self.model.names.get(cls, "")).lower()
            if "no" in name or name in ("0",):
                return False
            return True
        except Exception:
            return True