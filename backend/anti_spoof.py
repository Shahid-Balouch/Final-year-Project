"""Basic anti-spoofing / liveness check utility.

Uses OpenCV Laplacian variance on a cropped face image to detect whether the
face is likely a live person or a flat reproduction (printed photo / screen).
A low Laplacian variance indicates a blurry / flat image which is typical of
spoof attempts.

This is a heuristic, not a guarantee. Tune LAPLACIAN_THRESHOLD based on your
camera quality and deployment environment.
"""
import cv2
import numpy as np

# Faces with Laplacian variance below this are treated as spoof attempts.
# Typical live faces: > 100. Printed photo / phone screen: often < 50.
LAPLACIAN_THRESHOLD = 80.0


def check_liveness(face_crop: np.ndarray, threshold: float = LAPLACIAN_THRESHOLD) -> tuple[bool, float]:
    """Return (is_real: bool, variance: float).

    If variance < threshold, is_real = False (likely spoof).
    """
    if face_crop is None or face_crop.size == 0:
        return False, 0.0

    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    # Resize small for speed; Laplacian is scale-invariant enough here.
    gray = cv2.resize(gray, (160, 160))
    variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    is_real = variance >= threshold
    return is_real, variance
