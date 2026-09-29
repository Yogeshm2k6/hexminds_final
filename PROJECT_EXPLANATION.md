# HexaMinds AI Proctoring System — Comprehensive Project Documentation & Architecture Guide

---

## 1. Executive Summary & Project Overview

**HexaMinds AI Proctoring System** is an enterprise-grade, privacy-compliant, multi-modal online examination and automated proctoring platform. Built to safeguard academic integrity in remote, hybrid, and on-premises digital assessments, HexaMinds utilizes real-time Computer Vision, Deep Learning Biometrics, and Client-Side Security Enforcement to detect, prevent, and log academic dishonesties with photographic and forensic proof.

### Primary Objectives:
- **Continuous Identity Verification:** Prevent proxy test-takers and candidate swapping using deep metric facial embeddings (InsightFace / ArcFace).
- **Multi-Modal Cheating Detection:** Detect multiple persons, candidate absence, cellphones/unauthorized electronic devices, gaze divergence, voice/audio anomalies, and background speech.
- **Client-Side Environment Lockdown:** Enforce full-screen mode, block tab switching, keyboard shortcuts (Alt+Tab, Ctrl+C/V/P), developer tools, and right-click menus.
- **Hierarchical Institutional Management:** Maintain college-wide departmental profiles, faculty staff assignments, and targeted exam delivery filtered by College, Department, and Academic Year.
- **Auditable Forensic Log:** Cloud-synced violation records with timestamped webcam snapshots stored in Cloudinary and synchronized via Firebase Firestore.

---

## 2. High-Level System Architecture

HexaMinds is engineered as a hybrid distributed system combining high-throughput client-side ML pipelines with a dedicated Python biometric microservice and scalable cloud services:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT BROWSER (PORT 8000)                            │
│                                                                                 │
│  ┌────────────────────────┐  ┌───────────────────────┐  ┌────────────────────┐  │
│  │   Student Exam Room    │  │   Live AI HUD Canvas  │  │  Admin & Proctor   │  │
│  │  - Fullscreen Lock     │  │  - 60 FPS Cyber Bounding│ │   Dashboard       │  │
│  │  - Question Navigator  │  │    Box & Landmark Dots│  │  - Live Monitoring │  │
│  │  - Audio Waveform Vis  │  │  - Scanline Sweep     │  │  - Violation Feed  │  │
│  │  - Anti-DevTools Guard │  │  - Real-time HUD stats│  │  - Staff & Dept Mgr│  │
│  └───────────┬────────────┘  └───────────┬───────────┘  └─────────┬──────────┘  │
│              │                           │                        │             │
│              ▼                           ▼                        ▼             │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │             Client-Side Inference & Proctoring Core (TensorFlow.js)        │  │
│  │   • BlazeFace: Real-time candidate face tracking & facial landmark coords │  │
│  │   • COCO-SSD: Unauthorized device & mobile phone object detection         │  │
│  │   • Web Audio API: Ambient noise & speech energy anomaly analyzer         │  │
│  │   • EMA Filter: Exponential Moving Average head pose/gaze stabilizer      │  │
│  └──────────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────────┼───────────────────────────────────────┘
                                          │
                  ┌───────────────────────┼───────────────────────┐
                  ▼                       ▼                       ▼
   ┌─────────────────────────────┐ ┌───────────────┐ ┌─────────────────────────┐
   │ Python Biometrics Service   │ │   Firebase    │ │  Cloudinary Storage     │
   │      (Port 5000)            │ │   Firestore   │ │                         │
   │ • InsightFace / ArcFace 512d│ │ • Exam configs│ │ • Candidate face photos │
   │ • Anti-Spoofing Liveness    │ │ • Submissions │ │ • Violation snapshots   │
   │ • Cosine Distance Matching  │ │ • Violations  │ │ • Exam session videos   │
   └─────────────────────────────┘ └───────────────┘ └─────────────────────────┘
```

---

## 3. Core Modules & Feature Breakdown

### 3.1 Student Portal & Examination Engine
1. **Biometric Face Enrollment & Pre-Check:**
   - Captures candidate face snapshot during registration.
   - Extracts 512-dimensional facial embedding vectors.
   - Validates baseline lighting, camera angle, and facial visibility before exam commencement.
2. **Targeted Exam Access:**
   - Filters accessible examinations based on Student's **College**, **Department**, and **Academic Year** (e.g. Computer Science · 1st Year).
   - Supports 6-character secure Exam Access Join Codes.
3. **Live Exam Room & Question Navigator:**
   - Timed multiple-choice assessment UI with dynamic progress indicator (`#ans-bar`) and real-time question status mapping (Answered, Unanswered, Current).
   - Audio waveform visualizer rendering ambient microphone audio levels in real time.
