// Konwersja plan-12-tygodni.xlsx -> plan.json
//
// Do plan.json trafia WYLACZNIE tresc treningowa. Kontekst zdrowotny zostaje w skoroszycie.
// SENSITIVE to bezpiecznik: jesli cokolwiek z tej listy przeciekloby do wyniku, skrypt
// przerywa prace zamiast po cichu opublikowac to na GitHub Pages.
//
//   node tools/xlsx-to-json.mjs [sciezka-do-xlsx]

import fs from 'node:fs';
import path from 'node:path';
import { readWorkbook } from './xlsx.mjs';

const SRC = process.argv[2] || path.join(process.env.USERPROFILE || '', 'Desktop', 'plan-12-tygodni.xlsx');
const OUT = path.join(process.cwd(), 'plan.json');

// Slowa opisujace stan zdrowia, historie i diagnostyke. Nazwy czesci ciala (kolano,
// biodro, ledzwie) sa dozwolone - bez nich nie da sie opisac techniki cwiczenia.
const SENSITIVE = /skolioz|cobb|przodopochyl|ból|bólu|boles|dolegliw|rehabilit|fizjoterapeu|ortoped|RTG|MRI|diagnoz|leczen|chorob|kontuzj|uraz|skręc|tendinop|patolog|obrzęk|wysięk|drętwi|mrowie|przeciwbólow|specjalist|zwyrodnien|nawrot/i;

const wb = readWorkbook(SRC);
const S = (name) => {
  if (!wb[name]) throw new Error('Brak arkusza: ' + name);
  return wb[name];
};
const num = v => (v === undefined || v === '' ? null : Number(v));

/* ---------- Start: E1RM ---------- */
const start = S('Start');
const e1rm = { front: num(start.F10), dl: num(start.F11), bench: num(start.F12) };
for (const [k, v] of Object.entries(e1rm)) if (!v) throw new Error('Brak E1RM dla: ' + k);

/* ---------- Ciezary: dwie tabele tygodni ---------- */
const cw = S('Ciężary');
const lower = [];
for (let r = 6; r <= 17; r++) {
  lower.push({
    week: num(cw['A' + r]),
    block: cw['B' + r],
    scheme: cw['C' + r],
    pct: num(cw['D' + r]),
    dlAdj: num(cw['E' + r]) || 0,
    rpe: num(cw['F' + r]),
    barHeight: cw['I' + r],
  });
}
const upper = [];
for (let r = 22; r <= 33; r++) {
  const pct = cw['D' + r];
  upper.push({
    week: num(cw['A' + r]),
    block: cw['B' + r],
    scheme: cw['C' + r],
    pct: pct === '—' ? null : num(pct),
    rpe: num(cw['E' + r]),
    benchText: pct === '—' ? cw['F' + r] : null, // tydzien 12: dojscie zamiast kilogramow
    pullup: cw['G' + r],
  });
}
if (lower.length !== 12 || upper.length !== 12) throw new Error('Tabela tygodni nie ma 12 wierszy');

/* ---------- Dni A / B / C ---------- */
// Formuly INDEX/MATCH podmieniamy na symboliczne odwolania - app.js liczy je sam.
const REF = {
  'Ciężary!$C$22:$C$33': 'upper.scheme',
  'Ciężary!$E$22:$E$33': 'upper.rpe',
  'Ciężary!$F$22:$F$33': 'bench.kg',
  'Ciężary!$G$22:$G$33': 'upper.pullup',
  'Ciężary!$C$6:$C$17': 'lower.scheme',
  'Ciężary!$F$6:$F$17': 'lower.rpe',
  'Ciężary!$G$6:$G$17': 'front.kg',
  'Ciężary!$H$6:$H$17': 'dl.kg',
};
const cell = (raw) => {
  if (raw === undefined || raw === '') return null;
  if (!raw.startsWith('=')) return raw;
  const hit = Object.keys(REF).find(k => raw.includes(k));
  if (!hit) throw new Error('Nieznana formula: ' + raw.slice(0, 80));
  return { ref: REF[hit] };
};

