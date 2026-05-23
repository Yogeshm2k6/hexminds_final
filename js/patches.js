   ADMIN NAV — extended with new pages (handled by the primary aNav above)
===================================================== */

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

  /* Record to persistent login history */
  recordLoginHistory(currentStudent, studentProfilePhoto);

  /* Save to localStorage */
  try { localStorage.setItem('hm_sessions', JSON.stringify(LIVE_SESSIONS)); } catch(e){}

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
    try { localStorage.setItem('hm_violations_' + currentStudent.name, JSON.stringify(LIVE_SESSIONS[currentStudent.name].violations)); } catch(e){}
    /* Persist to cross-device DB */
    recordPersistentViolation(currentStudent.name, v);
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
</script>
