/* Idea-form submission. POSTs to the backend (/submit by default); if that's
   unreachable (opened from file://, offline, static-only host) it stashes the
   idea in localStorage and still gives friendly feedback. No dependencies.
   Reads the drawing from the canvas via window.IdeaPad (see draw.js). */
(function () {
  var form = document.getElementById('idea-form');
  if (!form) return;

  var ENDPOINT = window.IDEA_ENDPOINT || '/submit';
  var toast = document.getElementById('toast');
  var btn = form.querySelector('.btn');

  function val(el) { return el ? (el.value || '').trim() : ''; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var texts = form.querySelectorAll('input[type="text"]');
    var idea = val(texts[0]);
    var more = val(form.querySelector('textarea'));
    var connection = val(form.querySelector('select'));

    var tags = [];
    form.querySelectorAll('.chip.on').forEach(function (c) { tags.push(c.textContent.trim()); });

    var drawing = '';
    try { if (window.IdeaPad && !window.IdeaPad.isBlank()) drawing = window.IdeaPad.toDataURL(); } catch (_) {}

    if (!idea && !drawing) { if (texts[0]) texts[0].focus(); return; }

    var payload = { idea: idea, more: more, tags: tags, connection: connection, drawing: drawing };

    var origLabel = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Pinning…'; }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function () { finish(true); })
      .catch(function () { stash(payload); finish(false); });

    function finish(sent) {
      if (btn) { btn.disabled = false; btn.textContent = origLabel || 'Pin it to the board →'; }
      if (toast) {
        toast.textContent = sent
          ? 'Pinned. Thanks, that took you less time than nobody asked us in years. 💛'
          : 'Saved on your device. We could not reach the board just now, but your idea counts. 💛';
        toast.classList.add('show');
      }
      form.reset();
      form.querySelectorAll('.chip.on').forEach(function (c) { c.classList.remove('on'); });
      if (window.IdeaPad) window.IdeaPad.reset();
    }

    function stash(p) {
      try {
        var k = 'wctv_ideas';
        var a = JSON.parse(localStorage.getItem(k) || '[]');
        a.push(Object.assign({ ts: new Date().toISOString() }, p));
        localStorage.setItem(k, JSON.stringify(a));
      } catch (_) {}
    }
  });
})();
