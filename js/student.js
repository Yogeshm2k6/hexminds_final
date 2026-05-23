/* =====================================================
   STUDENT NAVIGATION
===================================================== */
function sNav(page, el) {
  document.querySelectorAll('#student-app .si').forEach(function(i){ i.classList.remove('active'); });
  el.classList.add('active');
  if      (page === 'sdash')    renderSDash();
  else if (page === 'sjoin')    renderSJoin();
  else if (page === 'sresults') renderSResults();
}

/* =====================================================
   STUDENT PAGES
===================================================== */
function renderSDash() {
  var initials = currentStudent.initials || '?';
  var profilePhotoHtml = studentProfilePhoto
    ? '<div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,var(--cyan2),var(--blue));overflow:hidden;box-shadow:0 6px 20px var(--cyan-glow);border:2.5px solid var(--cyan);flex-shrink:0"><img src="' + studentProfilePhoto + '" style="width:100%;height:100%;object-fit:cover;border-radius:13px" /></div>'
    : '<div style="width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,var(--cyan2),var(--blue));display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#fff;box-shadow:0 6px 20px var(--cyan-glow)">' + initials + '</div>';
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
      '<div class="stat-card anim-fade-up delay-1"><div class="stat-label">Available Exams</div><div class="stat-value" style="color:var(--cyan)">2</div><div class="stat-sub">Ready to take</div></div>' +
      '<div class="stat-card anim-fade-up delay-2"><div class="stat-label">Completed</div><div class="stat-value" style="color:var(--green)">1</div><div class="stat-sub">This semester</div></div>' +
      '<div class="stat-card anim-fade-up delay-3"><div class="stat-label">Avg Score</div><div class="stat-value">82%</div><div class="stat-sub">Grade: B+</div></div>' +
    '</div>' +
    '<div class="card anim-fade-up delay-2" style="margin-bottom:16px">' +
      '<div class="section-title">📋 Your Exams</div>' +
      studentExams.map(function(e){
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:16px 0;border-bottom:1px solid var(--border)">' +
          '<div>' +
            '<div style="font-weight:700;font-size:14px;color:var(--text)">' + e.title + '</div>' +
            '<div style="font-size:12px;color:var(--text3);margin-top:4px;font-family:\'JetBrains Mono\',monospace">' + e.questions + ' Qs &nbsp;·&nbsp; ' + e.duration + ' min &nbsp;·&nbsp; ' + e.date + '</div>' +
          '</div>' +
          (e.status === 'completed'
            ? '<span class="badge badge-green">✓ Score: ' + e.score + '%</span>'
            : '<button class="btn-primary btn-sm" onclick="startExam(' + e.id + ')">Start Exam →</button>') +
        '</div>';
      }).join('') +
    '</div>' +
    '<div class="card anim-fade-up delay-3">' +
      '<div class="section-title">🔑 Join with Exam Code</div>' +
      '<div style="display:flex;gap:10px">' +
        '<input id="code-inp" placeholder="Enter exam code e.g. CS101" style="flex:1;letter-spacing:3px;font-family:\'JetBrains Mono\',monospace;font-size:15px;text-transform:uppercase" />' +
        '<button class="btn-primary" onclick="joinCode()">Join →</button>' +
      '</div>' +
    '</div>' +
    '</div>';
}

function renderSJoin() {
  document.getElementById('s-content').innerHTML =
    '<div style="max-width:440px" class="page-enter">' +
    '<div class="page-title">Join an Exam</div>' +
    '<div class="page-sub">Enter the access code provided by your invigilator</div>' +
    '<div class="card cyber-card">' +
      '<div class="form-group"><label class="form-label">Exam Access Code</label>' +
      '<input id="join-code" placeholder="e.g. CS101" style="font-size:20px;letter-spacing:5px;text-align:center;font-family:\'JetBrains Mono\',monospace;text-transform:uppercase" /></div>' +
      '<button class="btn-primary" style="width:100%;padding:13px;font-size:14px;letter-spacing:.5px" onclick="joinCode2()">VERIFY &amp; START EXAM →</button>' +
    '</div></div>';
}

