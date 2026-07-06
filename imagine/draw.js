/* Draw-your-idea pad — vanilla canvas, pointer + touch, undo via snapshots.
   Shared by index.html and index-scribbles.html. No dependencies. */
(function () {
  var canvas = document.getElementById('idea-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var dpr = Math.max(1, window.devicePixelRatio || 1);
  var pad = canvas.closest('.drawpad');

  var tool = 'pen', color = '#1d1b16', size = 4;
  var drawing = false, last = null, undo = [], dirty = false;
  var bl = 0, bt = 0; // canvas border widths, i.e. the content-box offset

  function paintBg() {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  function setup() {
    // Size the bitmap to the CONTENT box (clientWidth/Height exclude the border),
    // so the drawing surface maps 1:1 to what's shown and the cursor lines up.
    var cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw) return;
    var cs = getComputedStyle(canvas);
    bl = parseFloat(cs.borderLeftWidth) || 0;
    bt = parseFloat(cs.borderTopWidth) || 0;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBg();
    undo = [];
    dirty = false;
  }
  function snapshot() {
    try {
      undo.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (undo.length > 50) undo.shift();
    } catch (e) { /* tainted/oversize — skip */ }
  }
  function restore() {
    if (!undo.length) return;
    var img = undo.pop();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.putImageData(img, 0, 0); ctx.restore();
  }
  function pos(e) {
    var r = canvas.getBoundingClientRect();
    var cw = canvas.clientWidth || 1, ch = canvas.clientHeight || 1;
    // Cursor position inside the content box (minus the border), then scaled into
    // the bitmap's CSS-space so it stays accurate even if the layout reflowed.
    return {
      x: (e.clientX - r.left - bl) * (canvas.width / dpr) / cw,
      y: (e.clientY - r.top - bt) * (canvas.height / dpr) / ch
    };
  }
  function line(a, b) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (tool === 'eraser') { ctx.strokeStyle = '#fff'; ctx.globalAlpha = 1; ctx.lineWidth = size * 3.2; }
    else if (tool === 'highlight') { ctx.strokeStyle = color; ctx.globalAlpha = 0.3; ctx.lineWidth = size * 3.6; }
    else { ctx.strokeStyle = color; ctx.globalAlpha = 1; ctx.lineWidth = size; }
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function down(e) {
    e.preventDefault();
    drawing = true; dirty = true; snapshot();
    last = pos(e); line(last, { x: last.x + 0.01, y: last.y + 0.01 });
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  }
  function move(e) { if (!drawing) return; var p = pos(e); line(last, p); last = p; }
  function up() { drawing = false; last = null; }

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);

  function sel(q, el) {
    pad.querySelectorAll(q).forEach(function (n) { n.classList.toggle('is-on', n === el); });
  }
  pad.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b || !pad.contains(b)) return;
    if (b.dataset.tool) { tool = b.dataset.tool; sel('#dp-tools .dp-btn[data-tool]', b); }
    else if (b.dataset.act === 'undo') { restore(); }
    else if (b.dataset.act === 'clear') { snapshot(); paintBg(); }
    else if (b.dataset.size) { size = +b.dataset.size; sel('#dp-sizes .dp-size', b); }
    else if (b.dataset.color) {
      color = b.dataset.color;
      if (tool === 'eraser') { tool = 'pen'; sel('#dp-tools .dp-btn[data-tool]', pad.querySelector('[data-tool="pen"]')); }
      sel('#dp-colors .dp-color', b);
    }
  });

  // expose the pad to the submit handler (submit.js)
  window.IdeaPad = {
    toDataURL: function () { return canvas.toDataURL('image/png'); },
    isBlank: function () { return !dirty; },
    reset: setup,
  };

  if (document.readyState === 'complete') setup();
  else window.addEventListener('load', setup);
  window.addEventListener('resize', function () { /* keep it simple: don't wipe mid-session */ });
})();
