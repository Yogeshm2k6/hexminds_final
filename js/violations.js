   VIOLATION SYSTEM
===================================================== */
function showViolationFlash() {
  var f = document.getElementById('viol-flash');
  if (!f) return;
  f.style.display = 'block';
  setTimeout(function(){ f.style.display = 'none'; }, 400);
}

function showViolationAlert(title, msg, critical) {
  var toast  = document.getElementById('viol-toast');
  var ttitle = document.getElementById('vt-title');
  var tmsg   = document.getElementById('vt-msg');
  var tcount = document.getElementById('vt-count');
  if (!toast) return;
  if (ttitle) ttitle.textContent = title;
  if (tmsg)   tmsg.textContent   = msg;
  if (tcount) tcount.textContent = '⚡ Violations: ' + violationCount + ' / ' + MAX_VIOLATIONS + '  •  Suspicion: ' + suspicionScore + '%  •  Auto-submit at ' + MAX_VIOLATIONS + ' (or instantly on phone / multi-face / no-face)';
  toast.classList.remove('hidden');
  toast.style.animation = 'none';
  setTimeout(function(){ toast.style.animation = 'toastSlide .45s cubic-bezier(.16,1,.3,1)'; }, 10);
  showViolationFlash();
  clearTimeout(toastTimeout);
  if (!critical) toastTimeout = setTimeout(closeToast, 7000);
}

function closeToast() {
  var t = document.getElementById('viol-toast');
  if (t) t.classList.add('hidden');
}

function captureViolationPhoto() {
  var vid = document.getElementById('cam-video');
  if (!vid) return null;
  if (vid.tagName === 'VIDEO' && vid.readyState < 2) return null;
  if (vid.tagName === 'IMG' && (!vid.complete || !vid.naturalWidth)) return null;
  if (vid.style.display === 'none') return null;
  try {
    var canvas = document.createElement('canvas');
    canvas.width  = vid.naturalWidth  || vid.videoWidth  || 320;
    canvas.height = vid.naturalHeight || vid.videoHeight || 240;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(239,68,68,0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, canvas.height - 22, canvas.width, 22);
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('⚠ VIOLATION ' + new Date().toLocaleTimeString(), 6, canvas.height - 7);
    return canvas.toDataURL('image/jpeg', .75);
  } catch(e) { return null; }
}

function logViolation(type, desc, severity) {
  var photo = captureViolationPhoto();
  var v = { type: type, time: new Date().toLocaleTimeString(), exam: 'CS101', severity: severity, desc: desc, photo: photo };
  sessionViolations.push(v);
  if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
    LIVE_SESSIONS[currentStudent.name].violations.push(v);
    try { localStorage.setItem('hm_violations_' + currentStudent.name, JSON.stringify(LIVE_SESSIONS[currentStudent.name].violations)); } catch(e){}
  }
  /* Update suspicion score based on severity */
  var inc = severity === 'high' ? 20 : 10;
  updateSuspicionScore(inc);
  var vc = document.getElementById('viol-count'); if (vc) { vc.textContent = violationCount; vc.style.animation = 'scoreUp .3s ease'; setTimeout(function(){ if(vc) vc.style.animation=''; }, 300); }
}

function escalateProctorBar(label) {
  var pb = document.getElementById('proctor-bar');
  if (pb) {
    pb.classList.add('escalated');
    pb.innerHTML = '<span style="width:10px;height:10px;border-radius:50%;background:#ef4444;animation:blink .5s infinite;display:inline-block;box-shadow:0 0 8px var(--red)"></span>' +
      '&nbsp;🚨 VIOLATION: ' + label + ' — ' + violationCount + ' violation(s) logged';
    setTimeout(function(){ if(pb){ pb.classList.remove('escalated'); pb.innerHTML = '<span style="width:9px;height:9px;border-radius:50%;background:#ef4444;animation:blink 1.2s infinite;display:inline-block;box-shadow:0 0 6px var(--red)"></span>&nbsp;Proctoring active — do NOT switch tabs or open other apps'; } }, 3000);
  }
}

function setCamStatus(msg, color) {
  var cs = document.getElementById('cam-status');
  if (cs) {
    cs.textContent = msg;
    cs.style.color = color === 'green' ? 'var(--green)' : color === 'red' ? 'var(--red)' : 'var(--amber)';
  }
}

/* =====================================================
