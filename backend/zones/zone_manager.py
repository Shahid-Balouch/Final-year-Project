import os, json, threading
from datetime import datetime, time as dtime

try:
    from shapely.geometry import Point, Polygon
    _SHAPELY = True
except Exception:
    Point = None
    Polygon = None
    _SHAPELY = False
    print("shapely not installed — zones disabled. Install: pip install shapely")

BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
ZONES_JSON = os.path.join(BASE, "zones.json")
TEMPLATE = os.path.join(os.path.dirname(__file__), "zone_polygons.json")
os.makedirs(BASE, exist_ok=True)
_lock = threading.Lock()
_zones = {}
try:
    os.makedirs(BASE, exist_ok=True)
except Exception:
    pass

def _load_file(path):
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}

class ZoneManager:
    def __init__(self):
        self.zones = {}
        self.reload()

    def reload(self):
        with _lock:
            data = _load_file(ZONES_JSON)
            if not data:
                data = _load_file(TEMPLATE)
            self.zones = data or {}

    def locate(self, camera_id, x, y):
        if not _SHAPELY:
            return None
        cam = self.zones.get(str(camera_id)) or self.zones.get(camera_id)
        if not cam:
            # try any camera with matching key ending
            for k, v in self.zones.items():
                if str(k).endswith(str(camera_id)):
                    cam = v
                    break
        if not cam:
            return None
        camera_name = cam.get("name", str(camera_id))
        camera_type = cam.get("type", "company")
        zones = cam.get("zones", [])
        pt = Point(float(x), float(y))
        for z in zones:
            poly = z.get("polygon")
            if not poly or len(poly) < 3:
                continue
            try:
                pg = Polygon(poly)
                if pg.contains(pt):
                    z = dict(z)
                    z["camera_name"] = camera_name
                    z["camera_type"] = camera_type
                    return z
            except Exception:
                continue
        return None

    def is_after_hours(self, zone, now=None):
        if not zone:
            return False
        ah = zone.get("after_hours")
        if not ah:
            return False
        now = now or datetime.now().time()
        try:
            sh, sm = [int(v) for v in str(ah["start"]).split(":")]
            eh, em = [int(v) for v in str(ah["end"]).split(":")]
            start = dtime(sh, sm)
            end = dtime(eh, em)
            if start <= end:
                return start <= now <= end
            # overnight
            return now >= start or now <= end
        except Exception:
            return False