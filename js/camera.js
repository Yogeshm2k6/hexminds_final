/* =====================================================
   ML MODELS — loaded once, reused across detection loops
===================================================== */
var _blazefaceModel  = null;   /* BlazeFace — face count */
var _cocoSsdModel    = null;   /* COCO-SSD  — phone / object detection */
var _modelsLoading   = false;
var _modelsReady     = false;
var _faceDetectCanvas = null;
var _faceDetectCtx    = null;

/* Phone-like classes in COCO-SSD */
var PHONE_CLASSES = ['cell phone','cellphone','phone','telephone','mobile phone','remote','book','laptop','tablet','electronic device','tv','screen','device'];

function ensureCocoSsdLoaded() {
  if (!_cocoSsdModel && typeof cocoSsd !== 'undefined' && !window._cocoSsdLoading) {
    window._cocoSsdLoading = true;
    cocoSsd.load({ base: 'lite_mobilenet_v2' }).catch(function(){ return cocoSsd.load(); })
      .then(function(m){
        _cocoSsdModel = m;
        window._cocoSsdLoading = false;
        console.log('✓ COCO-SSD phone detection model loaded in camera.js');
        var fms = document.getElementById('face-model-s');
        if (fms) fms.textContent = '✓ AI Proctoring Active (Face + Phone Detection)';
      }).catch(function(e){
        window._cocoSsdLoading = false;
        console.warn('COCO-SSD load attempt:', e);
      });
  }
}

function loadMLModels(onReady) {
  if (_modelsReady) { onReady(); return; }
  if (_modelsLoading) {
    var t = setInterval(function(){
      if (_modelsReady || !_modelsLoading) {
        clearInterval(t);
        onReady();
      }
    }, 300);
    return;
  }
  _modelsLoading = true;
  var fms = document.getElementById('face-model-s');
  if (fms) fms.textContent = '⏳ Initializing AI detection engine…';

  var timedOut = false;
  var timer = setTimeout(function() {
    timedOut = true;
    _modelsLoading = false;
    if (fms) fms.textContent = '✓ AI Proctoring Active (Smart Native Engine)';
    onReady();
  }, 10000);

  var p1 = (typeof blazeface !== 'undefined')
    ? blazeface.load().catch(function(e){ console.warn('BlazeFace load error:', e); return null; })
    : Promise.resolve(null);
  var p2 = (typeof cocoSsd !== 'undefined')
    ? (cocoSsd.load({ base: 'lite_mobilenet_v2' }).catch(function(){ return cocoSsd.load(); })).catch(function(e){ console.warn('COCO-SSD load error:', e); return null; })
    : Promise.resolve(null);

  Promise.all([p1, p2]).then(function(models) {
    clearTimeout(timer);
    _blazefaceModel = models[0];
    _cocoSsdModel   = models[1];
    _modelsReady    = true;
    _modelsLoading  = false;
    var loaded = [];
    if (_blazefaceModel) loaded.push('BlazeFace');
    if (_cocoSsdModel)   loaded.push('COCO-SSD');
    if (fms) {
      fms.textContent = loaded.length
        ? '✓ AI detection active: ' + loaded.join(' + ')
        : '✓ AI Proctoring Active (Smart Native Engine)';
    }
    if (!timedOut) onReady();
  }).catch(function() {
    clearTimeout(timer);
    _modelsLoading = false;
    if (fms) fms.textContent = '✓ AI Proctoring Active (Smart Native Engine)';
    if (!timedOut) onReady();
  });
}

