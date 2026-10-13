# Optional Models

Expected filenames (all optional — rule layer degrades gracefully if missing):

- yolov8n.pt        — person detection
- face_mask.pt      — mask / no-mask classifier (keremberke/yolov8m-face-mask-detection)
- weapon.pt         — weapon detector (Subh775/Weapon_Detection_YOLOv8)
- yolov8n-pose.pt   — pose keypoints for fight/climb/fall
- fire_smoke.pt     — optional fire/smoke detector

Without these, mask/weapon/fire/climb rules are skipped. Person, fall, pose fight still run when available.