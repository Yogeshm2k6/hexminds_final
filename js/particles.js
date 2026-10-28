/* =====================================================
   PARTICLE LOGIN BACKGROUND (OPTIMIZED)
===================================================== */
(function initParticles() {
  var canvas = document.getElementById('login-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  var particles = window.particles || [];
  window.particles = particles;
  for (var i = 0; i < 45; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - .5) * .4,
      vy: (Math.random() - .5) * .4,
      r: Math.random() * 2 + .5,
      a: Math.random()
    });
  }

  function drawParticles() {
    var lp = document.getElementById('login-page');
    // If login page is hidden (e.g. user is in exam or dashboard), sleep loop
    if (lp && lp.classList.contains('hidden')) {
      animFrame = setTimeout(drawParticles, 1000);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    /* Hexagonal grid */
    ctx.strokeStyle = 'rgba(56,189,248,0.04)';
    ctx.lineWidth = 1;
    var hex = 60;
    for (var hx = -hex; hx < canvas.width + hex*2; hx += hex*1.5) {
      for (var hy = -hex; hy < canvas.height + hex*2; hy += hex * Math.sqrt(3)) {
        var offset = (Math.floor(hx / (hex * 1.5)) % 2) * hex * Math.sqrt(3) / 2;
        drawHex(ctx, hx, hy + offset, hex * .48);
      }
    }

    /* Particles */
    particles.forEach(function(p) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      p.a += .005;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56,189,248,' + (Math.sin(p.a) * .3 + .4) + ')';
      ctx.fill();
    });

    /* Connection lines */
    ctx.lineWidth = .6;
    for (var i = 0; i < particles.length; i++) {
      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 90) {
          ctx.strokeStyle = 'rgba(56,189,248,' + (.15 * (1 - dist/90)) + ')';
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
    animFrame = requestAnimationFrame(drawParticles);
  }
  drawParticles();
})();

function drawHex(ctx, x, y, r) {
  ctx.beginPath();
  for (var i = 0; i < 6; i++) {
    var a = Math.PI / 180 * (60 * i - 30);
    if (i === 0) ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
    else ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath(); ctx.stroke();
}

/* =====================================================
   WAVEFORM ANIMATION (OPTIMIZED - NO REFLOW)
===================================================== */
var waveOffset = 0;
var waveInterval = null;

function startWaveform() {
  var canvas = document.getElementById('waveform-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  
  var w = canvas.offsetWidth || 160;
  var h = 36;
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  clearInterval(waveInterval);
  waveInterval = setInterval(function() {
    if (!examActive) {
      clearInterval(waveInterval);
      return;
    }
    var currentW = canvas.offsetWidth || 160;
    if (canvas.width !== currentW) canvas.width = currentW;
    ctx.clearRect(0, 0, currentW, 36);

    waveOffset += .1;
    ctx.beginPath();
    ctx.strokeStyle = examActive ? 'rgba(34,197,94,0.7)' : 'rgba(56,189,248,0.4)';
    ctx.lineWidth = 1.5;
    for (var x = 0; x < currentW; x += 3) {
      var y = 18 + Math.sin(x * .06 + waveOffset) * 6 + Math.sin(x * .12 + waveOffset * 1.3) * 3;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, 80);
}

function stopWaveform() { clearInterval(waveInterval); waveInterval = null; }
