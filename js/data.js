/* =====================================================
   HEXAMINDS DATA — Default Registries, Exams & Questions
===================================================== */

var DEFAULT_QUESTIONS = [
  {
    id: 1,
    q: 'Which data structure follows the Last-In-First-Out (LIFO) principle?',
    opts: ['Queue', 'Stack', 'Linked List', 'Binary Search Tree'],
    ans: 1,
    type: 'MCQ',
    marks: 1
  },
  {
    id: 2,
    q: 'What is the average time complexity of Binary Search on a sorted array of n elements?',
    opts: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],
    ans: 2,
    type: 'MCQ',
    marks: 1
  },
  {
    id: 3,
    q: 'Which of the following is NOT an Object-Oriented Programming (OOP) pillar?',
    opts: ['Encapsulation', 'Inheritance', 'Compilation', 'Polymorphism'],
    ans: 2,
    type: 'MCQ',
    marks: 1
  },
  {
    id: 4,
    q: 'What does HTML stand for in web development?',
    opts: [
      'HyperText Markup Language',
      'High-Tech Modern Language',
      'HyperText Modeling Language',
      'Home Tool Markup Language'
    ],
    ans: 0,
    type: 'MCQ',
    marks: 1
  },
  {
    id: 5,
    q: 'Which cryptographic hash function produces a 512-bit message digest?',
    opts: ['MD5', 'SHA-1', 'SHA-512', 'DES'],
    ans: 2,
    type: 'MCQ',
    marks: 1
  }
];

var DEFAULT_EXAMS = [
  {
    id: 1,
    title: 'Computer Science 101 — Foundation Assessment',
    code: 'CS101',
    questions: 5,
    duration: 60,
    status: 'active',
    published: true,
    enrolled: 42,
    date: '2026-10-28',
    startTime: '00:00',
    endTime: '23:59',
    targetDept: 'All Departments',
    targetYear: 'All Years',
    targetCollege: 'All Colleges',
    questionsList: DEFAULT_QUESTIONS
  },
  {
    id: 2,
    title: 'Artificial Intelligence & Biometrics Systems',
    code: 'AI201',
    questions: 5,
    duration: 45,
    status: 'active',
    published: true,
    enrolled: 36,
    date: '2026-10-28',
    startTime: '00:00',
    endTime: '23:59',
    targetDept: 'All Departments',
    targetYear: 'All Years',
    targetCollege: 'All Colleges',
    questionsList: DEFAULT_QUESTIONS
  }
];

var DEFAULT_STUDENT_EXAMS = [
  {
    id: 1,
    title: 'Computer Science 101 — Foundation Assessment',
    code: 'CS101',
    questions: 5,
    duration: 60,
    status: 'available',
    published: true,
    date: '2026-10-28',
    startTime: '00:00',
    endTime: '23:59',
    score: null,
    questionsList: DEFAULT_QUESTIONS
  },
  {
    id: 2,
    title: 'Artificial Intelligence & Biometrics Systems',
    code: 'AI201',
    questions: 5,
    duration: 45,
    status: 'available',
    published: true,
    date: '2026-10-28',
    startTime: '00:00',
    endTime: '23:59',
    score: null,
    questionsList: DEFAULT_QUESTIONS
  }
];

// Initialize global registries with default active exams
var STUDENTS = [];
var LIVE_SESSIONS = {};
var EXAMS = JSON.parse(JSON.stringify(DEFAULT_EXAMS));
var QUESTIONS = JSON.parse(JSON.stringify(DEFAULT_QUESTIONS));
var studentExams = JSON.parse(JSON.stringify(DEFAULT_STUDENT_EXAMS));

// Expose defaults globally
window.DEFAULT_QUESTIONS = DEFAULT_QUESTIONS;
window.DEFAULT_EXAMS = DEFAULT_EXAMS;
window.DEFAULT_STUDENT_EXAMS = DEFAULT_STUDENT_EXAMS;
window.EXAMS = EXAMS;
window.QUESTIONS = QUESTIONS;
window.studentExams = studentExams;
window.STUDENTS = STUDENTS;
window.LIVE_SESSIONS = LIVE_SESSIONS;
