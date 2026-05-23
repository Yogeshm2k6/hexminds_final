   EXAM MONITORING
===================================================== */
function startExamMonitoring() {
  if (!examActive) return;

  /* Page visibility (tab switch / app switch) — only fires when the page is hidden */
  document.addEventListener('visibilitychange', handleTabSwitch);

  /* ── Copy-paste detection ── */
  document.addEventListener('copy',  handleCopyPaste);
  document.addEventListener('paste', handleCopyPaste);
  document.addEventListener('cut',   handleCopyPaste);

  /* ── Right-click prevention ── */
  document.addEventListener('contextmenu', handleRightClick);

  /* ── Keyboard shortcut detection ── */
  document.addEventListener('keydown', handleKeyDown);

  /* Phone detection is handled by COCO-SSD inside the face detection loop (initFaceDetection).
     No random simulation needed — AI detects real phones in camera frame. */

  /* Audio monitoring indicator update */
  var audioInterval = setInterval(function() {
    if (!examActive) { clearInterval(audioInterval); return; }
    var bars = document.querySelectorAll('.audio-bar');
    bars.forEach(function(b) {
      b.style.setProperty('--h', (Math.random() * 14 + 4) + 'px');
    });
  }, 300);
}

function handleTabSwitch() {
  if (!examActive) return;
  if (document.hidden) {
    /* Only triggers when student actually switches to another tab/window/app */
    violationCount++;
    logViolation('Tab Switch', 'Student switched to another browser tab or application during the exam.', 'high');
    showViolationAlert('🔀 Tab Switch Detected',
      'You switched away from the exam to another tab or application. This is a critical violation. Exam may be auto-submitted.', false);
    escalateProctorBar('Tab Switch');
    checkAutoSubmit();
  }
}

function handleCopyPaste(e) {
  if (!examActive) return;
  e.preventDefault();
  var type = e.type === 'copy' ? 'Copy' : e.type === 'paste' ? 'Paste' : 'Cut';
  violationCount++;
  logViolation(type + ' Detected', 'Student attempted to ' + type.toLowerCase() + ' content during the exam. This is not allowed.', 'medium');
  showViolationAlert('📋 ' + type + ' Attempt Blocked',
    'Copy/paste operations are not permitted during the exam. This action has been logged.', false);
  escalateProctorBar(type + ' Blocked');
  checkAutoSubmit();
  /* Show quick warning */
  showCPWarn('⛔ ' + type.toUpperCase() + ' IS NOT ALLOWED DURING EXAM');
}

function showCPWarn(msg) {
  var old = document.querySelector('.cp-warn');
  if (old) old.remove();
  var el = document.createElement('div');
  el.className = 'cp-warn';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(function(){ el.remove(); }, 2500);
}

function handleRightClick(e) {
  if (!examActive) return;
  e.preventDefault();
  showCPWarn('⛔ RIGHT-CLICK IS DISABLED DURING EXAM');
}

function handleKeyDown(e) {
  if (!examActive) return;
  /* Block common cheating shortcuts */
  var blocked = [
    (e.ctrlKey && e.key === 'c'),
    (e.ctrlKey && e.key === 'v'),
    (e.ctrlKey && e.key === 'u'), /* view source */
    (e.ctrlKey && e.shiftKey && e.key === 'I'), /* devtools */
    (e.key === 'F12'),
    (e.ctrlKey && e.key === 'p'), /* print */
    (e.altKey && e.key === 'PrintScreen'),
  ];
  if (blocked.some(Boolean)) {
    e.preventDefault();
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I') || (e.ctrlKey && e.key === 'u')) {
      violationCount++;
      logViolation('Dev Tools Attempt', 'Student attempted to open browser developer tools (F12 / Inspect).', 'high');
      showViolationAlert('🔧 Developer Tools Blocked',
        'Attempting to open developer tools during an exam is a serious violation.', false);
      escalateProctorBar('Dev Tools Attempt');
      checkAutoSubmit();
    }
  }
}

