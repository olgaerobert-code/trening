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

// Logika aplikacji jest sprawdzana na planie cyklu 1 — znanym, z liczbami, na których
// opierają się asercje. Bieżący plan (plan.json) ma własną sekcję na końcu pliku.
const planJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan-cykl1.json'), 'utf8'));
const planBiezacy = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan.json'), 'utf8'));
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
  URLSearchParams, encodeURIComponent, decodeURIComponent,
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
  postepDnia, platesEl, plateList, maybeRekalibruj, maybeAdjust, przeliczPlan,
  przeniesTydzien, zastosujZdalnePrzeniesienia, zawartoscTygodnia, tydzienMaDane,
  domyslnaSesja, sesjaKompletna, mobWidoczne,
  scalZdalneWiersze, sprzatnijPoPrzeniesieniach, poPrzeniesieniu, logGet,
  rozpocznijTrening, zakonczTrening, trening, czasTreningu, statySesji, idFilmu, zapiszFilm, przerwaPo, prowadzJoge, startPrzyPierwszejSerii, cofnijStart, przerwyCwiczenia, analizaSesji, czasSerii, raportCyklu,
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

// Nikt nic nie tapie: przeliczenie planu przy wejsciu podnosi ciezary samo.
S.rekal = {};
S.e1rm.front = przed.front; S.e1rm.dl = przed.dl;
S.adjust = {};
A.maybeRekalibruj();
test('podwyzka wchodzi sama, bez tapniecia', S.e1rm.front > przed.front && S.e1rm.dl > przed.dl);
test('i jest oznaczona jako automatyczna', S.rekal[4] && S.rekal[4].auto === true);
test('rekalibracja jedzie do synchronizacji', 'rekal' in A.stanLokalny());

// Karta nie pyta o zgode, tylko mowi, co sie stalo.
const karta = A.rekalibracjaCard();
test('karta informuje o podwyzce', karta && karta.textContent.includes('w górę o 10%'));
test('i ma droge powrotna', karta && karta.textContent.includes('Cofnij podwyżkę'));
test('bez pytania o zgode', karta && !karta.textContent.includes('Podnieś o 10%'));

const przyciskOK = karta.querySelectorAll('.mini').find(b => b.textContent === 'OK');
przyciskOK.click();
test('OK chowa karte', A.rekalibracjaCard() === null);
test('ale podwyzka zostaje', S.e1rm.front > przed.front);

// Drugie wejscie do planu nie podnosi drugi raz.
const poPierwszej = S.e1rm.front;
A.maybeRekalibruj();
test('kolejne wejscie nie podnosi drugi raz', S.e1rm.front === poPierwszej);

// Rekalibracja i korekta z dwoch tygodni nie sumuja sie ponad 10%.
S.adjust = {};
A.maybeAdjust();
test('korekta z dwoch tygodni omija swiezo podniesione boje',
  S.e1rm.front === poPierwszej && S.adjust.front.powod === 'rekalibracja bloku');

A.cofnijRekalibracje(4);
test('cofniecie wraca do poprzednich ciezarow', S.e1rm.front === przed.front && S.e1rm.dl === przed.dl);
test('i karta nie wraca', A.rekalibracjaCard() === null);
test('ani podwyzka przy nastepnym wejsciu', (() => { A.maybeRekalibruj(); return S.e1rm.front === przed.front; })());

// Blok bez kompletu NIE jest zamykany: dziennik uzupelnia sie po fakcie.
S.rekal = {};
const zapisFront = { ...S.log['3|C|' + front.n] };
delete S.log['3|C|' + front.n];
A.maybeRekalibruj();
test('brak kompletu → bez podwyzki', S.e1rm.front === przed.front);
test('i blok zostaje otwarty', !S.rekal[4]);
const brak = A.rekalibracjaCard();
test('karta mowi, ze podwyzki nie ma', brak && brak.textContent.includes('bez podwyżki'));
test('i ze nic nie jest zamkniete', brak && brak.textContent.includes('wejdzie sama'));

