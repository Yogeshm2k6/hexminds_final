# Setup Guide — HexaMinds

## Quickest Way (30 seconds)

1. Download or clone this repo
2. Double-click `exam.html`
3. Allow camera when browser asks
4. Done ✅

---

## If Camera Doesn't Work

Browsers block camera access on `file://` URLs in some cases.  
Fix: serve the file locally using Python or Node.

**Python (recommended):**
```bash
cd hexaminds-proctoring-system
python -m http.server 8000
```
Then open: `http://localhost:8000/exam.html`

**Node.js:**
```bash
npx serve .
```
Then open the URL it gives you.

---

## Admin Credentials

| Field | Value |
|-------|-------|
| Username | `hexaminds` |
| Password | `hexaminds123` |

---

## How Student Flow Works

1. Open `exam.html`
2. Click **Student** → **Register**
3. Fill name, date of birth, college
4. Allow camera → position face → click **Capture & Register Face**
5. Go back to **Login** → enter name + DOB
6. Dashboard shows available exams
7. Click **Start Exam** or enter exam code

---

## How Admin Flow Works

1. Open `exam.html`
2. Click **Admin** → **Login**
3. Enter credentials above
4. Use sidebar to navigate:
   - **Dashboard** — overview stats
   - **Students** — registered students list
   - **Violations** — all violations with photo evidence
   - **Exams** — manage exams
   - **Reports** — export PDFs
   - **Live Monitor** — real-time student monitoring

---

## Creating an Exam (Admin)

1. Go to **Exams** in admin sidebar
2. Click **Create Exam**
3. Fill title, duration, questions
4. Share the exam code with students

---

## Data Storage

All data is stored in **browser localStorage**.  
This means:
- Data persists across sessions on the same browser
- Data does NOT sync across different devices/browsers
- Clearing browser data will reset everything

For a production version, a backend (Firebase/Supabase) would be needed.

---

## Real-time Facial Biometric Verification (InsightFace + ArcFace)

HexaMinds integrates state-of-the-art **InsightFace + ArcFace** deep feature embedding (512-D vectors) with **OpenCV** and multi-modal **Anti-Spoofing / Liveness Detection**.

### 1. Install Requirements
```bash
pip install -r backend/requirements.txt
```

### 2. Start Biometrics Engine (Port 5000)
```bash
python backend/biometrics_service.py
```
*Model weights (`buffalo_sc`) are cached automatically in `~/.insightface/models/` for sub-second startup.*

### 3. How Verification Works
- **Registration**: Student takes a profile photo during signup. The system extracts a 512-D ArcFace normalized embedding and stores it in `backend/embeddings_vault.json` linked to their Student ID.
- **Real-Time Proctoring**: During exams, the camera feeds frames every 1.2s to `/api/biometrics/verify`.
  - **Match Decision**: Computes normalized **Cosine Similarity** ($\cos(\theta)$). If similarity $\ge 0.52$, access is **ALLOWED** with a live HUD percentage badge.
  - **Impersonation**: If a different person sits in front of the camera, access is **BLOCKED** and an impersonation violation is logged.
  - **Liveness / Anti-Spoofing**: Inspects high-frequency FFT screen moiré patterns, Laplacian sharpness, and micro-motion to block smartphone screen replays or printed photos.
  - **Multiple / No Faces**: Alerts immediately if $\ge 2$ faces appear or candidate leaves.
  - **Zero Downtime Fallback**: If the Python service is offline, the system transparently falls back to client-side biometrics without breaking the exam flow.

### 4. Configuration & Calibration
Adjust settings in `backend/biometrics_config.json`:
- `arcface_match_threshold`: Minimum cosine similarity for a match (default: `0.52`).
- `liveness_threshold`: Anti-spoofing confidence threshold (default: `0.55`).
- `consistency_frames`: Number of consecutive frames needed before state change (default: `3`).
- `service_port`: Port for Flask REST API (default: `5000`).

---

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full support (recommended) |
| Edge | ✅ Full support |
| Firefox | ✅ Mostly supported |
| Safari | ⚠️ Camera may need extra permissions |
| Mobile browsers | ⚠️ Not optimized |
