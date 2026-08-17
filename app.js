/* Plan 12 tygodni — cała logika skoroszytu, bez skoroszytu.
   Stan trwały: numer tygodnia i trzy E1RM. Nic więcej się nie zapisuje. */

const LS = 'trening.v1';
const state = { week: 1, e1rm: null, plan: null, view: location.hash || '#/' };
const setsDone = new Map();          // tylko w pamięci karty — znika po zamknięciu
const calc = { lift: 'bench', kg: 100, reps: 5, rpe: 8 };

const LIFTS = [
  { key: 'bench', short: 'Wyciskanie', full: 'Wyciskanie leżąc', color: 'var(--series-1)' },
  { key: 'front', short: 'Front squat', full: 'Front squat', color: 'var(--series-2)' },
  { key: 'dl', short: 'Ciąg', full: 'Martwy ciąg z podwyższenia', color: 'var(--series-3)' },
];
const DAY_COLOR = { A: 'var(--a)', B: 'var(--b)', C: 'var(--c)' };
// Kolory talerzy wg standardu IPF — czysta pomoc wzrokowa przy składaniu sztangi.
const PLATE_COLOR = { 25: '#c0392b', 20: '#2a6fc4', 15: '#d9b016', 10: '#1f8f4e', 5: '#e8e8e8', 2.5: '#1a1a1a', 1.25: '#9aa5b1' };

/* ---------- pomocnicze ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const floor25 = x => Math.floor(x / 2.5) * 2.5;
const round25 = x => Math.round(x / 2.5) * 2.5;
const fmt = n => (n == null ? '—' : String(Math.round(n * 100) / 100).replace('.', ','));

function loadState() {
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
  if (lift === 'front') return floor25(e.front * lowerRow(w).pct);
  if (lift === 'dl') { const r = lowerRow(w); return floor25(e.dl * (r.pct + r.dlAdj)); }
  return null;
}
const ramp = kg => [state.plan.bar, floor25(kg * 0.5), floor25(kg * 0.7), floor25(kg * 0.85), kg];

// Wzór z arkusza Start: ciężar × (1 + (powtórzenia + zapas) / 30), zapas = 10 − RPE.
// Jedyny wyjątek: pojedyncze powtórzenie na RPE 10 JEST maksem, więc nie dodajemy narzutu.
function e1rmFrom(kg, reps, rpe) {
  const rir = 10 - rpe;
  if (reps === 1 && rir === 0) return kg;
  return kg * (1 + (reps + rir) / 30);
}

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

function plateList(total) {
  const bar = state.plan.bar;
  if (total <= bar) return { pairs: [], note: 'sam gryf' };
  let side = (total - bar) / 2; const pairs = [];
  for (const p of state.plan.plates) {
    let n = 0;
    while (side >= p - 1e-9) { side -= p; n++; }
    if (n) pairs.push({ kg: p, n });
  }
  return { pairs, note: side > 1e-9 ? 'brakuje ' + fmt(side) + ' kg' : 'na stronę' };
}

function setCount(scheme) {
  const m = String(scheme || '').match(/^\s*(\d+)\s*[×x]/);
  return m ? Math.min(+m[1], 6) : 0;
}
const isMainLift = name => ['Wyciskanie leżąc', 'Podciąganie', 'Front squat', 'Martwy ciąg z podwyższenia'].includes(name);

/* ---------- pasek tygodnia ---------- */
function weekBar() {
  const w = state.week, L = lowerRow(w);
  const bar = el('div', 'weekbar');
  const row = el('div', 'weekrow');

  const prev = el('button', 'wbtn', '‹'); prev.disabled = w <= 1;
  const next = el('button', 'wbtn', '›'); next.disabled = w >= 12;
  prev.setAttribute('aria-label', 'Poprzedni tydzień');
  next.setAttribute('aria-label', 'Następny tydzień');
  prev.onclick = () => setWeek(w - 1);
  next.onclick = () => setWeek(w + 1);

  const mid = el('div', 'wmid');
  mid.append(el('div', 'wlbl', 'Tydzień treningowy'));
  mid.append(el('div', 'wval', String(w)));
  mid.append(el('div', 'wsub', `blok ${L.block} · ${state.plan.schedule}`));
  row.append(prev, mid, next);
  bar.append(row);

  const track = el('div', 'track');
  for (let i = 1; i <= 12; i++) {
    const s = el('div', 'seg');
    if (String(lowerRow(i).block).toLowerCase() === 'deload') s.classList.add('dl');
    if (i < w) s.classList.add('done');
    if (i === w) s.classList.add('now');
    s.title = 'Tydzień ' + i;
    track.append(s);
  }
  bar.append(track);
  return bar;
}

