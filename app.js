/* Plan 12 tygodni — cała logika skoroszytu, bez skoroszytu.
   Stan trwały: numer tygodnia, trzy E1RM i przełącznik dźwięku. Nic więcej. */

const LS = 'trening.v1';
const state = {
  week: 1, e1rm: null, plan: null, view: location.hash || '#/', sound: true,
  log: {}, adjust: {}, acc: {}, kgw: {}, queue: [], key: null, sync: 'off',
  mob: {}, mobShort: false, autoDzis: true, rekal: {},
};

/* ---------- Supabase ---------- */
// Klucz publikowalny jest jawny z założenia. Bezpieczeństwo nie opiera się na nim,
// tylko na zamkniętej tabeli i kodzie planu — patrz tools/supabase.sql.
const SB_URL = 'https://jvbdodnoxzowviqwhzfr.supabase.co';
const SB_KEY = 'sb_publishable_RYMFMP8_vAaRy6vfgUFhjQ_qqhkOdr8';
// Wspólny dziennik: każde urządzenie startuje z tym samym kodem, więc nie trzeba
// niczego przepisywać. Świadomy wybór — kto zajrzy w źródło, może czytać i pisać.
// Własny kod w ustawieniach zamyka dziennik dla siebie.
const KOD_WSPOLNY = 'H4TQ-9MRW-2XKD';
const calc = { lift: 'bench', kg: 100, reps: 5, rpe: 8 };

const LIFTS = [
  { key: 'bench', short: 'Wyciskanie', full: 'Wyciskanie leżąc', color: 'var(--series-1)' },
  { key: 'front', short: 'Front squat', full: 'Front squat', color: 'var(--series-2)' },
  { key: 'dl', short: 'Ciąg', full: 'Martwy ciąg z podwyższenia', color: 'var(--series-3)' },
];
const DAY_COLOR = { A: 'var(--a)', B: 'var(--b)', C: 'var(--c)', D: 'var(--d)' };
// Kolory talerzy wg standardu IPF — czysta pomoc wzrokowa przy składaniu sztangi.
const PLATE_COLOR = { 25: '#c0392b', 20: '#2a6fc4', 15: '#d9b016', 10: '#1f8f4e', 5: '#e8e8e8', 2.5: '#1a1a1a', 1.25: '#9aa5b1' };

/* ---------- dziś ---------- */
// getDay(): 0 = niedziela. Wtorek, czwartek i sobota są wolne i zwracają null.
const DZIEN_TYG = { 1: 'A', 3: 'B', 5: 'C', 0: 'D' };
const NAZWA_DNIA = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
const dzisiaj = () => DZIEN_TYG[new Date().getDay()] || null;
const trasaDnia = k => (k === 'D' ? '#/mobilnosc' : '#/d/' + k);
const nazwaSesji = k => (k === 'D' ? 'joga' : 'Dzień ' + k);

// Najbliższa sesja, gdy dziś wolne. Szukamy w przód, więc zawsze coś znajdzie.
function najblizszaSesja() {
  const d = new Date().getDay();
  for (let i = 1; i <= 7; i++) {
    const j = (d + i) % 7;
    if (DZIEN_TYG[j]) return { key: DZIEN_TYG[j], dzien: NAZWA_DNIA[j], za: i };
  }
  return null;
}

/* ---------- pomocnicze ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const floor25 = x => Math.floor(x / 2.5) * 2.5;
// round25 pochodzi z progresja.js — jeden wspólny zasięg globalny, jedna definicja.
const fmt = n => (n == null ? '—' : String(Math.round(n * 100) / 100).replace('.', ','));
// Polska odmiana po liczebniku: 1 pozycja, 22 pozycje, ale 12 i 25 pozycji.
const odmiana = (n, jedna, kilka, wielu) => {
  const d = n % 10, s = n % 100;
  if (n === 1) return jedna;
  return (d >= 2 && d <= 4 && (s < 12 || s > 14)) ? kilka : wielu;
};

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS) || '{}');
    if (raw.week >= 1 && raw.week <= 12) state.week = raw.week;
    if (raw.e1rm) state.e1rm = raw.e1rm;
    if (typeof raw.sound === 'boolean') state.sound = raw.sound;
    if (typeof raw.autoDzis === 'boolean') state.autoDzis = raw.autoDzis;
  } catch { /* pierwszy start */ }
  const t = +new URLSearchParams(location.search).get('t');
  if (t >= 1 && t <= 12) state.week = t;
}
const save = () => {
  localStorage.setItem(LS, JSON.stringify({ week: state.week, e1rm: state.e1rm, sound: state.sound, autoDzis: state.autoDzis }));
  if (typeof pushStan === 'function') pushStan();
};

/* ---------- magazyn dziennika ---------- */
const LS_LOG = 'trening.log.v1', LS_ADJ = 'trening.adjust.v1', LS_ACC = 'trening.acc.v1';
const LS_Q = 'trening.queue.v1', LS_KEY = 'trening.key.v1', LS_MOB = 'trening.mob.v1';
const LS_REK = 'trening.rekal.v1', LS_KGW = 'trening.kgw.v1';
const readJSON = (k, dflt) => { try { return JSON.parse(localStorage.getItem(k)) ?? dflt; } catch { return dflt; } };
const saveLog = () => localStorage.setItem(LS_LOG, JSON.stringify(state.log));
const saveAdjust = () => { localStorage.setItem(LS_ADJ, JSON.stringify(state.adjust)); pushStan(); };
const saveAcc = () => { localStorage.setItem(LS_ACC, JSON.stringify(state.acc)); pushStan(); };
// Ciezar boju zmieniony recznie: plan zostaje planem, ale sztanga wazy tyle,
// ile wpisano. Zapis per tydzien, bo plan co tydzien podaje inna liczbe.
const saveKgw = () => { localStorage.setItem(LS_KGW, JSON.stringify(state.kgw)); pushStan(); };
const saveQueue = () => localStorage.setItem(LS_Q, JSON.stringify(state.queue));
// Niedziela nie ma serii ani kilogramów, więc nie idzie do tabeli `sety` — jedzie
// razem ze stanem planu, tym samym kanałem co tydzień i E1RM.
const saveMob = () => { localStorage.setItem(LS_MOB, JSON.stringify(state.mob)); pushStan(); };
const saveRekal = () => { localStorage.setItem(LS_REK, JSON.stringify(state.rekal)); pushStan(); };

function loadStores() {
  state.log = readJSON(LS_LOG, {});
  state.adjust = readJSON(LS_ADJ, {});
  state.acc = readJSON(LS_ACC, {});
  state.kgw = readJSON(LS_KGW, {});
  state.mob = readJSON(LS_MOB, {});
  state.rekal = readJSON(LS_REK, {});
  state.queue = readJSON(LS_Q, []);
  state.key = localStorage.getItem(LS_KEY) || KOD_WSPOLNY;
  localStorage.setItem(LS_KEY, state.key);
}

// Kod planu: 12 znaków bez liter mylących się z cyframi, w grupach po cztery.
function newPlanKey() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = crypto.getRandomValues(new Uint8Array(12));
  const s = [...b].map(x => abc[x % abc.length]).join('');
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8, 12);
}

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
  state.week = w; save(); maybeAdjust(); render();
  window.scrollTo({ top: 0 });
}

/* ---------- ekran główny ---------- */
function homeView() {
  const p = state.plan, w = state.week, frag = document.createDocumentFragment();
  const body = el('div', klasaWejscia());
  const deload = String(lowerRow(w).block).toLowerCase() === 'deload';

  const adj = adjustCard();
  if (adj) body.append(adj);

  const rek = rekalibracjaCard();
  if (rek) body.append(rek);

  // W dzień bez sesji mówimy wprost, kiedy następna — inaczej ekran wygląda
  // tak samo w poniedziałek i we wtorek.
  const dzis = dzisiaj();
  if (!dzis) {
    const n = najblizszaSesja();
    body.append(noteBox('Dziś wolne.', ` Najbliżej: ${n.dzien}, ${nazwaSesji(n.key)}.`));
  }

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
    const pg = postepDnia(w, k);
    tiles.append(tile({
      k, color: DAY_COLOR[k], title: d.title,
      sub: pg.done ? `${d.day} · ${pg.done}/${pg.total} serii zapisanych` : `${d.day} · ${d.items.length} ćwiczeń · ~${d.minutes} min`,
      badge: k === dzis ? 'DZIŚ' : null,
      progress: pg,
      right: kg != null ? { v: fmt(kg) + ' kg', u: lift === 'bench' ? 'wyciskanie' : 'front squat' } : null,
      href: '#/d/' + k,
    }));
  }
  const m = p.mobility;
  const mDone = mobDone(w), mAll = mobItems().length;
  tiles.append(tile({
    k: m.key, color: DAY_COLOR.D, title: m.title,
    sub: `${m.day} · ${mAll} ${odmiana(mAll, 'pozycja', 'pozycje', 'pozycji')} · ~${m.minutes} min`,
    badge: dzis === 'D' ? 'DZIŚ' : null,
    progress: { done: mDone, total: mAll },
    right: mDone ? { v: mDone + '/' + mAll, u: 'zrobione' } : null,
    href: '#/mobilnosc',
  }));
  tiles.append(tile({ k: '≡', ghost: true, title: 'Postęp', sub: podsumowanieBlokow(), href: '#/postep' }));
  tiles.append(tile({ k: '§', ghost: true, title: 'Zasady', sub: 'Jak prowadzić cykl', href: '#/zasady' }));
  tiles.append(tile({ k: '⚙', ghost: true, title: 'Dziennik i urządzenia', sub: syncLabel(), href: '#/ustawienia' }));
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
  const pod = el('div', 'e1stopka');
  const kal = el('button', 'link', 'Przelicz z serii →');
  kal.onclick = () => go('#/1rm');
  const reset = el('button', 'link', 'Przywróć wartości z planu');
  reset.onclick = () => { state.e1rm = { ...state.plan.e1rm }; save(); render(); };
  pod.append(kal, reset);
  box.append(pod);
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

