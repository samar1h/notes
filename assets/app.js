// ── Helpers
const el = id => document.getElementById(id);
const CFG = 'notes-cfg';
const getCfg = () => JSON.parse(localStorage.getItem(CFG) || '{}');
const saveCfg = v => localStorage.setItem(CFG, JSON.stringify(v));

function applyCfg(s) {
  const r = document.documentElement;
  r.dataset.theme = s.theme || 'dark';
  r.style.setProperty('--ac', s.accent || '#f0a830');
  r.style.setProperty('--fs', (s.fs || 16) + 'px');
}

// ── Settings sheet (all pages)
const ACCENTS = ['#f0a830','#5dd8a3','#6eb3f7','#f06272','#c06de8','#ff8c42'];

function openSettings() {
  const s = getCfg();
  ['dark','light'].forEach(t => {
    const b = el(t + '-tog');
    b.classList.toggle('on', (s.theme || 'dark') === t);
    b.onclick = () => {
      s.theme = t; saveCfg(s); applyCfg(s);
      ['dark','light'].forEach(x => el(x + '-tog').classList.toggle('on', x === t));
    };
  });
  el('accents').innerHTML = ACCENTS.map(c =>
    `<div class="ac-dot${(s.accent||'#f0a830')===c?' on':''}" style="background:${c}" onclick="pickAccent('${c}')"></div>`
  ).join('');
  el('fs-num').textContent = (s.fs || 16) + 'px';
  el('ov-bg').classList.add('open');
  el('s-sheet').classList.add('open');
}

function closeSettings() {
  el('ov-bg').classList.remove('open');
  el('s-sheet').classList.remove('open');
}

window.pickAccent = c => {
  const s = getCfg(); s.accent = c; saveCfg(s); applyCfg(s);
  document.querySelectorAll('.ac-dot').forEach(d => d.classList.toggle('on', d.style.background === c));
};

el('settings-btn').addEventListener('click', openSettings);
el('ov-bg').addEventListener('click', closeSettings);
document.addEventListener('keydown', e => e.key === 'Escape' && closeSettings());

['down','up'].forEach(dir => {
  el('fs-' + dir).addEventListener('click', () => {
    const s = getCfg();
    s.fs = Math.max(12, Math.min(24, (s.fs || 16) + (dir === 'up' ? 1 : -1)));
    saveCfg(s); applyCfg(s);
    el('fs-num').textContent = s.fs + 'px';
  });
});

// ── Index page only
const grid = el('notes-grid');
if (grid) {
  const PER = 10;
  let all = [], filtered = [], page = 1, activeTag = null, sm = 0;
  const SORTS = [
    { l: 'Date ↓', f: (a,b) => new Date(b.date) - new Date(a.date) },
    { l: 'Date ↑', f: (a,b) => new Date(a.date) - new Date(b.date) },
    { l: 'A → Z',  f: (a,b) => a.title.localeCompare(b.title) },
    { l: 'Z → A',  f: (a,b) => b.title.localeCompare(a.title) },
  ];
  const base = document.body.dataset.base || '';
  const params = new URLSearchParams(location.search);
  if (params.get('tag')) activeTag = params.get('tag');
  if (params.get('q'))   el('search').value = params.get('q');

  function filter() {
    const q = el('search').value.toLowerCase();
    filtered = all.filter(n => {
      const mq = !q || n.title.toLowerCase().includes(q) || (n.excerpt||'').toLowerCase().includes(q);
      const mt = !activeTag || (n.tags||[]).includes(activeTag);
      return mq && mt;
    }).sort(SORTS[sm].f);
    page = 1;
    draw();
  }

  function draw() {
    const tot = filtered.length, pages = Math.max(1, Math.ceil(tot / PER));
    page = Math.min(page, pages);
    const slice = filtered.slice((page - 1) * PER, page * PER);

    const from = (page - 1) * PER + 1;
    const to = from + slice.length - 1;
    el('count').textContent = tot === all.length && slice.length === tot
      ? `${tot} note${tot !== 1 ? 's' : ''}`
      : `${from}–${to} of ${tot}`;
    el('sort-lbl').textContent = SORTS[sm].l;

    grid.innerHTML = slice.length ? slice.map(n => `
      <a href="${n.url}" class="note-card">
        <div class="nc-date">${fmtDate(n.date)}</div>
        <div class="nc-title">${n.title}</div>
        ${n.excerpt ? `<p class="nc-excerpt">${n.excerpt}</p>` : ''}
        ${n.tags?.length ? `<div class="nc-tags">${n.tags.map(t => `<span class="nc-tag">#${t}</span>`).join('')}</div>` : ''}
      </a>`).join('') : '<p class="empty">No notes found.</p>';

    drawPages(pages);
  }

  function drawPages(tot) {
    const pg = el('pagination');
    if (tot <= 1) { pg.innerHTML = ''; return; }
    const nums = tot <= 7 ? Array.from({length: tot}, (_, i) => i + 1) : buildRange(tot);
    pg.innerHTML =
      `<button class="pg" onclick="gp(${page-1})" ${page===1?'disabled':''}>‹</button>` +
      nums.map(n => n === '·'
        ? `<span class="pg-dot">·</span>`
        : `<button class="pg${n===page?' on':''}" onclick="gp(${n})">${n}</button>`
      ).join('') +
      `<button class="pg" onclick="gp(${page+1})" ${page===tot?'disabled':''}>›</button>`;
  }

  function buildRange(tot) {
    const r = [1];
    if (page > 3) r.push('·');
    for (let i = Math.max(2, page-1); i <= Math.min(tot-1, page+1); i++) r.push(i);
    if (page < tot - 2) r.push('·');
    r.push(tot);
    return r;
  }

  window.gp = n => { page = n; draw(); scrollTo({top:0,behavior:'smooth'}); };

  function drawTags() {
    const tags = [...new Set(all.flatMap(n => n.tags || []))].sort();
    el('tags').innerHTML =
      `<button class="chip${!activeTag?' on':''}" onclick="setTag(null)">All</button>` +
      tags.map(t => `<button class="chip${activeTag===t?' on':''}" onclick="setTag('${t}')">${t}</button>`).join('');
  }

  window.setTag = t => { activeTag = t; drawTags(); filter(); };

  function fmtDate(d) {
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {month:'short',day:'numeric',year:'numeric'});
  }

  el('search').addEventListener('input', filter);
  el('sort-btn').addEventListener('click', () => { sm = (sm + 1) % SORTS.length; filter(); });

  fetch(`${base}/notes.json`)
    .then(r => r.json())
    .then(data => { all = data; drawTags(); filter(); })
    .catch(() => { grid.innerHTML = '<p class="empty">Could not load notes.</p>'; });
}