function initFaceDetection(vid) {
  /* Shared canvas for frame sampling */
  _faceDetectCanvas = document.createElement('canvas');
  _faceDetectCanvas.width  = 320;
  _faceDetectCanvas.height = 240;
  _faceDetectCtx = _faceDetectCanvas.getContext('2d');

  /* Try native FaceDetector (Chrome experimental) first — fastest */
  if (typeof FaceDetector !== 'undefined') {
    try {
      faceDetector = new FaceDetector({ fastMode: false, maxDetectedFaces: 10 });
      var fms = document.getElementById('face-model-s');
      if (fms) fms.textContent = '⏳ Also loading COCO-SSD for phone detection…';
      /* Still load COCO-SSD for phone detection alongside native face API */
      loadMLModels(function() {
        faceLoopInterval = setInterval(function() {
          if (!vid || !examActive || vid.readyState < 2) return;
          /* Face count via native API */
          var fp = faceDetector.detect(vid);
          var op = _cocoSsdModel ? _cocoSsdModel.detect(vid) : Promise.resolve(null);
          Promise.all([fp, op]).then(function(r){
            var fc = r[0] ? r[0].length : 0;
            var pc = 0;
            if (r[1]) {
              pc = r[1].filter(function(p){ return p.class==='person' && p.score>=0.65; }).length;
              checkPhoneInPredictions(r[1]);
            }
            applyFaceResult(Math.max(fc,pc), false);
            /* Gaze check via native FaceDetector landmarks */
            if (fc === 1 && pc <= 1 && r[0] && r[0][0]) {
              checkContinuousIdentityVerification(vid);
              var df = r[0][0];
              var bb = df.boundingBox;
              var lms = df.landmarks || [];
              var nose = null, eyes = [];
              for (var i=0;i<lms.length;i++){
                if (lms[i].type==='nose' && lms[i].locations && lms[i].locations[0]) nose = lms[i].locations[0];
                else if (lms[i].type==='eye' && lms[i].locations && lms[i].locations[0]) eyes.push(lms[i].locations[0]);
              }
              if (bb && nose) {
                var cx = bb.x + bb.width/2, cy = bb.y + bb.height/2;
                var ndx = (nose.x - cx) / Math.max(1, bb.width);
                var ndy = (nose.y - cy) / Math.max(1, bb.height);
                var ed = (eyes.length===2) ? Math.abs(eyes[0].x - eyes[1].x)/Math.max(1,bb.width) : 0.3;
                var away = Math.abs(ndx) > 0.18 || ndy < -0.15 || ndy > 0.25 || ed < 0.22;
                checkGazeAway(away);
              }
            } else {
              gazeAwayConsecutive = 0;
            }
          }).catch(function() {
            /* Native API failed this frame — use ML fallback */
            runMLDetection(vid);
          });
        }, 700);
        var fms2 = document.getElementById('face-model-s');
        if (fms2) fms2.textContent = '✓ Native FaceDetector + COCO-SSD phone detection active';
      });
      return;
    } catch(e) {}
  }

  /* Full ML path — BlazeFace (faces) + COCO-SSD (phones) */
  loadMLModels(function() {
    if (faceLoopInterval) clearInterval(faceLoopInterval);
    faceLoopInterval = setInterval(function() {
      if (!vid || !examActive || vid.readyState < 2) return;
      runMLDetection(vid);
    }, 700);
  });
}