function tile({ k, color, ghost, title, sub, right, href, badge, progress }) {
  const b = el('button', 'tile');
  if (color) b.style.setProperty('--tc', color);
  if (badge) b.classList.add('dzis');
  const kk = el('div', 'k' + (ghost ? ' ghost' : ''), k);
  // Pierścień wokół litery pokazuje, ile z sesji jest już zapisane. Jedno
  // spojrzenie na ekran główny mówi, co w tym tygodniu zostało do zrobienia.
  if (progress && progress.total) {
    const R = 21, C = 2 * Math.PI * R;
    const ile = Math.min(1, progress.done / progress.total);
    const ring = el('div', 'kring');
    if (ile >= 1) ring.classList.add('pelny');
    ring.innerHTML =
      `<svg viewBox="0 0 46 46"><circle class="kbg" cx="23" cy="23" r="${R}"/>` +
      `<circle class="kfg" cx="23" cy="23" r="${R}" stroke-dasharray="${C.toFixed(1)}" ` +
      `stroke-dashoffset="${(C * (1 - ile)).toFixed(1)}"/></svg>`;
    kk.append(ring);
  }
  b.append(kk);
  const mid = el('div');
  mid.style.minWidth = '0';
  const tt = el('div', 'tt', title);
  if (badge) tt.append(el('span', 'bdg', badge));
  mid.append(tt);
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

// Ile serii z zaplanowanych jest już zapisanych w tym dniu i tygodniu.
function postepDnia(w, key) {
  let total = 0, done = 0;
  state.plan.days[key].items.forEach(it => {
    total += plannedOf(it, w, key).sets;
    done += logGet(w, key, it.n).filter(Boolean).length;
  });
  return { done, total };
}

/* ---------- wybór tygodnia zapisu ---------- */
// Plan mówi, co robić w tygodniu N. Życie mówi co innego — sesja wypada w czwartek,
// dwie z rzędu przepadają, jedną trzeba poprawić po fakcie. Ten pasek pozwala pisać
// do dowolnego tygodnia BEZ ruszania tygodnia bieżącego: numer w pasku na górze
// zostaje tam, gdzie był, bo od niego zależą ciężary, korekty i synchronizacja.
const tydzienZAdresu = t => { const n = +t; return n >= 1 && n <= 12 ? n : null; };

function wyborTygodnia(w, trasa) {
  const box = el('div', 'wybor');
  const biezacy = w === state.week;

  const naglowek = el('button', 'wyborbtn');
  naglowek.append(el('span', 'wl', biezacy ? 'Tydzień' : 'Zapisuję do tygodnia'));
  naglowek.append(el('b', null, String(w)));
  if (!biezacy) naglowek.append(el('span', 'wost', `bieżący: ${state.week}`));
  naglowek.append(el('span', 'wstrz', '▾'));
  box.append(naglowek);

  const chipy = el('div', 'wchipy');
  chipy.hidden = biezacy ? true : false;
  for (let i = 1; i <= 12; i++) {
    const c = el('button', 'wchip' + (i === w ? ' on' : '') + (i === state.week ? ' biez' : ''), String(i));
    if (isDeload(i)) c.classList.add('dl');
    c.onclick = () => go(trasa(i));
    chipy.append(c);
  }
  box.append(chipy);
  naglowek.onclick = () => {
    chipy.hidden = !chipy.hidden;
    $('.wstrz', naglowek).textContent = chipy.hidden ? '▾' : '▴';
  };

  if (!biezacy) {
    box.classList.add('obcy');
    const wroc = el('button', 'wwroc', `‹ Wróć do tygodnia ${state.week}`);
    wroc.onclick = () => go(trasa(state.week));
    box.append(wroc);
  }
  return box;
}

/* ---------- dzień treningowy ---------- */
function dayView(key, wArg) {
  const p = state.plan, w = wArg || state.week, d = p.days[key];
  const frag = document.createDocumentFragment();
  frag.append(backLink());

  const wrapper = el('div');
  wrapper.style.setProperty('--dc', DAY_COLOR[key]);
  wrapper.append(head(`Dzień ${d.key} — ${d.title}`, `${d.day} · ~${d.minutes} min`, true));
  wrapper.append(wyborTygodnia(w, x => '#/d/' + key + '/' + x));

  const { done, total } = postepDnia(w, key);
  if (total) {
    const sp = el('div', 'sprog');
    sp.id = 'sprog';
    sp.append(el('span', 'ile', `${done}/${total} serii`));
    const bar = el('div', 'bar'); const fill = el('div', 'fill');
    fill.style.width = (done / total * 100) + '%';
    bar.append(fill); sp.append(bar);
    sp.append(el('span', 'proc', Math.round(done / total * 100) + '%'));
    wrapper.append(sp);
  }

  wrapper.append(warmupAcc(key, w));

  if (key === 'C') {
    const bh = lowerRow(w).barHeight;
    if (bh) wrapper.append(noteBox('Wysokość gryfu w ciągu:', ' ' + bh + '.'));
  }

  const list = el('div', klasaWejscia());
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

  wrapper.append(podsumowanieSesji(key, w));

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

  const pl = plannedOf(it, w, key);

  const metrics = el('div', 'metrics');
  metrics.append(metric('Serie × powt.', scheme, 'mv'));
  let platesRow = null, odswiezKg = null;
  if (isKg(load)) {
    // Liczba na karcie i talerze na gryfie pokazuja ciezar, ktory naprawde stoi
    // na stojaku — czyli z wlasna poprawka, jesli ktos ja wprowadzil.
    const m = metric('Ciężar', fmt(pl.kg), 'mv kg', 'kg');
    const v = $('.mv', m);
    v.classList.add('kgbtn');
    v.setAttribute('role', 'button');
    v.title = 'Pokaż talerze';
    platesRow = platesEl(pl.kg);
    v.onclick = () => platesRow.classList.toggle('on');
    metrics.append(m);
    odswiezKg = kg => {
      v.textContent = fmt(kg);
      v.append(el('u', null, 'kg'));
      platesRow.innerHTML = '';
      platesRow.append(...[...platesEl(kg).children]);
    };
  } else if (load) {
    metrics.append(metric('Ciężar', load, 'mv txt'));
  }
  if (rpe != null && rpe !== '—') metrics.append(metric('Sufit RPE', fmt(rpe), 'mv'));
  box.append(metrics);
  if (platesRow) box.append(platesRow);

  if (pl.sets) box.append(setRows(it, key, w, pl, odswiezKg));

  const hist = ostatnieWykonanie(it, key, w);
  if (hist) {
    const h = el('div', 'ostatnio');
    h.append(el('span', null, 'Ostatnio'), el('b', null, hist.opis), el('i', null, 'tydz. ' + hist.tydzien));
    box.append(h);
  }

  const prop = accProgress(it, key, w);
  if (prop != null) {
    const chip = el('button', 'progchip');
    chip.textContent = `Dwa tygodnie z kompletem — podnieś do ${fmt(prop)} kg`;
    chip.onclick = () => { state.acc[accKey(it)] = prop; saveAcc(); render(); };
    box.append(chip);
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

// Proporcje talerzy żeliwnych: średnica i grubość względem krążka 25 kg.
// Dzięki nim rysunek jest rozpoznawalny bez czytania podpisów — 20 kg widać
// po tym, że jest tej samej wysokości co 25 i cieńszy, a 1,25 to mały spodek.
const PLATE_GEO = {
  25: { h: 1, w: 1 }, 20: { h: 1, w: .86 }, 15: { h: .88, w: .72 }, 10: { h: .72, w: .58 },
  5: { h: .51, w: .42 }, 2.5: { h: .42, w: .3 }, 1.25: { h: .35, w: .24 },
};

/* Załadowany gryf zamiast listy pastylek.
 * To nie jest ozdoba: instrukcja ładowania narysowana tak, jak ta rzecz wygląda
 * na stojaku. Kolory wg standardu IPF, talerze ciężkie przy kołnierzu, lekkie
 * na zewnątrz — czyli w kolejności, w jakiej je zakładasz. */
function platesEl(total) {
  const box = el('div', 'plates');
  const { pairs, note } = plateList(total);
  const W = 300, H = 74, CY = H / 2, UCHWYT = 28, JEDN = 12;

  const szerSurowa = pairs.reduce((a, p) => a + p.n * (PLATE_GEO[p.kg] || { w: .5 }).w * JEDN, 0);
  const dostepne = W / 2 - UCHWYT - 12;
  const skala = szerSurowa > dostepne ? dostepne / szerSurowa : 1;

  const czesci = [];
  // Trzon z hintem radełkowania w środku.
  czesci.push(`<rect class="trzon" x="0" y="${CY - 2.5}" width="${W}" height="5" rx="2.5"/>`);
  for (let x = W / 2 - 20; x <= W / 2 + 20; x += 5) {
    czesci.push(`<line class="radelko" x1="${x}" y1="${CY - 2}" x2="${x}" y2="${CY + 2}"/>`);
  }
  // Kołnierze.
  for (const zn of [-1, 1]) {
    czesci.push(`<rect class="kolnierz" x="${W / 2 + zn * UCHWYT - (zn < 0 ? 5 : 0)}" y="${CY - 7}" width="5" height="14" rx="1"/>`);
  }

  let i = 0;
  for (const zn of [-1, 1]) {
    let kursor = W / 2 + zn * (UCHWYT + 5);
    for (const p of pairs) {
      const g = PLATE_GEO[p.kg] || { h: .5, w: .5 };
      const szer = Math.max(3, g.w * JEDN * skala), wys = g.h * (H - 12);
      for (let n = 0; n < p.n; n++) {
        const x = zn < 0 ? kursor - szer : kursor;
        czesci.push(
          `<rect class="talerz" x="${x.toFixed(1)}" y="${(CY - wys / 2).toFixed(1)}" ` +
          `width="${szer.toFixed(1)}" height="${wys.toFixed(1)}" rx="1.5" ` +
          `fill="${PLATE_COLOR[p.kg] || '#8b95a3'}" style="animation-delay:${(i++ * 34)}ms"/>`);
        kursor += zn * (szer + 1);
      }
    }
  }

  const svg = el('div', 'gryf');
  svg.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${czesci.join('')}</svg>`;
  box.append(svg);

  // Podpis liczbowy zostaje — rysunek mówi „co", podpis mówi „ile".
  const opis = el('div', 'plnote');
  opis.append(el('b', null, pairs.length ? pairs.map(p => p.n + '×' + fmt(p.kg)).join('  ') : 'sam gryf'));
  opis.append(el('span', null, note + (pairs.length ? ' · gryf ' + fmt(state.plan.bar) + ' kg' : '')));
  box.append(opis);
  return box;
}

function podsumowanieSesji(day, w) {
  const teraz = tonazDnia(w, day);
  const box = el('div', 'card podsum');
  box.append(el('h3', null, 'Podsumowanie sesji'));
  if (!teraz.serie) {
    box.append(el('p', null, 'Jeszcze nic nie odklikane w tym tygodniu.'));
    return box;
  }
  const grid = el('div', 'psgrid');
  const kafel = (etykieta, wartosc, dopisek) => {
    const k = el('div', 'ps');
    k.append(el('div', 'pl2', etykieta), el('div', 'pv', wartosc));
    if (dopisek) k.append(el('div', 'pd', dopisek));
    return k;
  };
  let total = 0;
  state.plan.days[day].items.forEach(it => { total += plannedOf(it, w, day).sets; });
  grid.append(kafel('Serie', teraz.serie + '/' + total));
  // Porownanie z ostatnim tygodniem, w ktorym ten dzien byl w ogole robiony.
  let poprz = null;
  for (let i = w - 1; i >= 1; i--) { const t = tonazDnia(i, day); if (t.serie) { poprz = { ...t, tydzien: i }; break; } }
  let dopisek = null;
  if (poprz && poprz.ton) {
    const proc = Math.round((teraz.ton / poprz.ton - 1) * 100);
    dopisek = (proc > 0 ? '+' : '') + proc + '% vs tydz. ' + poprz.tydzien;
  }
  grid.append(kafel('Tonaż', Math.round(teraz.ton).toLocaleString('pl-PL') + ' kg', dopisek));
  box.append(grid);
  box.append(el('p', null, 'Tonaż liczy tylko ćwiczenia z ciężarem w kilogramach — guma i masa ciała do niego nie wchodzą.'));
  return box;
}

/* ---------- rozgrzewka ---------- */
function warmupAcc(key, wArg) {
  const p = state.plan, w = wArg || state.week, wu = p.warmup.days[key];
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
  const body = el('div', klasaWejscia());
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

/* ---------- niedziela: mobilność ---------- */
// Odklikane pozycje trzymamy per tydzień — w poniedziałek lista wstaje czysta,
// a w podsumowaniu widać, ile niedziel faktycznie się odbyło.
const mobItems = () => state.plan.mobility.blocks.flatMap(b => b.items);
const mobWidoczne = () => (state.mobShort ? mobItems().filter(i => i.core) : mobItems());
const mobDone = w => { const t = state.mob[w] || {}; return mobWidoczne().filter(i => t[i.id]).length; };
const mobJest = (w, id) => !!(state.mob[w] || {})[id];
function mobToggle(w, id) {
  const t = state.mob[w] || (state.mob[w] = {});
  if (t[id]) delete t[id]; else t[id] = 1;
  if (!Object.keys(t).length) delete state.mob[w];
  saveMob();
}

function mobilityView(wArg) {
  const p = state.plan, w = wArg || state.week, m = p.mobility;
  const frag = document.createDocumentFragment();
  frag.append(backLink());

  const body = el('div');
  body.style.setProperty('--dc', DAY_COLOR.D);
  body.append(head(`Dzień ${m.key} — ${m.title}`,
    `${m.day} · ~${state.mobShort ? m.shortMinutes : m.minutes} min`, true));
  body.append(wyborTygodnia(w, x => '#/mobilnosc/' + x));

  const widoczne = mobWidoczne();
  const done = mobDone(w), total = widoczne.length;
  const sp = el('div', 'sprog');
  sp.append(el('span', 'ile', `${done}/${total} pozycji`));
  const bar = el('div', 'bar'), fill = el('div', 'fill');
  fill.style.width = (total ? done / total * 100 : 0) + '%';
  bar.append(fill); sp.append(bar);
  sp.append(el('span', 'proc', Math.round(total ? done / total * 100 : 0) + '%'));
  body.append(sp);

  // Przełącznik wersji. Krótka zostawia same pozycje oznaczone jako `core`.
  const sw = el('div', 'mobsw');
  const przycisk = (etykieta, krotka) => {
    const b = el('button', 'mobopt' + (state.mobShort === krotka ? ' on' : ''), etykieta);
    b.onclick = () => { state.mobShort = krotka; render(); };
    return b;
  };
  sw.append(przycisk(`Pełna · ~${m.minutes} min`, false), przycisk(`Krótka · ~${m.shortMinutes} min`, true));
  body.append(sw);

  body.append(noteBox('Po co to jest:', ' ' + m.intro));

  const list = el('div', klasaWejscia());
  for (const blok of m.blocks) {
    const poz = state.mobShort ? blok.items.filter(i => i.core) : blok.items;
    if (!poz.length) continue;
    const hdr = el('div', 'mobblock');
    hdr.append(el('div', 'mbn', String(blok.n)));
    const mid = el('div', 'mbt');
    mid.append(el('div', 'mbname', blok.name));
    mid.append(el('div', 'mbwhy', blok.why));
    hdr.append(mid);
    hdr.append(el('div', 'mbmin', '~' + blok.minutes + ' min'));
    list.append(hdr);
    poz.forEach(it => list.append(mobCard(it, w)));
  }
  body.append(list);

  const zas = el('div', 'card');
  zas.append(el('h3', null, 'Jak prowadzić ten dzień'));
  m.rules.forEach(l => zas.append(el('p', null, l)));
  body.append(zas);

  body.append(mobReset(w));
  frag.append(body);
  return frag;
}

function mobCard(it, w) {
  const box = el('div', 'ex mob');
  const zrobione = mobJest(w, it.id);
  if (zrobione) box.classList.add('zrobione');

  const h = el('div', 'exhead');
  const tick = el('button', 'tick', zrobione ? '✓' : '');
  tick.setAttribute('aria-label', zrobione ? 'Cofnij' : 'Odhacz jako zrobione');
  tick.onclick = () => {
    mobToggle(w, it.id);
    // Sama pozycja i pasek postępu — bez przebudowy całego ekranu, żeby lista
    // nie skakała pod palcem przy odklikiwaniu.
    const nowe = mobJest(w, it.id);
    box.classList.toggle('zrobione', nowe);
    tick.textContent = nowe ? '✓' : '';
    tick.setAttribute('aria-label', nowe ? 'Cofnij' : 'Odhacz jako zrobione');
    odswiezPasekMob(w);
  };
  h.append(tick);
  h.append(el('div', 'exname', it.name));
  const chips = el('div', 'chips');
  if (it.core) chips.append(el('div', 'chip ss', '• krótka'));
  if (chips.children.length) h.append(chips);
  box.append(h);

  const metrics = el('div', 'metrics');
  metrics.append(metric('Dawka', it.dose, 'mv txt'));
  if (it.sec) {
    const b = el('button', 'timebtn', '⏱ ' + (it.sec >= 60 ? it.sec / 60 + ' min' : it.sec + ' s'));
    b.onclick = () => startTimer(it.sec);
    metrics.append(b);
  }
  box.append(metrics);

  const note = el('div', 'exnote', it.note);
  note.hidden = true;
  const more = el('button', 'more', 'Jak to zrobić ▾');
  more.onclick = () => {
    note.hidden = !note.hidden;
    more.textContent = note.hidden ? 'Jak to zrobić ▾' : 'Zwiń ▴';
  };
  box.append(more, note);
  return box;
}

function odswiezPasekMob(w) {
  const sp = $('.sprog');
  if (!sp) return;
  const total = mobWidoczne().length, done = mobDone(w);
  const proc = total ? done / total * 100 : 0;
  $('.ile', sp).textContent = `${done}/${total} pozycji`;
  $('.fill', sp).style.width = proc + '%';
  $('.proc', sp).textContent = Math.round(proc) + '%';
}

// Kasowanie zawsze przez potwierdzenie i tylko w obrębie jednego tygodnia —
// jedno tapnięcie nie ma prawa zetrzeć niczego, czego nie widać na ekranie.
function mobReset(w) {
  const box = el('div', 'card');
  const b = el('button', 'btn ghost', 'Odznacz wszystko w tygodniu ' + w);
  let pewny = false;
  b.onclick = () => {
    if (!pewny) { pewny = true; b.textContent = 'Na pewno? Tapnij jeszcze raz'; b.classList.add('warn'); return; }
    delete state.mob[w];
    saveMob();
    render();
  };
  box.append(b);
  return box;
}

/* ---------- raport bloków i rekalibracja ---------- */
// Podział na bloki idzie za regułą rekalibracji z arkusza Zasady („po tygodniu 3
// i po tygodniu 7"), a nie za kolumną BLOK — ta wraca po deloadzie do wartości 2
// i nie da się z niej wyciąć rozłącznych odcinków. Tydzień 7 jest w bloku 2, ale
// jako deload nie wchodzi do oceny.
const BLOKI = [
  { n: 1, weeks: [1, 2, 3], rekal: 4 },
  { n: 2, weeks: [4, 5, 6, 7], rekal: 8 },
  { n: 3, weeks: [8, 9, 10, 11, 12], rekal: null },
];
// Rekalibracja dotyczy WYŁĄCZNIE dołu. Góra ma E1RM policzone z realnej serii,
// więc arkusz nie każe jej ruszać.
const REKAL_BOJE = ['front', 'dl'];

const tygodnieOceniane = blok => blok.weeks.filter(x => !isDeload(x));
const blokZakonczony = blok => state.week > blok.weeks[blok.weeks.length - 1];
const blokTrwa = blok => blok.weeks.includes(state.week);

// Ocena jednego boju w bloku: po jednym werdykcie na tydzień treningowy.
const ocenaBojuWBloku = (key, blok) => ocenaBloku(tygodnieOceniane(blok).map(x => judgeWeek(key, x)));

// Czy blok kwalifikuje się do rekalibracji i czy nie jest już rozliczony.
function rekalDoWziecia(blok) {
  if (!blok.rekal || state.week < blok.rekal) return null;
  if (state.rekal[blok.rekal]) return null;
  const zmiany = {};
  for (const key of REKAL_BOJE) {
    const ocena = ocenaBojuWBloku(key, blok);
    const nowe = rekalibracja(state.e1rm[key], ocena);
    if (nowe == null) return { blok, ocena: false };
    zmiany[key] = { before: state.e1rm[key], after: nowe };
  }
  return { blok, ocena: true, zmiany };
}

function zastosujRekalibracje(blok, zmiany) {
  for (const key of REKAL_BOJE) state.e1rm[key] = zmiany[key].after;
  state.rekal[blok.rekal] = { ...zmiany, ts: new Date().toISOString() };
  save(); saveRekal();
}

function cofnijRekalibracje(trigger) {
  const r = state.rekal[trigger];
  if (!r || r.pominieta) return;
  for (const key of REKAL_BOJE) if (r[key]) state.e1rm[key] = r[key].before;
  state.rekal[trigger] = { ...r, pominieta: true };
  save(); saveRekal();
}

// Karta na ekranie głównym: pojawia się tylko wtedy, gdy jest co zrobić.
function rekalibracjaCard() {
  const blok = BLOKI.find(b => b.rekal && state.week >= b.rekal && !state.rekal[b.rekal]);
  if (!blok) return null;
  const w = rekalDoWziecia(blok);
  if (!w) return null;

  const n = el('div', 'note rekal');
  n.append(el('b', null, `Rekalibracja po bloku ${blok.n}`));

  if (!w.ocena) {
    const braki = REKAL_BOJE.map(k => ({ k, o: ocenaBojuWBloku(k, blok) })).filter(x => !x.o.komplet);
    const opis = braki.map(({ k, o }) => {
      const L = LIFTS.find(x => x.key === k);
      return o.niedowozy ? `${L.short}: ${o.niedowozy} × niedowóz`
                         : `${L.short}: ${o.zapisanych}/${o.tygodni} tygodni zapisanych`;
    }).join(' · ');
    n.append(el('div', 'adjrow', 'Bez podwyżki — nie każda sesja weszła w plan.'));
    n.append(el('div', 'adjrow', opis));
    const ok = el('button', 'mini', 'Rozumiem, schowaj');
    ok.onclick = () => { state.rekal[blok.rekal] = { pominieta: true, ts: new Date().toISOString() }; saveRekal(); render(); };
    const doRaportu = el('button', 'mini', 'Zobacz raport');
    doRaportu.onclick = () => go('#/raport');
    n.append(ok, doRaportu);
    return n;
  }

  n.append(el('div', 'adjrow', 'Każda sesja dołu weszła w plan. Arkusz mówi: +10%.'));
  for (const key of REKAL_BOJE) {
    const L = LIFTS.find(x => x.key === key), z = w.zmiany[key];
    const p = el('div', 'adjrow');
    const dot = el('span', 'dotc'); dot.style.background = L.color;
    p.append(dot, el('span', null, `${L.short} → ${fmt(z.after)} kg`));
    p.append(el('em', null, `było ${fmt(z.before)}`));
    n.append(p);
  }
  const tak = el('button', 'mini', 'Podnieś o 10%');
  tak.onclick = () => { zastosujRekalibracje(blok, w.zmiany); render(); };
  const nie = el('button', 'mini', 'Zostaw jak jest');
  nie.onclick = () => { state.rekal[blok.rekal] = { pominieta: true, ts: new Date().toISOString() }; saveRekal(); render(); };
  n.append(tak, nie);
  n.append(el('div', 'adjmini', 'Sufit RPE jest nadrzędny. Jeśli pierwszy tydzień po podwyżce wyjdzie ciężej niż sufit, cofnij ją w raporcie.'));
  return n;
}

function podsumowanieBlokow() {
  const gotowe = BLOKI.filter(blokZakonczony).length;
  const czeka = BLOKI.some(b => b.rekal && state.week >= b.rekal && !state.rekal[b.rekal]);
  if (czeka) return 'Rekalibracja czeka na decyzję';
  if (!gotowe) return 'Wykres, werdykty sesji i tabele';
  return `${gotowe} ${odmiana(gotowe, 'blok zamknięty', 'bloki zamknięte', 'bloków zamkniętych')} · wykres i werdykty`;
}

const SLOWNIK_OCEN = { czysto: 'czysto', zapas: 'z zapasem', niedowoz: 'niedowóz', brak: '—' };

function postepView() {
  const frag = document.createDocumentFragment();
  frag.append(backLink());
  const body = el('div', klasaWejscia());
  body.append(head('Postęp', 'Wykres, bloki i tabele na 12 tygodni', true));

  const chartCard = el('div', 'card');
  chartCard.append(el('h3', null, 'Ciężar roboczy przez 12 tygodni'));
  chartCard.append(progressChart());
  body.append(chartCard);

  body.append(noteBox('Skąd te werdykty:',
    ' aplikacja porównuje zapisane serie z tym, co plan przewidywał W CHWILI ZAPISU. ' +
    'Odczucia z sufitu RPE zna tylko Twoja głowa — jeśli sesja weszła w powtórzenia, ale kosztowała więcej niż powinna, ostatnie słowo należy do Ciebie.'));

  for (const blok of [...BLOKI].reverse()) {
    if (!blokZakonczony(blok) && !blokTrwa(blok)) continue;
    const card = el('div', 'card');
    const zakres = blok.weeks[0] + '–' + blok.weeks[blok.weeks.length - 1];
    card.append(el('h3', null, `Blok ${blok.n} · tygodnie ${zakres}${blokTrwa(blok) ? ' · w toku' : ''}`));

    // Werdykty: wiersz na tydzień, kolumna na bój.
    const wrap = el('div', 'scroll'); wrap.style.margin = '0'; wrap.style.padding = '0';
    const t = el('table');
    t.innerHTML = '<thead><tr><th>Tydz.</th>' + LIFTS.map(L => '<th>' + esc(L.short) + '</th>').join('') + '</tr></thead><tbody>' +
      blok.weeks.filter(x => x <= state.week).map(x => {
        const dl = isDeload(x);
        const kom = dl ? '<td colspan="3">deload — nie oceniamy</td>'
                       : LIFTS.map(L => '<td>' + esc(SLOWNIK_OCEN[judgeWeek(L.key, x)]) + '</td>').join('');
        return `<tr class="${x === state.week ? 'now' : ''}"><td>${x}</td>${kom}</tr>`;
      }).join('') + '</tbody>';
    wrap.append(t); card.append(wrap);

    // Frekwencja i liczba serii — liczone z dziennika.
    const doTeraz = blok.weeks.filter(x => x <= state.week);
    let sesjeZapisane = 0, serie = 0;
    for (const x of doTeraz) {
      for (const d of ['A', 'B', 'C']) {
        const t = tonazDnia(x, d);
        if (t.serie) sesjeZapisane++;
        serie += t.serie;
      }
    }
    const niedziele = doTeraz.filter(x => Object.keys(state.mob[x] || {}).length).length;

    const grid = el('div', 'psgrid trzy');
    const kafel = (etykieta, wartosc, dopisek) => {
      const k = el('div', 'ps');
      k.append(el('div', 'pl2', etykieta), el('div', 'pv', wartosc));
      if (dopisek) k.append(el('div', 'pd', dopisek));
      return k;
    };
    grid.append(kafel('Sesje', `${sesjeZapisane}/${doTeraz.length * 3}`, 'zapisane w dzienniku'));
    grid.append(kafel('Serie', String(serie), 'zapisane w bloku'));
    grid.append(kafel('Niedziele', `${niedziele}/${doTeraz.length}`, 'z odklikaną jogą'));
    card.append(grid);

    card.append(rekalibracjaHistoria(blok));
    body.append(card);
  }

  body.append(tabeleTygodni());
  frag.append(body);
  return frag;
}

function rekalibracjaHistoria(blok) {
  const box = el('div', 'rekhist');
  if (!blok.rekal) {
    box.append(el('p', null, 'Ostatni blok — arkusz nie przewiduje tu rekalibracji. Tydzień 12 zamyka cykl testem.'));
    return box;
  }
  const r = state.rekal[blok.rekal];
  if (!r) {
    box.append(el('p', null, state.week >= blok.rekal
      ? 'Rekalibracja czeka na decyzję — karta jest na ekranie głównym.'
      : `Rekalibracja po tym bloku: w tygodniu ${blok.rekal}.`));
    return box;
  }
  if (r.pominieta) {
    box.append(el('p', null, 'Rekalibracja pominięta — ciężary zostały bez zmian.'));
    return box;
  }
  for (const key of REKAL_BOJE) {
    if (!r[key]) continue;
    const L = LIFTS.find(x => x.key === key);
    const p = el('div', 'adjrow');
    const dot = el('span', 'dotc'); dot.style.background = L.color;
    p.append(dot, el('span', null, `${L.short}: ${fmt(r[key].before)} → ${fmt(r[key].after)} kg`));
    box.append(p);
  }
  const cof = el('button', 'mini', 'Cofnij rekalibrację');
  cof.onclick = () => { cofnijRekalibracje(blok.rekal); render(); };
  box.append(cof);
  return box;
}

/* ---------- wykres progresji + tabele ---------- */
// Tabele tygodni jako materiał do przejrzenia, nie do czytania na siłowni —
// dlatego siedzą zwinięte w akordeonie widoku Postęp.
function tabeleTygodni() {
  const p = state.plan, w = state.week;
  const acc = el('details', 'acc');
  acc.append(el('summary', null, 'Tabele tygodni — pełne 12 tygodni'));
  const body = el('div', 'accbody');

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

  acc.append(body);
  return acc;
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
  const body = el('div', klasaWejscia());
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

/* ---------- dziennik serii ---------- */
// Klucz wpisu: "tydzien|dzien|numer cwiczenia". Wartosc: tablica serii {r, kg, ts}.
const logKey = (w, day, n) => `${w}|${day}|${n}`;

// Ile serii, ile powtorzen (albo sekund/metrow) i jaki ciezar przewiduje plan.
// "4 × 8" → {sets:4, target:8}   "3 × 30 s / nogę" → {sets:3, target:30, unit:'s'}
// "test 1RM" → {sets:0}
function plannedOf(it, w, day) {
  const scheme = String(resolve(it.scheme, w) || '');
  const m = scheme.match(/^\s*(\d+)\s*[×x]\s*(\d+)\s*(s|min|m)?/);
  const load = resolve(it.load, w);
  const acc = state.acc[accKey(it)];
  // Przy ćwiczeniu dodatkowym ciężaru nie ma w planie — bierzemy własne ustawienie,
  // a jak go nie ma, to ostatni zapisany, żeby nie przepisywać go co tydzień.
  const wlasny = acc != null ? acc : (day ? lastKgOf(it, w, day) : null);
  // Przy boju ciężar JEST w planie, ale suwak może go nadpisać: sztanga stoi
  // w piwnicy, a nie w arkuszu. Nadpisanie trzyma się jednego tygodnia, bo plan
  // co tydzień podaje inną liczbę i przenoszenie odchyłki na zawsze byłoby kłamstwem.
  const wlasnyBoj = day ? kgwGet(w, day, it.n) : null;
  return {
    sets: m ? Math.min(+m[1], 12) : 0,
    target: m ? +m[2] : null,
    unit: m && m[3] ? m[3] : null,
    kg: isKg(load) ? (wlasnyBoj != null ? wlasnyBoj : load) : wlasny,
    planKg: isKg(load) ? load : null,     // czy ciezar pochodzi z planu, czy jest wlasny
  };
}

function lastKgOf(it, w, day) {
  for (let i = w - 1; i >= 1; i--) {
    const row = logGet(i, day, it.n).find(r => r && r.kg != null);
    if (row) return row.kg;
  }
  return null;
}

// Podwójna progresja: dwa ostatnie tygodnie treningowe z kompletem powtórzeń
// → propozycja najmniejszego skoku. Bez liczbowego ciężaru nie ma czego dodać.
function accProgress(it, day, w) {
  const pl = plannedOf(it, w, day);
  if (pl.planKg != null || pl.kg == null || !pl.sets) return null;
  const [wo, wn] = windowWeeks(w);
  if (!wo || !wn) return null;
  const ocena = [wo, wn].map(x => {
    const rows = logGet(x, day, it.n);
    const wtedy = rows.find(r => r && r.pr != null);
    return judgeSession({ sets: pl.sets, reps: wtedy ? wtedy.pr : pl.target, kg: wtedy ? wtedy.pk : null }, rows);
  });
  const prop = accSuggestion(ocena[0], ocena[1], pl.kg);
  return prop != null && prop > pl.kg ? prop : null;
}
const accKey = it => 'x' + it.name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);

/* Wlasny ciezar boju: klucz jak w dzienniku, "tydzien|dzien|numer cwiczenia". */
const kgwKey = (w, day, n) => `${w}|${day}|${n}`;
const kgwGet = (w, day, n) => { const v = state.kgw[kgwKey(w, day, n)]; return v == null ? null : +v; };
// Powrot na wartosc z planu kasuje wpis, zeby pozniejsza zmiana E1RM albo
// rekalibracja znowu przeliczyly ciezar same z siebie.
function kgwSet(w, day, n, kg, planKg) {
  const k = kgwKey(w, day, n);
  const stare = state.kgw[k];
  if (kg == null || kg === planKg) { if (stare == null) return; delete state.kgw[k]; }
  else { if (stare === kg) return; state.kgw[k] = kg; }
  saveKgw();
}

function logGet(w, day, n) { return state.log[logKey(w, day, n)] || []; }
function logSet(w, day, n, idx, val) {
  const k = logKey(w, day, n);
  const stary = (state.log[k] || [])[idx] || null;
  const bezZmian = stary && val && stary.r === val.r && stary.kg === val.kg;
  if (bezZmian) return;                       // suwak wrocil tam, gdzie byl
  const rows = (state.log[k] || []).slice();
  while (rows.length <= idx) rows.push(null);
  rows[idx] = val;
  while (rows.length && rows[rows.length - 1] == null) rows.pop();
  const ts = new Date().toISOString();
  if (rows[idx]) rows[idx] = { ...rows[idx], ts };
  if (rows.length) state.log[k] = rows; else delete state.log[k];
  saveLog();
  queuePush({ week: w, day, ex: n, set_no: idx + 1, reps: val ? val.r : null, kg: val ? val.kg : null, ts });
}

/* ---------- synchronizacja ---------- */
async function rpc(fn, body) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(fn + ' ' + r.status);
  return r.json();
}

// Kolejka trzyma NAJNOWSZY stan każdej serii, nie historię — powtórne tapnięcie
// w tę samą serię nadpisuje wpis zamiast puchnąć kolejkę.
function queuePush(row) {
  state.queue = state.queue.filter(x =>
    !(x.week === row.week && x.day === row.day && x.ex === row.ex && x.set_no === row.set_no));
  state.queue.push(row);
  saveQueue();
  flushQueue();
}

let flushing = false;
async function flushQueue() {
  if (flushing || !state.queue.length) return;
  if (!navigator.onLine) { setSync('off'); return; }
  flushing = true;
  const batch = state.queue.slice(0, 200);
  try {
    await rpc('log_push', { p_key: state.key, p_rows: batch });
    state.queue = state.queue.slice(batch.length);
    saveQueue();
    setSync(state.queue.length ? 'wait' : 'ok');
  } catch {
    setSync('off');
  }
  flushing = false;
  if (state.queue.length && state.sync !== 'off') flushQueue();
}

async function pullAll() {
  if (!navigator.onLine) return setSync('off');
  try {
    const rows = await rpc('log_pull', { p_key: state.key });
    let changed = false;
    for (const r of rows) {
      const k = logKey(r.week, r.day, r.ex), i = r.set_no - 1;
      const arr = (state.log[k] || []).slice();
      while (arr.length <= i) arr.push(null);
      const mine = arr[i];
      const zdalny = r.reps == null ? null : { r: r.reps, kg: r.kg == null ? null : +r.kg, ts: r.ts };
      // Pusty wpis z bazy NIGDY nie kasuje zapisu, ktory jest na tym urzadzeniu.
      // Kosztuje to jedno: odklikanie serii na jednym urzadzeniu nie zdejmie jej
      // na drugim. Ale zamienia pomylke w cos odwracalnego zamiast bezpowrotnego —
      // a dziennik treningowy jest wart wiecej niz ta wygoda.
      if (zdalny == null && mine) continue;
      if (!mine || !mine.ts || new Date(r.ts) > new Date(mine.ts)) {      // wygrywa nowszy
        arr[i] = zdalny;
        changed = true;
      }
      while (arr.length && arr[arr.length - 1] == null) arr.pop();
      if (arr.length) state.log[k] = arr; else delete state.log[k];
    }
    setSync(state.queue.length ? 'wait' : 'ok');
    if (changed) { saveLog(); renderJesliSpokojnie(); }
  } catch {
    setSync('off');
  }
}

/* Stan planu — tydzień, E1RM, korekty, własne ciężary. Jeden wiersz nadpisywany
   w całości; wygrywa nowszy znacznik czasu. Brak tabeli = cichy powrót do trybu
   lokalnego, dokładnie jak brak zasięgu. */
let stanTs = null, stanTimer = null;
const stanLokalny = () => ({ week: state.week, e1rm: state.e1rm, adjust: state.adjust, acc: state.acc, kgw: state.kgw, sound: state.sound, mob: state.mob, rekal: state.rekal });

function pushStan() {
  clearTimeout(stanTimer);
  stanTimer = setTimeout(async () => {
    if (!navigator.onLine) return;
    try {
      // Serwer zwraca znacznik, ktory naprawde stoi w bazie — bierzemy go u siebie.
      // Bez tego urzadzenie zapamietaloby czas, ktorego nigdy nie zapisano,
      // i przestaloby przyjmowac zmiany z drugiego urzadzenia.
      stanTs = await rpc('stan_push', { p_key: state.key, p_dane: stanLokalny() });
    } catch { /* brak tabeli albo sieci — stan zostaje lokalny */ }
  }, 700);
}

async function pullStan() {
  if (!navigator.onLine) return false;
  try {
    const r = await rpc('stan_pull', { p_key: state.key });
    const row = r && r[0];
    if (!row) return false;
    if (stanTs && new Date(row.ts) <= new Date(stanTs)) return false;
    const d = row.dane || {};
    const inny = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
    let zm = false;
    if (d.week >= 1 && d.week <= 12 && d.week !== state.week) { state.week = d.week; zm = true; }
    if (d.e1rm && inny(d.e1rm, state.e1rm)) { state.e1rm = d.e1rm; zm = true; }
    if (d.adjust && inny(d.adjust, state.adjust)) { state.adjust = d.adjust; saveAdjust(); zm = true; }
    if (d.acc && inny(d.acc, state.acc)) { state.acc = d.acc; saveAcc(); zm = true; }
    if (d.kgw && inny(d.kgw, state.kgw)) { state.kgw = d.kgw; saveKgw(); zm = true; }
    // Brak pola `mob` w paczce znaczy „starsza wersja aplikacji", a nie „nic nie
    // odklikane" — wtedy zostawiamy to, co jest na tym urządzeniu.
    if (d.mob && inny(d.mob, state.mob)) { state.mob = d.mob; localStorage.setItem(LS_MOB, JSON.stringify(state.mob)); zm = true; }
    if (d.rekal && inny(d.rekal, state.rekal)) { state.rekal = d.rekal; localStorage.setItem(LS_REK, JSON.stringify(state.rekal)); zm = true; }
    stanTs = row.ts;
    if (zm) { localStorage.setItem(LS, JSON.stringify({ week: state.week, e1rm: state.e1rm, sound: state.sound })); return true; }
  } catch { /* jak wyżej */ }
  return false;
}

/* Odświeżanie na bieżąco: wysyłka idzie natychmiast, pobranie co 10 s przy
   otwartej aplikacji i zawsze po powrocie do niej. */
async function odswiez() {
  if (document.visibilityState !== 'visible') return;
  await flushQueue();
  const zmienionyStan = await pullStan();
  await pullAll();
  if (zmienionyStan) renderJesliSpokojnie();
}
setInterval(odswiez, 10000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') odswiez(); });

function setSync(s) {
  state.sync = s;
  const n = document.getElementById('syncst');
  if (n) { n.textContent = syncLabel(); n.className = 'syncst ' + s; }
}
const syncLabel = () => state.sync === 'ok' ? 'zsynchronizowano'
  : state.sync === 'wait' ? `czeka ${state.queue.length} wpisów`
  : state.queue.length ? `offline · ${state.queue.length} wpisów czeka` : 'offline';

window.addEventListener('online', () => { flushQueue(); pullAll(); });
window.addEventListener('offline', () => setSync('off'));

// Wiersze serii. Ciezar jest JEDEN na cwiczenie, nie na serie — sztange ladujesz raz,
// wiec pieciu identycznych pol nikt nie potrzebuje. Powtorzenia na suwaku, bo w trakcie
// serii liczy sie jeden ruch kciukiem, a nie celowanie w male przyciski.
//
// Nic tutaj NIE wola render(). Pelna przebudowa ekranu przy kazdym ruchu suwaka
// gubila pozycje przewijania, odgrywala animacje wejscia od nowa i po prostu mulila.
function setRows(it, day, w, pl, onKg) {
  const box = el('div', 'sets');
  const id = day + '|' + it.n;
  const rows = () => logGet(w, day, it.n);

  let kgTeraz = pl.kg;

  if (pl.kg != null) {
    // Zakres liczymy od ciezaru z planu, zeby nie wedrowal przy kazdej odchylce,
    // ale nigdy nie ucinamy tego, co juz jest ustawione — inaczej przegladarka
    // przyciela by wartosc suwaka i zmiana wracalaby do zakresu.
    const baza = pl.planKg != null ? pl.planKg : pl.kg;
    const min = Math.min(Math.max(2.5, floor25(baza * 0.6)), kgTeraz);
    const max = Math.max(floor25(baza * 1.4), kgTeraz);
    const kgBox = el('div', 'kgslider');
    const lab = el('div', 'kglab');
    const val = el('b', null, fmt(kgTeraz));
    lab.append(el('span', null, 'Ciężar na sztandze'), val, el('i', null, 'kg'));
    const sl = el('input', 'suwak');
    sl.type = 'range'; sl.min = min; sl.max = max; sl.step = 2.5; sl.value = kgTeraz;
    sl.setAttribute('aria-label', 'Ciężar w kilogramach');

    // Odchylka od planu jest widoczna razem z droga powrotna — inaczej po zmianie
    // nie da sie odczytac, co plan w ogole kazal zrobic.
    let plan = null;
    if (pl.planKg != null) {
      plan = el('div', 'kgplan');
      plan.append(el('span', null, 'Plan: ' + fmt(pl.planKg) + ' kg'));
      const wroc = el('button', 'kgwroc', 'Wróć do planu');
      wroc.onclick = () => { sl.value = pl.planKg; podglad(pl.planKg); zapiszKg(); };
      plan.append(wroc);
      kgBox.append(lab, sl, plan);
    } else {
      kgBox.append(lab, sl);
    }

    // W trakcie ciagniecia suwaka ruszamy tylko liczbe — przerysowanie gryfu przy
    // kazdym kroku kosztowaloby wiecej niz caly ten ekran jest wart.
    const podglad = kg => {
      kgTeraz = kg;
      val.textContent = fmt(kgTeraz);
      if (plan) plan.hidden = kgTeraz === pl.planKg;
    };
    const zapiszKg = () => {
      // Ciezar dotyczy calego cwiczenia: przepisujemy go na juz odklikane serie.
      const r = rows();
      for (let i = 0; i < r.length; i++) if (r[i]) logSet(w, day, it.n, i, { ...r[i], kg: kgTeraz });
      // I zostaje zapisany na stale. Bez tego pierwsze odswiezenie ekranu
      // przywracalo liczbe z planu, a kolejne serie szly ze starym ciezarem.
      if (pl.planKg == null) { state.acc[accKey(it)] = kgTeraz; saveAcc(); }
      else kgwSet(w, day, it.n, kgTeraz, pl.planKg);
      if (onKg) onKg(kgTeraz);            // liczba na karcie i talerze na gryfie
    };
    sl.oninput = () => podglad(+sl.value);
    sl.onchange = () => { podglad(+sl.value); zapiszKg(); };
    if (plan) plan.hidden = kgTeraz === pl.planKg;
    box.append(kgBox);
  }

  for (let i = 0; i < pl.sets; i++) {
    const zapis = rows()[i] || null;
    const r = el('div', 'setrow' + (zapis ? ' done' : ''));
    let powt = zapis ? zapis.r : pl.target;

    const tick = el('button', 'tick', String(i + 1));
    tick.setAttribute('aria-label', 'Seria ' + (i + 1) + ' z ' + pl.sets);
    const sl = el('input', 'suwak');
    sl.type = 'range'; sl.min = 0; sl.max = Math.max(pl.target * 2, pl.target + 6); sl.step = 1; sl.value = powt;
    sl.setAttribute('aria-label', 'Powtórzenia w serii ' + (i + 1));
    const val = el('div', 'setval');
    const vb = el('b', null, String(powt));
    val.append(vb, el('i', null, pl.unit === 's' ? 's' : pl.unit === 'm' ? 'm' : ''));

    const zapisz = () => { logSet(w, day, it.n, i, { r: powt, kg: kgTeraz, pr: pl.target, pk: pl.planKg }); };

    tick.onclick = () => {
      const jest = r.classList.toggle('done');
      if (jest) zapisz(); else logSet(w, day, it.n, i, null);
      odswiezPostep(day, w);
    };
    sl.oninput = () => { powt = +sl.value; vb.textContent = String(powt); };
    sl.onchange = () => {
      powt = +sl.value;
      if (!r.classList.contains('done')) r.classList.add('done');
      zapisz();
      odswiezPostep(day, w);
    };

    r.append(tick, sl, val);
    box.append(r);
  }
  box.dataset.ex = id;
  return box;
}

// Pasek postepu aktualizowany w miejscu — bez dotykania reszty ekranu.
function odswiezPostep(day, w) {
  const sp = document.getElementById('sprog');
  if (!sp) return;
  const d = state.plan.days[day];
  let total = 0, done = 0;
  d.items.forEach(it => {
    total += plannedOf(it, w, day).sets;
    done += logGet(w, day, it.n).filter(Boolean).length;
  });
  sp.querySelector('.ile').textContent = done + '/' + total + ' serii';
  sp.querySelector('.fill').style.width = (total ? done / total * 100 : 0) + '%';
  sp.querySelector('.proc').textContent = (total ? Math.round(done / total * 100) : 0) + '%';
}

/* ---------- historia ---------- */
// Ostatnie wykonanie tego cwiczenia: szukamy wstecz pierwszego tygodnia z zapisem.
function ostatnieWykonanie(it, day, w) {
  for (let i = w - 1; i >= 1; i--) {
    const opis = opisWykonania(logGet(i, day, it.n));
    if (opis) return { tydzien: i, opis };
  }
  return null;
}

// Tonaz = suma powtorzen razy kilogramy. Cwiczenia bez liczbowego ciezaru
// (guma, masa ciala) nie wchodza — nie ma czego mnozyc.
function tonazDnia(w, day) {
  let ton = 0, serie = 0;
  state.plan.days[day].items.forEach(it => {
    const rows = logGet(w, day, it.n);
    serie += rows.filter(Boolean).length;
    ton += tonaz(rows);
  });
  return { ton, serie };
}

/* ---------- korekta z dwóch tygodni ---------- */
// Boj glowny dnia: z ktorego cwiczenia liczymy korekte dla ktorego E1RM.
const MAIN = { bench: { day: 'A', name: 'Wyciskanie leżąc' }, front: { day: 'C', name: 'Front squat' }, dl: { day: 'C', name: 'Martwy ciąg z podwyższenia' } };

const isDeload = w => w >= 1 && w <= 12 && String(lowerRow(w).block).toLowerCase() === 'deload';

// Dwa ostatnie tygodnie TRENINGOWE przed w. Deload jest z założenia lekki, więc
// nie da się go ocenić — gdyby wpadał do okna, korekta po deloadzie nigdy by nie weszła.
function windowWeeks(w) {
  const out = [];
  for (let i = w - 1; i >= 1 && out.length < 2; i--) if (!isDeload(i)) out.push(i);
  return out.reverse();                       // [starszy, nowszy]
}

function judgeWeek(liftKey, w) {
  // W tygodniu 1 okno jest puste, więc w bywa undefined — a undefined nie jest
  // ani mniejsze od 1, ani większe od 12, i bez tego testu leciało dalej prosto
  // w odczyt wiersza tabeli, którego nie ma.
  if (w == null || w < 1 || w > 12) return 'brak';
  if (isDeload(w)) return 'brak';
  const { day, name } = MAIN[liftKey];
  const it = state.plan.days[day].items.find(x => x.name === name);
  if (!it) return 'brak';
  const pl = plannedOf(it, w, day);
  const rows = logGet(w, day, it.n);
  // Ciężar planowany zmienia się wstecz przy każdej korekcie E1RM, więc oceniamy
  // wobec tego, co plan przewidywał W CHWILI ZAPISU. Bez tego korekta w górę
  // przerabiałaby dawne „czysto" na „niedowóz" i napędzała korektę w dół.
  const wtedy = rows.find(r => r && r.pr != null);
  return judgeSession({
    sets: pl.sets,
    reps: wtedy ? wtedy.pr : pl.target,
    kg: wtedy && wtedy.pk !== undefined ? wtedy.pk : pl.planKg,
  }, rows);
}

// Wchodzimy w tydzien N → oceniamy N−1 i N−2 i raz stosujemy korekte.
function maybeAdjust() {
  const w = state.week;
  const out = [];
  for (const key of ['bench', 'front', 'dl']) {
    const a = state.adjust[key] || {};
    if (a.week === w) { if (a.pct) out.push({ key, ...a }); continue; }   // już zastosowana
    if (a.skipped === w) continue;                                        // cofnięta ręcznie
    const [wo, wn] = windowWeeks(w);
    const older = judgeWeek(key, wo), newer = judgeWeek(key, wn);
    const { pct, powod } = adjustment(older, newer);
    const before = state.e1rm[key];
    const after = pct ? applyAdjustment(before, pct) : before;
    state.adjust[key] = { week: w, pct, powod, before, after, from: [wo, wn] };
    if (pct) { state.e1rm[key] = after; out.push({ key, pct, powod, before, after }); }
  }
  if (out.length) { save(); saveAdjust(); }
  else saveAdjust();
  return out;
}

function adjustCard() {
  const w = state.week;
  const list = ['bench', 'front', 'dl'].map(k => ({ k, a: state.adjust[k] })).filter(x => x.a && x.a.week === w && x.a.pct);
  if (!list.length) return null;
  const n = el('div', 'note adj');
  const okno = (list[0].a.from || []).filter(Boolean);
  n.append(el('b', null, okno.length === 2 ? `Korekta z tygodni ${okno[0]} i ${okno[1]}` : 'Korekta planu'));
  for (const { k, a } of list) {
    const L = LIFTS.find(x => x.key === k);
    const p = el('div', 'adjrow');
    const dot = el('span', 'dotc'); dot.style.background = L.color;
    p.append(dot, el('span', null, `${L.short} ${a.pct > 0 ? '+' : ''}${fmt(a.pct * 100)}% → ${fmt(a.after)} kg`));
    p.append(el('em', null, `było ${fmt(a.before)}`));
    n.append(p);
  }
  const undo = el('button', 'mini', 'Cofnij');
  undo.style.marginTop = '9px';
  undo.onclick = () => {
    for (const { k, a } of list) { state.e1rm[k] = a.before; state.adjust[k] = { week: null, skipped: w }; }
    save(); saveAdjust(); render();
  };
  n.append(undo);
  return n;
}

/* ---------- dźwięk ---------- */
// Sygnał jest syntezowany w przeglądarce — zero plików do pobrania, więc offline
// działa tak samo jak online.
//
// Kluczowa decyzja: wszystkie piknięcia planujemy w zegarze Web Audio w chwili
// startu, zamiast odpalać je z setInterval. Przeglądarki na telefonie dławią
// liczniki w tle (karta schowana, ekran zgaszony), a harmonogram Web Audio idzie
// dalej — dzięki temu dźwięk trafia w sekundę nawet wtedy, gdy odliczanie
// na ekranie zwolni.
let ac = null, voices = [];

function audioCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ac) ac = new AC();
  if (ac.state === 'suspended') ac.resume();   // iOS budzi się tylko z gestu
  return ac;
}
function beep(at, freq, dur, gain) {
  const c = ac;
  const osc = c.createOscillator(), env = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, at);
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(env).connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.03);
  voices.push(osc);
}
function scheduleBeeps(seconds) {
  if (!state.sound || !audioCtx()) return;
  const t0 = ac.currentTime + 0.06;
  for (const k of [3, 2, 1]) if (seconds > k) beep(t0 + seconds - k, 760, 0.08, 0.12);
  beep(t0 + seconds, 660, 0.14, 0.2);          // koniec przerwy: trzy tony w górę
  beep(t0 + seconds + 0.17, 880, 0.14, 0.2);
  beep(t0 + seconds + 0.34, 1320, 0.3, 0.22);
}
function cancelBeeps() {
  voices.forEach(o => { try { o.stop(); } catch { /* już się skończył */ } });
  voices = [];
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

  const snd = el('button', 'tbtn snd' + (state.sound ? '' : ' off'));
  snd.setAttribute('aria-label', state.sound ? 'Wycisz sygnał' : 'Włącz sygnał');
  snd.title = snd.getAttribute('aria-label');
  snd.innerHTML = state.sound
    ? '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>'
    : '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 5 6"/><path d="m21 9-5 6"/></svg>';
  snd.onclick = () => {
    state.sound = !state.sound;
    save();
    if (state.sound) { audioCtx(); if (tId) scheduleBeeps(tLeft); }   // odblokuj dźwięk gestem
    else cancelBeeps();
    renderTimer();
  };
  inner.append(snd);
  box.append(inner);
}
function stopTimer() {
  clearInterval(tId); tId = null; tLeft = 0; tTotal = 0; tFired = false;
  cancelBeeps(); renderTimer();
}
function startTimer(s) {
  clearInterval(tId);
  cancelBeeps();
  tLeft = s; tTotal = s; tFired = false;
  scheduleBeeps(s);
  tId = setInterval(() => {
    tLeft--;
    if (tLeft <= 0) {
      clearInterval(tId); tId = null; tLeft = 0; tFired = true;
      voices = [];
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
  if (document.visibilityState === 'visible' && (state.view.startsWith('#/d/') || state.view.startsWith('#/mobilnosc'))) keepAwake(true);
});

/* ---------- dziennik i urządzenia ---------- */
function settingsView() {
  const frag = document.createDocumentFragment();
  frag.append(backLink());
  const body = el('div', klasaWejscia());
  body.append(head('Dziennik i urządzenia', 'Kod planu, synchronizacja, kopia zapasowa', true));

  const wpisy = Object.values(state.log).reduce((a, r) => a + r.filter(Boolean).length, 0);

  const st = el('div', 'card');
  st.append(el('h3', null, 'Synchronizacja'));
  const line = el('div', 'e1row');
  line.append(el('div', 'n', 'Stan'));
  const badge = el('div', 'syncst ' + state.sync, syncLabel());
  badge.id = 'syncst';
  line.append(badge);
  st.append(line);
  const l2 = el('div', 'e1row');
  l2.append(el('div', 'n', 'Zapisanych serii'));
  l2.append(el('div', 'v', String(wpisy)));
  st.append(l2);
  const sync = el('button', 'btn ghost', 'Zsynchronizuj teraz');
  sync.style.marginTop = '10px';
  sync.onclick = async () => { await flushQueue(); await pullAll(); render(); };
  st.append(sync);
  body.append(st);

  const kod = el('div', 'card');
  kod.append(el('h3', null, 'Kod planu'));
  const wspolny = state.key === KOD_WSPOLNY;
  kod.append(el('p', null, wspolny
    ? 'Domyślny kod jest wspólny — każde urządzenie widzi ten sam dziennik bez żadnej konfiguracji. Jeśli chcesz zamknąć dziennik tylko dla siebie, wygeneruj własny i przepisz go na pozostałe urządzenia.'
    : 'Własny kod. Przepisz go na drugie urządzenie, żeby widzieć ten sam dziennik. Kod nie trafia do adresu strony — nikt go nie zobaczy w historii ani w zakładkach.'));
  const code = el('div', 'plankey', state.key);
  kod.append(code);
  const kopiuj = el('button', 'btn ghost', 'Skopiuj kod');
  kopiuj.onclick = async () => {
    try { await navigator.clipboard.writeText(state.key); kopiuj.textContent = 'Skopiowane ✓'; }
    catch { kopiuj.textContent = 'Przepisz ręcznie'; }
    setTimeout(() => { kopiuj.textContent = 'Skopiuj kod'; }, 1800);
  };
  kod.append(kopiuj);
  if (wspolny) {
    const wlasny = el('button', 'btn ghost', 'Wygeneruj własny kod');
    wlasny.style.marginTop = '8px';
    wlasny.onclick = async () => {
      state.key = newPlanKey();
      localStorage.setItem(LS_KEY, state.key);
      stanTs = null;
      await flushQueue(); pushStan(); render();
    };
    kod.append(wlasny);
  }
  body.append(kod);

  const par = el('div', 'card');
  par.append(el('h3', null, 'Połącz z innym urządzeniem'));
  par.append(el('p', null, 'Wpisz kod z urządzenia, na którym prowadzisz dziennik. Wpisy z tego urządzenia zostaną zachowane i dosłane.'));
  const inp = el('input', 'keyinput');
  inp.type = 'text';
  inp.placeholder = 'XXXX-XXXX-XXXX';
  inp.autocapitalize = 'characters';
  inp.spellcheck = false;
  par.append(inp);
  const info = el('p', null, '');
  const go2 = el('button', 'btn primary', 'Połącz');
  go2.style.marginTop = '10px';
  go2.onclick = async () => {
    const k = inp.value.trim().toUpperCase();
    if (k.replace(/-/g, '').length < 12) { info.textContent = 'Kod ma 12 znaków.'; return; }
    state.key = k;
    localStorage.setItem(LS_KEY, k);
    info.textContent = 'Pobieram dziennik…';
    await flushQueue();
    await pullAll();
    render();
  };
  par.append(go2, info);
  body.append(par);

  const pref = el('div', 'card');
  pref.append(el('h3', null, 'Otwieranie'));
  const prow = el('div', 'e1row');
  prow.append(el('div', 'n', 'Startuj na dzisiejszym dniu'));
  prow.append(miniBtn(state.autoDzis ? 'Włączone' : 'Wyłączone', () => { state.autoDzis = !state.autoDzis; save(); render(); }));
  pref.append(prow);
  pref.append(el('p', null, 'Poniedziałek → A, środa → B, piątek → C, niedziela → joga. W dzień wolny aplikacja i tak otwiera ekran główny, a wejście z linku zawsze ma pierwszeństwo.'));
  body.append(pref);

  const kop = el('div', 'card');
  kop.append(el('h3', null, 'Kopia zapasowa'));
  kop.append(el('p', null, 'Plik JSON z dziennikiem, E1RM i historią korekt. Działa niezależnie od synchronizacji.'));
  const exp = el('button', 'btn ghost', 'Zapisz do pliku');
  exp.onclick = () => {
    const dane = { v: 3, key: state.key, e1rm: state.e1rm, log: state.log, adjust: state.adjust, acc: state.acc, kgw: state.kgw, mob: state.mob, rekal: state.rekal };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(dane, null, 1)], { type: 'application/json' }));
    a.download = 'dziennik-treningowy.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const impLabel = el('label', 'btn ghost', 'Wczytaj z pliku');
  impLabel.style.marginTop = '8px';
  const imp = el('input');
  imp.type = 'file'; imp.accept = 'application/json'; imp.style.display = 'none';
  imp.onchange = async () => {
    const f = imp.files[0];
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.log) { state.log = d.log; saveLog(); }
      if (d.e1rm) { state.e1rm = d.e1rm; save(); }
      if (d.adjust) { state.adjust = d.adjust; saveAdjust(); }
      if (d.acc) { state.acc = d.acc; saveAcc(); }
      if (d.kgw) { state.kgw = d.kgw; saveKgw(); }
      if (d.mob) { state.mob = d.mob; saveMob(); }
      if (d.rekal) { state.rekal = d.rekal; saveRekal(); }
      render();
    } catch { alert('Nie udało się odczytać pliku.'); }
  };
  impLabel.append(imp);
  kop.append(exp, impLabel);
  body.append(kop);

  frag.append(body);
  return frag;
}

/* ---------- router ---------- */
function go(hash) { location.hash = hash; window.scrollTo({ top: 0 }); }

// Animacja wejscia ma sie odegrac przy WEJSCIU w widok, nie przy kazdym renderze.
// Wczesniej kazde tapniecie odpalalo ja od nowa i wygladalo jak migotanie.
let ostatniWidok = null;
const klasaWejscia = () => (state.view !== ostatniWidok ? 'stagger' : '');

// Nie przebudowujemy ekranu, gdy ktos wlasnie go dotyka. Odswiezenie z bazy
// poczeka kilka sekund zamiast wyrywac suwak spod palca.
let ostatniDotyk = 0;
['pointerdown', 'input'].forEach(z =>
  document.addEventListener(z, () => { ostatniDotyk = Date.now(); }, true));
const renderJesliSpokojnie = () => { if (Date.now() - ostatniDotyk > 6000) render(); };

function render() {
  const app = $('#app');
  app.innerHTML = '';
  const v = state.view;
  const onDay = v.startsWith('#/d/');
  const onMob = v === '#/mobilnosc' || v.startsWith('#/mobilnosc/');
  if (v !== '#/zasady' && v !== '#/1rm' && v !== '#/ustawienia') app.append(weekBar());

  // "#/d/A" albo "#/d/A/3" — druga forma zapisuje do wskazanego tygodnia,
  // nie ruszając tygodnia bieżącego.
  if (onDay) { const [k, t] = v.slice(4).split('/'); app.append(dayView(k, tydzienZAdresu(t))); }
  else if (onMob) app.append(mobilityView(tydzienZAdresu(v.split('/')[2])));
  else if (v === '#/postep' || v === '#/tabela' || v === '#/raport') app.append(postepView());
  else if (v === '#/zasady') app.append(rulesView());
  else if (v === '#/1rm') app.append(calcView());
  else if (v === '#/ustawienia') app.append(settingsView());
  else app.append(homeView());

  keepAwake(onDay || onMob);
  renderTimer();
  ostatniWidok = v;
}

window.addEventListener('hashchange', () => { state.view = location.hash || '#/'; render(); });

/* ---------- start ---------- */
fetch('plan.json?v=24')
  .then(r => r.json())
  .then(p => {
    state.plan = p;
    loadState();
    loadStores();
    if (!state.e1rm) state.e1rm = { ...p.e1rm };
    calc.kg = state.e1rm.bench ? round25(state.e1rm.bench * 0.85) : 100;
    // Zimny start bez hasha: wchodzimy prosto w dzisiejszą sesję. Wejście z linkiem
    // albo z zakładki ma pierwszeństwo, bo wtedy wiadomo, czego ktoś chciał.
    if (!location.hash && state.autoDzis && dzisiaj()) {
      state.view = trasaDnia(dzisiaj());
      history.replaceState(null, '', state.view);
    }
    render();
    pullStan().then(() => { maybeAdjust(); render(); pullAll(); flushQueue(); });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  })
  .catch(() => {
    $('#app').innerHTML = '<div class="note"><b>Nie udało się wczytać plan.json.</b> Otwórz stronę przez serwer (nie z pliku), np. <code>python -m http.server 8080</code>.</div>';
  });
