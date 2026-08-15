/* Plan 12 tygodni — cała logika skoroszytu, bez skoroszytu.
   Stan trwały: numer tygodnia i trzy E1RM. Nic więcej się nie zapisuje. */

const LS = 'trening.v1';
const state = { week: 1, e1rm: null, plan: null, view: location.hash || '#/' };
const setsDone = new Map();          // tylko w pamięci karty — znika po zamknięciu

/* ---------- pomocnicze ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const floor25 = x => Math.floor(x / 2.5) * 2.5;
const fmt = n => (n == null ? '—' : String(n).replace('.', ','));

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) || '{}');
    if (raw.week >= 1 && raw.week <= 12) state.week = raw.week;
    if (raw.e1rm) state.e1rm = raw.e1rm;
  } catch { /* pierwszy start */ }
  const t = +new URLSearchParams(location.search).get('t');
  if (t >= 1 && t <= 12) state.week = t;
}
const save = () => localStorage.setItem(LS, JSON.stringify({ week: state.week, e1rm: state.e1rm }));

/* ---------- przeliczenia (odpowiednik formuł z arkusza Ciężary) ---------- */
const lowerRow = w => state.plan.weeks.lower[w - 1];
const upperRow = w => state.plan.weeks.upper[w - 1];

function kgOf(lift, w) {
  const e = state.e1rm;
  if (lift === 'bench') { const r = upperRow(w); return r.pct == null ? null : floor25(e.bench * r.pct); }
  if (lift === 'front') { return floor25(e.front * lowerRow(w).pct); }
  if (lift === 'dl') { const r = lowerRow(w); return floor25(e.dl * (r.pct + r.dlAdj)); }
  return null;
}
const ramp = kg => [state.plan.bar, floor25(kg * 0.5), floor25(kg * 0.7), floor25(kg * 0.85), kg];

// Odwołania, które konwerter wstawił w miejsce formuł INDEX/MATCH.
function resolve(val, w) {
  if (val == null) return null;
  if (typeof val === 'string') return val;
  const r = val.ref;
  if (r === 'upper.scheme') return upperRow(w).scheme;
  if (r === 'upper.rpe') return upperRow(w).rpe;
  if (r === 'upper.pullup') return upperRow(w).pullup;
  if (r === 'lower.scheme') return lowerRow(w).scheme;
  if (r === 'lower.rpe') return lowerRow(w).rpe;
  if (r === 'bench.kg') return upperRow(w).benchText || kgOf('bench', w);
  if (r === 'front.kg') return kgOf('front', w);
  if (r === 'dl.kg') return kgOf('dl', w);
  return null;
}
const isKg = v => typeof v === 'number';

function plates(total) {
  const bar = state.plan.bar;
  if (total <= bar) return 'sam gryf';
  let side = (total - bar) / 2, out = [];
  for (const p of state.plan.plates) {
    let n = 0;
    while (side >= p - 1e-9) { side -= p; n++; }
    if (n) out.push(n + '×' + fmt(p));
  }
  if (side > 1e-9) out.push('brak ' + fmt(Math.round(side * 100) / 100) + ' kg');
  return out.join(' + ') + '  (na stronę)';
}

// Liczba serii z zapisu typu "4 × 8" / "3 × 30 s / nogę".
function setCount(scheme) {
  const m = String(scheme || '').match(/^\s*(\d+)\s*[×x]/);
  return m ? Math.min(+m[1], 6) : 0;
}

/* ---------- widoki ---------- */
function weekBar() {
  const w = state.week, L = lowerRow(w), deload = String(L.block).toLowerCase() === 'deload';
  const bar = el('div', 'weekbar');
  const row = el('div', 'weekrow');

  const prev = el('button', 'wbtn', '‹'); prev.disabled = w <= 1;
  const next = el('button', 'wbtn', '›'); next.disabled = w >= 12;
  prev.onclick = () => setWeek(w - 1);
  next.onclick = () => setWeek(w + 1);

  const mid = el('div', 'wnum');
  mid.append(el('div', 'lbl', 'Tydzień treningowy'));
  mid.append(el('div', 'val', String(w)));
  mid.append(el('div', 'sub', `blok ${L.block}${deload ? '' : ''} · ${state.plan.schedule}`));
  row.append(prev, mid, next);
  bar.append(row);

  const pips = el('div', 'pips');
  for (let i = 1; i <= 12; i++) {
    const p = el('div', 'pip');
    if (String(lowerRow(i).block).toLowerCase() === 'deload') p.classList.add('dl');
    if (i <= w) p.classList.add('on');
    pips.append(p);
  }
  bar.append(pips);
  return bar;
}