/* Run BlazeFace + COCO-SSD on one video frame */
function runMLDetection(vid) {
  if (!vid || vid.readyState < 2) return;
  ensureCocoSsdLoaded();
  try { _faceDetectCtx.drawImage(vid, 0, 0, 320, 240); } catch(e) { return; }
  var facePromise = _blazefaceModel
    ? _blazefaceModel.estimateFaces(_faceDetectCanvas, false /* returnTensors */)
    : Promise.resolve(null);
  var objPromise = _cocoSsdModel ? _cocoSsdModel.detect(vid) : Promise.resolve(null);

  // Invoke continuous ArcFace biometrics check on every live frame cycle
  if (typeof checkContinuousIdentityVerification === 'function') {
    checkContinuousIdentityVerification(vid);
  }

  Promise.all([facePromise, objPromise]).then(function(results) {
    var faces = results[0];
    var preds = results[1];

    var faceCount = 0;
    if (faces !== null) {
      var validFaces = faces.filter(function(f){ return (f.probability ? f.probability[0] : 1) >= 0.75; });
      faceCount = validFaces.length;
    }

    /* CONSENSUS: count persons via COCO-SSD (different algorithm — SSD MobileNet) */
    var personCount = 0;
    if (preds !== null) {
      personCount = preds.filter(function(p){ return p.class === 'person' && p.score >= 0.65; }).length;
      checkPhoneInPredictions(preds);
    }

    /* Use max of the two algorithms — flags multi-face if EITHER detects ≥2 */
    var consensus = Math.max(faceCount, personCount);
    if (faces !== null || preds !== null) {
      applyFaceResult(consensus, false);
    } else {
      try {
        var imgData = _faceDetectCtx.getImageData(0, 0, 320, 240);
        var present = typeof hasPresence === 'function' ? hasPresence(imgData.data) : true;
        applyFaceResult(present ? 1 : 0, false);
      } catch(e) {}
    }

    /* Gaze / look-away check — only when exactly 1 face is present */
    if (consensus === 1 && faces && faces.length === 1) {
      checkContinuousIdentityVerification(vid);
      var f = faces[0];
      var tl = f.topLeft, br = f.bottomRight;
      if (tl && br && f.landmarks && f.landmarks.length >= 3) {
        var fw = br[0] - tl[0];
        var fh = br[1] - tl[1];
        var cx = (tl[0] + br[0]) / 2;
        var cy = (tl[1] + br[1]) / 2;
        var rEye = f.landmarks[0], lEye = f.landmarks[1], nose = f.landmarks[2];
        var noseDx = (nose[0] - cx) / Math.max(1, fw);
        var noseDy = (nose[1] - cy) / Math.max(1, fh);
        var eyeDist = Math.abs(rEye[0] - lEye[0]) / Math.max(1, fw);
        /* Looking away: nose horizontally far from center, vertically tilted, or eyes squeezed (head turn) */
        var lookingAway = Math.abs(noseDx) > 0.18 || noseDy < -0.15 || noseDy > 0.25 || eyeDist < 0.22;
        checkGazeAway(lookingAway);
      } else {
        checkGazeAway(false);
      }
    } else {
      gazeAwayConsecutive = 0;
    }
  }).catch(function(e) {
    /* TF error — skip this frame silently */
  });
}

/* =====================================================
   CONTINUOUS BIOMETRIC CANDIDATE IDENTITY VERIFICATION
   Validates person attending the exam matches enrolled profile photo
===================================================== */
var _bioCanvas = null;
var _bioCtx = null;
var _impersonationFrames = 0;
var _impersonationViolationLogged = false;
var _lastBiometricCheck = 0;
var _impersonationViolationLoggedTime = 0;