function renderSResults() {
  document.getElementById('s-content').innerHTML =
    '<div class="page-enter">' +
    '<div class="page-title">My Results</div>' +
    '<div class="page-sub">Your exam history and performance analytics</div>' +
    '<div class="card" style="margin-bottom:16px">' +
      '<table><thead><tr><th>Exam</th><th>Date</th><th>Score</th><th>Grade</th><th>Status</th></tr></thead><tbody>' +
        '<tr><td style="font-weight:700;color:var(--text)">World History Quiz</td><td style="color:var(--text3)">Apr 20, 2026</td>' +
        '<td style="font-weight:700;color:var(--green);font-family:\'JetBrains Mono\',monospace">82%</td>' +
        '<td style="font-weight:700;color:var(--cyan)">B+</td><td><span class="badge badge-green">Pass</span></td></tr>' +
      '</tbody></table>' +
    '</div>' +
    (sessionViolations.length > 0
      ? '<div class="card">' +
          '<div class="section-title" style="color:var(--red)">⚠ Violations This Session (' + sessionViolations.length + ')</div>' +
          '<div id="live-suspicion-gauge" style="margin-bottom:16px">' + buildSuspicionGauge(suspicionScore) +
            '<div style="text-align:center;font-size:11px;color:var(--text3);font-weight:600;letter-spacing:.5px">SUSPICION SCORE</div>' +
          '</div>' +
          sessionViolations.map(function(v){
            return '<div class="viol-detail-card">' +
              '<div style="display:flex;justify-content:space-between;margin-bottom:5px">' +
                '<div style="font-size:13px;font-weight:800;color:' + (v.severity==='high'?'#f87171':'#fbbf24') + '">' + v.type + '</div>' +
                '<span class="badge ' + (v.severity==='high'?'badge-red':'badge-amber') + '">' + v.severity + '</span>' +
              '</div>' +
              '<div style="font-size:12px;color:var(--text2)">' + v.desc + '</div>' +
              '<div style="font-size:11px;color:var(--text3);margin-top:5px;font-family:\'JetBrains Mono\',monospace">' + v.time + '</div>' +
            '</div>';
          }).join('') +
        '</div>'
      : '<div class="card" style="text-align:center;padding:36px;color:var(--green)">✅ No violations this session — excellent proctoring record!</div>'
    ) +
    '</div>';
}

function joinCode()  { var c=(document.getElementById('code-inp')||{}).value||''; if(c) startExam(1); else alert('Enter an exam code.'); }
function joinCode2() { var c=(document.getElementById('join-code')||{}).value||''; if(c) startExam(1); else alert('Enter an exam code.'); }

function startExam(id) {
  examAnswers = {};
  examTimeLeft = 3600;
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
    LIVE_SESSIONS[currentStudent.name].examName = 'CS101';
    LIVE_SESSIONS[currentStudent.name].examStart = new Date().toLocaleTimeString();
  }
  renderExam(id);
}

/* =====================================================
   EXAM RENDER
===================================================== */
function renderExam(id) {
  var exam = studentExams.find(function(e){ return e.id === id; }) || studentExams[0];
  document.getElementById('s-content').innerHTML =
    '<div style="display:grid;grid-template-columns:1fr 260px;gap:18px" class="page-enter">' +
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
            return '<div class="q-block" style="animation:cardEntrance .4s ' + (i*0.07) + 's ease both">' +
              '<div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px">Question ' + (i+1) + ' <span style="color:var(--border2)">/ ' + QUESTIONS.length + '</span></div>' +
              '<div style="font-size:14px;color:var(--text);margin-bottom:16px;font-weight:600;line-height:1.6">' + q.q + '</div>' +
              q.opts.map(function(opt, j){
                return '<div class="q-opt" id="opt-' + q.id + '-' + j + '" onclick="pickAns(' + q.id + ',' + j + ')">' +
                  '<div class="q-radio"><div class="q-radio-in"></div></div>' + opt + '</div>';
              }).join('') +
            '</div>';
          }).join('') +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:20px;padding:16px 0;border-top:1px solid var(--border)">' +
          '<button class="btn-outline" onclick="renderSDash()">Save &amp; Exit</button>' +
          '<button class="btn-primary" style="padding:11px 24px" onclick="submitExam(false)">Submit Exam ✓</button>' +
        '</div>' +
      '</div>' +
      /* Right: Camera + Monitor */
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
        '<div class="card" style="padding:16px">' +
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
      '</div>' +
    '</div>';

  startTimer();
  startCam();
  startExamMonitoring();
  startWaveform();
}

/* =====================================================
   CAMERA — getUserMedia + Face Detection API