function setWeek(w) {
  if (w < 1 || w > 12) return;
  state.week = w; save(); render();
  window.scrollTo({ top: 0 });
}

function homeView() {
  const p = state.plan, w = state.week, frag = document.createDocumentFragment();
  const deload = String(lowerRow(w).block).toLowerCase() === 'deload';

  if (deload) frag.append(noteBox('Tydzień 7 — deload.', 'Nie jest opcjonalny. Dwie serie zamiast czterech, ciężar w dół. Ćwiczenia dodatkowe po 2 serie, superserie w dniu B pomijasz.'));
  if (w === 12) frag.append(noteBox('Tydzień 12 — testy.', 'Góra: test 1RM w wyciskaniu, asekuracja albo ograniczniki obowiązkowo. Dół: test kontrolny na ciężarze z tygodnia 3, stop przy 15 powtórzeniach albo RPE 8.'));

  const tiles = el('div', 'tiles');
  for (const k of ['A', 'B', 'C']) {
    const d = p.days[k];
    tiles.append(tile(k, d.title, `${d.day} · ${d.items.length} ćwiczeń · ~${d.minutes} min`, '#/d/' + k));
  }
  const c = p.cardio[w - 1];
  tiles.append(tile('❤', 'Cardio', `Wt: ${c.tue} · Sob: ${c.sat}`, '#/cardio'));
  tiles.append(tile('kg', 'Tabela ciężarów', 'Wszystkie 12 tygodni', '#/tabela'));
  tiles.append(tile('§', 'Zasady', 'Jak prowadzić cykl', '#/zasady'));
  frag.append(tiles);

  const box = el('div', 'block');
  box.append(el('h3', null, 'E1RM — podstawa wszystkich ciężarów'));
  const names = { bench: 'Wyciskanie leżąc', front: 'Front squat', dl: 'Martwy ciąg z podwyższenia' };
  for (const key of ['bench', 'front', 'dl']) {
    const r = el('div', 'e1rm');
    r.append(el('div', 'n', names[key]));
    r.append(el('div', 'v', fmt(state.e1rm[key]) + ' kg'));
    const up = el('button', 'mini', '+10%');
    up.onclick = () => { state.e1rm[key] = floor25(state.e1rm[key] * 1.1); save(); render(); };
    const dn = el('button', 'mini', '−10%');
    dn.onclick = () => { state.e1rm[key] = floor25(state.e1rm[key] / 1.1); save(); render(); };
    r.append(dn, up);
    box.append(r);
  }
  const reset = el('button', 'mini', 'Przywróć wartości z planu');
  reset.style.marginTop = '10px';
  reset.onclick = () => { state.e1rm = { ...state.plan.e1rm }; save(); render(); };
  box.append(reset);
  frag.append(box);

  frag.append(el('div', 'foot', 'Tydzień podbijasz tylko po sesji zmieszczonej w suficie RPE.'));
  return frag;
}

function tile(k, t, s, href) {
  const b = el('button', 'tile');
  b.append(el('div', 'k', k));
  const mid = el('div');
  mid.append(el('div', 't', t));
  mid.append(el('div', 's', s));
  b.append(mid, el('div', 'go', '›'));
  b.onclick = () => go(href);
  return b;
}

function noteBox(title, body) {
  const n = el('div', 'note');
  n.innerHTML = '<b>' + esc(title) + '</b> ' + esc(body);
  return n;
}

function backLink() {
  const a = el('button', 'back', '‹ Wróć');
  a.onclick = () => go('#/');
  return a;
}