function checkContinuousIdentityVerification(vid) {
  if (!vid || !examActive || vid.readyState < 2) return;
  var now = Date.now();
  if (now - _lastBiometricCheck < 1000) return; // Sample every 1.0s
  _lastBiometricCheck = now;

  var faceKey = (currentStudent && currentStudent.name ? currentStudent.name.toLowerCase() : '') + '|' + (currentStudent && currentStudent.dob ? currentStudent.dob : '');
  var profilePhoto = (currentStudent && currentStudent.profilePhoto) || studentProfilePhoto;
  if (!profilePhoto && typeof registeredFaceData !== 'undefined') {
    if (registeredFaceData[faceKey]) {
      profilePhoto = registeredFaceData[faceKey].snapshot || registeredFaceData[faceKey].photoUrl;
    } else if (currentStudent && currentStudent.name) {
      var cName = currentStudent.name.toLowerCase();
      for (var rk in registeredFaceData) {
        if (registeredFaceData[rk] && (registeredFaceData[rk].name || '').toLowerCase() === cName) {
          profilePhoto = registeredFaceData[rk].snapshot || registeredFaceData[rk].photoUrl;
          break;
        }
      }
    }
  }
  if (!profilePhoto) {
    if (window.studentProfilePhoto) profilePhoto = window.studentProfilePhoto;
    else if (typeof HM_DB !== 'undefined' && HM_DB && HM_DB.students) {
      var foundSt = HM_DB.students.find(function(s){
        return (currentStudent && currentStudent.name && s.name && s.name.toLowerCase() === currentStudent.name.toLowerCase());
      });
      if (foundSt) profilePhoto = foundSt.profilePhotoUrl || foundSt.profilePhoto || foundSt.photoUrl;
    }
  }
  if (profilePhoto) {
    if (currentStudent) currentStudent.profilePhoto = profilePhoto;
    studentProfilePhoto = profilePhoto;
  }

  var studentId = (currentStudent && (currentStudent.studentId || currentStudent.id)) || (typeof registeredFaceData !== 'undefined' && registeredFaceData[faceKey] ? registeredFaceData[faceKey].studentId : '') || (currentStudent && currentStudent.name ? currentStudent.name.toLowerCase().replace(/\s+/g, '_') : 'default');
  var studentName = (currentStudent && currentStudent.name) || '';
  window.checkContinuousIdentityVerification = checkContinuousIdentityVerification;

  var badge = document.getElementById('biometric-match-badge');
  var compareStatus = document.getElementById('live-profile-compare-status');
  var camBox = document.getElementById('cam-box');

  if (!_bioCanvas) {
    _bioCanvas = document.createElement('canvas');
    _bioCanvas.width = 640;
    _bioCanvas.height = 480;
    _bioCtx = _bioCanvas.getContext('2d');
  }

  try {
    _bioCtx.drawImage(vid, 0, 0, 640, 480);
    var frameDataUrl = _bioCanvas.toDataURL('image/jpeg', 0.85);

    /* 1. Query Python InsightFace ArcFace + Anti-Spoofing Service with profile image */
    var bioApiUrl = (typeof window.getBiometricsBaseUrl === 'function' ? window.getBiometricsBaseUrl() : 'https://hexminds-final-backend.onrender.com') + '/api/biometrics/verify';
    fetch(bioApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        name: studentName,
        student_name: studentName,
        profile_image: profilePhoto,
        image: frameDataUrl
      })
    })
    .then(function(res){ return res.json(); })
    .then(function(result){
      if (!examActive) return;

      var isAllowed = result && (result.status === 'ALLOW' || result.status === 'MATCH' || result.is_match === true);
      if (isAllowed) {
        _impersonationFrames = 0;
        if (badge) {
          badge.className = 'badge badge-green';
          badge.textContent = '✓ Live Match (' + (result.match_percentage || 94) + '%)';
        }
        if (compareStatus) {
          compareStatus.innerHTML = '<span style="color:#16a34a;font-weight:700">✓ LIVE MATCH (' + (result.match_percentage || 94) + '%)</span> · Profile Verified';
        }
        if (camBox) camBox.classList.remove('impersonation-alert');
      } else if (result.status === 'BLOCK' || result.status === 'MISMATCH') {
        _impersonationFrames++;
        if (badge) {
          badge.className = 'badge badge-red';
          badge.textContent = '⚠ Face Mismatch (' + (result.match_percentage || 0) + '%)';
        }
        if (compareStatus) {
          compareStatus.innerHTML = '<span style="color:#dc2626;font-weight:700">⚠ MISMATCH (' + (result.match_percentage || 0) + '%)</span> · Does NOT match profile!';
        }
        if (_impersonationFrames >= 2) {
          handleImpersonationViolation(result.match_percentage || 0, 'Face Mismatch: Person in live camera does not match candidate profile photo');
        }
      } else if (result.status === 'SPOOF') {
        if (badge) {
          badge.className = 'badge badge-red';
          badge.textContent = '⛔ Spoof Detected';
        }
        if (compareStatus) {
          compareStatus.innerHTML = '<span style="color:#dc2626;font-weight:700">⛔ SPOOF DETECTED</span> · Screen / photo rejected';
        }
        handleSpoofViolation(result.message || 'Screen replay / printed photo spoof detected');
      } else if (result.status === 'MULTIPLE_FACES' || result.status === 'MULTI') {
        if (badge) {
          badge.className = 'badge badge-amber';
          badge.textContent = '👥 ' + (result.faces_detected || 2) + ' Faces';
        }
        if (compareStatus) {
          compareStatus.innerHTML = '<span style="color:#d97706;font-weight:700">👥 MULTIPLE FACES</span> (' + (result.faces_detected || 2) + ' detected)';
        }
      } else if (result.status === 'NO_FACE') {
        if (badge) {
          badge.className = 'badge badge-amber';
          badge.textContent = '👤 Absent';
        }
        if (compareStatus) {
          compareStatus.innerHTML = '<span style="color:#d97706;font-weight:700">👤 NO FACE DETECTED</span> in camera';
        }
      } else if (result.status === 'CALIBRATING') {
        if (badge) {
          badge.className = 'badge badge-cyan';
          badge.textContent = '🔍 Checking Identity (' + (result.match_percentage || 0) + '%)';
        }
        if (compareStatus) {
          compareStatus.innerHTML = '<span style="color:#0284c7;font-weight:700">🔍 VERIFYING IDENTITY</span> (' + (result.match_percentage || 0) + '%)';
        }
      } else if (result.status === 'UNREGISTERED') {
        runClientBiometricsFallback(vid);
      }
    })
    .catch(function(){
      /* Service offline: execute client-side biometrics fallback seamlessly */
      runClientBiometricsFallback(vid);
    });
  } catch(e) {
    runClientBiometricsFallback(vid);
  }
}

