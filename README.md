# HexaMinds — AI-Powered Exam Proctoring System

> Secure, browser-native exam proctoring using real-time AI face detection, object detection, and behavioral analysis. No installations, no plugins — runs entirely in the browser.

🚀 **[Live Demo](https://yedakenishanth.github.io/hexaminds-proctoring-system/)** | 📄 **[Setup Guide](SETUP.md)**

---

## What It Does

HexaMinds is a full-featured AI proctoring system built for colleges and institutions. It monitors students during online exams in real time and automatically flags or submits exams when violations are detected.

### Student Side
- Face enrollment with live camera capture
- Real-time suspicion scoring (Low → Medium → High)
- Automatic exam submission on critical violations
- Clean exam interface with timer

### AI Monitoring (runs 100% in browser)
- **Face detection** — alerts if no face or multiple faces detected
- **Object detection** — detects mobile phones (auto-submits instantly)
- **Look-away detection** — warns when student looks away from screen
- **Tab switch detection** — logs and alerts on window blur / alt-tab
- **DevTools blocking** — prevents F12, Ctrl+Shift+I, right-click during exam

### Admin Side
- Command center dashboard with live student monitoring
- Per-student violation logs with photo evidence captured at moment of violation
- Suspicion score tracking per student
- PDF export of violation reports and audit logs
- Login history tracking

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| AI - Face Detection | TensorFlow.js + BlazeFace |
| AI - Object Detection | TensorFlow.js + COCO-SSD |
| PDF Generation | jsPDF |
| Storage | localStorage (browser-native) |
| Fonts | DM Sans, JetBrains Mono (Google Fonts) |

**No backend. No server. No installation required.**  
Everything runs client-side in the browser.

---

## Features At A Glance

| Feature | Details |
|---------|---------|
| Face enrollment | Students register face on first login |
| Live camera monitor | Shown to student during exam |
| Suspicion score | Dynamic 0–100 score, updates in real time |
| Multiple faces | Instant auto-submit |
| No face detected | Warning → auto-submit on 2nd occurrence |
| Mobile phone detected | Auto-submit with countdown (64%+ AI confidence) |
| Tab switch / window blur | Logged as high violation, auto-submit at 5 violations |
| Look away warning | Medium severity, logged |
| Copy/paste/right-click | Blocked during exam |
| Admin live monitor | See all students + their suspicion scores live |
| Violation photo evidence | Camera frame captured at exact moment of violation |
| PDF reports | Export violation report + audit log as PDF |

---

## Screenshots

### Student Registration
![Registration](screenshots/registration.png)

### Face Enrollment
![Face Enrollment](screenshots/face-enrollment.png)

### Student Dashboard
![Dashboard](screenshots/dashboard.png)

### Exam Interface — Normal State
![Exam Normal](screenshots/exam-normal.png)

### Tab Switch Detected
![Tab Switch](screenshots/tab-switch.png)

### Mobile Phone Detected — Auto Submitting
![Phone Detected](screenshots/phone-detected.png)

### Look Away Warning
![Look Away](screenshots/look-away.png)

---

## How To Run

### Option 1 — Live Demo (Recommended)
👉 **[yedakenishanth.github.io/hexaminds-proctoring-system](https://yedakenishanth.github.io/hexaminds-proctoring-system/)**

### Option 2 — Run Locally

1. **Clone the repo**
   ```bash
   git clone https://github.com/yedakenishanth/hexaminds-proctoring-system.git
   cd hexaminds-proctoring-system
   ```

2. **Serve locally** (camera requires localhost or https)
   ```bash
   python -m http.server 8000
   # then open http://localhost:8000
   ```

3. **Allow camera access** when the browser asks

4. **Student login**: Register with your name, DOB, college → capture face → join exam

5. **Admin login**:
   - Username: `hexaminds`
   - Password: `hexaminds123`

---

## Project Structure

```
hexaminds-proctoring-system/
│
├── index.html             # Main HTML entry point
├── css/
│   └── styles.css         # All application styles
├── js/
│   ├── state.js           # Global state variables
│   ├── data.js            # Demo data / pre-populated students
│   ├── particles.js       # Login background + waveform animation
│   ├── suspicion.js       # Suspicion score system
│   ├── auth.js            # Login + face verification
│   ├── violations.js      # Violation logging system
│   ├── student.js         # Student navigation + pages
│   ├── exam.js            # Exam render + timer + submit
│   ├── camera.js          # Camera + BlazeFace + COCO-SSD
│   ├── proctor.js         # Exam monitoring + auto-submit
│   ├── storage.js         # Persistent storage
│   ├── admin.js           # Admin dashboard + PDF generation
│   └── patches.js         # Enhanced features + fixes
├── screenshots/           # README screenshots
├── README.md              # This file
├── SETUP.md               # Detailed setup guide
├── LICENSE                # MIT License
└── .gitignore             # Git ignore rules
```

---

## Why I Built This

During COVID and post-COVID online exams, our college used third-party proctoring tools that were expensive, required downloads, and were often unfair to students with slow internet. I wanted to build something that:

- Works entirely in the browser — no software to install
- Uses real AI models (not just rule-based hacks)
- Gives transparent feedback to students in real time
- Gives professors a proper admin dashboard with evidence

---

## What I Learned

- How to run TensorFlow.js models (BlazeFace + COCO-SSD) in the browser without any backend
- Real-time video frame analysis using canvas + requestAnimationFrame
- Managing complex state in vanilla JS without a framework
- Browser security APIs (visibility change, window blur, keyboard blocking)
- Generating PDF reports with jsPDF including embedded images

---

## Future Improvements

- [ ] Firebase/Supabase backend for persistent multi-device data
- [ ] Real face recognition (not just detection) for identity verification
- [ ] Audio monitoring for unusual sounds
- [ ] Admin real-time dashboard with WebSockets
- [ ] Mobile responsive design

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Built By

**Nishanth Yedake** — [RNSIT](https://www.rnsit.ac.in)  
Connect on [LinkedIn](https://www.linkedin.com/in/nishanth-yedake-69349a37b) | [GitHub](https://github.com/yedakenishanth)

---

> ⭐ If you found this useful or interesting, consider starring the repo!