function dayView(key) {
  const p = state.plan, w = state.week, d = p.days[key], frag = document.createDocumentFragment();
  frag.append(backLink());

  const h = el('div', 'dayhead');
  h.append(el('div', 't', `Dzień ${d.key} — ${d.title}`));
  h.append(el('div', 's', `${d.day} · ~${d.minutes} min · tydzień ${w}`));
  frag.append(h);

  frag.append(warmupAcc(key));

  if (key === 'C') {
    const bh = lowerRow(w).barHeight;
    if (bh) frag.append(noteBox('Wysokość gryfu w ciągu:', bh + '.'));
  }

  d.items.forEach((it, i) => {
    const prevSS = i > 0 ? d.items[i - 1].superset : null;
    const box = el('div', 'ex');
    if (it.superset) {
      box.classList.add('ss');
      const pairTop = !prevSS || prevSS[0] !== it.superset[0];
      box.classList.add(pairTop ? 'top' : 'mid');
    }

    const head = el('div', 'exhead');
    head.append(el('div', 'exn', it.n + '.'));
    head.append(el('div', 'exname', it.name));
    if (it.superset) head.append(el('div', 'tag ss', it.superset));
    if (it.noCut) head.append(el('div', 'tag cut', 'nie tnij'));
    box.append(head);

    const scheme = resolve(it.scheme, w);
    const load = resolve(it.load, w);
    const rpe = resolve(it.rpe, w);

    const nums = el('div', 'nums');
    nums.append(numCell('Serie × powt.', scheme, false));
    let plateLine = null;
    if (isKg(load)) {
      const c = numCell('Ciężar', fmt(load), true, 'kg');
      const v = $('.v', c);
      v.classList.add('kgbtn');
      plateLine = el('div', 'plates hid', plates(load));
      v.onclick = () => plateLine.classList.toggle('hid');
      nums.append(c);
    } else if (load) {
      nums.append(numCell('Ciężar', load, false));
    }
    if (rpe != null && rpe !== '—') nums.append(numCell('Sufit RPE', fmt(rpe), false));
    box.append(nums);
    if (plateLine) box.append(plateLine);

    const n = setCount(scheme);
    if (n) {
      const dots = el('div', 'dots');
      const id = key + '|' + it.n;
      for (let s = 0; s < n; s++) {
        const dot = el('button', 'dot');
        if ((setsDone.get(id) || 0) > s) dot.classList.add('done');
        dot.onclick = () => {
          const cur = setsDone.get(id) || 0;
          setsDone.set(id, cur === s + 1 ? s : s + 1);
          render();
        };
        dots.append(dot);
      }
      box.append(dots);
    }

    if (it.note) {
      const note = el('div', 'exnote hid', it.note);
      const more = el('button', 'more', 'Jak to zrobić ▾');
      more.onclick = () => {
        note.classList.toggle('hid');
        more.textContent = note.classList.contains('hid') ? 'Jak to zrobić ▾' : 'Zwiń ▴';
      };
      box.append(more, note);
    }
    frag.append(box);
  });

  const cuts = state.plan.rules.find(r => r.heading === 'Czas trwania');
  if (cuts) {
    const acc = el('details', 'acc');
    acc.append(el('summary', null, 'Brakuje czasu — co ciąć'));
    const b = el('div', 'accbody');
    cuts.lines.slice(-3).forEach(l => b.append(el('p', null, l)));
    acc.append(b);
    frag.append(acc);
  }
  return frag;
}

function numCell(label, value, big, unit) {
  const c = el('div', 'num');
  c.append(el('div', 'l', label));
  const v = el('div', 'v' + (big ? ' big' : ''));
  v.textContent = value == null ? '—' : value;
  if (unit) { const s = el('small', null, ' ' + unit); v.append(s); }
  c.append(v);
  return c;
}