S.log['3|C|' + front.n] = Object.values(zapisFront);
A.maybeRekalibruj();
test('uzupelniony dziennik odblokowuje podwyzke pozniej', S.e1rm.front > przed.front);
A.cofnijRekalibracje(4);
S.adjust = {};

/* ---------- odchudzanie ---------- */
console.log('');
console.log('Odchudzanie');
S.week = 4; S.view = '#/'; A.render();
const kafle = app.querySelectorAll('.tile');
test('karta dzis i trzy pozostale sesje', kafle.length === 4, 'jest: ' + kafle.length);
test('zakladki Postep, Zasady i Dziennik w dolnym pasku', ['Postęp', 'Zasady', 'Dziennik'].every(t => timer.textContent.includes(t)));
test('nie ma juz osobnego kafla 1RM', !app.textContent.includes('Kalkulator 1RM'));
test('ekran Dzis bez maksow i ciezarow tygodnia', !app.textContent.includes('Maksy (E1RM)') && !app.textContent.includes('Na sztandze'));
S.view = '#/postep'; A.render();
test('kalkulator dostepny z karty E1RM w Postepie', app.textContent.includes('Przelicz z serii') && app.textContent.includes('Maksy (E1RM)'));
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

/* ---------- trening: start i koniec ---------- */
console.log('\nTrening: start i koniec');
{
  S.week = 4; S.view = '#/d/B'; S.treningi = {}; A.render();
  test('przed startem jest przycisk Rozpocznij', app.textContent.includes('Rozpocznij trening'));
  app.querySelector('.trn-start').click();
  const t = A.trening(4, 'B');
  test('start zapisuje godzine rozpoczecia', t && t.start && !t.end);
  test('start trafia do localStorage', (magazyn.get('trening.treningi.v1') || '').includes('4|B'));
  test('start jedzie do synchronizacji', 'treningi' in A.stanLokalny());
  test('w trakcie widac Zakoncz', app.textContent.includes('Zakończ'));
  t.start = new Date(Date.now() - 47 * 60000).toISOString();
  A.zakonczTrening('B', 4);
  test('koniec zapisuje godzine zakonczenia', !!A.trening(4, 'B').end);
  test('czas treningu liczy sie z startu i konca', Math.abs(A.czasTreningu(A.trening(4, 'B')) - 47 * 60) < 5);
  test('podsumowanie zna czas', A.statySesji('B', 4).czas === '47 min');
  S.view = '#/d/B'; A.render();
  test('po koncu widac czas zamiast przycisku', app.textContent.includes('Trening zakończony') && !app.textContent.includes('Rozpocznij trening'));
  const st = A.statySesji('B', 4);
  test('podsumowanie bez tetna i kalorii', !('hrAvg' in st) && !('kcal' in st));
  S.view = '#/'; A.render();
  test('ekran Dzis pokazuje ostatni trening bez tetna', app.textContent.includes('Ostatni trening') && !app.textContent.includes('tętno') && !app.textContent.includes('bpm'));
  S.treningi = {};
  S.view = '#/ustawienia'; A.render();
  test('ustawienia maja instrukcje zegarka bez tetna', app.textContent.includes('Huawei Health') && !app.textContent.includes('Tętno'));
  test('bez Stravy i skrotu w ustawieniach', !app.textContent.includes('Strava') && !app.textContent.includes('Skrót iPhone'));
}

