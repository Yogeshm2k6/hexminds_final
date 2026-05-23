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

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome | ✅ Full support (recommended) |
| Edge | ✅ Full support |
| Firefox | ✅ Mostly supported |
| Safari | ⚠️ Camera may need extra permissions |
| Mobile browsers | ⚠️ Not optimized |