function warmupAcc(key) {
  const p = state.plan, w = state.week, wu = p.warmup.days[key];
  const acc = el('details', 'acc');
  acc.append(el('summary', null, 'Rozgrzewka — ' + (wu.label.split('·')[1] || '').trim()));
  const b = el('div', 'accbody');

  wu.steps.forEach(s => {
    const line = el('p');
    line.innerHTML = '<b style="color:var(--ink)">' + esc(s.what) + '</b>' + (s.dose ? ' — ' + esc(s.dose) : '');
    b.append(line);
    if (s.note) { const n = el('p', null, s.note); n.style.color = 'var(--faint)'; n.style.fontSize = '13px'; b.append(n); }
  });

  const names = { bench: 'Wyciskanie', front: 'Front squat', dl: 'Ciąg z podwyższenia' };
  const rampTable = (head, rows) => {
    const wrap = el('div', 'scroll'); wrap.style.margin = '10px 0 0';
    const t = el('table');
    t.innerHTML = '<tr>' + head.map(s => '<th>' + esc(s) + '</th>').join('') + '</tr>' +
      rows.map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('');
    wrap.append(t);
    return wrap;
  };

  // Pełne dojście: gryf → 50% → 70% → 85% → robocze.
  const full = (key === 'A' ? ['bench'] : key === 'C' ? ['front'] : []);
  if (full.length) {
    b.append(rampTable(
      ['Serie dojściowe', ...p.warmup.ramp.steps],
      full.map(lift => {
        const kg = kgOf(lift, w);
        return [names[lift], ...(kg == null ? ['—', '—', '—', '—', '—'] : ramp(kg).map(v => fmt(v) + ' kg'))];
      })
    ));
  }
  // Ciąg w dniu C: dwie serie, bo po przysiadzie jesteś już rozgrzany.
  if (key === 'C') {
    const kg = kgOf('dl', w);
    b.append(rampTable(
      ['Przed ciągiem', '50% × 5', '75% × 3', 'Ciężar roboczy'],
      [[names.dl, ...(kg == null ? ['—', '—', '—'] : [fmt(floor25(kg * 0.5)) + ' kg', fmt(floor25(kg * 0.75)) + ' kg', fmt(kg) + ' kg'])]]
    ));
  }
  if (full.length || key === 'C') {
    p.warmup.notes.forEach(n => { const x = el('p', null, n); x.style.fontSize = '13px'; x.style.marginTop = '8px'; b.append(x); });
  }
  acc.append(b);
  return acc;
}

function cardioView() {
  const p = state.plan, w = state.week, frag = document.createDocumentFragment();
  frag.append(backLink());
  const h = el('div', 'dayhead');
  h.append(el('div', 't', 'Cardio'));
  h.append(el('div', 's', 'Wtorek i sobota · tydzień ' + w));
  frag.append(h);

  const c = p.cardio[w - 1];
  const now = el('div', 'block');
  now.append(el('h3', null, 'Ten tydzień'));
  now.append(el('p', null, 'Wtorek — ' + c.tue));
  now.append(el('p', null, 'Sobota — ' + c.sat));
  if (c.note) now.append(el('p', null, c.note));
  frag.append(now);

  const wrap = el('div', 'scroll');
  const t = el('table');
  t.innerHTML = '<tr><th>Tydz.</th><th>Wtorek</th><th>Sobota</th></tr>';
  p.cardio.forEach(r => {
    t.innerHTML += `<tr class="${r.week === w ? 'now' : ''}"><td>${r.week}</td><td>${esc(r.tue)}</td><td>${esc(r.sat)}</td></tr>`;
  });
  wrap.append(t); frag.append(wrap);

  for (const [k, lines] of Object.entries(p.cardioInfo)) {
    const b = el('div', 'block');
    b.append(el('h3', null, k));
    lines.forEach(l => b.append(el('p', null, l)));
    frag.append(b);
  }
  return frag;
}