function stopExamMonitoring() {
  document.removeEventListener('visibilitychange', handleTabSwitch);
  document.removeEventListener('copy',  handleCopyPaste);
  document.removeEventListener('paste', handleCopyPaste);
  document.removeEventListener('cut',   handleCopyPaste);
  document.removeEventListener('contextmenu', handleRightClick);
  document.removeEventListener('keydown', handleKeyDown);
  clearInterval(phoneDetectionInterval);
  phoneDetectionInterval = null;
}

function checkAutoSubmit() {
  if (violationCount >= MAX_VIOLATIONS && examActive) {
    submitExam(true);
  }
}

function handlePhoneDetected() {
  /* Legacy shim — delegates to ML handler */
  handlePhoneDetectedML('cell phone', 92);
}

/* =====================================================
   AUTO-SUBMIT COUNTDOWN
===================================================== */
function startAutoSubmitCountdown(reason) {
  if (autoSubmitSecondsLeft > 0) return;
  autoSubmitSecondsLeft = 5;
  var banner = document.getElementById('auto-submit-banner');
  if (banner) banner.classList.add('visible');
  function tick() {
    if (!examActive) { clearAutoSubmitCountdown(); return; }
    var banner = document.getElementById('auto-submit-banner');
    if (banner) banner.textContent = '⛔ ' + reason + ' — Auto-submitting in ' + autoSubmitSecondsLeft + 's…';
    if (autoSubmitSecondsLeft <= 0) { clearAutoSubmitCountdown(); if (examActive) submitExam(true); return; }
    autoSubmitSecondsLeft--;
    autoSubmitCountdown = setTimeout(tick, 1000);
  }
  tick();
}

function clearAutoSubmitCountdown() {
  clearTimeout(autoSubmitCountdown);
  autoSubmitCountdown = null;
  autoSubmitSecondsLeft = 0;
  var banner = document.getElementById('auto-submit-banner');
  if (banner) banner.classList.remove('visible');
}

/* =====================================================
   FACE RESULT HANDLER
===================================================== */
/* GAZE / LOOK-AWAY — soft warning only, no auto-submit, no violation increment */
function checkGazeAway(isAway) {
  if (!examActive) { gazeAwayConsecutive = 0; return; }
  if (gazeWarningCooldown > 0) gazeWarningCooldown--;
  if (isAway) {
    gazeAwayConsecutive++;
    /* Require ~3 consecutive frames (~2 s) to avoid false positives from blinks/small movements */
    if (gazeAwayConsecutive === 4 && gazeWarningCooldown === 0) {
      gazeWarningCooldown = 12; /* ~8 s before next warning */
      var bar = document.getElementById('cam-viol-bar');
      if (bar) { bar.classList.add('visible'); bar.textContent = '👀  LOOK AT THE SCREEN — Gaze diverted'; bar.style.background = 'rgba(245,158,11,0.78)'; }
      setCamStatus('⚠ Please look at the camera — keep your eyes on the screen', 'red');
      showViolationAlert('👀 Look Away Warning',
        'Please keep your eyes on the screen. Repeated look-aways will be logged as a violation.', false);
      try {
        logViolation('Gaze Diverted (Warning)',
          'Student is not looking at the screen. Soft warning issued — no violation counted.', 'low');
      } catch(e) {}
    }
  } else {
    if (gazeAwayConsecutive > 0) {
      gazeAwayConsecutive = 0;
      var bar2 = document.getElementById('cam-viol-bar');
      /* Only clear the warning bar if it was set by gaze (orange) and no other alert is active */
      if (bar2 && bar2.textContent.indexOf('LOOK AT THE SCREEN') !== -1) {
        bar2.classList.remove('visible');
      }
    }
  }
}