// Przepisane opisy - miejsca, w ktorych arkusz tlumaczy PO CO cwiczenie.
// W aplikacji zostaje samo JAK.
const NOTES = {
  'Face pull z gumą':
    'Guma na wysokości twarzy, łokcie wysoko, ciągniesz do czoła z rotacją zewnętrzną. Przeciwwaga dla objętości pchania. ~5 min.',
  'Przysiad hiszpański (izometria)':
    'Przerwa 60 s. Piszczele pionowo, tułów pionowo. Trudniej = głębiej albo hantel przy klatce.',
  'B1  Ewersja stopy z gumą (siedząc)':
    'SUPERSERIA z B2 — 60 s po parze. Guma wokół śródstopia, drugi koniec zaczepiony po WEWNĘTRZNEJ stronie. Odchylasz stopę na zewnątrz, wracasz WOLNO (3 s). ~7 min na obie.',
  'B2  Stanie na jednej nodze — oczy zamknięte':
    'SUPERSERIA z B1. Boso, przy ścianie na wypadek utraty równowagi. Postęp: poduszka lub złożony ręcznik pod stopą. Trening równowagi i czucia ułożenia stopy.',
  'Deska bokiem':
    'Biodra wysoko, ciało w jednej linii, łokieć pod barkiem. Wytrzymałość bocznego łańcucha tułowia. ~6 min.',
  'A2  Zgięcie grzbietowe na maszynie (piszczelowy przedni)':
    'SUPERSERIA z A1. Pełny zakres, powrót WOLNO (3 s). Trenuje przednią stronę podudzia — przeciwwaga dla wspięć.',
  'Knee-to-wall — mobilizacja zgięcia grzbietowego stopy':
    'Stopa przed ścianą, kolano jedzie do ściany po linii drugiego palca, PIĘTA NIE ODRYWA SIĘ. Rób po rowerze, nie na zimno; tempo 2 s w dół. Raz w tygodniu zmierz odległość palców od ściany. ~4 min.',
};

const NO_CUT = new Set([
  'Wyciskanie leżąc', 'Podciąganie', 'Front squat', 'Martwy ciąg z podwyższenia',
  'Przysiad hiszpański (izometria)', 'Przysiad bułgarski z hantlami',
]);

const DAY_META = [
  { key: 'A', sheet: 'Dzień A', title: 'GÓRA', day: 'Poniedziałek', from: 7, to: 13 },
  { key: 'B', sheet: 'Dzień B', title: 'DÓŁ · kontrola i stabilizacja', day: 'Środa', from: 7, to: 17 },
  { key: 'C', sheet: 'Dzień C', title: 'DÓŁ · boje', day: 'Piątek', from: 7, to: 11 },
];

const days = {};
for (const m of DAY_META) {
  const sh = S(m.sheet);
  const time = ((sh.A1 || '').match(/ok\.\s*(\d+)\s*min/) || [])[1];
  const items = [];
  for (let r = m.from; r <= m.to; r++) {
    const raw = sh['B' + r];
    if (!raw) continue;
    const ss = (raw.match(/^([AB][12])\s+/) || [])[1] || null;
    const name = raw.replace(/^[AB][12]\s+/, '').trim();
    items.push({
      n: num(sh['A' + r]),
      name,
      superset: ss,
      scheme: cell(sh['C' + r]),
      load: cell(sh['D' + r]),
      rpe: cell(sh['E' + r]),
      note: NOTES[raw] !== undefined ? NOTES[raw] : (sh['F' + r] || ''),
      noCut: NO_CUT.has(name),
    });
  }
  days[m.key] = { key: m.key, title: m.title, day: m.day, minutes: time ? +time : null, items };
}

