/* =====================================================
   ROLE / LOGIN
===================================================== */
function setRole(r) {
  role = r;
  document.getElementById('tab-student').classList.toggle('active', r === 'student');
  document.getElementById('tab-admin').classList.toggle('active', r === 'admin');
  document.getElementById('student-fields').classList.toggle('hidden', r !== 'student');
  document.getElementById('admin-fields').classList.toggle('hidden', r !== 'admin');
  document.getElementById('login-err').classList.add('hidden');
}

function setStudentTab(tab) {
  var isReg = tab === 'register';
  document.getElementById('stab-register').classList.toggle('active', isReg);
  document.getElementById('stab-login').classList.toggle('active', !isReg);
  document.getElementById('student-register-panel').classList.toggle('hidden', !isReg);
  document.getElementById('student-login-panel').classList.toggle('hidden', isReg);
  /* Clear errors */
  var re = document.getElementById('reg-err'); if(re) re.classList.add('hidden');
  var le = document.getElementById('login-stu-err'); if(le) le.classList.add('hidden');
}

function showStudentLoginErr(msg) {
  var el = document.getElementById('login-stu-err');
  if (!el) return;
  el.textContent = '⚠ ' + msg;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  setTimeout(function(){ el.style.animation = 'shake .35s ease'; }, 10);
}

function showRegisterErr(msg) {
  var el = document.getElementById('reg-err');
  if (!el) return;
  el.textContent = '⚠ ' + msg;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  setTimeout(function(){ el.style.animation = 'shake .35s ease'; }, 10);
}

function studentRegister() {
  var name    = (document.getElementById('r-name')||{}).value||'';
  var dob     = (document.getElementById('r-dob')||{}).value||'';
  var college = (document.getElementById('r-college')||{}).value||'';
  name = name.trim(); college = college.trim();
  if (!name)    { showRegisterErr('Please enter your full name.'); return; }
  if (!dob)     { showRegisterErr('Please enter your date of birth.'); return; }
  if (!college) { showRegisterErr('Please enter your college/institution.'); return; }

  var faceKey = name.toLowerCase() + '|' + dob;
  if (registeredFaceData[faceKey]) {
    showRegisterErr('An account with this name and date of birth already exists. Please use Login instead.');
    return;
  }

  fvPendingStudent = {
    name: name, dob: dob, college: college,
    initials: name.split(' ').map(function(n){ return n[0]; }).join('').toUpperCase().slice(0,2)
  };
  fvMode = 'signup';
  openFaceVerify('signup');
}

function studentLogin() {
  var name = (document.getElementById('s-name')||{}).value||'';
  var dob  = (document.getElementById('s-dob')||{}).value||'';
  name = name.trim();
  if (!name) { showStudentLoginErr('Please enter your registered name.'); return; }
  if (!dob)  { showStudentLoginErr('Please enter your date of birth.'); return; }

  var faceKey = name.toLowerCase() + '|' + dob;
  if (!registeredFaceData[faceKey]) {
    showStudentLoginErr('No account found for this name and date of birth. Please register first.');
    return;
  }

  /* Look up college from stored registration */
  var college = registeredFaceData[faceKey].college || '';
  fvPendingStudent = {
    name: name, dob: dob, college: college,
    initials: name.split(' ').map(function(n){ return n[0]; }).join('').toUpperCase().slice(0,2)
  };
  fvMode = 'login';
  openFaceVerify('login');
}

