/* =====================================================
   PARTICLE LOGIN BACKGROUND
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

  for (var i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - .5) * .5,
      vy: (Math.random() - .5) * .5,
      r: Math.random() * 2 + .5,
      a: Math.random()
    });
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    /* Hexagonal grid */
    ctx.strokeStyle = 'rgba(56,189,248,0.04)';
    ctx.lineWidth = 1;
    var hex = 50;
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
        if (dist < 100) {
          ctx.strokeStyle = 'rgba(56,189,248,' + (.15 * (1 - dist/100)) + ')';
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
   WAVEFORM ANIMATION
===================================================== */
var waveOffset = 0;
var waveInterval = null;

function startWaveform() {
  var canvas = document.getElementById('waveform-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  waveInterval = setInterval(function() {
    var w = canvas.offsetWidth; var h = 36;
    canvas.width = w; canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    waveOffset += .08;
    ctx.beginPath();
    ctx.strokeStyle = examActive ? 'rgba(34,197,94,0.7)' : 'rgba(56,189,248,0.4)';
    ctx.lineWidth = 1.5;
    for (var x = 0; x < w; x++) {
      var y = h/2 + Math.sin(x * .06 + waveOffset) * 7 + Math.sin(x * .12 + waveOffset * 1.3) * 4;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    /* Second wave */
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(56,189,248,0.25)';
    for (var x = 0; x < w; x++) {
      var y = h/2 + Math.sin(x * .04 + waveOffset * .7) * 5 + Math.sin(x * .09 + waveOffset * 1.8) * 3;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, 40);
}

function stopWaveform() { clearInterval(waveInterval); waveInterval = null; }

