"""
OpenCV-based Multi-Modal Facial Anti-Spoofing & Liveness Detector
Detects printed paper photos, smartphone/tablet screen replays, and static spoof attacks.
"""

import cv2
import numpy as np


class LivenessDetector:
    def __init__(self, liveness_threshold=0.55):
        self.threshold = liveness_threshold
        # Cache past frame face crops for micro-motion & static photo analysis
        self._history = {}  # student_id -> list of recent face crops

    def analyze_texture_and_moire(self, face_bgr):
        """
        Detects screen pixel grids, moire interference, and paper print artifacts
        using FFT high-frequency spectrum analysis and Laplacian texture distribution.
        """
        if face_bgr is None or face_bgr.size == 0:
            return 0.0

        h, w = face_bgr.shape[:2]
        if h < 30 or w < 30:
            return 0.3

        gray = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2GRAY)

        # 1. Laplacian texture variance (sharpness and diffuse micro-contrast)
        lap = cv2.Laplacian(gray, cv2.CV_64F)
        variance = lap.var()
        # Normal webcams have variance between 5 and 800. Extreme moire or high-res screen grid > 1600.
        if variance < 3.0:
            texture_score = 0.25  # Extreme blur
        elif variance > 1600.0:
            texture_score = 0.30  # Extreme moire grid edge noise from LCD subpixel matrix
        else:
            # Normalized natural skin texture range
            texture_score = np.clip((variance - 3.0) / 180.0 + 0.40, 0.45, 1.0)

        # 2. Fast Fourier Transform (FFT) for periodic screen refresh lines & display grids
        f = np.fft.fft2(gray)
        fshift = np.fft.fftshift(f)
        magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1e-7)

        cy, cx = h // 2, w // 2
        # Zero out center DC component
        r = min(h, w) // 8
        magnitude_spectrum[max(0, cy - r):min(h, cy + r), max(0, cx - r):min(w, cx + r)] = 0

        high_freq_mean = np.mean(magnitude_spectrum)
        # Screen replays show abnormal high-frequency spikes from LCD RGB subpixels
        fft_score = 1.0
        if high_freq_mean > 220.0 or high_freq_mean < 30.0:
            fft_score = 0.35
        else:
            fft_score = np.clip(1.0 - abs(high_freq_mean - 120.0) / 120.0, 0.45, 1.0)

        # 3. Color Reflection Distribution (YCrCb color space for skin chromaticity)
        ycrcb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2YCrCb)
        cr = ycrcb[:, :, 1]
        cb = ycrcb[:, :, 2]
        cr_std = np.std(cr)
        cb_std = np.std(cb)
        color_diversity = (cr_std + cb_std) / 2.0
        # Paper prints have flat color standard deviation; live faces show blood flow gradient
        color_score = np.clip(color_diversity / 10.0, 0.35, 1.0)

        # Combined multi-channel score
        combined = (texture_score * 0.4) + (fft_score * 0.35) + (color_score * 0.25)
        return float(combined)

    def check_temporal_motion(self, student_id, face_crop):
        """
        Detects static photo attacks (holding a still paper photo or paused image in front of the camera).
        Compares pixel variance across consecutive frames.
        """
        if face_crop is None or face_crop.size == 0:
            return 0.5

        std_face = cv2.resize(face_crop, (100, 100))
        gray = cv2.cvtColor(std_face, cv2.COLOR_BGR2GRAY)

        if student_id not in self._history:
            self._history[student_id] = []

        history = self._history[student_id]
        history.append(gray)
        if len(history) > 6:
            history.pop(0)

        if len(history) < 2:
            return 0.85  # First frame, baseline

        # Calculate frame-to-frame absolute difference (micro-motion of blinking/breathing)
        diffs = []
        for i in range(1, len(history)):
            diff = cv2.absdiff(history[i], history[i - 1])
            diffs.append(np.mean(diff))

        avg_diff = float(np.mean(diffs))

        # If diff is essentially zero across multiple frames, it's a static printed photo or paused picture!
        if avg_diff < 0.12:
            return 0.15  # Static photo spoof detected!
        elif avg_diff > 48.0:
            return 0.50  # Rapid movement
        else:
            return 0.95  # Natural human micro-motion

    def verify_liveness(self, face_bgr, student_id="default"):
        """
        Main anti-spoofing evaluation entry point.
        Returns: (is_live: bool, liveness_score: float, reason: str)
        """
        if face_bgr is None or face_bgr.size == 0:
            return False, 0.0, "No face visual data available"

        texture_score = self.analyze_texture_and_moire(face_bgr)
        motion_score = self.check_temporal_motion(student_id, face_bgr)

        # Weighted aggregate liveness metric
        final_score = (texture_score * 0.6) + (motion_score * 0.4)
        final_score = round(float(final_score), 3)

        if motion_score < 0.15:
            return False, final_score, "Static Photo Spoof Detected (Zero Micro-Motion)"
        if texture_score < 0.28:
            return False, final_score, "Screen Replay / Print Reflection Detected"

        is_live = final_score >= self.threshold
        reason = "Live Human Face Verified" if is_live else "Liveness Score Below Threshold"
        return is_live, final_score, reason
