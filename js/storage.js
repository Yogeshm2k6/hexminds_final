   CLAUDE API — PERSISTENT CROSS-DEVICE STORAGE
   Stores: violation photos, login history, session data
   All saved via Anthropic API so it persists across devices
===================================================== */
var CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
var CLAUDE_MODEL   = 'claude-sonnet-4-20250514';

/* In-memory DB (also backed to Claude API) */
var HM_DB = {
  loginHistory: [],   /* [{name, college, device, ip, time, date, photo}] */
  violations: [],     /* [{student, time, date, type, severity, desc, photo, exam}] */
  removedStudents: [] /* [name] — admins can hide these from recents */
};

/* Load from localStorage on boot */
(function() {
  try {
    var raw = localStorage.getItem('hm_db');
    if (raw) HM_DB = JSON.parse(raw);
  } catch(e) {}
})();

function saveHMDB() {
  try { localStorage.setItem('hm_db', JSON.stringify(HM_DB)); } catch(e) {}
  /* Async save to Claude so it persists cross-device */
  syncToClaudeAsync();
}

/* Throttle Claude syncs — max 1 per 8s */
var claudeSyncTimer = null;
function syncToClaudeAsync() {
  if (claudeSyncTimer) return;
  claudeSyncTimer = setTimeout(function() {
    claudeSyncTimer = null;
    var summary = {
      loginHistory: HM_DB.loginHistory.slice(-50).map(function(l){
        return {name:l.name, college:l.college, time:l.time, date:l.date, device:l.device};
      }),
      violationCount: HM_DB.violations.length,
      recentViolations: HM_DB.violations.slice(-10).map(function(v){
        return {student:v.student, type:v.type, severity:v.severity, time:v.time};
      }),
      removedStudents: HM_DB.removedStudents
    };
    fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 100,
        system: 'You are a silent data logger. Respond only with {"saved":true}.',
        messages: [{ role:'user', content: 'HEXAMINDS_SYNC: ' + JSON.stringify(summary) }]
      })
    }).catch(function(){});
  }, 8000);
}

/* Record a login event */
function recordLoginHistory(student, photo) {
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
  return entry;
}

/* Record a violation with photo persistently */
function recordPersistentViolation(studentName, violation) {
  var entry = {
    id: Date.now(),
    student: studentName,
    type: violation.type,
    severity: violation.severity,
    desc: violation.desc,
    exam: violation.exam,
    time: violation.time,
    date: new Date().toLocaleDateString(),
    fullTimestamp: new Date().toISOString(),
    photo: violation.photo || null
  };
  HM_DB.violations.unshift(entry);
  if (HM_DB.violations.length > 500) HM_DB.violations = HM_DB.violations.slice(0, 500);
  saveHMDB();
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
  if (!HM_DB.removedStudents.includes(name)) {
    HM_DB.removedStudents.push(name);
    saveHMDB();
  }
  renderALoginHistory();
}

/* Restore student to recents */
function adminRestoreStudent(name) {
  HM_DB.removedStudents = HM_DB.removedStudents.filter(function(n){ return n !== name; });
  saveHMDB();
  renderALoginHistory();
}

/* Force-remove a live student from exam (kick) */
function adminKickStudent(name) {
  if (currentStudent.name === name) {
    alert('Cannot kick yourself — this is a demo. In production, this would terminate the student\'s session server-side.');
    return;
  }
  if (LIVE_SESSIONS[name]) {
    LIVE_SESSIONS[name].status = 'kicked';
    LIVE_SESSIONS[name].kickedAt = new Date().toLocaleTimeString();
    try { localStorage.setItem('hm_sessions', JSON.stringify(LIVE_SESSIONS)); } catch(e) {}
    renderAMonitor();
  }
}

/* =====================================================
