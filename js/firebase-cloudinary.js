/**
 * HexaMinds — Dedicated Firebase Firestore & Cloudinary Service Module
 * Handles all cloud media uploads (profile photos, snapshots, violations)
 * and real-time database synchronization for all exam and student details.
 */

(function(window) {
  'use strict';

  // 1. Resolve Configuration from HM_CONFIG / ENV
  function getConfig() {
    var c = window.HM_CONFIG || {};
    return {
      cloudinary: c.CLOUDINARY || {
        cloudName: 'etwi6mr1',
        apiKey: '851528631193376',
        apiSecret: '0Ykrn3mdG8rQ19Z78Vq1qzs6YMs'
      },
      firebase: c.FIREBASE || {
        apiKey: "AIzaSyDaeHuep_eGqLSIxoOMOO4kjbjOcI4cLNg",
        authDomain: "examportal-a4795.firebaseapp.com",
        projectId: "examportal-a4795",
        storageBucket: "examportal-a4795.firebasestorage.app",
        messagingSenderId: "863213436052",
        appId: "1:863213436052:web:3fec0db8245a0446a8c881",
        measurementId: "G-VSY3NHC3PJ"
      }
    };
  }

  // 2. Initialize Firebase Firestore
  var dbInstance = null;
  function initFirebase() {
    if (typeof firebase === 'undefined') {
      console.warn('Firebase SDK not loaded.');
      return null;
    }
    if (!firebase.apps.length) {
      try {
        var cfg = getConfig().firebase;
        firebase.initializeApp(cfg);
        console.log('✓ Firebase initialized with project:', cfg.projectId);
      } catch(e) {
        console.warn('Firebase init warning:', e.message);
      }
    }
    if (firebase.apps.length && !dbInstance) {
      try {
        dbInstance = firebase.firestore();
      } catch(e) {
        console.warn('Firestore initialization error:', e);
      }
    }
    return dbInstance;
  }

  // Initialize immediately
  initFirebase();

  function getDb() {
    if (!dbInstance) initFirebase();
    return dbInstance;
  }

  // Helper: Sanitize document IDs
  function sanitizeDocId(str) {
    return String(str || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CLOUDINARY MEDIA UPLOADER SERVICE
  // ──────────────────────────────────────────────────────────────────────────
  var HM_Cloudinary = {
    /**
     * Upload base64 or Blob to Cloudinary using signed HMAC-SHA1
     */
    upload: function(fileData, resourceType, callback) {
      var cfg = getConfig().cloudinary;
      var cloudName = (window.ENV && window.ENV.CLOUDINARY_CLOUD_NAME) || cfg.cloudName || 'etwi6mr1';
      var apiKey = (window.ENV && window.ENV.CLOUDINARY_API_KEY) || cfg.apiKey || '851528631193376';
      var apiSecret = (window.ENV && window.ENV.CLOUDINARY_API_SECRET) || cfg.apiSecret || '0Ykrn3mdG8rQ19Z78Vq1qzs6YMs';
      var timestamp = Math.round(new Date().getTime() / 1000);

      var signatureStr = 'timestamp=' + timestamp + apiSecret;
      var signature = (typeof CryptoJS !== 'undefined' && CryptoJS.SHA1)
        ? CryptoJS.SHA1(signatureStr).toString()
        : '';

      var formData = new FormData();
      formData.append('file', fileData);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      var type = resourceType || 'image';
      var url = 'https://api.cloudinary.com/v1_1/' + cloudName + '/' + type + '/upload';

      var xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.onload = function() {
        if (xhr.status === 200) {
          try {
            var res = JSON.parse(xhr.responseText);
            console.log('✓ Cloudinary Uploaded (' + type + '):', res.secure_url);
            if (typeof callback === 'function') callback(res.secure_url);
          } catch(e) {
            if (typeof callback === 'function') callback(null);
          }
        } else {
          console.error('Cloudinary error (' + xhr.status + '):', xhr.responseText);
          if (typeof callback === 'function') callback(null);
        }
      };
      xhr.onerror = function(err) {
        console.error('Cloudinary network error:', err);
        if (typeof callback === 'function') callback(null);
      };
      xhr.send(formData);
    },

    /**
     * Upload student face snapshot / profile picture
     */
    uploadFacePhoto: function(faceKey, base64Photo, callback) {
      if (!base64Photo || !base64Photo.startsWith('data:')) {
        if (typeof callback === 'function') callback(base64Photo);
        return;
      }
      HM_Cloudinary.upload(base64Photo, 'image', function(cloudinaryUrl) {
        if (cloudinaryUrl) {
          if (window.registeredFaceData && registeredFaceData[faceKey]) {
            registeredFaceData[faceKey].snapshot = cloudinaryUrl;
            registeredFaceData[faceKey].photoUrl = cloudinaryUrl;
            HM_Firestore.saveFace(faceKey, registeredFaceData[faceKey]);
          }
          if (window.currentStudent && currentStudent.name) {
            window.studentProfilePhoto = cloudinaryUrl;
            currentStudent.profilePhoto = cloudinaryUrl;
            if (window.LIVE_SESSIONS && LIVE_SESSIONS[currentStudent.name]) {
              LIVE_SESSIONS[currentStudent.name].profilePhoto = cloudinaryUrl;
              HM_Firestore.saveSession(currentStudent.name, LIVE_SESSIONS[currentStudent.name]);
            }
          }
          var stuName = faceKey.split('|')[0];
          if (window.STUDENTS) {
            var sObj = STUDENTS.find(function(s){ return s.name.toLowerCase() === stuName.toLowerCase(); });
            if (sObj) {
              sObj.profilePhoto = cloudinaryUrl;
              sObj.profilePhotoUrl = cloudinaryUrl;
              HM_Firestore.saveStudent(sObj);
            }
          }
        }
        if (typeof callback === 'function') callback(cloudinaryUrl);
      });
    },

    /**
     * Upload violation photographic evidence
     */
    uploadViolationPhoto: function(violationObj, base64Photo, callback) {
      if (!base64Photo || !base64Photo.startsWith('data:')) {
        if (typeof callback === 'function') callback(base64Photo);
        return;
      }
      HM_Cloudinary.upload(base64Photo, 'image', function(cloudinaryUrl) {
        if (cloudinaryUrl) {
          violationObj.photo = cloudinaryUrl;
          violationObj.photoUrl = cloudinaryUrl;

          var studentName = violationObj.student || (window.currentStudent && currentStudent.name) || 'anon';
          var docId = 'v_' + (violationObj.id || Date.now()) + '_' + sanitizeDocId(studentName);
          var db = getDb();
          if (db) {
            db.collection('violations').doc(docId).set({ photoUrl: cloudinaryUrl, photo: cloudinaryUrl }, { merge: true }).catch(function(){});
          }

          if (window.LIVE_SESSIONS && LIVE_SESSIONS[studentName]) {
            var viols = LIVE_SESSIONS[studentName].violations || [];
            var found = viols.find(function(x){ return (violationObj.id && x.id === violationObj.id) || (x.time === violationObj.time && x.type === violationObj.type); });
            if (found) {
              found.photo = cloudinaryUrl;
              found.photoUrl = cloudinaryUrl;
              HM_Firestore.saveSession(studentName, LIVE_SESSIONS[studentName]);
            }
          }

          if (window.HM_DB && HM_DB.violations) {
            var foundDb = HM_DB.violations.find(function(x){ return (violationObj.id && x.id === violationObj.id) || (x.time === violationObj.time && x.type === violationObj.type); });
            if (foundDb) {
              foundDb.photo = cloudinaryUrl;
              foundDb.photoUrl = cloudinaryUrl;
            }
          }
        }
        if (typeof callback === 'function') callback(cloudinaryUrl);
      });
    },

    /**
     * Upload login verification snapshot
     */
    uploadLoginPhoto: function(loginObj, base64Photo, callback) {
      if (!base64Photo || !base64Photo.startsWith('data:')) {
        if (typeof callback === 'function') callback(base64Photo);
        return;
      }
      HM_Cloudinary.upload(base64Photo, 'image', function(cloudinaryUrl) {
        if (cloudinaryUrl) {
          loginObj.photo = cloudinaryUrl;
          loginObj.photoUrl = cloudinaryUrl;
          var docId = 'log_' + (loginObj.id || Date.now()) + '_' + sanitizeDocId(loginObj.name || 'anon');
          var db = getDb();
          if (db) {
            db.collection('login_history').doc(docId).set({ photoUrl: cloudinaryUrl, photo: cloudinaryUrl }, { merge: true }).catch(function(){});
          }
        }
        if (typeof callback === 'function') callback(cloudinaryUrl);
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // FIRESTORE DATABASE SERVICE
  // ──────────────────────────────────────────────────────────────────────────
  var _syncTimers = {};
  function throttledSync(key, fn, delayMs) {
    if (_syncTimers[key]) clearTimeout(_syncTimers[key]);
    _syncTimers[key] = setTimeout(function() {
      _syncTimers[key] = null;
      fn();
    }, delayMs || 1200);
  }

  var HM_Firestore = {
    /**
     * Store student profile
     */
    saveStudent: function(studentObj) {
      var db = getDb();
      if (!db || !studentObj || !studentObj.name) return;
      var docId = sanitizeDocId(studentObj.name);
      var photoUrl = studentObj.profilePhotoUrl || studentObj.profilePhoto || (window.studentProfilePhoto) || null;
      var isBase64 = photoUrl && photoUrl.startsWith('data:');

      var data = {
        id: studentObj.id || studentObj.studentId || ('HM-STU-' + Date.now().toString().slice(-4)),
        studentId: studentObj.studentId || studentObj.id || ('HM-STU-' + Date.now().toString().slice(-4)),
        name: studentObj.name,
        dob: studentObj.dob || '',
        college: studentObj.college || '',
        rollNo: studentObj.rollNo || studentObj.roll || studentObj.studentId || studentObj.id || '',
        status: studentObj.status || 'offline',
        avgScore: studentObj.avgScore || 0,
        examsTaken: studentObj.exams || studentObj.examsTaken || 0,
        profilePhotoUrl: isBase64 ? null : photoUrl,
        deviceInfo: typeof getDeviceInfo === 'function' ? getDeviceInfo() : '',
        registeredAt: studentObj.registeredAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.collection('students').doc(docId).set(data, { merge: true }).catch(function(e){ console.warn("Firestore student save:", e.message); });

      if (isBase64) {
        HM_Cloudinary.upload(photoUrl, 'image', function(cloudinaryUrl) {
          if (cloudinaryUrl) {
            studentObj.profilePhotoUrl = cloudinaryUrl;
            studentObj.profilePhoto = cloudinaryUrl;
            db.collection('students').doc(docId).update({ profilePhotoUrl: cloudinaryUrl }).catch(function(){});
          }
        });
      }
    },

    /**
     * Store face biometric descriptor & snapshot
     */
    saveFace: function(faceKey, faceData) {
      var db = getDb();
      if (!db || !faceKey || !faceData) return;
      var docId = sanitizeDocId(faceKey);
      var photoUrl = faceData.photoUrl || faceData.cloudinaryUrl || null;
      var isBase64 = faceData.snapshot && faceData.snapshot.startsWith('data:');
      if (!photoUrl && !isBase64 && faceData.snapshot) {
        photoUrl = faceData.snapshot;
      }

      var data = {
        faceKey: faceKey,
        studentId: faceData.studentId || faceData.id || '',
        name: faceData.name || faceKey.split('|')[0],
        dob: faceData.dob || (faceKey.split('|')[1] || ''),
        college: faceData.college || '',
        desc: faceData.desc || [],
        photoUrl: photoUrl || null,
        registeredAt: faceData.registeredAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.collection('registered_faces').doc(docId).set(data, { merge: true }).catch(function(e){ console.warn("Firestore face save:", e.message); });

      if (isBase64) {
        HM_Cloudinary.upload(faceData.snapshot, 'image', function(cloudinaryUrl) {
          if (cloudinaryUrl) {
            faceData.snapshot = cloudinaryUrl;
            faceData.photoUrl = cloudinaryUrl;
            db.collection('registered_faces').doc(docId).update({ photoUrl: cloudinaryUrl }).catch(function(){});
          }
        });
      }
    },

    /**
     * Store exam details
     */
    saveExam: function(examObj) {
      var db = getDb();
      if (!db || !examObj || !examObj.code) return;
      var docId = sanitizeDocId(examObj.code);
      var data = JSON.parse(JSON.stringify(examObj));
      data.updatedAt = new Date().toISOString();
      db.collection('exams').doc(docId).set(data, { merge: true }).catch(function(e){ console.warn("Firestore exam save:", e.message); });
    },

    deleteExam: function(examCode) {
      var db = getDb();
      if (!db || !examCode) return;
      var docId = sanitizeDocId(examCode);
      db.collection('exams').doc(docId).delete().catch(function(e){ console.warn("Firestore exam delete:", e.message); });
    },

    /**
     * Store live exam proctoring session
     */
    saveSession: function(studentName, sessionObj) {
      var db = getDb();
      if (!db || !studentName || !sessionObj) return;
      var docId = sanitizeDocId(studentName);
      var data = JSON.parse(JSON.stringify(sessionObj));

      if (data.profilePhoto && data.profilePhoto.startsWith('data:')) {
        data.profilePhoto = (window.studentProfilePhoto && !window.studentProfilePhoto.startsWith('data:')) ? window.studentProfilePhoto : null;
      }
      if (Array.isArray(data.violations)) {
        data.violations = data.violations.map(function(v) {
          var vClean = Object.assign({}, v);
          if (vClean.photo && vClean.photo.startsWith('data:')) {
            vClean.photo = vClean.photoUrl || null;
          }
          return vClean;
        });
      }
      data.updatedAt = new Date().toISOString();
      db.collection('sessions').doc(docId).set(data, { merge: true }).catch(function(e){ console.warn("Firestore session save:", e.message); });
    },

    /**
     * Store proctoring violation incident
     */
    saveViolation: function(violationObj) {
      var db = getDb();
      if (!db || !violationObj) return;
      var studentName = violationObj.student || (window.currentStudent && currentStudent.name) || 'anon';
      var docId = 'v_' + (violationObj.id || Date.now()) + '_' + sanitizeDocId(studentName);
      var data = JSON.parse(JSON.stringify(violationObj));
      data.student = studentName;

      var isBase64 = data.photo && data.photo.startsWith('data:');
      if (isBase64) {
        data.photoUrl = null;
        delete data.photo;
      } else {
        data.photoUrl = data.photo || data.photoUrl || null;
      }
      data.createdAt = violationObj.fullTimestamp || new Date().toISOString();
      db.collection('violations').doc(docId).set(data, { merge: true }).catch(function(e){ console.warn("Firestore violation save:", e.message); });

      if (isBase64) {
        HM_Cloudinary.upload(violationObj.photo, 'image', function(cloudinaryUrl) {
          if (cloudinaryUrl) {
            violationObj.photo = cloudinaryUrl;
            violationObj.photoUrl = cloudinaryUrl;
            db.collection('violations').doc(docId).update({ photoUrl: cloudinaryUrl, photo: cloudinaryUrl }).catch(function(){});
          }
        });
      }
    },

    /**
     * Store student login event
     */
    saveLoginEntry: function(loginObj) {
      var db = getDb();
      if (!db || !loginObj) return;
      var docId = 'log_' + (loginObj.id || Date.now()) + '_' + sanitizeDocId(loginObj.name || 'anon');
      var data = JSON.parse(JSON.stringify(loginObj));
      var isBase64 = data.photo && data.photo.startsWith('data:');
      if (isBase64) {
        data.photoUrl = null;
        delete data.photo;
      } else {
        data.photoUrl = data.photo || data.photoUrl || null;
      }
      data.createdAt = loginObj.fullTimestamp || new Date().toISOString();
      db.collection('login_history').doc(docId).set(data, { merge: true }).catch(function(e){ console.warn("Firestore login save:", e.message); });

      if (isBase64) {
        HM_Cloudinary.upload(loginObj.photo, 'image', function(cloudinaryUrl) {
          if (cloudinaryUrl) {
            loginObj.photo = cloudinaryUrl;
            loginObj.photoUrl = cloudinaryUrl;
            db.collection('login_history').doc(docId).update({ photoUrl: cloudinaryUrl, photo: cloudinaryUrl }).catch(function(){});
          }
        });
      }
    },

    /**
     * Store exam submission
     */
    saveSubmission: function(submissionObj) {
      var db = getDb();
      if (!db || !submissionObj) return;
      var docId = 'sub_' + sanitizeDocId(submissionObj.examCode || 'exam') + '_' + sanitizeDocId(submissionObj.studentName || 'stu');
      var data = JSON.parse(JSON.stringify(submissionObj));
      if (data.studentPhoto && data.studentPhoto.startsWith('data:')) {
        data.studentPhoto = (window.studentProfilePhoto && !window.studentProfilePhoto.startsWith('data:')) ? window.studentProfilePhoto : null;
      }
      data.submittedAt = data.submittedAt || new Date().toISOString();
      db.collection('submissions').doc(docId).set(data, { merge: true }).catch(function(e){ console.warn("Firestore submission save:", e.message); });
    },

    /**
     * Batch Sync functions
     */
    syncAll: function() {
      var db = getDb();
      if (!db) return;
      throttledSync('hm_db_all', function() {
        (window.EXAMS || []).forEach(function(e){ HM_Firestore.saveExam(e); });
        (window.STUDENTS || []).forEach(function(s){ HM_Firestore.saveStudent(s); });
        ((window.HM_DB && HM_DB.violations) || []).forEach(function(v){ HM_Firestore.saveViolation(v); });
        ((window.HM_DB && HM_DB.loginHistory) || []).forEach(function(l){ HM_Firestore.saveLoginEntry(l); });
        ((window.HM_DB && HM_DB.submissions) || []).forEach(function(sub){ HM_Firestore.saveSubmission(sub); });
      });
    },

    syncSessions: function() {
      var db = getDb();
      if (!db) return;
      throttledSync('sessions', function() {
        Object.keys(window.LIVE_SESSIONS || {}).forEach(function(k){
          HM_Firestore.saveSession(k, LIVE_SESSIONS[k]);
        });
      });
    },

    syncFaces: function() {
      var db = getDb();
      if (!db) return;
      throttledSync('faces', function() {
        Object.keys(window.registeredFaceData || {}).forEach(function(k){
          HM_Firestore.saveFace(k, registeredFaceData[k]);
        });
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Global Exports & Backward-Compatible Aliases
  // ──────────────────────────────────────────────────────────────────────────
  window.HM_Cloudinary = HM_Cloudinary;
  window.HM_Firestore = HM_Firestore;

  // Cloudinary aliases
  window.uploadToCloudinary = HM_Cloudinary.upload;
  window.uploadFacePhotoAsync = HM_Cloudinary.uploadFacePhoto;
  window.uploadViolationPhotoAsync = HM_Cloudinary.uploadViolationPhoto;
  window.uploadLoginPhotoAsync = HM_Cloudinary.uploadLoginPhoto;

  // Firestore aliases
  window.firebaseSaveStudent = HM_Firestore.saveStudent;
  window.firebaseSaveFace = HM_Firestore.saveFace;
  window.firebaseSaveExam = HM_Firestore.saveExam;
  window.firebaseDeleteExamDoc = HM_Firestore.deleteExam;
  window.firebaseSaveSession = HM_Firestore.saveSession;
  window.firebaseSaveViolationEntry = HM_Firestore.saveViolation;
  window.firebaseSaveLoginEntry = HM_Firestore.saveLoginEntry;
  window.firebaseSaveSubmission = HM_Firestore.saveSubmission;
  window.firebaseSyncDb = HM_Firestore.syncAll;
  window.firebaseSyncSessions = HM_Firestore.syncSessions;
  window.firebaseSyncFaces = HM_Firestore.syncFaces;

  console.log("✓ HexaMinds Firebase & Cloudinary Services loaded successfully.");
})(window);
