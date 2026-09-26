/* Plan 12 tygodni — cała logika skoroszytu, bez skoroszytu.
   Stan trwały: numer tygodnia, trzy E1RM i przełącznik dźwięku. Nic więcej. */

const LS = 'trening.v1';
const state = {
  week: 1, e1rm: null, plan: null, view: location.hash || '#/', sound: true,
  log: {}, adjust: {}, acc: {}, kgw: {}, queue: [], key: null, sync: 'off',
  mob: {}, mobShort: false, autoDzis: true, rekal: {}, moves: [], treningi: {}, zegarek: false, skrot: false,
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

/* Sesja, na ktorej aplikacja sie otwiera.
 *
 * Wczesniej byl to po prostu dzisiejszy dzien, a w dzien wolny ekran glowny.
 * Tyle ze dziennik uzupelnia sie PO treningu, czesto nastepnego dnia — i wtedy
 * aplikacja pokazywala cokolwiek, tylko nie te sesje, ktora zostala do wpisania.
 *
 * Teraz otwieramy najswiezsza sesje tygodnia, ktora nie jest zapisana w calosci,
 * liczac tylko dni, ktore juz byly (z dzisiejszym wlacznie). Sesji z przyszlosci
 * nie proponujemy — w czwartek nie ma czego wpisywac do piatku. Dopiero gdy
 * wszystko jest kompletne, wraca stara zasada: dzisiejszy dzien albo nic.
 */
const POZYCJA_DNIA = { A: 0, B: 2, C: 4, D: 6 };        // poniedzialek 0 … niedziela 6
const pozycjaDzis = () => (new Date().getDay() + 6) % 7;

function sesjaKompletna(key, w) {
  if (key === 'D') {
    const odklikane = state.mob[w] || {};
    const widoczne = mobWidoczne();
    return widoczne.length > 0 && widoczne.every(i => odklikane[i.id]);
  }
  const { done, total } = postepDnia(w, key);
  return total > 0 && done >= total;
}

function domyslnaSesja() {
  const w = state.week, dzis = pozycjaDzis();
  const zalegle = Object.keys(POZYCJA_DNIA)
    .filter(k => POZYCJA_DNIA[k] <= dzis && !sesjaKompletna(k, w))
    .sort((a, b) => POZYCJA_DNIA[b] - POZYCJA_DNIA[a]);
  return zalegle[0] || dzisiaj();
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
    if (typeof raw.zegarek === 'boolean') state.zegarek = raw.zegarek;
    if (typeof raw.skrot === 'boolean') state.skrot = raw.skrot;
  } catch { /* pierwszy start */ }
  const t = +new URLSearchParams(location.search).get('t');
  if (t >= 1 && t <= 12) state.week = t;
}
const save = () => {
  localStorage.setItem(LS, JSON.stringify({ week: state.week, e1rm: state.e1rm, sound: state.sound, autoDzis: state.autoDzis, zegarek: state.zegarek, skrot: state.skrot }));
  if (typeof pushStan === 'function') pushStan();
};

/* ---------- magazyn dziennika ---------- */
const LS_LOG = 'trening.log.v1', LS_ADJ = 'trening.adjust.v1', LS_ACC = 'trening.acc.v1';
const LS_Q = 'trening.queue.v1', LS_KEY = 'trening.key.v1', LS_MOB = 'trening.mob.v1';
const LS_REK = 'trening.rekal.v1', LS_KGW = 'trening.kgw.v1', LS_MOV = 'trening.moves.v1';
const LS_TRN = 'trening.treningi.v1';
const readJSON = (k, dflt) => { try { return JSON.parse(localStorage.getItem(k)) ?? dflt; } catch { return dflt; } };
const saveLog = () => localStorage.setItem(LS_LOG, JSON.stringify(state.log));
const saveAdjust = () => { localStorage.setItem(LS_ADJ, JSON.stringify(state.adjust)); pushStan(); };
const saveAcc = () => { localStorage.setItem(LS_ACC, JSON.stringify(state.acc)); pushStan(); };
// Ciezar boju zmieniony recznie: plan zostaje planem, ale sztanga wazy tyle,
// ile wpisano. Zapis per tydzien, bo plan co tydzien podaje inna liczbe.
const saveKgw = () => { localStorage.setItem(LS_KGW, JSON.stringify(state.kgw)); pushStan(); };
// Lista przeniesień tygodni. Jedzie w paczce stanu, bo drugie urządzenie musi
// wykonać ten sam ruch u siebie — inaczej zostałoby z danymi w obu tygodniach.
const saveMoves = () => { localStorage.setItem(LS_MOV, JSON.stringify(state.moves)); pushStan(); };
const saveQueue = () => localStorage.setItem(LS_Q, JSON.stringify(state.queue));
// Niedziela nie ma serii ani kilogramów, więc nie idzie do tabeli `sety` — jedzie
// razem ze stanem planu, tym samym kanałem co tydzień i E1RM.
const saveMob = () => { localStorage.setItem(LS_MOB, JSON.stringify(state.mob)); pushStan(); };
const saveRekal = () => { localStorage.setItem(LS_REK, JSON.stringify(state.rekal)); pushStan(); };
// Start i koniec treningu (plus tętno, jeśli zegarek je nadaje) — per tydzień i dzień.
const saveTreningi = (bezSync) => { localStorage.setItem(LS_TRN, JSON.stringify(state.treningi)); if (!bezSync) pushStan(); };