/* ---------- Rozgrzewka ---------- */
const wu = S('Rozgrzewka');
// Te same przepisania co w NOTES, tylko dla arkusza Rozgrzewka.
const WU_NOTES = {
  'Przysiady z masą ciała': 'Do połowy zakresu, spokojnie.',
};
const readBlock = (from, to) => {
  const out = [];
  for (let r = from; r <= to; r++) {
    const what = wu['B' + r];
    if (!what || /^BEZ /.test(what)) continue;
    const note = wu['D' + r] || '';
    out.push({ what, dose: wu['C' + r] || '', note: SENSITIVE.test(note) ? (WU_NOTES[what] || '') : note });
  }
  return out;
};
const warmup = {
  ramp: {
    steps: ['Gryf 2 × 8', '50% × 5', '70% × 3', '85% × 2', 'Ciężar roboczy'],
    lifts: [
      { lift: 'bench', name: 'Wyciskanie leżąc' },
      { lift: 'front', name: 'Front squat' },
      { lift: 'dl', name: 'Martwy ciąg z podwyższenia' },
    ],
  },
  notes: [wu.A12, wu.A13, wu.A14].filter(Boolean),
  days: {
    A: { label: wu.A17, steps: readBlock(18, 24) },
    B: { label: 'DZIEŃ B — kontrola i stabilizacja  ·  ~5 min', steps: readBlock(27, 31) },
    C: { label: wu.A33, steps: readBlock(34, 39) },
  },
  skip: [
    'Statycznego rozciągania przed treningiem — obniża wytwarzaną siłę na kilkadziesiąt minut. Od tego jest niedziela.',
    'Rolowania jako obowiązkowego punktu — daje chwilową ulgę, ale nie zmienia niczego trwale. Jeśli lubisz, rób, tylko nie zamiast reszty.',
    'Krążeń bioder i pracy w końcowych zakresach.',
  ],
};
warmup.days.B.steps.push({ what: 'BEZ krążeń bioder i szukania końcowych zakresów', dose: '', note: '' });

/* ---------- Niedziela: mobilnosc ---------- */
// Ten blok nie pochodzi ze skoroszytu — arkusz go nie ma. Trzymamy go w osobnym
// pliku, zeby ponowna konwersja XLSX nie skasowala niedzieli z planu. Bezpiecznik
// SENSITIVE i tak przejdzie po nim razem z reszta wyniku.
const MOB = path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), 'niedziela.json');
const mobility = JSON.parse(fs.readFileSync(MOB, 'utf8'));