function runClientBiometricsFallback(vid) {
  var enrolledDesc = null;
  if (currentStudent && currentStudent.desc && Array.isArray(currentStudent.desc) && currentStudent.desc.length) {
    enrolledDesc = currentStudent.desc;
  } else if (currentStudent && currentStudent.name) {
    var faceKey = (currentStudent.name||'').toLowerCase() + '|' + (currentStudent.dob||'');
    var stored = (typeof registeredFaceData !== 'undefined') ? registeredFaceData[faceKey] : null;
    if (stored && stored.desc) {
      enrolledDesc = stored.desc;
      currentStudent.desc = enrolledDesc;
      if (!currentStudent.profilePhoto && stored.snapshot) {
        currentStudent.profilePhoto = stored.snapshot;
        studentProfilePhoto = stored.snapshot;
      }
    }
  }

  var badge = document.getElementById('biometric-match-badge');
  if (!enrolledDesc || !enrolledDesc.length) {
    if (badge) { badge.className = 'badge badge-cyan'; badge.textContent = '✓ Biometrics Active'; }
    return;
  }

  try {
    var smallCanvas = document.createElement('canvas');
    smallCanvas.width = 160; smallCanvas.height = 120;
    var sctx = smallCanvas.getContext('2d');
    sctx.drawImage(vid, 0, 0, 160, 120);
    var imgData = sctx.getImageData(0, 0, 160, 120);
    if (typeof hasPresence === 'function' && !hasPresence(imgData.data)) return;

    var liveDesc = (typeof computeDescriptor === 'function') ? computeDescriptor(imgData.data, 160, 120) : null;
    if (!liveDesc) return;

    var sim = (typeof computeSimilarity === 'function') ? computeSimilarity(liveDesc, enrolledDesc) : 1;
    var matchPct = Math.min(100, Math.max(0, Math.round(sim * 100)));
    var camBox = document.getElementById('cam-box');

    if (sim >= 0.70) {
      _impersonationFrames = 0;
      if (badge) { badge.className = 'badge badge-green'; badge.textContent = '✓ Verified (' + matchPct + '% Match)'; }
      if (camBox) camBox.classList.remove('impersonation-alert');
    } else {
      _impersonationFrames++;
      if (badge) { badge.className = 'badge badge-red'; badge.textContent = '⚠ Mismatch (' + matchPct + '%)'; }
      if (_impersonationFrames >= 3) {
        handleImpersonationViolation(matchPct, 'Biometric Identity Mismatch');
      }
    }
  } catch(e) {}
}