function tableView() {
  const p = state.plan, w = state.week, frag = document.createDocumentFragment();
  frag.append(backLink());
  const h = el('div', 'dayhead');
  h.append(el('div', 't', 'Tabela ciężarów'));
  h.append(el('div', 's', 'Przeliczone z aktualnych E1RM'));
  frag.append(h);

  const mk = (title, head, rows) => {
    const b = el('div', 'block');
    b.append(el('h3', null, title));
    const wrap = el('div', 'scroll'); wrap.style.margin = '0 -14px';
    const t = el('table');
    t.innerHTML = '<tr>' + head.map(x => '<th>' + esc(x) + '</th>').join('') + '</tr>' +
      rows.map(r => `<tr class="${r[0] == w ? 'now' : ''}">` + r.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('');
    wrap.append(t); b.append(wrap);
    frag.append(b);
  };

  mk('Góra — wyciskanie leżąc',
    ['Tydz.', 'Serie × powt.', '% E1RM', 'RPE', 'Ciężar'],
    p.weeks.upper.map(r => [r.week, r.scheme, r.pct ? Math.round(r.pct * 1000) / 10 + '%' : '—', fmt(r.rpe),
      r.benchText ? 'test' : fmt(kgOf('bench', r.week)) + ' kg']));

  mk('Dół — front squat i ciąg',
    ['Tydz.', 'Serie × powt.', '% E1RM', 'RPE', 'Front', 'Ciąg'],
    p.weeks.lower.map(r => [r.week, r.scheme, Math.round(r.pct * 1000) / 10 + '%', fmt(r.rpe),
      fmt(kgOf('front', r.week)) + ' kg', fmt(kgOf('dl', r.week)) + ' kg']));

  const b = el('div', 'block');
  b.append(el('h3', null, 'Wysokość gryfu w ciągu'));
  let last = null;
  p.weeks.lower.forEach(r => { if (r.barHeight !== last) { b.append(el('p', null, `Tydzień ${r.week}+ — ${r.barHeight}`)); last = r.barHeight; } });
  frag.append(b);
  return frag;
}

function rulesView() {
  const frag = document.createDocumentFragment();
  frag.append(backLink());
  const h = el('div', 'dayhead');
  h.append(el('div', 't', 'Zasady'));
  h.append(el('div', 's', 'Nadrzędne wobec każdej liczby w tabelach'));
  frag.append(h);
  state.plan.rules.forEach(r => {
    const b = el('div', 'block');
    b.append(el('h3', null, r.heading));
    r.lines.forEach(l => b.append(el('p', null, l)));
    frag.append(b);
  });
  const b = el('div', 'block');
  b.append(el('h3', null, 'Czego w rozgrzewce nie ma'));
  state.plan.warmup.skip.forEach(l => b.append(el('p', null, '• ' + l)));
  frag.append(b);
  return frag;
}

/* ---------- timer przerwy ---------- */
let tLeft = 0, tId = null, tFired = false;
function renderTimer() {
  const box = $('#timer');
  box.innerHTML = '';
  const inner = el('div', 'in');
  const v = el('div', 'tval' + (tId ? ' run' : tFired ? ' zero' : ''));
  v.textContent = String(Math.floor(tLeft / 60)) + ':' + String(tLeft % 60).padStart(2, '0');
  inner.append(v);
  [60, 90, 120, 180].forEach(s => {
    const b = el('button', 'tbtn', s < 120 ? s + ' s' : (s / 60) + ' min');
    b.onclick = () => startTimer(s);
    inner.append(b);
  });
  const stop = el('button', 'tbtn', '■');
  stop.style.flex = '0 0 46px';
  stop.onclick = () => { clearInterval(tId); tId = null; tLeft = 0; tFired = false; renderTimer(); };
  inner.append(stop);
  box.append(inner);
}
function startTimer(s) {
  clearInterval(tId);
  tLeft = s; tFired = false;
  tId = setInterval(() => {
    tLeft--;
    if (tLeft <= 0) {
      clearInterval(tId); tId = null; tLeft = 0; tFired = true;
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
    renderTimer();
  }, 1000);
  renderTimer();
}

/* ---------- ekran nie gaśnie ---------- */
let lock = null;
async function keepAwake(on) {
  try {
    if (on && !lock && 'wakeLock' in navigator) lock = await navigator.wakeLock.request('screen');
    if (!on && lock) { await lock.release(); lock = null; }
  } catch { /* brak wsparcia albo odmowa — nieistotne */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.view.startsWith('#/d/')) keepAwake(true);
});

/* ---------- router ---------- */
function go(hash) { location.hash = hash; window.scrollTo({ top: 0 }); }

function render() {
  const app = $('#app');
  app.innerHTML = '';
  const v = state.view;
  const onDay = v.startsWith('#/d/');
  if (v !== '#/zasady') app.append(weekBar());   // wszędzie poza zasadami tydzień coś zmienia

  if (onDay) app.append(dayView(v.slice(4)));
  else if (v === '#/cardio') app.append(cardioView());
  else if (v === '#/tabela') app.append(tableView());
  else if (v === '#/zasady') app.append(rulesView());
  else app.append(homeView());

  keepAwake(onDay);
  renderTimer();
}

window.addEventListener('hashchange', () => { state.view = location.hash || '#/'; render(); });

/* ---------- start ---------- */
fetch('plan.json?v=2')
  .then(r => r.json())
  .then(p => {
    state.plan = p;
    load();
    if (!state.e1rm) state.e1rm = { ...p.e1rm };
    render();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  })
  .catch(() => {
    $('#app').innerHTML = '<div class="note"><b>Nie udało się wczytać plan.json.</b> Otwórz stronę przez serwer (nie z pliku), np. <code>python -m http.server 8080</code>.</div>';
  });
