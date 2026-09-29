/* =====================================================
   VIOLATIONS & PROCTORING LOGIC
===================================================== */

var toastTimeout = null;

function closeToast() {
  var toast = document.getElementById('viol-toast');
  if (toast) toast.classList.add('hidden');
  if (toastTimeout) { clearTimeout(toastTimeout); toastTimeout = null; }
}

function showViolationAlert(title, msg, critical) {
  var toast = document.getElementById('viol-toast');
  if (!toast) return;
  var vtTitle = document.getElementById('vt-title');
  var vtMsg = document.getElementById('vt-msg');
  var vtCount = document.getElementById('vt-count');

  if (vtTitle) vtTitle.textContent = title;
  if (vtMsg) vtMsg.textContent = msg;
  if (vtCount) vtCount.textContent = 'Violation #' + (typeof violationCount !== 'undefined' ? violationCount : 1) + ' recorded';

  toast.classList.remove('hidden');
  if (toastTimeout) clearTimeout(toastTimeout);
  if (!critical) {
    toastTimeout = setTimeout(closeToast, 7000);
  }
}

function logViolation(type, desc, severity) {
  var photo = captureViolationPhoto();
  var v = { type: type, time: new Date().toLocaleTimeString(), exam: 'Active Exam', severity: severity, desc: desc, photo: photo };
  sessionViolations.push(v);
  if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
    LIVE_SESSIONS[currentStudent.name].violations.push(v);
  }
  /* Update suspicion score based on severity */
  var inc = severity === 'high' ? 20 : 10;
  updateSuspicionScore(inc);
  var vc = document.getElementById('viol-count'); if (vc) { vc.textContent = violationCount; vc.style.animation = 'scoreUp .3s ease'; setTimeout(function(){ if(vc) vc.style.animation=''; }, 300); }

  if (photo && typeof uploadViolationPhotoAsync === 'function') {
    uploadViolationPhotoAsync(v, photo);
  }
}

function captureViolationPhoto() {
  try {
    var vid = document.getElementById('cam-video') || document.getElementById('webcam') || document.querySelector('video');
    if (!vid || !vid.videoWidth) return null;
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
    return canvas.toDataURL('image/jpeg', .85);
  } catch(e) { return null; }
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