4. **Active Violation Escalation System:**
   - 2-Strike Violation Policy: Candidate receives visual warning alerts with photographic evidence upon first infractions.
   - Auto-Submit Trigger: Automatically terminates and submits the exam upon critical infractions (e.g. mobile phone detected, prolonged impersonation, repeated tab-switch violations).

---

### 3.2 Continuous AI Proctoring & Face Tracking Engine
1. **Continuous 60 FPS Live HUD Canvas (`<canvas id="cam-face-hud">`):**
   - High-tech cyber bounding box tracking the student's face continuously in real time.
   - 4-corner targeted reticles, facial landmarks (eyes, nose, mouth), animated laser scanline sweep, and real-time frame telemetry ticker (`#hudFrameCount · [hh:mm:ss]`).
2. **Head Pose & Gaze Estimation (EMA Stabilized):**
   - Estimates head tilt and yaw using eye-to-nose aspect ratios ($NoseRatio = \frac{|x_{nose} - x_{leftEye}|}{|x_{nose} - x_{rightEye}|}$).
   - Employs Exponential Moving Average (EMA) smoothing ($\alpha = 0.25$) to eliminate eyeball jitter while detecting genuine diverted gazes (Looking Left, Right, Down, Up).
3. **Object & Phone Detection:**
   - COCO-SSD MobileNet model scanning every frame for unauthorized handheld items (`cell phone`, `tablet`, `book`, `laptop`).
4. **Continuous Biometric Identity Verification:**
   - Non-blocking asynchronous checks against `/api/biometrics/verify` every 750ms with a 1200ms `AbortController` timeout to prevent UI lag.
   - Compares live video frame against enrolled reference photo, calculating exact match percentages (e.g. `✓ Live Match (96%) · #14`).

---

### 3.3 Institutional Admin & Proctoring Hub
1. **Live Candidate Proctoring Grid:**
   - Real-time multi-candidate monitoring grid showing student webcam feeds, suspicion scores (0-100), active violation tallies, and network statuses.
2. **Forensic Violation Log:**
   - Comprehensive table detailing violation type, timestamp, candidate identity, severity level (`high`, `medium`, `low`), and instant photo proof previews.
3. **Cohort-Targeted Exam Publisher:**
   - Enables admins and faculty to author tests with custom question sets, time limits, negative marking schemes, and strict target audience filters (College, Department, Year).
4. **Staff Management Module (`renderAStaff`):**
   - Add, edit, search, and manage faculty invigilators, assigned departments, email credentials, and proctoring role permissions.
5. **Department Profile Management (`renderADepartments`):**
   - Manage institutional departments (e.g. Computer Science, Electrical Engineering, Mechanical, MBA), faculty count, student intake capacity, and active exam listings.
6. **Manual Evaluation & Grade Book (`renderAEvaluate`):**
   - Dedicated interface for grading subjective answers, reviewing candidate submission histories, and releasing proctor-verified report cards.

---

## 4. Anti-Cheating & System Security Suite

| Security Mechanism | Implementation Details | Action on Violation |
|---|---|---|
| **Full-Screen Enforcement** | Browser Fullscreen API with active listener for `fullscreenchange`. | Displays fullscreen re-entry modal, logs strike. |
| **Tab / Window Switching** | `document.visibilitychange` and `window.onblur` event monitoring. | Suspicion score penalty (+15), logs snapshot. |
| **Clipboard & Key Blocking** | Event interceptors blocking `contextmenu`, `copy`, `paste`, `cut`, `F12`, `Ctrl+Shift+I`, `Alt+Tab`. | Key combination blocked; instant alert shown. |
| **Mobile Phone Detection** | COCO-SSD detection bounding box with confidence threshold $\ge 0.35$. | Critical violation; initiates 5s auto-submit countdown. |
| **Face Impersonation** | InsightFace ArcFace Euclidean/Cosine distance comparison ($\ge 0.52$). | Impersonation alarm; candidate blocked after 2 consecutive frames. |
| **Spoof / Replay Defense** | Multi-frame frequency and texture variance liveness analyzer. | Printed photo / phone screen playback rejected. |
| **Multi-Person Presence** | BlazeFace consensus > 1 face within frame. | Amber warning box rendered on all extra persons; logs strike. |

---

## 5. Technology Stack & Key Dependencies

### Frontend:
- **Vanilla HTML5 & ES6+ Javascript:** Modular architecture (`js/patches.js`, `js/auth.js`, `js/student.js`, `js/admin.js`, `js/camera.js`, `js/proctor.js`).
- **Styling:** Custom Cyberpunk / Modern Dark Glassmorphic Design System with CSS variables and responsive layout tokens (`css/style.css`, `css/cyber-hud.css`).
- **In-Browser Machine Learning:**
  - `@tensorflow/tfjs` (v3.18.0)
  - `@tensorflow-models/blazeface` (v0.0.7)
  - `@tensorflow-models/coco-ssd` (v2.2.2)

