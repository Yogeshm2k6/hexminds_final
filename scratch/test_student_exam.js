const { spawn } = require('child_process');
const http = require('http');

async function testStudentFlow(targetUrl) {
  console.log(`\n========================================`);
  console.log(`TESTING STUDENT EXAM ON: ${targetUrl}`);
  console.log(`========================================`);

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=C:\\Users\\yoges\\.gemini\\antigravity-ide\\brain\\fbd96966-8ff1-4893-87bd-05f9e74e68f0\\scratch\\edge_profile_student',
    '--no-first-run',
    '--no-default-browser-check',
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    targetUrl
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json', (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });
      const pages = JSON.parse(res);
      const targetPage = pages.find(p => p.type === 'page');
      if (targetPage && targetPage.webSocketDebuggerUrl) {
        wsUrl = targetPage.webSocketDebuggerUrl;
        break;
      }
    } catch(e) {}
  }

  if (!wsUrl) {
    console.error('Failed to connect to Edge DevTools');
    edgeProc.kill();
    return;
  }

  const ws = new WebSocket(wsUrl);
  await new Promise(resolve => ws.onopen = resolve);

  let id = 1;
  function send(method, params = {}) {
    return new Promise(resolve => {
      const reqId = id++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === reqId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.exceptionThrown') {
      console.error('🚨 [EXCEPTION]:', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description || '');
    } else if (msg.method === 'Runtime.consoleAPICalled') {
      const type = msg.params.type;
      const args = (msg.params.args || []).map(a => a.value || a.description || '').join(' ');
      if (type === 'error') console.error(`🔴 [CONSOLE.ERROR]: ${args}`);
      else console.log(`ℹ️ [CONSOLE.${type.toUpperCase()}]: ${args}`);
    }
  };

  await send('Console.enable');
  await send('Runtime.enable');

  await new Promise(r => setTimeout(r, 2000));

  // Check student login functions exist and simulate phone detection
  let testRes = await send('Runtime.evaluate', {
    expression: `(function(){
      return {
        hasCocoSsdLoadedFunc: typeof ensureCocoSsdLoaded === 'function',
        hasCheckPhoneFunc: typeof checkPhoneInPredictions === 'function',
        hasCheckContinuousBio: typeof checkContinuousIdentityVerification === 'function',
        phoneClassesCount: (typeof PHONE_CLASSES !== 'undefined') ? PHONE_CLASSES.length : 0,
        hasPhoneClasses: (typeof PHONE_CLASSES !== 'undefined') ? PHONE_CLASSES.includes('cellphone') : false
      };
    })()`,
    returnByValue: true
  });
  console.log('Features check:', testRes.result?.value);

  // Test phone detection triggering
  let phoneDetectionTest = await send('Runtime.evaluate', {
    expression: `(function(){
      try {
        window.examActive = true;
        window.currentStudent = { name: 'TestStudent', studentId: 'TEST-01' };
        window.LIVE_SESSIONS = window.LIVE_SESSIONS || {};
        window.LIVE_SESSIONS['TestStudent'] = { name: 'TestStudent', violations: [], status: 'exam' };
        
        // Mock prediction with phone
        var mockPreds = [{ class: 'cell phone', score: 0.85 }];
        checkPhoneInPredictions(mockPreds);
        
        return {
          phoneDetected: window.phoneDetected,
          violationCount: window.violationCount,
          bannerText: document.getElementById('auto-submit-banner') ? document.getElementById('auto-submit-banner').textContent : ''
        };
      } catch(e) {
        return { error: e.toString() };
      }
    })()`,
    returnByValue: true
  });
  console.log('Phone detection simulation result:', phoneDetectionTest.result?.value);

  ws.close();
  edgeProc.kill();
  await new Promise(r => setTimeout(r, 1000));
}

async function run() {
  await testStudentFlow('http://localhost:8000/index.html');
  await testStudentFlow('http://localhost:8000/exam.html');
  process.exit(0);
}

run();