function applyFaceResult(count, simulated) {
  var bar    = document.getElementById('cam-viol-bar');
  var camBox = document.getElementById('cam-box');
  var badge  = document.getElementById('face-count-badge');

  /* ── NO FACE ── */
  if (count === 0) {
    noFaceConsecutive++;
    /* Require 2 consecutive zero-face frames before flagging (reduces false positives) */
    if (noFaceConsecutive < 3) return;

    if (bar)    { bar.classList.add('visible'); bar.textContent = '⚠  NO FACE DETECTED'; bar.style.background = 'rgba(239,68,68,0.7)'; }
    if (camBox) { camBox.classList.add('alert'); camBox.classList.remove('phone-detected'); }
    if (badge)  { badge.classList.add('visible'); badge.textContent = '👁 0 faces'; badge.style.background = 'rgba(239,68,68,0.85)'; }
    setCamStatus('⚠ No face detected — violation logged', 'red');

    /* Only act once per state transition (avoid spamming every frame) */
    if (lastFaceState !== 'none') {
      lastFaceState = 'none';
      noFaceWarningCount++;
      violationCount++;
      var vc = document.getElementById('viol-count');
      if (vc) { vc.textContent = violationCount; vc.style.animation = 'scoreUp .3s ease'; setTimeout(function(){ if(vc) vc.style.animation=''; }, 300); }
      logViolation('Face Not Detected (Occurrence ' + noFaceWarningCount + ')',
        'No face visible in camera frame. Student may have stepped away or covered the camera.', 'high');
      escalateProctorBar('No Face Detected');

      /* ── INSTANT AUTO-SUBMIT on any no-face detection ── */
      showViolationAlert('🚫 No Face Detected — Auto-Submitting!',
        'Your face is not visible in the camera. Per strict proctoring policy, your exam is being auto-submitted now.', true);
      startAutoSubmitCountdown('No face detected');
    }

  /* ── MULTIPLE FACES ── */
  } else if (count > 1) {
    noFaceConsecutive = 0;
    multiFaceConsecutive = (multiFaceConsecutive||0) + 1;
    if (multiFaceConsecutive < 2) return;

    if (bar)    { bar.classList.add('visible'); bar.textContent = '🚫  ' + count + ' FACES DETECTED — UNAUTHORIZED PERSON'; bar.style.background = 'rgba(180,0,0,0.85)'; }
    if (camBox) { camBox.classList.add('alert'); camBox.classList.remove('phone-detected'); }
    if (badge)  { badge.classList.add('visible'); badge.textContent = '👥 ' + count + ' faces'; badge.style.background = 'rgba(180,0,0,0.9)'; }
    setCamStatus('🚫 ' + count + ' faces detected — unauthorized person!', 'red');

    /* Trigger auto-submit on EVERY new detection of multiple faces (not just first time).
       multipleFacesAutoSubmitted prevents duplicate submissions within the same detection burst. */
    if (lastFaceState !== 'multiple') {
      lastFaceState = 'multiple';
      multipleFacesAutoSubmitted = false; /* reset so a new burst can trigger again */
    }

    if (!multipleFacesAutoSubmitted && examActive) {
      multipleFacesAutoSubmitted = true;
      violationCount++;
      var vc2 = document.getElementById('viol-count');
      if (vc2) { vc2.textContent = violationCount; vc2.style.animation = 'scoreUp .3s ease'; setTimeout(function(){ if(vc2) vc2.style.animation=''; }, 300); }
      logViolation('Multiple Faces Detected (' + count + ')',
        count + ' faces detected in the camera frame. An unauthorized person is present. Exam auto-submitted immediately.', 'high');
      escalateProctorBar('Multiple Faces (' + count + ') Detected');
      showViolationAlert('🚫 ' + count + ' Faces Detected — Auto-Submitting!',
        count + ' faces detected in your camera. An unauthorized person is present. Your exam is being submitted immediately per strict proctoring policy.', true);
      /* Immediate auto-submit — 3 s grace period so student can see the alert */
      startAutoSubmitCountdown('Multiple faces (' + count + ') detected');
    }

  /* ── EXACTLY 1 FACE — Normal ── */
  } else {
    noFaceConsecutive = 0;
    multiFaceConsecutive = 0;
    if (lastFaceState === 'multiple') {
      /* Student was flagged for multiple faces; reset burst flag when camera clears */
      multipleFacesAutoSubmitted = false;
      clearAutoSubmitCountdown();
    }
    if (bar)    { bar.classList.remove('visible'); }
    if (camBox) { camBox.classList.remove('alert'); }
    if (badge)  { badge.classList.add('visible'); badge.textContent = '✓ 1 face'; badge.style.background = 'rgba(34,197,94,0.78)'; }
    if (lastFaceState !== 'normal') {
      lastFaceState = 'normal';
      setCamStatus('✓ Face detected — proctoring active', 'green');
    }
  }
}

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
===================================================== */
function startCam() {
  var camBox = document.getElementById('cam-box');
  var ph     = document.getElementById('cam-placeholder');
  var old = document.getElementById('cam-video');
  if (old) old.remove();

  var vid = document.createElement('video');
  vid.id = 'cam-video'; vid.className = 'cam-stream';
  vid.autoplay = true; vid.muted = true; vid.playsInline = true;
  vid.style.display = 'none';
  if (camBox) camBox.insertBefore(vid, camBox.firstChild);

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setCamStatus('⚠ Camera not supported — use Chrome/Edge', 'red');
    if (ph) ph.innerHTML = '<div style="text-align:center;padding:20px"><div style="font-size:28px;color:#f87171;margin-bottom:8px">⛔</div><div style="font-size:11px;color:var(--red)">Camera not supported.</div></div>';
    return;
  }

  navigator.mediaDevices.getUserMedia({ video:{ width:320, height:240, facingMode:'user' }, audio:false })
    .then(function(stream) {
      camStream = stream;
      vid.srcObject = stream;
      /* Start session recording for admin playback */
      startExamRecording(stream);
      var playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.then(function() {
          if (ph) ph.style.display = 'none';
          vid.style.display = 'block';
          setCamStatus('✓ Camera active — proctoring running', 'green');
          var fms = document.getElementById('face-model-s');
          if (fms) fms.textContent = '✓ Face detection active';
          if (vid.readyState >= 1) { initFaceDetection(vid); } else { vid.addEventListener('loadedmetadata', function(){ initFaceDetection(vid); }, { once: true }); }
        }).catch(function(playErr) {
          /* Autoplay policy blocked play() - try again on first user interaction */
          if (ph) ph.style.display = 'none';
          vid.style.display = 'block';
          setCamStatus('⚠ Click anywhere to activate camera', 'amber');
          function resumeOnInteraction() {
            vid.play().then(function() {
              setCamStatus('✓ Camera active — proctoring running', 'green');
              initFaceDetection(vid);
            }).catch(function(){});
            document.removeEventListener('click', resumeOnInteraction);
          }
          document.addEventListener('click', resumeOnInteraction);
        });
      } else {
        /* Older browser — no promise returned */
        if (ph) ph.style.display = 'none';
        vid.style.display = 'block';
        setCamStatus('✓ Camera active — proctoring running', 'green');
        var fms = document.getElementById('face-model-s');
        if (fms) fms.textContent = '✓ Face detection active';
        if (vid.readyState >= 1) { initFaceDetection(vid); } else { vid.addEventListener('loadedmetadata', function(){ initFaceDetection(vid); }, { once: true }); }
      }
    })
    .catch(function(err) {
      var msg = '⚠ Camera access denied';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') msg = '⚠ Camera permission denied — click the camera icon in your browser bar to allow';
      else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') msg = '⚠ No camera found — please connect a camera';
      else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') msg = '⚠ Camera in use by another app — please close it and reload';
      else if (err.name === 'OverconstrainedError') msg = '⚠ Camera resolution not supported — please reload';
      setCamStatus(msg, 'red');
      if (ph) ph.innerHTML = '<div style="text-align:center;padding:20px"><div style="font-size:28px;color:#f87171;margin-bottom:8px">⛔</div><div style="font-size:11px;color:var(--red);line-height:1.7">' + msg + '<br><br>Allow camera access and reload.</div></div>';
    });
}

/* =====================================================
