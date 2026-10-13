class WeaponDetector:
    def __init__(self):
        self.available = False
        self.model = None
        try:
            from .model_registry import get
            self.model = get("weapon")
        except Exception as e:
            print(f"[WeaponDetector] error: {e}")
        if self.model is None:
            print("[WeaponDetector] model missing — skipping")
        else:
            self.available = True

    def detect(self, frame):
        if not self.available or self.model is None:
            return []
        try:
            res = self.model(frame, verbose=False, conf=0.4)
            out = []
            if res and res[0].boxes is not None:
                for b in res[0].boxes:
                    out.append({
                        "bbox": [float(v) for v in b.xyxy[0].tolist()],
                        "class_id": int(b.cls[0]),
                        "confidence": float(b.conf[0]),
                    })
            return out
        except Exception:
            return []