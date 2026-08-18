/* =====================================================
   EXAM TIMER & SUBMISSION
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
    if (typeof firebaseSyncSessions === 'function') firebaseSyncSessions();
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
      '</div>' +
      '<button class="btn-primary" style="padding:12px 32px;font-size:14px" onclick="renderSDash()">← Back to Dashboard</button>' +
    '</div>';
}