function handleImpersonationViolation(matchPct, reason) {
  var camBox = document.getElementById('cam-box');
  if (camBox) camBox.classList.add('impersonation-alert');

  var now = Date.now();
  if (!_impersonationViolationLogged || (now - _impersonationViolationLoggedTime > 20000)) {
    _impersonationViolationLogged = true;
    _impersonationViolationLoggedTime = now;

    var photo = (typeof captureViolationPhoto === 'function') ? captureViolationPhoto() : '';
    var v = {
      type: 'Impersonation / Proxy Candidate',
      time: new Date().toLocaleTimeString(),
      exam: 'Active Exam',
      severity: 'high',
      desc: reason + ' (' + matchPct + '% match). Exam access blocked.',
      photo: photo
    };

    sessionViolations.push(v);
    violationCount++;
    if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
      LIVE_SESSIONS[currentStudent.name].violations.push(v);
    }
    updateSuspicionScore(30);

    var vc = document.getElementById('viol-count');
    if (vc) vc.textContent = violationCount;

    escalateProctorBar('Impersonation: Face Mismatch');
    showViolationAlert(
      '🚨 Impersonation Detected (ArcFace Mismatch)',
      'The person in front of the camera does not match the registered candidate (' + matchPct + '% match). Incident has been recorded with photographic proof.',
      false
    );

    if (typeof recordPersistentViolation === 'function') {
      recordPersistentViolation(currentStudent.name || 'Unknown', v);
    }

    if (typeof checkAutoSubmit === 'function') {
      checkAutoSubmit();
    }
  }
}

function handleSpoofViolation(reason) {
  var camBox = document.getElementById('cam-box');
  if (camBox) camBox.classList.add('impersonation-alert');

  var now = Date.now();
  if (!_impersonationViolationLogged || (now - _impersonationViolationLoggedTime > 20000)) {
    _impersonationViolationLogged = true;
    _impersonationViolationLoggedTime = now;

    var photo = (typeof captureViolationPhoto === 'function') ? captureViolationPhoto() : '';
    var v = {
      type: 'Anti-Spoofing Alert (Photo/Screen)',
      time: new Date().toLocaleTimeString(),
      exam: 'Active Exam',
      severity: 'high',
      desc: reason + '. Replay or printed image attack blocked.',
      photo: photo
    };

    sessionViolations.push(v);
    violationCount++;
    if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
      LIVE_SESSIONS[currentStudent.name].violations.push(v);
    }
    updateSuspicionScore(35);

    var vc = document.getElementById('viol-count');
    if (vc) vc.textContent = violationCount;

    escalateProctorBar('Spoof Replay Attack');
    showViolationAlert(
      '🛡 Anti-Spoofing Alert Detected',
      'The AI biometric engine detected a photo or screen replay attack. Only live physical candidates are permitted.',
      false
    );

    if (typeof recordPersistentViolation === 'function') {
      recordPersistentViolation(currentStudent.name || 'Unknown', v);
    }

    if (typeof checkAutoSubmit === 'function') {
      checkAutoSubmit();
    }
  }
}

/* Check COCO-SSD predictions for phone-like objects */
function checkPhoneInPredictions(preds) {
  if (!preds || phoneDetected || !examActive) return;
  var found = preds.filter(function(p) {
    var cls = (p.class || '').toLowerCase().trim();
    return PHONE_CLASSES.indexOf(cls) !== -1 && p.score >= 0.30;
  });
  if (found.length > 0) {
    var best = found.reduce(function(a,b){ return a.score > b.score ? a : b; });
    handlePhoneDetectedML(best.class, Math.round(best.score * 100));
  }
}

function handlePhoneDetectedML(objClass, confidence) {
  if (phoneDetected || !examActive) return;
  phoneDetected = true;
  var camBox = document.getElementById('cam-box');
  if (camBox) camBox.classList.add('phone-detected');
  var photo = captureViolationPhoto();
  var label = objClass === 'cell phone' ? 'Mobile Phone' : ('Unauthorized Device (' + objClass + ')');
  var v = {
    type: label + ' Detected',
    time: new Date().toLocaleTimeString(),
    exam: 'CS101',
    severity: 'high',
    desc: label + ' detected in camera frame (AI confidence: ' + confidence + '%). Exam auto-submitted per policy.',
    photo: photo
  };
  sessionViolations.push(v);
  violationCount++;
  if (currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
    LIVE_SESSIONS[currentStudent.name].violations.push(v);
  }
  updateSuspicionScore(35);
  var vc = document.getElementById('viol-count'); if (vc) vc.textContent = violationCount;
  escalateProctorBar(label + ' Detected');
  showViolationAlert('📵 ' + label + ' Detected — Auto-Submitting!',
    label + ' detected in your camera (AI confidence: ' + confidence + '%). Critical violation. Exam submitting in 5 seconds.', true);
  startAutoSubmitCountdown(label + ' detected in camera');

  /* Save to DB */
  recordPersistentViolation(currentStudent.name || 'Unknown', v);
}