/* ---------- niedziela ---------- */
console.log('\nNiedziela');
S.view = '#/mobilnosc'; S.week = 4; A.render();
const kafelki = app.querySelectorAll('.ex.mob');
test('pelna wersja: 20 pozycji', kafelki.length === 20, 'jest: ' + kafelki.length);
test('kazda pozycja ma film w karcie', app.querySelectorAll('.filmwkarcie').length === 20);
test('link youtu.be', A.idFilmu('https://youtu.be/abcDEF12345?si=x') === 'abcDEF12345');
test('link watch?v=', A.idFilmu('https://www.youtube.com/watch?v=abcDEF12345&t=3') === 'abcDEF12345');
test('link shorts', A.idFilmu('https://youtube.com/shorts/abcDEF12345') === 'abcDEF12345');
test('smiec to nie film', A.idFilmu('kot krowa') === null);
S.filmy = {}; S.view = '#/mobilnosc'; A.render();
test('kazda pozycja ma okladke filmu z planu', app.querySelectorAll('.okladka').length === 20);
  test('kazdy film mozna powiekszyc', app.querySelectorAll('.filmpow').length === 20);
test('zapisany film jedzie do synchronizacji', A.zapiszFilm('y3', 'https://youtu.be/abcDEF12345') && S.filmy.y3 === 'abcDEF12345' && 'filmy' in A.stanLokalny());
kafelki[0].querySelector('.tick').click();
test('odklikniecie zapisuje sie w stanie', Object.keys(S.mob[4] || {}).length === 1);
test('i trafia do localStorage', magazyn.get('trening.mob.v1').includes('y1'));
S.mobShort = true; A.render();
test('krotka wersja: 9 pozycji', app.querySelectorAll('.ex.mob').length === 9);
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

{
  console.log('\nPrzerwa po serii');
  const it = (d, n) => S.plan.days[d].items.find(x => x.n === n);
  test('wyciskanie: 3 min', A.przerwaPo(it('A', 2), 'A', 5) === 180);
  test('wyciskanie od bloku 3: 4 min', A.przerwaPo(it('A', 2), 'A', 9) === 240);
  test('podciaganie: 2 min', A.przerwaPo(it('A', 3), 'A', 5) === 120);
  test('pierwsze w superserii: bez przerwy', A.przerwaPo(it('B', 6), 'B', 5) === 0);
  test('drugie w superserii: 90 s po parze', A.przerwaPo(it('B', 7), 'B', 5) === 90);
  test('front squat: 3 min', A.przerwaPo(it('C', 1), 'C', 5) === 180);
  test('bez opisu: 60 s', A.przerwaPo(it('A', 7), 'A', 5) === 60);

  console.log('\nZwiniete karty');
  const W = 3;
  const a2 = it('A', 2), pl = A.plannedOf(a2, W, 'A');
  for (let i = 0; i < pl.sets; i++) A.logSet(W, 'A', 2, i, { r: pl.target, kg: pl.kg, pr: pl.target, pk: pl.planKg });
  S.view = '#/d/A/' + W; A.render();
  const karta = app.querySelectorAll('.ex').find(k => k.textContent.includes(a2.name));
  test('komplet serii zwija karte', karta.className.includes('zwiniety'));
  test('zwinieta karta mowi, co zrobione', karta.querySelector('.exsum').textContent.startsWith('✓'));
  const inna = app.querySelectorAll('.ex').find(k => k.textContent.includes(it('A', 7).name));
  test('niezrobione cwiczenie zostaje rozwiniete', !inna.className.includes('zwiniety'));

  console.log('\nJoga: tryb prowadzenia');
  S.view = '#/mobilnosc'; A.render();
  test('przycisk trybu prowadzenia', !!app.querySelector('.prowstart'));
  const ws = app.querySelector('.wstep');
  test('wstep zwiniety do dwoch linii', !!ws && ws.children[0].className.includes('zwiniety'));
}