function setWeek(w) {
  if (w < 1 || w > 12) return;
  state.week = w; save(); render();
  window.scrollTo({ top: 0 });
}

/* ---------- ekran główny ---------- */
function homeView() {
  const p = state.plan, w = state.week, frag = document.createDocumentFragment();
  const body = el('div', 'stagger');
  const deload = String(lowerRow(w).block).toLowerCase() === 'deload';

  if (deload) body.append(noteBox('Tydzień 7 — deload.', 'Nie jest opcjonalny. Dwie serie zamiast czterech, ciężar w dół. Ćwiczenia dodatkowe po 2 serie, superserie w dniu B pomijasz.'));
  if (w === 12) body.append(noteBox('Tydzień 12 — testy.', 'Góra: test 1RM w wyciskaniu, asekuracja albo ograniczniki obowiązkowo. Dół: test kontrolny na ciężarze z tygodnia 3, stop przy 15 powtórzeniach albo RPE 8.'));

  // Trzy boje główne jako kafle stat — z różnicą względem poprzedniego tygodnia.
  const stats = el('div', 'stats');
  for (const L of LIFTS) {
    const kg = kgOf(L.key, w);
    const prev = w > 1 ? kgOf(L.key, w - 1) : null;
    const s = el('div', 'stat');
    s.style.setProperty('--sc', L.color);
    s.append(el('div', 'sl', L.short));
    const v = el('div', 'sv');
    if (kg == null) { v.textContent = 'test'; v.style.fontSize = '20px'; }
    else { v.textContent = fmt(kg); v.append(el('u', null, 'kg')); }
    s.append(v);
    let d = '—';
    if (kg != null && prev != null) {
      const diff = kg - prev;
      d = diff > 0 ? '↑ +' + fmt(diff) + ' kg' : diff < 0 ? '↓ ' + fmt(-diff) + ' kg' : 'bez zmian';
    } else if (kg != null && w === 1) d = 'start cyklu';
    const dd = el('div', 'sd', d);
    if (kg != null && prev != null && kg > prev) dd.classList.add('up');
    s.append(dd);
    stats.append(s);
  }
  body.append(stats);

  const tiles = el('div', 'tiles');
  const mainOf = { A: 'bench', B: null, C: 'front' };
  for (const k of ['A', 'B', 'C']) {
    const d = p.days[k];
    const lift = mainOf[k];
    const kg = lift ? kgOf(lift, w) : null;
    tiles.append(tile({
      k, color: DAY_COLOR[k], title: d.title,
      sub: `${d.day} · ${d.items.length} ćwiczeń · ~${d.minutes} min`,
      right: kg != null ? { v: fmt(kg) + ' kg', u: lift === 'bench' ? 'wyciskanie' : 'front squat' } : null,
      href: '#/d/' + k,
    }));
  }
  const c = p.cardio[w - 1];
  tiles.append(tile({ k: '↻', ghost: true, title: 'Cardio', sub: `Wt: ${c.tue} · Sob: ${c.sat}`, href: '#/cardio' }));
  tiles.append(tile({ k: '1RM', ghost: true, title: 'Kalkulator 1RM', sub: 'Przelicz serię na maks i ustaw E1RM', href: '#/1rm' }));
  tiles.append(tile({ k: '≡', ghost: true, title: 'Ciężary i progresja', sub: 'Wykres i tabela na 12 tygodni', href: '#/tabela' }));
  tiles.append(tile({ k: '§', ghost: true, title: 'Zasady', sub: 'Jak prowadzić cykl', href: '#/zasady' }));
  body.append(tiles);

  const box = el('div', 'card');
  box.append(el('h3', null, 'E1RM — podstawa wszystkich ciężarów'));
  for (const L of LIFTS) {
    const r = el('div', 'e1row');
    const d = el('div', 'dotc'); d.style.background = L.color;
    r.append(d, el('div', 'n', L.full), el('div', 'v', fmt(state.e1rm[L.key]) + ' kg'));
    r.append(miniBtn('−10%', () => { state.e1rm[L.key] = round25(state.e1rm[L.key] / 1.1); save(); render(); }));
    r.append(miniBtn('+10%', () => { state.e1rm[L.key] = round25(state.e1rm[L.key] * 1.1); save(); render(); }));
    box.append(r);
  }
  const reset = el('button', 'btn ghost', 'Przywróć wartości z planu');
  reset.style.marginTop = '12px';
  reset.onclick = () => { state.e1rm = { ...state.plan.e1rm }; save(); render(); };
  box.append(reset);
  body.append(box);

  body.append(el('div', 'foot', 'Tydzień podbijasz tylko po sesji zmieszczonej w suficie RPE.'));
  frag.append(body);
  return frag;
}

