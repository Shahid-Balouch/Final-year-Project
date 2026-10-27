from collections import defaultdict, deque

LEFT_WRIST, RIGHT_WRIST, NOSE = 9, 10, 0

class FightDetector:
    def __init__(self):
        self.available = False
        self.model = None
        try:
            from .model_registry import get
            self.model = get("pose")
        except Exception as e:
            print(f"[FightDetector] error: {e}")
        if self.model is None:
            print("[FightDetector] model missing — skipping")
        else:
            self.available = True
        self.history = defaultdict(lambda: deque(maxlen=8))

    def _kp_xy(self, kps, idx):
        try:
            if kps is None:
                return None
            # kps shape: (1, 17, 3) or (17,3)
            arr = kps
            if hasattr(arr, "cpu"):
                arr = arr.cpu().numpy()
            arr = arr.reshape(-1, 3) if arr.ndim >= 2 else arr
            if idx >= len(arr):
                return None
            x, y, c = arr[idx]
            if c is None or float(c) < 0.3:
                return None
            return (float(x), float(y))
        except Exception:
            return None

    def analyze(self, frame, persons):
        # persons: list of {"track_id": int, "bbox": [...]}
        if not self.available or self.model is None:
            return {"fight": False, "involved_ids": [], "per_person": {}}
        involved = set()
        try:
            res = self.model(frame, verbose=False)
            boxes = []
            keypoint_list = []
            if res and res[0].boxes is not None:
                for i, b in enumerate(res[0].boxes):
                    boxes.append([float(v) for v in b.xyxy[0].tolist()])
                    kps = None
                    if res[0].keypoints is not None and i < len(res[0].keypoints.xy):
                        try:
                            kps = res[0].keypoints.data[i] if hasattr(res[0].keypoints, "data") else res[0].keypoints.xy[i]
                        except Exception:
                            kps = None
                    keypoint_list.append(kps)
            ids_by_box = {}
            for p in persons:
                x1, y1, x2, y2 = p["bbox"]
                cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
                best, best_d = None, 1e9
                for i, b in enumerate(boxes):
                    bx1, by1, bx2, by2 = b
                    bcx, bcy = (bx1 + bx2) / 2, (by1 + by2) / 2
                    d = (bcx - cx) ** 2 + (bcy - cy) ** 2
                    if d < best_d:
                        best_d, best = d, i
                ids_by_box[p["track_id"]] = best
            # store history by track_id where pose available
            for tid, pi in ids_by_box.items():
                if pi is None or pi >= len(keypoint_list):
                    continue
                kps = keypoint_list[pi]
                wrist = self._kp_xy(kps, LEFT_WRIST) or self._kp_xy(kps, RIGHT_WRIST)
                if wrist is not None:
                    self.history[tid].append(wrist)
            # heuristic: pairs close + fast wrist movement
            per = {p["track_id"]: {"in_fight": False} for p in persons}
            id_list = [p["track_id"] for p in persons]
            for ai in range(len(id_list)):
                for bi in range(ai + 1, len(id_list)):
                    ta, tb = id_list[ai], id_list[bi]
                    pa = next((p for p in persons if p["track_id"] == ta), None)
                    pb = next((p for p in persons if p["track_id"] == tb), None)
                    if pa is None or pb is None:
                        continue
                    a = pa["bbox"]; b = pb["bbox"]
                    acx, acy = (a[0]+a[2])/2, (a[1]+a[3])/2
                    bcx, bcy = (b[0]+b[2])/2, (b[1]+b[3])/2
                    if ((acx-bcx)**2 + (acy-bcy)**2) ** 0.5 > 120:
                        continue
                    fast = False
                    for tid in (ta, tb):
                        h = self.history.get(tid)
                        if h and len(h) >= 4:
                            if ((h[-1][0]-h[-4][0])**2+(h[-1][1]-h[-4][1])**2)**0.5 > 40:
                                fast = True
                    if fast:
                        involved.add(ta); involved.add(tb)
                        per[ta]["in_fight"] = True
                        per[tb]["in_fight"] = True
            return {"fight": bool(involved), "involved_ids": sorted(involved), "per_person": per}
        except Exception:
            return {"fight": False, "involved_ids": [], "per_person": {}}

    def forget(self, track_id):
        self.history.pop(track_id, None)