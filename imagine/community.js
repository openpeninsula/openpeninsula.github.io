/* Appends published community ideas onto the board, just before the blank
   "Your Idea Here" card, in the same card style (their scribble becomes the
   doodle). Shows a batch, then a "Load more" button. Fails silently if the
   /board endpoint is empty or unreachable, so the page is unaffected until
   you publish ideas from admin.html. No dependencies. */
(function () {
  var grid = document.querySelector('#board .grid');
  if (!grid) return;

  var ENDPOINT = window.BOARD_ENDPOINT || '/board';
  var PAGE = 6;
  var items = [], shown = 0, moreBtn = null;

  // find the blank "add yours" card so community ideas insert before it
  var blank = null;
  grid.querySelectorAll('.card').forEach(function (c) {
    var t = c.querySelector('.thumb');
    if (t && /\bt-blank\b/.test(t.className)) blank = c;
  });

  fetch(ENDPOINT)
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) {
      items = Array.isArray(list) ? list : [];
      if (!items.length) return;
      renderNext();
      if (shown < items.length) addMoreButton();
    })
    .catch(function () { /* no backend yet — leave the board as-is */ });

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function card(it) {
    var art = document.createElement('article');
    art.className = 'card';
    var thumb = it.drawing
      ? '<div class="thumb has-doodle t-community"><img class="doodle" src="' + esc(it.drawing) +
        '" alt="" loading="lazy" /><span class="imagined">Imagined use · from a neighbour</span></div>'
      : '<div class="thumb t-community">✏️<span class="imagined">Imagined use · from a neighbour</span></div>';
    var by = it.name ? '<span class="tag">✏️ ' + esc(it.name) + '</span>' : '';
    art.innerHTML =
      thumb +
      '<div class="body"><h3>' + esc(it.title || 'An idea') + '</h3>' +
      '<p class="desc">' + esc(it.blurb || '') + '</p>' +
      '<div class="tags">' + by + '</div></div>';
    return art;
  }

  function renderNext() {
    var frag = document.createDocumentFragment();
    var end = Math.min(shown + PAGE, items.length);
    for (var i = shown; i < end; i++) frag.appendChild(card(items[i]));
    if (blank) grid.insertBefore(frag, blank);
    else grid.appendChild(frag);
    shown = end;
    if (moreBtn && shown >= items.length) moreBtn.remove();
  }

  function addMoreButton() {
    moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = 'load-more';
    moreBtn.textContent = 'Load more ideas';
    moreBtn.addEventListener('click', renderNext);
    grid.parentNode.appendChild(moreBtn);
  }
})();