function loadStores() {
  state.log = readJSON(LS_LOG, {});
  state.adjust = readJSON(LS_ADJ, {});
  state.acc = readJSON(LS_ACC, {});
  state.kgw = readJSON(LS_KGW, {});
  state.moves = readJSON(LS_MOV, []);
  state.mob = readJSON(LS_MOB, {});
  state.rekal = readJSON(LS_REK, {});
  state.treningi = readJSON(LS_TRN, {});
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

/* ---------- nagłówek tygodnia ---------- */
// Duży tytuł jak w aplikacji na telefon: data, numer tygodnia, miejsce w cyklu.
// Pod nim dwanaście tygodni jednym rzędem — tapnięcie przestawia tydzień.
let kierunekTygodnia = '';                      // 'w-up' / 'w-down' po zmianie tygodnia
const MIESIAC = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

function weekBar() {
  const w = state.week, L = lowerRow(w), d = new Date();
  const bar = el('header', 'top');
  bar.append(el('div', 'data', `${NAZWA_DNIA[d.getDay()]}, ${d.getDate()} ${MIESIAC[d.getMonth()]}`));
  const row = el('div', 'toprow');
  const t = el('h1', 'wval' + (kierunekTygodnia ? ' ' + kierunekTygodnia : ''));
  t.append(el('span', 'wlbl', 'Tydzień '), el('b', null, String(w)));
  row.append(t);
  kierunekTygodnia = '';
  const doTestu = 12 - w;
  const blok = isDeload(w) ? 'Deload' : 'Blok ' + (BLOKI.find(b => b.weeks.includes(w)) || {}).n;
  row.append(el('div', 'wsub', w === 12 ? `${blok} · tydzień testów` : `${blok} · ${doTestu} ${odmiana(doTestu, 'tydzień', 'tygodnie', 'tygodni')} do testu`));
  bar.append(row);

  const strip = el('div', 'wstrip');
  for (let i = 1; i <= 12; i++) {
    const p = el('button', 'wp', String(i));
    if (isDeload(i)) p.classList.add('dl');
    if (i < w) p.classList.add('done');
    if (i === w) p.classList.add('now');
    p.setAttribute('aria-label', 'Tydzień ' + i + (isDeload(i) ? ', deload' : ''));
    p.onclick = () => setWeek(i);
    strip.append(p);
  }
  bar.append(strip);
  return bar;
}

function setWeek(w) {
  if (w < 1 || w > 12 || w === state.week) return;
  kierunekTygodnia = w > state.week ? 'w-up' : 'w-down';
  state.week = w; save(); przeliczPlan(); render();
  window.scrollTo({ top: 0 });
}

/* ---------- ekran główny ---------- */
function homeView() {
  const p = state.plan, w = state.week, frag = document.createDocumentFragment();
  const body = el('div', 'home ' + klasaWejscia());
  const deload = isDeload(w);

  if (IOS && !JAKO_APKA() && !readJSON('trening.ios.baner', false)) {
    const b = el('div', 'note ios');
    b.append(el('b', null, 'Zainstaluj plan na iPhonie'));
    b.append(document.createTextNode('Safari → Udostępnij → „Do ekranu początkowego". Plan otworzy się na pełnym ekranie, a koniec przerwy zawibruje na zegarku.'));
    const r = el('div', 'kbtn');
    r.append(miniBtn('Pokaż jak', () => go('#/ustawienia')), miniBtn('Później', () => { localStorage.setItem('trening.ios.baner', 'true'); render(); }));
    b.append(r);
    body.append(b);
  }
  body.append(panelTygodnia(w));

  // Karta „Dziś": sesja, o którą teraz chodzi — dzisiejsza, zaległa do wpisania,
  // a w dzień wolny najbliższa. Na wierzchu to, po co się otwiera aplikację:
  // ile ma być na sztandze i w jakim schemacie.
  const dzis = dzisiaj();
  const nast = najblizszaSesja();
  const heroKey = domyslnaSesja() || nast.key;
  const etykieta = heroKey === dzis ? 'Dziś'
    : POZYCJA_DNIA[heroKey] <= pozycjaDzis() ? 'Do wpisania'
    : 'Następny · ' + nast.dzien;
  body.append(kartaDzis(heroKey, w, etykieta));

  const adj = adjustCard();
  if (adj) body.append(adj);
  const rek = rekalibracjaCard();
  if (rek) body.append(rek);
  if (deload) body.append(noteBox('Tydzień 7 — deload.', 'Nie jest opcjonalny. Dwie serie zamiast czterech, ciężar w dół. Ćwiczenia dodatkowe po 2 serie, superserie w dniu B pomijasz.', 'uwaga'));
  if (w === 12) body.append(noteBox('Tydzień 12 — testy.', 'Góra: test 1RM w wyciskaniu, asekuracja albo ograniczniki obowiązkowo. Dół: test kontrolny na ciężarze z tygodnia 3, stop przy 15 powtórzeniach albo RPE 8.', 'uwaga'));

  // Pozostałe sesje tygodnia: jedna lista, nie cztery osobne karty.
  body.append(el('h2', 'sekcja', 'Ten tydzień'));
  const lista = el('div', 'lista');
  for (const k of ['A', 'B', 'C', 'D'].filter(x => x !== heroKey)) lista.append(tile(daneSesji(k, w)));
  body.append(lista);

  // Ciężary robocze tygodnia — trzy liczby w jednym rzędzie, z różnicą do poprzedniego.
  body.append(el('h2', 'sekcja', 'Na sztandze w tym tygodniu'));
  const stats = el('div', 'stats');
  for (const L of LIFTS) {
    const kg = kgOf(L.key, w);
    const prev = w > 1 ? kgOf(L.key, w - 1) : null;
    const s = el('div', 'stat');
    s.style.setProperty('--sc', L.color);
    s.append(el('div', 'sl', L.short));
    const v = el('div', 'sv');
    if (kg == null) v.textContent = 'test';
    else { v.textContent = fmt(kg); v.dataset.cnt = kg; v.dataset.krok = 2.5; v.append(el('u', null, 'kg')); }
    s.append(v);
    let d = '—';
    if (kg != null && prev != null) {
      const diff = kg - prev;
      d = diff > 0 ? '+' + fmt(diff) + ' kg' : diff < 0 ? '−' + fmt(-diff) + ' kg' : 'bez zmian';
    } else if (kg != null && w === 1) d = 'start cyklu';
    const dd = el('div', 'sd', d);
    if (kg != null && prev != null && kg > prev) dd.classList.add('up');
    if (kg != null && prev != null && kg < prev) dd.classList.add('down');
    s.append(dd);
    stats.append(s);
  }
  body.append(stats);

  body.append(el('h2', 'sekcja', 'Maksy (E1RM)'));
  const box = el('div', 'card e1');
  for (const L of LIFTS) {
    const r = el('div', 'e1row');
    const d = el('div', 'dotc'); d.style.background = L.color;
    r.append(d, el('div', 'n', L.short), el('div', 'v', fmt(state.e1rm[L.key]) + ' kg'));
    const st = el('div', 'pm');
    st.append(miniBtn('−10%', () => { state.e1rm[L.key] = round25(state.e1rm[L.key] / 1.1); save(); render(); }));
    st.append(miniBtn('+10%', () => { state.e1rm[L.key] = round25(state.e1rm[L.key] * 1.1); save(); render(); }));
    r.append(st);
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

const MAIN_OF = { A: 'bench', B: null, C: 'front' };

function daneSesji(k, w) {
  const p = state.plan;
  if (k === 'D') {
    const m = p.mobility, mDone = mobDone(w), mAll = mobWidoczne().length;
    return {
      k: m.key, color: DAY_COLOR.D, title: 'Joga',
      sub: mDone ? `${m.day} · ${mDone}/${mAll} pozycji` : `${m.day} · ${mAll} ${odmiana(mAll, 'pozycja', 'pozycje', 'pozycji')} · ~${m.minutes} min`,
      progress: { done: mDone, total: mAll }, href: '#/mobilnosc',
    };
  }
  const d = p.days[k], pg = postepDnia(w, k);
  return {
    k, color: DAY_COLOR[k], title: tytulDnia(d.title),
    sub: pg.done ? `${d.day} · ${pg.done}/${pg.total} serii` : `${d.day} · ${d.items.length} ćwiczeń · ~${d.minutes} min`,
    progress: pg, href: '#/d/' + k,
  };
}
// „DÓŁ · kontrola i stabilizacja" → „Dół · kontrola i stabilizacja"
const tytulDnia = t => String(t).split(' · ').map((c, i) => (i === 0 ? c.charAt(0) + c.slice(1).toLowerCase() : c)).join(' · ');

// Pasek dni: siedem kolumn, w każdej litera sesji albo kreska dnia wolnego.
// Stan widać bez czytania: pełne kółko = zapisane w całości, łuk = w trakcie.
function dniTygodnia(w) {
  const box = el('div', 'dni');
  const skrot = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  const sesja = { 0: 'A', 2: 'B', 4: 'C', 6: 'D' };
  const dzis = pozycjaDzis();
  for (let i = 0; i < 7; i++) {
    const k = sesja[i];
    const b = el(k ? 'button' : 'div', 'dzien' + (i === dzis ? ' teraz' : ''));
    b.append(el('span', 'dn', skrot[i]));
    if (k) {
      const pg = daneSesji(k, w).progress;
      const ile = pg.total ? Math.min(1, pg.done / pg.total) : 0;
      b.style.setProperty('--tc', DAY_COLOR[k]);
      const c = el('span', 'dk' + (ile >= 1 ? ' pelny' : ile > 0 ? ' czesc' : ''), ile >= 1 ? '✓' : k);
      c.style.setProperty('--ile', ile);
      b.append(c);
      b.setAttribute('aria-label', nazwaSesji(k) + (ile >= 1 ? ', zapisane' : ''));
      b.onclick = () => go(trasaDnia(k));
    } else {
      b.append(el('span', 'dk wolne', '·'));
    }
    box.append(b);
  }
  return box;
}

function kartaDzis(k, w, etykieta) {
  const dane = daneSesji(k, w);
  const b = el('button', 'tile hero-s');
  b.style.setProperty('--tc', DAY_HEX[k]);
  b.dataset.k = k;
  b.append(el('div', 'eyebrow', etykieta));
  const tyt = el('div', 'htop');
  tyt.append(el('span', 'hk', k), el('span', 'tt', dane.title));
  b.append(tyt);

  const lift = MAIN_OF[k];
  if (lift) {
    const it = state.plan.days[k].items.find(x => x.name === MAIN[lift].name);
    const pl = it ? plannedOf(it, w, k) : null;
    const kg = pl && pl.kg != null ? pl.kg : kgOf(lift, w);
    const presk = el('div', 'presk');
    const v = el('div', 'hv');
    if (kg != null) { v.textContent = fmt(kg); v.dataset.cnt = kg; v.dataset.krok = 2.5; v.append(el('u', null, 'kg')); }
    else v.textContent = 'test 1RM';
    presk.append(v);
    const L = LIFTS.find(x => x.key === lift);
    const rpe = it ? resolve(it.rpe, w) : null;
    presk.append(el('div', 'hs', `${L.full} · ${it ? resolve(it.scheme, w) : ''}${rpe != null && rpe !== '—' ? ' · RPE ' + fmt(rpe) : ''}`));
    b.append(presk);
  } else {
    const d = k === 'D' ? state.plan.mobility : state.plan.days[k];
    const presk = el('div', 'presk');
    const v = el('div', 'hv', '~' + d.minutes);
    v.append(el('u', null, 'min'));
    presk.append(v);
    presk.append(el('div', 'hs', k === 'D'
      ? `${mobWidoczne().length} pozycji · bez obciążenia`
      : `${d.items.length} ćwiczeń · bez sztangi, bez obciążenia osiowego`));
    b.append(presk);
  }

  const pg = dane.progress;
  const ile = pg.total ? Math.min(1, pg.done / pg.total) : 0;
  const pas = el('div', 'hbar');
  const fill = el('i');
  fill.style.width = (ile * 100) + '%';
  pas.append(fill);
  const dol = el('div', 'hdol');
  dol.append(el('span', 'hpg', pg.total ? `${pg.done}/${pg.total} ${k === 'D' ? 'pozycji' : 'serii'}` : ''));
  dol.append(el('span', 'cta', ile >= 1 ? 'Zobacz sesję' : pg.done ? 'Kontynuuj' : 'Zacznij trening'));
  b.append(pas, dol);
  b.onclick = () => go(dane.href);
  return b;
}

function miniBtn(label, fn) {
  const b = el('button', 'mini', label);
  b.onclick = fn;
  return b;
}

// Pierścień postępu: obwód siedzi w --c, żeby CSS mógł go animować od zera.
function ring(ile, r = 20) {
  const C = 2 * Math.PI * r;
  const box = el('div', 'kring' + (ile >= 1 ? ' pelny' : ''));
  box.style.setProperty('--c', C.toFixed(1));
  box.innerHTML =
    `<svg viewBox="0 0 48 48"><circle class="kbg" cx="24" cy="24" r="${r}"/>` +
    `<circle class="kfg" cx="24" cy="24" r="${r}" stroke-dasharray="${C.toFixed(1)}" ` +
    `stroke-dashoffset="${(C * (1 - ile)).toFixed(1)}"/></svg>`;
  return box;
}

function tile({ k, color, title, sub, href, progress }) {
  const b = el('button', 'tile');
  if (color) b.style.setProperty('--tc', color);
  b.append(el('div', 'k', k));
  const mid = el('div', 'tmid');
  mid.append(el('div', 'tt', title));
  mid.append(el('div', 'ts', sub));
  b.append(mid);
  if (progress && progress.total) b.append(ring(Math.min(1, progress.done / progress.total), 20));
  b.append(el('div', 'go', '›'));
  b.onclick = () => go(href);
  return b;
}

function noteBox(title, bodyText, cls) {
  const n = el('div', 'note' + (cls ? ' ' + cls : ''));
  n.append(el('b', null, title));
  n.append(document.createTextNode(bodyText));
  return n;
}

function backLink() {
  const a = el('button', 'back', '‹ Dziś');
  a.onclick = () => go('#/');
  return a;
}

function head(title, sub, color, litera) {
  const h = el('div', 'dayhead');
  if (litera) h.dataset.k = litera;                 // litera dnia w tle, jak numer na koszulce
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
  wrapper.append(head(tytulDnia(d.title), `Dzień ${d.key} · ${d.day} · ~${d.minutes} min`, true, d.key));
  wrapper.append(wyborTygodnia(w, x => '#/d/' + key + '/' + x));
  wrapper.append(pasekTreningu(key, w));

  const { done, total } = postepDnia(w, key);
  if (total) {
    const sp = el('div', 'sprog');
    sp.id = 'sprog';
    sp.append(el('span', 'ile', `${done}/${total} serii`));
    const bar = el('div', 'bar'); const fill = el('div', 'fill');
    fill.style.width = (done / total * 100) + '%';
    bar.append(fill); sp.append(bar);
    sp.append(el('span', 'proc', Math.round(done / total * 100) + '%'));
    if (done >= total) sp.classList.add('komplet');
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
  h.append(el('div', 'exn', String(it.n).padStart(2, '0')));
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
    v.dataset.cnt = pl.kg; v.dataset.krok = 2.5;
    v.classList.add('kgbtn');
    v.setAttribute('role', 'button');
    v.title = 'Pokaż talerze';
    platesRow = platesEl(pl.kg);
    v.onclick = () => platesRow.classList.toggle('on');
    metrics.append(m);
    odswiezKg = kg => {
      v.textContent = fmt(kg);
      v.dataset.cnt = kg;
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
  const pochwal = el('button', 'btn primary', 'Karta na story');
  pochwal.style.marginTop = '12px';
  pochwal.onclick = () => pokazZaliczenie(day, w);
  box.append(pochwal);
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
  hv.dataset.cnt = Math.round(e * 2) / 2; hv.dataset.krok = 0.5;
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
    body.append(noteBox('Pojedyncze powtórzenie do upadku.', ' To już jest Twój maks, więc wzór nie dokłada narzutu na zapas — wynik to wprost podniesiony ciężar.', 'uwaga'));
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
  body.append(head('Joga',
    `Dzień ${m.key} · ${m.day} · ~${state.mobShort ? m.shortMinutes : m.minutes} min`, true, m.key));
  body.append(wyborTygodnia(w, x => '#/mobilnosc/' + x));
  body.append(pasekTreningu('D', w));

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
    if (nowe) blysk(tick);
    if (nowe && sesjaKompletna('D', w)) setTimeout(() => pokazZaliczenie('D', w), 450);
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

  // Instrukcja pozycji. Wcześniej pod „Jak to zrobić" siedziała sama wskazówka
  // dla kogoś, kto pozycję już zna — a to jest niedziela, nie egzamin z jogi.
  // Kolejność jest celowa: najpierw JAK wejść, potem czego nie robić, na końcu
  // po co to w ogóle jest. Kto nie zna pozycji, potrzebuje pierwszego; kto zna,
  // przewija do ostatniego.
  const opis = el('div', 'exnote');
  if (it.steps && it.steps.length) {
    const ol = el('ol', 'kroki');
    it.steps.forEach(k => ol.append(el('li', null, k)));
    opis.append(ol);
  }
  if (it.blad) {
    const b = el('div', 'blad');
    b.append(el('span', null, 'Częsty błąd'), el('p', null, it.blad));
    opis.append(b);
  }
  if (it.note) {
    const n = el('div', 'posztange');
    n.append(el('span', null, 'Pod sztangę'), el('p', null, it.note));
    opis.append(n);
  }
  opis.hidden = true;
  const more = el('button', 'more', 'Jak to zrobić ▾');
  more.onclick = () => {
    opis.hidden = !opis.hidden;
    more.textContent = opis.hidden ? 'Jak to zrobić ▾' : 'Zwiń ▴';
  };
  box.append(more, opis);
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
  state.rekal[blok.rekal] = { ...zmiany, ts: new Date().toISOString(), auto: true };
  save(); saveRekal();
}

/* Rekalibracja idzie sama, jak korekta z dwóch tygodni. Warunek z arkusza jest
   ostry i policzalny — „KAŻDA sesja zmieściła się w suficie RPE" — więc nie ma
   tu czego rozstrzygać; pytanie o zgodę było tylko przeniesieniem roboty na
   głowę, która przyszła potrenować.
 *
 * Bloku NIE zamykamy, kiedy podwyżki nie ma. Dziennik uzupełnia się po fakcie,
 * czasem tydzień później, więc komplet potrafi się domknąć z opóźnieniem —
 * i wtedy podwyżka ma wejść, a nie przepaść przez to, że akurat nikt jej
 * wcześniej nie odklikał. */
function maybeRekalibruj() {
  const out = [];
  for (const blok of BLOKI) {
    if (!blok.rekal || state.week < blok.rekal || state.rekal[blok.rekal]) continue;
    const w = rekalDoWziecia(blok);
    if (!w || !w.ocena) continue;
    zastosujRekalibracje(blok, w.zmiany);
    out.push({ blok, zmiany: w.zmiany });
  }
  return out;
}

/* Jedno wejście na wszystkie automatyczne przeliczenia. Kolejność ma znaczenie:
   rekalibracja bloku idzie PIERWSZA, a korekta z dwóch tygodni omija boje, które
   właśnie dostały +10% — inaczej w tygodniu wyzwalającym zsumowałoby się to do
   ponad dwunastu procent, a arkusz mówi „nigdy więcej niż 10% naraz". */
function przeliczPlan() {
  maybeRekalibruj();
  return maybeAdjust();
}

function cofnijRekalibracje(trigger) {
  const r = state.rekal[trigger];
  if (!r || r.pominieta) return;
  for (const key of REKAL_BOJE) if (r[key]) state.e1rm[key] = r[key].before;
  state.rekal[trigger] = { ...r, pominieta: true };
  save(); saveRekal();
}

// Karta na ekranie głównym. Nie pyta o zgodę — mówi, co się stało z ciężarami,
// i zostawia drogę powrotną. Znika po tapnięciu „OK", bo informacja przeczytana
// przestaje być informacją i robi się szumem.
function rekalibracjaCard() {
  for (const blok of [...BLOKI].reverse()) {
    if (!blok.rekal || state.week < blok.rekal) continue;
    const r = state.rekal[blok.rekal];
    if (r) {
      if (r.pominieta || r.widziana) continue;
      return kartaPodwyzki(blok, r);
    }
    // Podwyżki nie ma. Mówimy o tym raz, w tygodniu wyzwalającym, i nic nie
    // zamykamy — dziennik może się jeszcze uzupełnić.
    if (state.week === blok.rekal) {
      const w = rekalDoWziecia(blok);
      if (w && !w.ocena) return kartaBezPodwyzki(blok);
    }
  }
  return null;
}

function kartaPodwyzki(blok, r) {
  const n = el('div', 'note rekal');
  n.append(el('b', null, `Ciężary dołu w górę o 10% — po bloku ${blok.n}`));
  n.append(el('div', 'adjrow', 'Każda sesja dołu weszła w plan, więc podwyżka zastosowała się sama.'));
  for (const key of REKAL_BOJE) {
    if (!r[key]) continue;
    const L = LIFTS.find(x => x.key === key);
    const p = el('div', 'adjrow');
    const dot = el('span', 'dotc'); dot.style.background = L.color;
    p.append(dot, el('span', null, `${L.short} → ${fmt(r[key].after)} kg`));
    p.append(el('em', null, `było ${fmt(r[key].before)}`));
    n.append(p);
  }
  const ok = el('button', 'mini', 'OK');
  ok.onclick = () => { state.rekal[blok.rekal] = { ...r, widziana: true }; saveRekal(); render(); };
  const cof = el('button', 'mini', 'Cofnij podwyżkę');
  cof.onclick = () => { cofnijRekalibracje(blok.rekal); render(); };
  n.append(ok, cof);
  n.append(el('div', 'adjmini', 'Sufit RPE jest nadrzędny. Jeśli pierwszy tydzień po podwyżce wyjdzie ciężej niż sufit, cofnij ją tutaj albo w widoku Postęp.'));
  return n;
}

function kartaBezPodwyzki(blok) {
  const n = el('div', 'note rekal');
  n.append(el('b', null, `Po bloku ${blok.n} bez podwyżki`));
  const braki = REKAL_BOJE.map(k => ({ k, o: ocenaBojuWBloku(k, blok) })).filter(x => !x.o.komplet);
  const opis = braki.map(({ k, o }) => {
    const L = LIFTS.find(x => x.key === k);
    return o.niedowozy ? `${L.short}: ${o.niedowozy} × niedowóz`
                       : `${L.short}: ${o.zapisanych}/${o.tygodni} tygodni zapisanych`;
  }).join(' · ');
  n.append(el('div', 'adjrow', 'Nie każda sesja bloku weszła w plan. Ciężary zostają.'));
  if (opis) n.append(el('div', 'adjrow', opis));
  const doRaportu = el('button', 'mini', 'Zobacz raport');
  doRaportu.onclick = () => go('#/postep');
  n.append(doRaportu);
  n.append(el('div', 'adjmini', 'Nic nie jest zamknięte: jeśli uzupełnisz brakujący dziennik, podwyżka wejdzie sama.'));
  return n;
}

function podsumowanieBlokow() {
  const gotowe = BLOKI.filter(blokZakonczony).length;
  const czeka = BLOKI.some(b => b.rekal && state.week >= b.rekal && !state.rekal[b.rekal]);
  if (czeka) return 'Rekalibracja czeka na komplet sesji';
  if (!gotowe) return 'Wykres, werdykty sesji i tabele';
  return `${gotowe} ${odmiana(gotowe, 'blok zamknięty', 'bloki zamknięte', 'bloków zamkniętych')} · wykres i werdykty`;
}

const SLOWNIK_OCEN = { czysto: 'czysto', zapas: 'z zapasem', niedowoz: 'niedowóz', brak: '—' };

function postepView() {
  const frag = document.createDocumentFragment();
  frag.append(backLink());
  const body = el('div', klasaWejscia());
  body.append(head('Postęp', 'Wykres, bloki i tabele na 12 tygodni', true));

  // Rząd trzech liczb: cały cykl do dziś.
  let tonCykl = 0, sesje = 0, serieCykl = 0;
  for (let x = 1; x <= state.week; x++) {
    tonCykl += tonazTygodnia(x);
    for (const d of ['A', 'B', 'C']) { const t = tonazDnia(x, d); if (t.serie) sesje++; serieCykl += t.serie; }
  }
  const kpi = el('div', 'stats kpi');
  const kaf = (l, v, u, d, tys) => {
    const s = el('div', 'stat');
    s.append(el('div', 'sl', l));
    const b = el('div', 'sv', tys ? fmtTys(v) : String(v));
    b.dataset.cnt = v; b.dataset.krok = 1; if (tys) b.dataset.tys = 1;
    if (u) b.append(el('u', null, u));
    s.append(b, el('div', 'sd', d));
    return s;
  };
  kpi.append(kaf('Tonaż cyklu', Math.round(tonCykl), 'kg', `tyg. 1–${state.week}`, true),
    kaf('Sesje', sesje, null, `z ${state.week * 3}`),
    kaf('Z rzędu', seriaTygodni(), null, 'tyg. z kompletem'));
  body.append(kpi);

  const tonCard = el('div', 'card');
  tonCard.append(el('h3', null, 'Tonaż tydzień po tygodniu'));
  tonCard.append(wykresTonazu());
  body.append(tonCard);

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
      ? 'Bez podwyżki — nie każda sesja bloku weszła w plan. Aplikacja sprawdza to dalej: uzupełniony dziennik może ją jeszcze odblokować.'
      : `Rekalibracja po tym bloku: w tygodniu ${blok.rekal}. Zastosuje się sama, jeśli każda sesja dołu wejdzie w plan.`));
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
  box.append(el('p', null, r.auto ? 'Podwyżka +10% zastosowana automatycznie.' : 'Podwyżka +10%.'));
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
    add('circle', { cx: px(last.w), cy: py(last.kg), r: 4, fill: s.color, stroke: 'var(--s1)', 'stroke-width': 2 });
    const lab = add('text', { x: px(last.w) + 8, y: py(last.kg) + 3 }, 'endlab');
    lab.textContent = fmt(last.kg);
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

// Kolumny: jedna na tydzień, ≤ 24 px, zaokrąglony koniec, prosta podstawa.
// Bieżący tydzień w kolorze tekstu, reszta wyciszona; deload w bursztynie.
function wykresTonazu() {
  const W = 340, H = 150, ML = 8, MR = 8, MT = 22, MB = 22;
  const dane = Array.from({ length: 12 }, (_, i) => ({ w: i + 1, t: i + 1 <= state.week ? tonazTygodnia(i + 1) : null }));
  const max = Math.max(1, ...dane.map(d => d.t || 0));
  const slot = (W - ML - MR) / 12, bw = Math.min(24, slot - 6);
  const py = v => MT + (1 - v / max) * (H - MT - MB);
  const wrap = el('div', 'chart kolumny');
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tonaż w każdym tygodniu cyklu">`;
  svg += `<line class="grid" x1="${ML}" x2="${W - MR}" y1="${H - MB}" y2="${H - MB}"/>`;
  let najw = null;
  dane.forEach(d => { if (d.t && (!najw || d.t > najw.t)) najw = d; });
  dane.forEach((d, i) => {
    const x = ML + i * slot + (slot - bw) / 2, y0 = H - MB;
    const cls = d.w === state.week ? 'kol teraz' : isDeload(d.w) ? 'kol dl' : 'kol';
    if (d.t) {
      const y = py(d.t), h = y0 - y, r = Math.min(4, h);
      svg += `<path class="${cls}" style="--i:${i}" d="M${x} ${y0}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + bw - r}Q${x + bw} ${y} ${x + bw} ${y + r}V${y0}Z"/>`;
    } else if (d.w > state.week) {
      svg += `<rect class="kol przysz" x="${x}" y="${y0 - 3}" width="${bw}" height="3" rx="1.5"/>`;
    }
    svg += `<text class="axis" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${d.w}</text>`;
  });
  if (najw) svg += `<text class="endlab" x="${ML + (najw.w - 1) * slot + slot / 2}" y="${py(najw.t) - 7}" text-anchor="middle">${fmtTys(najw.t)}</text>`;
  svg += '</svg>';
  wrap.innerHTML = svg;
  const opis = el('p', null, najw
    ? `Najwięcej: tydzień ${najw.w}, ${fmtTys(najw.t)} kg. Liczą się ćwiczenia z ciężarem w kilogramach.`
    : 'Pierwsza zapisana seria z ciężarem pojawi się tutaj.');
  opis.style.fontSize = '12.5px'; opis.style.marginTop = '8px';
  const box = el('div'); box.append(wrap, opis);
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
  // A gdy sesja jest już zapisana, prawdą o tym, co było na sztandze, jest sam
  // dziennik — plan mówi tylko, co miało być. Ma to znaczenie po przeniesieniu
  // tygodnia (plan podaje tam inną liczbę niż ta, którą się dźwigało) i po
  // wczytaniu kopii zapasowej. Ciężar jest jeden na ćwiczenie, więc bierzemy
  // pierwszą zapisaną serię z liczbowym ciężarem.
  const zDziennika = day ? (logGet(w, day, it.n).find(r => r && r.kg != null) || {}).kg : null;
  const boj = wlasnyBoj != null ? wlasnyBoj : (zDziennika != null ? zDziennika : load);
  return {
    sets: m ? Math.min(+m[1], 12) : 0,
    target: m ? +m[2] : null,
    unit: m && m[3] ? m[3] : null,
    kg: isKg(load) ? boj : wlasny,
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

/* ---------- przenoszenie tygodnia ---------- */
// Numer tygodnia ustawia się ręcznie, więc sesja potrafi trafić pod numer, który
// został z poprzedniego razu. Przeniesienie przepina cały tydzień: dziennik serii,
// własne ciężary bojów i odklikaną jogę. Ten sam ruch w drugą stronę cofa zmianę.

const kluczeTygodnia = (obj, w) => Object.keys(obj).filter(k => +k.split('|')[0] === w);

function zawartoscTygodnia(w) {
  const klucze = kluczeTygodnia(state.log, w).filter(k => state.log[k].some(Boolean));
  return {
    serie: klucze.reduce((a, k) => a + state.log[k].filter(Boolean).length, 0),
    dni: [...new Set(klucze.map(k => k.split('|')[1]))].sort(),
    kgw: kluczeTygodnia(state.kgw, w).length,
    mob: Object.keys(state.mob[w] || {}).length,
  };
}
const tydzienMaDane = w => { const z = zawartoscTygodnia(w); return z.serie > 0 || z.kgw > 0 || z.mob > 0; };

/* Sam ruch. Bez pytań o zgodę i bez sprawdzania, czy cel jest pusty — o tym
   decyduje ekran, który to wywołuje, albo urządzenie, które ruch już wykonało.
   opcje.sync = false przy powtarzaniu cudzego przeniesienia: wiersze w bazie
   są już przestawione, więc drugi raz ich nie wysyłamy.
   opcje.id niesie identyfikator z drugiego urządzenia, żeby ruch nie odbił się
   z powrotem jako nowy. */
function przeniesTydzien(from, to, opcje = {}) {
  const ts = opcje.ts || new Date().toISOString();
  const sync = opcje.sync !== false;

  for (const k of kluczeTygodnia(state.log, from)) {
    const [, day, n] = k.split('|');
    // Znacznik czasu serii przestawiamy na chwilę przeniesienia. To nie jest
    // „kiedy trenowałaś" — tego pola nikt nie pokazuje — tylko rozstrzygnięcie,
    // czyj zapis jest nowszy przy scalaniu. Zapis powstał tu teraz, więc tak ma
    // stać: inaczej przeniesienie w tydzień, z którego kiedyś już coś wyszło,
    // wpadałoby pod sprzątanie po tamtym, starszym ruchu.
    const rows = state.log[k].map(r => (r ? { ...r, ts } : r));
    state.log[logKey(to, day, n)] = rows;
    delete state.log[k];
    // Do bazy idą obie strony: nowy tydzień z wartościami, stary wyzerowany.
    if (sync) rows.forEach((r, i) => {
      queuePush({ week: to, day, ex: +n, set_no: i + 1, reps: r ? r.r : null, kg: r ? r.kg : null, ts });
      queuePush({ week: from, day, ex: +n, set_no: i + 1, reps: null, kg: null, ts });
    });
  }
  saveLog();

  for (const k of kluczeTygodnia(state.kgw, from)) {
    const [, day, n] = k.split('|');
    state.kgw[kgwKey(to, day, n)] = state.kgw[k];
    delete state.kgw[k];
  }
  saveKgw();

  if (state.mob[from]) { state.mob[to] = state.mob[from]; delete state.mob[from]; }
  saveMob();

  state.moves.push({ id: opcje.id || ts + '|' + from + '>' + to, from, to, ts });
  // Lista jedzie w każdej paczce stanu, więc trzymamy sam ogon.
  if (state.moves.length > 20) state.moves = state.moves.slice(-20);
  saveMoves();
}

/* Wiersz z tygodnia ŹRÓDŁOWEGO przeniesienia, starszy niż samo przeniesienie,
   jest martwy: ten zapis stoi teraz gdzie indziej. Baza potrafi go jeszcze zwracać,
   bo wysyłka kolejki i pobranie chodzą osobno i umieją się rozminąć — a gdy raz
   wróci na urządzenie, zasada „puste z bazy nie kasuje lokalnego" broni go już
   na zawsze. Stąd granica po czasie, a nie zwykłe „ignoruj ten tydzień": sesja
   zapisana w tym tygodniu PO przeniesieniu jest normalnym, żywym zapisem. */
const poPrzeniesieniu = (week, ts) =>
  state.moves.some(m => m.from === week && (!ts || new Date(ts) <= new Date(m.ts)));

/* Ten sam warunek zastosowany do tego, co już leży na urządzeniu. Naprawia stan
   po rozminięciu opisanym wyżej — i po każdym kolejnym, gdyby do niego doszło. */
function sprzatnijPoPrzeniesieniach() {
  let zm = false;
  for (const m of state.moves) {
    for (const k of kluczeTygodnia(state.log, m.from)) {
      const stare = state.log[k];
      const rows = stare.map(r => (r && poPrzeniesieniu(m.from, r.ts) ? null : r));
      if (rows.every((r, i) => r === stare[i])) continue;
      while (rows.length && rows[rows.length - 1] == null) rows.pop();
      if (rows.length) state.log[k] = rows; else delete state.log[k];
      zm = true;
    }
  }
  if (zm) saveLog();
  return zm;
}

/* Przeniesienia wykonane na drugim urządzeniu. Baza `sety` trzyma wiersz na
   tydzień, a scalanie z założenia nie kasuje lokalnego zapisu pustym wpisem —
   więc bez powtórzenia ruchu u siebie to urządzenie zostałoby z kompletem
   w OBU tygodniach. Identyfikator pilnuje, żeby ruch wykonał się raz. */
function zastosujZdalnePrzeniesienia(zdalne) {
  if (!Array.isArray(zdalne)) return false;
  const znane = new Set(state.moves.map(m => m.id));
  let zm = false;
  for (const m of zdalne) {
    if (!m || !m.id || znane.has(m.id)) continue;
    if (!(m.from >= 1 && m.from <= 12 && m.to >= 1 && m.to <= 12)) continue;
    przeniesTydzien(m.from, m.to, { sync: false, id: m.id, ts: m.ts });
    zm = true;
  }
  // Tydzień źródłowy mógł się już zdążyć odbudować z bazy — czyścimy go tym
  // samym warunkiem, którym scalanie odrzuca stare wiersze.
  if (zm) sprzatnijPoPrzeniesieniach();
  return zm;
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

/* Scalanie paczki z bazy z dziennikiem na urządzeniu. Wydzielone z pullAll,
   żeby dało się je sprawdzić testem bez sieci — to tutaj rozstrzyga się, czyj
   zapis wygrywa. */
function scalZdalneWiersze(rows) {
  let changed = false;
  for (const r of rows) {
    // Zapis, który przeniesienie już przestawiło gdzie indziej.
    if (poPrzeniesieniu(r.week, r.ts)) continue;
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
  return changed;
}

async function pullAll() {
  if (!navigator.onLine) return setSync('off');
  try {
    const rows = await rpc('log_pull', { p_key: state.key });
    const changed = scalZdalneWiersze(rows);
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
const stanLokalny = () => ({ week: state.week, e1rm: state.e1rm, adjust: state.adjust, acc: state.acc, kgw: state.kgw, sound: state.sound, mob: state.mob, rekal: state.rekal, moves: state.moves, treningi: state.treningi });

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
    // Trening w toku na tym urządzeniu wygrywa — tętno i stoper żyją tutaj.
    if (d.treningi && inny(d.treningi, state.treningi)) {
      // Skrót odpalił się w Safari i dopisał tętno — pokazujemy je od razu tutaj.
      const nowe = Object.entries(d.treningi).find(([k, t]) => t && (t.hr || t.kcal) && !(state.treningi[k] && (state.treningi[k].hr || state.treningi[k].kcal)));
      state.treningi = { ...d.treningi, ...wToku() }; saveTreningi(true); zm = true;
      if (nowe) { const [w, day] = nowe[0].split('|'); setTimeout(() => pokazZaliczenie(day, +w, 'Tętno i kalorie ze Zdrowia dotarły.'), 300); }
    }
    // Na końcu, bo `kgw` i `mob` przyjechały już przestawione — zostaje sam dziennik.
    if (zastosujZdalnePrzeniesienia(d.moves)) zm = true;
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
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { odswiez(); if (typeof dociagnijZeStravy === 'function') dociagnijZeStravy(); } });

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

    const tick = el('button', 'tick', '✓');
    tick.setAttribute('aria-label', 'Odhacz serię ' + (i + 1) + ' z ' + pl.sets);
    const sl = el('input', 'suwak');
    sl.type = 'range'; sl.min = 0; sl.max = Math.max(pl.target * 2, pl.target + 6); sl.step = 1; sl.value = powt;
    sl.setAttribute('aria-label', 'Powtórzenia w serii ' + (i + 1));
    const val = el('div', 'setval');
    const vb = el('b', null, String(powt));
    val.append(vb, el('i', null, pl.unit === 's' ? 's' : pl.unit === 'm' ? 'm' : ''));

    const zapisz = () => { logSet(w, day, it.n, i, { r: powt, kg: kgTeraz, pr: pl.target, pk: pl.planKg }); };

    tick.onclick = () => {
      const jest = r.classList.toggle('done');
      if (jest) { zapisz(); blysk(tick); } else logSet(w, day, it.n, i, null);
      odswiezPostep(day, w);
    };
    sl.oninput = () => { powt = +sl.value; vb.textContent = String(powt); };
    sl.onchange = () => {
      powt = +sl.value;
      if (!r.classList.contains('done')) { r.classList.add('done'); blysk(tick); }
      zapisz();
      odswiezPostep(day, w);
    };

    r.append(el('span', 'snum', String(i + 1)), sl, val, tick);
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
  const komplet = total > 0 && done >= total;
  if (komplet && !sp.classList.contains('komplet')) { blysk(sp, 1400); setTimeout(() => pokazZaliczenie(day, w), 450); }
  sp.classList.toggle('komplet', komplet);
}

/* ---------- ruch ---------- */
// Klasa na chwilę: CSS gra animację tylko na elemencie, który właśnie się zmienił,
// a nie na wszystkim, co się przebudowało przy odświeżeniu z bazy.
function blysk(n, ms = 700) {
  n.classList.add('swiezo');
  setTimeout(() => n.classList.remove('swiezo'), ms);
}

// Liczby wjeżdżają od zera przy wejściu w widok. Element ma data-cnt z wartością
// docelową i data-krok z zaokrągleniem, tekst po liczbie (jednostka) zostaje.
function odliczLiczby(root) {
  if (typeof requestAnimationFrame !== 'function' || typeof performance === 'undefined') return;
  root.querySelectorAll('[data-cnt]').forEach(n => {
    const cel = +n.dataset.cnt, krok = +n.dataset.krok || 1;
    const t = n.firstChild;
    if (!isFinite(cel) || !t || t.nodeType !== 3) return;
    const t0 = performance.now(), dur = 700;
    const klatka = now => {
      const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      const f = n.dataset.tys ? fmtTys : fmt;
      t.nodeValue = f(Math.round(cel * e / krok) * krok);
      if (p < 1) requestAnimationFrame(klatka); else t.nodeValue = f(cel);
    };
    requestAnimationFrame(klatka);
  });
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
  // Bój, który w tym tygodniu dostał +10% z rekalibracji bloku, ma już swoje
  // i drugiej podwyżki nie dokładamy.
  const rek = state.rekal[w];
  for (const key of ['bench', 'front', 'dl']) {
    const a = state.adjust[key] || {};
    if (a.week === w) { if (a.pct) out.push({ key, ...a }); continue; }   // już zastosowana
    if (a.skipped === w) continue;                                        // cofnięta ręcznie
    if (rek && !rek.pominieta && rek[key]) { state.adjust[key] = { week: w, pct: 0, powod: 'rekalibracja bloku' }; continue; }
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

// Dolny pasek ma dwie role. Na ekranach przeglądowych to zakładki; w trakcie
// sesji (albo gdy przerwa jeszcze się liczy) to timer — jedno miejsce pod
// kciukiem, zawsze w tym samym punkcie ekranu.
const ZAKLADKI = [
  { href: '#/', label: 'Dziś', ico: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/>' },
  { href: '#/postep', label: 'Postęp', ico: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>' },
  { href: '#/zasady', label: 'Zasady', ico: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>' },
  { href: '#/ustawienia', label: 'Dziennik', ico: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>' },
];

function renderTimer() {
  const box = $('#timer');
  box.innerHTML = '';
  const v = state.view || '#/';
  const wSesji = v.startsWith('#/d/') || v.startsWith('#/mobilnosc');
  if (!wSesji && !tId) {
    box.className = 'timer tabs';
    const nav = el('nav', 'in');
    for (const z of ZAKLADKI) {
      const aktywna = z.href === '#/' ? !['#/postep', '#/tabela', '#/raport', '#/zasady', '#/ustawienia', '#/1rm'].includes(v) && !wSesji
        : v === z.href || (z.href === '#/postep' && (v === '#/tabela' || v === '#/raport'));
      const b = el('button', 'tab' + (aktywna ? ' on' : ''));
      b.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${z.ico}</svg>`;
      b.append(el('span', null, z.label));
      if (aktywna) b.setAttribute('aria-current', 'page');
      b.onclick = () => go(z.href);
      nav.append(b);
    }
    box.append(nav);
    return;
  }
  box.className = 'timer';
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
      powiadomZegarek('Koniec przerwy', 'Następna seria.');
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
/* Przepięcie tygodnia z poziomu ustawień. Zasada jest jedna i bez wyjątków:
   cel musi być pusty. Scalanie dwóch tygodni w jeden zabrałoby zapis, którego
   nie da się odtworzyć, a dziennik treningowy jest wart więcej niż wygoda. */
function przeniesCard() {
  const box = el('div', 'card');
  let z = null, na = null, pewny = false;

  // Kropka na kafelku tygodnia mówi, gdzie cokolwiek jest zapisane — bez tego
  // wybór numeru byłby zgadywanką.
  const rzad = (etykieta, wybrany, ustaw) => {
    const w = el('div', 'przenrzad');
    w.append(el('div', 'przenlab', etykieta));
    const chipy = el('div', 'wchipy');
    for (let i = 1; i <= 12; i++) {
      const c = el('button', 'wchip' + (i === wybrany ? ' on' : '') + (tydzienMaDane(i) ? ' ma' : ''), String(i));
      c.onclick = () => { ustaw(i); pewny = false; odswiez(); };
      chipy.append(c);
    }
    w.append(chipy);
    return w;
  };

  const opis = t => {
    const c = zawartoscTygodnia(t), cz = [];
    if (c.serie) cz.push(c.serie + ' ' + odmiana(c.serie, 'seria', 'serie', 'serii')
      + (c.dni.length ? ' (dni ' + c.dni.join(', ') + ')' : ''));
    if (c.kgw) cz.push(c.kgw + ' ' + odmiana(c.kgw, 'własny ciężar', 'własne ciężary', 'własnych ciężarów'));
    if (c.mob) cz.push(c.mob + ' ' + odmiana(c.mob, 'pozycja jogi', 'pozycje jogi', 'pozycji jogi'));
    return cz.join(', ');
  };

  let komunikat = null;                      // zostaje pod spodem po wykonanym ruchu

  function odswiez() {
    box.innerHTML = '';
    box.append(el('h3', null, 'Przenieś dziennik między tygodniami'));
    box.append(el('p', null, 'Numer tygodnia ustawiasz ręcznie, więc sesja potrafi trafić pod numer, który został z poprzedniego razu. Tutaj przepinasz cały tydzień naraz: serie, własne ciężary bojów i odklikaną jogę. Ten sam ruch w drugą stronę cofa zmianę.'));
    box.append(rzad('Z tygodnia', z, i => { z = i; }));
    box.append(rzad('Na tydzień', na, i => { na = i; }));

    let blokada = null;
    if (z == null || na == null) blokada = 'Wybierz tydzień, z którego przenosisz, i ten, na który ma trafić. Kropka oznacza tydzień, w którym coś jest zapisane.';
    else if (z === na) blokada = 'To ten sam tydzień.';
    else if (!tydzienMaDane(z)) blokada = 'Tydzień ' + z + ' jest pusty — nie ma czego przenosić.';
    else if (tydzienMaDane(na)) blokada = 'Tydzień ' + na + ' nie jest pusty: ' + opis(na)
      + '. Przeniesienie nadpisałoby ten zapis, więc jest zablokowane.';

    const info = el('div', 'przeninfo' + (blokada && z != null && na != null ? ' stop' : ''));
    info.textContent = blokada || ('Z tygodnia ' + z + ' na ' + na + ': ' + opis(z) + '.');
    box.append(info);

    if (!blokada) {
      const b = el('button', 'btn ghost' + (pewny ? ' warn' : ''),
        pewny ? 'Na pewno? Tapnij jeszcze raz' : `Przenieś tydzień ${z} na ${na}`);
      b.onclick = () => {
        if (!pewny) { pewny = true; odswiez(); return; }
        const zrodlo = z, cel = na, co = opis(z);
        przeniesTydzien(zrodlo, cel);
        z = null; na = null; pewny = false;
        komunikat = `Przeniesione z tygodnia ${zrodlo} na ${cel}: ${co}. Drugie urządzenie `
          + 'wykona ten sam ruch przy najbliższej synchronizacji.';
        odswiez();
      };
      box.append(b);
    }
    if (komunikat) box.append(el('div', 'przeninfo ok', komunikat));
  }

  odswiez();
  return box;
}

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
  prow.append(el('div', 'n', 'Startuj na niedokończonej sesji'));
  prow.append(miniBtn(state.autoDzis ? 'Włączone' : 'Wyłączone', () => { state.autoDzis = !state.autoDzis; save(); render(); }));
  pref.append(prow);
  pref.append(el('p', null, 'Aplikacja otwiera najświeższą sesję tego tygodnia, która nie jest jeszcze zapisana w całości — także wtedy, gdy trening był wczoraj, a dziennik został do uzupełnienia. Sesji z przyszłości nie proponuje. Gdy wszystko jest zapisane, startuje na dzisiejszym dniu (poniedziałek → A, środa → B, piątek → C, niedziela → joga), a w dzień wolny na ekranie głównym. Wejście z linku zawsze ma pierwszeństwo.'));
  body.append(pref);

  body.append(zegarekCard());
  body.append(stravaCard());
  body.append(przeniesCard());

  const kop = el('div', 'card');
  kop.append(el('h3', null, 'Kopia zapasowa'));
  kop.append(el('p', null, 'Plik JSON z dziennikiem, E1RM i historią korekt. Działa niezależnie od synchronizacji.'));
  const exp = el('button', 'btn ghost', 'Zapisz do pliku');
  exp.onclick = () => {
    const dane = { v: 3, key: state.key, e1rm: state.e1rm, log: state.log, adjust: state.adjust, acc: state.acc, kgw: state.kgw, mob: state.mob, rekal: state.rekal, moves: state.moves, treningi: state.treningi };
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
      if (Array.isArray(d.moves)) { state.moves = d.moves; saveMoves(); }
      if (d.treningi) { state.treningi = d.treningi; saveTreningi(); }
      render();
    } catch { alert('Nie udało się odczytać pliku.'); }
  };
  impLabel.append(imp);
  kop.append(exp, impLabel);
  body.append(kop);

  frag.append(body);
  return frag;
}

/* ---------- iPhone ---------- */
// Na iOS każda przeglądarka to silnik Safari: bez Bluetooth ze stron, a
// powiadomienia tylko dla strony dodanej do ekranu początkowego.
const IOS = typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent || '')
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
const JAKO_APKA = () => {
  try { return !!(navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)); }
  catch { return false; }
};
const MA_BT = () => typeof navigator !== 'undefined' && !!navigator.bluetooth;

/* ---------- trening: start, koniec, stoper, tętno ---------- */
// Klucz jak w dzienniku: "tydzien|dzien". Wartość: { start, end, hr: { sum, n, max } }.
// Tylko to, co naprawdę się wydarzyło — dziennik uzupełniany po fakcie nie
// udaje, że trening trwał od pierwszego odhaczenia.
const trnKey = (w, day) => w + '|' + day;
const trening = (w, day) => state.treningi[trnKey(w, day)] || null;
const wToku = () => Object.fromEntries(Object.entries(state.treningi).filter(([, t]) => t && t.start && !t.end));
const czasTreningu = t => {
  if (!t || !t.start) return 0;
  const koniec = t.end ? new Date(t.end) : new Date();
  return Math.max(0, Math.round((koniec - new Date(t.start)) / 1000));
};
const fmtCzas = sek => {
  const h = Math.floor(sek / 3600), m = Math.floor(sek / 60) % 60, s = sek % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};
const fmtMin = sek => (sek >= 3600 ? `${Math.floor(sek / 3600)} h ${Math.round(sek / 60) % 60} min` : `${Math.max(1, Math.round(sek / 60))} min`);

function rozpocznijTrening(day, w) {
  state.treningi[trnKey(w, day)] = { start: new Date().toISOString(), end: null };
  saveTreningi();
  keepAwake(true);
  if (navigator.vibrate) navigator.vibrate(60);
}
function zakonczTrening(day, w) {
  const t = trening(w, day);
  if (!t) return;
  t.end = new Date().toISOString();
  saveTreningi();
  rozlaczTetno();
  pokazZaliczenie(day, w);
  if (stravaPolaczona()) czekajNaStrave(day, w);
  else if (IOS && state.skrot && !(t.hr && t.hr.n)) setTimeout(() => uruchomSkrot(day, w), 600);
}

/* ---------- skrót iPhone'a: tętno i kalorie z aplikacji Zdrowie ----------
   Huawei Health zapisuje tętno i energię w Zdrowiu, a strona nie ma do Zdrowia
   dostępu. Skrót ma: plan podaje mu, ile minut trwał trening, skrót liczy
   średnią, maksimum i sumę kalorii z tego okna i otwiera plan z liczbami
   w adresie. Adres otwiera się w Safari — jeśli plan działa z ikony, liczby
   dojadą do niego synchronizacją. */
const NAZWA_SKROTU = 'Plan 12 zegarek';
const ADRES_PLANU = 'https://olgaerobert-code.github.io/trening/';

function uruchomSkrot(day, w) {
  // Okno liczone od startu treningu do TERAZ, a nie długość treningu — skrót
  // odejmuje minuty od bieżącej godziny, a bywa uruchamiany chwilę po końcu.
  const t = trening(w, day);
  const minuty = t && t.start ? Math.ceil((Date.now() - new Date(t.start).getTime()) / 60000) + 2 : 90;
  location.href = 'shortcuts://run-shortcut?name=' + encodeURIComponent(NAZWA_SKROTU)
    + '&input=text&text=' + encodeURIComponent(String(minuty));
}

// Najświeższy trening z ostatnich 12 godzin; bez niego — sesja, na której
// aplikacja i tak by się otworzyła.
function sesjaDoDanych() {
  const teraz = Date.now();
  let best = null;
  for (const [k, t] of Object.entries(state.treningi)) {
    const kiedy = new Date(t.end || t.start || 0).getTime();
    if (!kiedy || teraz - kiedy > 12 * 3600e3) continue;
    if (!best || kiedy > best.kiedy) { const [w, day] = k.split('|'); best = { w: +w, day, kiedy }; }
  }
  return best || { w: state.week, day: domyslnaSesja() || dzisiaj() || 'A' };
}

// Wejście z adresu ?zegarek=1&avg=…&max=…&kcal=… (wysyła je skrót).
function przyjmijZZegarka(params) {
  if (!params || params.get('zegarek') !== '1') return null;
  const { w, day } = sesjaDoDanych();
  const t = trening(w, day);
  if (t && t.start && !t.end) t.end = new Date().toISOString();
  const cos = zapiszZZegarka(day, w, { avg: params.get('avg') || '', max: params.get('max') || '', kcal: params.get('kcal') || '' });
  return { w, day, pusto: !cos };
}
// Liczby przepisane z podsumowania na zegarku. Puste pole = nie ruszamy.
function zapiszZZegarka(day, w, { avg, max, kcal }) {
  const n = v => { const x = Math.round(+String(v).replace(',', '.')); return x > 0 ? x : null; };
  // Pusta paczka (Zdrowie nic nie zwróciło) nie zakłada wpisu treningu.
  if (!n(avg) && !n(max) && !n(kcal)) return false;
  const t = trening(w, day) || (state.treningi[trnKey(w, day)] = { start: null, end: new Date().toISOString() });
  if (n(avg)) t.hr = { avg: n(avg), max: n(max) || (t.hr && t.hr.max) || null, zZegarka: true };
  else if (n(max) && t.hr) t.hr.max = n(max);
  if (n(kcal)) t.kcal = n(kcal);
  saveTreningi();
  return true;
}
function cofnijStart(day, w) { delete state.treningi[trnKey(w, day)]; saveTreningi(); }

// Pasek na górze sesji: przed startem duży przycisk, w trakcie stoper, tętno
// i „Zakończ", po końcu — podsumowanie czasu.
function pasekTreningu(day, w) {
  const box = el('div', 'trn');
  box.style.setProperty('--tc', DAY_HEX[day]);
  const t0 = trening(w, day);
  const t = t0 && (t0.start || t0.end) ? t0 : null;
  if (!t) {
    const b = el('button', 'trn-start');
    b.append(el('span', 'trn-ico'), el('span', null, 'Rozpocznij trening'));
    b.onclick = () => { rozpocznijTrening(day, w); render(); };
    box.append(b);
    box.append(el('div', 'trn-pod', 'Stoper ruszy teraz. Dziennik uzupełniany później nie potrzebuje startu.'));
    return box;
  }
  if (!t.end) {
    box.classList.add('live');
    const lewa = el('div', 'trn-l');
    lewa.append(el('span', 'trn-kropka'), el('span', 'trn-et', 'Trening trwa'));
    const zeg = el('div', 'trn-czas', fmtCzas(czasTreningu(t)));
    zeg.id = 'trn-czas';
    lewa.append(zeg);
    box.append(lewa);
    const hr = el('button', 'trn-hr' + (tetno.hr ? ' on' : ''));
    hr.id = 'trn-hr';
    if (!MA_BT()) hr.hidden = true;
    hr.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 21s-7.5-4.6-9.5-9.3C1 8.1 3.3 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.6 0 5.9 3.6 4.4 7.2C19.5 16.4 12 21 12 21z"/></svg>';
    hr.append(el('b', null, tetno.hr ? String(tetno.hr) : '—'), el('span', null, tetno.hr ? 'bpm' : 'zegarek'));
    hr.onclick = () => { if (!tetno.dev) polaczTetno(day, w); };
    box.append(hr);
    const stop = el('button', 'trn-stop', 'Zakończ');
    stop.onclick = () => zakonczTrening(day, w);
    box.append(stop);
    const info = el('div', 'trn-pod');
    info.id = 'trn-info';
    info.textContent = tetno.info || (tetno.dev ? '' : MA_BT()
      ? 'Tapnij serce, żeby pobrać tętno z zegarka.'
      : 'Włącz na zegarku „Trening siłowy" — tętno i kalorie przepiszesz po „Zakończ".');
    box.append(info);
    return box;
  }
  box.classList.add('koniec');
  const txt = el('div', 'trn-l');
  txt.append(el('span', 'trn-et', 'Trening zakończony'), el('div', 'trn-czas', fmtMin(czasTreningu(t))));
  box.append(txt);
  if (t.hr && (t.hr.n || t.hr.avg)) {
    const h = el('div', 'trn-hr stat');
    h.append(el('b', null, String(t.hr.avg || Math.round(t.hr.sum / t.hr.n))), el('span', null, 'śr. bpm'));
    box.append(h);
  }
  const znowu = el('button', 'trn-link', 'Cofnij');
  znowu.onclick = () => { t.end = null; saveTreningi(); render(); };
  znowu.setAttribute('aria-label', 'Wznów trening');
  box.append(znowu);
  return box;
}

// Stoper chodzi sam — bez przebudowy ekranu, żeby suwak nie uciekał spod palca.
setInterval(() => {
  const n = document.getElementById('trn-czas');
  if (!n) return;
  const m = (state.view || '').match(/^#\/(?:d\/([A-C])|mobilnosc)(?:\/(\d+))?/);
  if (!m) return;
  const day = m[1] || 'D', w = tydzienZAdresu(m[2]) || state.week;
  const t = trening(w, day);
  if (t && !t.end) n.textContent = fmtCzas(czasTreningu(t));
}, 1000);

/* Tętno z zegarka przez Web Bluetooth — standardowa usługa Heart Rate (0x180D).
   Zegarek musi ją nadawać: w Huawei to „Udostępnianie danych tętna" w
   ustawieniach treningu na zegarku, i działa, gdy na zegarku trwa trening. */
const tetno = { dev: null, hr: null, info: '' };
function pokazTetno() {
  const b = document.getElementById('trn-hr');
  if (b) {
    b.classList.toggle('on', !!tetno.hr);
    const [v, u] = [b.querySelector('b'), b.querySelector('span')];
    if (v) v.textContent = tetno.hr ? String(tetno.hr) : '—';
    if (u) u.textContent = tetno.hr ? 'bpm' : 'zegarek';
  }
  const i = document.getElementById('trn-info');
  if (i) i.textContent = tetno.info;
}
async function polaczTetno(day, w) {
  if (!navigator.bluetooth) {
    tetno.info = 'Ta przeglądarka nie obsługuje Bluetooth ze stron. Otwórz plan w Chrome na Androidzie.';
    return pokazTetno();
  }
  try {
    tetno.info = 'Wybierz zegarek z listy…'; pokazTetno();
    const dev = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
    tetno.info = 'Łączę z ' + (dev.name || 'zegarkiem') + '…'; pokazTetno();
    const srv = await dev.gatt.connect();
    const ch = await (await srv.getPrimaryService('heart_rate')).getCharacteristic('heart_rate_measurement');
    await ch.startNotifications();
    tetno.dev = dev;
    tetno.info = 'Tętno z: ' + (dev.name || 'zegarek');
    ch.addEventListener('characteristicvaluechanged', e => {
      const v = e.target.value, flagi = v.getUint8(0);
      const hr = flagi & 1 ? v.getUint16(1, true) : v.getUint8(1);
      if (!hr) return;
      tetno.hr = hr;
      const t = trening(w, day);
      if (t && !t.end) {
        const h = t.hr || (t.hr = { sum: 0, n: 0, max: 0 });
        h.sum += hr; h.n++; h.max = Math.max(h.max, hr);
        if (h.n % 15 === 0) saveTreningi(true);
      }
      pokazTetno();
    });
    dev.addEventListener('gattserverdisconnected', () => {
      tetno.dev = null; tetno.hr = null; tetno.info = 'Zegarek się rozłączył. Tapnij serce, żeby połączyć ponownie.'; pokazTetno();
    });
    pokazTetno();
  } catch (e) {
    tetno.info = e && e.name === 'NotFoundError'
      ? 'Nie wybrano zegarka. Włącz na nim trening i udostępnianie tętna, potem spróbuj jeszcze raz.'
      : 'Nie udało się połączyć: ' + ((e && e.message) || 'nieznany błąd') + '.';
    pokazTetno();
  }
}
function rozlaczTetno() {
  try { if (tetno.dev && tetno.dev.gatt.connected) tetno.dev.gatt.disconnect(); } catch { /* już rozłączony */ }
  tetno.dev = null; tetno.hr = null; tetno.info = '';
}

/* Koniec przerwy jako powiadomienie. Aplikacja Huawei Health przekazuje
   powiadomienia z telefonu na zegarek, więc przerwa kończy się wibracją na
   nadgarstku, nawet gdy telefon leży w torbie. */
async function powiadomZegarek(tytul, tresc) {
  if (!state.zegarek || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.ready;
    const opcje = { body: tresc, tag: 'przerwa', renotify: true, vibrate: [300, 120, 300], icon: 'icon-192.png', badge: 'icon-192.png' };
    if (reg && reg.showNotification) await reg.showNotification(tytul, opcje);
    else new Notification(tytul, opcje);
  } catch { /* bez powiadomienia zostaje dźwięk i wibracja telefonu */ }
}

function zegarekCard() {
  const box = el('div', 'card');
  box.append(el('h3', null, 'Zegarek'));
  const krok = (nr, tytul, tresc, stan) => {
    const r = el('div', 'krok' + (stan === true ? ' ok' : ''));
    r.append(el('span', 'kn', stan === true ? '✓' : String(nr)));
    const t = el('div', 'kt');
    t.append(el('b', null, tytul));
    if (tresc) t.append(el('p', null, tresc));
    r.append(t);
    box.append(r);
    return t;
  };

  if (IOS) {
    krok(1, JAKO_APKA() ? 'Plan jest aplikacją na iPhonie' : 'Dodaj plan do ekranu początkowego',
      JAKO_APKA() ? null : 'Otwórz tę stronę w Safari → przycisk Udostępnij (kwadrat ze strzałką) → „Do ekranu początkowego". Potem uruchamiaj plan z ikony — tylko tak iPhone pozwala stronie wysyłać powiadomienia. Dziennik zsynchronizuje się sam.',
      JAKO_APKA());
  }

  const brak = typeof Notification === 'undefined';
  const stan = brak ? 'brak' : Notification.permission;
  const wlaczone = state.zegarek && stan === 'granted';
  const t2 = krok(IOS ? 2 : 1, 'Koniec przerwy wibruje na zegarku',
    brak ? (IOS ? 'Najpierw krok 1 — w Safari powiadomienia działają tylko z ikony na ekranie początkowym.' : 'Ta przeglądarka nie wysyła powiadomień ze stron.')
      : stan === 'denied' ? 'Powiadomienia są zablokowane. ' + (IOS ? 'Włączysz je w Ustawieniach iPhone’a → Powiadomienia → Plan 12 tygodni.' : 'Odblokujesz je w ustawieniach strony w przeglądarce.')
      : 'Aplikacja wyśle powiadomienie, kiedy timer przerwy dojdzie do zera, a Huawei Health przekaże je na zegarek.',
    wlaczone);
  if (!brak && stan !== 'denied') {
    const rz = el('div', 'kbtn');
    rz.append(miniBtn(wlaczone ? 'Wyłącz' : 'Włącz powiadomienia', async () => {
      if (wlaczone) { state.zegarek = false; save(); render(); return; }
      const p = await Notification.requestPermission();
      state.zegarek = p === 'granted'; save(); render();
    }));
    if (wlaczone) rz.append(miniBtn('Wyślij próbne', () => powiadomZegarek('Koniec przerwy', 'Tak zawibruje zegarek po każdej przerwie.')));
    t2.append(rz);
  }
  krok(IOS ? 3 : 2, 'Huawei Health przekazuje powiadomienia',
    IOS ? 'Huawei Health → Urządzenia → Watch Fit 4 → Powiadomienia: włącz. W Ustawieniach iPhone’a → Powiadomienia → Plan 12 tygodni: zezwól i pokazuj na ekranie blokady.'
        : 'Huawei Health → Urządzenia → zegarek → Powiadomienia: włącz przeglądarkę, w której masz plan.');
  krok(IOS ? 4 : 3, 'Tętno i kalorie liczy zegarek',
    'Razem z „Rozpocznij trening" włącz na zegarku ćwiczenie „Strength training". ' + (stravaPolaczona()
      ? 'Po treningu najpierw zakończ go na zegarku, potem „Zakończ" w planie — tętno i kalorie przyjdą same ze Stravy.'
      : state.skrot ? 'Po treningu zakończ go na zegarku, otwórz na chwilę Huawei Health, potem „Zakończ" w planie — skrót dopisze tętno i kalorie.'
      : 'Po „Zakończ" karta treningu pokaże trzy pola: przepisz z podsumowania na zegarku średnie tętno, maksymalne i kalorie. Trafią na kartę i na story.')
      + (MA_BT() ? ' Na tym urządzeniu tętno może też płynąć na żywo przez Bluetooth: serce obok stopera.' : ''));

  return box;
}

/* ---------- Strava: tętno i kalorie z treningu na zegarku ----------
   Huawei Health wysyła treningi do Stravy razem z tętnem, a Strava ma otwarte
   API. Plan czyta z niego jedną rzecz: trening, który zaczął się w czasie
   sesji. Klucze (Client ID, Client Secret, tokeny) leżą WYŁĄCZNIE w pamięci
   tego urządzenia — nie idą do bazy, do synchronizacji ani do kopii
   zapasowej. Kod aplikacji jest publiczny, więc sekretu nie ma w nim wcale. */
const LS_STRAVA = 'trening.strava.v1';
const STRAVA_API = 'https://www.strava.com';
let strava = readJSON(LS_STRAVA, {});
const zapiszStrava = () => { try { localStorage.setItem(LS_STRAVA, JSON.stringify(strava)); } catch { /* bez pamięci nie zapamiętamy */ } };
const stravaPolaczona = () => !!(strava.refresh && strava.clientId && strava.clientSecret);
const adresPowrotu = () => (location.origin && location.origin !== 'null' ? location.origin + location.pathname : ADRES_PLANU);

function polaczStrave() {
  location.href = STRAVA_API + '/oauth/authorize?' + new URLSearchParams({
    client_id: strava.clientId, response_type: 'code', redirect_uri: adresPowrotu(),
    approval_prompt: 'auto', scope: 'activity:read_all', state: 'plan12',
  }).toString();
}

// Formularz (nie JSON) — to prosty request, bez zapytania wstępnego CORS.
async function stravaTokenZ(body) {
  const r = await fetch(STRAVA_API + '/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: strava.clientId, client_secret: strava.clientSecret, ...body }).toString(),
  });
  if (!r.ok) throw new Error(r.status === 400 || r.status === 401 ? 'Strava odrzuciła klucze — sprawdź Client ID i Client Secret.' : 'Strava odpowiedziała błędem ' + r.status + '.');
  const d = await r.json();
  strava.access = d.access_token;
  strava.refresh = d.refresh_token || strava.refresh;
  strava.expires = d.expires_at;
  if (d.athlete) strava.kto = [d.athlete.firstname, d.athlete.lastname].filter(Boolean).join(' ');
  zapiszStrava();
  return strava.access;
}
async function stravaToken() {
  if (strava.access && strava.expires && strava.expires * 1000 > Date.now() + 60000) return strava.access;
  return stravaTokenZ({ grant_type: 'refresh_token', refresh_token: strava.refresh });
}
async function stravaGet(sciezka) {
  const r = await fetch(STRAVA_API + '/api/v3' + sciezka, { headers: { Authorization: 'Bearer ' + await stravaToken() } });
  if (r.status === 401) { strava.access = null; zapiszStrava(); throw new Error('Strava wylogowała plan — połącz ponownie w ustawieniach.'); }
  if (!r.ok) throw new Error('Strava odpowiedziała błędem ' + r.status + '.');
  return r.json();
}

// Powrót ze Stravy: ?code=…&scope=…&state=plan12 (albo ?error=access_denied).
async function przyjmijStrave(params) {
  if (params.get('state') !== 'plan12') return null;
  if (params.get('error')) return { blad: 'Nie zezwolono na dostęp do Stravy.' };
  if (!(params.get('scope') || '').includes('activity:read')) return { blad: 'Strava nie dała dostępu do treningów — przy łączeniu zostaw zaznaczone „View data about your activities".' };
  try { await stravaTokenZ({ code: params.get('code'), grant_type: 'authorization_code' }); return { ok: true }; }
  catch (e) { return { blad: e.message }; }
}

/* Który trening ze Stravy należy do sesji: ten, który zaczął się najbliżej
   startu sesji (godzina w jedną i drugą stronę), a bez startu — najbliżej
   jej końca. Z tętnem wygrywa z tym bez. */
function dopasujAktywnosc(lista, t) {
  const ref = new Date(t.start || t.end).getTime();
  const kandydaci = (lista || [])
    .map(a => ({ a, d: Math.abs(new Date(a.start_date).getTime() - ref) }))
    .filter(x => x.d <= (t.start ? 60 : 180) * 60000)
    .sort((x, y) => (y.a.has_heartrate ? 1 : 0) - (x.a.has_heartrate ? 1 : 0) || x.d - y.d);
  return kandydaci.length ? kandydaci[0].a : null;
}

async function pobierzZeStravy(day, w) {
  const t = trening(w, day);
  if (!t || !stravaPolaczona()) return { stan: 'brak' };
  const ref = new Date(t.start || t.end).getTime();
  const lista = await stravaGet('/athlete/activities?per_page=15&after=' + Math.floor(ref / 1000 - 3 * 3600));
  const a = dopasujAktywnosc(lista, t);
  if (!a) return { stan: 'czekam' };
  let kcal = null;
  try { const pelna = await stravaGet('/activities/' + a.id); kcal = pelna.calories || null; } catch { /* bez kalorii też dobrze */ }
  zapiszZZegarka(day, w, {
    avg: a.average_heartrate ? Math.round(a.average_heartrate) : '',
    max: a.max_heartrate ? Math.round(a.max_heartrate) : '',
    kcal: kcal ? Math.round(kcal) : '',
  });
  t.strava = a.id;
  saveTreningi();
  return { stan: a.has_heartrate ? 'ok' : 'bez-tetna', nazwa: a.name };
}

/* Po „Zakończ" trening trafia do Stravy dopiero, gdy zegarek zsynchronizuje
   się z telefonem — czasem po minucie, czasem po kilku. Pytamy co minutę
   przez 20 minut, dopóki aplikacja jest otwarta. */
const czekanieStrava = {};
function czekajNaStrave(day, w, proby = 20) {
  const k = trnKey(w, day);
  if (czekanieStrava[k] || !stravaPolaczona()) return;
  const status = tekst => { const n = document.getElementById('zstrava'); if (n) n.textContent = tekst; };
  let ile = 0;
  const krok = async () => {
    ile++;
    try {
      const r = await pobierzZeStravy(day, w);
      if (r.stan === 'ok' || r.stan === 'bez-tetna') {
        delete czekanieStrava[k];
        pokazZaliczenie(day, w, r.stan === 'ok' ? 'Tętno i kalorie ze Stravy dopisane.' : 'Trening w Stravie nie ma tętna — dopisane kalorie.');
        return;
      }
      status('Czekam, aż trening z zegarka dotrze do Stravy… Otwórz Huawei Health, żeby zegarek się zsynchronizował.');
    } catch (e) {
      status(e.message || 'Nie udało się połączyć ze Stravą.');
    }
    if (ile < proby) czekanieStrava[k] = setTimeout(krok, 60000);
    else { delete czekanieStrava[k]; status('Nie znalazłam treningu w Stravie. Spróbuj przyciskiem niżej, kiedy się pojawi.'); }
  };
  czekanieStrava[k] = setTimeout(krok, 1500);
}

// Po powrocie do aplikacji: zakończone dziś treningi bez tętna — jedno pytanie.
function dociagnijZeStravy() {
  if (!stravaPolaczona()) return;
  const teraz = Date.now();
  for (const [k, t] of Object.entries(state.treningi)) {
    if (!t || !t.end || (t.hr && (t.hr.n || t.hr.avg)) || t.strava) continue;
    if (teraz - new Date(t.end).getTime() > 12 * 3600e3) continue;
    const [w, day] = k.split('|');
    czekajNaStrave(day, +w, 1);
  }
}

// Kod połączenia: gdy łączenie skończyło się w Safari, a plan działa z ikony,
// przenosimy klucze ręcznie — to dwie osobne pamięci na iPhonie.
const kodPolaczenia = () => btoa(unescape(encodeURIComponent(JSON.stringify({ i: strava.clientId, s: strava.clientSecret, r: strava.refresh, k: strava.kto }))));
function wklejKodPolaczenia(kod) {
  const d = JSON.parse(decodeURIComponent(escape(atob(String(kod).trim()))));
  if (!d.i || !d.s || !d.r) throw new Error('To nie jest kod połączenia.');
  strava = { clientId: d.i, clientSecret: d.s, refresh: d.r, kto: d.k };
  zapiszStrava();
}

function skrotSekcja() {
  {
    const t5 = el('details', 'skrot');
    t5.append(el('summary', null, 'Skrót iPhone’a: tętno i kalorie ze Zdrowia (trzeba go raz złożyć)'));
    const inst = el('div');
    const ol = el('ol');
    [
      'Sprawdź, że Huawei zapisuje do Zdrowia: Health → Browse → Activity → Workouts — treningi ze źródłem Huawei Health.',
      `Shortcuts → + → nazwa na górze: ${NAZWA_SKROTU} (dokładnie tak).`,
      '„If": Shortcut Input → has any value. W środku „Adjust Date": Subtract · [Shortcut Input] · minutes · from Current Date. W „Otherwise": „Adjust Date": Subtract · 90 · minutes · from Current Date. Za „End If" dodaj „Set Variable": Start = If Result.',
      '„Find Health Samples": Type = Heart Rate, filtr: Start Date · is after · Start. Potem „Calculate Statistics": Average → „Round Number" → „Set Variable": Avg.',
      'Jeszcze raz „Find Health Samples" (Heart Rate, after Start) → „Calculate Statistics": Maximum → „Round Number" → „Set Variable": Max.',
      '„Find Health Samples": Type = Active Energy, after Start → „Calculate Statistics": Sum → „Round Number" → „Set Variable": Kcal.',
      `„Text": ${ADRES_PLANU}?zegarek=1&avg=[Avg]&max=[Max]&kcal=[Kcal] — zmienne wstawiasz z paska nad klawiaturą. Na końcu „Open URLs".`,
      'Uruchom skrót raz ręcznie i pozwól mu czytać Zdrowie (Allow). Potem włącz „Uruchamiaj po Zakończ" niżej.',
    ].forEach(k => ol.append(el('li', null, k)));
    inst.append(ol);
    const kopiuj = miniBtn('Skopiuj adres do skrótu', async () => {
      const a = `${ADRES_PLANU}?zegarek=1&avg=&max=&kcal=`;
      try { await navigator.clipboard.writeText(a); kopiuj.textContent = 'Skopiowane ✓'; } catch { kopiuj.textContent = a; }
    });
    inst.append(kopiuj);
    t5.append(inst);
    const rz = el('div', 'kbtn');
    rz.append(miniBtn(state.skrot ? 'Uruchamiam po „Zakończ" ✓' : 'Uruchamiaj po „Zakończ"', () => { state.skrot = !state.skrot; save(); render(); }));
    t5.append(rz);
    return t5;
  }
}

function stravaCard() {
  const box = el('div', 'card');
  box.append(el('h3', null, stravaPolaczona() ? 'Strava — tętno i kalorie' : 'Tętno automatycznie — dla chętnych'));
  if (!stravaPolaczona()) {
    box.append(el('p', null, 'Nie jest potrzebne: trzy liczby z zegarka wpisujesz po „Zakończ". Jeśli kiedyś zechcesz, żeby przychodziły same, są dwie drogi — każda wymaga jednorazowej konfiguracji.'));
    if (IOS) box.append(skrotSekcja());
    const zw = el('details', 'skrot');
    zw.append(el('summary', null, 'Strava (API wymaga subskrypcji Stravy)'));
    zw.append(stravaFormularz());
    box.append(zw);
    return box;
  }
  if (stravaPolaczona()) {
    const r = el('div', 'e1row');
    r.append(el('div', 'n', 'Połączono' + (strava.kto ? ': ' + strava.kto : '')));
    r.append(el('div', 'syncst ok', 'działa'));
    box.append(r);
    box.append(el('p', null, 'Po „Zakończ" plan sam znajdzie w Stravie trening z zegarka i dopisze średnie i maksymalne tętno oraz kalorie. Trening na zegarku zakończ przed „Zakończ" w planie.'));
    const rz = el('div', 'kbtn');
    const info = el('p', 'stinfo', '');
    rz.append(miniBtn('Pobierz dla ostatniego treningu', async () => {
      const ost = Object.entries(state.treningi).filter(([, t]) => t && t.end).sort((a, b) => new Date(b[1].end) - new Date(a[1].end))[0];
      if (!ost) { info.textContent = 'Nie ma jeszcze zakończonego treningu.'; return; }
      const [w, day] = ost[0].split('|');
      info.textContent = 'Szukam w Stravie…';
      try {
        const x = await pobierzZeStravy(day, +w);
        info.textContent = x.stan === 'ok' ? `Dopisane z: ${x.nazwa}.` : x.stan === 'bez-tetna' ? `Znaleziony „${x.nazwa}", ale bez tętna.` : 'W Stravie nie ma jeszcze tego treningu.';
      } catch (e) { info.textContent = e.message; }
    }));
    if (IOS && !JAKO_APKA()) {
      rz.append(miniBtn('Skopiuj kod połączenia', async () => {
        try { await navigator.clipboard.writeText(kodPolaczenia()); info.textContent = 'Skopiowane. Wklej go w aplikacji Plan 12 (ikona na ekranie) → Dziennik → Strava.'; }
        catch { info.textContent = kodPolaczenia(); }
      }));
    }
    rz.append(miniBtn('Rozłącz', () => { strava = {}; zapiszStrava(); render(); }));
    box.append(rz, info);
    return box;
  }

  return box;
}

function stravaFormularz() {
  const box = el('div');
  const ol = el('ol', 'stkroki');
  const li = (html) => { const l = el('li'); l.innerHTML = html; ol.append(l); };
  li('Huawei Health → Me → Privacy management → Data sharing and authorization → <b>Strava</b>: połączone. ✓');
  li('Otwórz <a href="https://www.strava.com/settings/api" target="_blank" rel="noopener">strava.com/settings/api</a> (zaloguj się w przeglądarce) i utwórz aplikację:<br>'
    + '<b>Application Name</b>: Plan 12 · <b>Category</b>: Training · <b>Website</b>: <code>' + esc(ADRES_PLANU) + '</code> · '
    + '<b>Authorization Callback Domain</b>: <code>' + esc(ADRES_PLANU.split('/')[2]) + '</code>. Jeśli poprosi o ikonę, wgraj dowolny obrazek.');
  li('Z tej strony przepisz <b>Client ID</b> i <b>Client Secret</b> (przycisk „show") tutaj:');
  box.append(ol);
  const pola = el('div', 'stpola');
  const pole = (id, lab, v, typ) => {
    const l = el('label', 'stpole');
    const i = el('input'); i.id = id; i.type = typ || 'text'; i.value = v || ''; i.autocomplete = 'off'; i.spellcheck = false;
    l.append(el('span', null, lab), i); pola.append(l); return i;
  };
  const id = pole('strava-id', 'Client ID', strava.clientId, 'text');
  id.setAttribute('inputmode', 'numeric');
  const sec = pole('strava-secret', 'Client Secret', strava.clientSecret, 'password');
  box.append(pola);
  const info = el('p', 'stinfo', '');
  const b = el('button', 'btn primary', 'Połącz ze Stravą');
  b.onclick = () => {
    const ci = id.value.trim(), cs = sec.value.trim();
    if (!/^\d+$/.test(ci) || cs.length < 20) { info.textContent = 'Client ID to same cyfry, a Client Secret ma około 40 znaków.'; return; }
    strava = { clientId: ci, clientSecret: cs };
    zapiszStrava();
    polaczStrave();
  };
  box.append(b, info);
  box.append(el('p', 'stnota', 'Klucze zostają tylko na tym telefonie — nie trafiają do bazy, synchronizacji ani kopii zapasowej.'));

  const kod = el('details', 'skrot');
  kod.append(el('summary', null, 'Mam kod połączenia z Safari'));
  const ta = el('input'); ta.id = 'strava-kod'; ta.type = 'text'; ta.placeholder = 'wklej kod'; ta.className = 'keyinput';
  const wk = miniBtn('Wklej i połącz', () => {
    try { wklejKodPolaczenia(ta.value); render(); } catch (e) { info.textContent = e.message; }
  });
  kod.append(ta, wk);
  box.append(kod);
  return box;
}

/* ---------- tydzień w pierścieniach, zaliczenie, karta do udostępnienia ---------- */
const SESJE = ['A', 'B', 'C', 'D'];
const SKROT_DNIA = { A: 'Pn', B: 'Śr', C: 'Pt', D: 'Nd' };

function postepSesji(k, w) {
  const pg = daneSesji(k, w).progress;
  return { ...pg, ile: pg.total ? Math.min(1, pg.done / pg.total) : 0 };
}

// Tonaż całego tygodnia (A, B, C) — joga nie ma kilogramów.
const tonazTygodnia = w => ['A', 'B', 'C'].reduce((a, d) => a + tonazDnia(w, d).ton, 0);
const tydzienZaliczony = w => ['A', 'B', 'C'].every(d => sesjaKompletna(d, w));

// Ile tygodni z rzędu ma komplet trzech sesji z ciężarem, licząc wstecz od
// bieżącego (bieżący wlicza się dopiero, gdy jest pełny — inaczej seria
// spadałaby do zera w każdy poniedziałek).
function seriaTygodni(w = state.week) {
  let n = 0;
  for (let i = tydzienZaliczony(w) ? w : w - 1; i >= 1 && tydzienZaliczony(i); i--) n++;
  return n;
}
const fmtTys = n => Math.round(n).toLocaleString('pl-PL');

// Cztery koncentryczne pierścienie: zewnętrzny A, wewnętrzny D. Tor to ta sama
// barwa na ~22%, łuk startuje z godziny dwunastej.
function pierscienieSvg(w, size = 148, grub = 12, odstep = 4) {
  const c = size / 2;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Postęp sesji w tygodniu ${w}">`;
  SESJE.forEach((k, i) => {
    const r = c - grub / 2 - i * (grub + odstep);
    const C = 2 * Math.PI * r, ile = postepSesji(k, w).ile;
    out += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${DAY_HEX[k]}" stroke-opacity=".22" stroke-width="${grub}"/>`;
    if (ile > 0) out += `<circle class="pr" style="--c:${C.toFixed(1)}" cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${DAY_HEX[k]}" stroke-width="${grub}" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - ile)).toFixed(1)}" transform="rotate(-90 ${c} ${c})"/>`;
  });
  return out + '</svg>';
}
const DAY_HEX = { A: '#3987e5', B: '#199e70', C: '#d95926', D: '#7C5CD6' };

function panelTygodnia(w) {
  const box = el('section', 'panel');
  const ringi = el('div', 'pring');
  ringi.innerHTML = pierscienieSvg(w);
  const zrob = SESJE.filter(k => postepSesji(k, w).ile >= 1).length;
  const srodek = el('div', 'pmid');
  srodek.append(el('b', null, zrob + '/4'), el('span', null, 'sesje'));
  ringi.append(srodek);
  box.append(ringi);

  const leg = el('div', 'pleg');
  for (const k of SESJE) {
    const pg = postepSesji(k, w);
    const r = el('button', 'plr' + (pg.ile >= 1 ? ' ok' : ''));
    r.style.setProperty('--tc', DAY_HEX[k]);
    const nazwa = k === 'D' ? 'Joga' : tytulDnia(state.plan.days[k].title).split(' · ')[0];
    r.append(el('i'), el('span', 'pln', `${SKROT_DNIA[k]} · ${nazwa}`),
      el('span', 'plv', pg.ile >= 1 ? '✓' : pg.total ? Math.round(pg.ile * 100) + '%' : '—'));
    r.onclick = () => go(trasaDnia(k));
    leg.append(r);
  }
  box.append(leg);

  const dol = el('div', 'pdol');
  const seria = seriaTygodni(w);
  const kafel = (v, u, l) => { const d = el('div', 'pk'); const b = el('b', null, v); if (u) b.append(el('u', null, u)); d.append(b, el('span', null, l)); return d; };
  const ton = tonazTygodnia(w);
  const tv = kafel(fmtTys(ton), 'kg', 'tonaż tygodnia');
  tv.querySelector('b').dataset.cnt = Math.round(ton); tv.querySelector('b').dataset.krok = 1; tv.querySelector('b').dataset.tys = 1;
  dol.append(tv, kafel(String(seria), null, odmiana(seria, 'tydzień z rzędu', 'tygodnie z rzędu', 'tygodni z rzędu')),
    kafel(`${w}/12`, null, 'tydzień cyklu'));
  box.append(dol);
  return box;
}

/* Zaliczenie sesji: jeden moment na cały trening, kiedy aplikacja mówi
   „zrobione" głośno — i daje od razu kartę do pokazania. */
function statySesji(day, w) {
  if (day === 'D') {
    const pg = postepSesji('D', w);
    return { big: `${pg.done}/${pg.total}`, bigU: '', bigL: 'pozycji jogi', serie: null, glowny: `~${state.plan.mobility.minutes} min mobilności`, ...czasITetno(day, w) };
  }
  const t = tonazDnia(w, day), pg = postepDnia(w, day);
  let glowny = `${state.plan.days[day].items.length} ćwiczeń`;
  const lift = MAIN_OF[day];
  if (lift) {
    const it = state.plan.days[day].items.find(x => x.name === MAIN[lift].name);
    const rows = logGet(w, day, it.n);
    glowny = LIFTS.find(x => x.key === lift).full + ' · ' + (opisWykonania(rows) || resolve(it.scheme, w));
  }
  return { big: t.ton ? fmtTys(t.ton) : String(pg.done), bigU: t.ton ? 'kg' : '', bigL: t.ton ? 'tonaż sesji' : 'serii', serie: `${pg.done}/${pg.total}`, glowny, ...czasITetno(day, w) };
}
function czasITetno(day, w) {
  const t = trening(w, day);
  const out = {};
  if (t && t.start && t.end) out.czas = fmtMin(czasTreningu(t));
  if (t && t.hr && (t.hr.n || t.hr.avg)) { out.hrAvg = t.hr.avg || Math.round(t.hr.sum / t.hr.n); out.hrMax = t.hr.max || null; }
  if (t && t.kcal) out.kcal = t.kcal;
  return out;
}

function pokazZaliczenie(day, w, komunikat) {
  if (!document.body || !document.body.appendChild) return;
  const stare = document.querySelector('.zal');
  if (stare && stare.remove) stare.remove();
  const st = statySesji(day, w);
  const z = el('div', 'zal');
  z.style.setProperty('--tc', DAY_HEX[day]);
  const karta = el('div', 'zkarta');
  const znak = el('div', 'zcheck');
  znak.innerHTML = '<svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-15"/></svg>';
  karta.append(znak);
  karta.append(el('div', 'zeye', `Tydzień ${w} · ${nazwaSesji(day)}`));
  const pelna = sesjaKompletna(day, w);
  karta.append(el('h2', 'zt', pelna ? (day === 'D' ? 'Joga zaliczona' : 'Sesja zaliczona') : 'Trening zakończony'));
  const big = el('div', 'zbig', st.big);
  if (st.bigU) big.append(el('u', null, st.bigU));
  karta.append(big, el('div', 'zbl', st.bigL));
  karta.append(el('div', 'zgl', st.glowny));
  if (st.czas || st.hrAvg || st.kcal) {
    const zs = el('div', 'zstat');
    if (st.czas) zs.append(el('span', null, '⏱ ' + st.czas));
    if (st.hrAvg) zs.append(el('span', null, `♥ śr. ${st.hrAvg}${st.hrMax ? ' · max ' + st.hrMax : ''} bpm`));
    if (st.kcal) zs.append(el('span', null, `🔥 ${st.kcal} kcal`));
    karta.append(zs);
  }
  // Tętna nie ma z Bluetooth (iPhone), więc prosimy o trzy liczby z ekranu
  // podsumowania na zegarku. Wszystkie opcjonalne.
  if (komunikat) karta.append(el('div', 'zkom', komunikat));
  const tr = trening(w, day);
  if (tr && tr.end && !(tr.hr && tr.hr.n)) {
    if (stravaPolaczona()) {
      const st2 = el('div', 'zkom szary');
      st2.id = 'zstrava';
      st2.textContent = czekanieStrava[trnKey(w, day)] ? 'Szukam treningu w Stravie…' : 'Tętno i kalorie pobiorę ze Stravy.';
      const sk = el('button', 'btn zskrot', 'Pobierz ze Stravy teraz');
      sk.onclick = async () => {
        st2.textContent = 'Szukam w Stravie…';
        try {
          const r = await pobierzZeStravy(day, w);
          if (r.stan === 'ok' || r.stan === 'bez-tetna') pokazZaliczenie(day, w, r.stan === 'ok' ? 'Tętno i kalorie ze Stravy dopisane.' : 'Trening w Stravie nie ma tętna — dopisane kalorie.');
          else st2.textContent = 'Jeszcze go tam nie ma. Otwórz Huawei Health, poczekaj minutę i spróbuj znowu.';
        } catch (e) { st2.textContent = e.message; }
      };
      karta.append(st2, sk);
    } else if (IOS && state.skrot) {
      const sk = el('button', 'btn zskrot', 'Pobierz tętno z aplikacji Zdrowie');
      sk.onclick = () => uruchomSkrot(day, w);
      karta.append(sk);
    }
    const f = el('form', 'zzeg');
    f.append(el('div', 'zzt', st.hrAvg ? 'Popraw dane z zegarka' : 'Dane z zegarka (opcjonalnie)'));
    const pole = (id, lab, v) => {
      const l = el('label', 'zpole');
      const i = el('input'); i.id = 'zz-' + id; i.type = 'text'; i.setAttribute('inputmode', 'numeric'); i.placeholder = '—';
      if (v) i.value = v;
      l.append(el('span', null, lab), i);
      f.append(l);
      return i;
    };
    const a = pole('avg', 'śr. tętno', st.hrAvg), m = pole('max', 'maks.', st.hrMax), k = pole('kcal', 'kcal', st.kcal);
    const ok = el('button', 'zzok', 'Zapisz');
    ok.type = 'submit';
    f.append(ok);
    f.onsubmit = e => { e.preventDefault(); zapiszZZegarka(day, w, { avg: a.value, max: m.value, kcal: k.value }); pokazZaliczenie(day, w); };
    karta.append(f);
  }
  const ringi = el('div', 'zring');
  ringi.innerHTML = pierscienieSvg(w, 96, 8, 3);
  const seria = seriaTygodni(w);
  const opis = el('div', 'zro');
  opis.append(el('b', null, SESJE.filter(k => postepSesji(k, w).ile >= 1).length + '/4 sesje tygodnia'),
    el('span', null, seria ? `${seria} ${odmiana(seria, 'tydzień', 'tygodnie', 'tygodni')} z kompletem z rzędu` : 'Komplet A, B i C zaczyna serię tygodni'));
  const rz = el('div', 'zrow'); rz.append(ringi, opis);
  karta.append(rz);
  const dziel = el('button', 'btn primary', 'Udostępnij na story');
  const info = el('div', 'zinfo');
  dziel.onclick = async () => { dziel.disabled = true; info.textContent = await udostepnij(day, w); dziel.disabled = false; };
  const zamknij = el('button', 'btn ghost', 'Zamknij');
  zamknij.onclick = () => z.remove();
  karta.append(dziel, info, zamknij);
  z.append(karta);
  z.onclick = e => { if (e.target === z) z.remove(); };
  document.body.appendChild(z);
  if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
}

/* Karta na story, 1080 × 1920, rysowana na płótnie z danych sesji. */
async function kartaStory(day, w) {
  const W = 1080, H = 1920, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  try { await document.fonts.load('900 100px Archivo'); await document.fonts.load('700 40px Archivo'); } catch { /* bez fontu też narysujemy */ }
  const kol = DAY_HEX[day], st = statySesji(day, w);
  const D = "'Archivo','Arial Narrow',sans-serif", S = "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif";
  // Zwężenie trzeba ustawiać po każdym `font` — przypisanie kroju je zeruje.
  const F = (css, waski) => { g.font = css; if ('fontStretch' in g) g.fontStretch = waski === false ? 'normal' : 'condensed'; };
  // Tekst dopasowany do szerokości: zmniejszamy stopień, aż się zmieści.
  const zmiesc = (tekst, waga, px, max) => { for (; px > 20; px -= 4) { F(`${waga} ${px}px ${D}`); if (g.measureText(tekst).width <= max) break; } return px; };

  g.fillStyle = '#0B0C0E'; g.fillRect(0, 0, W, H);
  const blask = (x, y, r, c, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c + a); gr.addColorStop(1, c + '00'); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
  blask(W * .9, H * .12, 1000, kol, 'aa');
  blask(W * .05, H * .95, 900, kol, '44');

  // litera dnia w tle, jak numer na koszulce
  g.fillStyle = 'rgba(255,255,255,.05)'; F(`900 1100px ${D}`); g.textBaseline = 'alphabetic';
  g.fillText(day, 420, 1250);

  g.fillStyle = 'rgba(255,255,255,.72)'; F(`700 38px ${D}`);
  g.fillText('PLAN 12 TYGODNI', 90, 160);
  const d = new Date(), data = `${d.getDate()} ${MIESIAC[d.getMonth()]}`;
  g.textAlign = 'right'; g.fillText(data.toUpperCase(), W - 90, 160); g.textAlign = 'left';

  g.fillStyle = kol; g.beginPath(); g.roundRect ? g.roundRect(90, 250, 110, 110, 28) : g.rect(90, 250, 110, 110); g.fill();
  g.fillStyle = '#fff'; F(`900 72px ${D}`); g.textAlign = 'center'; g.fillText(day, 145, 332); g.textAlign = 'left';
  const tytul = day === 'D' ? 'Joga' : tytulDnia(state.plan.days[day].title);
  F(`900 110px ${D}`); g.fillText(tytul.split(' · ')[0], 230, 336);
  g.fillStyle = 'rgba(255,255,255,.7)'; F(`500 40px ${S}`, false);
  g.fillText((tytul.split(' · ')[1] || (day === 'D' ? 'mobilność pod boje' : '')), 90, 430);

  g.fillStyle = '#fff';
  F(`700 90px ${D}`); const szerU = st.bigU ? g.measureText(st.bigU).width + 24 : 0;
  zmiesc(st.big, 900, 400, W - 170 - szerU);
  g.fillText(st.big, 80, 840);
  if (st.bigU) { const x = 80 + g.measureText(st.big).width + 20; F(`700 90px ${D}`); g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(st.bigU, x, 840); }
  g.fillStyle = 'rgba(255,255,255,.6)'; F(`700 42px ${D}`); g.fillText(st.bigL.toUpperCase(), 90, 905);

  g.fillStyle = 'rgba(255,255,255,.9)'; F(`600 44px ${S}`, false);
  const zawijaj = (t, x, y, max, lh) => { let l = ''; for (const s of t.split(' ')) { if (g.measureText(l + s).width > max && l) { g.fillText(l.trim(), x, y); y += lh; l = ''; } l += s + ' '; } g.fillText(l.trim(), x, y); return y; };
  let yg = zawijaj(st.glowny, 90, 1000, W - 180, 58);
  if (st.hrAvg || st.kcal) {
    g.fillStyle = 'rgba(255,255,255,.7)'; F(`600 40px ${S}`, false); yg += 64;
    g.fillText([st.hrAvg ? `♥ śr. ${st.hrAvg}${st.hrMax ? ' · max ' + st.hrMax : ''} bpm` : '', st.kcal ? `${st.kcal} kcal` : ''].filter(Boolean).join('   ·   '), 90, yg);
  }

  // trzy liczby w rzędzie
  const kafle = [[st.serie || '—', 'serie'], st.czas ? [st.czas.replace(' min', '′'), 'czas'] : [`${w}/12`, 'tydzień cyklu'], [String(seriaTygodni(w)), 'tyg. z rzędu']];
  kafle.forEach(([v, l], i) => {
    const x = 90 + i * 310, y = Math.max(yg + 110, 1120);
    g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.roundRect ? g.roundRect(x, y, 280, 190, 36) : g.rect(x, y, 280, 190); g.fill();
    g.fillStyle = '#fff'; zmiesc(v, 900, 104, 220); g.fillText(v, x + 34, y + 112);
    g.fillStyle = 'rgba(255,255,255,.6)'; F(`600 30px ${S}`, false); g.fillText(l, x + 36, y + 160);
  });

  // pierścienie tygodnia
  const img = new Image();
  const svg = pierscienieSvg(w, 300, 26, 9);
  await new Promise(res => { img.onload = res; img.onerror = res; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  const ry = 1440;
  try { g.drawImage(img, 90, ry, 300, 300); } catch { /* bez pierścieni */ }
  SESJE.forEach((k, i) => {
    const pg = postepSesji(k, w), y = ry + 62 + i * 64;
    g.fillStyle = DAY_HEX[k]; g.beginPath(); g.arc(462, y - 14, 14, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; F(`700 44px ${D}`); g.fillText(`${SKROT_DNIA[k]} · ${k === 'D' ? 'Joga' : tytulDnia(state.plan.days[k].title).split(' · ')[0]}`, 496, y);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.textAlign = 'right'; g.fillText(pg.ile >= 1 ? '✓' : Math.round(pg.ile * 100) + '%', W - 90, y); g.textAlign = 'left';
  });

  return new Promise(res => cv.toBlob(res, 'image/png'));
}

async function udostepnij(day, w) {
  const blob = await kartaStory(day, w);
  if (!blob) return 'Nie udało się narysować karty.';
  const nazwa = `trening-tydz${w}-${day}.png`;
  try {
    const plik = new File([blob], nazwa, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [plik] })) {
      await navigator.share({ files: [plik] });
      return 'Udostępnione.';
    }
  } catch (e) { if (e && e.name === 'AbortError') return ''; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nazwa;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'Zapisane w pobranych — dodaj je do story z galerii.';
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
  const naGlownym = !onDay && !onMob && !['#/postep', '#/tabela', '#/raport', '#/zasady', '#/1rm', '#/ustawienia'].includes(v);
  if (naGlownym) app.append(weekBar());
  document.body.classList.toggle('w-sesji', onDay || onMob);

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
  if (v !== ostatniWidok) odliczLiczby(app);
  ostatniWidok = v;
}

window.addEventListener('hashchange', () => { state.view = location.hash || '#/'; render(); });

/* ---------- start ---------- */
fetch('plan.json?v=44')
  .then(r => r.json())
  .then(p => {
    state.plan = p;
    loadState();
    loadStores();
    // Naprawa przed pierwszym renderem: tydzień, z którego coś przeniesiono, mógł
    // się odbudować z bazy, zanim wysyłka kolejki zdążyła go tam wyzerować.
    sprzatnijPoPrzeniesieniach();
    if (!state.e1rm) state.e1rm = { ...p.e1rm };
    calc.kg = state.e1rm.bench ? round25(state.e1rm.bench * 0.85) : 100;
    // Zimny start bez hasha: wchodzimy prosto w niedokończoną sesję. Wejście
    // z linkiem albo z zakładki ma pierwszeństwo — wtedy wiadomo, czego ktoś chciał.
    const start = state.autoDzis ? domyslnaSesja() : null;
    if (!location.hash && start) {
      state.view = trasaDnia(start);
      history.replaceState(null, '', state.view);
    }
    render();
    const zAdresu = new URLSearchParams(location.search);
    const zeStravy = zAdresu.get('state') === 'plan12';
    if (zeStravy) {
      history.replaceState(null, '', location.pathname + '#/ustawienia');
      state.view = '#/ustawienia';
      przyjmijStrave(zAdresu).then(r => {
        render();
        const n = document.createElement('div');
        n.className = 'toast' + (r && r.blad ? ' zle' : '');
        n.textContent = r && r.blad ? r.blad : IOS && !JAKO_APKA()
          ? 'Strava połączona w Safari. Jeśli plan masz na ekranie początkowym: Skopiuj kod połączenia i wklej go tam.'
          : 'Strava połączona. Tętno i kalorie będą przychodzić same.';
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 9000);
      });
    }
    pullStan().then(() => {
      przeliczPlan();
      const dane = przyjmijZZegarka(zAdresu);
      if (dane) {
        history.replaceState(null, '', location.pathname + trasaDnia(dane.day) + '/' + dane.w);
        state.view = trasaDnia(dane.day) + '/' + dane.w;
      }
      render();
      if (dane) pokazZaliczenie(dane.day, dane.w, dane.pusto
        ? 'Skrót zadziałał, ale Zdrowie nie oddało tętna z tego okresu. Sprawdź dostęp: Settings → Health → Data Access & Devices → Shortcuts → Heart Rate.'
        : IOS && !JAKO_APKA()
          ? 'Tętno ze Zdrowia zapisane. Wróć do aplikacji Plan 12 — pojawi się tam po chwili.'
          : 'Tętno ze Zdrowia zapisane.');
      pullAll(); flushQueue();
      dociagnijZeStravy();
    });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  })
  .catch(() => {
    $('#app').innerHTML = '<div class="note"><b>Nie udało się wczytać plan.json.</b> Otwórz stronę przez serwer (nie z pliku), np. <code>python -m http.server 8080</code>.</div>';
  });
