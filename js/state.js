/* =====================================================
   HEXAMINDS — GLOBAL STATE
   All camera detection via browser getUserMedia + Face Detection API
   Violations limit: 2 → auto-submit (STRICT MODE)
===================================================== */
var role = 'student';
var currentStudent = {};
var currentStaff = null;

/* Default Department Profiles */
var DEFAULT_DEPARTMENTS = [
  {
    id: 'dept_cse',
    code: 'CSE',
    name: 'Computer Science & Engineering',
    hod: 'Dr. Anand Kumar',
    email: 'hod.cse@hexaminds.edu',
    phone: '+91 98765 43210',
    college: 'HexaMinds Institute of Technology',
    years: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    description: 'Premier department focusing on Artificial Intelligence, Software Engineering, Cloud Computing, and Cybersecurity.',
    status: 'active'
  },
  {
    id: 'dept_ise',
    code: 'ISE',
    name: 'Information Science & Engineering',
    hod: 'Dr. Meera Nambiar',
    email: 'hod.ise@hexaminds.edu',
    phone: '+91 98765 43211',
    college: 'HexaMinds Institute of Technology',
    years: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    description: 'Department specializing in Data Science, Distributed Systems, Web Technologies, and Database Management.',
    status: 'active'
  },
  {
    id: 'dept_ece',
    code: 'ECE',
    name: 'Electronics & Communication Engineering',
    hod: 'Dr. Rajesh Deshmukh',
    email: 'hod.ece@hexaminds.edu',
    phone: '+91 98765 43212',
    college: 'HexaMinds Institute of Technology',
    years: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    description: 'Specialization in VLSI, Embedded Systems, Signal Processing, IoT, and Next-Gen Wireless Telecommunication.',
    status: 'active'
  },
  {
    id: 'dept_aiml',
    code: 'AI&DS',
    name: 'Artificial Intelligence & Data Science',
    hod: 'Dr. Kavita Pillai',
    email: 'hod.aiml@hexaminds.edu',
    phone: '+91 98765 43213',
    college: 'HexaMinds Institute of Technology',
    years: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    description: 'Specialized program for Deep Learning, Neural Networks, Computer Vision, and Big Data Analytics.',
    status: 'active'
  },
  {
    id: 'dept_mech',
    code: 'MECH',
    name: 'Mechanical Engineering',
    hod: 'Dr. Vikramaditya Singh',
    email: 'hod.mech@hexaminds.edu',
    phone: '+91 98765 43214',
    college: 'HexaMinds Institute of Technology',
    years: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    description: 'Core engineering discipline offering expertise in Robotics, CAD/CAM, Thermal Systems, and Mechatronics.',
    status: 'active'
  }
];

var DEPARTMENTS = JSON.parse(JSON.stringify(DEFAULT_DEPARTMENTS));
try {
  var savedDepts = localStorage.getItem('hm_departments');
  if (savedDepts) {
    var parsed = JSON.parse(savedDepts);
    if (Array.isArray(parsed) && parsed.length > 0) DEPARTMENTS = parsed;
  }
} catch(e) {}

var staffAccounts = [
  {
    id: 'STF-101',
    name: 'Prof. Sharma',
    username: 'staff',
    password: 'staff123',
    dept: 'Computer Science & Engineering',
    deptCode: 'CSE',
    designation: 'Associate Professor',
    email: 'sharma@hexaminds.edu',
    phone: '+91 98450 11223',
    college: 'HexaMinds Institute of Technology',
    status: 'active'
  },
  {
    id: 'STF-102',
    name: 'Dr. Priya Rao',
    username: 'priya',
    password: 'priya123',
    dept: 'Electronics & Communication Engineering',
    deptCode: 'ECE',
    designation: 'Professor & HOD',
    email: 'priya.rao@hexaminds.edu',
    phone: '+91 98450 44556',
    college: 'HexaMinds Institute of Technology',
    status: 'active'
  }
];
try {
  var savedStaff = localStorage.getItem('hm_staff_accounts');
  if (savedStaff) {
    var parsedStaff = JSON.parse(savedStaff);
    if (Array.isArray(parsedStaff) && parsedStaff.length > 0) staffAccounts = parsedStaff;
  }
} catch(e) {}

window.DEPARTMENTS = DEPARTMENTS;
window.staffAccounts = staffAccounts;
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
try {
  var _rfRaw = localStorage.getItem('hm_registered_faces');
  if (_rfRaw) registeredFaceData = JSON.parse(_rfRaw) || {};
} catch(e) {}
var fvCountdown = null;
var autoSubmitCountdown = null;
var autoSubmitSecondsLeft = 0;
var studentProfilePhoto = null; /* Base64 profile photo captured at login */

/* ─ Particle System ─ */
var particles = [];
var animFrame;