function miniBtn(label, fn) {
  const b = el('button', 'mini', label);
  b.onclick = fn;
  return b;
}

function tile({ k, color, ghost, title, sub, right, href }) {
  const b = el('button', 'tile');
  if (color) b.style.setProperty('--tc', color);
  const kk = el('div', 'k' + (ghost ? ' ghost' : ''), k);
  b.append(kk);
  const mid = el('div');
  mid.style.minWidth = '0';
  mid.append(el('div', 'tt', title));
  mid.append(el('div', 'ts', sub));
  b.append(mid);
  if (right) {
    const r = el('div', 'tr');
    r.append(el('div', 'v', right.v));
    r.append(el('div', 'u', right.u));
    b.append(r);
  } else {
    b.append(el('div', 'go', '›'));
  }
  b.onclick = () => go(href);
  return b;
}

function noteBox(title, bodyText) {
  const n = el('div', 'note');
  n.append(el('b', null, title));
  n.append(document.createTextNode(bodyText));
  return n;
}

function backLink() {
  const a = el('button', 'back', '‹ Wróć');
  a.onclick = () => go('#/');
  return a;
}

function head(title, sub, color) {
  const h = el('div', 'dayhead');
  h.append(el('div', 't', title));
  if (sub) h.append(el('div', 's', sub));
  if (color) { const acc = el('div', 'accent'); h.append(acc); }
  return h;
}

/* ---------- dzień treningowy ---------- */
function dayView(key) {
  const p = state.plan, w = state.week, d = p.days[key];
  const frag = document.createDocumentFragment();
  frag.append(backLink());

  const wrapper = el('div');
  wrapper.style.setProperty('--dc', DAY_COLOR[key]);
  wrapper.append(head(`Dzień ${d.key} — ${d.title}`, `${d.day} · ~${d.minutes} min · tydzień ${w}`, true));

  // Postęp sesji liczony z odklikanych serii.
  let total = 0, done = 0;
  d.items.forEach(it => {
    const n = setCount(resolve(it.scheme, w));
    total += n;
    done += Math.min(setsDone.get(key + '|' + it.n) || 0, n);
  });
  if (total) {
    const sp = el('div', 'sprog');
    sp.append(el('span', null, `${done}/${total} serii`));
    const bar = el('div', 'bar'); const fill = el('div', 'fill');
    fill.style.width = (done / total * 100) + '%';
    bar.append(fill); sp.append(bar);
    sp.append(el('span', null, Math.round(done / total * 100) + '%'));
    wrapper.append(sp);
  }

  wrapper.append(warmupAcc(key));

  if (key === 'C') {
    const bh = lowerRow(w).barHeight;
    if (bh) wrapper.append(noteBox('Wysokość gryfu w ciągu:', ' ' + bh + '.'));
  }

  const list = el('div', 'stagger');
  let ssBox = null;
  d.items.forEach((it, i) => {
    const prevSS = i > 0 ? d.items[i - 1].superset : null;
    const card = exerciseCard(it, key, w);
    if (it.superset) {
      const isTop = !prevSS || prevSS[0] !== it.superset[0];
      card.classList.add(isTop ? 'ss-top' : 'ss-mid');
      if (isTop) { ssBox = el('div', 'sswrap'); list.append(ssBox); }
      ssBox.append(card);
    } else {
      ssBox = null;
      list.append(card);
    }
  });
  wrapper.append(list);

  const cuts = p.rules.find(r => r.heading === 'Czas trwania');
  if (cuts) {
    const acc = el('details', 'acc');
    acc.append(el('summary', null, 'Brakuje czasu — co ciąć'));
    const b = el('div', 'accbody');
    cuts.lines.slice(-3).forEach(l => b.append(el('p', null, l)));
    acc.append(b);
    wrapper.append(acc);
  }
  frag.append(wrapper);
  return frag;
}

