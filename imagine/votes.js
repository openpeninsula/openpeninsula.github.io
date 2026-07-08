/* Concept-card voting. Injects a full-width "I'd use this" button into each
   votable card (id from its t-<name> thumb class), shows live counts from /votes,
   and lets each browser back/un-back an idea (one positive vote, toggleable — no
   downvoting other people's ideas). Works offline via localStorage. No deps. */
(function () {
  var ENDPOINT = window.VOTES_ENDPOINT || '/votes';
  var LS_VOTED = 'wctv_voted';
  var LS_LOCAL = 'wctv_votes_local';
  var LS_NUDGE = 'wctv_nudge_shown';
  var RE = /t-(sand|roller|move|market|ware|book)\b/;

  var map = {}; // id -> { btn, label, count }
  var voted = load(LS_VOTED) || {};
  var localCounts = load(LS_LOCAL) || {};
  var server = {};

  document.querySelectorAll('.card').forEach(function (card) {
    var thumb = card.querySelector('.thumb');
    var body = card.querySelector('.body');
    if (!thumb || !body) return;
    var m = thumb.className.match(RE);
    if (!m) return; // skip the blank "Your idea here" card
    var id = m[1];

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'vote';
    btn.setAttribute('data-id', id);
    btn.innerHTML = '<span class="vlabel"></span><span class="vcount">0</span>';
    body.appendChild(btn);

    map[id] = { btn: btn, label: btn.querySelector('.vlabel'), count: btn.querySelector('.vcount') };
    paintState(id);
    render(id);
    btn.addEventListener('click', function () { toggle(id); });
  });

  function paintState(id) {
    var on = !!voted[id];
    map[id].btn.classList.toggle('is-voted', on);
    map[id].label.textContent = on ? 'You’re in' : 'I’d use this';
  }
  function render(id) {
    map[id].count.textContent = (server[id] || 0) + (localCounts[id] || 0);
  }

  function toggle(id) {
    var on = !voted[id];
    voted[id] = on ? 1 : 0; save(LS_VOTED, voted);
    paintState(id);
    if (on) showNudge();

    // optimistic bump
    server[id] = Math.max(0, (server[id] || 0) + (on ? 1 : -1));
    render(id);

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, delta: on ? 1 : -1 }),
    })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) { if (d && typeof d.count === 'number') { server[id] = d.count; render(id); } })
      .catch(function () {
        // no backend: keep the change locally so it still feels real
        localCounts[id] = Math.max(0, (localCounts[id] || 0) + (on ? 1 : -1));
        server[id] = Math.max(0, (server[id] || 0) - (on ? 1 : -1)); // undo the optimistic server bump
        save(LS_LOCAL, localCounts); render(id);
      });
  }

  // initial counts
  fetch(ENDPOINT)
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (counts) { server = counts || {}; Object.keys(map).forEach(render); })
    .catch(function () { Object.keys(map).forEach(render); }); // offline → local-only

  function showNudge() {
    if (localStorage.getItem(LS_NUDGE)) return;
    try { localStorage.setItem(LS_NUDGE, '1'); } catch (e) {}
    var n = document.createElement('div');
    n.className = 'vote-nudge';
    n.setAttribute('role', 'status');
    n.innerHTML = '<button class="vote-nudge-x" type="button" aria-label="Dismiss">&times;</button>' +
      '<svg class="vote-nudge-ico" viewBox="0 0 24 24" fill="none" stroke="#f4b942" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.2"/><path d="M12 16.5v-5"/><path d="M12 8v0.01"/></svg>' +
      '<p>You just backed an idea. But the council counts <b>objections</b>, not this board. ' +
      '<a href="https://openpeninsula.github.io/secret-cinema/#object" target="_blank" rel="noopener">Object before 21 July &rarr;</a></p>';
    document.body.appendChild(n);
    requestAnimationFrame(function () { n.classList.add('show'); });
    var t = setTimeout(hide, 12000);
    function hide() { clearTimeout(t); n.classList.remove('show'); setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 300); }
    n.querySelector('.vote-nudge-x').addEventListener('click', hide);
  }

  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
})();
