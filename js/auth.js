/* =====================================================
   ROLE / LOGIN
===================================================== */
function setRole(r) {
  role = r;
  var ts = document.getElementById('tab-student'); if (ts) ts.classList.toggle('active', r === 'student');
  var tf = document.getElementById('tab-staff');   if (tf) tf.classList.toggle('active', r === 'staff');
  var ta = document.getElementById('tab-admin');   if (ta) ta.classList.toggle('active', r === 'admin');

  var sf = document.getElementById('student-fields'); if (sf) sf.classList.toggle('hidden', r !== 'student');
  var stf = document.getElementById('staff-fields');   if (stf) stf.classList.toggle('hidden', r !== 'staff');
  var af = document.getElementById('admin-fields');   if (af) af.classList.toggle('hidden', r !== 'admin');

  var le = document.getElementById('login-err'); if (le) le.classList.add('hidden');
}

function setStudentTab(tab) {
  var isReg = tab === 'register';
  var sr = document.getElementById('stab-register'); if (sr) sr.classList.toggle('active', isReg);
  var sl = document.getElementById('stab-login');    if (sl) sl.classList.toggle('active', !isReg);
  var srp = document.getElementById('student-register-panel'); if (srp) srp.classList.toggle('hidden', !isReg);
  var slp = document.getElementById('student-login-panel');    if (slp) slp.classList.toggle('hidden', isReg);
  var re = document.getElementById('reg-err'); if (re) re.classList.add('hidden');
  var le = document.getElementById('login-stu-err'); if (le) le.classList.add('hidden');
}

