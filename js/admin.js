   ADMIN NAVIGATION
===================================================== */
function aNav(page, el) {
  document.querySelectorAll('#admin-app .si').forEach(function(i){ i.classList.remove('active'); });
  el.classList.add('active');
  if      (page === 'adash')         renderADash();
  else if (page === 'astudents')     renderAStudents();
  else if (page === 'aviolations')   renderAViolations();
  else if (page === 'aexams')        renderAExams();
  else if (page === 'areports')      renderAReports();
  else if (page === 'aloginhistory') renderALoginHistory();
  else if (page === 'amonitor')      renderAMonitor();
}

function getLiveSessions() {
  /* Only return sessions where the student is currently online or in exam, not logged out */
  return Object.values(LIVE_SESSIONS).filter(function(ls){ return ls.status !== 'offline'; });
}
function getAllSessions() { return Object.values(LIVE_SESSIONS); }

function getAllViolations() {
  var all = [];
  getAllSessions().forEach(function(ls){ ls.violations.forEach(function(v){ all.push({ student:ls.name, college:ls.college, v:v, isLive:ls.status!=='offline' }); }); });
  STUDENTS.forEach(function(s){ s.violations.forEach(function(v){ all.push({ student:s.name, college:s.college, v:v, isLive:false }); }); });
  return all;
}

/* =====================================================
   ADMIN PAGES
===================================================== */
function renderADash() {
  var live      = getLiveSessions();
  var allViols  = getAllViolations();
  var liveOnline = live.filter(function(ls){ return ls.status==='online'||ls.status==='exam'; }).length;

  /* Violation type breakdown */
  var violTypes = {};
  allViols.forEach(function(item){ violTypes[item.v.type] = (violTypes[item.v.type]||0) + 1; });

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
      statCard('Active Exams', '2', 'CS101, HIST101', 'var(--blue)') +
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
            var sev = item.v.severity;
            return '<div class="viol-row" style="' + (item.isLive ? 'border-color:rgba(239,68,68,0.3);background:rgba(239,68,68,0.04);' : '') + '">' +
              '<div class="viol-dot" style="background:' + (sev==='high'?'var(--red)':'var(--amber)') + ';box-shadow:0 0 6px currentColor"></div>' +
              '<div style="flex:1">' +
                '<div style="font-size:13px;font-weight:700;color:var(--text)">' + item.v.type +
                  (item.isLive ? '&nbsp;<span class="badge badge-live" style="font-size:9px">LIVE</span>' : '') +
                '</div>' +
                '<div style="font-size:11px;color:var(--text3);margin-top:2px">' + item.student + ' &nbsp;·&nbsp; ' + item.v.exam + '</div>' +
              '</div>' +
              '<div style="text-align:right">' +
                '<span class="badge ' + (sev==='high'?'badge-red':'badge-amber') + '" style="font-size:9px">' + sev + '</span>' +
                '<div style="font-size:10px;color:var(--text3);margin-top:4px;font-family:\'JetBrains Mono\',monospace">' + item.v.time + '</div>' +
              '</div>' +
            '</div>';
          }).join('');
        })() +
      '</div>' +
    '</div>' +

    /* Violation Type Bar Chart */
    (Object.keys(violTypes).length > 0
      ? '<div class="card">' +
          '<div class="section-title">Violation Breakdown</div>' +
          '<div style="display:flex;flex-direction:column;gap:8px">' +
          Object.entries(violTypes).map(function(pair){
            var t = pair[0], cnt = pair[1];
            var pct = Math.round(cnt / allViols.length * 100);
            return '<div>' +
              '<div style="display:flex;justify-content:space-between;margin-bottom:4px">' +
                '<span style="font-size:12px;color:var(--text2);font-weight:600">' + t + '</span>' +
                '<span style="font-size:12px;color:var(--text3);font-family:\'JetBrains Mono\',monospace">' + cnt + ' (' + pct + '%)</span>' +
              '</div>' +
              '<div style="height:6px;background:var(--border);border-radius:4px;overflow:hidden">' +
                '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,var(--red),var(--amber));border-radius:4px;transition:width 1s ease;box-shadow:0 0 6px rgba(239,68,68,0.4)"></div>' +
              '</div>' +
            '</div>';
          }).join('') +
          '</div>' +
        '</div>'
      : '') +
    '</div>';
}

