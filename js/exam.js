   EXAM TIMER
===================================================== */
function startTimer() {
  clearInterval(examTimer);
  examTimer = setInterval(function() {
    if (!examActive) { clearInterval(examTimer); return; }
    examTimeLeft--;
    var m = Math.floor(examTimeLeft / 60);
    var s = examTimeLeft % 60;
    var td = document.getElementById('exam-timer');
    if (td) {
      td.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
      td.className = 'timer-display' + (examTimeLeft < 300 ? ' timer-danger' : examTimeLeft < 600 ? ' timer-warn' : '');
    }
    if (examTimeLeft <= 0) { clearInterval(examTimer); submitExam(true); }
  }, 1000);
}

function pickAns(qId, j) {
  examAnswers[qId] = j;
  var q = QUESTIONS.find(function(x){ return x.id === qId; });
  if (q) {
    q.opts.forEach(function(_, k){
      var el = document.getElementById('opt-' + qId + '-' + k);
      if (el) { el.classList.toggle('sel', k === j); el.querySelector('.q-radio-in').style.display = k===j?'block':'none'; }
    });
  }
  var nav = document.getElementById('nav-' + qId);
  if (nav) nav.classList.add('answered');
  var count = Object.keys(examAnswers).length;
  var ac = document.getElementById('ans-count'); if (ac) ac.textContent = count;
  var ab = document.getElementById('ans-bar'); if (ab) ab.style.width = (count / QUESTIONS.length * 100) + '%';
}

function scrollToQ(i) {
  var blocks = document.querySelectorAll('.q-block');
  if (blocks[i]) blocks[i].scrollIntoView({ behavior:'smooth', block:'center' });
}

/* =====================================================
   SUBMIT EXAM
===================================================== */
function submitExam(autoSubmit) {
  clearInterval(examTimer);
  stopCam();
  stopExamMonitoring();
  stopWaveform();
  examActive = false;
  closeToast();

  var correct = 0;
  QUESTIONS.forEach(function(q){ if (examAnswers[q.id] === q.ans) correct++; });
  var pct   = Math.round(correct / QUESTIONS.length * 100);
  var grade = pct >= 90 ? 'A' : pct >= 80 ? 'B+' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : 'F';

  if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
    var ls = LIVE_SESSIONS[currentStudent.name];
    ls.status = 'online'; ls.score = pct; ls.grade = grade;
    ls.examSubmitted = true; ls.submitTime = new Date().toLocaleTimeString();
    ls.autoSubmitted = autoSubmit;
    try { localStorage.setItem('hm_sessions', JSON.stringify(LIVE_SESSIONS)); } catch(e){}
  }

  var scoreColor = pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
  document.getElementById('s-content').innerHTML =
    '<div style="max-width:580px;margin:0 auto;text-align:center;padding:34px 0" class="page-enter">' +
      '<div style="font-size:64px;margin-bottom:16px;animation:hexFloat 2s ease infinite">' + (autoSubmit ? '⛔' : pct >= 70 ? '✅' : '⚠️') + '</div>' +
      '<div class="page-title" style="font-size:22px;margin-bottom:6px">' + (autoSubmit ? 'Exam Auto-Submitted' : 'Exam Submitted!') + '</div>' +
      (autoSubmit
        ? '<div style="font-size:13px;color:var(--red);margin:8px 0 28px;font-weight:700;background:rgba(239,68,68,0.1);padding:12px 18px;border-radius:12px;border:1px solid rgba(239,68,68,0.3)">Auto-submitted due to ' + (phoneDetected ? '📵 phone detected' : violationCount + ' proctoring violations') + '</div>'
        : '<div style="font-size:13px;color:var(--text3);margin:6px 0 28px">Answers recorded and submitted successfully.</div>') +
      '<div class="card" style="text-align:left;margin-bottom:22px">' +
        '<div style="text-align:center;padding:24px 0 20px">' +
          '<div style="font-size:11px;color:var(--text3);margin-bottom:8px;text-transform:uppercase;font-weight:700;letter-spacing:.7px">Your Score</div>' +
          '<div style="font-size:64px;font-weight:800;letter-spacing:-3px;color:' + scoreColor + ';font-family:\'JetBrains Mono\',monospace;text-shadow:0 0 30px currentColor;animation:scoreUp .5s ease">' + pct + '%</div>' +
          '<div style="font-size:14px;color:var(--text2);margin-top:6px">' + correct + ' / ' + QUESTIONS.length + ' correct &nbsp;·&nbsp; Grade: <strong style="color:var(--cyan)">' + grade + '</strong></div>' +
        '</div>' +
        '<div class="divider"></div>' +
        '<div style="display:flex;align-items:center;justify-content:center;gap:20px;padding:12px 0">' +
          buildSuspicionGauge(suspicionScore) +
          '<div><div style="font-size:12px;font-weight:700;color:var(--text2)">Final Suspicion</div><div style="font-size:11px;color:var(--text3);margin-top:3px">Based on ' + sessionViolations.length + ' violation(s)</div></div>' +
        '</div>' +
        (sessionViolations.length > 0
          ? '<div class="divider"></div><div style="padding:4px 0 10px"><div style="font-size:12px;font-weight:700;color:var(--red);margin-bottom:8px">⚠ Violations Recorded (' + sessionViolations.length + ')</div>' +
            sessionViolations.map(function(v){ return '<div style="font-size:11px;color:var(--text2);padding:6px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between"><span>⚠ ' + v.type + '</span><span style="color:var(--text3);font-family:\'JetBrains Mono\',monospace;font-size:10px">' + v.time + '</span></div>'; }).join('') + '</div>'
          : '<div class="divider"></div><div style="text-align:center;padding:10px;color:var(--green);font-weight:700">✅ No violations recorded — clean exam!</div>') +
        '<div class="divider"></div>' +
        QUESTIONS.map(function(q, i){
          var userAns = examAnswers[q.id];
          return '<div style="padding:14px 0;border-bottom:1px solid var(--border)">' +
            '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px">Q' + (i+1) + '. ' + q.q + '</div>' +
            q.opts.map(function(opt, j){
              var cls = '';
              if (j === q.ans) cls = 'correct';
              else if (userAns === j) cls = 'wrong';
              return '<div class="q-opt ' + cls + '" style="cursor:default;margin-bottom:6px">' +
                '<div class="q-radio"><div class="q-radio-in" style="' + (j===q.ans||userAns===j?'display:block':'') + '"></div></div>' +
                opt +
                (j === q.ans ? ' <span style="margin-left:auto;font-size:11px;font-weight:700;color:var(--green)">✓ Correct</span>' : '') +
                (userAns === j && j !== q.ans ? ' <span style="margin-left:auto;font-size:11px;font-weight:700;color:var(--red)">Your answer</span>' : '') +
              '</div>';
            }).join('') +
          '</div>';
        }).join('') +
      '</div>' +
      '<button class="btn-primary" style="padding:12px 32px;font-size:14px" onclick="renderSDash()">← Back to Dashboard</button>' +
    '</div>';
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