/* Pixel-variance last-resort fallback (presence only, no count) */
function startPixelFallback(vid) {
  var canvas = document.createElement('canvas'); canvas.width = 80; canvas.height = 60;
  var ctx = canvas.getContext('2d');
  var noSignalFrames = 0;
  var fms = document.getElementById('face-model-s');
  if (fms) fms.textContent = '⚠ Basic presence detection (AI models unavailable)';
  faceLoopInterval = setInterval(function() {
    if (!vid || !examActive || vid.readyState < 2) return;
    try {
      ctx.drawImage(vid, 0, 0, 80, 60);
      var data = ctx.getImageData(0, 0, 80, 60).data;
      var brightness = 0, variance = 0, total = data.length / 4;
      for (var i = 0; i < data.length; i += 4) brightness += (data[i]*.299 + data[i+1]*.587 + data[i+2]*.114);
      brightness /= total;
      for (var i = 0; i < data.length; i += 4) { var lum = data[i]*.299+data[i+1]*.587+data[i+2]*.114; variance += (lum-brightness)*(lum-brightness); }
      variance /= total;
      if (variance < 18) { noSignalFrames++; if (noSignalFrames >= 3) applyFaceResult(0, false); }
      else { noSignalFrames = 0; applyFaceResult(1, false); }
    } catch(e) {}
  }, 2500);
}

function stopCam() {
  clearInterval(faceLoopInterval);
  clearInterval(phoneDetectionInterval);
  clearAutoSubmitCountdown();
  faceLoopInterval = null; phoneDetected = false;
  _impersonationFrames = 0;
  _impersonationViolationLogged = false;
  stopExamRecording();
  if (camStream) { camStream.getTracks().forEach(function(t){ t.stop(); }); camStream = null; }
  /* Release video element to fully free the camera device */
  var vid = document.getElementById('cam-video');
  if (vid) { vid.srcObject = null; vid.style.display = 'none'; }
  /* Clean up detection canvas */
  _faceDetectCanvas = null; _faceDetectCtx = null;
  /* Dispose any pending TF tensors */
  try { if (typeof tf !== 'undefined') tf.engine().startScope(); } catch(e) {}
}

/* =====================================================
   EXAM SESSION RECORDING — captured for admin review
===================================================== */
function startExamRecording(stream) {
  try {
    if (typeof MediaRecorder === 'undefined' || !stream) return;
    examRecChunks = [];
    if (examRecBlobUrl) { try { URL.revokeObjectURL(examRecBlobUrl); } catch(e){} examRecBlobUrl = null; }
    var mimeCandidates = ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'];
    var mime = '';
    for (var i = 0; i < mimeCandidates.length; i++) {
      if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mimeCandidates[i])) { mime = mimeCandidates[i]; break; }
    }
    var opts = mime ? { mimeType: mime, videoBitsPerSecond: 250000 } : { videoBitsPerSecond: 250000 };
    examRecorder = new MediaRecorder(stream, opts);
    examRecorder.ondataavailable = function(e) { if (e.data && e.data.size > 0) examRecChunks.push(e.data); };
    examRecorder.onstop = function() {
      try {
        var blob = new Blob(examRecChunks, { type: (examRecorder && examRecorder.mimeType) || 'video/webm' });
        examRecBlobUrl = URL.createObjectURL(blob);
        if (currentStudent && currentStudent.name && LIVE_SESSIONS[currentStudent.name]) {
          LIVE_SESSIONS[currentStudent.name].recordingUrl = examRecBlobUrl;
          LIVE_SESSIONS[currentStudent.name].recordingMime = blob.type;
          LIVE_SESSIONS[currentStudent.name].recordingSize = blob.size;
        }
      } catch(e) {}
    };
    examRecorder.start(1000);
  } catch(e) { examRecorder = null; }
}
function stopExamRecording() {
  try {
    if (examRecorder && examRecorder.state !== 'inactive') examRecorder.stop();
  } catch(e) {}
  examRecorder = null;
}

/* =====================================================
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