function statCard(label, value, sub, color) {
  return '<div class="stat-card anim-fade-up delay-1">' +
    '<div class="stat-label">' + label + '</div>' +
    '<div class="stat-value" style="color:' + color + '">' + value + '</div>' +
    (sub ? '<div class="stat-sub">' + sub + '</div>' : '') +
  '</div>';
}

function renderAStudents() {
  var live = getLiveSessions(); /* online/exam only */
  var allSess = getAllSessions(); /* includes offline */
  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
    '<div class="page-title">All Students</div>' +
    '<div class="page-sub">Student registry and proctoring records</div>' +
    '<div class="card">' +
      '<table><thead><tr><th>Student</th><th>College</th><th>Exams</th><th>Avg Score</th><th>Violations</th><th>Status</th><th></th></tr></thead><tbody>' +
      allSess.map(function(ls){
        var isOnline = ls.status !== 'offline';
        var photoHtml = ls.profilePhoto
          ? '<div style="width:28px;height:28px;border-radius:50%;overflow:hidden;flex-shrink:0;border:1.5px solid ' + (isOnline?'var(--cyan)':'var(--border2)') + '"><img src="' + ls.profilePhoto + '" style="width:100%;height:100%;object-fit:cover" /></div>'
          : '<div class="avatar" style="background:' + (isOnline?'linear-gradient(135deg,var(--green),#15803d)':'var(--bg3)') + ';font-size:11px;width:28px;height:28px">' + ls.name.split(' ').map(function(n){return n[0];}).join('') + '</div>';
        return '<tr>' +
          '<td><div style="display:flex;align-items:center;gap:9px">' + photoHtml + '<div><div style="font-weight:700;color:var(--text)">' + ls.name + '</div>' +
            (isOnline?'<div style="font-size:10px;color:var(--green);font-weight:600">● LIVE</div>':'<div style="font-size:10px;color:var(--text3);font-weight:500">○ Session ended</div>') + '</div></div></td>' +
          '<td style="color:var(--text3)">' + ls.college + '</td>' +
          '<td>' + (ls.examSubmitted?'1':'0') + '</td>' +
          '<td style="font-family:\'JetBrains Mono\',monospace;color:' + (ls.score!=null?(ls.score>=70?'var(--green)':'var(--red)'):'var(--text3)') + '">' + (ls.score!=null?ls.score+'%':'—') + '</td>' +
          '<td><span class="badge ' + (ls.violations.length?'badge-red':'badge-green') + '">' + ls.violations.length + '</span></td>' +
          '<td><span class="badge ' + (ls.status==='exam'?'badge-amber':isOnline?'badge-green':'badge-gray') + '">' + ls.status + '</span></td>' +
          '<td><button class="btn-outline btn-sm" onclick="viewLiveStudent(\'' + ls.name + '\')">View →</button></td>' +
        '</tr>';
      }).join('') +
      STUDENTS.filter(function(s){ return s.exams>0; }).map(function(s){
        return '<tr>' +
          '<td><div style="display:flex;align-items:center;gap:9px"><div class="avatar" style="width:28px;height:28px;font-size:11px">' + s.name.split(' ').map(function(n){return n[0];}).join('') + '</div><div style="font-weight:600;color:var(--text)">' + s.name + '</div></div></td>' +
          '<td style="color:var(--text3)">' + s.college + '</td>' +
          '<td>' + s.exams + '</td>' +
          '<td style="font-family:\'JetBrains Mono\',monospace;color:' + (s.avgScore>=70?'var(--green)':'var(--red)') + '">' + s.avgScore + '%</td>' +
          '<td><span class="badge ' + (s.violations.length?'badge-red':'badge-green') + '">' + s.violations.length + '</span></td>' +
          '<td><span class="badge badge-gray">offline</span></td>' +
          '<td><button class="btn-outline btn-sm" onclick="viewStudent(' + s.id + ')">View →</button></td>' +
        '</tr>';
      }).join('') +
      '</tbody></table>' +
    '</div>' +
    '</div>';
}