function exerciseCard(it, key, w) {
  const box = el('div', 'ex');
  if (isMainLift(it.name)) box.classList.add('main');

  const h = el('div', 'exhead');
  h.append(el('div', 'exn', it.n + '.'));
  h.append(el('div', 'exname', it.name));
  const chips = el('div', 'chips');
  if (it.superset) chips.append(el('div', 'chip ss', it.superset));
  if (it.noCut) chips.append(el('div', 'chip cut', 'nie tnij'));
  if (chips.children.length) h.append(chips);
  box.append(h);

  const scheme = resolve(it.scheme, w);
  const load = resolve(it.load, w);
  const rpe = resolve(it.rpe, w);

  const metrics = el('div', 'metrics');
  metrics.append(metric('Serie × powt.', scheme, 'mv'));
  let platesRow = null;
  if (isKg(load)) {
    const m = metric('Ciężar', fmt(load), 'mv kg', 'kg');
    const v = $('.mv', m);
    v.classList.add('kgbtn');
    v.setAttribute('role', 'button');
    v.title = 'Pokaż talerze';
    platesRow = platesEl(load);
    v.onclick = () => platesRow.classList.toggle('on');
    metrics.append(m);
  } else if (load) {
    metrics.append(metric('Ciężar', load, 'mv txt'));
  }
  if (rpe != null && rpe !== '—') metrics.append(metric('Sufit RPE', fmt(rpe), 'mv'));
  box.append(metrics);
  if (platesRow) box.append(platesRow);

  const n = setCount(scheme);
  if (n) {
    const dots = el('div', 'dots');
    const id = key + '|' + it.n;
    for (let s = 0; s < n; s++) {
      const dot = el('button', 'dot');
      dot.setAttribute('aria-label', `Seria ${s + 1} z ${n}`);
      if ((setsDone.get(id) || 0) > s) dot.classList.add('done');
      dot.append(el('span'));
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
    const note = el('div', 'exnote', it.note);
    note.hidden = true;
    const more = el('button', 'more', 'Jak to zrobić ▾');
    more.onclick = () => {
      note.hidden = !note.hidden;
      more.textContent = note.hidden ? 'Jak to zrobić ▾' : 'Zwiń ▴';
    };
    box.append(more, note);
  }
  return box;
}

function metric(label, value, cls, unit) {
  const c = el('div', 'm');
  c.append(el('div', 'ml', label));
  const v = el('div', cls);
  v.textContent = value == null ? '—' : value;
  if (unit) v.append(el('u', null, unit));
  c.append(v);
  return c;
}

function platesEl(total) {
  const row = el('div', 'plates');
  const { pairs, note } = plateList(total);
  for (const p of pairs) {
    const chip = el('div', 'pl');
    const i = el('i'); i.style.background = PLATE_COLOR[p.kg] || '#8b95a3';
    chip.append(i, document.createTextNode(p.n + ' × ' + fmt(p.kg) + ' kg'));
    row.append(chip);
  }
  row.append(el('div', 'plnote', note + (pairs.length ? ' · gryf ' + fmt(state.plan.bar) + ' kg' : '')));
  return row;
}

/* ---------- rozgrzewka ---------- */
function warmupAcc(key) {
  const p = state.plan, w = state.week, wu = p.warmup.days[key];
  const acc = el('details', 'acc');
  const label = (wu.label.split('·')[1] || '').trim();
  acc.append(el('summary', null, 'Rozgrzewka' + (label ? ' — ' + label : '')));
  const b = el('div', 'accbody');

  wu.steps.forEach(s => {
    const line = el('p');
    line.append(el('b', null, s.what));
    if (s.dose) line.append(document.createTextNode(' — ' + s.dose));
    b.append(line);
    if (s.note) { const n = el('p', null, s.note); n.style.color = 'var(--ink-3)'; n.style.fontSize = '12.5px'; b.append(n); }
  });

  const names = { bench: 'Wyciskanie', front: 'Front squat', dl: 'Ciąg z podwyższenia' };
  const mkTable = (headRow, rows) => {
    const wrap = el('div', 'scroll'); wrap.style.margin = '12px 0 0'; wrap.style.padding = '0';
    const t = el('table');
    t.innerHTML = '<thead><tr>' + headRow.map(s => '<th>' + esc(s) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody>';
    wrap.append(t);
    b.append(wrap);
  };

  const full = key === 'A' ? ['bench'] : key === 'C' ? ['front'] : [];
  if (full.length) {
    mkTable(['Serie dojściowe', ...p.warmup.ramp.steps], full.map(lift => {
      const kg = kgOf(lift, w);
      return [names[lift], ...(kg == null ? ['—', '—', '—', '—', '—'] : ramp(kg).map(v => fmt(v) + ' kg'))];
    }));
  }
  if (key === 'C') {
    const kg = kgOf('dl', w);
    mkTable(['Przed ciągiem', '50% × 5', '75% × 3', 'Ciężar roboczy'],
      [[names.dl, ...(kg == null ? ['—', '—', '—'] : [fmt(floor25(kg * 0.5)) + ' kg', fmt(floor25(kg * 0.75)) + ' kg', fmt(kg) + ' kg'])]]);
  }
  if (full.length || key === 'C') {
    p.warmup.notes.forEach(n => { const x = el('p', null, n); x.style.fontSize = '12.5px'; x.style.marginTop = '9px'; b.append(x); });
  }
  acc.append(b);
  return acc;
}

/* ---------- kalkulator 1RM ---------- */
function calcView() {
  const frag = document.createDocumentFragment();
  frag.append(backLink());
  const body = el('div', 'stagger');
  const L = LIFTS.find(x => x.key === calc.lift);
  body.append(head('Kalkulator 1RM', 'Przelicz dowolną serię na przewidywany maks', true));

  const seg = el('div', 'seg-ctl');
  for (const l of LIFTS) {
    const b = el('button', l.key === calc.lift ? 'on' : '', l.short);
    b.onclick = () => { calc.lift = l.key; render(); };
    seg.append(b);
  }
  body.append(seg);

  const e = e1rmFrom(calc.kg, calc.reps, calc.rpe);
  const hero = el('div', 'hero');
  hero.style.setProperty('--sc', L.color);
  hero.append(el('div', 'hl', 'Przewidywany maks (E1RM)'));
  const hv = el('div', 'hv', fmt(Math.round(e * 2) / 2));
  hv.append(el('u', null, 'kg'));
  hero.append(hv);
  const rir = 10 - calc.rpe;
  hero.append(el('div', 'hs',
    `${fmt(calc.kg)} kg × ${calc.reps} ${calc.reps === 1 ? 'powt.' : 'powt.'} @ RPE ${fmt(calc.rpe)} ` +
    `(${rir === 0 ? 'do upadku' : rir + ' w zapasie'})`));
  body.append(hero);

  const inputs = el('div', 'card');
  inputs.append(el('h3', null, 'Wykonana seria'));
  inputs.append(stepper('Ciężar', '', () => fmt(calc.kg) + ' kg', 2.5, v => { calc.kg = Math.max(2.5, Math.min(400, calc.kg + v)); }));
  inputs.append(stepper('Powtórzenia', '', () => String(calc.reps), 1, v => { calc.reps = Math.max(1, Math.min(20, calc.reps + v)); }));
  inputs.append(stepper('RPE', 'ile zostało w zapasie', () => fmt(calc.rpe), 0.5, v => { calc.rpe = Math.max(5, Math.min(10, calc.rpe + v)); }));
  body.append(inputs);

  if (calc.reps === 1 && calc.rpe === 10) {
    body.append(noteBox('Pojedyncze powtórzenie do upadku.', ' To już jest Twój maks, więc wzór nie dokłada narzutu na zapas — wynik to wprost podniesiony ciężar.'));
  }

  const apply = el('button', 'btn primary', `Ustaw jako E1RM: ${L.full}`);
  apply.onclick = () => {
    state.e1rm[calc.lift] = round25(e);
    save();
    go('#/');
  };
  body.append(apply);

  const cur = el('div', 'card');
  cur.style.marginTop = '10px';
  cur.append(el('h3', null, 'Obecne E1RM w planie'));
  for (const l of LIFTS) {
    const r = el('div', 'e1row');
    const d = el('div', 'dotc'); d.style.background = l.color;
    r.append(d, el('div', 'n', l.full), el('div', 'v', fmt(state.e1rm[l.key]) + ' kg'));
    cur.append(r);
  }
  body.append(cur);

  // Tabela procentowa liczona z wyniku kalkulatora.
  const pct = el('div', 'card');
  pct.append(el('h3', null, 'Ciężary z tego maksa'));
  const reps = { 100: '1', 95: '2', 90: '3–4', 85: '5–6', 80: '7–8', 75: '9–10', 70: '11–12', 65: '13–15', 60: '16–20' };
  const wrap = el('div', 'scroll'); wrap.style.margin = '0'; wrap.style.padding = '0';
  const t = el('table');
  t.innerHTML = '<thead><tr><th>% maksa</th><th>Ciężar</th><th>Zwykle powt.</th></tr></thead><tbody>' +
    Object.keys(reps).sort((a, b) => b - a).map(k =>
      `<tr><td>${k}%</td><td>${esc(fmt(floor25(e * k / 100)))} kg</td><td>${esc(reps[k])}</td></tr>`).join('') +
    '</tbody>';
  wrap.append(t); pct.append(wrap);
  pct.append(el('p', null, 'Zaokrąglenie zawsze w dół do 2,5 kg — tak jak w całym planie.'));
  body.append(pct);

  const info = el('div', 'card');
  info.append(el('h3', null, 'Wzór'));
  info.append(el('p', null, 'E1RM = ciężar × (1 + (powtórzenia + zapas) / 30), gdzie zapas = 10 − RPE.'));
  info.append(el('p', null, 'Ten sam wzór, którego używa arkusz. Działa z dowolną serią zakończoną z zapasem — nie musisz niczego forsować. Im więcej powtórzeń ponad ~10, tym mniej dokładny wynik.'));
  body.append(info);

  frag.append(body);
  return frag;
}

function stepper(label, hint, read, delta, apply) {
  const f = el('div', 'field');
  const l = el('div', 'fl');
  l.append(document.createTextNode(label));
  if (hint) l.append(el('small', null, hint));
  f.append(l);
  const s = el('div', 'step');
  const minus = el('button', null, '−');
  const val = el('div', 'sv', read());
  const plus = el('button', null, '+');
  minus.setAttribute('aria-label', label + ' mniej');
  plus.setAttribute('aria-label', label + ' więcej');
  minus.onclick = () => { apply(-delta); render(); };
  plus.onclick = () => { apply(delta); render(); };
  s.append(minus, val, plus);
  f.append(s);
  return f;
}

/* ---------- cardio ---------- */
function cardioView() {
  const p = state.plan, w = state.week, frag = document.createDocumentFragment();
  frag.append(backLink());
  const body = el('div', 'stagger');
  body.append(head('Cardio', 'Wtorek i sobota · tydzień ' + w, true));

  const c = p.cardio[w - 1];
  const now = el('div', 'card');
  now.append(el('h3', null, 'Ten tydzień'));
  now.append(el('p', null, 'Wtorek — ' + c.tue));
  now.append(el('p', null, 'Sobota — ' + c.sat));
  if (c.note) now.append(el('p', null, c.note));
  body.append(now);

  const tbl = el('div', 'card');
  tbl.append(el('h3', null, 'Pełna progresja'));
  const wrap = el('div', 'scroll'); wrap.style.margin = '0'; wrap.style.padding = '0';
  const t = el('table');
  t.innerHTML = '<thead><tr><th>Tydz.</th><th>Wtorek</th><th>Sobota</th></tr></thead><tbody>' +
    p.cardio.map(r => `<tr class="${r.week === w ? 'now' : ''}"><td>${r.week}</td><td>${esc(r.tue)}</td><td>${esc(r.sat)}</td></tr>`).join('') +
    '</tbody>';
  wrap.append(t); tbl.append(wrap); body.append(tbl);

  for (const [k, lines] of Object.entries(p.cardioInfo)) {
    const b = el('div', 'card');
    b.append(el('h3', null, k));
    lines.forEach(l => b.append(el('p', null, l)));
    body.append(b);
  }
  frag.append(body);
  return frag;
}

/* ---------- wykres progresji + tabele ---------- */
function tableView() {
  const p = state.plan, w = state.week, frag = document.createDocumentFragment();
  frag.append(backLink());
  const body = el('div', 'stagger');
  body.append(head('Ciężary i progresja', 'Przeliczone z aktualnych E1RM', true));

  const chartCard = el('div', 'card');
  chartCard.append(el('h3', null, 'Ciężar roboczy przez 12 tygodni'));
  chartCard.append(progressChart());
  body.append(chartCard);

  const mk = (title, headRow, rows) => {
    const b = el('div', 'card');
    b.append(el('h3', null, title));
    const wrap = el('div', 'scroll'); wrap.style.margin = '0'; wrap.style.padding = '0';
    const t = el('table');
    t.innerHTML = '<thead><tr>' + headRow.map(x => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map(r => `<tr class="${r[0] == w ? 'now' : ''}">` + r.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') +
      '</tbody>';
    wrap.append(t); b.append(wrap);
    body.append(b);
  };

  mk('Góra — wyciskanie leżąc',
    ['Tydz.', 'Serie × powt.', '% E1RM', 'RPE', 'Ciężar'],
    p.weeks.upper.map(r => [r.week, r.scheme, r.pct ? Math.round(r.pct * 1000) / 10 + '%' : '—', fmt(r.rpe),
      r.benchText ? 'test 1RM' : fmt(kgOf('bench', r.week)) + ' kg']));

  mk('Dół — front squat i ciąg',
    ['Tydz.', 'Serie × powt.', '% E1RM', 'RPE', 'Front', 'Ciąg'],
    p.weeks.lower.map(r => [r.week, r.scheme, Math.round(r.pct * 1000) / 10 + '%', fmt(r.rpe),
      fmt(kgOf('front', r.week)) + ' kg', fmt(kgOf('dl', r.week)) + ' kg']));

  const b = el('div', 'card');
  b.append(el('h3', null, 'Wysokość gryfu w ciągu'));
  let last = null;
  p.weeks.lower.forEach(r => { if (r.barHeight !== last) { b.append(el('p', null, `Tydzień ${r.week}+ — ${r.barHeight}`)); last = r.barHeight; } });
  body.append(b);

  frag.append(body);
  return frag;
}

// Wykres liniowy: 3 serie, jedna oś (wszystko w kg), siatka włosowa,
// etykiety końcowe + legenda, krzyżyk i dymek pod palcem.
function progressChart() {
  const p = state.plan, cw = state.week;
  const W = 340, H = 190, ML = 30, MR = 40, MT = 12, MB = 24;
  const px = w => ML + (w - 1) / 11 * (W - ML - MR);
  const series = LIFTS.map(L => ({
    ...L,
    pts: p.weeks.lower.map((_, i) => ({ w: i + 1, kg: kgOf(L.key, i + 1) })).filter(d => d.kg != null),
  }));
  const all = series.flatMap(s => s.pts.map(d => d.kg));
  // Skala na okrągłych krokach — żeby podziałka wypadała na 40/60/80, nie na 118.
  const span = Math.max(...all) - Math.min(...all);
  const step = [10, 20, 25, 50].find(s => span / s <= 4) || 50;
  const min = Math.floor(Math.min(...all) / step) * step;
  const max = Math.ceil(Math.max(...all) / step) * step;
  const ticks = Math.round((max - min) / step);
  const py = kg => MT + (1 - (kg - min) / (max - min)) * (H - MT - MB);

  const wrap = el('div', 'chart');
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label',
    'Ciężar roboczy trzech bojów przez 12 tygodni. Dokładne wartości w tabelach poniżej.');
  const add = (tag, attrs, cls) => {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (cls) n.setAttribute('class', cls);
    svg.append(n); return n;
  };

  // siatka pozioma + oś kg
  for (let i = 0; i <= ticks; i++) {
    const kg = min + (max - min) * i / ticks;
    const y = py(kg);
    add('line', { x1: ML, y1: y, x2: W - MR, y2: y }, 'grid');
    const t = add('text', { x: ML - 6, y: y + 3, 'text-anchor': 'end' }, 'axis');
    t.textContent = Math.round(kg);
  }
  // oś tygodni
  for (const w of [1, 3, 5, 7, 9, 11, 12]) {
    const t = add('text', { x: px(w), y: H - 8, 'text-anchor': 'middle' }, 'axis');
    t.textContent = w;
  }
  // znacznik aktualnego tygodnia
  add('line', { x1: px(cw), y1: MT, x2: px(cw), y2: H - MB }, 'nowline');
  const hit = add('line', { x1: 0, y1: MT, x2: 0, y2: H - MB }, 'hitline');

  // linie serii + etykiety końcowe
  for (const s of series) {
    const d = s.pts.map((pt, i) => (i ? 'L' : 'M') + px(pt.w).toFixed(1) + ' ' + py(pt.kg).toFixed(1)).join(' ');
    add('path', { d, stroke: s.color }, 'serie');
    const last = s.pts[s.pts.length - 1];
    const lab = add('text', { x: px(last.w) + 6, y: py(last.kg) + 3 }, 'endlab');
    lab.textContent = fmt(last.kg);
    lab.setAttribute('fill', s.color);
  }
  // kropki aktualnego tygodnia
  const marks = [];
  for (const s of series) {
    const pt = s.pts.find(d => d.w === cw);
    if (!pt) continue;
    const c = add('circle', { cx: px(pt.w), cy: py(pt.kg), r: 4, fill: s.color, stroke: 'var(--s1)', 'stroke-width': 2 });
    marks.push(c);
  }
  const overlay = add('rect', { x: ML, y: 0, width: W - ML - MR + 10, height: H, fill: 'transparent' });
  wrap.append(svg);

  // dymek
  const tip = el('div', 'tip');
  wrap.append(tip);
  const showAt = clientX => {
    const r = svg.getBoundingClientRect();
    const vx = (clientX - r.left) / r.width * W;
    let w = Math.round((vx - ML) / (W - ML - MR) * 11) + 1;
    w = Math.max(1, Math.min(12, w));
    hit.setAttribute('x1', px(w)); hit.setAttribute('x2', px(w));
    hit.classList.add('on');
    tip.innerHTML = '';
    tip.append(el('div', 'th', 'Tydzień ' + w));
    for (const s of series) {
      const pt = s.pts.find(d => d.w === w);
      const row = el('div', 'row');
      const i = el('i'); i.style.background = s.color;
      row.append(i, el('span', null, s.short), el('b', null, pt ? fmt(pt.kg) + ' kg' : 'test'));
      tip.append(row);
    }
    tip.classList.add('on');
    const rel = px(w) / W * r.width;
    tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, rel - tip.offsetWidth / 2)) + 'px';
    tip.style.top = '4px';
  };
  const hide = () => { tip.classList.remove('on'); hit.classList.remove('on'); };
  overlay.addEventListener('pointerdown', e => showAt(e.clientX));
  overlay.addEventListener('pointermove', e => { if (e.pressure > 0 || e.pointerType === 'mouse') showAt(e.clientX); });
  overlay.addEventListener('pointerleave', hide);
  overlay.addEventListener('pointerup', hide);
  overlay.addEventListener('pointercancel', hide);

  const box = el('div');
  box.append(wrap);
  const legend = el('div', 'legend');
  for (const s of series) {
    const item = el('span');
    const i = el('i'); i.style.background = s.color;
    item.append(i, document.createTextNode(s.short));
    legend.append(item);
  }
  box.append(legend);
  const cap = el('p', null, 'Tydzień 7 to deload, dlatego wszystkie trzy linie schodzą. Wyciskanie kończy się na tygodniu 11 — dwunasty to test maksa, bez zaplanowanego ciężaru.');
  cap.style.fontSize = '12.5px'; cap.style.marginTop = '10px';
  box.append(cap);
  return box;
}

/* ---------- zasady ---------- */
function rulesView() {
  const frag = document.createDocumentFragment();
  frag.append(backLink());
  const body = el('div', 'stagger');
  body.append(head('Zasady', 'Nadrzędne wobec każdej liczby w tabelach', true));
  state.plan.rules.forEach(r => {
    const b = el('div', 'card');
    b.append(el('h3', null, r.heading));
    r.lines.forEach(l => b.append(el('p', null, l)));
    body.append(b);
  });
  const b = el('div', 'card');
  b.append(el('h3', null, 'Czego w rozgrzewce nie ma'));
  state.plan.warmup.skip.forEach(l => b.append(el('p', null, '• ' + l)));
  body.append(b);
  frag.append(body);
  return frag;
}

/* ---------- timer przerwy ---------- */
let tLeft = 0, tTotal = 0, tId = null, tFired = false;
const R = 24, CIRC = 2 * Math.PI * R;

function renderTimer() {
  const box = $('#timer');
  box.innerHTML = '';
  const inner = el('div', 'in');

  const ring = el('div', 'ring' + (tId ? '' : tFired ? ' done' : ' idle'));
  ring.innerHTML =
    `<svg viewBox="0 0 56 56"><circle class="bgc" cx="28" cy="28" r="${R}"/>` +
    `<circle class="fgc" cx="28" cy="28" r="${R}" stroke-dasharray="${CIRC.toFixed(1)}" ` +
    `stroke-dashoffset="${(CIRC * (1 - (tTotal ? tLeft / tTotal : 0))).toFixed(1)}"/></svg>`;
  const lab = el('div', 'lab', Math.floor(tLeft / 60) + ':' + String(tLeft % 60).padStart(2, '0'));
  ring.append(lab);
  inner.append(ring);

  [60, 90, 120, 180].forEach(s => {
    const b = el('button', 'tbtn' + (tId && tTotal === s ? ' on' : ''), s < 120 ? s + ' s' : (s / 60) + ' min');
    b.onclick = () => (tId && tTotal === s) ? stopTimer() : startTimer(s);
    inner.append(b);
  });
  box.append(inner);
}
function stopTimer() { clearInterval(tId); tId = null; tLeft = 0; tTotal = 0; tFired = false; renderTimer(); }
function startTimer(s) {
  clearInterval(tId);
  tLeft = s; tTotal = s; tFired = false;
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
    if (on && !lock && 'wakeLock' in navigator) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    }
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
  if (v !== '#/zasady' && v !== '#/1rm') app.append(weekBar());

  if (onDay) app.append(dayView(v.slice(4)));
  else if (v === '#/cardio') app.append(cardioView());
  else if (v === '#/tabela') app.append(tableView());
  else if (v === '#/zasady') app.append(rulesView());
  else if (v === '#/1rm') app.append(calcView());
  else app.append(homeView());

  keepAwake(onDay);
  renderTimer();
}

window.addEventListener('hashchange', () => { state.view = location.hash || '#/'; render(); });

/* ---------- start ---------- */
fetch('plan.json?v=6')
  .then(r => r.json())
  .then(p => {
    state.plan = p;
    loadState();
    if (!state.e1rm) state.e1rm = { ...p.e1rm };
    calc.kg = state.e1rm.bench ? round25(state.e1rm.bench * 0.85) : 100;
    render();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  })
  .catch(() => {
    $('#app').innerHTML = '<div class="note"><b>Nie udało się wczytać plan.json.</b> Otwórz stronę przez serwer (nie z pliku), np. <code>python -m http.server 8080</code>.</div>';
  });
