/* Renderowanie wszystkich widokow bez przegladarki.  Uruchom:  node tools/test-widoki.mjs
 *
 * To nie jest pelny DOM — to tyle DOM-u, ile app.js naprawde uzywa. Wystarczy,
 * zeby wylapac to, co psulo sie tu juz kilka razy: literowke w nazwie funkcji,
 * odwolanie do pola, ktorego nie ma w plan.json, klase dodana ze spacja.
 *
 * navigator.onLine jest na stale FALSE, wiec test NIGDY nie dotyka Supabase.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let ok = 0, zle = 0;
const fmtPl = n => String(n).replace('.', ',');
const test = (nazwa, warunek, dopisek = '') => {
  if (warunek) { ok++; console.log('  OK   ' + nazwa); }
  else { zle++; console.log('  BLAD ' + nazwa + (dopisek ? '\n         ' + dopisek : '')); }
};

/* ---------- minimalny DOM ---------- */
class Klasy {
  constructor(el) { this.el = el; }
  add(...n) { for (const x of n) { if (/\s/.test(x)) throw new Error('classList.add ze spacja: ' + x); this.el._cls.add(x); } }
  remove(...n) { for (const x of n) this.el._cls.delete(x); }
  // Zwraca stan PO przelaczeniu, tak jak przegladarka — app.js na tym polega.
  toggle(n, si) { const ma = si === undefined ? !this.el._cls.has(n) : si; ma ? this.el._cls.add(n) : this.el._cls.delete(n); return ma; }
  contains(n) { return this.el._cls.has(n); }
}

class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = []; this._txt = ''; this._cls = new Set(); this._html = '';
    this.attrs = {}; this.dataset = {}; this.hidden = false; this.disabled = false;
    this.style = { setProperty(k, v) { this[k] = v; } };
    this.classList = new Klasy(this);
  }
  get className() { return [...this._cls].join(' '); }
  set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get textContent() { return this._txt + this.children.map(c => c.textContent).join(''); }
  set textContent(v) { this._txt = v == null ? '' : String(v); this.children = []; }
  set innerHTML(v) { this._html = String(v); if (!v) this.children = []; }
  get innerHTML() { return this._html; }
  append(...n) { for (const x of n) this.children.push(typeof x === 'object' ? x : txt(String(x))); }
  appendChild(n) { this.append(n); return n; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener() {}
  // Klik wywoluje handler przypisany przez .onclick, tak jak w przegladarce.
  click() { if (typeof this.onclick === 'function') this.onclick({ preventDefault() {} }); }
  querySelector(sel) { return szukaj(this, sel)[0] || null; }
  querySelectorAll(sel) { return szukaj(this, sel); }
}
const txt = t => { const e = new El('#text'); e._txt = t; return e; };