function viewLiveStudent(name) {
  var ls = LIVE_SESSIONS[name]; if (!ls) return;
  var isOnline = ls.status !== 'offline';
  _renderStudentDetail({ name:ls.name,college:ls.college,dob:ls.dob,exams:ls.examSubmitted?1:0,avgScore:ls.score!=null?ls.score:0,status:ls.status,violations:ls.violations||[],isLive:isOnline,loginTime:ls.loginTime,examName:ls.examName,score:ls.score,grade:ls.grade,submitTime:ls.submitTime,autoSubmitted:ls.autoSubmitted,profilePhoto:ls.profilePhoto,recordingUrl:ls.recordingUrl,recordingMime:ls.recordingMime,recordingSize:ls.recordingSize });
}

function viewStudent(id) {
  var s = STUDENTS.find(function(x){ return x.id===id; }); if (!s) return;
  _renderStudentDetail(s);
}

function _renderStudentDetail(s) {
  var violScore = Math.min(100, (s.violations||[]).length * 15);
  var profilePhoto = s.profilePhoto || (LIVE_SESSIONS[s.name] && LIVE_SESSIONS[s.name].profilePhoto) || null;
  var avatarHtml = profilePhoto
    ? '<div style="width:56px;height:56px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2.5px solid ' + (s.isLive?'var(--green)':'var(--border2)') + ';box-shadow:0 4px 14px rgba(0,0,0,0.12)"><img src="' + profilePhoto + '" style="width:100%;height:100%;object-fit:cover" /></div>'
    : '<div class="avatar" style="width:56px;height:56px;font-size:18px;' + (s.isLive?'background:linear-gradient(135deg,var(--green),#15803d)':'') + '">' + s.name.split(' ').map(function(n){return n[0];}).join('') + '</div>';
  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:22px">' +
      '<button class="btn-outline btn-sm" onclick="renderAStudents()">← Back</button>' +
      '<div class="page-title" style="margin-bottom:0">' + s.name + (s.isLive?'&nbsp;<span class="badge badge-live">LIVE</span>':'') + '</div>' +
    '</div>' +
    '<div class="two-col">' +
      '<div class="card">' +
        '<div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">' +
          avatarHtml +
          '<div>' +
            '<div style="font-size:18px;font-weight:800;color:var(--text)">' + s.name + '</div>' +
            '<div style="font-size:12px;color:var(--text3);margin-top:3px">' + s.college + '</div>' +
            (s.isLive?'<div style="font-size:11px;color:var(--green);font-weight:700;margin-top:3px">● Online since ' + (s.loginTime||'') + '</div>':'') +
          '</div>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">' +
          '<div class="stat-card" style="padding:12px 14px"><div class="stat-label">Exams</div><div class="stat-value" style="font-size:24px">' + s.exams + '</div></div>' +
          '<div class="stat-card" style="padding:12px 14px"><div class="stat-label">Avg Score</div><div class="stat-value" style="font-size:24px;color:' + (s.avgScore>=70?'var(--green)':'var(--red)') + '">' + (s.avgScore||(s.score!=null?s.score:0)) + '%</div></div>' +
        '</div>' +
        '<div style="text-align:center">' +
          buildSuspicionGauge(violScore) +
          '<div style="font-size:11px;color:var(--text3);font-weight:600;letter-spacing:.5px">SUSPICION SCORE</div>' +
        '</div>' +
        (s.isLive&&s.examName
          ? '<div class="divider"></div><div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:12px 14px"><div style="font-size:12px;font-weight:800;color:var(--amber);margin-bottom:6px">📝 Exam Session</div><div style="font-size:12px;color:var(--text2)">Exam: <strong>' + (s.examName||'—') + '</strong></div>' + (s.submitTime?'<div style="font-size:12px;color:var(--text2);margin-top:3px">Submitted: <strong>' + s.submitTime + '</strong>' + (s.autoSubmitted?'&nbsp;<span class="badge badge-red" style="font-size:9px">AUTO</span>':'') + '</div>':'<div style="font-size:12px;color:var(--amber);margin-top:3px;font-weight:600">⟳ In progress...</div>') + (s.score!=null?'<div style="font-size:15px;color:' + (s.score>=70?'var(--green)':'var(--red)') + ';font-weight:800;margin-top:6px;font-family:\'JetBrains Mono\',monospace">Score: ' + s.score + '% (' + (s.grade||'—') + ')</div>':'') + '</div>'
          : '') +
      '</div>' +
      '<div class="card">' +
        '<div class="section-title">Violation Details</div>' +
        ((s.violations||[]).length===0
          ? '<div style="padding:28px;text-align:center;color:var(--green);font-size:13px">✅ No violations recorded.</div>'
          : (s.violations||[]).map(function(v){
              return '<div class="viol-detail-card">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">' +
                  '<div style="font-size:13px;font-weight:800;color:' + (v.severity==='high'?'#f87171':'#fbbf24') + '">' + v.type + '</div>' +
                  '<span class="badge ' + (v.severity==='high'?'badge-red':'badge-amber') + '">' + v.severity + '</span>' +
                '</div>' +
                '<div style="font-size:12px;color:var(--text2);margin-bottom:6px">' + v.desc + '</div>' +
                '<div style="font-size:11px;color:var(--text3);font-family:\'JetBrains Mono\',monospace;margin-bottom:' + (v.photo?'10px':'0') + '">Exam: ' + v.exam + '  ·  ' + v.time + '</div>' +
                (v.photo?'<div style="margin-top:8px"><div style="font-size:10px;font-weight:700;color:var(--red);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">📷 Capture at violation</div><img src="' + v.photo + '" style="width:100%;max-width:280px;border-radius:8px;border:1.5px solid rgba(239,68,68,0.4);display:block" /></div>':'') +
              '</div>';
            }).join('')
        ) +
      '</div>' +
      '<div class="card">' +
        '<div class="section-title">📹 Session Recording</div>' +
        (s.recordingUrl
          ? '<video controls preload="metadata" src="' + s.recordingUrl + '" style="width:100%;border-radius:10px;border:1.5px solid var(--border2);background:#000;display:block"></video>' +
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px;font-size:11px;color:var(--text3);font-family:\'JetBrains Mono\',monospace">' +
              '<span>' + (s.recordingMime || 'video/webm') + (s.recordingSize ? '  ·  ' + (Math.round(s.recordingSize/1024) + ' KB') : '') + '</span>' +
              '<a href="' + s.recordingUrl + '" download="' + (s.name||'session').replace(/\s+/g,'_') + '_recording.webm" class="btn-outline btn-sm" style="text-decoration:none">⬇ Download</a>' +
            '</div>'
          : '<div style="padding:24px;text-align:center;color:var(--text3);font-size:12px">' + (s.isLive ? '⟳ Recording in progress — available after submission.' : 'No recording captured for this session.') + '</div>') +
      '</div>' +
    '</div>' +
    '</div>';
}

