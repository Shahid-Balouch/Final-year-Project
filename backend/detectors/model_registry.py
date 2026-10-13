"""Singleton model registry (additive — loads extras from backend/models/)."""

import os
import threading

_models = {}
_lock = threading.Lock()
_LOADED = False
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))


def load_all(device="cpu"):
    global _LOADED
    with _lock:
        if _LOADED:
            return _models
        _LOADED = True
        mapping = {
            "person": "yolov8n.pt",
            "mask": "face_mask.pt",
            "weapon": "weapon.pt",
            "pose": "yolov8n-pose.pt",
        }
        try:
            from ultralytics import YOLO
        except Exception as e:
            print(f"[ModelRegistry] ultralytics not available: {e}")
            return _models
        for alias, filename in mapping.items():
            path = os.path.join(_ROOT, filename)
            if not os.path.exists(path):
                print(f"[ModelRegistry] {filename} missing — alias '{alias}' disabled.")
                _models[alias] = None
                continue
            try:
                _models[alias] = YOLO(path)
                print(f"[ModelRegistry] loaded {alias}: {filename}")
            except Exception as e:
                print(f"[ModelRegistry] failed to load {alias} ({filename}): {e}")
                _models[alias] = None
        return _models


def get(alias):
    if not _LOADED:
        load_all()
    return _models.get(alias)


def all_models():
    if not _LOADED:
        load_all()
    return dict(_models)