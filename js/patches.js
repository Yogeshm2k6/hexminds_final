/* =====================================================
   ADMIN NAV — extended with new pages (handled by the primary aNav above)
===================================================== */

// Initialize Firebase Firestore and Cloudinary Configuration
(function() {
  var firebaseConfig = {
    apiKey: "AIzaSyDaeHuep_eGqLSIxoOMOO4kjbjOcI4cLNg",
    authDomain: "examportal-a4795.firebaseapp.com",
    projectId: "examportal-a4795",
    storageBucket: "examportal-a4795.firebasestorage.app",
    messagingSenderId: "863213436052",
    appId: "1:863213436052:web:3fec0db8245a0446a8c881",
    measurementId: "G-VSY3NHC3PJ"
  };

  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized with Firestore.");
  }
})();

// Get Firestore reference
var db = (typeof firebase !== 'undefined' && firebase.apps.length) ? firebase.firestore() : null;

// Throttle helper — prevents flooding Firestore with too many writes
var _syncTimers = {};
function throttledSync(key, fn, delayMs) {
  if (_syncTimers[key]) clearTimeout(_syncTimers[key]);
  _syncTimers[key] = setTimeout(function() {
    _syncTimers[key] = null;
    fn();
  }, delayMs || 1500);
}

// ─── Sanitizer Helper ──────────────────────────────────────────────
function sanitizeDocId(str) {
  return String(str || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

// ─── Collection-level Firestore Sync Helpers ───────────────────────
window.firebaseSaveStudent = function(studentObj) {
  if (!db || !studentObj || !studentObj.name) return;
  var docId = sanitizeDocId(studentObj.name);
  var data = {
    id: studentObj.id || Date.now(),
    name: studentObj.name,
    dob: studentObj.dob || '',
    college: studentObj.college || '',
    status: studentObj.status || 'offline',
    avgScore: studentObj.avgScore || 0,
    examsTaken: studentObj.exams || 0,
    profilePhotoUrl: studentObj.profilePhoto || studentProfilePhoto || null,
    updatedAt: new Date().toISOString()
  };
  db.collection('students').doc(docId).set(data, { merge: true }).catch(function(e){ console.error("Firestore student save error:", e); });
};

window.firebaseSaveFace = function(faceKey, faceData) {
  if (!db || !faceKey || !faceData) return;
  var docId = sanitizeDocId(faceKey);
  var photoUrl = faceData.photoUrl || faceData.cloudinaryUrl || null;
  // If only base64 snapshot exists and no Cloudinary URL yet, do not store huge base64 in Firestore doc
  if (!photoUrl && faceData.snapshot && !faceData.snapshot.startsWith('data:')) {
    photoUrl = faceData.snapshot;
  }

  var data = {
    faceKey: faceKey,
    name: faceData.name || faceKey.split('|')[0],
    dob: faceData.dob || (faceKey.split('|')[1] || ''),
    college: faceData.college || '',
    desc: faceData.desc || [],
    photoUrl: photoUrl,
    registeredAt: new Date().toISOString()
  };
  db.collection('registered_faces').doc(docId).set(data, { merge: true }).catch(function(e){ console.error("Firestore face save error:", e); });
};

window.firebaseSaveExam = function(examObj) {
  if (!db || !examObj || !examObj.code) return;
  var docId = sanitizeDocId(examObj.code);
  var data = JSON.parse(JSON.stringify(examObj));
  data.updatedAt = new Date().toISOString();
  db.collection('exams').doc(docId).set(data, { merge: true }).catch(function(e){ console.error("Firestore exam save error:", e); });
};

window.firebaseDeleteExamDoc = function(examCode) {
  if (!db || !examCode) return;
  var docId = sanitizeDocId(examCode);
  db.collection('exams').doc(docId).delete().catch(function(e){ console.error("Firestore exam delete error:", e); });
};

window.firebaseSaveSession = function(studentName, sessionObj) {
  if (!db || !studentName || !sessionObj) return;
  var docId = sanitizeDocId(studentName);
  var data = JSON.parse(JSON.stringify(sessionObj));
  // Replace base64 profilePhoto with Cloudinary link if available
  if (data.profilePhoto && data.profilePhoto.startsWith('data:')) {
    delete data.profilePhoto;
  }
  data.updatedAt = new Date().toISOString();
  db.collection('sessions').doc(docId).set(data, { merge: true }).catch(function(e){ console.error("Firestore session save error:", e); });
};

window.firebaseSaveViolationEntry = function(violationObj) {
  if (!db || !violationObj) return;
  var docId = 'v_' + (violationObj.id || Date.now()) + '_' + sanitizeDocId(violationObj.student || 'anon');
  var data = JSON.parse(JSON.stringify(violationObj));
  var isBase64 = data.photo && data.photo.startsWith('data:');
  if (isBase64) {
    data.photoUrl = null;
    delete data.photo; // don't send heavy base64 string to Firestore
  } else {
    data.photoUrl = data.photo || data.photoUrl || null;
  }
  data.createdAt = new Date().toISOString();
  db.collection('violations').doc(docId).set(data, { merge: true }).catch(function(e){ console.error("Firestore violation save error:", e); });

  // Upload photo to Cloudinary asynchronously if base64
  if (isBase64 && typeof uploadToCloudinary === 'function') {
    uploadToCloudinary(violationObj.photo, 'image', function(cloudinaryUrl) {
      if (cloudinaryUrl) {
        db.collection('violations').doc(docId).update({ photoUrl: cloudinaryUrl, photo: cloudinaryUrl }).catch(function(){});
      }
    });
  }
};

window.firebaseSaveLoginEntry = function(loginObj) {
  if (!db || !loginObj) return;
  var docId = 'log_' + (loginObj.id || Date.now()) + '_' + sanitizeDocId(loginObj.name || 'anon');
  var data = JSON.parse(JSON.stringify(loginObj));
  var isBase64 = data.photo && data.photo.startsWith('data:');
  if (isBase64) {
    data.photoUrl = null;
    delete data.photo; // don't send heavy base64 string to Firestore
  } else {
    data.photoUrl = data.photo || data.photoUrl || null;
  }
  data.createdAt = new Date().toISOString();
  db.collection('login_history').doc(docId).set(data, { merge: true }).catch(function(e){ console.error("Firestore login_history save error:", e); });

  // Upload profile photo to Cloudinary if base64
  if (isBase64 && typeof uploadToCloudinary === 'function') {
    uploadToCloudinary(loginObj.photo, 'image', function(cloudinaryUrl) {
      if (cloudinaryUrl) {
        db.collection('login_history').doc(docId).update({ photoUrl: cloudinaryUrl, photo: cloudinaryUrl }).catch(function(){});
      }
    });
  }
};

window.firebaseSaveSubmission = function(submissionObj) {
  if (!db || !submissionObj) return;
  var docId = 'sub_' + sanitizeDocId(submissionObj.examCode || 'exam') + '_' + sanitizeDocId(submissionObj.studentName || 'stu');
  var data = JSON.parse(JSON.stringify(submissionObj));
  data.submittedAt = new Date().toISOString();
  db.collection('submissions').doc(docId).set(data, { merge: true }).catch(function(e){ console.error("Firestore submission save error:", e); });
};

// ─── Collection Sync Helpers ───────────────────────────────────────
window.firebaseSyncDb = function() {
  if (!db) return;
  throttledSync('hm_db', function() {
    (EXAMS || []).forEach(function(e){ firebaseSaveExam(e); });
    (STUDENTS || []).forEach(function(s){ firebaseSaveStudent(s); });
    (HM_DB.violations || []).forEach(function(v){ firebaseSaveViolationEntry(v); });
    (HM_DB.loginHistory || []).forEach(function(l){ firebaseSaveLoginEntry(l); });
    (HM_DB.submissions || []).forEach(function(sub){ firebaseSaveSubmission(sub); });
  });
};

window.firebaseSyncSessions = function() {
  if (!db) return;
  throttledSync('sessions', function() {
    Object.keys(LIVE_SESSIONS || {}).forEach(function(k){
      firebaseSaveSession(k, LIVE_SESSIONS[k]);
    });
  });
};

window.firebaseSyncFaces = function() {
  if (!db) return;
  throttledSync('faces', function() {
    Object.keys(registeredFaceData || {}).forEach(function(k){
      firebaseSaveFace(k, registeredFaceData[k]);
    });
  });
};

// ─── Initial Load & Realtime Listeners from Firestore Collections ───
(function() {
  if (!db) { console.warn("Firebase not available — running in offline mode."); return; }

  // Clean up legacy app/hm_db document if it exists in Firestore
  try {
    db.collection('app').doc('hm_db').delete().catch(function(){});
    db.collection('app').doc('live_sessions').delete().catch(function(){});
    db.collection('app').doc('registered_faces').delete().catch(function(){});
  } catch(e) {}

  // 1. Real-time listener on 'exams' collection
  db.collection('exams').onSnapshot(function(snapshot) {
    var loadedExams = [];
    snapshot.forEach(function(doc) {
      loadedExams.push(doc.data());
    });
    if (loadedExams.length > 0) {
      EXAMS = loadedExams;
      if (role === 'admin') { try { renderAExams(); } catch(e){} }
    }
  }, function(err){ console.error("Firestore exams snapshot error:", err); });

  // 2. Real-time listener on 'students' collection
  db.collection('students').onSnapshot(function(snapshot) {
    var loadedStudents = [];
    snapshot.forEach(function(doc) {
      loadedStudents.push(doc.data());
    });
    if (loadedStudents.length > 0) {
      STUDENTS = loadedStudents;
      if (role === 'admin') { try { renderAStudents(); } catch(e){} }
    }
  }, function(err){ console.error("Firestore students snapshot error:", err); });

  // 3. Real-time listener on 'registered_faces' collection
  db.collection('registered_faces').onSnapshot(function(snapshot) {
    snapshot.forEach(function(doc) {
      var data = doc.data();
      if (data && data.faceKey) {
        registeredFaceData[data.faceKey] = data;
      }
    });
  }, function(err){ console.error("Firestore faces snapshot error:", err); });

  // 4. Real-time listener on 'sessions' collection for live proctoring
  db.collection('sessions').onSnapshot(function(snapshot) {
    var activeSessions = {};
    snapshot.forEach(function(doc) {
      var data = doc.data();
      if (data && data.name) {
        activeSessions[data.name] = data;
      }
    });
    LIVE_SESSIONS = activeSessions;
    if (role === 'admin') {
      var adash = document.getElementById('si-adash');
      if (adash && adash.classList.contains('active')) try { renderADash(); } catch(e){}
      var amon = document.getElementById('si-amonitor');
      if (amon && amon.classList.contains('active')) try { renderAMonitor(); } catch(e){}
      var astudents = document.getElementById('si-astudents');
      if (astudents && astudents.classList.contains('active')) try { renderAStudents(); } catch(e){}
    }
  }, function(err){ console.error("Firestore sessions snapshot error:", err); });

  // 5. Real-time listener on 'violations' collection
  db.collection('violations').onSnapshot(function(snapshot) {
    var loadedViols = [];
    snapshot.forEach(function(doc) {
      loadedViols.push(doc.data());
    });
    HM_DB.violations = loadedViols;
  }, function(err){ console.error("Firestore violations snapshot error:", err); });

  // 6. Real-time listener on 'login_history' collection
  db.collection('login_history').onSnapshot(function(snapshot) {
    var loadedHistory = [];
    snapshot.forEach(function(doc) {
      loadedHistory.push(doc.data());
    });
    HM_DB.loginHistory = loadedHistory;
    if (role === 'admin') {
      var alog = document.getElementById('si-aloginhistory');
      if (alog && alog.classList.contains('active')) try { renderALoginHistory(); } catch(e){}
    }
  }, function(err){ console.error("Firestore login_history snapshot error:", err); });

  // 7. Real-time listener on 'submissions' collection
  db.collection('submissions').onSnapshot(function(snapshot) {
    var loadedSubs = [];
    snapshot.forEach(function(doc) {
      loadedSubs.push(doc.data());
    });
    HM_DB.submissions = loadedSubs;
  }, function(err){ console.error("Firestore submissions snapshot error:", err); });
})();

// Cloudinary Configuration — cloud name = etwi6mr1
window.CLOUDINARY_CLOUD_NAME = localStorage.getItem('hm_cloudinary_cloud_name') || 'etwi6mr1';

/* =====================================================
   LOGIN HISTORY PAGE
===================================================== */
function renderALoginHistory() {
  var history = HM_DB.loginHistory;
  var removed = HM_DB.removedStudents;
  var showRemoved = false;
  var filtered = history.filter(function(e){ return !removed.includes(e.name); });
  var hiddenCount = history.filter(function(e){ return removed.includes(e.name); }).length;

  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
    '<div class="page-title">Login History</div>' +
    '<div class="page-sub">All student login events — persists across devices and sessions</div>' +

    '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:18px">' +
      statCard('Total Logins', history.length, 'All time', 'var(--cyan)') +
      statCard('Unique Students', (function(){ var s={}; history.forEach(function(h){s[h.name]=1;}); return Object.keys(s).length; })(), 'Distinct users', 'var(--blue)') +
      statCard('Hidden Entries', hiddenCount, 'Removed from view', 'var(--amber)') +
    '</div>' +

    (hiddenCount > 0
      ? '<div style="background:rgba(217,119,6,0.08);border:1px solid rgba(217,119,6,0.25);border-radius:12px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between">' +
          '<span style="font-size:13px;color:var(--amber);font-weight:600">⚠ ' + hiddenCount + ' login entr' + (hiddenCount===1?'y':'ies') + ' hidden by admin.</span>' +
          '<button class="btn-outline btn-sm" onclick="renderAHiddenLogins()">View Hidden →</button>' +
        '</div>'
      : '') +

    (filtered.length === 0
      ? '<div class="card" style="text-align:center;padding:48px;color:var(--text3)">No login history yet. Students who log in will appear here.</div>'
      : '<div style="display:flex;flex-direction:column;gap:10px">' +
          filtered.map(function(entry, idx) {
            var initials = entry.name.split(' ').map(function(n){ return n[0]; }).join('');
            return '<div class="card" style="padding:16px">' +
              '<div style="display:flex;align-items:flex-start;gap:14px">' +
                (entry.photo
                  ? '<div style="width:52px;height:52px;border-radius:12px;overflow:hidden;flex-shrink:0;border:2px solid var(--border2)"><img src="' + entry.photo + '" style="width:100%;height:100%;object-fit:cover" /></div>'
                  : '<div class="avatar" style="width:52px;height:52px;border-radius:12px;font-size:16px;flex-shrink:0">' + initials + '</div>') +
                '<div style="flex:1">' +
                  '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">' +
                    '<span style="font-size:14px;font-weight:800;color:var(--text)">' + entry.name + '</span>' +
                    '<span class="badge badge-blue">' + entry.college + '</span>' +
                  '</div>' +
                  '<div style="font-size:12px;color:var(--text3);margin-bottom:4px;font-family:\'JetBrains Mono\',monospace">🕐 ' + entry.time + ' &nbsp;·&nbsp; 📅 ' + entry.date + '</div>' +
                  '<div style="font-size:11px;color:var(--text3)">💻 ' + entry.device + '</div>' +
                '</div>' +
                '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">' +
                  '<button class="btn-danger btn-sm" onclick="adminRemoveFromRecents(\'' + entry.name.replace(/'/g,"\\'") + '\')">Remove</button>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>') +
    '</div>';
}

function renderAHiddenLogins() {
  var removed = HM_DB.removedStudents;
  var hiddenEntries = HM_DB.loginHistory.filter(function(e){ return removed.includes(e.name); });
  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:22px">' +
      '<button class="btn-outline btn-sm" onclick="renderALoginHistory()">← Back</button>' +
      '<div class="page-title" style="margin-bottom:0">Hidden Login Entries</div>' +
    '</div>' +
    (hiddenEntries.length === 0
      ? '<div class="card" style="text-align:center;padding:48px;color:var(--text3)">No hidden entries.</div>'
      : '<div style="display:flex;flex-direction:column;gap:10px">' +
          hiddenEntries.map(function(entry) {
            var initials = entry.name.split(' ').map(function(n){ return n[0]; }).join('');
            return '<div class="card" style="padding:16px;opacity:0.7">' +
              '<div style="display:flex;align-items:center;gap:14px">' +
                '<div class="avatar" style="width:44px;height:44px;border-radius:12px;font-size:14px;flex-shrink:0;background:var(--bg3);color:var(--text3)">' + initials + '</div>' +
                '<div style="flex:1">' +
                  '<div style="font-size:14px;font-weight:700;color:var(--text2)">' + entry.name + '</div>' +
                  '<div style="font-size:11px;color:var(--text3);font-family:\'JetBrains Mono\',monospace">' + entry.time + ' · ' + entry.date + '</div>' +
                '</div>' +
                '<button class="btn-outline btn-sm" onclick="adminRestoreStudent(\'' + entry.name.replace(/'/g,"\\'") + '\')">Restore</button>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>') +
    '</div>';
}

/* =====================================================
   LIVE MONITOR PAGE
   Admin can see all active students, kick/warn them
===================================================== */
function renderAMonitor() {
  var live = Object.values(LIVE_SESSIONS).filter(function(ls){ return ls.status !== 'kicked'; });
  var kicked = Object.values(LIVE_SESSIONS).filter(function(ls){ return ls.status === 'kicked'; });

  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
      '<div class="page-title">Live Monitor</div>' +
      '<button class="btn-outline btn-sm" onclick="renderAMonitor()">⟳ Refresh</button>' +
    '</div>' +
    '<div class="page-sub">Real-time view of all active student sessions. Take action instantly.</div>' +

    '<div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">' +
      statCard('Active Sessions', live.filter(function(ls){return ls.status!=='offline';}).length, 'Currently online', 'var(--green)') +
      statCard('In Exam', live.filter(function(ls){return ls.status==='exam';}).length, 'Taking exam now', 'var(--amber)') +
      statCard('Violations', live.reduce(function(sum,ls){return sum+(ls.violations?ls.violations.length:0);},0), 'This session', 'var(--red)') +
      statCard('Kicked', kicked.length, 'Removed by admin', 'var(--text3)') +
    '</div>' +

    (live.length === 0
      ? '<div class="card" style="text-align:center;padding:48px;color:var(--text3)">No active sessions. Students who are logged in will appear here.</div>'
      : '<div style="display:flex;flex-direction:column;gap:12px">' +
          live.map(function(ls) {
            var isExam = ls.status === 'exam';
            var violCount = (ls.violations||[]).length;
            var latestViol = violCount > 0 ? ls.violations[ls.violations.length-1] : null;
            var initials = ls.name.split(' ').map(function(n){return n[0];}).join('');
            return '<div class="card" style="padding:18px;' + (isExam?'border-color:rgba(245,158,11,0.4);':violCount>0?'border-color:rgba(239,68,68,0.3);':'') + '">' +
              '<div style="display:flex;align-items:flex-start;gap:14px">' +
                (ls.profilePhoto
                  ? '<div style="width:56px;height:56px;border-radius:14px;overflow:hidden;flex-shrink:0;border:2px solid ' + (isExam?'var(--amber)':'var(--green)') + '"><img src="' + ls.profilePhoto + '" style="width:100%;height:100%;object-fit:cover" /></div>'
                  : '<div class="avatar" style="width:56px;height:56px;border-radius:14px;font-size:18px;font-weight:800;flex-shrink:0">' + initials + '</div>') +
                '<div style="flex:1">' +
                  '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">' +
                    '<span style="font-size:15px;font-weight:800;color:var(--text)">' + ls.name + '</span>' +
                    '<span class="badge ' + (isExam?'badge-amber':ls.status==='online'?'badge-green':'badge-gray') + '">' + ls.status.toUpperCase() + '</span>' +
                    (violCount>0?'<span class="badge badge-red">⚠ '+violCount+' violation'+(violCount>1?'s':'')+'</span>':'') +
                  '</div>' +
                  '<div style="font-size:12px;color:var(--text3);margin-bottom:6px">' + ls.college + ' &nbsp;·&nbsp; Login: ' + (ls.loginTime||'—') + '</div>' +
                  (isExam?'<div style="font-size:12px;color:var(--amber);font-weight:600;margin-bottom:6px">📝 Currently in: ' + (ls.examName||'Exam') + '</div>':'') +
                  (latestViol?'<div style="font-size:11px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:8px;padding:8px 10px;color:var(--red)">' +
                    '⚠ Last violation: <strong>' + latestViol.type + '</strong> at ' + latestViol.time + '</div>':'') +
                  (ls.violations&&ls.violations.length>0&&ls.violations[ls.violations.length-1].photo
                    ? '<div style="margin-top:10px"><div style="font-size:10px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">📷 Last Violation Capture</div><img src="' + ls.violations[ls.violations.length-1].photo + '" style="width:180px;border-radius:8px;border:1.5px solid rgba(239,68,68,0.4)" /></div>':'') +
                '</div>' +
                '<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;flex-shrink:0">' +
                  '<button class="btn-outline btn-sm" onclick="viewLiveStudent(\'' + ls.name.replace(/'/g,"\\'") + '\')">View Details</button>' +
                  (isExam?'<button class="btn-danger btn-sm" onclick="adminKickStudent(\'' + ls.name.replace(/'/g,"\\'") + '\')">⛔ Kick</button>':'') +
                  '<button class="btn-outline btn-sm" style="font-size:11px;color:var(--text3)" onclick="adminFlagSession(\'' + ls.name.replace(/'/g,"\\'") + '\')">🚩 Flag</button>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>') +

    (kicked.length > 0
      ? '<div style="margin-top:20px">' +
          '<div class="section-title" style="color:var(--text3)">Kicked Students</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px">' +
            kicked.map(function(ls) {
              return '<div class="card" style="padding:14px;opacity:0.6">' +
                '<div style="display:flex;align-items:center;gap:12px">' +
                  '<span style="font-size:20px">⛔</span>' +
                  '<div style="flex:1"><div style="font-weight:700">' + ls.name + '</div><div style="font-size:11px;color:var(--text3)">Kicked at ' + (ls.kickedAt||'—') + '</div></div>' +
                '</div>' +
              '</div>';
            }).join('') +
          '</div>' +
        '</div>'
      : '') +
    '</div>';
}

function adminFlagSession(name) {
  if (LIVE_SESSIONS[name]) {
    LIVE_SESSIONS[name].flagged = true;
    LIVE_SESSIONS[name].flaggedAt = new Date().toLocaleTimeString();
    alert('Session for ' + name + ' has been flagged for review.');
    renderAMonitor();
  }
}

/* =====================================================
   PATCH: faceVerify completion — use new login recorder
   (completeStudentLoginV2 is called directly from fvRegisterFace and fvVerifyFace)
===================================================== */
function completeStudentLoginV2() {
  document.getElementById('face-verify-overlay').classList.add('hidden');
  currentStudent = fvPendingStudent;
  fvPendingStudent = null; fvMode = null;
  suspicionScore = 0;

  if (currentStudent && currentStudent.name) {
    currentStudent.initials = currentStudent.name.split(' ').map(function(n){ return n[0]; }).join('').toUpperCase().slice(0,2);
  }

  /* Retrieve profile photo from registered face data */
  var faceKey = currentStudent.name.toLowerCase() + '|' + currentStudent.dob;
  var stored = registeredFaceData[faceKey];
  if (stored && stored.snapshot) studentProfilePhoto = stored.snapshot;

  LIVE_SESSIONS[currentStudent.name] = {
    id: Date.now(), name: currentStudent.name, dob: currentStudent.dob, college: currentStudent.college,
    status: 'online', loginTime: new Date().toLocaleTimeString(),
    violations: [], examStarted: false, examName: null, score: null, grade: null,
    profilePhoto: studentProfilePhoto
  };

  // Ensure the student exists in the STUDENTS registry
  if (!window.STUDENTS) window.STUDENTS = [];
  var studentExists = STUDENTS.some(function(s) { return s.name.toLowerCase() === currentStudent.name.toLowerCase(); });
  if (!studentExists) {
    STUDENTS.push({
      id: STUDENTS.length > 0 ? Math.max.apply(null, STUDENTS.map(function(s){ return s.id; })) + 1 : 1,
      name: currentStudent.name,
      dob: currentStudent.dob,
      college: currentStudent.college,
      exams: 0,
      avgScore: 0,
      status: 'online',
      violations: []
    });
  }

  /* Record to persistent login history */
  recordLoginHistory(currentStudent, studentProfilePhoto);

  /* Sync to Firestore */
  if (typeof firebaseSyncSessions === 'function') firebaseSyncSessions();
  if (typeof firebaseSyncDb === 'function') firebaseSyncDb();
  if (typeof firebaseSyncFaces === 'function') firebaseSyncFaces();

  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('student-app').classList.remove('hidden');
  document.getElementById('s-nav-name').textContent = currentStudent.name;
  /* Show profile photo in nav avatar */
  var navAv = document.getElementById('s-nav-av');
  if (studentProfilePhoto) {
    navAv.style.backgroundImage = 'url(' + studentProfilePhoto + ')';
    navAv.style.backgroundSize = 'cover';
    navAv.style.backgroundPosition = 'center';
    navAv.textContent = '';
    navAv.style.border = '2px solid var(--cyan)';
  } else {
    navAv.textContent = currentStudent.initials;
  }
  sessionViolations = [];
  violationCount = 0;
  renderSDash();
}

/* =====================================================
   PATCH: logViolation — also persist to HM_DB
===================================================== */
var _origLogViolation = logViolation;
logViolation = function(type, desc, severity) {
  var photo = captureViolationPhoto();
  var v = { type: type, time: new Date().toLocaleTimeString(), exam: 'CS101', severity: severity, desc: desc, photo: photo };
  sessionViolations.push(v);
  if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
    LIVE_SESSIONS[currentStudent.name].violations.push(v);
    /* Persist to cross-device DB */
    recordPersistentViolation(currentStudent.name, v);
    
    // Save to Firebase RTDB
    if (typeof firebaseSyncSessions === 'function') firebaseSyncSessions();
    if (typeof firebaseSyncDb === 'function') firebaseSyncDb();
  }
  
  // Async Cloudinary upload
  if (photo && typeof uploadViolationPhotoAsync === 'function') {
    uploadViolationPhotoAsync(v, photo);
  }
  
  var inc = severity === 'high' ? 20 : 10;
  updateSuspicionScore(inc);
  var vc = document.getElementById('viol-count'); if (vc) { vc.textContent = violationCount; vc.style.animation = 'scoreUp .3s ease'; setTimeout(function(){ if(vc) vc.style.animation=''; }, 300); }
};

/* =====================================================
   PATCH: faceVerify completion — use new login recorder
===================================================== */
/* Replace completeStudentLogin globally */
/* completeStudentLoginV2 is the new login handler with persistent storage */

/* =====================================================
   PATCH: Admin Violations page — include persistent DB violations
===================================================== */
var _origRenderAViolations = renderAViolations;
renderAViolations = function() {
  var liveViolations = getAllViolations();
  /* Merge with HM_DB persistent violations (deduplicate by id) */
  var allPersisted = HM_DB.violations || [];
  /* Build combined list preferring live (has photo) */
  var liveKeys = {};
  liveViolations.forEach(function(x){ liveKeys[x.student + x.v.time + x.v.type] = 1; });
  var persistedOnly = allPersisted.filter(function(p){ return !liveKeys[p.student + p.time + p.type]; });

  var combined = liveViolations.map(function(x){
    return { student: x.student, type: x.v.type, severity: x.v.severity, desc: x.v.desc,
             exam: x.v.exam, time: x.v.time, date: x.date||'', photo: x.v.photo, isLive: x.isLive };
  }).concat(persistedOnly.map(function(p){
    return { student: p.student, type: p.type, severity: p.severity, desc: p.desc,
             exam: p.exam, time: p.time, date: p.date, photo: p.photo, isLive: false };
  }));

  var names = {}; combined.forEach(function(x){ names[x.student]=1; });

  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
    '<div class="page-title">All Violations</div>' +
    '<div class="page-sub">Every flagged incident — including persistent cross-device history</div>' +
    '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">' +
      statCard('Total', combined.length, 'All incidents', 'var(--red)') +
      statCard('High Severity', combined.filter(function(x){return x.severity==='high';}).length, 'Critical flags', 'var(--red)') +
      statCard('Students Flagged', Object.keys(names).length, 'Unique students', 'var(--amber)') +
    '</div>' +
    (combined.length===0
      ? '<div class="card" style="text-align:center;padding:48px;color:var(--green)">✅ No violations recorded yet.</div>'
      : '<div style="display:flex;flex-direction:column;gap:10px">' +
          combined.map(function(item){
            return '<div class="card" style="padding:16px;' + (item.isLive?'border-color:rgba(239,68,68,0.3);':'') + '">' +
              '<div style="display:flex;align-items:flex-start;gap:14px">' +
                (item.photo?'<img src="' + item.photo + '" style="width:90px;height:68px;object-fit:cover;border-radius:8px;border:1.5px solid rgba(239,68,68,0.4);flex-shrink:0" />':'<div style="width:90px;height:68px;background:var(--bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">📷</div>') +
                '<div style="flex:1">' +
                  '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">' +
                    '<span style="font-size:14px;font-weight:800;color:' + (item.severity==='high'?'#f87171':'#fbbf24') + '">' + item.type + '</span>' +
                    '<span class="badge ' + (item.severity==='high'?'badge-red':'badge-amber') + '">' + item.severity + '</span>' +
                    (item.isLive?'<span class="badge badge-live" style="font-size:9px">LIVE</span>':'') +
                    (item.date?'<span class="badge badge-gray" style="font-size:9px">' + item.date + '</span>':'') +
                  '</div>' +
                  '<div style="font-size:12px;color:var(--text2);margin-bottom:5px">' + item.desc + '</div>' +
                  '<div style="font-size:11px;color:var(--text3);font-family:\'JetBrains Mono\',monospace">' + item.student + ' &nbsp;·&nbsp; ' + item.exam + ' &nbsp;·&nbsp; ' + item.time + '</div>' +
                  (item.photo?'<div style="margin-top:10px"><div style="font-size:10px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">📷 Captured at violation</div><img src="' + item.photo + '" style="width:100%;max-width:320px;border-radius:8px;border:1.5px solid rgba(239,68,68,0.4);display:block" /></div>':'') +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>') +
    '</div>';
};

/* =====================================================
   ENHANCED PDF: Violation Report with embedded photos
===================================================== */
var _origGenerateViolationPDF = generateViolationPDF;
generateViolationPDF = function() {
  if (typeof window.jspdf === 'undefined') { alert('jsPDF not loaded.'); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  pdfHeader(doc, 'Violation Report', 'Violation & Proctoring Log — With Photo Evidence', 239, 68, 68);

  var y = 52;
  var liveViolations = getAllViolations();
  var allPersisted = HM_DB.violations || [];
  var liveKeys = {};
  liveViolations.forEach(function(x){ liveKeys[x.student + x.v.time + x.v.type] = 1; });
  var persistedOnly = allPersisted.filter(function(p){ return !liveKeys[p.student + p.time + p.type]; });

  var all = liveViolations.map(function(x){
    return { student: x.student, type: x.v.type, severity: x.v.severity, desc: x.v.desc,
             exam: x.v.exam, time: x.v.time, photo: x.v.photo };
  }).concat(persistedOnly.map(function(p){
    return { student: p.student, type: p.type, severity: p.severity, desc: p.desc,
             exam: p.exam, time: p.time, photo: p.photo };
  }));

  if (all.length === 0) {
    doc.setFontSize(12); doc.setTextColor(34, 197, 94);
    doc.text('No violations recorded.', 14, y);
  } else {
    all.forEach(function(item) {
      var blockH = item.photo ? 60 : 28;
      if (y + blockH > 270) { doc.addPage(); y = 20; }
      var sev = item.severity;
      doc.setFillColor(sev==='high'?255:255, sev==='high'?235:245, sev==='high'?235:220);
      doc.roundedRect(10, y-2, 190, blockH+4, 1.5, 1.5, 'F');
      doc.setFontSize(10); doc.setFont('helvetica','bold');
      doc.setTextColor(sev==='high'?180:160, sev==='high'?20:80, sev==='high'?20:0);
      doc.text(item.type + ' (' + sev.toUpperCase() + ')', 14, y+5);
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(60,60,80);
      doc.text('Student: ' + item.student + '  ·  Exam: ' + item.exam + '  ·  ' + item.time, 14, y+11);
      var desc = item.desc.length>85?item.desc.slice(0,85)+'…':item.desc;
      doc.text(desc, 14, y+17);
      if (item.photo) {
        try {
          doc.setFontSize(7); doc.setTextColor(180,60,60); doc.setFont('helvetica','bold');
          doc.text('VIOLATION CAPTURE:', 14, y+25);
          doc.addImage(item.photo, 'JPEG', 14, y+27, 50, 30);
        } catch(e) {}
      }
      y += blockH + 8;
    });
  }

  var p = doc.internal.getNumberOfPages();
  for (var i=1;i<=p;i++){doc.setPage(i);doc.setFontSize(7);doc.setTextColor(140,160,180);doc.text('HexaMinds — Violation Report (Photo Evidence)  |  Page '+i+' of '+p,14,291);}
  doc.save('HexaMinds_Violations_' + new Date().toISOString().slice(0,10) + '.pdf');
};

/* =====================================================
   ENHANCED PDF: Audit log with login history
===================================================== */
var _origGenerateAuditPDF = generateAuditPDF;
generateAuditPDF = function() {
  if (typeof window.jspdf === 'undefined') { alert('jsPDF not loaded.'); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  pdfHeader(doc, 'Exam Audit Log', 'Exam Audit, Session & Login History Log', 26, 86, 219);

  var y = 52;
  doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(13,13,46);
  doc.text('Login History', 14, y); y += 9;

  var loginHistory = HM_DB.loginHistory;
  if (!loginHistory.length) {
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(130,130,130);
    doc.text('No login history recorded.', 14, y); y += 10;
  } else {
    doc.setFillColor(230,245,255);
    doc.rect(10, y, 190, 8, 'F');
    doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(80,80,120);
    doc.text('Student', 14, y+5.5); doc.text('College', 70, y+5.5);
    doc.text('Date', 130, y+5.5); doc.text('Time', 155, y+5.5); doc.text('Device', 170, y+5.5);
    y += 13;
    loginHistory.slice(0,30).forEach(function(entry){
      if (y > 265) { doc.addPage(); y = 20; }
      doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(20,20,20);
      doc.text(entry.name.substring(0,22), 14, y);
      doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80);
      doc.text((entry.college||'').substring(0,20), 70, y);
      doc.text(entry.date||'', 130, y);
      doc.text(entry.time||'', 155, y);
      doc.setDrawColor(220,230,245); doc.line(14,y+3,196,y+3); y+=10;
    });
    if (loginHistory.length > 30) {
      doc.setTextColor(130,130,130); doc.setFontSize(8);
      doc.text('... and ' + (loginHistory.length-30) + ' more entries', 14, y); y += 10;
    }
  }

  y += 6; doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(13,13,46);
  doc.text('Registered Exams', 14, y); y += 9;
  EXAMS.forEach(function(e, i){
    if (y>265){ doc.addPage(); y=20; }
    doc.setFillColor(i%2===0?240:255, i%2===0?248:255, 255);
    doc.rect(10, y-4, 190, 14, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(13,13,46);
    doc.text(e.title, 14, y+2);
    doc.setFont('helvetica','normal'); doc.setTextColor(80,80,100);
    doc.text('Code: '+e.code, 100, y+2);
    doc.text(e.duration+'min · '+e.questions+' Qs · '+e.enrolled+' enrolled · '+e.date, 14, y+8);
    doc.setTextColor(e.status==='active'?22:120, e.status==='active'?163:120, e.status==='active'?74:120);
    doc.setFont('helvetica','bold'); doc.text(e.status.toUpperCase(), 185, y+2);
    y += 18;
  });

  y += 6; doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(13,13,46);
  doc.text('Session Log', 14, y); y += 9;
  var live = getLiveSessions();
  if (!live.length) {
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(130,130,130);
    doc.text('No live sessions recorded.', 14, y);
  } else {
    live.forEach(function(ls){
      if (y>265){ doc.addPage(); y=20; }
      doc.setFillColor(240,253,244);
      doc.roundedRect(10,y-3,190,20,1.5,1.5,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(13,13,46);
      doc.text(ls.name, 14, y+3);
      doc.setFont('helvetica','normal'); doc.setTextColor(60,60,80);
      doc.text(ls.college+'  ·  Login: '+(ls.loginTime||'—'), 14, y+9);
      var info = 'Exam: '+(ls.examName||'—');
      if (ls.score!=null) info+='  ·  Score: '+ls.score+'% ('+(ls.grade||'—')+')';
      if (ls.submitTime) info+='  ·  Submitted: '+ls.submitTime+(ls.autoSubmitted?' [AUTO]':'');
      info += '  ·  Violations: '+(ls.violations?ls.violations.length:0);
      doc.text(info, 14, y+15);
      y += 24;
    });
  }

  var p=doc.internal.getNumberOfPages();
  for(var i=1;i<=p;i++){doc.setPage(i);doc.setFontSize(7);doc.setTextColor(140,160,180);doc.text('HexaMinds — Audit & Login History  |  Page '+i+' of '+p,14,291);}
  doc.save('HexaMinds_AuditLog_' + new Date().toISOString().slice(0,10) + '.pdf');
};

/* Ensure aNav is defined (override old version since we defined it twice) */
/* The new aNav above handles all pages including aloginhistory and amonitor */

/* =====================================================
   NOTIFICATION BADGE on admin sidebar for violations
===================================================== */
function updateAdminBadges() {
  var violCount = HM_DB.violations.length;
  var loginCount = HM_DB.loginHistory.length;
  /* Could add badge elements to sidebar items here */
}

/* On admin login, show notification */
var _origAdminLogin = adminLogin;
adminLogin = function() {
  var u = document.getElementById('a-user').value.trim();
  var p = document.getElementById('a-pass').value;
  if (u === 'hexaminds' && p === 'hexaminds123') {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');
    renderADash();
    /* Show cross-device sync notice if there's history */
    if (HM_DB.loginHistory.length > 0 || HM_DB.violations.length > 0) {
      setTimeout(function(){
        var notice = document.createElement('div');
        notice.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:#fff;border:1.5px solid var(--border);border-radius:18px;padding:16px 20px;box-shadow:0 8px 30px rgba(0,0,0,0.1);max-width:320px;animation:toastSlide .4s ease';
        notice.innerHTML = '<div style="display:flex;gap:12px;align-items:flex-start">' +
          '<div style="font-size:24px">📂</div>' +
          '<div>' +
            '<div style="font-weight:800;font-size:13px;color:var(--text);margin-bottom:4px">Persistent Data Loaded</div>' +
            '<div style="font-size:12px;color:var(--text3)"><strong style="color:var(--cyan)">' + HM_DB.loginHistory.length + '</strong> login records &nbsp;·&nbsp; <strong style="color:var(--red)">' + HM_DB.violations.length + '</strong> violations found in storage.</div>' +
          '</div>' +
          '<button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;font-size:16px;color:var(--text3);cursor:pointer;flex-shrink:0">✕</button>' +
        '</div>';
        document.body.appendChild(notice);
        setTimeout(function(){ if(notice.parentElement) notice.remove(); }, 6000);
      }, 800);
    }
  } else {
    var err = document.getElementById('login-err');
    err.classList.remove('hidden');
    err.style.animation = 'none';
    setTimeout(function(){ err.style.animation = 'shake .35s ease'; }, 10);
  }
};

/* =====================================================
   ADMIN EXAMS PERSISTENCE & CRUD PATCHES
===================================================== */

// Backup original QUESTIONS
var ORIGINAL_QUESTIONS = JSON.parse(JSON.stringify(QUESTIONS));
var currentExamId = 1;

// Global Calibration State for Face Proctor Stabilizer
var faceCalibrated = false;
var calibrationFrames = [];
var calibratedBaselines = null;
var smoothedNoseRatio = null;
var smoothedEyeNoseY = null;
var smoothedEyeDist = null;

// Helper to format 24h string (HH:MM) to AM/PM format
function formatTime(tStr) {
  if (!tStr) return '';
  var parts = tStr.split(':');
  var h = parseInt(parts[0]);
  var m = parts[1];
  var ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return h + ':' + m + ' ' + ampm;
}

// Helper to calculate duration in minutes between two HH:MM times
function calculateDurationInMinutes(start, end) {
  if (!start || !end) return 0;
  var s = start.split(':');
  var e = end.split(':');
  var sMin = parseInt(s[0]) * 60 + parseInt(s[1]);
  var eMin = parseInt(e[0]) * 60 + parseInt(e[1]);
  var diff = eMin - sMin;
  if (diff < 0) {
    diff += 24 * 60; // Spans across midnight
  }
  return diff;
}

// Load exams from localStorage
(function() {
  try {
    var storedExams = localStorage.getItem('hm_exams');
    if (storedExams) EXAMS = JSON.parse(storedExams);
    var storedStudentExams = localStorage.getItem('hm_student_exams');
    if (storedStudentExams) studentExams = JSON.parse(storedStudentExams);
  } catch(e) {}
})();

function saveExams() {
  // Sync to Firestore
  if (typeof firebaseSyncDb === 'function') firebaseSyncDb();
}

// Override renderAExams to show the "Create Exam" button & time windows
renderAExams = function() {
  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
      '<div class="page-title" style="margin-bottom:0">Exam Management</div>' +
      '<button class="btn-primary btn-sm" onclick="openCreateExamModal()">＋ Create Exam</button>' +
    '</div>' +
    '<div class="page-sub">Registered exams and their status</div>' +
    '<div style="display:flex;flex-direction:column;gap:14px">' +
    EXAMS.map(function(e){
      var timeWindowLabel = e.startTime ? ' (' + formatTime(e.startTime) + ' - ' + formatTime(e.endTime) + ')' : '';
      return '<div class="card" style="' + (e.status==='active'?'border-color:rgba(34,197,94,0.3);':'') + '">' +
        '<div style="display:flex;align-items:flex-start;justify-content:space-between">' +
          '<div>' +
            '<div style="font-size:16px;font-weight:800;color:var(--text);margin-bottom:4px">' + e.title + '</div>' +
            '<div style="font-size:12px;color:var(--text3);margin-bottom:10px;font-family:\'JetBrains Mono\',monospace">Code: <span style="color:var(--cyan)">' + e.code + '</span> &nbsp;·&nbsp; ' + e.duration + ' min' + timeWindowLabel + ' &nbsp;·&nbsp; ' + e.questions + ' Qs</div>' +
            '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
              '<span class="badge badge-cyan">👥 ' + e.enrolled + ' enrolled</span>' +
              '<span class="badge badge-gray">📅 ' + e.date + '</span>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">' +
            '<span class="badge ' + (e.status==='active'?'badge-green':'badge-gray') + '" style="font-size:12px;padding:6px 14px">' + e.status.toUpperCase() + '</span>' +
            '<button class="btn-outline btn-sm" style="font-size:10px;padding:4px 8px;color:var(--red)" onclick="deleteExam(' + e.id + ')">Delete</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('') +
    '</div></div>';
};

// Delete Exam handler
function deleteExam(id) {
  if (confirm('Are you sure you want to delete this exam?')) {
    EXAMS = EXAMS.filter(function(e){ return e.id !== id; });
    studentExams = studentExams.filter(function(e){ return e.id !== id; });
    saveExams();
    renderAExams();
  }
}

// Modal management for creating exams
var customQuestions = [];

function openCreateExamModal() {
  customQuestions = [
    { q: '', type: 'MCQ', marks: 1, opts: ['', '', '', ''], ans: 0 }
  ];
  
  var overlay = document.createElement('div');
  overlay.id = 'create-exam-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:20000;padding:20px;';
  
  overlay.innerHTML = 
    '<div class="fv-box" style="width:600px; max-height:85vh; overflow-y:auto; text-align:left; display:flex; flex-direction:column; gap:20px; padding:32px; border-radius:20px; background:#fff; border:1.5px solid var(--border); box-shadow:0 12px 50px rgba(0,0,0,0.15); animation:cardEntrance .4s ease;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<div style="font-size:22px;font-weight:800;color:var(--text)">Create New Exam</div>' +
        '<button onclick="closeCreateExamModal()" style="background:none;border:none;font-size:20px;color:var(--text3);cursor:pointer;line-height:1">✕</button>' +
      '</div>' +
      
      '<div style="display:flex;gap:16px">' +
        '<div class="form-group" style="flex:2;margin-bottom:0">' +
          '<label class="form-label">Exam Title</label>' +
          '<input id="ce-title" placeholder="e.g. Engineering Physics" style="width:100%" />' +
        '</div>' +
        '<div class="form-group" style="flex:1;margin-bottom:0">' +
          '<label class="form-label">Exam Code</label>' +
          '<input id="ce-code" placeholder="e.g. PHYS101" style="width:100%;text-transform:uppercase" />' +
        '</div>' +
      '</div>' +

      '<div style="display:flex;gap:16px">' +
        '<div class="form-group" style="flex:1;margin-bottom:0">' +
          '<label class="form-label">Start Time</label>' +
          '<input id="ce-start-time" type="time" value="23:00" style="width:100%" oninput="updateCreateExamDuration()" />' +
        '</div>' +
        '<div class="form-group" style="flex:1;margin-bottom:0">' +
          '<label class="form-label">End Time</label>' +
          '<input id="ce-end-time" type="time" value="00:30" style="width:100%" oninput="updateCreateExamDuration()" />' +
        '</div>' +
      '</div>' +
      
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:-8px">' +
        '<div style="font-size:12px;color:var(--text3)">' +
          'Calculated Duration: <strong id="ce-duration-val" style="color:var(--cyan)">90</strong> minutes' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:0">' +
          '<label class="form-label" style="display:inline">Date</label> &nbsp;' +
          '<input id="ce-date" type="date" value="' + new Date().toISOString().slice(0,10) + '" style="display:inline;width:150px;padding:6px" />' +
        '</div>' +
      '</div>' +
      
      '<div style="border-top:1.5px solid var(--border);padding-top:16px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
          '<span style="font-weight:700;color:var(--text)">Questions (Total Marks: <strong id="ce-total-marks" style="color:var(--cyan)">1</strong>)</span>' +
          '<button class="btn-outline btn-sm" onclick="addQuestionField()">＋ Add Question</button>' +
        '</div>' +
        '<div id="ce-questions-container" style="display:flex;flex-direction:column;gap:16px;max-height:280px;overflow-y:auto;padding-right:8px;">' +
        '</div>' +
      '</div>' +
      
      '<div id="ce-err" class="hidden" style="font-size:12px;color:#f87171;padding:10px 14px;background:rgba(239,68,68,0.1);border-radius:10px;border:1px solid rgba(239,68,68,0.3);font-weight:600"></div>' +
      
      '<div style="display:flex;gap:12px;margin-top:8px">' +
        '<button class="btn-outline" style="flex:1" onclick="closeCreateExamModal()">Cancel</button>' +
        '<button class="btn-primary" style="flex:2" onclick="submitCreateExam()">Create & Publish Exam</button>' +
      '</div>' +
    '</div>';
    
  document.body.appendChild(overlay);
  renderQuestionFields();
}

function renderQuestionFields() {
  var container = document.getElementById('ce-questions-container');
  if (!container) return;
  
  container.innerHTML = customQuestions.map(function(q, index) {
    q.type = q.type || 'MCQ';
    q.marks = q.marks || 1;
    
    var optionFields = '';
    if (q.type === 'MCQ') {
      optionFields = 
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
          '<div>' +
            '<label class="form-label" style="font-size:10px;margin-bottom:4px">Option A</label>' +
            '<input class="ce-opt" data-index="' + index + '" data-opt="0" placeholder="Option A" value="' + (q.opts[0] || '') + '" style="width:100%;font-size:12px;padding:8px" oninput="updateQuestionOption(' + index + ', 0, this.value)" />' +
          '</div>' +
          '<div>' +
            '<label class="form-label" style="font-size:10px;margin-bottom:4px">Option B</label>' +
            '<input class="ce-opt" data-index="' + index + '" data-opt="1" placeholder="Option B" value="' + (q.opts[1] || '') + '" style="width:100%;font-size:12px;padding:8px" oninput="updateQuestionOption(' + index + ', 1, this.value)" />' +
          '</div>' +
          '<div>' +
            '<label class="form-label" style="font-size:10px;margin-bottom:4px">Option C</label>' +
            '<input class="ce-opt" data-index="' + index + '" data-opt="2" placeholder="Option C" value="' + (q.opts[2] || '') + '" style="width:100%;font-size:12px;padding:8px" oninput="updateQuestionOption(' + index + ', 2, this.value)" />' +
          '</div>' +
          '<div>' +
            '<label class="form-label" style="font-size:10px;margin-bottom:4px">Option D</label>' +
            '<input class="ce-opt" data-index="' + index + '" data-opt="3" placeholder="Option D" value="' + (q.opts[3] || '') + '" style="width:100%;font-size:12px;padding:8px" oninput="updateQuestionOption(' + index + ', 3, this.value)" />' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<label class="form-label" style="font-size:10px;margin-bottom:4px">Correct Answer</label>' +
          '<select class="select-field" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:12px" onchange="updateQuestionData(' + index + ', \'ans\', parseInt(this.value))">' +
            '<option value="0" ' + (q.ans === 0 ? 'selected' : '') + '>Option A</option>' +
            '<option value="1" ' + (q.ans === 1 ? 'selected' : '') + '>Option B</option>' +
            '<option value="2" ' + (q.ans === 2 ? 'selected' : '') + '>Option C</option>' +
            '<option value="3" ' + (q.ans === 3 ? 'selected' : '') + '>Option D</option>' +
          '</select>' +
        '</div>';
    } else {
      optionFields = '<div style="font-size:11px;color:var(--text3);font-style:italic;background:var(--bg2);padding:10px;border-radius:8px;border:1.5px dashed var(--border)">Subjective question — student will type a descriptive answer. No option values required.</div>';
    }
    
    return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:12px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<span style="font-size:11px;font-weight:800;color:var(--cyan)">QUESTION ' + (index + 1) + '</span>' +
        (customQuestions.length > 1 
          ? '<button onclick="removeQuestionField(' + index + ')" style="background:none;border:none;color:#f87171;font-size:11px;font-weight:700;cursor:pointer;padding:0">Remove</button>' 
          : '') +
      '</div>' +
      '<div class="form-group" style="margin-bottom:0">' +
        '<label class="form-label" style="font-size:11px">Question Text</label>' +
        '<input class="ce-q-text" data-index="' + index + '" placeholder="e.g. Solve x^2 = 4" value="' + (q.q || '') + '" style="width:100%" oninput="updateQuestionData(' + index + ', \'q\', this.value)" />' +
      '</div>' +
      '<div>' +
        '<label class="form-label" style="font-size:10px;margin-bottom:4px">Question Type & Marks</label>' +
        '<select class="select-field" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:12px" onchange="updateQuestionType(' + index + ', this.value)">' +
          '<option value="MCQ" ' + (q.type === 'MCQ' ? 'selected' : '') + '>MCQ (1 Mark)</option>' +
          '<option value="2 Mark" ' + (q.type === '2 Mark' ? 'selected' : '') + '>Short Answer (2 Marks)</option>' +
          '<option value="13 Mark" ' + (q.type === '13 Mark' ? 'selected' : '') + '>Long Answer (13 Marks)</option>' +
          '<option value="16 Mark" ' + (q.type === '16 Mark' ? 'selected' : '') + '>Descriptive (16 Marks)</option>' +
        '</select>' +
      '</div>' +
      optionFields +
    '</div>';
  }).join('');
  
  // Calculate dynamic Total Marks
  var totalMarks = customQuestions.reduce(function(acc, q) {
    var m = q.type === 'MCQ' ? 1 : q.type === '2 Mark' ? 2 : q.type === '13 Mark' ? 13 : q.type === '16 Mark' ? 16 : 1;
    q.marks = m;
    return acc + m;
  }, 0);
  
  var marksSpan = document.getElementById('ce-total-marks');
  if (marksSpan) marksSpan.textContent = totalMarks;
}

function updateQuestionType(index, type) {
  customQuestions[index].type = type;
  var marks = type === 'MCQ' ? 1 : type === '2 Mark' ? 2 : type === '13 Mark' ? 13 : type === '16 Mark' ? 16 : 1;
  customQuestions[index].marks = marks;
  renderQuestionFields();
}

function updateCreateExamDuration() {
  var start = document.getElementById('ce-start-time').value;
  var end = document.getElementById('ce-end-time').value;
  var duration = calculateDurationInMinutes(start, end);
  var durationSpan = document.getElementById('ce-duration-val');
  if (durationSpan) durationSpan.textContent = duration;
}

function addQuestionField() {
  customQuestions.push({ q: '', type: 'MCQ', marks: 1, opts: ['', '', '', ''], ans: 0 });
  renderQuestionFields();
  var container = document.getElementById('ce-questions-container');
  if (container) {
    setTimeout(function() {
      container.scrollTop = container.scrollHeight;
    }, 50);
  }
}

function removeQuestionField(index) {
  customQuestions.splice(index, 1);
  renderQuestionFields();
}

function updateQuestionData(index, key, val) {
  customQuestions[index][key] = val;
}

function updateQuestionOption(index, optIndex, val) {
  customQuestions[index].opts[optIndex] = val;
}

function closeCreateExamModal() {
  var overlay = document.getElementById('create-exam-overlay');
  if (overlay) overlay.remove();
}

function submitCreateExam() {
  var title = document.getElementById('ce-title').value.trim();
  var code = document.getElementById('ce-code').value.trim().toUpperCase();
  var startTime = document.getElementById('ce-start-time').value;
  var endTime = document.getElementById('ce-end-time').value;
  var date = document.getElementById('ce-date').value;
  
  if (!title) { showCreateExamErr('Please enter an exam title.'); return; }
  if (!code) { showCreateExamErr('Please enter an exam code.'); return; }
  if (!startTime) { showCreateExamErr('Please select a start time.'); return; }
  if (!endTime) { showCreateExamErr('Please select an end time.'); return; }
  if (!date) { showCreateExamErr('Please select a date.'); return; }
  
  var duration = calculateDurationInMinutes(startTime, endTime);
  if (duration === 0) { showCreateExamErr('Start time and End time cannot be the same.'); return; }
  
  for (var i = 0; i < customQuestions.length; i++) {
    var q = customQuestions[i];
    if (!q.q.trim()) { showCreateExamErr('Question ' + (i+1) + ' text is empty.'); return; }
    if (q.type === 'MCQ') {
      for (var j = 0; j < 4; j++) {
        if (!q.opts[j].trim()) { showCreateExamErr('Question ' + (i+1) + ' Option ' + String.fromCharCode(65 + j) + ' is empty.'); return; }
      }
    }
  }
  
  var nextId = EXAMS.length > 0 ? Math.max.apply(null, EXAMS.map(function(e){ return e.id; })) + 1 : 1;
  var newExam = {
    id: nextId,
    title: title,
    code: code,
    questions: customQuestions.length,
    duration: duration,
    startTime: startTime,
    endTime: endTime,
    status: 'active',
    enrolled: 0,
    date: date,
    questionsList: JSON.parse(JSON.stringify(customQuestions))
  };
  
  var newStudentExam = {
    id: nextId,
    title: title,
    code: code,
    questions: customQuestions.length,
    duration: duration,
    startTime: startTime,
    endTime: endTime,
    status: 'available',
    date: date,
    score: null,
    questionsList: JSON.parse(JSON.stringify(customQuestions))
  };
  
  EXAMS.push(newExam);
  studentExams.push(newStudentExam);
  saveExams();
  
  closeCreateExamModal();
  renderAExams();
}

function showCreateExamErr(msg) {
  var err = document.getElementById('ce-err');
  if (err) {
    err.textContent = '⚠ ' + msg;
    err.classList.remove('hidden');
    err.style.animation = 'none';
    setTimeout(function(){ err.style.animation = 'shake .35s ease'; }, 10);
  }
}

// Patch joinCode & joinCode2 to handle custom codes properly
joinCode = function() {
  var c = (document.getElementById('code-inp')||{}).value||'';
  c = c.trim().toUpperCase();
  if (!c) { alert('Enter an exam code.'); return; }
  
  var exam = EXAMS.find(function(e){ return e.code === c; });
  if (exam) {
    var hasExam = studentExams.some(function(se){ return se.id === exam.id; });
    if (!hasExam) {
      studentExams.push({
        id: exam.id,
        title: exam.title,
        code: exam.code,
        questions: exam.questions,
        duration: exam.duration,
        startTime: exam.startTime,
        endTime: exam.endTime,
        status: 'available',
        date: exam.date,
        score: null,
        questionsList: exam.questionsList
      });
      saveExams();
    }
    startExam(exam.id);
  } else {
    alert('Invalid exam code. Please check and try again.');
  }
};

joinCode2 = function() {
  var c = (document.getElementById('join-code')||{}).value||'';
  c = c.trim().toUpperCase();
  if (!c) { alert('Enter an exam code.'); return; }
  
  var exam = EXAMS.find(function(e){ return e.code === c; });
  if (exam) {
    var hasExam = studentExams.some(function(se){ return se.id === exam.id; });
    if (!hasExam) {
      studentExams.push({
        id: exam.id,
        title: exam.title,
        code: exam.code,
        questions: exam.questions,
        duration: exam.duration,
        startTime: exam.startTime,
        endTime: exam.endTime,
        status: 'available',
        date: exam.date,
        score: null,
        questionsList: exam.questionsList
      });
      saveExams();
    }
    startExam(exam.id);
  } else {
    alert('Invalid exam code. Please check and try again.');
  }
};

// Patch startExam to set dynamic questions, time limits, check accessibility time window, and initiate all proctoring components
startExam = function(id) {
  var exam = studentExams.find(function(e){ return e.id === id; }) || EXAMS.find(function(e){ return e.id === id; });
  if (!exam) {
    alert('Exam not found.');
    return;
  }
  
  // Accessibility check for exam time window
  if (exam.startTime && exam.endTime) {
    var now = new Date();
    var currentHour = now.getHours();
    var currentMin = now.getMinutes();
    var currentTimeVal = currentHour * 60 + currentMin;
    
    var s = exam.startTime.split(':');
    var e = exam.endTime.split(':');
    var sVal = parseInt(s[0]) * 60 + parseInt(s[1]);
    var eVal = parseInt(e[0]) * 60 + parseInt(e[1]);
    
    var isAccessible = false;
    if (sVal <= eVal) {
      isAccessible = (currentTimeVal >= sVal && currentTimeVal <= eVal);
    } else {
      isAccessible = (currentTimeVal >= sVal || currentTimeVal <= eVal);
    }
    
    if (!isAccessible) {
      var timeRangeMsg = formatTime(exam.startTime) + ' to ' + formatTime(exam.endTime);
      var proceed = confirm('⚠️ Scheduled Time Warning:\n\nThe current time is outside the scheduled exam window (' + timeRangeMsg + ').\n\nIn a live proctored environment, access would be strictly blocked.\n\nClick OK to bypass this check for testing, or Cancel to go back.');
      if (!proceed) return;
    }
  }
  
  currentExamId = id;
  
  // Set QUESTIONS dynamically
  if (exam.questionsList && exam.questionsList.length > 0) {
    QUESTIONS = JSON.parse(JSON.stringify(exam.questionsList));
  } else {
    QUESTIONS = JSON.parse(JSON.stringify(ORIGINAL_QUESTIONS));
  }
  
  examAnswers = {};
  examTimeLeft = exam.duration * 60;
  violationCount = 0;
  suspicionScore = 0;
  sessionViolations = [];
  lastFaceState = 'normal';
  noFaceConsecutive = 0;
  noFaceWarningCount = 0;
  multipleFacesAutoSubmitted = false;
  phoneDetected = false;
  clearInterval(examTimer);
  examActive = true;

  if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
    LIVE_SESSIONS[currentStudent.name].status   = 'exam';
    LIVE_SESSIONS[currentStudent.name].examStarted = true;
    LIVE_SESSIONS[currentStudent.name].examName = exam.code;
    LIVE_SESSIONS[currentStudent.name].examStart = new Date().toLocaleTimeString();
  }
  
  renderExam(id);
  
  startTimer();
  startCam();
  startExamMonitoring();
  startWaveform();
  
  setTimeout(function() {
    window.reEnterFullScreen();
  }, 100);
};

// Text Area Answer Handler for subjective questions
function saveTextAns(qId, val) {
  examAnswers[qId] = val;
  var navBtn = document.getElementById('nav-' + qId);
  if (navBtn) {
    if (val.trim() !== '') {
      navBtn.classList.add('answered');
    } else {
      navBtn.classList.remove('answered');
    }
  }
  
  // Count answered questions
  var count = 0;
  QUESTIONS.forEach(function(q){
    var ans = examAnswers[q.id];
    if (ans !== undefined && ans !== null && String(ans).trim() !== '') {
      count++;
    }
  });
  var ac = document.getElementById('ans-count'); if(ac) ac.textContent = count;
  var ab = document.getElementById('ans-bar'); if (ab) ab.style.width = (count / QUESTIONS.length * 100) + '%';
}

// Override renderExam to support descriptive (Subjective) questions with original proctor layout & CSS hook compatibility
renderExam = function(id) {
  var exam = studentExams.find(function(e){ return e.id === id; }) || studentExams[0];
  document.getElementById('s-content').innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 280px;gap:18px" class="page-enter">' +
      /* Left: Questions */
      '<div>' +
        '<div class="proctor-bar" id="proctor-bar">' +
          '<span style="width:9px;height:9px;border-radius:50%;background:var(--red);animation:blink 1.2s infinite;display:inline-block;box-shadow:0 0 6px var(--red)"></span>' +
          '&nbsp;🔴 STRICT MODE: Multiple faces = instant auto-submit · No face (2nd time) = auto-submit · No tab switching' +
        '</div>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">' +
          '<div>' +
            '<div class="page-title" style="margin-bottom:2px;font-size:18px">' + exam.title + '</div>' +
            '<div style="font-size:12px;color:var(--text3)">' + QUESTIONS.length + ' questions &nbsp;·&nbsp; Browser-proctored</div>' +
          '</div>' +
          '<div style="text-align:right">' +
            '<div style="font-size:10px;color:var(--text3);margin-bottom:4px;font-weight:700;text-transform:uppercase;letter-spacing:.6px">Time Remaining</div>' +
            '<div class="timer-display" id="exam-timer">60:00</div>' +
          '</div>' +
        '</div>' +
        '<div id="qs-area">' +
          QUESTIONS.map(function(q, i){
            var questionBody = '';
            var isMCQ = q.type === 'MCQ' || !q.type;
            if (isMCQ) {
              questionBody = q.opts.map(function(opt, j){
                return '<div class="q-opt" id="opt-' + q.id + '-' + j + '" onclick="pickAns(' + q.id + ',' + j + ')">' +
                  '<div class="q-radio"><div class="q-radio-in"></div></div>' + opt + '</div>';
              }).join('');
            } else {
              questionBody = '<div style="margin-top:8px">' +
                '<textarea placeholder="Type your answer here..." id="ans-text-' + q.id + '" oninput="saveTextAns(' + q.id + ', this.value)" style="width:100%; min-height:120px; border-radius:10px; border:1.5px solid var(--border); padding:12px; background:var(--bg2); color:var(--text); font-family:inherit; font-size:13px; resize:vertical;"></textarea>' +
                '</div>';
            }
            
            return '<div class="q-block" style="animation:cardEntrance .4s ' + (i*0.07) + 's ease both">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
                '<span style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.8px">Question ' + (i+1) + ' <span style="color:var(--border2)">/ ' + QUESTIONS.length + '</span></span>' +
                '<span class="badge badge-cyan" style="font-size:10px">' + (q.type ? q.type + ' (' + q.marks + ' Marks)' : 'MCQ (1 Mark)') + '</span>' +
              '</div>' +
              '<div style="font-size:14px;color:var(--text);margin-bottom:16px;font-weight:600;line-height:1.6">' + q.q + '</div>' +
              questionBody +
            '</div>';
          }).join('') +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:20px;padding:16px 0;border-top:1px solid var(--border)">' +
          '<button class="btn-outline" onclick="renderSDash()">Save &amp; Exit</button>' +
          '<button class="btn-primary" style="padding:11px 24px" onclick="submitExam(false)">Submit Exam ✓</button>' +
        '</div>' +
      '</div>' +
      /* Right: Camera + Monitor + Navigation + Simulator Controls */
      '<div>' +
        '<div class="card" style="margin-bottom:14px;padding:16px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">' +
            '<div class="section-title" style="font-size:12px;margin-bottom:0">📹 Camera Monitor</div>' +
            '<span class="badge badge-live" style="font-size:9px">LIVE</span>' +
          '</div>' +
          '<div class="cam-feed" id="cam-box">' +
            '<div id="cam-placeholder" style="text-align:center;padding:24px">' +
              '<div style="font-size:36px;color:var(--text3);margin-bottom:8px;animation:blink 2s infinite">◉</div>' +
              '<div style="font-size:11px;color:var(--text3)">Requesting camera...</div>' +
            '</div>' +
            '<div class="cam-grid"></div>' +
            '<div class="cam-corner tl"></div><div class="cam-corner tr"></div>' +
            '<div class="cam-corner bl"></div><div class="cam-corner br"></div>' +
            '<div class="cam-viol-bar" id="cam-viol-bar">⚠ VIOLATION DETECTED</div>' +
            '<div class="face-count-badge" id="face-count-badge"></div>' +
            '<div class="rec-dot"></div>' +
          '</div>' +
          '<div id="cam-status" style="font-size:11px;color:var(--text3);margin-top:9px;font-weight:600">Initializing...</div>' +
          '<div id="face-model-s" style="font-size:10px;color:var(--text3);margin-top:3px">Starting face detection...</div>' +
          '<div class="py-notice">✅ Browser-native proctoring — no extra software needed</div>' +
        '</div>' +

        /* Suspicion Score Card */
        '<div class="card" style="margin-bottom:14px;padding:16px;text-align:center" id="suspicion-card">' +
          '<div class="section-title" style="font-size:12px;margin-bottom:12px;text-align:left">⚡ Suspicion Score</div>' +
          '<div id="live-suspicion-gauge">' + buildSuspicionGauge(0) + '</div>' +
          '<div style="font-size:10px;color:var(--text3);margin-top:4px;font-weight:600;letter-spacing:.4px">REAL-TIME RISK LEVEL</div>' +
        '</div>' +

        /* Audio Monitor */
        '<div class="card" style="margin-bottom:14px;padding:14px">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
            '<div class="section-title" style="font-size:12px;margin-bottom:0">🎙 Audio Monitor</div>' +
            '<div class="audio-bars">' +
              [1,2,3,4,5,6].map(function(i){ return '<div class="audio-bar" style="--dur:' + (0.3+i*0.07) + 's;--h:' + (5+i*2) + 'px"></div>'; }).join('') +
            '</div>' +
          '</div>' +
          '<div class="waveform-wrap"><canvas id="waveform-canvas"></canvas></div>' +
          '<div style="font-size:10px;color:var(--green);margin-top:4px;font-weight:600">● Audio monitoring active</div>' +
        '</div>' +

        /* Question Navigator */
        '<div class="card" style="padding:16px;margin-bottom:14px">' +
          '<div class="section-title" style="font-size:12px;margin-bottom:10px">Question Navigator</div>' +
          '<div class="q-nav-grid" id="q-nav">' +
            QUESTIONS.map(function(q, i){ return '<div class="q-nav-btn" id="nav-' + q.id + '" onclick="scrollToQ(' + i + ')">' + (i+1) + '</div>'; }).join('') +
          '</div>' +
          '<div class="divider"></div>' +
          '<div style="font-size:12px;color:var(--text2)">Answered: <strong id="ans-count" style="color:var(--cyan)">0</strong> / ' + QUESTIONS.length + '</div>' +
          '<div style="height:4px;background:var(--border);border-radius:5px;margin-top:7px">' +
            '<div id="ans-bar" style="height:100%;background:linear-gradient(90deg,var(--cyan2),var(--blue));border-radius:5px;width:0%;transition:width .4s ease;box-shadow:0 0 8px var(--cyan-glow)"></div>' +
          '</div>' +
          '<div class="divider"></div>' +
          '<div style="font-size:11px;color:var(--text2)">Violations: <strong id="viol-count" style="color:var(--red);font-family:\'JetBrains Mono\',monospace">0</strong><span style="color:var(--text3)"> / 2</span></div>' +
        '</div>' +
        
        /* 🧪 Proctor Demo Controls */
        '<div class="card" style="padding:16px;border-color:rgba(147,51,234,0.3)">' +
          '<div class="section-title" style="font-size:12px;margin-bottom:10px;color:var(--purple)">🧪 Proctor Demo Controls</div>' +
          '<div style="display:grid;grid-template-columns:1fr;gap:8px">' +
            '<button class="btn-outline btn-sm" style="font-size:11px;padding:6px;border-color:var(--purple);color:var(--purple)" onclick="simulateLookAway()">👁 Simulate Gaze Look-Away</button>' +
            '<button class="btn-outline btn-sm" style="font-size:11px;padding:6px;border-color:var(--purple);color:var(--purple)" onclick="simulatePhoneDetected()">📱 Simulate Mobile Phone</button>' +
            '<button class="btn-outline btn-sm" style="font-size:11px;padding:6px;border-color:var(--purple);color:var(--purple)" onclick="simulateMultipleFaces()">👥 Simulate Multiple Faces</button>' +
          '</div>' +
          '<div style="font-size:9px;color:var(--text3);text-align:center;margin-top:8px">Use these to test auto-grading, violations, and auto-submit features.</div>' +
        '</div>' +
      '</div>' +
    '</div>';
};

/* =====================================================
   GAZE LOOK-AWAY & PHONE DETECTION OVERRIDES
===================================================== */

// Override checkGazeAway to make Gaze Diversion a real violation (not just a warning)
checkGazeAway = function(isAway) {
  if (!examActive) { gazeAwayConsecutive = 0; return; }
  if (gazeWarningCooldown > 0) gazeWarningCooldown--;
  if (isAway) {
    gazeAwayConsecutive++;
    /* Require ~3 consecutive frames (~2 s) to avoid blinks */
    if (gazeAwayConsecutive >= 3 && gazeWarningCooldown === 0) {
      gazeWarningCooldown = 8; /* Cooldown in seconds before next violation can trigger */
      
      violationCount++;
      var vc = document.getElementById('viol-count'); if (vc) vc.textContent = violationCount;
      
      var bar = document.getElementById('cam-viol-bar');
      if (bar) { 
        bar.classList.add('visible'); 
        bar.textContent = '👀  LOOK AT THE SCREEN — Gaze diverted'; 
        bar.style.background = 'rgba(239,68,68,0.85)'; 
      }
      setCamStatus('⚠ Gaze diverted — violation logged', 'red');
      
      var examCode = 'CS101';
      if (typeof currentExamId !== 'undefined' && currentExamId) {
        var activeEx = studentExams.find(function(e){ return e.id === currentExamId; }) || EXAMS.find(function(e){ return e.id === currentExamId; });
        if (activeEx && activeEx.code) examCode = activeEx.code;
      }
      
      var v = {
        type: 'Gaze Diverted',
        time: new Date().toLocaleTimeString(),
        exam: examCode,
        severity: 'medium',
        desc: 'Student is looking away from the screen (gaze diverted).',
        photo: captureViolationPhoto()
      };
      sessionViolations.push(v);
      if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
        LIVE_SESSIONS[currentStudent.name].violations.push(v);
      }
      updateSuspicionScore(20);
      
      showViolationAlert('👀 Gaze Diverted Detected',
        'Please keep your eyes on the screen. Looking away is a security violation.', false);
        
      /* Save to DB */
      recordPersistentViolation(currentStudent.name || 'Unknown', v);
      
      checkAutoSubmit();
    }
  } else {
    if (gazeAwayConsecutive > 0) {
      gazeAwayConsecutive = 0;
      var bar2 = document.getElementById('cam-viol-bar');
      if (bar2 && bar2.textContent.indexOf('LOOK AT THE SCREEN') !== -1) {
        bar2.classList.remove('visible');
      }
    }
  }
};

// Override handlePhoneDetectedML to use the dynamic active exam code
handlePhoneDetectedML = function(objClass, confidence) {
  if (phoneDetected || !examActive) return;
  phoneDetected = true;
  var camBox = document.getElementById('cam-box');
  if (camBox) camBox.classList.add('phone-detected');
  var photo = captureViolationPhoto();
  var label = objClass === 'cell phone' ? 'Mobile Phone' : ('Unauthorized Device (' + objClass + ')');
  
  var examCode = 'CS101';
  if (typeof currentExamId !== 'undefined' && currentExamId) {
    var activeEx = studentExams.find(function(e){ return e.id === currentExamId; }) || EXAMS.find(function(e){ return e.id === currentExamId; });
    if (activeEx && activeEx.code) examCode = activeEx.code;
  }
  
  var v = {
    type: label + ' Detected',
    time: new Date().toLocaleTimeString(),
    exam: examCode,
    severity: 'high',
    desc: label + ' detected in camera frame (AI confidence: ' + confidence + '%). Exam auto-submitted per policy.',
    photo: photo
  };
  sessionViolations.push(v);
  violationCount++;
  if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
    LIVE_SESSIONS[currentStudent.name].violations.push(v);
  }
  updateSuspicionScore(35);
  var vc = document.getElementById('viol-count'); if (vc) vc.textContent = violationCount;
  escalateProctorBar(label + ' Detected');
  showViolationAlert('📵 ' + label + ' Detected — Auto-Submitting!',
    label + ' detected in your camera (AI confidence: ' + confidence + '%). Critical violation. Exam submitting in 5 seconds.', true);
  startAutoSubmitCountdown(label + ' detected in camera');

  /* Save to DB */
  recordPersistentViolation(currentStudent.name || 'Unknown', v);
};

// Proctor Simulation Controllers
window.simulateLookAway = function() {
  if (!examActive) return;
  checkGazeAway(true);
};

window.simulatePhoneDetected = function() {
  if (!examActive) return;
  handlePhoneDetectedML('cell phone', 98);
};

window.simulateMultipleFaces = function() {
  if (!examActive) return;
  applyFaceResult(2, true);
};

// Override submitExam to save student's exam status, allow manual evaluation, and support pending score displays
submitExam = function(autoSubmit) {
  if (!autoSubmit) {
    if (!confirm('Are you sure you want to submit your exam?')) return;
  }
  
  if (typeof examTimer !== 'undefined') clearInterval(examTimer);
  if (typeof stopCam === 'function') try { stopCam(); } catch(e){}
  if (typeof stopExamMonitoring === 'function') try { stopExamMonitoring(); } catch(e){}
  if (typeof stopWaveform === 'function') try { stopWaveform(); } catch(e){}
  examActive = false;
  if (typeof closeToast === 'function') try { closeToast(); } catch(e){}

  // Exit Fullscreen
  try {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  } catch(e) {}

  var hasSubjective = QUESTIONS.some(function(q){ return q.type && q.type !== 'MCQ'; });
  var totalMarksPossible = 0;
  var mcqScore = 0;
  
  QUESTIONS.forEach(function(q) {
    var maxMarks = q.type === 'MCQ' ? 1 : q.type === '2 Mark' ? 2 : q.type === '13 Mark' ? 13 : q.type === '16 Mark' ? 16 : 1;
    if (!q.type) maxMarks = 1;
    totalMarksPossible += maxMarks;
    
    var isMCQ = q.type === 'MCQ' || !q.type;
    if (isMCQ) {
      if (examAnswers[q.id] === q.ans) {
        mcqScore += maxMarks;
      }
    }
  });

  var calculatedPct = totalMarksPossible > 0 ? Math.round(mcqScore / totalMarksPossible * 100) : 0;

  var exam = studentExams.find(function(e){ return e.id === currentExamId; }) || EXAMS.find(function(e){ return e.id === currentExamId; });
  var examCode = (exam && exam.code) || 'CS101';
  var examTitle = (exam && exam.title) || 'Exam';

  // Create submission record for staff evaluation
  if (!HM_DB.submissions) HM_DB.submissions = [];
  var existingSubIndex = HM_DB.submissions.findIndex(function(s){
    return s.studentName === currentStudent.name && s.examId === currentExamId;
  });
  
  var storageKey = 'rec_' + currentStudent.name + '_' + currentExamId;
  
  var subData = {
    studentName: currentStudent.name,
    college: currentStudent.college || 'HexaMinds College',
    examId: currentExamId,
    examTitle: examTitle,
    examCode: examCode,
    submitTime: new Date().toLocaleString(),
    answers: JSON.parse(JSON.stringify(examAnswers)),
    questions: JSON.parse(JSON.stringify(QUESTIONS)),
    status: hasSubjective ? 'pending' : 'graded',
    mcqScore: mcqScore,
    subjectiveScores: {},
    totalScore: hasSubjective ? 0 : mcqScore,
    totalPossible: totalMarksPossible,
    comments: '',
    storageKey: storageKey
  };

  if (existingSubIndex !== -1) {
    HM_DB.submissions[existingSubIndex] = subData;
  } else {
    HM_DB.submissions.push(subData);
  }
  
  // Save to DB
  if (typeof firebaseSaveSubmission === 'function') firebaseSaveSubmission(subData);

  // Update student's completed exams list
  var se = studentExams.find(function(e){ return e.id === currentExamId; });
  if (se) {
    se.status = 'completed';
    se.score = hasSubjective ? 'Pending' : calculatedPct;
    saveExams();
  }

  // Update LIVE_SESSIONS
  if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
    var ls = LIVE_SESSIONS[currentStudent.name];
    ls.status = 'online'; 
    ls.score = hasSubjective ? 'Pending' : calculatedPct; 
    ls.grade = hasSubjective ? 'Pending' : (calculatedPct >= 90 ? 'A' : calculatedPct >= 80 ? 'B+' : calculatedPct >= 70 ? 'B' : calculatedPct >= 60 ? 'C' : 'F');
    ls.examSubmitted = true; 
    ls.submitTime = new Date().toLocaleTimeString();
    ls.autoSubmitted = autoSubmit;
    if (typeof firebaseSyncSessions === 'function') firebaseSyncSessions();
  }
  
  if (typeof firebaseSaveSubmission === 'function') firebaseSaveSubmission(subData);
  if (typeof firebaseSyncDb === 'function') firebaseSyncDb();

  // Render the submission screen
  var contentEl = document.getElementById('s-content');
  if (contentEl) {
    contentEl.innerHTML =
      '<div style="max-width:580px;margin:0 auto;text-align:center;padding:34px 0" class="page-enter">' +
        '<div style="font-size:64px;margin-bottom:16px;animation:hexFloat 2s ease infinite">' + (autoSubmit ? '⛔' : hasSubjective ? '📝' : '✅') + '</div>' +
        '<div class="page-title" style="font-size:22px;margin-bottom:6px">' + (autoSubmit ? 'Exam Auto-Submitted' : 'Exam Submitted!') + '</div>' +
        '<div style="font-size:13px;color:var(--text3);margin:6px 0 28px">' + 
          (hasSubjective 
            ? 'Answers recorded. Descriptive questions are **pending manual evaluation** by your staff.'
            : 'Answers recorded and auto-graded successfully.') + 
        '</div>' +
        
        '<div class="card" style="text-align:left;margin-bottom:22px">' +
          '<div style="text-align:center;padding:24px 0 20px">' +
            '<div style="font-size:11px;color:var(--text3);margin-bottom:8px;text-transform:uppercase;font-weight:700;letter-spacing:.7px">Grade Status</div>' +
            '<div style="font-size:44px;font-weight:800;color:var(--cyan);font-family:\'JetBrains Mono\',monospace">' + 
              (hasSubjective ? 'PENDING' : (calculatedPct + '%')) + 
            '</div>' +
            '<div style="font-size:13px;color:var(--text2);margin-top:6px">' + 
              (hasSubjective 
                ? ('Auto-graded MCQ score: ' + mcqScore + ' Marks')
                : (mcqScore + ' / ' + totalMarksPossible + ' Marks')) + 
            '</div>' +
          '</div>' +
          '<div class="divider"></div>' +
          '<div style="display:flex;align-items:center;justify-content:center;gap:20px;padding:12px 0">' +
            (typeof buildSuspicionGauge === 'function' ? buildSuspicionGauge(suspicionScore) : '') +
            '<div><div style="font-size:12px;font-weight:700;color:var(--text2)">Final Suspicion</div><div style="font-size:11px;color:var(--text3);margin-top:3px">Based on ' + sessionViolations.length + ' violation(s)</div></div>' +
          '</div>' +
        '</div>' +
        '<button class="btn-primary" style="padding:12px 32px;font-size:14px" onclick="renderSDash()">← Back to Dashboard</button>' +
      '</div>';
  }
};

// Override renderSDash to show dynamic stats, lists, and read grades from evaluation system
renderSDash = function() {
  var profilePhotoHtml = '';
  if (studentProfilePhoto) {
    profilePhotoHtml = '<div style="width:56px;height:56px;border-radius:14px;overflow:hidden;flex-shrink:0;border:2px solid var(--cyan);background-image:url(' + studentProfilePhoto + ');background-size:cover;background-position:center;"></div>';
  } else {
    var initials = currentStudent.initials || (currentStudent.name ? currentStudent.name.split(' ').map(function(n){ return n[0]; }).join('').toUpperCase().slice(0,2) : 'S');
    profilePhotoHtml = '<div class="avatar" style="width:56px;height:56px;border-radius:14px;font-size:18px;font-weight:800;flex-shrink:0">' + initials + '</div>';
  }

  // Exit Fullscreen
  try {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
    else if (document.msExitFullscreen) document.msExitFullscreen();
  } catch(e) {}

  // Calculate dynamic metrics
  var availableCount = studentExams.filter(function(e){ return e.status === 'available'; }).length;
  var completedCount = studentExams.filter(function(e){ return e.status === 'completed'; }).length;
  
  var avgScore = '—';
  var grade = '—';
  var completedExamsWithScores = studentExams.filter(function(e){
    var finalScore = e.score;
    if (HM_DB.grades && HM_DB.grades[currentStudent.name] && HM_DB.grades[currentStudent.name][e.id] !== undefined) {
      finalScore = HM_DB.grades[currentStudent.name][e.id];
    }
    return e.status === 'completed' && finalScore !== 'Pending' && finalScore !== null;
  });
  
  if (completedExamsWithScores.length > 0) {
    var sum = completedExamsWithScores.reduce(function(acc, e){
      var finalScore = HM_DB.grades && HM_DB.grades[currentStudent.name] && HM_DB.grades[currentStudent.name][e.id] !== undefined
        ? HM_DB.grades[currentStudent.name][e.id]
        : e.score;
      return acc + finalScore;
    }, 0);
    avgScore = Math.round(sum / completedExamsWithScores.length) + '%';
    var numScore = Math.round(sum / completedExamsWithScores.length);
    grade = numScore >= 90 ? 'A' : numScore >= 80 ? 'B+' : numScore >= 70 ? 'B' : numScore >= 60 ? 'C' : 'F';
  }

  document.getElementById('s-content').innerHTML =
    '<div class="page-enter">' +
    '<div style="display:flex;align-items:center;gap:16px;margin-bottom:24px">' +
      profilePhotoHtml +
      '<div>' +
        '<div class="page-title" style="margin-bottom:2px">Welcome, ' + currentStudent.name + '</div>' +
        '<div class="page-sub" style="margin-bottom:0">' + currentStudent.college + ' &nbsp;·&nbsp; <span style="font-family:\'JetBrains Mono\',monospace">' + currentStudent.dob + '</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">' +
      '<div class="stat-card anim-fade-up delay-1"><div class="stat-label">Available Exams</div><div class="stat-value" style="color:var(--cyan)">' + availableCount + '</div><div class="stat-sub">Ready to take</div></div>' +
      '<div class="stat-card anim-fade-up delay-2"><div class="stat-label">Completed</div><div class="stat-value" style="color:var(--green)">' + completedCount + '</div><div class="stat-sub">This semester</div></div>' +
      '<div class="stat-card anim-fade-up delay-3"><div class="stat-label">Avg Score</div><div class="stat-value">' + avgScore + '</div><div class="stat-sub">Grade: ' + grade + '</div></div>' +
    '</div>' +
    '<div class="card anim-fade-up delay-2" style="margin-bottom:16px">' +
      '<div class="section-title">📋 Your Exams</div>' +
      (studentExams.length === 0
        ? '<div style="font-size:13px;color:var(--text3);text-align:center;padding:24px 0">No exams registered or available.</div>'
        : studentExams.map(function(e){
            var timeWindowLabel = e.startTime ? ' (' + formatTime(e.startTime) + ' - ' + formatTime(e.endTime) + ')' : '';
            var scoreVal = e.score;
            var scoreColorClass = 'badge-green';
            if (e.status === 'completed') {
              if (HM_DB.grades && HM_DB.grades[currentStudent.name] && HM_DB.grades[currentStudent.name][e.id] !== undefined) {
                scoreVal = HM_DB.grades[currentStudent.name][e.id] + '%';
              } else if (e.score === 'Pending') {
                scoreVal = 'Pending';
                scoreColorClass = 'badge-amber';
              } else {
                scoreVal = e.score + '%';
              }
            }
            
            return '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--border)">' +
              '<div>' +
                '<div style="font-weight:700;font-size:14px;color:var(--text)">' + e.title + '</div>' +
                '<div style="font-size:12px;color:var(--text3);margin-top:4px;font-family:\'JetBrains Mono\',monospace">' + e.questions + ' Qs &nbsp;·&nbsp; ' + e.duration + ' min' + timeWindowLabel + ' &nbsp;·&nbsp; ' + e.date + '</div>' +
              '</div>' +
              (e.status === 'completed'
                ? '<span class="badge ' + scoreColorClass + '">✓ Score: ' + scoreVal + '</span>'
                : '<button class="btn-primary btn-sm" onclick="startExam(' + e.id + ')">Start Exam →</button>') +
            '</div>';
          }).join('')) +
    '</div>' +
    '<div class="card anim-fade-up delay-3">' +
      '<div class="section-title">🔑 Join with Exam Code</div>' +
      '<div style="display:flex;gap:10px">' +
        '<input id="code-inp" placeholder="Enter exam code e.g. CS101" style="flex:1;letter-spacing:3px;font-family:\'JetBrains Mono\',monospace;font-size:15px;text-transform:uppercase" />' +
        '<button class="btn-primary" onclick="joinCode()">Join →</button>' +
      '</div>' +
    '</div>' +
    '</div>';
};

// Override renderADash to show dynamic stats
renderADash = function() {
  var live      = getLiveSessions();
  var allViols  = getAllViolations();
  var liveOnline = live.filter(function(ls){ return ls.status==='online'||ls.status==='exam'; }).length;

  /* Violation type breakdown */
  var violTypes = {};
  allViols.forEach(function(item){ violTypes[item.v.type] = (violTypes[item.v.type]||0) + 1; });

  // Calculate dynamic active exams
  var activeExams = EXAMS.filter(function(e){ return e.status === 'active'; });
  var activeCount = activeExams.length;
  var activeCodes = activeExams.map(function(e){ return e.code; }).join(', ') || 'None';

  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
    '<div class="page-title">Command Center</div>' +
    '<div class="page-sub">Real-time system overview &nbsp;·&nbsp; All student activity and violations</div>' +

    (live.length > 0
      ? '<div style="background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.25);border-radius:14px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:14px;animation:cyberBorder 3s ease infinite">' +
          '<span class="live-dot" style="width:11px;height:11px;box-shadow:0 0 8px var(--green)"></span>' +
          '<div>' +
            '<div style="font-size:13px;font-weight:800;color:var(--green)">' + live.length + ' Student' + (live.length>1?'s':'') + ' Currently Online</div>' +
            '<div style="font-size:12px;color:rgba(34,197,94,0.7);margin-top:2px">' +
              live.map(function(ls){ return ls.name + (ls.status==='exam'?'&nbsp;<span class="badge badge-amber" style="font-size:9px">IN EXAM</span>':''); }).join('  ·  ') +
            '</div>' +
          '</div>' +
        '</div>'
      : '') +

    '<div class="stats-grid">' +
      statCard('Total Students', STUDENTS.filter(function(s){ return s.exams>0; }).length + live.filter(function(ls){ return ls.examStarted; }).length, 'Attempted exam', 'var(--cyan)') +
      statCard('Online Now', liveOnline, 'Live sessions', 'var(--green)') +
      statCard('Violations', allViols.length, allViols.filter(function(x){ return x.v.severity==='high'; }).length + ' high severity', 'var(--red)') +
      statCard('Active Exams', activeCount, activeCodes, 'var(--blue)') +
    '</div>' +

    '<div class="two-col" style="margin-bottom:18px">' +
      /* Student Activity */
      '<div class="card">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
          '<div class="section-title" style="margin-bottom:0">Student Activity</div>' +
          (live.length > 0 ? '<span class="badge badge-live">' + live.length + ' LIVE</span>' : '') +
        '</div>' +
        live.filter(function(ls){ return ls.examStarted; }).map(function(ls){
          var photoHtml = ls.profilePhoto
            ? '<div style="width:34px;height:34px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid var(--green)"><img src="' + ls.profilePhoto + '" style="width:100%;height:100%;object-fit:cover" /></div>'
            : '<div class="avatar" style="background:linear-gradient(135deg,var(--green),#15803d);font-size:11px">' + ls.name.split(' ').map(function(n){ return n[0]; }).join('') + '</div>';
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-radius:12px;background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.15);margin-bottom:8px">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              photoHtml +
              '<div>' +
                '<div style="font-weight:800;font-size:13px;color:var(--text)">' + ls.name + '&nbsp;<span class="live-dot" style="width:6px;height:6px"></span></div>' +
                '<div style="font-size:11px;color:var(--text3)">' + ls.college + ' · ' + ls.loginTime + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">' +
              (ls.violations.length ? '<span class="badge badge-red">' + ls.violations.length + ' viol</span>' : '') +
              '<span class="badge ' + (ls.status==='exam'?'badge-amber':'badge-green') + '">' + ls.status + '</span>' +
            '</div>' +
          '</div>';
        }).join('') +
        STUDENTS.filter(function(s){ return s.exams>0; }).map(function(s){
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<div class="avatar" style="background:var(--bg3);font-size:11px">' + s.name.split(' ').map(function(n){ return n[0]; }).join('') + '</div>' +
              '<div><div style="font-weight:600;font-size:13px;color:var(--text)">' + s.name + '</div><div style="font-size:11px;color:var(--text3)">' + s.college + '</div></div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              (s.violations.length ? '<span class="badge badge-red">' + s.violations.length + '</span>' : '') +
              '<span class="badge badge-gray">offline</span>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>' +

      /* Violation Feed */
      '<div class="card">' +
        '<div class="section-title">Recent Violations</div>' +
        (function(){
          var all = getAllViolations();
          if (!all.length) return '<div style="font-size:13px;color:var(--text3);padding:20px 0;text-align:center">✅ No violations recorded yet.</div>';
          return all.slice(0,6).map(function(item){
            return '<div class="viol-card-mini">' +
              '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
                '<span style="font-weight:800;font-size:12px;color:var(--text)">' + item.student + '</span>' +
                '<span class="badge ' + (item.v.severity==='high'?'badge-red':'badge-amber') + '">' + item.v.severity + '</span>' +
              '</div>' +
              '<div style="font-size:11px;color:var(--text2);margin-bottom:2px"><strong>' + item.v.type + '</strong>: ' + item.v.desc + '</div>' +
              '<div style="font-size:10px;color:var(--text3);font-family:\'JetBrains Mono\',monospace">' + item.v.time + '</div>' +
            '</div>';
          }).join('');
        })() +
      '</div>' +
    '</div>' +
    '</div>';
};

// Monitor Fullscreen changes
document.addEventListener('fullscreenchange', checkFullscreenViolation);
document.addEventListener('webkitfullscreenchange', checkFullscreenViolation);
document.addEventListener('mozfullscreenchange', checkFullscreenViolation);
document.addEventListener('MSFullscreenChange', checkFullscreenViolation);

function checkFullscreenViolation() {
  if (!examActive) return;
  var isFS = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
  if (!isFS) {
    if (document.getElementById('fs-force-overlay')) return;
    
    violationCount++;
    var vc = document.getElementById('viol-count'); if (vc) vc.textContent = violationCount;
    logViolation('Fullscreen Exited', 'Student exited fullscreen mode during the exam.', 'high');
    
    // Show overlay
    var overlay = document.createElement('div');
    overlay.id = 'fs-force-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.95);backdrop-filter:blur(10px);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:99999;color:#fff;text-align:center;padding:24px;';
    overlay.innerHTML = 
      '<div style="max-width:400px;background:var(--bg);padding:32px;border-radius:20px;border:1.5px solid var(--border);box-shadow:0 12px 50px rgba(0,0,0,0.3)">' +
        '<div style="font-size:48px;margin-bottom:16px">📺</div>' +
        '<div style="font-size:20px;font-weight:800;color:var(--red);margin-bottom:8px">Fullscreen Required</div>' +
        '<div style="font-size:13px;color:var(--text2);line-height:1.6;margin-bottom:24px">Exiting fullscreen mode is a violation. You must remain in fullscreen mode to complete the exam.</div>' +
        '<button class="btn-primary" style="width:100%;padding:12px" onclick="reEnterFullScreen()">Re-enter Fullscreen</button>' +
      '</div>';
    document.body.appendChild(overlay);
    
    checkAutoSubmit();
  }
}

window.reEnterFullScreen = function() {
  var elem = document.documentElement;
  var p = null;
  if (elem.requestFullscreen) p = elem.requestFullscreen();
  else if (elem.webkitRequestFullscreen) p = elem.webkitRequestFullscreen();
  else if (elem.mozRequestFullScreen) p = elem.mozRequestFullScreen();
  else if (elem.msRequestFullscreen) p = elem.msRequestFullscreen();
  
  if (p) {
    p.then(function() {
      var overlay = document.getElementById('fs-force-overlay');
      if (overlay) overlay.remove();
    }).catch(function(){});
  } else {
    var overlay = document.getElementById('fs-force-overlay');
    if (overlay) overlay.remove();
  }
};

// Reset face stabilizers on start/stop camera stream
var _origStartCam = startCam;
startCam = function() {
  faceCalibrated = false;
  calibrationFrames = [];
  calibratedBaselines = null;
  smoothedNoseRatio = null;
  smoothedEyeNoseY = null;
  smoothedEyeDist = null;
  _origStartCam();
};

var _origStopCam = stopCam;
stopCam = function() {
  faceCalibrated = false;
  calibrationFrames = [];
  calibratedBaselines = null;
  smoothedNoseRatio = null;
  smoothedEyeNoseY = null;
  smoothedEyeDist = null;
  _origStopCam();
};

// Override runMLDetection to perform automatic head calibration & Exponential Moving Average (EMA) stabilization
runMLDetection = function(vid) {
  if (!vid || vid.readyState < 2) return;
  try { _faceDetectCtx.drawImage(vid, 0, 0, 320, 240); } catch(e) { return; }
  var facePromise = _blazefaceModel
    ? _blazefaceModel.estimateFaces(_faceDetectCanvas, false)
    : Promise.resolve(null);
  var objPromise = _cocoSsdModel ? _cocoSsdModel.detect(vid) : Promise.resolve(null);

  Promise.all([facePromise, objPromise]).then(function(results) {
    var faces = results[0];
    var preds = results[1];

    var faceCount = 0;
    if (faces !== null) {
      var validFaces = faces.filter(function(f){ return (f.probability ? f.probability[0] : 1) >= 0.75; });
      faceCount = validFaces.length;
    }

    var personCount = 0;
    if (preds !== null) {
      personCount = preds.filter(function(p){ return p.class === 'person' && p.score >= 0.65; }).length;
      checkPhoneInPredictions(preds);
    }

    var consensus = Math.max(faceCount, personCount);
    if (faces !== null || preds !== null) applyFaceResult(consensus, false);

    // Dynamic head movement estimation
    if (consensus === 1 && faces && faces.length === 1) {
      var f = faces[0];
      var tl = f.topLeft, br = f.bottomRight;
      if (tl && br && f.landmarks && f.landmarks.length >= 3) {
        var fw = br[0] - tl[0];
        var fh = br[1] - tl[1];
        var cx = (tl[0] + br[0]) / 2;
        var cy = (tl[1] + br[1]) / 2;
        
        var rEye = f.landmarks[0];
        var lEye = f.landmarks[1];
        var nose = f.landmarks[2];
        
        var eyeY = (rEye[1] + lEye[1]) / 2;
        var rawEyeNoseY = (nose[1] - eyeY) / Math.max(1, fh);
        
        var leftDist = Math.abs(nose[0] - lEye[0]);
        var rightDist = Math.abs(nose[0] - rEye[0]);
        var rawNoseRatio = leftDist / Math.max(1, rightDist);
        var rawEyeDist = Math.abs(rEye[0] - lEye[0]) / Math.max(1, fw);
        
        // 1. Apply Exponential Moving Average (EMA) smoothing to eliminate high-frequency eyeball/head jitter
        if (smoothedNoseRatio === null) {
          smoothedNoseRatio = rawNoseRatio;
          smoothedEyeNoseY = rawEyeNoseY;
          smoothedEyeDist = rawEyeDist;
        } else {
          var alpha = 0.25; // Smoothing factor (lower = more stable/slower response, higher = faster response)
          smoothedNoseRatio = alpha * rawNoseRatio + (1 - alpha) * smoothedNoseRatio;
          smoothedEyeNoseY = alpha * rawEyeNoseY + (1 - alpha) * smoothedEyeNoseY;
          smoothedEyeDist = alpha * rawEyeDist + (1 - alpha) * smoothedEyeDist;
        }
        
        var fmsLabel = document.getElementById('face-model-s');
        
        // 2. Head calibration phase (first 5 frames when streaming starts)
        if (!faceCalibrated) {
          calibrationFrames.push({ noseRatio: smoothedNoseRatio, eyeNoseY: smoothedEyeNoseY, eyeDist: smoothedEyeDist });
          var progress = Math.round((calibrationFrames.length / 5) * 100);
          if (fmsLabel) {
            fmsLabel.innerHTML = '<span style="color:var(--amber);font-weight:700">⚖ Calibrating face position: ' + progress + '%</span>';
          }
          
          if (calibrationFrames.length >= 5) {
            var sumNR = 0, sumEN = 0, sumED = 0;
            calibrationFrames.forEach(function(cf){
              sumNR += cf.noseRatio;
              sumEN += cf.eyeNoseY;
              sumED += cf.eyeDist;
            });
            calibratedBaselines = {
              noseRatio: sumNR / calibrationFrames.length,
              eyeNoseY: sumEN / calibrationFrames.length,
              eyeDist: sumED / calibrationFrames.length
            };
            faceCalibrated = true;
          }
          checkGazeAway(false);
          return;
        }
        
        // 3. Evaluate deviation from student's calibrated straight-facing baseline
        var diffRatio = smoothedNoseRatio - calibratedBaselines.noseRatio;
        var diffVert = smoothedEyeNoseY - calibratedBaselines.eyeNoseY;
        var diffDist = smoothedEyeDist - calibratedBaselines.eyeDist;
        
        var headStatusText = 'Looking straight';
        var lookingAway = false;
        
        if (diffRatio < -0.22) {
          headStatusText = 'Turned Left';
          lookingAway = true;
        } else if (diffRatio > 0.22) {
          headStatusText = 'Turned Right';
          lookingAway = true;
        } else if (diffVert < -0.035) {
          headStatusText = 'Looking Down';
          lookingAway = true;
        } else if (diffVert > 0.045) {
          headStatusText = 'Looking Up';
          lookingAway = true;
        } else if (diffDist < -0.060) {
          headStatusText = 'Head Turned / Side-profile';
          lookingAway = true;
        }
        
        if (fmsLabel) {
          if (lookingAway) {
            fmsLabel.innerHTML = '🔴 Gaze diverted: <strong style="color:var(--red)">' + headStatusText + '</strong>';
          } else {
            fmsLabel.innerHTML = '🟢 Gaze status: <strong style="color:var(--green)">' + headStatusText + '</strong> (proctor calibrated)';
          }
        }
        checkGazeAway(lookingAway);
      } else {
        checkGazeAway(false);
      }
    } else {
      gazeAwayConsecutive = 0;
      var fmsLabel = document.getElementById('face-model-s');
      if (fmsLabel) {
        if (consensus === 0) fmsLabel.innerHTML = '🔴 Gaze: <strong style="color:var(--red)">No face detected</strong>';
        else if (consensus > 1) fmsLabel.innerHTML = '🔴 Gaze: <strong style="color:var(--red)">Multiple persons present</strong>';
      }
    }
  }).catch(function(e) {});
};

/* =====================================================
   ADMIN NAV DECOUPLING & MANUAL EVALUATION TAB
==================================================== */

// Override aNav navigation to support the Evaluate tab
var _origANav = aNav;
aNav = function(page, el) {
  document.querySelectorAll('#admin-app .si').forEach(function(i){ i.classList.remove('active'); });
  if (el) el.classList.add('active');
  if (page === 'aevaluate') {
    renderAEvaluate();
  } else {
    _origANav(page, el);
  }
};

// Periodically inject Evaluate tab into admin sidebar
(function() {
  function addEvaluateTab() {
    var sidebar = document.querySelector('#admin-app .sidebar');
    if (sidebar && !document.getElementById('si-aevaluate')) {
      var div = document.createElement('div');
      div.className = 'si';
      div.id = 'si-aevaluate';
      div.onclick = function() { aNav('aevaluate', this); };
      div.innerHTML = '<span class="si-icon">📝</span> Evaluate';
      
      var examsTab = document.getElementById('si-aexams');
      if (examsTab && examsTab.nextSibling) {
        sidebar.insertBefore(div, examsTab.nextSibling);
      } else {
        sidebar.appendChild(div);
      }
    }
  }
  setInterval(addEvaluateTab, 1000);
})();

// Render Evaluate Tab Layout in Command Center
window.renderAEvaluate = function() {
  if (!HM_DB.submissions) HM_DB.submissions = [];
  var list = HM_DB.submissions;
  
  var pendingCount = list.filter(function(s){ return s.status === 'pending'; }).length;
  
  var listHtml = '';
  if (list.length === 0) {
    listHtml = '<div style="font-size:13px;color:var(--text3);text-align:center;padding:32px 0">No exam submissions found.</div>';
  } else {
    listHtml = 
      '<div class="table-wrap"><table class="data-table">' +
        '<thead>' +
          '<tr>' +
            '<th>Student</th>' +
            '<th>Exam</th>' +
            '<th>Submission Time</th>' +
            '<th>Status</th>' +
            '<th>Final Score</th>' +
            '<th>Action</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' +
          list.map(function(s, idx) {
            var statusBadge = s.status === 'pending'
              ? '<span class="badge badge-amber">Pending Evaluation</span>'
              : '<span class="badge badge-green">Graded</span>';
            var finalScoreText = s.status === 'pending'
              ? 'Pending'
              : (s.totalScore + ' / ' + s.totalPossible + ' (' + Math.round(s.totalScore / s.totalPossible * 100) + '%)');
              
            return '<tr>' +
              '<td>' +
                '<div style="font-weight:700;color:var(--text)">' + s.studentName + '</div>' +
                '<div style="font-size:10px;color:var(--text3)">' + s.college + '</div>' +
              '</td>' +
              '<td>' +
                '<div style="font-weight:700;color:var(--text)">' + s.examCode + '</div>' +
                '<div style="font-size:10px;color:var(--text3)">' + s.examTitle + '</div>' +
              '</td>' +
              '<td style="font-size:11px;color:var(--text2)">' + s.submitTime + '</td>' +
              '<td>' + statusBadge + '</td>' +
              '<td style="font-weight:700;color:var(--cyan)">' + finalScoreText + '</td>' +
              '<td>' +
                '<button class="btn-primary btn-sm" onclick="openEvaluationView(' + idx + ')">' + 
                  (s.status === 'pending' ? 'Evaluate' : 'Review') + 
                '</button>' +
              '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table></div>';
  }
  
  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
      '<div class="page-title">Exam Evaluation</div>' +
      '<div class="page-sub">Grade student submissions and score subjective/descriptive questions</div>' +
      
      '<div class="stats-grid" style="grid-template-columns:1fr 1fr;margin-bottom:20px">' +
        '<div class="stat-card"><div class="stat-label">Pending Evaluation</div><div class="stat-value" style="color:var(--amber)">' + pendingCount + '</div><div class="stat-sub">Requires staff grading</div></div>' +
        '<div class="stat-card"><div class="stat-label">Total Submissions</div><div class="stat-value" style="color:var(--green)">' + list.length + '</div><div class="stat-sub">All exams submitted</div></div>' +
      '</div>' +
      
      '<div class="card">' +
        '<div class="section-title">Submitted Exams</div>' +
        listHtml +
      '</div>' +
    '</div>';
};

// Open individual evaluation view modal
window.openEvaluationView = function(idx) {
  var s = HM_DB.submissions[idx];
  if (!s) return;
  
  var overlay = document.createElement('div');
  overlay.id = 'evaluate-modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:20000;padding:20px;';
  
  var questionsHtml = s.questions.map(function(q, qIdx) {
    var maxMarks = q.type === 'MCQ' ? 1 : q.type === '2 Mark' ? 2 : q.type === '13 Mark' ? 13 : q.type === '16 Mark' ? 16 : 1;
    if (!q.type) maxMarks = 1;
    var userAns = s.answers[q.id] || '';
    
    if (!q.type || q.type === 'MCQ') {
      var isCorrect = userAns === q.ans;
      var earned = isCorrect ? maxMarks : 0;
      return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<span style="font-size:11px;font-weight:800;color:var(--text3)">QUESTION ' + (qIdx+1) + ' (MCQ)</span>' +
          '<span class="badge ' + (isCorrect?'badge-green':'badge-red') + '">' + earned + ' / ' + maxMarks + ' Mark</span>' +
        '</div>' +
        '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px">' + q.q + '</div>' +
        '<div style="font-size:12px;color:var(--text2)">Student Answer: <strong style="color:' + (isCorrect?'var(--green)':'var(--red)') + '">' + (q.opts[userAns] || 'Not Answered') + '</strong></div>' +
        '<div style="font-size:12px;color:var(--text3);margin-top:2px">Correct Answer: <strong>' + q.opts[q.ans] + '</strong></div>' +
      '</div>';
    } else {
      var scoreVal = s.subjectiveScores[q.id] !== undefined ? s.subjectiveScores[q.id] : '';
      return '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<span style="font-size:11px;font-weight:800;color:var(--cyan)">QUESTION ' + (qIdx+1) + ' (' + q.type + ')</span>' +
          '<span class="badge badge-gray" style="font-size:11px">Max ' + maxMarks + ' Marks</span>' +
        '</div>' +
        '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:8px">' + q.q + '</div>' +
        '<div style="font-size:12px;color:var(--text3);margin-bottom:4px;font-weight:600">Student Response:</div>' +
        '<div style="background:var(--bg3);border:1.5px solid var(--border);border-radius:8px;padding:12px;font-size:13px;color:var(--text);white-space:pre-wrap;line-height:1.6;margin-bottom:12px;min-height:60px">' + 
          (userAns.trim() || '<span style="color:var(--text3);font-style:italic">No answer submitted</span>') + 
        '</div>' +
        '<div style="display:flex;gap:16px;align-items:center">' +
          '<div style="flex:1">' +
            '<label class="form-label" style="font-size:10px;margin-bottom:4px">Award Marks (0 to ' + maxMarks + ')</label>' +
            '<input type="number" step="0.5" min="0" max="' + maxMarks + '" class="subj-score-inp" data-qid="' + q.id + '" data-max="' + maxMarks + '" value="' + scoreVal + '" style="width:100px;font-size:12px;padding:8px" ' + (s.status === 'graded' ? 'disabled' : '') + ' />' +
          '</div>' +
        '</div>' +
      '</div>';
    }
  }).join('');
  
  overlay.innerHTML =
    '<div class="fv-box" style="width:700px; max-height:85vh; overflow-y:auto; text-align:left; display:flex; flex-direction:column; gap:20px; padding:32px; border-radius:20px; background:#fff; border:1.5px solid var(--border); box-shadow:0 12px 50px rgba(0,0,0,0.15); animation:cardEntrance .4s ease;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<div>' +
          '<div style="font-size:20px;font-weight:800;color:var(--text)">Evaluate Submission</div>' +
          '<div style="font-size:11px;color:var(--text3)">Student: ' + s.studentName + ' &nbsp;·&nbsp; ' + s.examCode + ' (' + s.examTitle + ')</div>' +
        '</div>' +
        '<button onclick="document.getElementById(\'evaluate-modal-overlay\').remove()" style="background:none;border:none;font-size:20px;color:var(--text3);cursor:pointer;line-height:1">✕</button>' +
      '</div>' +
      
      '<div style="max-height:420px;overflow-y:auto;padding-right:8px">' +
        questionsHtml +
      '</div>' +
      
      '<div class="form-group" style="margin-bottom:0">' +
        '<label class="form-label">Staff Feedback / Comments</label>' +
        '<textarea id="eval-comments" placeholder="Add comments or feedback for the student..." style="width:100%;min-height:60px;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:12px" ' + (s.status === 'graded' ? 'disabled' : '') + '>' + (s.comments || '') + '</textarea>' +
      '</div>' +
      
      '<div id="eval-err" class="hidden" style="font-size:12px;color:#f87171;padding:10px 14px;background:rgba(239,68,68,0.1);border-radius:10px;border:1px solid rgba(239,68,68,0.3);font-weight:600"></div>' +
      
      '<div style="display:flex;gap:12px;margin-top:8px">' +
        '<button class="btn-outline" style="flex:1" onclick="document.getElementById(\'evaluate-modal-overlay\').remove()">Close</button>' +
        (s.status === 'pending'
          ? '<button class="btn-primary" style="flex:2" onclick="submitEvaluation(' + idx + ')">Save Grades & Finalize</button>'
          : '<div style="flex:2;text-align:center;font-weight:700;color:var(--green);padding:10px;background:rgba(34,197,94,0.1);border-radius:10px;font-size:12px">✓ Evaluation Finalized</div>') +
      '</div>' +
    '</div>';
    
  document.body.appendChild(overlay);
};

// Handle submitting subjective evaluation
window.submitEvaluation = function(idx) {
  var s = HM_DB.submissions[idx];
  if (!s) return;
  
  var inputs = document.querySelectorAll('.subj-score-inp');
  var subjectiveScores = {};
  var addedSubjScore = 0;
  var errDiv = document.getElementById('eval-err');
  
  if (errDiv) errDiv.classList.add('hidden');
  
  for (var i = 0; i < inputs.length; i++) {
    var valStr = inputs[i].value.trim();
    if (valStr === '') {
      if (errDiv) { errDiv.textContent = '⚠ Please award marks for all descriptive questions.'; errDiv.classList.remove('hidden'); }
      return;
    }
    var val = parseFloat(valStr);
    var max = parseFloat(inputs[i].getAttribute('data-max'));
    var qId = parseInt(inputs[i].getAttribute('data-qid'));
    
    if (isNaN(val) || val < 0 || val > max) {
      if (errDiv) { errDiv.textContent = '⚠ Marks must be between 0 and ' + max + '.'; errDiv.classList.remove('hidden'); }
      return;
    }
    subjectiveScores[qId] = val;
    addedSubjScore += val;
  }
  
  var comments = document.getElementById('eval-comments').value.trim();
  
  // Update submission data
  s.subjectiveScores = subjectiveScores;
  s.totalScore = s.mcqScore + addedSubjScore;
  s.status = 'graded';
  s.comments = comments;
  
  var finalPct = Math.round(s.totalScore / s.totalPossible * 100);
  
  // Update student database record
  var student = STUDENTS.find(function(st){ return st.name === s.studentName; });
  if (student) {
    if (!student.completedExams) student.completedExams = {};
    student.completedExams[s.examId] = finalPct;
  }
  
  if (!HM_DB.grades) HM_DB.grades = {};
  if (!HM_DB.grades[s.studentName]) HM_DB.grades[s.studentName] = {};
  HM_DB.grades[s.studentName][s.examId] = finalPct;
  
  // If graded student is currently online, update their live session in the dashboard
  if (LIVE_SESSIONS[s.studentName]) {
    LIVE_SESSIONS[s.studentName].score = finalPct;
    LIVE_SESSIONS[s.studentName].grade = finalPct >= 90 ? 'A' : finalPct >= 80 ? 'B+' : finalPct >= 70 ? 'B' : finalPct >= 60 ? 'C' : 'F';
    if (typeof firebaseSyncSessions === 'function') firebaseSyncSessions();
  }
  
  document.getElementById('evaluate-modal-overlay').remove();
  renderAEvaluate();
  alert('Evaluation submitted successfully! Final score: ' + finalPct + '%');
};

// Persistent Video Recording DB (IndexedDB) helper
window.HM_RecordingsDB = {
  dbName: 'HexaMindsRecordings',
  storeName: 'video_recordings',
  version: 1,
  
  open: function(callback) {
    var req = indexedDB.open(this.dbName, this.version);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(HM_RecordingsDB.storeName)) {
        db.createObjectStore(HM_RecordingsDB.storeName);
      }
    };
    req.onsuccess = function(e) {
      callback(e.target.result);
    };
    req.onerror = function() {
      callback(null);
    };
  },
  
  saveRecording: function(key, blob, callback) {
    this.open(function(db) {
      if (!db) { if(callback) callback(false); return; }
      var tx = db.transaction(HM_RecordingsDB.storeName, 'readwrite');
      var store = tx.objectStore(HM_RecordingsDB.storeName);
      var req = store.put(blob, key);
      req.onsuccess = function() { if(callback) callback(true); };
      req.onerror = function() { if(callback) callback(false); };
    });
  },
  
  getRecording: function(key, callback) {
    this.open(function(db) {
      if (!db) { callback(null); return; }
      var tx = db.transaction(HM_RecordingsDB.storeName, 'readonly');
      var store = tx.objectStore(HM_RecordingsDB.storeName);
      var req = store.get(key);
      req.onsuccess = function(e) { callback(e.target.result); };
      req.onerror = function() { callback(null); };
    });
  }
};

// Override startExamRecording to persistently save recordings to IndexedDB
startExamRecording = function(stream) {
  try {
    if (typeof MediaRecorder === 'undefined' || !stream) return;
    examRecChunks = [];
    if (examRecBlobUrl) { try { URL.revokeObjectURL(examRecBlobUrl); } catch(e){} examRecBlobUrl = null; }
    var mimeCandidates = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'];
    var mime = '';
    for (var i = 0; i < mimeCandidates.length; i++) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mimeCandidates[i])) { mime = mimeCandidates[i]; break; }
    }
    var opts = mime ? { mimeType: mime, videoBitsPerSecond: 250000 } : { videoBitsPerSecond: 250000 };
    examRecorder = new MediaRecorder(stream, opts);
    examRecorder.ondataavailable = function(e) { if (e.data && e.data.size > 0) examRecChunks.push(e.data); };
    
    examRecorder.onstop = function() {
      try {
        var blob = new Blob(examRecChunks, { type: (examRecorder && examRecorder.mimeType) || 'video/webm' });
        examRecBlobUrl = URL.createObjectURL(blob);
        
        var studentName = (currentStudent && currentStudent.name) || 'Unknown';
        var examId = currentExamId || 1;
        var storageKey = 'rec_' + studentName + '_' + examId;
        
        // Save to IndexedDB
        HM_RecordingsDB.saveRecording(storageKey, blob, function(success) {
          console.log('Video recording saved to IndexedDB:', success);
        });

        if (currentStudent && currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
          LIVE_SESSIONS[currentStudent.name].recordingUrl = examRecBlobUrl;
          LIVE_SESSIONS[currentStudent.name].recordingMime = blob.type;
          LIVE_SESSIONS[currentStudent.name].recordingSize = blob.size;
          LIVE_SESSIONS[currentStudent.name].storageKey = storageKey;
          if (typeof firebaseSyncSessions === 'function') firebaseSyncSessions();
        }

        // Upload to Cloudinary in the background
        if (typeof uploadToCloudinary === 'function') {
          uploadToCloudinary(blob, 'video', function(cloudinaryUrl) {
            if (cloudinaryUrl) {
              console.log('Video recording uploaded to Cloudinary:', cloudinaryUrl);
              
              // Update live session URL
              if (LIVE_SESSIONS[studentName]) {
                LIVE_SESSIONS[studentName].recordingUrl = cloudinaryUrl;
                if (typeof firebaseSyncSessions === 'function') firebaseSyncSessions();
              }

              // Update submission URL in HM_DB
              if (HM_DB.submissions) {
                var sub = HM_DB.submissions.find(function(sb){ return sb.studentName === studentName && sb.examId === examId; });
                if (sub) {
                  sub.recordingUrl = cloudinaryUrl;
                  if (typeof firebaseSaveSubmission === 'function') firebaseSaveSubmission(sub);
                }
              }
            }
          });
        }
      } catch(e) {}
    };
    examRecorder.start(1000);
  } catch(e) { examRecorder = null; }
};

// Override _renderStudentDetail to dynamically load persistent session recordings from IndexedDB
var _origRenderStudentDetail = _renderStudentDetail;
_renderStudentDetail = function(s) {
  // Call original to render first
  _origRenderStudentDetail(s);
  
  // Now, check if we have a persistent recording storage key in the student session
  var sessionKey = s.storageKey || (LIVE_SESSIONS[s.name] && LIVE_SESSIONS[s.name].storageKey);
  if (!sessionKey) {
    // Check if we can find it in submissions
    if (HM_DB.submissions) {
      var foundSub = HM_DB.submissions.find(function(sub){ return sub.studentName === s.name; });
      if (foundSub && foundSub.storageKey) sessionKey = foundSub.storageKey;
    }
  }
  
  if (sessionKey) {
    var placeholder = document.querySelector('.card:last-child');
    if (placeholder) {
      placeholder.innerHTML = 
        '<div class="section-title">📹 Session Recording</div>' +
        '<div id="admin-video-loading" style="padding:24px;text-align:center;color:var(--cyan);font-size:12px;font-weight:700">' +
          '<span style="width:12px;height:12px;border:2px solid var(--cyan);border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin .8s linear infinite;margin-right:8px"></span>' +
          'Retrieving persistent video recording from IndexedDB...' +
        '</div>';
      
      HM_RecordingsDB.getRecording(sessionKey, function(blob) {
        var loadingEl = document.getElementById('admin-video-loading');
        if (loadingEl) loadingEl.remove();
        
        if (blob) {
          var freshUrl = URL.createObjectURL(blob);
          var wrap = document.createElement('div');
          wrap.innerHTML = 
            '<video controls preload="metadata" src="' + freshUrl + '" style="width:100%;border-radius:10px;border:1.5px solid var(--border2);background:#000;display:block"></video>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;font-size:11px;color:var(--text3);font-family:\'JetBrains Mono\',monospace">' +
              '<span>' + blob.type + '  ·  ' + (Math.round(blob.size/1024) + ' KB') + ' (Retrieved Offline)</span>' +
              '<a href="' + freshUrl + '" download="' + (s.name||'session').replace(/\s+/g,'_') + '_recording.webm" class="btn-outline btn-sm" style="text-decoration:none">⬇ Download</a>' +
            '</div>';
          placeholder.appendChild(wrap);
        } else {
          var errEl = document.createElement('div');
          errEl.style.cssText = 'padding:24px;text-align:center;color:var(--text3);font-size:12px';
          errEl.textContent = 'Recording could not be retrieved from local database.';
          placeholder.appendChild(errEl);
        }
      });
    }
  }
};

// Inject CSS style spinner
(function() {
  if (!document.getElementById('hm-eval-styles')) {
    var style = document.createElement('style');
    style.id = 'hm-eval-styles';
    style.textContent = '@keyframes spin { 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
})();

// Override renderAExams to display registered exams and provide Cloudinary settings
renderAExams = function() {
  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
      '<div>' +
        '<div class="page-title" style="margin-bottom:2px">Exam Management</div>' +
        '<div class="page-sub">Registered exams and proctoring status</div>' +
      '</div>' +
      '<button class="btn-primary" onclick="openCreateExamModal()">+ Create Exam</button>' +
    '</div>' +
    
    '<div style="display:flex;flex-direction:column;gap:14px;margin-bottom:24px">' +
      EXAMS.map(function(e){
        return '<div class="card" style="' + (e.status==='active'?'border-color:rgba(34,197,94,0.3);':'') + '">' +
          '<div style="display:flex;align-items:flex-start;justify-content:space-between">' +
            '<div>' +
              '<div style="font-size:16px;font-weight:800;color:var(--text);margin-bottom:4px">' + e.title + '</div>' +
              '<div style="font-size:12px;color:var(--text3);margin-bottom:10px;font-family:\'JetBrains Mono\',monospace">Code: <span style="color:var(--cyan)">' + e.code + '</span> &nbsp;·&nbsp; ' + e.duration + ' min &nbsp;·&nbsp; ' + e.questions + ' Qs</div>' +
              '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
                '<span class="badge badge-cyan">👥 ' + e.enrolled + ' enrolled</span>' +
                '<span class="badge badge-gray">📅 ' + e.date + '</span>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">' +
              '<span class="badge ' + (e.status==='active'?'badge-green':'badge-gray') + '" style="font-size:12px;padding:6px 14px">' + e.status.toUpperCase() + '</span>' +
              '<button class="btn-outline btn-sm" onclick="openEditQuestionsModal(' + e.id + ')">📝 Edit Questions</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
    
    /* Cloudinary Settings Card */
    '<div class="card">' +
      '<div class="section-title">☁ Cloudinary Proctoring Storage</div>' +
      '<div style="font-size:12px;color:var(--text3);margin-bottom:14px;line-height:1.5">' +
        'Specify your Cloudinary Cloud Name. Violation snapshots and exam video recordings will be signed and uploaded directly to your Cloudinary cloud.' +
      '</div>' +
      '<div style="display:flex;gap:12px;align-items:center">' +
        '<div style="flex:1">' +
          '<input id="cl-cloud-name" placeholder="Enter Cloud Name (e.g. etwi6mr1)" value="' + window.CLOUDINARY_CLOUD_NAME + '" style="padding:10px 14px;border:1.5px solid var(--border);border-radius:10px;width:100%" />' +
        '</div>' +
        '<button class="btn-primary" onclick="saveCloudinaryConfig()" style="padding:10px 20px">Save Configuration</button>' +
      '</div>' +
    '</div>' +
    
    '</div>';
};

window.saveCloudinaryConfig = function() {
  var name = document.getElementById('cl-cloud-name').value.trim();
  if (name) {
    localStorage.setItem('hm_cloudinary_cloud_name', name);
    window.CLOUDINARY_CLOUD_NAME = name;
    alert('Cloudinary Cloud Name successfully updated to: ' + name);
  } else {
    alert('Please enter a valid Cloudinary Cloud Name.');
  }
};

// Edit Questions Modal Handler
window.openEditQuestionsModal = function(examId) {
  var exam = EXAMS.find(function(e){ return e.id === examId; }) || studentExams.find(function(e){ return e.id === examId; });
  if (!exam) { alert('Exam not found.'); return; }

  customQuestions = exam.questionsList && exam.questionsList.length > 0 
    ? JSON.parse(JSON.stringify(exam.questionsList)) 
    : JSON.parse(JSON.stringify(ORIGINAL_QUESTIONS));

  var overlay = document.createElement('div');
  overlay.id = 'edit-questions-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.8);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:20000;padding:20px;';

  overlay.innerHTML = 
    '<div class="fv-box" style="width:650px; max-height:85vh; overflow-y:auto; text-align:left; display:flex; flex-direction:column; gap:20px; padding:32px; border-radius:20px; background:#fff; border:1.5px solid var(--border); box-shadow:0 12px 50px rgba(0,0,0,0.15); animation:cardEntrance .4s ease;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
        '<div>' +
          '<div style="font-size:20px;font-weight:800;color:var(--text)">Edit Exam Questions</div>' +
          '<div style="font-size:12px;color:var(--text3)">Exam: <strong>' + exam.title + ' (' + exam.code + ')</strong></div>' +
        '</div>' +
        '<button onclick="document.getElementById(\'edit-questions-overlay\').remove()" style="background:none;border:none;font-size:20px;color:var(--text3);cursor:pointer;line-height:1">✕</button>' +
      '</div>' +

      '<div style="border-top:1.5px solid var(--border);padding-top:16px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
          '<span style="font-weight:700;color:var(--text)">Questions List (<span id="eq-count">' + customQuestions.length + '</span> questions)</span>' +
          '<button class="btn-outline btn-sm" onclick="addQuestionField();">＋ Add Question</button>' +
        '</div>' +
        '<div id="ce-questions-container" style="display:flex;flex-direction:column;gap:16px;max-height:380px;overflow-y:auto;padding-right:8px;">' +
        '</div>' +
      '</div>' +

      '<div id="eq-err" class="hidden" style="font-size:12px;color:#f87171;padding:10px 14px;background:rgba(239,68,68,0.1);border-radius:10px;border:1px solid rgba(239,68,68,0.3);font-weight:600"></div>' +

      '<div style="display:flex;gap:12px;margin-top:8px">' +
        '<button class="btn-outline" style="flex:1" onclick="document.getElementById(\'edit-questions-overlay\').remove()">Cancel</button>' +
        '<button class="btn-primary" style="flex:2" onclick="saveEditedQuestions(' + examId + ')">Save Questions ✓</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
  renderQuestionFields();
};

window.saveEditedQuestions = function(examId) {
  var exam = EXAMS.find(function(e){ return e.id === examId; }) || studentExams.find(function(e){ return e.id === examId; });
  if (!exam) return;

  var errDiv = document.getElementById('eq-err');
  if (errDiv) errDiv.classList.add('hidden');

  for (var i = 0; i < customQuestions.length; i++) {
    var q = customQuestions[i];
    if (!q.q || !q.q.trim()) {
      if (errDiv) { errDiv.textContent = '⚠ Question ' + (i+1) + ' text cannot be empty.'; errDiv.classList.remove('hidden'); }
      return;
    }
    if (q.type === 'MCQ') {
      for (var k = 0; k < 4; k++) {
        if (!q.opts[k] || !q.opts[k].trim()) {
          if (errDiv) { errDiv.textContent = '⚠ Question ' + (i+1) + ' Option ' + String.fromCharCode(65+k) + ' cannot be empty.'; errDiv.classList.remove('hidden'); }
          return;
        }
      }
    }
  }

  exam.questionsList = JSON.parse(JSON.stringify(customQuestions));
  exam.questions = customQuestions.length;

  var se = studentExams.find(function(e){ return e.id === examId; });
  if (se) {
    se.questionsList = JSON.parse(JSON.stringify(customQuestions));
    se.questions = customQuestions.length;
  }

  saveExams();
  if (typeof firebaseSaveExam === 'function') firebaseSaveExam(exam);

  var ov = document.getElementById('edit-questions-overlay');
  if (ov) ov.remove();

  alert('Questions updated successfully for ' + exam.code + '!');
  renderAExams();
};

// Cloudinary client-side upload helper using HMAC-SHA1 signature
window.uploadToCloudinary = function(fileData, resourceType, callback) {
  var cloudName = window.CLOUDINARY_CLOUD_NAME;
  var apiKey = "851528631193376";
  var apiSecret = "0Ykrn3mdG8rQ19Z78Vq1qzs6YMs";
  var timestamp = Math.round(new Date().getTime() / 1000);
  
  // Sort parameters alphabetically for signing
  var signatureStr = "timestamp=" + timestamp + apiSecret;
  var signature = CryptoJS.SHA1(signatureStr).toString();
  
  var formData = new FormData();
  formData.append('file', fileData);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);
  
  var url = 'https://api.cloudinary.com/v1_1/' + cloudName + '/' + resourceType + '/upload';
  
  var xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.onload = function() {
    if (xhr.status === 200) {
      var res = JSON.parse(xhr.responseText);
      callback(res.secure_url);
    } else {
      console.error('Cloudinary upload failed: ' + xhr.responseText);
      callback(null);
    }
  };
  xhr.onerror = function() {
    console.error('Cloudinary upload network error');
    callback(null);
  };
  xhr.send(formData);
};

// Async Cloudinary upload for face registration snapshots
window.uploadFacePhotoAsync = function(faceKey, base64Photo) {
  if (!base64Photo || !base64Photo.startsWith('data:')) return;

  uploadToCloudinary(base64Photo, 'image', function(cloudinaryUrl) {
    if (cloudinaryUrl) {
      console.log('Face snapshot uploaded to Cloudinary:', cloudinaryUrl);
      if (registeredFaceData[faceKey]) {
        registeredFaceData[faceKey].snapshot = cloudinaryUrl;
        registeredFaceData[faceKey].photoUrl = cloudinaryUrl;
        if (typeof firebaseSaveFace === 'function') firebaseSaveFace(faceKey, registeredFaceData[faceKey]);
        if (typeof firebaseSyncFaces === 'function') firebaseSyncFaces();
      }
      if (currentStudent && currentStudent.name) {
        studentProfilePhoto = cloudinaryUrl;
        if (LIVE_SESSIONS[currentStudent.name]) {
          LIVE_SESSIONS[currentStudent.name].profilePhoto = cloudinaryUrl;
          if (typeof firebaseSyncSessions === 'function') firebaseSyncSessions();
        }
      }
    }
  });
};

// Async Cloudinary upload for violation photos
window.uploadViolationPhotoAsync = function(v, base64Photo) {
  if (!base64Photo || !base64Photo.startsWith('data:')) return;
  
  uploadToCloudinary(base64Photo, 'image', function(cloudinaryUrl) {
    if (cloudinaryUrl) {
      console.log('Violation photo uploaded to Cloudinary:', cloudinaryUrl);
      v.photo = cloudinaryUrl;
      
      // Update LIVE_SESSIONS record
      if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
        var viols = LIVE_SESSIONS[currentStudent.name].violations;
        var foundV = viols.find(function(x){ return x.time === v.time && x.type === v.type; });
        if (foundV) foundV.photo = cloudinaryUrl;
        if (typeof firebaseSyncSessions === 'function') firebaseSyncSessions();
      }
      
      // Update HM_DB record
      if (HM_DB.violations) {
        var foundDbV = HM_DB.violations.find(function(x){ return x.student === currentStudent.name && x.time === v.time && x.type === v.type; });
        if (foundDbV) {
          foundDbV.photo = cloudinaryUrl;
          if (typeof firebaseSyncDb === 'function') firebaseSyncDb();
        }
      }
    }
  });
};