/* =====================================================
   FACE VERIFICATION SYSTEM
===================================================== */
function openFaceVerify(mode) {
  var overlay = document.getElementById('face-verify-overlay');
  var title   = document.getElementById('fv-title');
  var stepLbl = document.getElementById('fv-step-label');
  var btn     = document.getElementById('fv-action-btn');
  var errDiv  = document.getElementById('fv-error');
  var bar     = document.getElementById('fv-bar');
  var ring    = document.getElementById('fv-cam-ring');
  var icon    = document.getElementById('fv-overlay-icon');
  var status  = document.getElementById('fv-status');

  /* Stop any existing stream before opening a new one */
  fvCloseCam();

  /* Reset any leftover captured image from a previous session */
  var oldCapture = ring.querySelector('img.fv-capture');
  if (oldCapture) oldCapture.remove();

  overlay.classList.remove('hidden');
  errDiv.style.display = 'none';
  bar.style.width = '0%';
  ring.className = 'fv-cam-ring';
  icon.style.display = 'flex';
  icon.style.fontSize = '52px';
  btn.disabled = true;
  btn.textContent = 'Please wait…';
  status.textContent = 'Initializing camera…';
  status.style.color = '';

  if (mode === 'signup') {
    title.textContent   = 'Register Your Face';
    stepLbl.textContent = 'Step 2 of 2 — Face Enrollment';
    icon.textContent    = '📸';
  } else {
    title.textContent   = 'Verify Your Identity';
    stepLbl.textContent = 'Step 2 of 2 — Biometric Check';
    icon.textContent    = '👤';
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    fvShowError('Camera not supported. Please use Chrome or Edge.');
    return;
  }

  navigator.mediaDevices.getUserMedia({ video: { width:320, height:240, facingMode:'user' }, audio: false })
    .then(function(stream) {
      fvStream = stream;
      var vid = document.getElementById('fv-video');
      /* Reset video element state cleanly */
      vid.srcObject = null;
      vid.srcObject = stream;
      vid.style.display = 'block';
      icon.style.display = 'none';
      ring.classList.add('scanning');
      status.textContent = mode === 'signup'
        ? 'Position your face in the circle, then click Capture'
        : 'Look at the camera to verify your identity';

      var playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.catch(function(playErr) {
          /* Autoplay blocked — still show feed, user interaction will unblock */
          console.warn('Camera play() blocked:', playErr.message);
        });
      }

      var pct = 0;
      var pInterval = setInterval(function() {
        pct = Math.min(pct + 4, 100);
        bar.style.width = pct + '%';
        if (pct >= 100) {
          clearInterval(pInterval);
          btn.disabled = false;
          /* Keep ring in scanning state — do NOT remove it here */
          btn.textContent = mode === 'signup' ? '📸 Capture & Register Face' : '✔ Verify Identity';
        }
      }, 80);
    })
    .catch(function(err) {
      var msg = 'Camera access denied. Please allow camera access and try again.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Click the camera icon in your browser address bar to allow access, then retry.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera found. Please connect a camera and try again.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is in use by another application. Please close other apps using the camera, then retry.';
      } else if (err.name === 'OverconstrainedError') {
        msg = 'Camera resolution not supported. Trying with default settings…';
        /* Retry without constraints */
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          .then(function(stream) { openFaceVerify._retryStream(stream, mode, ring, icon, status, btn, bar); })
          .catch(function() { fvShowError('Camera not accessible. Please check your device settings.'); });
        return;
      }
      fvShowError(msg);
    });
}

/* Retry helper for overconstrained camera */
openFaceVerify._retryStream = function(stream, mode, ring, icon, status, btn, bar) {
  fvStream = stream;
  var vid = document.getElementById('fv-video');
  vid.srcObject = stream;
  vid.style.display = 'block';
  icon.style.display = 'none';
  ring.classList.add('scanning');
  status.textContent = mode === 'signup'
    ? 'Position your face in the circle, then click Capture'
    : 'Look at the camera to verify your identity';
  var p = vid.play(); if (p) p.catch(function(){});
  var pct = 0;
  var pi = setInterval(function() {
    pct = Math.min(pct + 4, 100); bar.style.width = pct + '%';
    if (pct >= 100) { clearInterval(pi); btn.disabled = false; btn.textContent = mode === 'signup' ? '📸 Capture & Register Face' : '✔ Verify Identity'; }
  }, 80);
};

function fvAction() {
  if (fvMode === 'signup') fvCaptureFace();
  else fvVerifyFace();
}