function pasuje(el, sel) {
  return sel.split(/\s*,\s*/).some(cz => cz.split(/(?=[.#])/).every(part => {
    if (part.startsWith('.')) return el._cls.has(part.slice(1));
    if (part.startsWith('#')) return el.attrs.id === part.slice(1) || el.id === part.slice(1);
    return el.tagName === part.toUpperCase();
  }));
}
function szukaj(root, sel) {
  const out = [];
  (function chodz(n) {
    for (const c of n.children) { if (c.tagName !== '#TEXT' && pasuje(c, sel)) out.push(c); chodz(c); }
  })(root);
  return out;
}

/* ---------- srodowisko ---------- */
const magazyn = new Map();
const localStorage = {
  getItem: k => (magazyn.has(k) ? magazyn.get(k) : null),
  setItem: (k, v) => magazyn.set(k, String(v)),
  removeItem: k => magazyn.delete(k),
};

const korzen = new El('body');
const app = new El('div'); app.id = 'app'; app.attrs.id = 'app';
const timer = new El('div'); timer.id = 'timer'; timer.attrs.id = 'timer';
korzen.append(app, timer);

const document = {
  createElement: t => new El(t),
  createElementNS: (ns, t) => new El(t),
  createDocumentFragment: () => new El('#fragment'),
  createTextNode: t => txt(t),
  querySelector: s => (pasuje(korzen, s) ? korzen : szukaj(korzen, s)[0] || null),
  getElementById: id => szukaj(korzen, '#' + id)[0] || null,
  querySelectorAll: s => szukaj(korzen, s),
  addEventListener() {},
  visibilityState: 'visible',
  body: korzen,
};

const planJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan.json'), 'utf8'));
const sandbox = {
  document, localStorage, console,
  location: { hash: '', search: '', href: 'http://localhost/' },
  history: { replaceState() {} },
  navigator: { onLine: false, vibrate() {} },      // offline: zero ruchu do Supabase
  window: { addEventListener() {}, scrollTo() {} },
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  crypto: { getRandomValues: a => { a.fill(7); return a; } },
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(planJson) }),
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  Date, Math, JSON, String, Number, Object, Array, Promise, Error, isNaN, parseFloat, parseInt,
  URLSearchParams,
};
sandbox.window.location = sandbox.location;
vm.createContext(sandbox);
for (const plik of ['progresja.js', 'app.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, plik), 'utf8'), sandbox, { filename: plik });
}
// `const` na szczycie skryptu ląduje w leksykalnym zasiegu kontekstu, a nie na
// obiekcie globalnym — kolejny skrypt te nazwy widzi, wiec przez niego je wynosimy.
vm.runInContext(`globalThis.API = {
  state, render, dzisiaj, najblizszaSesja, BLOKI, rekalDoWziecia, zastosujRekalibracje,
  cofnijRekalibracje, rekalibracjaCard, stanLokalny, plannedOf, logSet, judgeWeek, podsumowanieBlokow,
  postepDnia, platesEl, plateList,
  przeniesTydzien, zastosujZdalnePrzeniesienia, zawartoscTygodnia, tydzienMaDane,
  domyslnaSesja, sesjaKompletna, mobWidoczne,
  scalZdalneWiersze, sprzatnijPoPrzeniesieniach, poPrzeniesieniu, logGet,
};`, sandbox);
const A = sandbox.API;
await new Promise(r => setTimeout(r, 20));          // niech boot z fetch() dojdzie do konca

const S = A.state;
test('plan wczytany', S.plan && S.plan.title === 'Plan 12 tygodni');
test('E1RM ustawione z planu', S.e1rm && S.e1rm.bench > 0);

/* ---------- kazdy widok sie renderuje ---------- */
console.log('\nWidoki');
const WIDOKI = ['#/', '#/d/A', '#/d/B', '#/d/C', '#/mobilnosc', '#/postep', '#/tabela', '#/raport', '#/zasady', '#/1rm', '#/ustawienia'];
for (const v of WIDOKI) {
  S.view = v;
  let blad = null;
  try { A.render(); } catch (e) { blad = e.message + '\n         ' + (e.stack || '').split('\n')[1]; }
  const tresc = app.textContent;
  test(v + ' renderuje sie i ma tresc', !blad && tresc.length > 40, blad || 'dlugosc tresci: ' + tresc.length);
}

/* ---------- dzis ---------- */
console.log('\nDzis');
const DNI = { 0: 'D', 1: 'A', 3: 'B', 5: 'C', 2: null, 4: null, 6: null };
for (const [nr, oczek] of Object.entries(DNI)) {
  const realny = Date.prototype.getDay;
  Date.prototype.getDay = () => +nr;
  const wynik = A.dzisiaj();
  const naj = A.najblizszaSesja();
  Date.prototype.getDay = realny;
  test('dzien ' + nr + ' → ' + (oczek || 'wolne'), wynik === oczek, 'jest: ' + wynik);
  test('  i zna najblizsza sesje', naj && naj.key && naj.za >= 1 && naj.za <= 7);
}

/* ---------- raport blokow ---------- */
console.log('\nRaport blokow');
S.week = 4; S.view = '#/postep'; A.render();
test('w tygodniu 4 widac blok 1', app.textContent.includes('Blok 1'));
test('i blok 2 jako w toku', app.textContent.includes('Blok 2') && app.textContent.includes('w toku'));
S.week = 1; A.render();
test('w tygodniu 1 nie ma jeszcze bloku 3', !app.textContent.includes('Blok 3'));

/* ---------- rekalibracja ---------- */
console.log('\nRekalibracja');
const blok1 = A.BLOKI[0];
const dzienC = S.plan.days.C;
const front = dzienC.items.find(i => i.name === 'Front squat');
const ciag = dzienC.items.find(i => i.name === 'Martwy ciąg z podwyższenia');

S.week = 4;
test('bez dziennika nie ma podwyzki', A.rekalDoWziecia(blok1).ocena === false);

// Wpisujemy komplet powtorzen w tygodniach 1-3 dla obu bojow dolu.
for (const w of [1, 2, 3]) {
  for (const it of [front, ciag]) {
    S.week = w;
    const pl = A.plannedOf(it, w, 'C');
    for (let i = 0; i < pl.sets; i++) {
      A.logSet(w, 'C', it.n, i, { r: pl.target, kg: pl.kg, pr: pl.target, pk: pl.planKg });
    }
  }
}
S.week = 4;
const przed = { front: S.e1rm.front, dl: S.e1rm.dl };
const gotowe = A.rekalDoWziecia(blok1);
test('komplet w tygodniach 1-3 odblokowuje +10%', gotowe.ocena === true);
test('front squat ' + przed.front + ' → ' + (gotowe.zmiany && gotowe.zmiany.front.after),
  gotowe.zmiany && gotowe.zmiany.front.after === Math.floor(przed.front * 1.1 / 2.5) * 2.5);

A.zastosujRekalibracje(blok1, gotowe.zmiany);
test('po zastosowaniu E1RM rosnie', S.e1rm.front > przed.front && S.e1rm.dl > przed.dl);
test('karta znika z ekranu glownego', A.rekalibracjaCard() === null);
test('rekalibracja jedzie do synchronizacji', 'rekal' in A.stanLokalny());

A.cofnijRekalibracje(4);
test('cofniecie wraca do poprzednich ciezarow', S.e1rm.front === przed.front && S.e1rm.dl === przed.dl);
test('i nie proponuje jej drugi raz', A.rekalibracjaCard() === null);

/* ---------- odchudzanie ---------- */
console.log('');
console.log('Odchudzanie');
S.week = 4; S.view = '#/'; A.render();
const kafle = app.querySelectorAll('.tile');
test('siedem kafli na ekranie glownym', kafle.length === 7, 'jest: ' + kafle.length);
test('nie ma juz osobnego kafla 1RM', !app.textContent.includes('Kalkulator 1RM'));
test('kalkulator dostepny z karty E1RM', app.textContent.includes('Przelicz z serii'));
S.view = '#/postep'; A.render();
test('Postep ma wykres, bloki i tabele',
  app.querySelectorAll('.chart').length + app.querySelectorAll('svg').length > 0
  && app.textContent.includes('Blok 1') && app.textContent.includes('Tabele tygodni'));
test('tonaz zniknal z widoku Postep', !app.textContent.includes('Tonaż tygodniowy'));
test('stary adres #/tabela prowadzi do Postepu', (() => { S.view = '#/tabela'; A.render(); return app.textContent.includes('Postęp'); })());
test('stary adres #/raport tez', (() => { S.view = '#/raport'; A.render(); return app.textContent.includes('Postęp'); })());

/* ---------- zapis do innego tygodnia ---------- */
console.log('');
console.log('Zapis do wczesniejszego tygodnia');
S.week = 4;
S.view = '#/d/A/2'; A.render();
test('adres #/d/A/2 renderuje sie', app.textContent.includes('Dzień A'));
test('pasek mowi, ze zapis idzie do tygodnia 2', app.textContent.includes('Zapisuję do tygodnia'));
test('i przypomina tydzien biezacy', app.textContent.includes('bieżący: 4'));
test('tydzien biezacy sie NIE zmienil', S.week === 4);
test('jest droga powrotna', app.textContent.includes('Wróć do tygodnia 4'));
S.view = '#/d/A'; A.render();
test('bez numeru w adresie pasek jest spokojny', !app.textContent.includes('Zapisuję do tygodnia'));
S.view = '#/mobilnosc/2'; A.render();
test('niedziela tez przyjmuje tydzien z adresu', app.textContent.includes('Zapisuję do tygodnia'));

/* ---------- zaladowany gryf ---------- */
console.log('');
console.log('Zaladowany gryf');
{
  // Atrapa nie parsuje innerHTML, wiec sprawdzamy wygenerowany kod SVG.
  const g = A.platesEl(107.5);
  const svg = g.querySelector('.gryf').innerHTML;
  const talerze = (svg.match(/class="talerz"/g) || []).length;
  const lista = A.plateList(107.5);
  const sztuk = lista.pairs.reduce((a, p) => a + p.n, 0) * 2;
  test('rysuje tyle talerzy, ile liczy plateList', talerze === sztuk,
    'narysowane: ' + talerze + ', policzone: ' + sztuk);
  test('ma trzon, radelko i kolnierze',
    svg.includes('class="trzon"') && svg.includes('class="radelko"') && svg.includes('class="kolnierz"'));
  test('kolory talerzy wg IPF (107,5 = 25 + 15 + 2,5 + 1,25)',
    svg.includes('#c0392b') && svg.includes('#d9b016') && svg.includes('#1a1a1a') && svg.includes('#9aa5b1'));
  test('podpis liczbowy obok rysunku', g.textContent.includes('gryf'));
  const samGryf = A.platesEl(20);
  const svgPusty = samGryf.querySelector('.gryf').innerHTML;
  test('sam gryf bez talerzy', !svgPusty.includes('class="talerz"') && samGryf.textContent.includes('sam gryf'));
}

/* ---------- ciezar na sztandze ---------- */
console.log('');
console.log('Ciezar na sztandze');
{
  const W = 5;
  const bojA = S.plan.days.A.items.find(it => A.plannedOf(it, W, 'A').planKg != null);
  const planKg = A.plannedOf(bojA, W, 'A').planKg;
  const kartaBoju = () => app.querySelectorAll('.ex').find(k => k.textContent.includes(bojA.name));
  const suwakKg = () => kartaBoju().querySelector('.kgslider').querySelector('.suwak');

  S.week = W; S.view = '#/d/A'; A.render();
  const nowy = planKg - 5;
  const sl = suwakKg();
  sl.value = String(nowy);
  sl.onchange();
  test('zmiana ciezaru wchodzi do planu tygodnia', A.plannedOf(bojA, W, 'A').kg === nowy,
    'jest: ' + A.plannedOf(bojA, W, 'A').kg);
  test('i trafia do localStorage', (magazyn.get('trening.kgw.v1') || '').includes(W + '|A|' + bojA.n));
  test('plan zostaje planem', A.plannedOf(bojA, W, 'A').planKg === planKg);
  test('jedzie do synchronizacji', 'kgw' in A.stanLokalny());

  A.render();                                     // pelna przebudowa, jak po odswiezeniu z bazy
  test('po przebudowie ekranu ciezar zostaje', +suwakKg().value === nowy, 'jest: ' + suwakKg().value);
  test('karta pokazuje nowy ciezar', kartaBoju().querySelector('.kgbtn').textContent.includes(fmtPl(nowy)));

  // Kolejna seria idzie z nowym ciezarem, a nie ze starym z planu.
  const wiersze = kartaBoju().querySelector('.sets');
  wiersze.querySelector('.tick').click();
  test('odklikana seria zapisuje sie z nowym ciezarem', A.state.log[W + '|A|' + bojA.n][0].kg === nowy);

  // Inny tydzien ma swoj wlasny ciezar — odchylka nie rozlewa sie na caly plan.
  test('inny tydzien nie jest ruszony', A.plannedOf(bojA, W + 1, 'A').kg === A.plannedOf(bojA, W + 1, 'A').planKg);

  kartaBoju().querySelector('.kgwroc').click();
  test('Wroc do planu kasuje wlasny ciezar', A.plannedOf(bojA, W, 'A').kg === planKg
    && !(W + '|A|' + bojA.n in S.kgw));
}

/* ---------- niedziela ---------- */
console.log('\nNiedziela');
S.view = '#/mobilnosc'; S.week = 4; A.render();
const kafelki = app.querySelectorAll('.ex.mob');
test('pelna wersja: 22 pozycje', kafelki.length === 22, 'jest: ' + kafelki.length);
kafelki[0].querySelector('.tick').click();
test('odklikniecie zapisuje sie w stanie', Object.keys(S.mob[4] || {}).length === 1);
test('i trafia do localStorage', magazyn.get('trening.mob.v1').includes('y1'));
S.mobShort = true; A.render();
test('krotka wersja: 8 pozycji', app.querySelectorAll('.ex.mob').length === 8);
S.mobShort = false;

// Instrukcja pozycji. Bez niej niedziela jest lista nazw po sanskrycku.
A.render();
{
  const poz = S.plan.mobility.blocks.flatMap(b => b.items);
  const bezKrokow = poz.filter(i => !Array.isArray(i.steps) || i.steps.length < 3);
  test('kazda z ' + poz.length + ' pozycji ma min. 3 kroki', bezKrokow.length === 0,
    'bez krokow: ' + bezKrokow.map(i => i.id).join(', '));
  test('i kazda ma opisany czesty blad', poz.every(i => i.blad && i.blad.length > 20));
  test('intro nie zaklada juz, ze pozycje sa znane', !S.plan.mobility.intro.includes('Pozycje znasz'));

  const karta = app.querySelectorAll('.ex.mob')[0];
  const pierwsza = poz[0];
  test('kroki sa wyrenderowane jako lista', karta.querySelectorAll('.kroki').length === 1
    && karta.querySelectorAll('li').length === pierwsza.steps.length,
    'li: ' + karta.querySelectorAll('li').length + ', krokow: ' + pierwsza.steps.length);
  test('pierwszy krok jest w tresci karty', karta.textContent.includes(pierwsza.steps[0]));
  test('blad i wskazowka pod sztange tez', karta.querySelectorAll('.blad').length === 1
    && karta.querySelectorAll('.posztange').length === 1);

  // Domyslnie zwiniete: 22 pozycje rozwiniete na raz to sciana tekstu.
  const opis = karta.querySelectorAll('.exnote')[0];
  test('opis startuje zwiniety', opis.hidden === true);
  const more = karta.querySelectorAll('.more')[0];
  more.click();
  test('przycisk go rozwija', opis.hidden === false && more.textContent.includes('Zwiń'));
}

/* ---------- przenoszenie tygodnia ---------- */
console.log('');
console.log('Przenoszenie tygodnia');
{
  const Z = 9, NA = 5;
  const dzien = S.plan.days.A;
  const it = dzien.items.find(i => A.plannedOf(i, Z, 'A').sets > 0);
  const pl = A.plannedOf(it, Z, 'A');

  // Czysty start: kasujemy oba tygodnie po wczesniejszych testach.
  for (const w of [Z, NA]) {
    for (const k of Object.keys(S.log)) if (+k.split('|')[0] === w) delete S.log[k];
    for (const k of Object.keys(S.kgw)) if (+k.split('|')[0] === w) delete S.kgw[k];
    delete S.mob[w];
  }
  S.moves = [];
  S.queue = [];

  for (let i = 0; i < pl.sets; i++) A.logSet(Z, 'A', it.n, i, { r: pl.target, kg: pl.kg, pr: pl.target, pk: pl.planKg });
  S.kgw[Z + '|A|' + it.n] = 60;
  S.mob[Z] = { y1: true, y3: true };

  test('tydzien 9 ma dane, 5 jest pusty', A.tydzienMaDane(Z) && !A.tydzienMaDane(NA));
  const przed = A.zawartoscTygodnia(Z);
  test('zawartosc policzona: ' + przed.serie + ' serii, ' + przed.kgw + ' ciezar, ' + przed.mob + ' pozycje jogi',
    przed.serie === pl.sets && przed.kgw === 1 && przed.mob === 2);

  A.przeniesTydzien(Z, NA);

  test('dziennik przeniesiony', S.log[NA + '|A|' + it.n] && !S.log[Z + '|A|' + it.n]);
  test('serie w komplecie', A.zawartoscTygodnia(NA).serie === pl.sets);
  test('wlasny ciezar boju poszedl razem z nimi', S.kgw[NA + '|A|' + it.n] === 60 && !(Z + '|A|' + it.n in S.kgw));
  test('odklikana joga tez', Object.keys(S.mob[NA] || {}).length === 2 && !S.mob[Z]);
  test('zrodlowy tydzien jest pusty', !A.tydzienMaDane(Z));

  // Do bazy musza pojsc obie strony, inaczej drugie urzadzenie zobaczy duplikat.
  const doBazy = S.queue.filter(r => r.day === 'A' && r.ex === it.n);
  test('nowy tydzien wyslany z wartosciami', doBazy.some(r => r.week === NA && r.reps === pl.target));
  test('stary tydzien wyslany jako pusty', doBazy.some(r => r.week === Z && r.reps === null));
  test('ruch zapisany do synchronizacji', A.stanLokalny().moves.length === 1);

  // Znacznik czasu serii idzie na chwile przeniesienia — na tym stoi rozstrzyganie,
  // czyj zapis jest nowszy, i sprzatanie po kolejnych ruchach.
  test('przestawione serie maja znacznik z chwili przeniesienia',
    S.log[NA + '|A|' + it.n].filter(Boolean).every(r => r.ts === S.moves[S.moves.length - 1].ts));

  // Powrot: ten sam ruch w druga strone.
  A.przeniesTydzien(NA, Z);
  test('ruch w druga strone cofa zmiane', A.zawartoscTygodnia(Z).serie === pl.sets && !A.tydzienMaDane(NA));

  // Przeniesienie z drugiego urzadzenia wykonuje sie raz.
  const zdalne = [{ id: 'test-1', from: Z, to: NA, ts: new Date().toISOString() }];
  test('zdalny ruch zostaje wykonany', A.zastosujZdalnePrzeniesienia(zdalne) === true
    && A.zawartoscTygodnia(NA).serie === pl.sets);
  test('i nie powtarza sie przy kolejnym pobraniu', A.zastosujZdalnePrzeniesienia(zdalne) === false);
  test('wlasny ruch nie odbija sie jako zdalny',
    A.zastosujZdalnePrzeniesienia(A.stanLokalny().moves) === false);

  // Ekran ustawien: cel z danymi blokuje ruch.
  S.view = '#/ustawienia'; A.render();
  test('ustawienia maja karte przenoszenia', app.textContent.includes('Przenieś dziennik między tygodniami'));
  const kropki = app.querySelectorAll('.wchip').filter(c => c._cls.has('ma'));
  test('tygodnie z danymi sa oznaczone kropka', kropki.length > 0);

  // Sciezka, ktora naprawde przechodzi uzytkownik: dwa tapniecia w numery,
  // potwierdzenie, ruch. Po nim tydzien zrodlowy jest pusty.
  const zrodlo = A.tydzienMaDane(NA) ? NA : Z, cel = zrodlo === NA ? Z : NA;
  const rzedy = app.querySelectorAll('.przenrzad');
  test('karta ma dwa rzedy numerow', rzedy.length === 2);
  rzedy[0].querySelectorAll('.wchip')[zrodlo - 1].click();
  rzedy[1].querySelectorAll('.wchip')[cel - 1].click();
  const przycisk = () => app.querySelectorAll('.btn').find(b => b.textContent.includes('Przenieś tydzień')
    || b.textContent.includes('Na pewno'));
  test('po wybraniu pary pojawia sie przycisk', !!przycisk()
    && przycisk().textContent.includes(`Przenieś tydzień ${zrodlo} na ${cel}`));
  przycisk().click();
  test('pierwsze tapniecie tylko pyta o potwierdzenie',
    przycisk().textContent.includes('Na pewno') && A.tydzienMaDane(zrodlo));
  przycisk().click();
  test('drugie wykonuje ruch', !A.tydzienMaDane(zrodlo) && A.tydzienMaDane(cel));
  test('i mowi, co sie stalo', app.textContent.includes(`Przeniesione z tygodnia ${zrodlo} na ${cel}`));
}

/* ---------- na czym otwiera sie aplikacja ---------- */
console.log('');
console.log('Sesja na starcie');
{
  const W = 11;
  S.week = W;
  const wyczysc = () => {
    for (const k of Object.keys(S.log)) if (+k.split('|')[0] === W) delete S.log[k];
    delete S.mob[W];
  };
  const wDzien = (nr, fn) => {                        // udajemy konkretny dzien tygodnia
    const realny = Date.prototype.getDay;
    Date.prototype.getDay = () => nr;
    try { return fn(); } finally { Date.prototype.getDay = realny; }
  };
  const zapisz = key => S.plan.days[key].items.forEach(it => {
    const pl = A.plannedOf(it, W, key);
    for (let i = 0; i < pl.sets; i++) A.logSet(W, key, it.n, i, { r: pl.target, kg: pl.kg, pr: pl.target, pk: pl.planKg });
  });
  const SOB = 6, PT = 5, CZW = 4, ND = 0;

  wyczysc();
  test('piatek, nic nie zapisane → dzisiejsze C', wDzien(PT, A.domyslnaSesja) === 'C');
  // Sobota jest wolna. Wczesniej otwieral sie ekran glowny, mimo ze piatkowy
  // dziennik zostal pusty — to jest dokladnie ta usterka.
  test('sobota po niezapisanym piatku → C, nie ekran glowny', wDzien(SOB, A.domyslnaSesja) === 'C');

  zapisz('C');
  test('dzien C liczony jako kompletny', A.sesjaKompletna('C', W) === true);
  test('sobota cofa sie do starszej zaleglosci: B', wDzien(SOB, A.domyslnaSesja) === 'B');
  zapisz('B');
  test('a po zapisaniu B do A', wDzien(SOB, A.domyslnaSesja) === 'A');
  zapisz('A');
  test('komplet w tygodniu → sobota nie otwiera nic', wDzien(SOB, A.domyslnaSesja) == null);
  test('a piatek wraca do starej zasady, czyli dzisiejszego C', wDzien(PT, A.domyslnaSesja) === 'C');

  // Sesji z przyszlosci nie proponujemy — w czwartek nie ma czego wpisywac do piatku.
  wyczysc();
  test('czwartek nie proponuje piatkowego C', wDzien(CZW, A.domyslnaSesja) !== 'C');
  test('czwartek bierze najswiezsza zaleglosc, czyli B', wDzien(CZW, A.domyslnaSesja) === 'B');

  // Niedziela: joga liczy sie po odklikanych pozycjach, nie po seriach.
  zapisz('A'); zapisz('B'); zapisz('C');
  test('niedziela z nieodklikana joga → D', wDzien(ND, A.domyslnaSesja) === 'D');
  S.mob[W] = {};
  A.mobWidoczne().forEach(i => { S.mob[W][i.id] = true; });
  test('odklikana joga jest kompletna', A.sesjaKompletna('D', W) === true);
  // Komplet nie znaczy „ekran glowny": w dzien, ktory MA sesje, zostaje stara
  // zasada i otwiera sie dzisiejszy dzien. Pusto jest tylko w dzien wolny.
  test('a przy komplecie niedziela zostaje na dzisiejszym D', wDzien(ND, A.domyslnaSesja) === 'D');
  wyczysc();
}

/* ---------- przeniesiony tydzien nie wraca z bazy ---------- */
console.log('');
console.log('Przeniesiony tydzien wobec bazy');
{
  const Z = 10, NA = 6;
  for (const w of [Z, NA]) {
    for (const k of Object.keys(S.log)) if (+k.split('|')[0] === w) delete S.log[k];
  }
  S.moves = [];
  S.queue = [];
  const it = S.plan.days.A.items.find(i => A.plannedOf(i, Z, 'A').sets > 0);
  const pl = A.plannedOf(it, Z, 'A');
  const stary = '2026-08-01T10:00:00.000Z';
  S.log[Z + '|A|' + it.n] = [{ r: pl.target, kg: pl.kg, ts: stary }];

  A.przeniesTydzien(Z, NA);
  test('po przeniesieniu tydzien 10 jest pusty', A.logGet(Z, 'A', it.n).length === 0);

  // Wysylka kolejki i pobranie chodza osobno. Baza oddaje jeszcze STARY komplet:
  // wiersz tygodnia 10 z wartosciami, sprzed przeniesienia. Wlasnie to wracalo.
  const zBazy = [{ week: Z, day: 'A', ex: it.n, set_no: 1, reps: pl.target, kg: pl.kg, ts: stary }];
  A.scalZdalneWiersze(zBazy);
  test('stary wiersz z bazy NIE wskrzesza tygodnia 10', A.logGet(Z, 'A', it.n).length === 0,
    'wrocilo: ' + JSON.stringify(A.logGet(Z, 'A', it.n)));
  test('a tydzien 6 ma swoje serie', A.logGet(NA, 'A', it.n).filter(Boolean).length === 1);

  // Sesja zapisana w tym tygodniu PO przeniesieniu to normalny, zywy zapis.
  const nowy = new Date(Date.now() + 60000).toISOString();
  A.scalZdalneWiersze([{ week: Z, day: 'A', ex: it.n, set_no: 1, reps: 5, kg: 50, ts: nowy }]);
  test('nowy zapis w tym samym tygodniu wchodzi normalnie',
    A.logGet(Z, 'A', it.n).filter(Boolean).length === 1);
  test('i to ten nowy, nie odgrzany stary', A.logGet(Z, 'A', it.n)[0].r === 5);

  // Naprawa stanu, ktory zdazyl sie juz odbudowac na urzadzeniu.
  S.log[Z + '|A|' + it.n] = [{ r: pl.target, kg: pl.kg, ts: stary }];
  test('sprzatanie usuwa to, co wrocilo przed poprawka',
    A.sprzatnijPoPrzeniesieniach() === true && A.logGet(Z, 'A', it.n).length === 0);
  test('i nie ma czego sprzatac za drugim razem', A.sprzatnijPoPrzeniesieniach() === false);

  // Zapis nowszy niz przeniesienie zostaje nietkniety.
  S.log[Z + '|A|' + it.n] = [{ r: 7, kg: 40, ts: nowy }];
  A.sprzatnijPoPrzeniesieniach();
  test('sprzatanie nie rusza zapisu nowszego niz przeniesienie',
    A.logGet(Z, 'A', it.n).length === 1 && A.logGet(Z, 'A', it.n)[0].r === 7);
  delete S.log[Z + '|A|' + it.n];
}

/* ---------- ciezar po przeniesieniu tygodnia ---------- */
console.log('');
console.log('Ciezar po przeniesieniu');
{
  // Plan podaje INNY ciezar boju w kazdym tygodniu. Sesja przeniesiona z 9 na 5
  // byla wykonana ciezarem z dziewiatki — i to ma stac na ekranie, a nie liczba,
  // ktora plan przewiduje dla piatki.
  const Z = 9, NA = 3;
  for (const w of [Z, NA]) {
    for (const k of Object.keys(S.log)) if (+k.split('|')[0] === w) delete S.log[k];
    for (const k of Object.keys(S.kgw)) if (+k.split('|')[0] === w) delete S.kgw[k];
  }
  S.moves = []; S.queue = [];

  const it = S.plan.days.C.items.find(i => A.plannedOf(i, Z, 'C').planKg != null);
  const planZ = A.plannedOf(it, Z, 'C').planKg;
  const planNa = A.plannedOf(it, NA, 'C').planKg;
  test('plan daje inny ciezar w tygodniu ' + Z + ' i ' + NA + ' (' + planZ + ' vs ' + planNa + ')',
    planZ !== planNa);

  const pl = A.plannedOf(it, Z, 'C');
  for (let i = 0; i < pl.sets; i++) A.logSet(Z, 'C', it.n, i, { r: pl.target, kg: planZ, pr: pl.target, pk: planZ });

  A.przeniesTydzien(Z, NA);

  const po = A.plannedOf(it, NA, 'C');
  test('po przeniesieniu ekran pokazuje ciezar, ktory byl na sztandze', po.kg === planZ,
    'pokazuje: ' + po.kg + ', dzwigane: ' + planZ);
  test('a plan tygodnia docelowego zostaje planem', po.planKg === planNa);
  test('kilogramy sa w zapisanych seriach', A.logGet(NA, 'C', it.n).every(r => r.kg === planZ));

  S.week = NA; S.view = '#/d/C'; A.render();
  const karta = app.querySelectorAll('.ex').find(k => k.textContent.includes(it.name));
  test('suwak startuje na dzwiganym ciezarze', +karta.querySelector('.kgslider').querySelector('.suwak').value === planZ);
  test('karta pokazuje ten sam ciezar', karta.querySelector('.kgbtn').textContent.includes(String(planZ).replace('.', ',')));
  test('i widac, ile mowil plan', karta.textContent.includes('Plan: ' + String(planNa).replace('.', ',') + ' kg'));

  // Bez zapisu nic sie nie zmienia: plan zostaje planem.
  for (const k of Object.keys(S.log)) if (+k.split('|')[0] === NA) delete S.log[k];
  for (const k of Object.keys(S.kgw)) if (+k.split('|')[0] === NA) delete S.kgw[k];
  test('pusty tydzien dalej bierze ciezar z planu', A.plannedOf(it, NA, 'C').kg === planNa);
  S.moves = [];
}

console.log('\n' + (zle ? `${zle} BLEDOW, ${ok} ok` : `Wszystkie ${ok} testow przeszlo`));
process.exit(zle ? 1 : 0);