function setStaffTab(tab) {
  var isLogin = tab === 'login';
  var tl = document.getElementById('staff-tab-login'); if (tl) tl.classList.toggle('active', isLogin);
  var tr = document.getElementById('staff-tab-register'); if (tr) tr.classList.toggle('active', !isLogin);
  var slp = document.getElementById('staff-login-panel'); if (slp) slp.classList.toggle('hidden', !isLogin);
  var srp = document.getElementById('staff-register-panel'); if (srp) srp.classList.toggle('hidden', isLogin);
  var sle = document.getElementById('staff-login-err'); if (sle) sle.classList.add('hidden');
  var sre = document.getElementById('staff-reg-err'); if (sre) sre.classList.add('hidden');
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

function showStaffLoginErr(msg) {
  var el = document.getElementById('staff-login-err');
  if (!el) return;
  el.textContent = '⚠ ' + msg;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  setTimeout(function(){ el.style.animation = 'shake .35s ease'; }, 10);
}

function showStaffRegErr(msg) {
  var el = document.getElementById('staff-reg-err');
  if (!el) return;
  el.textContent = '⚠ ' + msg;
  el.classList.remove('hidden');
  el.style.animation = 'none';
  setTimeout(function(){ el.style.animation = 'shake .35s ease'; }, 10);
}

function studentRegister() {
  var name    = (document.getElementById('r-name')||{}).value||'';
  var roll    = (document.getElementById('r-roll')||{}).value||'';
  var dob     = (document.getElementById('r-dob')||{}).value||'';
  var college = (document.getElementById('r-college')||{}).value||'';
  var dept    = (document.getElementById('r-dept')||{}).value||'Computer Science & Engineering';
  var year    = (document.getElementById('r-year')||{}).value||'3rd Year';
  name = name.trim(); college = college.trim(); roll = roll.trim();
  if (!name)    { showRegisterErr('Please enter your full name.'); return; }
  if (!dob)     { showRegisterErr('Please enter your date of birth.'); return; }
  if (!college) { showRegisterErr('Please enter your college/institution.'); return; }

  var faceKey = name.toLowerCase() + '|' + dob;
  if (registeredFaceData[faceKey]) {
    showRegisterErr('An account with this name and date of birth already exists. Please use Login instead.');
    return;
  }

  /* Assign clean Student ID */
  var assignedId = roll || ('HM-STU-' + (1001 + Object.keys(registeredFaceData).length));

  fvPendingStudent = {
    id: assignedId,
    studentId: assignedId,
    name: name,
    dob: dob,
    college: college,
    dept: dept,
    department: dept,
    year: year,
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
  var stored = registeredFaceData[faceKey];

  /* Fallback: search registeredFaceData case-insensitively or by name */
  if (!stored) {
    for (var k in registeredFaceData) {
      var r = registeredFaceData[k];
      if (r && r.name && r.name.toLowerCase() === name.toLowerCase() && (!dob || !r.dob || r.dob === dob)) {
        stored = r;
        faceKey = k;
        break;
      }
    }
  }

  /* Fallback: look up in STUDENTS registry (from Firestore / storage) */
  if (!stored && window.STUDENTS && window.STUDENTS.length) {
    var matchStu = STUDENTS.find(function(s){
      return (s.name && s.name.toLowerCase() === name.toLowerCase()) && (!dob || !s.dob || s.dob === dob);
    });
    if (matchStu) {
      stored = {
        name: matchStu.name,
        dob: matchStu.dob || dob,
        college: matchStu.college || '',
        studentId: matchStu.studentId || matchStu.id || ('HM-STU-' + (1001 + STUDENTS.length)),
        snapshot: matchStu.profilePhoto || matchStu.profilePhotoUrl || null,
        desc: matchStu.desc || null
      };
      registeredFaceData[faceKey] = stored;
      try { localStorage.setItem('hm_registered_faces', JSON.stringify(registeredFaceData)); } catch(e){}
    }
  }

  if (!stored) {
    showStudentLoginErr('No account found for this name and date of birth. Please register first.');
    return;
  }

  /* Look up student details from stored registration */
  var college = stored.college || '';
  var studentId = stored.studentId || ('HM-STU-' + (1001 + Math.abs(name.split('').reduce(function(a,b){ return a + b.charCodeAt(0); }, 0)) % 9000));
  stored.studentId = studentId;

  fvPendingStudent = {
    id: studentId,
    studentId: studentId,
    name: name,
    dob: dob,
    college: college,
    desc: stored.desc || null,
    profilePhoto: stored.snapshot || null,
    initials: name.split(' ').map(function(n){ return n[0]; }).join('').toUpperCase().slice(0,2)
  };
  fvMode = 'login';
  openFaceVerify('login');
}

/* =====================================================
   STAFF AUTHENTICATION
===================================================== */
function staffLogin() {
  var u = (document.getElementById('staff-user')||{}).value||'';
  var p = (document.getElementById('staff-pass')||{}).value||'';
  u = u.trim(); p = p.trim();
  if (!u || !p) { showStaffLoginErr('Please enter both username and password.'); return; }

  var staff = staffAccounts.find(function(s){
    return (s.username.toLowerCase() === u.toLowerCase() || (s.email && s.email.toLowerCase() === u.toLowerCase())) && s.password === p;
  });

  if (staff) {
    currentStaff = staff;
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('staff-app').classList.remove('hidden');
    var navInfo = document.getElementById('staff-nav-info');
    if (navInfo) navInfo.textContent = staff.name + ' (' + (staff.dept || 'Faculty') + ')';
    var av = document.getElementById('staff-avatar');
    if (av) av.textContent = staff.name.split(' ').map(function(n){ return n[0]; }).join('').slice(0,2).toUpperCase();
    staffNav('sdash', document.getElementById('si-staff-dash'));
  } else {
    showStaffLoginErr('Invalid staff username or password. (Default: staff / staff123)');
  }
}

function staffRegister() {
  var name = (document.getElementById('staff-reg-name')||{}).value||'';
  var dept = (document.getElementById('staff-reg-dept')||{}).value||'';
  var user = (document.getElementById('staff-reg-user')||{}).value||'';
  var pass = (document.getElementById('staff-reg-pass')||{}).value||'';
  name = name.trim(); dept = dept.trim(); user = user.trim(); pass = pass.trim();

  if (!name) { showStaffRegErr('Please enter staff full name.'); return; }
  if (!dept) { showStaffRegErr('Please enter department / subject.'); return; }
  if (!user) { showStaffRegErr('Please choose a username.'); return; }
  if (!pass || pass.length < 4) { showStaffRegErr('Password must be at least 4 characters.'); return; }

  var exists = staffAccounts.some(function(s){ return s.username.toLowerCase() === user.toLowerCase(); });
  if (exists) { showStaffRegErr('Username already taken. Please choose another.'); return; }

  var newStaff = {
    id: 'STF-' + (100 + staffAccounts.length + 1),
    name: name,
    dept: dept,
    username: user,
    password: pass,
    email: user + '@hexaminds.edu'
  };
  staffAccounts.push(newStaff);
  try { localStorage.setItem('hm_staff_accounts', JSON.stringify(staffAccounts)); } catch(e){}

  currentStaff = newStaff;
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('staff-app').classList.remove('hidden');
  var navInfo = document.getElementById('staff-nav-info');
  if (navInfo) navInfo.textContent = newStaff.name + ' (' + (newStaff.dept || 'Faculty') + ')';
  var av = document.getElementById('staff-avatar');
  if (av) av.textContent = newStaff.name.split(' ').map(function(n){ return n[0]; }).join('').slice(0,2).toUpperCase();
  staffNav('sdash', document.getElementById('si-staff-dash'));
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
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          .then(function(stream) { openFaceVerify._retryStream(stream, mode, ring, icon, status, btn, bar); })
          .catch(function() { fvShowError('Camera not accessible. Please check your device settings.'); });
        return;
      }
      fvShowError(msg);
    });
}

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
  var studentId = fvPendingStudent.studentId || fvPendingStudent.id || ('HM-STU-' + (1001 + Object.keys(registeredFaceData).length));
  
  registeredFaceData[faceKey] = {
    snapshot: photoDataUrl,
    desc: desc,
    college: fvPendingStudent.college,
    name: fvPendingStudent.name,
    dob: fvPendingStudent.dob,
    studentId: studentId
  };
  
  fvPendingStudent.studentId = studentId;
  fvPendingStudent.id = studentId;
  fvPendingStudent.desc = desc;
  fvPendingStudent.profilePhoto = photoDataUrl;
  studentProfilePhoto = photoDataUrl;

  try { localStorage.setItem('hm_registered_faces', JSON.stringify(registeredFaceData)); } catch(e){}
  if (typeof firebaseSyncFaces === 'function') firebaseSyncFaces();
  if (typeof firebaseSaveFace === 'function') firebaseSaveFace(faceKey, registeredFaceData[faceKey]);
  if (typeof uploadFacePhotoAsync === 'function') uploadFacePhotoAsync(faceKey, photoDataUrl);

  /* Sync to InsightFace + ArcFace Backend Service */
  try {
    fetch('http://127.0.0.1:5000/api/biometrics/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        name: fvPendingStudent.name,
        image: photoDataUrl
      })
    }).then(function(r){ return r.json(); }).then(function(res){
      if (res && res.success) console.log('✓ ArcFace Biometrics Registered:', studentId);
      else if (res && res.status === 'SPOOF') console.warn('⚠ Anti-Spoofing flagged enrollment:', res.error);
    }).catch(function(){ console.log('ArcFace backend offline, using client fallback'); });
  } catch(e) {}

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

  var ring = document.getElementById('fv-cam-ring');
  var status = document.getElementById('fv-status');
  var bar = document.getElementById('fv-bar');
  var faceKey = fvPendingStudent.name.toLowerCase() + '|' + fvPendingStudent.dob;
  var stored = registeredFaceData[faceKey];

  // Capture high-res frame for ArcFace + Anti-Spoofing
  var hqCanvas = document.createElement('canvas');
  hqCanvas.width = vid.videoWidth || 640;
  hqCanvas.height = vid.videoHeight || 480;
  var hqCtx = hqCanvas.getContext('2d');
  hqCtx.drawImage(vid, 0, 0, hqCanvas.width, hqCanvas.height);
  var livePhotoUrl = hqCanvas.toDataURL('image/jpeg', 0.85);

  var studentId = fvPendingStudent.id || fvPendingStudent.name.toLowerCase().replace(/\s+/g, '_');

  function doLocalFallbackVerify() {
    var canvas = document.createElement('canvas');
    canvas.width = 160; canvas.height = 120;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(vid, 0, 0, 160, 120);
    var imgData = ctx.getImageData(0, 0, 160, 120);

    if (!hasPresence(imgData.data)) {
      fvShowError('No face detected. Please look directly at the camera.');
      return;
    }

    if (!stored) {
      fvShowError('No registered face found. Please sign up first.');
      return;
    }

    var liveDesc = computeDescriptor(imgData.data, 160, 120);
    var sim = computeSimilarity(liveDesc, stored.desc);

    if (sim > 0.82) {
      fvPendingStudent.desc = stored.desc;
      fvPendingStudent.profilePhoto = stored.snapshot;
      studentProfilePhoto = stored.snapshot;
      ring.classList.add('success');
      status.textContent = '✓ Identity verified! Welcome back!';
      status.style.color = '#4ade80';
      bar.style.width = '100%';
      fvCloseCam();
      setTimeout(completeStudentLoginV2, 900);
    } else {
      ring.classList.add('fail');
      fvShowError('Identity mismatch (' + Math.round(sim * 100) + '% match). Face does not match registered profile photo. Please try again.');
    }
  }

  // Attempt ArcFace + Liveness verification via backend
  var regProfilePhoto = (stored && (stored.snapshot || stored.photoUrl)) || (fvPendingStudent && fvPendingStudent.profilePhoto) || null;
  fetch('http://127.0.0.1:5000/api/biometrics/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      student_id: studentId,
      name: fvPendingStudent.name,
      student_name: fvPendingStudent.name,
      profile_image: regProfilePhoto,
      image: livePhotoUrl,
      mode: 'login',
      single_frame: true
    })
  }).then(function(r){ return r.json(); })
    .then(function(res){
      var isAllowed = res && (res.status === 'ALLOW' || res.status === 'MATCH' || res.is_match === true);
      if (isAllowed) {
        fvPendingStudent.desc = stored ? stored.desc : null;
        fvPendingStudent.profilePhoto = regProfilePhoto || livePhotoUrl;
        studentProfilePhoto = fvPendingStudent.profilePhoto;
        ring.classList.add('success');
        var matchPct = res.match_percentage || Math.round((res.similarity || 1) * 100);
        status.textContent = '✓ ArcFace Verified (' + matchPct + '% match)! Welcome back!';
        status.style.color = '#4ade80';
        bar.style.width = '100%';
        fvCloseCam();
        setTimeout(completeStudentLoginV2, 900);
      } else if (res && res.status === 'SPOOF') {
        ring.classList.add('fail');
        fvShowError('Anti-Spoofing Alert: ' + (res.message || res.reason || 'Screen or photo replay detected. Live face required.'));
      } else if (res && (res.status === 'BLOCK' || res.status === 'MISMATCH')) {
        ring.classList.add('fail');
        var pct = res.match_percentage || Math.round((res.similarity || 0) * 100);
        fvShowError('Identity Mismatch (' + pct + '% match). Face does not match registered profile photo.');
      } else if (res && (res.status === 'MULTIPLE_FACES' || res.status === 'MULTI')) {
        ring.classList.add('fail');
        fvShowError('Multiple faces detected. Exactly one candidate allowed in camera.');
      } else if (res && res.status === 'NO_FACE') {
        ring.classList.add('fail');
        fvShowError('No face detected. Please face the camera directly in good lighting.');
      } else {
        doLocalFallbackVerify();
      }
    }).catch(function(err){
      console.log('ArcFace service unavailable, using local fallback:', err);
      doLocalFallbackVerify();
    });
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
  if (!a || !b || a.length !== b.length) return 0;
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
  completeStudentLoginV2();
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

  if (currentStudent && currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
    LIVE_SESSIONS[currentStudent.name].status = 'offline';
  }
  currentStudent = {};
  currentStaff = null;

  document.getElementById('login-page').classList.remove('hidden');
  ['student-app','staff-app','admin-app','face-verify-overlay'].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  
  /* Clear all form fields */
  ['s-name','s-dob','r-name','r-roll','r-dob','r-college','a-user','a-pass','staff-user','staff-pass','staff-reg-name','staff-reg-dept','staff-reg-user','staff-reg-pass'].forEach(function(id){
    var el=document.getElementById(id); if(el) el.value='';
  });
  document.getElementById('login-err').classList.add('hidden');
  var lse = document.getElementById('login-stu-err'); if(lse) lse.classList.add('hidden');
  var re = document.getElementById('reg-err'); if(re) re.classList.add('hidden');
  var sle = document.getElementById('staff-login-err'); if(sle) sle.classList.add('hidden');
  var sre = document.getElementById('staff-reg-err'); if(sre) sre.classList.add('hidden');

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