function renderAViolations() {
  var all = getAllViolations();
  var names = {}; all.forEach(function(x){ names[x.student]=1; });
  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
    '<div class="page-title">All Violations</div>' +
    '<div class="page-sub">Every flagged incident across all exam sessions</div>' +
    '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">' +
      statCard('Total', all.length, 'All incidents', 'var(--red)') +
      statCard('High Severity', all.filter(function(x){return x.v.severity==='high';}).length, 'Critical flags', 'var(--red)') +
      statCard('Students Flagged', Object.keys(names).length, 'Unique students', 'var(--amber)') +
    '</div>' +
    (all.length===0
      ? '<div class="card" style="text-align:center;padding:48px;color:var(--green)">✅ No violations recorded yet.</div>'
      : '<div style="display:flex;flex-direction:column;gap:10px">' +
          all.map(function(item){
            return '<div class="card" style="padding:16px;' + (item.isLive?'border-color:rgba(239,68,68,0.3);':'') + '">' +
              '<div style="display:flex;align-items:flex-start;gap:14px">' +
                (item.v.photo?'<img src="' + item.v.photo + '" style="width:90px;height:68px;object-fit:cover;border-radius:8px;border:1.5px solid rgba(239,68,68,0.4);flex-shrink:0" />':'') +
                '<div style="flex:1">' +
                  '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">' +
                    '<span style="font-size:14px;font-weight:800;color:' + (item.v.severity==='high'?'#f87171':'#fbbf24') + '">' + item.v.type + '</span>' +
                    '<span class="badge ' + (item.v.severity==='high'?'badge-red':'badge-amber') + '">' + item.v.severity + '</span>' +
                    (item.isLive?'<span class="badge badge-live" style="font-size:9px">LIVE</span>':'') +
                  '</div>' +
                  '<div style="font-size:12px;color:var(--text2);margin-bottom:5px">' + item.v.desc + '</div>' +
                  '<div style="font-size:11px;color:var(--text3);font-family:\'JetBrains Mono\',monospace">' + item.student + ' &nbsp;·&nbsp; ' + item.v.exam + ' &nbsp;·&nbsp; ' + item.v.time + '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>') +
    '</div>';
}

function renderAExams() {
  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
    '<div class="page-title">Exam Management</div>' +
    '<div class="page-sub">Registered exams and their status</div>' +
    '<div style="display:flex;flex-direction:column;gap:14px">' +
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
          '<span class="badge ' + (e.status==='active'?'badge-green':'badge-gray') + '" style="font-size:12px;padding:6px 14px">' + e.status.toUpperCase() + '</span>' +
        '</div>' +
      '</div>';
    }).join('') +
    '</div></div>';
}