/* ---------- Zasady: wybrane bloki, filtrowane linia po linii ---------- */
const zs = S('Zasady');
const zLines = [];
for (let r = 1; r <= 210; r++) if (zs['B' + r]) zLines.push({ r, t: zs['B' + r] });
const blockAfter = (heading, span) => {
  const i = zLines.findIndex(l => l.t.trim() === heading);
  if (i < 0) throw new Error('Brak naglowka w arkuszu Zasady: ' + heading);
  const from = zLines[i].r + 1;
  return zLines.filter(l => l.r >= from && l.r < from + span).map(l => l.t).filter(t => !SENSITIVE.test(t));
};
// Bloki, w ktorych filtr usunalby srodek zdania albo polowe listy, sa napisane wprost.
// Reszta idzie prosto z arkusza.
const rules = [
  {
    heading: 'Układ tygodnia',
    lines: [
      'Poniedziałek — Dzień A: GÓRA (wyciskanie i podciąganie jako boje główne)',
      'Wtorek — wolne',
      'Środa — Dzień B: DÓŁ, kontrola i stabilizacja (bez sztangi, bez obciążenia osiowego)',
      'Czwartek — wolne',
      'Piątek — Dzień C: DÓŁ (front squat + ciąg)',
      'Sobota — wolne · Niedziela — mobilność (~' + mobility.minutes + ' min, bez obciążenia)',
      'Ciężki dzień dolny wypada w piątek, więc ma pełny weekend na regenerację, a środa trafia dokładnie w środek między nim a kolejnym.',
    ],
  },
  { heading: 'Czas trwania', lines: (l => (l.splice(1, 0,
      'Niedziela ~' + mobility.minutes + ' min, bez obciążenia — nie liczy się do objętości treningowej.'), l))(blockAfter('Czas trwania', 7)) },
  {
    heading: 'Dwa reżimy w jednym planie',
    lines: [
      'DÓŁ (front squat, martwy ciąg) — sufit 72,5% E1RM, sufit RPE 7, bez testu maksa.',
      'GÓRA (wyciskanie, podciąganie) — normalna progresja siłowa do 90% i test 1RM w tygodniu 12.',
      'Sufit RPE jest nadrzędny wobec procentów: jeśli ciężar z tabeli wychodzi ciężej niż sufit, zdejmujesz z gryfu.',
    ],
  },
  {
    heading: 'Rekalibracja ciężarów',
    lines: [
      'DÓŁ — po tygodniu 3 i po tygodniu 7: jeśli KAŻDA sesja zmieściła się w suficie RPE, podnieś E1RM front squata i ciągu o 10%. Choć raz nie — bez zmian.',
      'GÓRA — E1RM policzone z aktualnej serii, więc nie wymaga korekty. Zmieniasz tylko wtedy, gdy tydzień 1 wyraźnie mija się z sufitem RPE.',
      'Nigdy więcej niż 10% naraz. Zbyt lekki start kosztuje trzy tygodnie, zbyt ciężki kosztuje cykl.',
      'Przycisk +10% jest przy każdym E1RM na dole ekranu głównego.',
    ],
  },
  { heading: 'Reguła zaokrągleń', lines: blockAfter('Reguła zaokrągleń', 2) },
  { heading: 'Progresja ćwiczeń dodatkowych', lines: blockAfter('Progresja ćwiczeń dodatkowych — podwójna', 2) },
  { heading: 'Zasada złego dnia', lines: blockAfter('Autoregulacja — zasada złego dnia', 3) },
  {
    heading: 'Tydzień 7 — deload (nie jest opcjonalny)',
    lines: [
      'Dół: 2 × 6 przy 55% E1RM, RPE 5. Góra: 2 × 6 przy 62,5%, RPE 5.',
      'Ćwiczenia dodatkowe: 2 serie zamiast 3, ten sam ciężar.',
      'Dzień B w tygodniu deloadu: zostaw izometrię, resztę po 2 serie, superserie pomiń (~30 min).',
    ],
  },
  { heading: 'Tydzień 12, góra — test 1RM', lines: blockAfter('Wyciskanie — tydzień 12, test 1RM', 3) },
  { heading: 'Tydzień 12, dół — test kontrolny', lines: blockAfter('Tydzień 12, dół — test kontrolny, nie test maksa', 4) },
  {
    heading: 'Kiedy powtórzyć tydzień',
    lines: [
      'Tydzień podbijasz tylko wtedy, gdy KAŻDA sesja zmieściła się w suficie RPE.',
      'Jeśli nie — nie zmieniasz numeru i powtarzasz ten sam tydzień z tym samym ciężarem.',
      'Dwa razy z rzędu — cofasz się o 10% i zawężasz zakres ruchu.',
      'To nie jest opóźnienie planu. To jest plan.',
    ],
  },
];

/* ---------- Sklad ---------- */
const plan = {
  title: 'Plan 12 tygodni',
  schedule: 'pon A · śr B · pt C · nd mobilność',
  bar: 20,
  plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  e1rm,
  weeks: { lower, upper },
  days,
  warmup,
  rules,
  mobility,
};

/* ---------- Bezpiecznik ---------- */
const hits = [];
(function walk(v, p) {
  if (typeof v === 'string') { if (SENSITIVE.test(v)) hits.push(p + ': ' + v.slice(0, 130)); return; }
  if (Array.isArray(v)) return v.forEach((x, i) => walk(x, p + '[' + i + ']'));
  if (v && typeof v === 'object') return Object.entries(v).forEach(([k, x]) => walk(x, p + '.' + k));
})(plan, 'plan');
if (hits.length) {
  console.error('\nPRZERWANO — tresc wrazliwa w wyniku:\n' + hits.map(h => '  * ' + h).join('\n'));
  process.exit(1);
}

fs.writeFileSync(OUT, JSON.stringify(plan, null, 1), 'utf8');
console.log('OK  ' + OUT);
console.log('    dni: ' + Object.values(days).map(d => d.key + '=' + d.items.length).join(' ') +
  ' | tygodnie: ' + lower.length + '/' + upper.length +
  ' | niedziela: ' + mobility.blocks.reduce((a, b) => a + b.items.length, 0) + ' pozycji' +
  ' | zasady: ' + rules.length);