{
  console.log('\nStart przy pierwszej serii');
  S.treningi = {}; S.week = 6;
  const it = S.plan.days.A.items[0], pl = A.plannedOf(it, 6, 'A');
  A.logSet(6, 'A', it.n, 0, { r: pl.target, kg: pl.kg, pr: pl.target, pk: pl.planKg });
  A.startPrzyPierwszejSerii('A', 6);
  test('pierwsza seria startuje trening', !!(A.trening(6, 'A') && A.trening(6, 'A').start));
  A.cofnijStart('A', 6);
  A.logSet(6, 'A', it.n, 1, { r: pl.target, kg: pl.kg, pr: pl.target, pk: pl.planKg });
  A.startPrzyPierwszejSerii('A', 6);
  test('kolejna seria w napoczetej sesji nie startuje', !A.trening(6, 'A'));
  const b = S.plan.days.B.items[0], pb = A.plannedOf(b, 2, 'B');
  A.logSet(2, 'B', b.n, 0, { r: pb.target, kg: pb.kg, pr: pb.target, pk: pb.planKg });
  A.startPrzyPierwszejSerii('B', 2);
  test('dziennik z dawnego tygodnia nie startuje', !A.trening(2, 'B'));
  S.treningi = {}; S.week = 5;
}

{
  console.log('\nPrzerwy miedzy seriami');
  const it = S.plan.days.A.items.find(x => x.n === 2);       // wyciskanie, plan 3:00, 4 x 6
  test('szacowany czas serii 6 powt. = 18 s', A.czasSerii(it, 5, 'A') === 18);
  const T = 1759000000;
  S.czasy = { '5|A|2': [T, T + 198, T + 298, T + 598] };    // przerwy: 180, 82, 282
  const p = A.przerwyCwiczenia(it, 'A', 5);
  test('trzy przerwy policzone', p && p.lista.length === 3);
  test('3:00 przy planie 3:00 = w normie', p.lista[0].rest === 180 && p.lista[0].ocena === 'ok');
  test('1:22 przy planie 3:00 = za krotko', p.lista[1].ocena === 'krotko');
  test('4:42 przy planie 3:00 = za dlugo', p.lista[2].ocena === 'dlugo');
  S.czasy = { '5|A|2': [T, T + 3, T + 6, T + 9] };
  test('dziennik dopisany po fakcie nie daje przerw', A.przerwyCwiczenia(it, 'A', 5) === null);
  const b7 = S.plan.days.B.items.find(x => x.superset === 'A2');
  S.czasy = { '5|B|7': [T, T + 200] };
  const ps = A.przerwyCwiczenia(b7, 'B', 5);
  test('superseria: plan 90 s po parze', ps && ps.plan === 90);
  S.czasy = { '5|A|2': [T, T + 198, T + 396] };
  const an = A.analizaSesji('A', 5);
  test('analiza sesji: srednia i procent planu', an && an.sr === 180 && an.proc === 100 && an.ok === 2);
  S.view = '#/postep'; A.render();
  test('Postep pokazuje historie przerw', app.textContent.includes('Przerwy między seriami'));
  S.czasy = {};
}

{
  console.log('\nRaport cyklu');
  const it = S.plan.days.A.items.find(x => x.n === 2), pl = A.plannedOf(it, 3, 'A');
  A.logSet(3, 'A', 2, 0, { r: pl.target, kg: pl.kg, pr: pl.target, pk: pl.planKg });
  const r = A.raportCyklu();
  test('raport ma naglowek i E1RM', r.startsWith('RAPORT CYKLU') && r.includes('E1RM teraz'));
  test('raport ma serie z ciezarem', r.includes('Wyciskanie leżąc [plan') && r.includes('@'));
  test('raport bez kodu planu', !r.includes(S.key));
  S.view = '#/ustawienia'; A.render();
  test('przycisk raportu w Dzienniku', app.textContent.includes('Kopiuj raport cyklu'));
}