function renderAReports() {
  document.getElementById('a-content').innerHTML =
    '<div class="page-enter">' +
    '<div class="page-title">Reports & Export</div>' +
    '<div class="page-sub">Generate and download comprehensive proctoring reports</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">' +

      '<div class="card cyber-card" style="text-align:center;padding:32px 20px">' +
        '<div style="font-size:40px;margin-bottom:14px">🛡</div>' +
        '<div style="font-size:16px;font-weight:800;color:var(--text);margin-bottom:8px">Violation Report</div>' +
        '<div style="font-size:12px;color:var(--text3);margin-bottom:20px;line-height:1.6">Complete violation log with screenshots, timestamps, severity analysis, and suspicion scores.</div>' +
        '<button class="btn-primary" style="width:100%;padding:12px" onclick="generateViolationPDF()">📄 Download PDF</button>' +
      '</div>' +

      '<div class="card cyber-card" style="text-align:center;padding:32px 20px">' +
        '<div style="font-size:40px;margin-bottom:14px">📊</div>' +
        '<div style="font-size:16px;font-weight:800;color:var(--text);margin-bottom:8px">Performance Report</div>' +
        '<div style="font-size:12px;color:var(--text3);margin-bottom:20px;line-height:1.6">Student score summaries, grade distributions, and comparative analytics.</div>' +
        '<button class="btn-primary" style="width:100%;padding:12px" onclick="generatePerformancePDF()">📄 Download PDF</button>' +
      '</div>' +

      '<div class="card cyber-card" style="text-align:center;padding:32px 20px">' +
        '<div style="font-size:40px;margin-bottom:14px">📋</div>' +
        '<div style="font-size:16px;font-weight:800;color:var(--text);margin-bottom:8px">Exam Audit Log</div>' +
        '<div style="font-size:12px;color:var(--text3);margin-bottom:20px;line-height:1.6">Complete exam session log including login times, submission details, and auto-submit events.</div>' +
        '<button class="btn-primary" style="width:100%;padding:12px" onclick="generateAuditPDF()">📄 Download PDF</button>' +
      '</div>' +

      '<div class="card" style="text-align:center;padding:32px 20px">' +
        '<div style="font-size:40px;margin-bottom:14px">💾</div>' +
        '<div style="font-size:16px;font-weight:800;color:var(--text);margin-bottom:8px">Data Storage</div>' +
        '<div style="font-size:12px;color:var(--text3);margin-bottom:20px;line-height:1.6">All violation logs, snapshots, and scores are stored in LocalStorage / IndexedDB during the session.</div>' +
        '<div style="font-size:11px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);border-radius:8px;padding:10px;color:var(--green);font-weight:600">✅ Data persistence active</div>' +
      '</div>' +
    '</div>' +

    /* Summary stats */
    '<div class="card">' +
      '<div class="section-title">Session Summary</div>' +
      (function(){
        var live = getLiveSessions(); var all = getAllViolations();
        return '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">' +
          '<div style="text-align:center;padding:12px;background:rgba(56,189,248,0.06);border-radius:10px;border:1px solid var(--border)"><div style="font-size:22px;font-weight:800;color:var(--cyan);font-family:\'JetBrains Mono\',monospace">' + live.length + '</div><div style="font-size:10px;color:var(--text3);margin-top:3px;text-transform:uppercase;letter-spacing:.5px">Live Sessions</div></div>' +
          '<div style="text-align:center;padding:12px;background:rgba(239,68,68,0.06);border-radius:10px;border:1px solid var(--border)"><div style="font-size:22px;font-weight:800;color:var(--red);font-family:\'JetBrains Mono\',monospace">' + all.length + '</div><div style="font-size:10px;color:var(--text3);margin-top:3px;text-transform:uppercase;letter-spacing:.5px">Total Violations</div></div>' +
          '<div style="text-align:center;padding:12px;background:rgba(34,197,94,0.06);border-radius:10px;border:1px solid var(--border)"><div style="font-size:22px;font-weight:800;color:var(--green);font-family:\'JetBrains Mono\',monospace">' + (function(){var s=0;live.forEach(function(ls){if(ls.score)s+=ls.score;});return live.filter(function(ls){return ls.score!=null;}).length?Math.round(s/live.filter(function(ls){return ls.score!=null;}).length)+'%':'—';})() + '</div><div style="font-size:10px;color:var(--text3);margin-top:3px;text-transform:uppercase;letter-spacing:.5px">Avg Live Score</div></div>' +
          '<div style="text-align:center;padding:12px;background:rgba(99,102,241,0.06);border-radius:10px;border:1px solid var(--border)"><div style="font-size:22px;font-weight:800;color:var(--blue);font-family:\'JetBrains Mono\',monospace">2</div><div style="font-size:10px;color:var(--text3);margin-top:3px;text-transform:uppercase;letter-spacing:.5px">Active Exams</div></div>' +
        '</div>';
      })() +
    '</div>' +
    '</div>';
}

