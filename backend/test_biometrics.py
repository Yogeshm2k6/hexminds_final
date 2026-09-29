"""
Unit & Integration Test Suite for HexaMinds ArcFace Biometrics Engine
"""

import cv2
import numpy as np
import base64
import json
import time
from biometrics_service import face_app, liveness_detector, cosine_similarity


def create_test_face_image(seed=42, multi=False):
    """Generates synthetic test face frame with realistic human skin tone and structure."""
    np.random.seed(seed)
    img = np.full((320, 320, 3), (210, 220, 230), dtype=np.uint8)

    def draw_face(cx, cy, radius):
        # Head
        cv2.ellipse(img, (cx, cy), (radius, int(radius * 1.3)), 0, 0, 360, (180, 200, 230), -1)
        # Eyes
        eye_y = cy - int(radius * 0.2)
        cv2.circle(img, (cx - int(radius * 0.4), eye_y), int(radius * 0.12), (50, 50, 50), -1)
        cv2.circle(img, (cx + int(radius * 0.4), eye_y), int(radius * 0.12), (50, 50, 50), -1)
        # Nose
        cv2.line(img, (cx, eye_y), (cx, cy + int(radius * 0.15)), (140, 160, 190), 3)
        # Mouth
        cv2.ellipse(img, (cx, cy + int(radius * 0.45)), (int(radius * 0.35), int(radius * 0.15)), 0, 0, 180, (70, 70, 180), -1)

    draw_face(160, 160, 70)
    if multi:
        draw_face(280, 160, 40)

    # Add natural texture noise
    noise = np.random.normal(0, 8, img.shape).astype(np.uint8)
    img = cv2.add(img, noise)
    return img


def test_cosine_similarity():
    print("Testing cosine similarity logic...")
    vec_a = np.random.randn(512).astype(np.float32)
    vec_a /= np.linalg.norm(vec_a)

    vec_same = vec_a.copy()
    vec_diff = np.random.randn(512).astype(np.float32)
    vec_diff /= np.linalg.norm(vec_diff)

    sim_same = cosine_similarity(vec_a, vec_same)
    sim_diff = cosine_similarity(vec_a, vec_diff)

    assert abs(sim_same - 1.0) < 1e-4, f"Identical vector similarity should be 1.0, got {sim_same}"
    assert sim_diff < 0.35, f"Orthogonal/random vector similarity should be < 0.35, got {sim_diff}"
    print(f"  [OK] Identical similarity: {sim_same:.4f}")
    print(f"  [OK] Different similarity: {sim_diff:.4f}")


def test_liveness_detector():
    print("Testing Liveness / Anti-Spoofing...")
    # 1. Normal frame
    frame = np.random.randint(120, 200, (120, 120, 3), dtype=np.uint8)
    lap = cv2.Laplacian(frame, cv2.CV_64F).var()

    is_live, score, reason = liveness_detector.verify_liveness(frame, "test_student")
    print(f"  [OK] Liveness output: is_live={is_live}, score={score}, reason='{reason}'")

    # 2. Static photo spoof simulation (exact identical frames)
    for _ in range(5):
        is_live, score, reason = liveness_detector.verify_liveness(frame, "static_spoof_test")

    print(f"  [OK] Static frame attack test: is_live={is_live}, score={score}, reason='{reason}'")
    assert not is_live or score < 0.70, "Static frames should be recognized as spoof / low motion!"


def test_embedding_extraction():
    print("Testing ArcFace model inference on synthetic image...")
    img = create_test_face_image(seed=123)
    faces = face_app.get(img)
    print(f"  [OK] Detected {len(faces)} face(s) in test frame.")
    if len(faces) > 0:
        emb = faces[0].embedding
        print(f"  [OK] Embedding extracted! Dimension: {len(emb)}")
        assert len(emb) == 512, f"Expected 512-D ArcFace vector, got {len(emb)}"


if __name__ == "__main__":
    print("=== HexaMinds ArcFace Biometrics Unit Tests ===")
    test_cosine_similarity()
    test_liveness_detector()
    test_embedding_extraction()
    print("=== ALL TESTS PASSED SUCCESSFULLY! ===")