function fvCaptureFace() {
  var vid = document.getElementById('fv-video');
  if (!vid || vid.readyState < 2) { fvShowError('Camera not ready. Please wait a moment and try again.'); return; }
  if (!vid.videoWidth || !vid.videoHeight) { fvShowError('Camera stream not yet delivering frames. Please wait and retry.'); return; }

  /* High-res canvas for profile photo */
  var profileCanvas = document.createElement('canvas');
  profileCanvas.width = 320; profileCanvas.height = 240;
  var pctx = profileCanvas.getContext('2d');
  pctx.drawImage(vid, 0, 0, 320, 240);
  var profileDataUrl = profileCanvas.toDataURL('image/jpeg', .9);

  /* Lower-res canvas for face descriptor */
  var canvas = document.createElement('canvas');
  canvas.width = 160; canvas.height = 120;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(vid, 0, 0, 160, 120);
  var imgData = ctx.getImageData(0, 0, 160, 120);

  if (!hasPresence(imgData.data)) {
    fvShowError('No face detected. Please position your face clearly in the circle and ensure good lighting.');
    return;
  }

  var desc = computeDescriptor(imgData.data, 160, 120);
  var faceKey = fvPendingStudent.name.toLowerCase() + '|' + fvPendingStudent.dob;
  var photoDataUrl = profileDataUrl;
  registeredFaceData[faceKey] = { snapshot: photoDataUrl, desc: desc, college: fvPendingStudent.college };
  studentProfilePhoto = photoDataUrl; /* Store as profile photo */

  /* Show captured image */
  var captureImg = document.createElement('img');
  captureImg.className = 'fv-capture';
  captureImg.src = photoDataUrl;
  var vid2 = document.getElementById('fv-video');
  if (vid2 && vid2.parentNode) vid2.parentNode.insertBefore(captureImg, vid2.nextSibling);
  if (vid2) vid2.style.display = 'none';

  var ring = document.getElementById('fv-cam-ring');
  ring.classList.add('success');
  var status = document.getElementById('fv-status');
  status.textContent = '✓ Face registered successfully! Entering portal…';
  status.style.color = '#4ade80';
  document.getElementById('fv-bar').style.width = '100%';

  fvCloseCam();
  setTimeout(completeStudentLoginV2, 1000);
}

function fvVerifyFace() {
  var vid = document.getElementById('fv-video');
  if (!vid || vid.readyState < 2) { fvShowError('Camera not ready. Please wait and try again.'); return; }
  if (!vid.videoWidth || !vid.videoHeight) { fvShowError('Camera stream not delivering frames yet. Please wait and retry.'); return; }
  var canvas = document.createElement('canvas');
  canvas.width = 160; canvas.height = 120;
  var ctx = canvas.getContext('2d');
  ctx.drawImage(vid, 0, 0, 160, 120);
  var imgData = ctx.getImageData(0, 0, 160, 120);

  if (!hasPresence(imgData.data)) {
    fvShowError('No face detected. Please look directly at the camera.');
    return;
  }

  var faceKey = fvPendingStudent.name.toLowerCase() + '|' + fvPendingStudent.dob;
  var stored = registeredFaceData[faceKey];
  if (!stored) {
    fvShowError('No registered face found. Please sign up first.');
    return;
  }

  var liveDesc = computeDescriptor(imgData.data, 160, 120);
  var sim = computeSimilarity(liveDesc, stored.desc);
  var ring = document.getElementById('fv-cam-ring');
  var status = document.getElementById('fv-status');
  var bar = document.getElementById('fv-bar');

  if (sim > 0.82) {
    ring.classList.add('success');
    status.textContent = '✓ Identity verified! Welcome back!';
    status.style.color = '#4ade80';
    bar.style.width = '100%';
    fvCloseCam();
    setTimeout(completeStudentLoginV2, 900);
  } else {
    ring.classList.add('fail');
    fvShowError('Identity mismatch. Face not recognized. Please try again or contact admin.');
  }
}

function fvCloseCam() {
  if (fvStream) { fvStream.getTracks().forEach(function(t){ t.stop(); }); fvStream = null; }
}

function fvCancel() {
  fvCloseCam();
  var vid = document.getElementById('fv-video');
  if (vid) { vid.style.display = 'none'; vid.srcObject = null; }
  var ring = document.getElementById('fv-cam-ring');
  if (ring) ring.className = 'fv-cam-ring';
  var oldCapture = ring ? ring.querySelector('img.fv-capture') : null;
  if (oldCapture) oldCapture.remove();
  document.getElementById('face-verify-overlay').classList.add('hidden');
}