{
  console.log('\nCykl 2: przejscie i plan');
  // Na tym samym localStorage zostaje dziennik cyklu 1 — nowa instancja aplikacji
  // z plan.json ma go zarchiwizowac i zaczac od tygodnia 1.
  const it1 = S.plan.days.A.items.find(x => x.n === 2), pl1 = A.plannedOf(it1, 4, 'A');
  A.logSet(4, 'A', 2, 0, { r: pl1.target, kg: pl1.kg, pr: pl1.target, pk: pl1.planKg });
  S.week = 11; localStorage.setItem('trening.v1', JSON.stringify({ week: 11, e1rm: { bench: 135, front: 102.5, dl: 110 } }));
  const serieC1 = Object.keys(S.log).length;
  app.children = []; timer.children = [];
  const sb2 = { ...sandbox, fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(planBiezacy) }) };
  delete sb2.API;
  vm.createContext(sb2);
  for (const plik of ['progresja.js', 'app.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, plik), 'utf8'), sb2, { filename: plik });
  vm.runInContext(`globalThis.API = { state, render, plannedOf, logSet, logGet, kluczSync, archiwum, przerwaPo, judgeWeek, kgOf, raportCyklu, pozycjaBoju, resolve, korektaMaksow };`, sb2);
  const B2 = sb2.API;
  await new Promise(r => setTimeout(r, 20));
  const S2 = B2.state;
  test('plan cyklu 2 wczytany', S2.plan.cykl === 2);
  test('nowy cykl startuje od tygodnia 1', S2.week === 1);
  test('maksy z nowego planu', S2.e1rm.front === 105 && S2.e1rm.dl === 120 && S2.e1rm.bench === 135);
  test('dziennik nowego cyklu pusty', Object.keys(S2.log).length === 0);
  const arch = B2.archiwum();
  test('cykl 1 w archiwum z calym dziennikiem', arch[1] && Object.keys(arch[1].log).length === serieC1 && arch[1].week === 11);
  test('osobny klucz synchronizacji cyklu', B2.kluczSync() === S2.key + '-C2');
  test('joga domyslnie krotka', S2.mobShort === true);
  // Ktos, kto zaczal cykl 2 ze starszym planem, ma w pamieci maksy 95/100 i wyciskanie po korekcie.
  localStorage.removeItem('trening.korektaE1rm.v1');
  S2.e1rm = { front: 95, dl: 100, bench: 137.5 };
  test('korekta maksow dolu wchodzi raz', B2.korektaMaksow(S2.plan) && S2.e1rm.front === 105 && S2.e1rm.dl === 120);
  test('korekta nie rusza wyciskania', S2.e1rm.bench === 137.5);
  S2.e1rm.front = 107.5;
  test('drugi raz korekta juz nie wchodzi', !B2.korektaMaksow(S2.plan) && S2.e1rm.front === 107.5);
  // Urzadzenie po wersji 1 (105/115) dostaje tylko nowy ciag.
  localStorage.setItem('trening.korektaE1rm.v1', '1');
  S2.e1rm = { front: 105, dl: 115, bench: 135 };
  test('wersja 2 podnosi ciag do 120', B2.korektaMaksow(S2.plan) && S2.e1rm.dl === 120);
  S2.e1rm = { front: 105, dl: 120, bench: 135 };
  const poz2 = S2.plan.mobility.blocks.flatMap(b => b.items);
  const nazwy1 = new Set(planJson.mobility.blocks.flatMap(b => b.items).map(i => i.name));
  test('nowa joga: 20 pozycji, zadna z cyklu 1', poz2.length === 20 && poz2.every(i => !nazwy1.has(i.name)));
  test('nowa joga: krotka wersja 8-10 pozycji', poz2.filter(i => i.core).length >= 8 && poz2.filter(i => i.core).length <= 10);
  test('nowa joga: kazda pozycja ma kroki, blad, opis i wyszukiwanie filmu', poz2.every(i => i.steps.length >= 4 && i.blad && i.note && i.film));
  test('nowa joga: unikalne identyfikatory, inne niz w cyklu 1', new Set(poz2.map(i => i.id)).size === 20 && poz2.every(i => /^z\d+$/.test(i.id)));
  test('nowa joga: bloki sumuja sie do pelnej wersji', S2.plan.mobility.blocks.reduce((a, b) => a + b.minutes, 0) === S2.plan.mobility.minutes);

  for (let w = 1; w <= 12; w++) {
    for (const d of ['A', 'B', 'C']) for (const it of S2.plan.days[d].items) {
      const pl = B2.plannedOf(it, w, d);
      if (!pl.sets || !pl.target) test(`tydz. ${w} ${d}${it.n} ma serie i powtorzenia`, false, String(B2.resolve(it.scheme, w)));
    }
    for (const L of ['bench', 'front', 'dl']) if (!(B2.kgOf(L, w) > 0)) test(`tydz. ${w} ciezar ${L}`, false);
  }
  test('kazde cwiczenie ma serie we wszystkich tygodniach i ciezar boju', true);
  test('boje znalezione w planie', ['bench', 'front', 'dl'].every(L => B2.pozycjaBoju(L)));
  test('front squat tydz. 1 = 70 kg', B2.kgOf('front', 1) === 70);
  test('ciag tydz. 1 = 80 kg', B2.kgOf('dl', 1) === 80);
  test('front squat tydz. 10 = 85 kg, ciag 97,5 kg', B2.kgOf('front', 10) === 85 && B2.kgOf('dl', 10) === 97.5);
  test('wyciskanie tydz. 1 = 90 kg', B2.kgOf('bench', 1) === 90);
  for (const d of ['A', 'B', 'C']) {
    const its = S2.plan.days[d].items;
    for (const it of its.filter(x => x.superset && x.superset.endsWith('2')))
      test(`${d}: superseria ${it.superset} ma pare i przerwe po parze`, its.some(x => x.superset === it.superset[0] + '1') && B2.przerwaPo(it, d, 1) >= 60);
    test(`${d}: kazde cwiczenie ma opis, bez filmow`, its.every(x => x.note && x.id && !x.film));
  }
  const tib = S2.plan.days.B.items.find(x => /piszczelowy/.test(x.name));
  test('maszyna na piszczelowy ma ciezar startowy', B2.plannedOf(tib, 1, 'B').kg === 10);
  const SENS = /skolioz|cobb|przodopochyl|ból|bólu|boles|dolegliw|rehabilit|fizjoterapeu|ortoped|RTG|MRI|diagnoz|leczen|chorob|kontuzj|uraz|skręc|tendinop|patolog|obrzęk|wysięk|drętwi|mrowie|przeciwbólow|specjalist|zwyrodnien|nawrot/i;
  test('plan bez tresci zdrowotnych', !SENS.test(JSON.stringify(S2.plan)));

  for (const v of ['#/', '#/d/A', '#/d/B', '#/d/C', '#/mobilnosc', '#/postep', '#/zasady', '#/1rm', '#/ustawienia']) {
    S2.view = v; let blad = null;
    try { B2.render(); } catch (e) { blad = e; }
    test('cykl 2 renderuje ' + v, !blad && app.children.length > 0, blad && blad.stack);
  }
  S2.view = '#/d/B'; B2.render();
  test('suwak ciezaru przy hantlach i maszynie', app.querySelectorAll('.kgslider').length >= 3);
  test('dzien silowy bez przyciskow filmow', app.querySelectorAll('.film').length === 0);
  S2.view = '#/ustawienia'; B2.render();
  test('archiwum cyklu 1 w Dzienniku', app.textContent.includes('Archiwum · cykl 1') && app.textContent.includes('Kopiuj raport cyklu 1'));
  const pa = S2.plan.days.A.items.find(x => x.n === 2), ppa = B2.plannedOf(pa, 1, 'A');
  B2.logSet(1, 'A', 2, 0, { r: ppa.target, kg: ppa.kg, pr: ppa.target, pk: ppa.planKg });
  test('raport cyklu 2 ma nowe cwiczenia', B2.raportCyklu().includes('Cykl 2') && B2.raportCyklu().includes('Wyciskanie leżąc'));
}

console.log('\n' + (zle ? `${zle} BLEDOW, ${ok} ok` : `Wszystkie ${ok} testow przeszlo`));
process.exit(zle ? 1 : 0);
