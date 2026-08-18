/* =====================================================
   HEXAMINDS — PERSISTENT STORAGE
   Stores: violation photos, login history, session data
   Backed by Firebase Firestore & Cloudinary Media Storage
===================================================== */

/* In-memory DB (backed exclusively to Firestore) */
var HM_DB = {
  loginHistory: [],   /* [{name, college, device, ip, time, date, photo}] */
  violations: [],     /* [{student, time, date, type, severity, desc, photo, exam}] */
  removedStudents: [], /* [name] — admins can hide these from recents */
  submissions: []
};

function saveHMDB() {
  /* Sync to Firestore individual collections */
  if (typeof firebaseSyncDb === 'function') firebaseSyncDb();
}

/* Record a login event */
function recordLoginHistory(student, photo) {
  if (!HM_DB.loginHistory) HM_DB.loginHistory = [];
  var entry = {
    id: Date.now(),
    name: student.name,
    college: student.college,
    dob: student.dob,
    time: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString(),
    fullTimestamp: new Date().toISOString(),
    device: getDeviceInfo(),
    photo: photo || null /* profile snapshot taken at login */
  };
  HM_DB.loginHistory.unshift(entry);
  if (HM_DB.loginHistory.length > 200) HM_DB.loginHistory = HM_DB.loginHistory.slice(0, 200);
  saveHMDB();

  // Sync to Firestore login_history collection & upload photo if base64
  if (typeof firebaseSaveLoginEntry === 'function') {
    firebaseSaveLoginEntry(entry);
  }
  return entry;
}

/* Record a violation with photo persistently */
function recordPersistentViolation(studentName, violation) {
  if (!HM_DB.violations) HM_DB.violations = [];
  var entry = {
    id: Date.now(),
    student: studentName,
    type: violation.type,
    severity: violation.severity,
    desc: violation.desc,
    exam: violation.exam || 'Active Exam',
    time: violation.time || new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString(),
    fullTimestamp: new Date().toISOString(),
    photo: violation.photo || null
  };
  HM_DB.violations.unshift(entry);
  if (HM_DB.violations.length > 500) HM_DB.violations = HM_DB.violations.slice(0, 500);
  saveHMDB();

  // Sync to Firestore violations collection & upload photo if base64
  if (typeof firebaseSaveViolationEntry === 'function') {
    firebaseSaveViolationEntry(entry);
  }
}

function getDeviceInfo() {
  var ua = navigator.userAgent;
  var browser = ua.indexOf('Chrome') > -1 ? 'Chrome' : ua.indexOf('Firefox') > -1 ? 'Firefox' : ua.indexOf('Safari') > -1 ? 'Safari' : ua.indexOf('Edge') > -1 ? 'Edge' : 'Browser';
  var os = ua.indexOf('Win') > -1 ? 'Windows' : ua.indexOf('Mac') > -1 ? 'macOS' : ua.indexOf('Linux') > -1 ? 'Linux' : ua.indexOf('Android') > -1 ? 'Android' : ua.indexOf('iPhone') > -1 ? 'iOS' : 'Unknown OS';
  var screen = window.screen.width + 'x' + window.screen.height;
  return browser + ' · ' + os + ' · ' + screen;
}

/* Remove a student from admin recents */
function adminRemoveFromRecents(name) {
  if (!HM_DB.removedStudents) HM_DB.removedStudents = [];
  if (!HM_DB.removedStudents.includes(name)) {
    HM_DB.removedStudents.push(name);
    saveHMDB();
  }
  renderALoginHistory();
}

/* Restore student to recents */
function adminRestoreStudent(name) {
  HM_DB.removedStudents = (HM_DB.removedStudents || []).filter(function(n){ return n !== name; });
  saveHMDB();
  renderALoginHistory();
}

/* Force-remove a live student from exam (kick) */
function adminKickStudent(name) {
  if (currentStudent.name === name) {
    alert('Cannot kick yourself.');
    return;
  }
  if (LIVE_SESSIONS[name]) {
    LIVE_SESSIONS[name].status = 'kicked';
    LIVE_SESSIONS[name].kickedAt = new Date().toLocaleTimeString();
    if (typeof firebaseSyncSessions === 'function') firebaseSyncSessions();
    renderAMonitor();
  }
}