function fvShowError(msg) {
  var err = document.getElementById('fv-error');
  err.style.display = 'block';
  err.textContent = msg;
  err.style.animation = 'none';
  setTimeout(function(){ err.style.animation = 'shake .35s ease'; }, 10);
  var ring = document.getElementById('fv-cam-ring');
  ring.classList.remove('scanning'); ring.classList.add('fail');
  var btn = document.getElementById('fv-action-btn');
  btn.disabled = false;
  btn.textContent = '↺ Retry';
}

function computeDescriptor(imgData, w, h) {
  var cells = 8, desc = [];
  var cw = Math.floor(w / cells), ch = Math.floor(h / cells);
  for (var cy = 0; cy < cells; cy++) {
    for (var cx = 0; cx < cells; cx++) {
      var sum = 0, cnt = 0;
      for (var py = cy * ch; py < (cy + 1) * ch; py++) {
        for (var px = cx * cw; px < (cx + 1) * cw; px++) {
          var idx = (py * w + px) * 4;
          sum += imgData[idx] * .299 + imgData[idx+1] * .587 + imgData[idx+2] * .114;
          cnt++;
        }
      }
      desc.push(sum / cnt);
    }
  }
  return desc;
}

function computeSimilarity(a, b) {
  if (a.length !== b.length) return 0;
  var dot = 0, na = 0, nb = 0;
  for (var i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function hasPresence(imgData) {
  var brightness = 0, total = imgData.length / 4;
  for (var i = 0; i < imgData.length; i += 4) {
    brightness += imgData[i] * .299 + imgData[i+1] * .587 + imgData[i+2] * .114;
  }
  brightness /= total;
  var variance = 0;
  for (var i = 0; i < imgData.length; i += 4) {
    var lum = imgData[i] * .299 + imgData[i+1] * .587 + imgData[i+2] * .114;
    variance += (lum - brightness) * (lum - brightness);
  }
  variance /= total;
  return variance > 40;
}

function completeStudentLogin() {
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

function adminLogin() {
  var u = document.getElementById('a-user').value.trim();
  var p = document.getElementById('a-pass').value;
  if (u === 'hexaminds' && p === 'hexaminds123') {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('admin-app').classList.remove('hidden');
    renderADash();
  } else {
    var err = document.getElementById('login-err');
    err.classList.remove('hidden');
    err.style.animation = 'none';
    setTimeout(function(){ err.style.animation = 'shake .35s ease'; }, 10);
  }
}

function logout() {
  stopExamMonitoring();
  stopCam();
  fvCloseCam();
  stopWaveform();
  clearInterval(examTimer);
  clearInterval(autoSubmitCountdown);
  var banner = document.getElementById('auto-submit-banner');
  if (banner) banner.classList.remove('visible');
  examActive = false;
  suspicionScore = 0;
  closeToast();

  if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
    LIVE_SESSIONS[currentStudent.name].status = 'offline';
  }
  currentStudent = {};

  document.getElementById('login-page').classList.remove('hidden');
  ['student-app','admin-app','face-verify-overlay'].forEach(function(id){ document.getElementById(id).classList.add('hidden'); });
  /* Clear all student form fields */
  ['s-name','s-dob','r-name','r-dob','r-college','a-user','a-pass'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('login-err').classList.add('hidden');
  var lse = document.getElementById('login-stu-err'); if(lse) lse.classList.add('hidden');
  var re = document.getElementById('reg-err'); if(re) re.classList.add('hidden');
  setRole('student');
  setStudentTab('register');
  examAnswers = {};
  sessionViolations = [];
  violationCount = 0;
  fvPendingStudent = null; fvMode = null;
  autoSubmitSecondsLeft = 0;
  studentProfilePhoto = null;
  noFaceWarningCount = 0;
  multipleFacesAutoSubmitted = false;
  lastFaceState = 'normal';
  noFaceConsecutive = 0;
}

/* =====================================================