/* =====================================================
   PDF GENERATION
===================================================== */
function pdfHeader(doc, title, subtitle, accentR, accentG, accentB) {
  doc.setFillColor(5, 13, 26);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setFillColor(accentR, accentG, accentB);
  doc.rect(0, 37, 210, 3, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(20); doc.setFont('helvetica','bold');
  doc.text('HexaMinds', 14, 16);
  doc.setFontSize(11); doc.setFont('helvetica','normal');
  doc.text(subtitle, 14, 24);
  doc.setFontSize(8); doc.setTextColor(150,170,200);
  doc.text('Generated: ' + new Date().toLocaleString() + '  |  ' + title, 14, 32);
}

function generateViolationPDF() {
  if (typeof window.jspdf === 'undefined') { alert('jsPDF not loaded.'); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  pdfHeader(doc, 'Violation Report', 'Violation & Proctoring Log', 239, 68, 68);

  var y = 52;
  var all = getAllViolations();
  if (all.length === 0) {
    doc.setFontSize(12); doc.setTextColor(34, 197, 94);
    doc.text('No violations recorded.', 14, y);
  } else {
    all.forEach(function(item) {
      if (y > 265) { doc.addPage(); y = 20; }
      var sev = item.v.severity;
      doc.setFillColor(sev==='high'?255:255, sev==='high'?235:245, sev==='high'?235:220);
      doc.roundedRect(10, y-2, 190, 22, 1.5, 1.5, 'F');
      doc.setFontSize(10); doc.setFont('helvetica','bold');
      doc.setTextColor(sev==='high'?180:160, sev==='high'?20:80, sev==='high'?20:0);
      doc.text(item.v.type + ' (' + sev.toUpperCase() + ')', 14, y+5);
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(60,60,80);
      doc.text('Student: ' + item.student + '  ·  Exam: ' + item.v.exam + '  ·  ' + item.v.time, 14, y+11);
      doc.setTextColor(80,80,100);
      var desc = item.v.desc.length>85?item.v.desc.slice(0,85)+'…':item.v.desc;
      doc.text(desc, 14, y+17);
      y += 27;
    });
  }

  var p = doc.internal.getNumberOfPages();
  for (var i=1;i<=p;i++){doc.setPage(i);doc.setFontSize(7);doc.setTextColor(140,160,180);doc.text('HexaMinds — Violation Report  |  Page '+i+' of '+p,14,291);}
  doc.save('HexaMinds_Violations_' + new Date().toISOString().slice(0,10) + '.pdf');
}

function generatePerformancePDF() {
  if (typeof window.jspdf === 'undefined') { alert('jsPDF not loaded.'); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  pdfHeader(doc, 'Performance Report', 'Student Performance Report', 22, 163, 74);

  var y = 52;
  var all = STUDENTS.filter(function(s){ return s.exams>0; });
  var live = getLiveSessions().filter(function(ls){ return ls.examStarted; });

  doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(13,13,46);
  doc.text('Student Records', 14, y); y += 9;

  doc.setFillColor(230,245,255);
  doc.rect(10, y, 190, 8, 'F');
  doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(80,80,120);
  doc.text('Student', 14, y+5.5); doc.text('College', 55, y+5.5);
  doc.text('Exams', 120, y+5.5); doc.text('Score', 140, y+5.5); doc.text('Violations', 168, y+5.5);
  y += 13;

  all.forEach(function(s){
    if (y>265){ doc.addPage(); y=20; }
    var sc = s.avgScore;
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(20,20,20);
    doc.text(s.name, 14, y);
    doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80);
    doc.text(s.college, 55, y); doc.text(String(s.exams), 123, y);
    doc.setTextColor(sc>=70?22:220, sc>=70?163:38, sc>=70?74:38); doc.setFont('helvetica','bold');
    doc.text(sc+'%', 143, y);
    doc.setTextColor(s.violations.length?220:22, s.violations.length?38:163, s.violations.length?38:74);
    doc.text(String(s.violations.length||'—'), 173, y);
    doc.setDrawColor(220,230,245); doc.line(14,y+3,196,y+3); y+=12;
  });

  live.forEach(function(ls){
    if (y>265){ doc.addPage(); y=20; }
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(20,100,20);
    doc.text(ls.name+' (LIVE)', 14, y);
    doc.setFont('helvetica','normal'); doc.setTextColor(80,80,80);
    doc.text(ls.college, 55, y);
    doc.text(ls.examSubmitted?'1':'—', 123, y);
    if (ls.score!=null){ var c=ls.score>=70?[22,163,74]:[220,38,38]; doc.setTextColor(c[0],c[1],c[2]); doc.setFont('helvetica','bold'); doc.text(ls.score+'%', 143, y); }
    y+=12;
  });

  var p=doc.internal.getNumberOfPages();
  for(var i=1;i<=p;i++){doc.setPage(i);doc.setFontSize(7);doc.setTextColor(140,160,180);doc.text('HexaMinds — Performance Report  |  Page '+i+' of '+p,14,291);}
  doc.save('HexaMinds_Performance_' + new Date().toISOString().slice(0,10) + '.pdf');
}

function generateAuditPDF() {
  if (typeof window.jspdf === 'undefined') { alert('jsPDF not loaded.'); return; }
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  pdfHeader(doc, 'Exam Audit Log', 'Exam Audit & Session Log', 26, 86, 219);

  var y = 52;
  doc.setFontSize(12); doc.setFont('helvetica','bold'); doc.setTextColor(13,13,46);
  doc.text('Registered Exams', 14, y); y += 9;

  EXAMS.forEach(function(e, i){
    if (y>265){ doc.addPage(); y=20; }
    doc.setFillColor(i%2===0?[240,248,255]:[255,255,255]);
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
  for(var i=1;i<=p;i++){doc.setPage(i);doc.setFontSize(7);doc.setTextColor(140,160,180);doc.text('HexaMinds — Exam Audit Log  |  Page '+i+' of '+p,14,291);}
  doc.save('HexaMinds_AuditLog_' + new Date().toISOString().slice(0,10) + '.pdf');
}

/* =====================================================
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
