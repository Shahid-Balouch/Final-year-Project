class PersonTracker:
    def track(self, frame):
        try:
            from . import model_registry as mr
            mr.load_all()
            model = mr.get("person")
            if model is None:
                try:
                    from ultralytics import YOLO
                    import os
                    p = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model", "S2 Model", "best.pt"))
                    model = YOLO(p) if os.path.exists(p) else None
                except Exception:
                    model = None
            if model is None:
                return []
            res = model.track(frame, persist=True, classes=[0], tracker="bytetrack.yaml", verbose=False)
            out = []
            if res and res[0].boxes is not None and res[0].boxes.id is not None:
                for b, tid in zip(res[0].boxes, res[0].boxes.id):
                    out.append({
                        "track_id": int(tid.item()),
                        "bbox": [float(v) for v in b.xyxy[0].tolist()],
                        "confidence": float(b.conf[0]),
                    })
            return out
        except Exception as e:
            print(f"[PersonTracker] error: {e}")
            return []