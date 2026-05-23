/* =====================================================
   HEXAMINDS — GLOBAL STATE
   All camera detection via browser getUserMedia + Face Detection API
   Violations limit: 2 → auto-submit (STRICT MODE)
===================================================== */
var role = 'student';
var currentStudent = {};
var examAnswers = {};
var examTimer = null;
var examTimeLeft = 3600;
var camStream = null;
var examRecorder = null;
var examRecChunks = [];
var examRecBlobUrl = null;
var faceLoopInterval = null;
var examActive = false;
var violationCount = 0;
var lastBlurTime = 0;
var lastFaceState = 'normal';
var sessionViolations = [];
var toastTimeout = null;
var noFaceConsecutive = 0;
var noFaceWarningCount = 0;        /* 0 = never warned, 1 = warned once → 2nd triggers auto-submit */
var multipleFacesAutoSubmitted = false; /* prevent re-triggering multiple-face auto-submit */
var phoneDetected = false;
var phoneDetectionInterval = null;
var socket = null;
var faceDetector = null;
var suspicionScore = 0; /* 0–100 suspicion percentage */
var MAX_VIOLATIONS = 5; /* General violation auto-submit threshold (multi-face / phone / no-face are INSTANT) */
var gazeAwayConsecutive = 0;
var gazeWarningCooldown = 0;

/* Face Verification State */
var fvStream = null;
var fvMode = null;
var fvPendingStudent = null;
var registeredFaceData = {};
var fvCountdown = null;
var autoSubmitCountdown = null;
var autoSubmitSecondsLeft = 0;
var studentProfilePhoto = null; /* Base64 profile photo captured at login */

/* ─ Particle System ─ */
var particles = [];
var animFrame;

