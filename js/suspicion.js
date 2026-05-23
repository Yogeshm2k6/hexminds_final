/* =====================================================
   SUSPICION SCORE SYSTEM
===================================================== */
function getSuspicionLevel(score) {
  if (score < 30) return { label: 'LOW', cls: 'susp-low', strokeCls: 'susp-stroke-low' };
  if (score < 70) return { label: 'MEDIUM', cls: 'susp-medium', strokeCls: 'susp-stroke-medium' };
  return { label: 'HIGH', cls: 'susp-high', strokeCls: 'susp-stroke-high' };
}

function buildSuspicionGauge(score) {
  var r = 46; var circ = 2 * Math.PI * r;
  var pct = Math.min(score, 100) / 100;
  var offset = circ * (1 - pct);
  var lvl = getSuspicionLevel(score);
  return '<div class="suspicion-gauge-wrap">' +
    '<svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">' +
      '<circle class="suspicion-gauge-bg" cx="60" cy="60" r="' + r + '" />' +
      '<circle class="suspicion-gauge-fill ' + lvl.strokeCls + '" cx="60" cy="60" r="' + r + '" ' +
        'stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + offset.toFixed(1) + '" />' +
    '</svg>' +
    '<div class="suspicion-label">' +
      '<div class="suspicion-pct ' + lvl.cls + '">' + score + '</div>' +
      '<div class="suspicion-tag ' + lvl.cls + '">' + lvl.label + '</div>' +
    '</div>' +
  '</div>';
}

function updateSuspicionScore(increment) {
  suspicionScore = Math.min(100, suspicionScore + increment);
  /* Update gauge if exam active */
  var gauge = document.getElementById('live-suspicion-gauge');
  if (gauge) {
    var r = 46; var circ = 2 * Math.PI * r;
    var pct = suspicionScore / 100;
    var offset = circ * (1 - pct);
    var lvl = getSuspicionLevel(suspicionScore);
    var fill = gauge.querySelector('.suspicion-gauge-fill');
    var pctEl = gauge.querySelector('.suspicion-pct');
    var tagEl = gauge.querySelector('.suspicion-tag');
    if (fill) { fill.setAttribute('stroke-dashoffset', offset.toFixed(1)); fill.className = 'suspicion-gauge-fill ' + lvl.strokeCls; }
    if (pctEl) { pctEl.textContent = suspicionScore; pctEl.className = 'suspicion-pct ' + lvl.cls; pctEl.style.animation = 'scoreUp .3s ease'; setTimeout(function(){ if(pctEl) pctEl.style.animation=''; }, 300); }
    if (tagEl) { tagEl.textContent = lvl.label; tagEl.className = 'suspicion-tag ' + lvl.cls; }
  }
}

