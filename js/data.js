/* =====================================================
   DATA — Pre-populated demo students
===================================================== */
var STUDENTS = [
  {id:1, name:'Arjun Sharma',  dob:'2002-06-14', college:'IIT Bombay',     exams:3, avgScore:88, status:'offline', violations:[
    {type:'Tab Switch',       time:'10:14:22', exam:'CS101',   severity:'medium', desc:'Student switched browser tab during exam session.'},
    {type:'Face Not Detected',time:'10:21:05', exam:'CS101',   severity:'high',   desc:'No face visible in camera frame for 12 seconds.'}
  ]},
  {id:2, name:'Priya Nair',    dob:'2003-01-28', college:'NIT Trichy',     exams:4, avgScore:94, status:'offline', violations:[]},
  {id:3, name:'Rohan Mehta',   dob:'2001-11-03', college:'BITS Pilani',    exams:5, avgScore:61, status:'offline', violations:[
    {type:'Phone Detected',   time:'09:45:33', exam:'MATH201', severity:'high',   desc:'AI detected a mobile phone held in frame.'},
    {type:'Tab Switch',       time:'09:52:11', exam:'MATH201', severity:'medium', desc:'Browser tab was switched 3 times in 5 minutes.'},
    {type:'Multiple Faces',   time:'10:01:44', exam:'MATH201', severity:'high',   desc:'More than one face detected in the camera frame.'},
    {type:'Face Not Detected',time:'10:08:20', exam:'MATH201', severity:'high',   desc:'Face absent from frame for over 20 seconds.'}
  ]},
  {id:4, name:'Sneha Iyer',    dob:'2002-08-17', college:'VIT Vellore',    exams:2, avgScore:79, status:'offline', violations:[
    {type:'Tab Switch',       time:'11:30:10', exam:'HIST101', severity:'medium', desc:'Student navigated away from the exam tab once.'}
  ]},
  {id:5, name:'Kiran Rao',     dob:'2003-03-22', college:'PESIT Bangalore',exams:3, avgScore:85, status:'offline', violations:[]}
];

var LIVE_SESSIONS = {};

var EXAMS = [
  {id:1, title:'Computer Science 101',code:'CS101',  questions:5, duration:60, status:'active',    enrolled:34, date:'2026-04-28'},
  {id:2, title:'Mathematics Midterm', code:'MATH201',questions:5, duration:90, status:'completed', enrolled:28, date:'2026-04-20'},
  {id:3, title:'World History Quiz',  code:'HIST101',questions:5, duration:30, status:'active',    enrolled:22, date:'2026-04-28'}
];

var QUESTIONS = [
  {id:1, q:'Which data structure uses Last-In-First-Out (LIFO)?',   opts:['Queue','Stack','Linked List','Binary Tree'],                                                                      ans:1},
  {id:2, q:'Time complexity of binary search on n elements?',       opts:['O(n)','O(n²)','O(log n)','O(1)'],                                                                                ans:2},
  {id:3, q:'Which is NOT an object-oriented programming language?', opts:['Java','Python','C++','Assembly'],                                                                                ans:3},
  {id:4, q:'What does HTML stand for?',                             opts:['HyperText Markup Language','High-Tech Modern Language','HyperText Modeling Language','Home Tool Markup Language'],ans:0},
  {id:5, q:'What does DNS stand for?',                              opts:['Data Network System','Domain Name System','Dynamic Number Service','Digital Name Server'],                       ans:1}
];

var studentExams = [
  {id:1, title:'Computer Science 101', code:'CS101',  questions:5, duration:60, status:'available', date:'2026-04-28', score:null},
  {id:2, title:'World History Quiz',   code:'HIST101',questions:5, duration:30, status:'completed', date:'2026-04-20', score:82}
];