### Backend & Cloud Services:
- **Python Flask Biometrics Microservice:** `backend/biometrics_service.py` (Port 5000)
  - `insightface` (ArcFace 512-d feature extraction)
  - `onnxruntime` / `opencv-python`
  - `numpy`, `scipy`
- **Database & State Synchronization:** Firebase Firestore SDK (v9 compat) for real-time exam schedules, student records, and violation archives.
- **Media Cloud Storage:** Cloudinary REST API for secure upload and persistent hosting of candidate avatars, webcam audit photos, and session recordings.

---

## 6. Directory Structure

```
hexaminds-proctoring-system/
├── .env                              # Environment variables (Firebase, Cloudinary, Backend config)
├── index.html                        # Application entry point & primary portal container
├── exam.html                         # Dedicated standalone candidate exam room
├── package.json                      # Project metadata & developer scripts
├── README.md                         # Quick-start summary
├── SETUP.md                          # Step-by-step installation instructions
├── PROJECT_EXPLANATION.md            # Complete architecture & technical explanation (This file)
├── backend/
│   ├── biometrics_service.py         # Python Flask ArcFace biometric & anti-spoofing engine
│   └── requirements.txt              # Python package dependencies
├── css/
│   ├── style.css                     # Global design tokens, layouts, and components
│   └── cyber-hud.css                 # HUD canvas animations, corner reticles, and pulse styles
└── js/
    ├── patches.js                    # Core architectural enhancements, HUD renderer, continuous ML
    ├── state.js                      # Global state variables, mock datasets, and storage helpers
    ├── auth.js                       # Student registration, face capture, and credential management
    ├── student.js                    # Student dashboard, exam catalog, and question renderer
    ├── admin.js                      # Admin dashboard, proctor grid, violation feeds, and analytics
    ├── camera.js                     # WebRTC getUserMedia handlers and TF.js model initializers
    ├── proctor.js                    # Client-side violation handlers, suspicion scoring, auto-submit
    └── firebase-cloudinary.js        # Firestore sync listeners and Cloudinary direct upload integration
```

---

## 7. Configuration & Environment Variables (`.env`)

Create or modify the `.env` file in the root directory:

```env
# Cloudinary Media Storage Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Firebase Firestore Configuration
FIREBASE_API_KEY=your_firebase_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id

# Python Biometrics Engine Backend
BIOMETRICS_SERVICE_PORT=5000
BIOMETRICS_SERVICE_URL=http://127.0.0.1:5000
ARCFACE_MATCH_THRESHOLD=0.52
```

---

## 8. Setup & Execution Guide

### Step 1: Start the Python Biometrics Microservice
Open a terminal in the project directory:
```bash
cd backend
pip install -r requirements.txt
python biometrics_service.py
```
*Service starts on `http://127.0.0.1:5000` with status health check at `/health`.*

### Step 2: Launch the Frontend Web Server
Open a second terminal in the root directory:
```bash
python -m http.server 8000
```
*Access the platform in your browser at `http://localhost:8000`.*

### Step 3: Default Credentials for Testing

| Role | Username / ID | Password / Access Key | Notes |
|---|---|---|---|
| **Admin Portal** | `admin` | `admin123` | Full control over Exams, Staff, Departments, and Violations |
| **Student Portal** | `Aarav Sharma` | DOB: `2004-05-12` | Pre-configured enrolled student (Computer Science · 1st Year) |
| **Exam Join Code** | `CS101` | *N/A* | Target: Computer Science / 1st Year |

---

## 9. API Reference (Biometrics Microservice)

### `POST /api/biometrics/verify`
Performs continuous 1-to-1 candidate face verification and liveness verification.

**Request Payload:**
```json
{
  "student_id": "HM-STU-1001",
  "name": "Aarav Sharma",
  "profile_image": "data:image/jpeg;base64,...",
  "image": "data:image/jpeg;base64,..."
}
```

**Response Payload:**
```json
{
  "status": "ALLOW",
  "is_match": true,
  "similarity": 0.894,
  "match_percentage": 96,
  "faces_detected": 1,
  "message": "Candidate biometric identity verified successfully."
}
```

---

## 10. Summary of Key Strengths

1. **True Continuous Real-Time Tracking:** Face detection, gaze stabilization, and biometric identity matching execute on every live frame cycle without blocking or pausing.
2. **Resilient Offline Fallback:** Seamlessly degrades to client-side descriptor matching if the Python biometrics service is temporarily unreachable.
3. **Zero-Plugin Architecture:** Runs 100% inside modern web browsers (Chrome, Edge, Firefox) using standard Web APIs (WebRTC, Web Audio API, Canvas 2D, WebGL).
4. **Forensic Audit Readiness:** Full audit logs featuring high-resolution incident snapshots and tamper-resistant timestamps for academic review boards.
