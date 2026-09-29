"""
HexaMinds Facial Biometrics Verification Service
Powered by InsightFace (ArcFace 512-D Embeddings) + OpenCV + Anti-Spoofing
"""

import os
import json
import base64
import time
import numpy as np
import cv2
import hashlib
from flask import Flask, request, jsonify
from flask_cors import CORS
import insightface
from insightface.app import FaceAnalysis

from liveness import LivenessDetector

# Flask app initialization
app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "biometrics_config.json")
VAULT_FILE = os.path.join(BASE_DIR, "embeddings_vault.json")
ENV_FILE = os.path.join(os.path.dirname(BASE_DIR), ".env")

# Default Configuration
config = {
    "arcface_match_threshold": 0.52,
    "liveness_threshold": 0.55,
    "consistency_frames": 3,
    "max_allowed_faces": 1,
    "anti_spoofing_enabled": True,
    "service_port": 5000,
    "insightface_model_name": "buffalo_sc"
}

if os.path.exists(CONFIG_FILE):
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            config.update(json.load(f))
    except Exception as e:
        print(f"Error loading config: {e}")

# Load overrides from root .env if present
if os.path.exists(ENV_FILE):
    try:
        with open(ENV_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k, v = k.strip(), v.strip()
                if k == "ARCFACE_MATCH_THRESHOLD":
                    config["arcface_match_threshold"] = float(v)
                elif k == "LIVENESS_THRESHOLD":
                    config["liveness_threshold"] = float(v)
                elif k == "CONSISTENCY_FRAMES":
                    config["consistency_frames"] = int(v)
                elif k == "BIOMETRICS_SERVICE_PORT":
                    config["service_port"] = int(v)
        print("[OK] Loaded biometrics configuration overrides from root .env")
    except Exception as e:
        print(f"Notice reading .env: {e}")

# Load or Initialize Vault
embeddings_vault = {}
if os.path.exists(VAULT_FILE):
    try:
        with open(VAULT_FILE, "r", encoding="utf-8") as f:
            embeddings_vault = json.load(f)
        print(f"Loaded {len(embeddings_vault)} registered biometrics from vault.")
    except Exception as e:
        print(f"Error loading vault: {e}")
        embeddings_vault = {}


def save_vault():
    try:
        with open(VAULT_FILE, "w", encoding="utf-8") as f:
            json.dump(embeddings_vault, f, indent=2)
    except Exception as e:
        print(f"Error saving vault: {e}")


# Initialize InsightFace Engine (Pre-loaded Singleton with 640x640 detection)
print("Initializing InsightFace ArcFace Engine (det_size=640x640)...")
face_app = FaceAnalysis(
    name=config.get("insightface_model_name", "buffalo_sc"),
    providers=["CPUExecutionProvider"]
)
face_app.prepare(ctx_id=0, det_size=(640, 640))
print("InsightFace ArcFace Engine Ready!")

# Initialize Anti-Spoofing Liveness Detector
liveness_detector = LivenessDetector(liveness_threshold=config.get("liveness_threshold", 0.48))

# Temporal Session Decision Buffer for multi-frame consistency
# student_id -> list of {'status': 'MATCH'|'MISMATCH'|'SPOOF'|'NO_FACE'|'MULTI', 'sim': float, 'ts': float}
session_buffers = {}


def decode_base64_image(b64_string):
    """Decodes base64 string, data URL, or HTTP/HTTPS image URL to OpenCV BGR numpy array."""
    if not b64_string:
        return None
    if isinstance(b64_string, str) and (b64_string.startswith("http://") or b64_string.startswith("https://")):
        try:
            import urllib.request
            req = urllib.request.Request(b64_string, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                img_data = response.read()
                nparr = np.frombuffer(img_data, np.uint8)
                img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                return img
        except Exception as e:
            print(f"URL image decode error: {e}")
            return None
    if "," in b64_string:
        b64_string = b64_string.split(",")[1]
    try:
        raw_bytes = base64.b64decode(b64_string)
        nparr = np.frombuffer(raw_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Image decode error: {e}")
        return None


def cosine_similarity(vec_a, vec_b):
    """Computes normalized cosine similarity between two embedding vectors."""
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def compute_match_percentage(sim):
    """
    Calibrates raw ArcFace cosine similarity [-1.0, 1.0] to a standardized percentage [0%, 100%].
    - Impostor (< 0.20) -> 0% - 10%
    - Ambiguous (0.25 - 0.44) -> 15% - 49%
    - Verified match (0.45 - 0.70) -> 60% - 94%
    - High confidence (0.70+) -> 95% - 99.5%
    """
    if sim <= 0.15:
        return 0.0
    if sim >= 0.72:
        return round(min(99.5, 94.0 + (sim - 0.72) * 25.0), 1)
    if sim >= 0.45:
        pct = 60.0 + ((sim - 0.45) / (0.72 - 0.45)) * 34.0
        return round(float(pct), 1)
    else:
        pct = ((sim - 0.15) / (0.45 - 0.15)) * 59.0
        return round(float(pct), 1)


# =====================================================
# API ENDPOINTS
# =====================================================

@app.route("/api/biometrics/health", methods=["GET"])
def health():
    return jsonify({
        "status": "online",
        "engine": "InsightFace + ArcFace (512-D)",
        "opencv_version": cv2.__version__,
        "registered_students": len(embeddings_vault),
        "config": config
    })


@app.route("/api/biometrics/config", methods=["GET", "POST"])
def manage_config():
    global config
    if request.method == "POST":
        data = request.get_json() or {}
        config.update(data)
        liveness_detector.threshold = config.get("liveness_threshold", 0.55)
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            print(f"Error saving config: {e}")
        return jsonify({"success": True, "config": config})
    return jsonify(config)


@app.route("/api/biometrics/register", methods=["POST"])
def register_biometric():
    """
    Registers a student's face embedding linked to student_id.
    Payload: { student_id, name, image (base64) }
    """
    data = request.get_json() or {}
    student_id = str(data.get("student_id", "")).strip()
    name = str(data.get("name", "")).strip()
    img_b64 = data.get("image", "")

    if not student_id or not img_b64:
        return jsonify({"success": False, "error": "Missing student_id or image"}), 400

    frame_bgr = decode_base64_image(img_b64)
    if frame_bgr is None:
        return jsonify({"success": False, "error": "Invalid image payload"}), 400

    # Detect faces
    faces = face_app.get(frame_bgr)
    if len(faces) == 0:
        return jsonify({
            "success": False,
            "status": "NO_FACE",
            "error": "No face detected in enrollment frame. Position face clearly."
        }), 400

    if len(faces) > 1:
        return jsonify({
            "success": False,
            "status": "MULTIPLE_FACES",
            "error": f"Multiple faces detected ({len(faces)}). Exactly one person required."
        }), 400

    face = faces[0]

    # Anti-spoofing liveness check during registration
    if config.get("anti_spoofing_enabled", True):
        bbox = list(map(int, face.bbox))
        x1, y1, x2, y2 = max(0, bbox[0]), max(0, bbox[1]), min(frame_bgr.shape[1], bbox[2]), min(frame_bgr.shape[0], bbox[3])
        face_crop = frame_bgr[y1:y2, x1:x2]
        is_live, liveness_score, reason = liveness_detector.verify_liveness(face_crop, student_id)
        if not is_live:
            return jsonify({
                "success": False,
                "status": "SPOOF",
                "error": f"Anti-spoofing rejected enrollment: {reason} (Score: {liveness_score})"
            }), 400

    # Extract ArcFace 512-D embedding
    embedding = face.embedding.tolist()

    embeddings_vault[student_id] = {
        "student_id": student_id,
        "name": name,
        "embedding": embedding,
        "embedding_dim": len(embedding),
        "registered_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    save_vault()

    return jsonify({
        "success": True,
        "status": "REGISTERED",
        "student_id": student_id,
        "name": name,
        "embedding_dim": len(embedding),
        "message": "Biometric face embedding securely registered."
    })


# Cache for extracted profile photo embeddings
profile_embedding_cache = {}


@app.route("/api/biometrics/verify", methods=["POST"])
def verify_live():
    """
    Continuously verifies candidate face during live exam attendance or login check.
    Payload: { student_id, student_name, profile_image (base64 optional), image (base64) }
    Core Output: { status: 'ALLOW'|'BLOCK'|'SPOOF'|'MULTIPLE_FACES'|'NO_FACE'|'CALIBRATING', similarity, liveness_score, message }
    """
    data = request.get_json() or {}
    student_id = str(data.get("student_id", "")).strip()
    student_name = str(data.get("name", data.get("student_name", ""))).strip()
    img_b64 = data.get("image", "")
    profile_b64 = data.get("profile_image", "")
    is_single_frame = bool(data.get("single_frame", False) or data.get("mode") == "login")

    if not img_b64:
        return jsonify({"status": "ERROR", "message": "Missing live image frame"}), 400

    # 1. Resolve registered enrollment from vault
    enrolled = None
    if student_id and student_id in embeddings_vault:
        enrolled = embeddings_vault[student_id]
    elif student_id:
        # Check case-insensitive student_id or name
        for k, v in embeddings_vault.items():
            if k.lower() == student_id.lower() or v.get("name", "").lower() == student_id.lower():
                enrolled = v
                break

    if not enrolled and student_name:
        for k, v in embeddings_vault.items():
            if v.get("name", "").lower() == student_name.lower():
                enrolled = v
                break

    # 2. If profile_image is provided directly from client, extract 512-D embedding
    if profile_b64:
        cache_key = hashlib.md5(profile_b64[:300].encode("utf-8", errors="ignore")).hexdigest()
        if cache_key in profile_embedding_cache:
            profile_emb = profile_embedding_cache[cache_key]
            if not enrolled:
                enrolled = {"student_id": student_id or "live_student", "name": student_name, "embedding": profile_emb, "gallery": []}
            elif "embedding" not in enrolled:
                enrolled["embedding"] = profile_emb
        else:
            profile_bgr = decode_base64_image(profile_b64)
            if profile_bgr is not None:
                p_faces = face_app.get(profile_bgr)
                if len(p_faces) > 0:
                    profile_emb = p_faces[0].embedding.tolist()
                    profile_embedding_cache[cache_key] = profile_emb
                    if not enrolled:
                        enrolled = {"student_id": student_id or "live_student", "name": student_name, "embedding": profile_emb, "gallery": []}
                        if student_id:
                            embeddings_vault[student_id] = enrolled
                            save_vault()
                    elif "embedding" not in enrolled:
                        enrolled["embedding"] = profile_emb

    # 3. Fallback: if student_id or student_name has partial match in vault
    if not enrolled and (student_id or student_name):
        q_id = student_id.lower()
        q_name = student_name.lower()
        for k, v in embeddings_vault.items():
            vk = str(k).lower()
            vn = str(v.get("name", "")).lower()
            if (q_id and (q_id in vk or vk in q_id)) or (q_name and (q_name in vn or vn in q_name)):
                enrolled = v
                break

    # 4. Fallback: if vault has any registered students, fallback to latest enrolled student
    if not enrolled and len(embeddings_vault) > 0:
        enrolled = list(embeddings_vault.values())[-1]

    if not enrolled or "embedding" not in enrolled:
        return jsonify({
            "status": "UNREGISTERED",
            "is_match": False,
            "similarity": 0.0,
            "message": "No biometric profile found for candidate. Please provide profile_image or register first."
        }), 200

    reg_embedding = enrolled["embedding"]

    frame_bgr = decode_base64_image(img_b64)
    if frame_bgr is None:
        return jsonify({"status": "ERROR", "message": "Unable to decode video frame"}), 400

    # Run face detection on live camera frame
    faces = face_app.get(frame_bgr)
    num_faces = len(faces)

    # Initialize session buffer if needed
    sess_key = student_id or (enrolled.get("name") if enrolled else "default")
    if sess_key not in session_buffers:
        session_buffers[sess_key] = []
    buffer = session_buffers[sess_key]

    now = time.time()

    # Rule 1: No Face Detected
    if num_faces == 0:
        buffer.append({"status": "NO_FACE", "sim": 0.0, "ts": now})
        if len(buffer) > 8: buffer.pop(0)
        return jsonify({
            "status": "NO_FACE",
            "is_match": False,
            "similarity": 0.0,
            "liveness_score": 0.0,
            "faces_detected": 0,
            "message": "Candidate Absent: No face detected in frame."
        })

    # Rule 2: Multiple Faces Detected
    if num_faces > 1:
        buffer.append({"status": "MULTIPLE_FACES", "sim": 0.0, "ts": now})
        if len(buffer) > 8: buffer.pop(0)
        return jsonify({
            "status": "MULTIPLE_FACES",
            "is_match": False,
            "similarity": 0.0,
            "liveness_score": 0.0,
            "faces_detected": num_faces,
            "message": f"Multiple Faces Detected ({num_faces} people present). Verification Paused."
        })

    # Exactly 1 Face Detected
    face = faces[0]
    bbox = list(map(int, face.bbox))
    x1, y1, x2, y2 = max(0, bbox[0]), max(0, bbox[1]), min(frame_bgr.shape[1], bbox[2]), min(frame_bgr.shape[0], bbox[3])
    face_crop = frame_bgr[y1:y2, x1:x2]

    # Rule 3: Liveness & Anti-Spoofing
    is_live = True
    liveness_score = 1.0
    spoof_reason = ""
    if config.get("anti_spoofing_enabled", True):
        is_live, liveness_score, spoof_reason = liveness_detector.verify_liveness(face_crop, student_id)
        if not is_live:
            buffer.append({"status": "SPOOF", "sim": 0.0, "ts": now})
            if len(buffer) > 8: buffer.pop(0)
            return jsonify({
                "status": "SPOOF",
                "is_match": False,
                "similarity": 0.0,
                "liveness_score": liveness_score,
                "faces_detected": 1,
                "message": f"Spoof Detected: {spoof_reason} (Liveness: {round(liveness_score*100)}%)"
            })

    # Rule 4: ArcFace 512-D Cosine Similarity Matching with Gallery
    live_embedding = face.embedding.tolist()
    enrolled_gallery = enrolled.get("gallery", [])
    candidates = [reg_embedding] + enrolled_gallery
    similarities = [cosine_similarity(live_embedding, emb) for emb in candidates]
    sim = max(similarities) if similarities else 0.0

    match_threshold = float(config.get("arcface_match_threshold", 0.45))
    is_match = sim >= match_threshold
    match_pct = compute_match_percentage(sim)

    # Dynamic gallery adaptation: update gallery with high-confidence verified frames
    if sim >= 0.60 and len(enrolled_gallery) < 4:
        enrolled_gallery.append(live_embedding)
        enrolled["gallery"] = enrolled_gallery

    current_frame_status = "MATCH" if is_match else "MISMATCH"
    buffer.append({
        "status": current_frame_status,
        "sim": sim,
        "liveness": liveness_score,
        "ts": now
    })
    if len(buffer) > 8:
        buffer.pop(0)

    # Rule 5: Decision Resolution (Single-frame vs Multi-frame Temporal Smoothing)
    consistency_k = int(config.get("consistency_frames", 2))
    recent = buffer[-consistency_k:]
    match_count = sum(1 for f in recent if f["status"] == "MATCH")
    mismatch_count = sum(1 for f in recent if f["status"] == "MISMATCH")

    msg = ""
    if is_single_frame:
        # Immediate decision for explicit login or modal checks
        if is_match:
            final_status = "ALLOW"
            msg = f"Candidate Identity Verified: ArcFace Match {match_pct}%, Live Human"
        else:
            final_status = "BLOCK"
            msg = f"Identity Mismatch: ArcFace Match is {match_pct}%. Face does not match registered profile."
    else:
        # Continuous proctoring temporal smoothing
        if is_match or match_count >= 1:
            final_status = "ALLOW"
            msg = f"Candidate Identity Verified: ArcFace Match {match_pct}%, Live Human"
        elif mismatch_count >= consistency_k:
            final_status = "BLOCK"
            msg = f"Identity Mismatch (ArcFace Similarity: {match_pct}%). Person does not match enrolled student."
        else:
            final_status = "CALIBRATING"
            msg = f"Calibrating identity stream ({len(recent)}/{consistency_k} frames analyzed)..."

    print(f"[BIOMETRIC VERIFY] candidate={student_id or enrolled.get('name')}: sim={sim:.3f} ({match_pct}%), liveness={liveness_score:.2f} => {final_status}")

    return jsonify({
        "status": final_status,
        "is_match": is_match,
        "similarity": round(sim, 4),
        "match_percentage": match_pct,
        "liveness_score": liveness_score,
        "faces_detected": 1,
        "consistent_frames": match_count,
        "message": msg
    })


if __name__ == "__main__":
    port = int(config.get("service_port", 5000))
    print(f"Starting HexaMinds Biometrics Verification Server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
