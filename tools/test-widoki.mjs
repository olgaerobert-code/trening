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
  // Jak w przegladarce: tekst staje sie wezlem tekstowym, a childNodes to dzieci.
  set textContent(v) { this._txt = ''; this.children = v == null || v === '' ? [] : [txt(String(v))]; }
  get childNodes() { return this.children; }
  set innerHTML(v) { this._html = String(v); if (!v) this.children = []; }
  get innerHTML() { return this._html; }
  append(...n) { for (const x of n) { const c = typeof x === 'object' ? x : txt(String(x)); c.parentNode = this; this.children.push(c); } }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); this.parentNode = null; }
  replaceChildren(...n) { this.children = []; this.append(...n); }
  closest(sel) { let n = this; while (n && n.tagName) { if (n.tagName !== '#TEXT' && pasuje(n, sel)) return n; n = n.parentNode; } return null; }
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
  removeEventListener() {},
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
const planCykl2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan-cykl2.json'), 'utf8'));
const planCykl3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'plan-cykl3.json'), 'utf8'));
const sandbox = {
  document, localStorage, console,
  location: { hash: '', search: '', href: 'http://localhost/' },
  history: { replaceState() {} },
  navigator: { onLine: false, vibrate() {} },      // offline: zero ruchu do Supabase
  window: { addEventListener() {}, scrollTo() {} },
  setTimeout, clearTimeout, setInterval: () => 1, clearInterval() {},   // 1, nie 0: uchwyt timera ma byc prawdziwy
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
  domyslnaSesja, sesjaKompletna, mobWidoczne, sesjaPominieta, pominSesje, tydzienZaliczony, seriaTygodni, ocenaBojuWBloku, migracjaPoniedzialku,
  parsujLiczbe, domknijLiczbe, edycjaLiczby, przytrzymanie, arkuszSerii, startTimer, stopTimer, przedluzPrzerwe, stanPrzerwy, renderTimer, zapiszLokalnie, kolejkaSesji, nastepnyKrok, prowadzSesje, przerwaPo, zapiszCiezar, rozwinKarte,
  scalZdalneWiersze, sprzatnijPoPrzeniesieniach, poPrzeniesieniu, logGet,
  DZIEN_TYG, SKROT_DNIA, migracjaDniCyklu3,
  rozpocznijTrening, zakonczTrening, trening, czasTreningu, statySesji, idFilmu, zapiszFilm, przerwaPo, prowadzJoge, startPrzyPierwszejSerii, cofnijStart, przerwyCwiczenia, analizaSesji, czasSerii, raportCyklu,
};`, sandbox);
const A = sandbox.API;
await new Promise(r => setTimeout(r, 20));          // niech boot z fetch() dojdzie do konca

const S = A.state;
test('plan wczytany', S.plan && S.plan.title === 'Plan 12 tygodni');
test('E1RM ustawione z planu', S.e1rm && S.e1rm.bench > 0);
test('plan bez pola dzien: pn/sr/pt/nd jak dotad', JSON.stringify(A.DZIEN_TYG) === JSON.stringify({ 0: 'D', 1: 'A', 3: 'B', 5: 'C' }) && A.SKROT_DNIA.A === 'Pn' && A.SKROT_DNIA.C === 'Pt');
test('migracja dni cyklu 3 nie dotyka cyklu 1', A.migracjaDniCyklu3(true) === false);

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
test('karta dzis i trzy pozostale sesje', app.querySelectorAll('.dzis-k').length === 1 && app.querySelectorAll('.wiersz').length === 3,
  'karta: ' + app.querySelectorAll('.dzis-k').length + ', wiersze: ' + app.querySelectorAll('.wiersz').length);
test('pasek tygodnia: siedem dni', app.querySelectorAll('.d7').length === 7);
test('zakladki Dzis, Plan, Postep i Wiecej w dolnym pasku', ['Dziś', 'Plan', 'Postęp', 'Więcej'].every(t => timer.textContent.includes(t)));
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
  // Ciężar zmienia się przyciskami − i + (krok 2,5 kg na sztandze), nie suwakiem.
  const kroki = () => kartaBoju().querySelector('.kgrow').querySelectorAll('.kg-b');
  const pokazany = () => kartaBoju().querySelector('.kg-v').textContent;

  S.week = W; S.view = '#/d/A'; A.render();
  const nowy = planKg - 5;
  kroki()[0].click(); kroki()[0].click();
  test('zmiana ciezaru wchodzi do planu tygodnia', A.plannedOf(bojA, W, 'A').kg === nowy,
    'jest: ' + A.plannedOf(bojA, W, 'A').kg);
  test('i trafia do localStorage', (magazyn.get('trening.kgw.v1') || '').includes(W + '|A|' + bojA.n));
  test('plan zostaje planem', A.plannedOf(bojA, W, 'A').planKg === planKg);
  test('jedzie do synchronizacji', 'kgw' in A.stanLokalny());

  A.render();                                     // pelna przebudowa, jak po odswiezeniu z bazy
  test('po przebudowie ekranu ciezar zostaje', pokazany().includes(fmtPl(nowy)), 'jest: ' + pokazany());
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
  test('karta ma rzad zakresu i dwa rzedy numerow', rzedy.length === 3);
  rzedy[1].querySelectorAll('.wchip')[zrodlo - 1].click();
  rzedy[2].querySelectorAll('.wchip')[cel - 1].click();
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

/* ---------- przenoszenie jednego dnia ---------- */
console.log('');
console.log('Przenoszenie jednego dnia');
{
  const Z = 2, NA = 3;
  const zapiszDzien = (w, key) => S.plan.days[key].items.forEach(it => {
    const pl = A.plannedOf(it, w, key);
    for (let i = 0; i < pl.sets; i++) A.logSet(w, key, it.n, i, { r: pl.target, kg: pl.kg, pr: pl.target, pk: pl.planKg });
  });
  for (const w of [Z, NA]) {
    for (const k of Object.keys(S.log)) if (+k.split('|')[0] === w) delete S.log[k];
    for (const k of Object.keys(S.kgw)) if (+k.split('|')[0] === w) delete S.kgw[k];
    delete S.mob[w];
  }
  S.moves = []; S.queue = [];
  zapiszDzien(Z, 'A'); zapiszDzien(Z, 'B');
  S.mob[Z] = { y1: true };
  const itA = S.plan.days.A.items[0];
  S.kgw[Z + '|A|' + itA.n] = 55;
  const serieA = A.zawartoscTygodnia(Z, 'A').serie, serieB = A.zawartoscTygodnia(Z, 'B').serie;
  test('zawartosc dnia A liczona osobno', serieA > 0 && A.zawartoscTygodnia(Z, 'A').dni.join('') === 'A');
  test('joga nie wchodzi w zawartosc dnia A', A.zawartoscTygodnia(Z, 'A').mob === 0 && A.zawartoscTygodnia(Z, 'D').mob === 1);
  test('tydzien 3 w dniu A jest pusty', !A.tydzienMaDane(NA, 'A'));

  S.queue = [];
  A.przeniesTydzien(Z, NA, { day: 'A' });
  test('poniedzialek przeniesiony z 2 na 3', A.zawartoscTygodnia(NA, 'A').serie === serieA && A.zawartoscTygodnia(Z, 'A').serie === 0);
  test('sroda zostala w tygodniu 2', A.zawartoscTygodnia(Z, 'B').serie === serieB && A.zawartoscTygodnia(NA, 'B').serie === 0);
  test('joga zostala w tygodniu 2', S.mob[Z] && !S.mob[NA]);
  test('wlasny ciezar poniedzialku poszedl razem z nim', S.kgw[NA + '|A|' + itA.n] === 55 && !(Z + '|A|' + itA.n in S.kgw));
  const ruch = S.moves[S.moves.length - 1];
  test('ruch niesie dzien, a pola from/to zostawia pustym (stara wersja go nie wykona)', ruch.day === 'A' && ruch.w === Z && ruch.na === NA && ruch.from === undefined);
  test('do bazy poszly tylko wiersze dnia A', S.queue.every(r => r.day === 'A') && S.queue.some(r => r.week === NA) && S.queue.some(r => r.week === Z && r.reps === null));

  // Stary wiersz dnia A z bazy jest martwy, wiersz dnia B z tego samego tygodnia zyje.
  const dawniej = new Date(Date.now() - 60000).toISOString();
  test('stary wiersz A z tygodnia 2 odrzucony', A.poPrzeniesieniu(Z, dawniej, 'A') === true);
  test('wiersz B z tygodnia 2 przyjety', A.poPrzeniesieniu(Z, dawniej, 'B') === false);

  // Powrot i zdalne powtorzenie z dniem.
  A.przeniesTydzien(NA, Z, { day: 'A' });
  test('ruch w druga strone cofa zmiane', A.zawartoscTygodnia(Z, 'A').serie === serieA && !A.tydzienMaDane(NA, 'A'));
  const zdalne = [{ id: 'test-dzien-1', w: Z, na: NA, ts: new Date().toISOString(), day: 'A' }];
  test('zdalny ruch jednego dnia wykonuje sie raz', A.zastosujZdalnePrzeniesienia(zdalne) === true
    && A.zawartoscTygodnia(NA, 'A').serie === serieA && A.zawartoscTygodnia(Z, 'B').serie === serieB
    && A.zastosujZdalnePrzeniesienia(zdalne) === false);

  // Ekran ustawien: wybor zakresu „Pn · A", potem numery, potem przycisk z nazwa dnia.
  S.view = '#/ustawienia'; A.render();
  const zakres = app.querySelectorAll('.przenrzad')[0].querySelectorAll('.wchip');
  test('karta ma wybor zakresu', zakres.length === 5 && zakres[1].textContent.includes('Pn'));
  zakres[1].click();
  let rzedy = app.querySelectorAll('.przenrzad');
  rzedy[1].querySelectorAll('.wchip')[NA - 1].click();
  rzedy = app.querySelectorAll('.przenrzad');
  rzedy[2].querySelectorAll('.wchip')[Z - 1].click();
  const przycisk = () => app.querySelectorAll('.btn').find(b => b.textContent.includes('Przenieś') || b.textContent.includes('Na pewno'));
  test('przycisk nazywa dzien', !!przycisk() && przycisk().textContent.includes('Pn A') && przycisk().textContent.includes(`z tygodnia ${NA} na ${Z}`));
  przycisk().click(); przycisk().click();
  test('ruch z ekranu przenosi sam poniedzialek', A.zawartoscTygodnia(Z, 'A').serie === serieA && !A.tydzienMaDane(NA, 'A') && A.zawartoscTygodnia(Z, 'B').serie === serieB);
  for (const w of [Z, NA]) {
    for (const k of Object.keys(S.log)) if (+k.split('|')[0] === w) delete S.log[k];
    for (const k of Object.keys(S.kgw)) if (+k.split('|')[0] === w) delete S.kgw[k];
    delete S.mob[w];
  }
  S.moves = [];
}

/* ---------- pominieta sesja ---------- */
console.log('');
console.log('Pominieta sesja');
{
  const W = 1;
  S.week = W;
  S.pominiete = {};
  for (const k of Object.keys(S.log)) if (+k.split('|')[0] === W) delete S.log[k];
  const wDzien = (nr, fn) => { const realny = Date.prototype.getDay; Date.prototype.getDay = () => nr; try { return fn(); } finally { Date.prototype.getDay = realny; } };
  const zapisz = key => S.plan.days[key].items.forEach(it => {
    const pl = A.plannedOf(it, W, key);
    for (let i = 0; i < pl.sets; i++) A.logSet(W, key, it.n, i, { r: pl.target, kg: pl.kg, pr: pl.target, pk: pl.planKg });
  });
  const SOB = 6;
  zapisz('B'); zapisz('C');
  test('plan zaczety w srode: sobota proponuje zalegly poniedzialek', wDzien(SOB, A.domyslnaSesja) === 'A');
  test('tydzien bez poniedzialku nie jest zaliczony', A.tydzienZaliczony(W) === false);
  A.pominSesje('A', W, true);
  test('pominiety poniedzialek jest pominiety', A.sesjaPominieta('A', W) === true);
  test('i sobota juz go nie proponuje', wDzien(SOB, A.domyslnaSesja) == null);
  test('tydzien ze sroda i piatkiem liczy sie jako komplet', A.tydzienZaliczony(W) === true && A.seriaTygodni(W) >= 1);
  test('pominiecie jedzie w paczce stanu', A.stanLokalny().pominiete && A.stanLokalny().pominiete['1|A'] === true);
  const blok1 = A.BLOKI[0];
  const ocena = A.ocenaBojuWBloku('bench', blok1);
  test('tydzien 1 nie wchodzi w ocene wyciskania w bloku 1', ocena.tygodni === blok1.weeks.filter(x => x !== W).length);

  // Ekran dnia A: karta pominiecia z przyciskiem powrotu; na Dzis kafel mowi „pominieta".
  S.view = '#/d/A'; A.render();
  test('dzien A pokazuje, ze sesja jest pominieta', app.textContent.includes('Sesja pominięta w tygodniu 1'));
  S.view = '#/'; A.render();
  test('lista tygodnia oznacza poniedzialek jako pominiety', app.textContent.includes('pominięta'));
  const przywroc = app.querySelectorAll('.mini').find(b => b.textContent.includes('Przywróć'));
  S.view = '#/d/A'; A.render();
  app.querySelectorAll('.mini').find(b => b.textContent.includes('Przywróć sesję')).click();
  test('przywrocenie zdejmuje pominiecie', A.sesjaPominieta('A', W) === false && !!app.querySelectorAll('.pomin').length);
  app.querySelectorAll('.pomin')[0].click();
  test('przycisk w pustej sesji pomija ja ponownie', A.sesjaPominieta('A', W) === true);
  zapisz('A');
  test('pierwsza zapisana seria sama odwoluje pominiecie', A.sesjaPominieta('A', W) === false);
  for (const k of Object.keys(S.log)) if (+k.split('|')[0] === W) delete S.log[k];
  S.pominiete = {};
}

/* ---------- jednorazowa migracja poniedzialku (cykl 2) ---------- */
console.log('');
console.log('Migracja poniedzialku');
{
  const zapiszDzien = (w, key) => S.plan.days[key].items.forEach(it => {
    const pl = A.plannedOf(it, w, key);
    for (let i = 0; i < pl.sets; i++) A.logSet(w, key, it.n, i, { r: pl.target, kg: pl.kg, pr: pl.target, pk: pl.planKg });
  });
  const czysc = () => { for (const w of [1, 2, 3]) for (const k of Object.keys(S.log)) if (+k.split('|')[0] === w) delete S.log[k]; S.moves = []; S.pominiete = {}; localStorage.removeItem('trening.migracja.v1'); };
  const cykl = S.plan.cykl;
  S.plan.cykl = 2;
  czysc();
  zapiszDzien(2, 'A'); zapiszDzien(2, 'B');
  const serie = A.zawartoscTygodnia(2, 'A').serie, serieB = A.zawartoscTygodnia(2, 'B').serie;
  test('przed: poniedzialek w tygodniu 2, tydzien 1 pusty', serie > 0 && !A.tydzienMaDane(1, 'A'));
  test('migracja cos zmienia', A.migracjaPoniedzialku(true) === true);
  test('poniedzialek poszedl z 2 na 3', A.zawartoscTygodnia(3, 'A').serie === serie && !A.tydzienMaDane(2, 'A'));
  test('sroda tygodnia 2 zostala', A.zawartoscTygodnia(2, 'B').serie === serieB);
  test('pusty poniedzialek tygodnia 1 jest pominiety', A.sesjaPominieta('A', 1) === true);
  test('ruch ma staly identyfikator', S.moves.some(m => m.id === 'migracja-A-2-3'));
  test('drugie uruchomienie nic nie robi', A.migracjaPoniedzialku(true) === false);
  // Wariant: poniedzialek tygodnia 2 siedzi pod tygodniem 1 — lancuch 2→3, 1→2.
  czysc();
  zapiszDzien(1, 'A'); zapiszDzien(2, 'A');
  A.migracjaPoniedzialku(true);
  test('lancuch: 2→3 i 1→2, tydzien 1 pusty i pominiety',
    A.tydzienMaDane(3, 'A') && A.tydzienMaDane(2, 'A') && !A.tydzienMaDane(1, 'A') && A.sesjaPominieta('A', 1));
  // Nic nie nadpisuje: pelny cel blokuje ruch.
  czysc();
  zapiszDzien(2, 'A'); zapiszDzien(3, 'A');
  A.migracjaPoniedzialku(true);
  test('pelny tydzien 3 blokuje ruch, dane zostaja', A.tydzienMaDane(2, 'A') && A.tydzienMaDane(3, 'A'));
  czysc();
  S.plan.cykl = cykl;
}

/* ---------- liczba z klawiatury ---------- */
console.log('');
console.log('Liczba z klawiatury');
{
  test('przecinek i kropka', A.parsujLiczbe('72,5') === 72.5 && A.parsujLiczbe('72.5') === 72.5);
  test('spacje nieistotne', A.parsujLiczbe(' 1 00 ') === 100);
  test('smieci daja null', A.parsujLiczbe('') === null && A.parsujLiczbe('abc') === null && A.parsujLiczbe('7,,5') === null && A.parsujLiczbe(null) === null);
  test('ciezar domkniety do kroku 2,5 i zakresu', A.domknijLiczbe(93, { krok: 2.5, min: 0, max: 500 }) === 92.5 && A.domknijLiczbe(900, { krok: 2.5, max: 500 }) === 500);
  test('powtorzenia to liczby calkowite nie mniejsze od zera', A.domknijLiczbe(7.6, { krok: 1, min: 0 }) === 8 && A.domknijLiczbe(-3, { krok: 1, min: 0 }) === 0);

  // Tapnięcie w liczbę serii otwiera arkusz z dużymi przyciskami; ciężar ćwiczenia
  // ma własne pole z klawiaturą pod liczbą kilogramów.
  const W = 4;
  S.week = W;
  for (const k of Object.keys(S.log)) if (+k.split('|')[0] === W) delete S.log[k];
  S.view = '#/d/A'; A.render();
  const boj = S.plan.days.A.items.find(it => A.plannedOf(it, W, 'A').planKg != null);
  const plB = A.plannedOf(boj, W, 'A');
  const karta = app.querySelectorAll('.ex').find(k => k.textContent.includes(boj.name));
  const wiersz = karta.querySelectorAll('.setrow')[0];
  const val = wiersz.querySelector('.setval');
  val.click();
  const ark = document.querySelector('.arkusz');
  test('tapniecie w liczbe otwiera arkusz serii', !!ark && ark.textContent.includes('Seria 1 z'));
  const liczba = ark.querySelectorAll('.krok3-v')[0];
  liczba.click();
  const pole = liczba.querySelector('.wpis');
  test('liczba w arkuszu ma klawiature numeryczna', !!pole && pole.attrs.inputmode === 'numeric');
  pole.value = '6';
  pole.onkeydown({ key: 'Enter', preventDefault() {} });
  ark.querySelectorAll('.btn').find(b => b.textContent.includes('Zapisz')).click();
  test('Zapisz z arkusza odhacza serie z wpisana liczba', val.querySelector('b').textContent === '6'
    && A.logGet(W, 'A', boj.n)[0] && A.logGet(W, 'A', boj.n)[0].r === 6 && wiersz.classList.contains('done') && !document.querySelector('.arkusz'));
  val.click();
  const ark2 = document.querySelector('.arkusz');
  const liczba2 = ark2.querySelectorAll('.krok3-v')[0];
  liczba2.click();
  const pole2 = liczba2.querySelector('.wpis');
  pole2.value = '99';
  pole2.onkeydown({ key: 'Escape', preventDefault() {} });
  ark2.querySelectorAll('.btn').find(b => b.textContent.includes('Anuluj')).click();
  test('Escape i Anuluj nic nie zmieniaja', val.querySelector('b').textContent === '6' && A.logGet(W, 'A', boj.n)[0].r === 6 && !document.querySelector('.arkusz'));
  const kgv = karta.querySelector('.kg-v');
  kgv.click();
  const pk = kgv.querySelector('.wpis');
  test('pole ciezaru ma klawiature dziesietna', !!pk && pk.attrs.inputmode === 'decimal');
  pk.value = '77,5';
  pk.onblur();
  test('zejscie z pola zapisuje ciezar na serii', A.logGet(W, 'A', boj.n)[0].kg === 77.5 && kgv.querySelector('b').textContent === '77,5',
    'log: ' + A.logGet(W, 'A', boj.n)[0].kg + ', pole: ' + kgv.querySelector('b').textContent);
  test('swiatla w naglowku ida za dziennikiem', karta.querySelectorAll('.swiatla')[0].children.filter(x => x.classList.contains('on')).length === 1);
  // Jedno tapnięcie na całe ćwiczenie.
  karta.querySelector('.wszystkie').click();
  test('Zalicz wszystkie serie odhacza reszte', A.logGet(W, 'A', boj.n).filter(Boolean).length === plB.sets
    && karta.querySelectorAll('.setrow').every(r => r.classList.contains('done')));
  for (const k of Object.keys(S.log)) if (+k.split('|')[0] === W) delete S.log[k];
  for (const k of Object.keys(S.kgw)) if (+k.split('|')[0] === W) delete S.kgw[k];
  A.stopTimer();
}

/* ---------- przytrzymanie ✓ i arkusz korekty ---------- */
console.log('');
console.log('Przytrzymanie ✓');
{
  // Czysta logika: krotkie nacisniecie nie wola hold, dlugie wola i polyka nastepny click.
  const el = document.createElement('button');
  let holdy = 0;
  const u = A.przytrzymanie(el, { hold: () => { holdy++; }, ms: 8, luz: 10 });
  u.down({ clientX: 0, clientY: 0 }); u.up();
  await new Promise(r => setTimeout(r, 30));
  test('krotkie nacisniecie nie wola hold', holdy === 0 && !el._trzymane);
  u.down({ clientX: 0, clientY: 0 });
  await new Promise(r => setTimeout(r, 30));
  test('dlugie nacisniecie wola hold i oznacza przycisk', holdy === 1 && el._trzymane === true);
  u.down({ clientX: 0, clientY: 0 }); u.move({ clientX: 30, clientY: 0 });
  await new Promise(r => setTimeout(r, 30));
  test('ruch palca (przewijanie) przerywa odliczanie', holdy === 1);
  el._trzymane = true; u.down({ clientX: 0, clientY: 0 }); u.up();
  test('nowe nacisniecie czysci stara flage po przytrzymaniu', el._trzymane === false);

  // Wiersz serii: tap odhacza, drugi tap nie cofa, arkusz cofa.
  const W = 4;
  S.week = W;
  for (const k of Object.keys(S.log)) if (+k.split('|')[0] === W) delete S.log[k];
  S.view = '#/d/A'; A.render();
  const itA = S.plan.days.A.items.find(it => A.plannedOf(it, W, 'A').sets > 0);
  const wiersz = app.querySelectorAll('.setrow')[0];
  const tick = wiersz.querySelector('.tick');
  tick.click();
  test('tap odhacza serie', wiersz.classList.contains('done') && !!A.logGet(W, 'A', itA.n)[0]);
  tick.click();
  test('drugi tap nie cofa odhaczenia', wiersz.classList.contains('done') && !!A.logGet(W, 'A', itA.n)[0]);
  test('i pokazuje podpowiedz', !!wiersz.querySelector('.podp'));
  tick._trzymane = true; tick.click();
  test('klik po przytrzymaniu jest polkniety', wiersz.classList.contains('done') && !tick._trzymane);
  // hold: arkusz z dwoma stepperami, Cofnij odhaczenie cofa
  tick._hold.down({ clientX: 0, clientY: 0 });
  await new Promise(r => setTimeout(r, 480));
  const ark = document.querySelector('.arkusz');
  test('przytrzymanie otwiera arkusz korekty', !!ark && ark.textContent.includes('Seria 1 z'));
  const plus = ark.querySelectorAll('.krok3-b')[1];
  plus.click();
  const zapisz = ark.querySelectorAll('.btn').find(b => b.textContent.includes('Zapisz'));
  zapisz.click();
  const pl = A.plannedOf(itA, W, 'A');
  test('plus i Zapisz zapisuja o jedno powtorzenie wiecej', A.logGet(W, 'A', itA.n)[0].r === pl.target + 1 && !document.querySelector('.arkusz'));
  tick._trzymane = false;
  tick._hold.down({ clientX: 0, clientY: 0 });
  await new Promise(r => setTimeout(r, 480));
  const ark2 = document.querySelector('.arkusz');
  const cof = ark2.querySelectorAll('.btn').find(b => b.textContent.includes('Cofnij'));
  test('odhaczona seria ma w arkuszu Cofnij odhaczenie', !!cof);
  cof.click();
  test('Cofnij odhaczenie zdejmuje serie z dziennika', !wiersz.classList.contains('done') && !A.logGet(W, 'A', itA.n)[0]);
  tick._trzymane = false;
  tick._hold.down({ clientX: 0, clientY: 0 });
  await new Promise(r => setTimeout(r, 480));
  const ark3 = document.querySelector('.arkusz');
  test('nieodhaczona seria nie ma Cofnij, ma Zapisz serie', !ark3.querySelectorAll('.btn').find(b => b.textContent.includes('Cofnij')) && !!ark3.querySelectorAll('.btn').find(b => b.textContent.includes('Zapisz serię')));
  ark3.querySelectorAll('.btn').find(b => b.textContent.includes('Anuluj')).click();
  test('Anuluj zamyka arkusz bez zapisu', !document.querySelector('.arkusz') && !A.logGet(W, 'A', itA.n)[0]);
  tick._trzymane = false;
  for (const k of Object.keys(S.log)) if (+k.split('|')[0] === W) delete S.log[k];
}

/* ---------- przerwa i powiadomienie ---------- */
console.log('');
console.log('Przerwa i powiadomienie');
{
  test('powiadomienie o koncu przerwy domyslnie wlaczone', S.powiadomPrzerwa === true);
  S.powiadomPrzerwa = false; A.zapiszLokalnie();
  test('przelacznik zapisuje sie w trening.v1', (magazyn.get('trening.v1') || '').includes('"powiadomPrzerwa":false'));
  S.powiadomPrzerwa = true; A.zapiszLokalnie();
  S.view = '#/ustawienia'; A.render();
  test('ustawienia maja przelacznik powiadomienia o koncu przerwy', app.textContent.includes('Powiadomienie o końcu przerwy'));

  S.view = '#/d/A'; A.render();
  A.startTimer(60);
  const przed = A.stanPrzerwy();
  test('timer rusza na 60 s', przed.leci && przed.tTotal === 60);
  const przyciski = timer.querySelectorAll('.tbtn').map(b => b.textContent);
  test('w czasie przerwy kapsula ma +30 s i Pomin, bez presetow', przyciski.includes('+30 s') && przyciski.includes('Pomiń') && !przyciski.includes('60 s'));
  A.przedluzPrzerwe(30);
  const po = A.stanPrzerwy();
  test('+30 s wydluza koniec przerwy o pol minuty', po.tTotal === 90 && po.tEnd - przed.tEnd === 30000 && po.tLeft >= 89);
  timer.querySelectorAll('.tbtn').find(b => b.textContent === 'Pomiń').click();
  const stop = A.stanPrzerwy();
  test('Pomin konczy przerwe, wracaja presety', !stop.leci && stop.tTotal === 0 && timer.querySelectorAll('.tbtn').map(b => b.textContent).includes('60 s'));
  test('+30 s bez trwajacej przerwy nic nie robi', (A.przedluzPrzerwe(30), A.stanPrzerwy().tTotal === 0));
  test('ciezar z klawiatury nie schodzi ponizej 2,5 kg', A.domknijLiczbe(0, { krok: 2.5, min: 2.5, max: 500 }) === 2.5);
}

/* ---------- prowadzenie sesji silowej ---------- */
console.log('');
console.log('Prowadzenie sesji');
{
  const W = 5;
  S.week = W;
  const czysc = () => { for (const k of Object.keys(S.log)) if (+k.split('|')[0] === W) delete S.log[k]; for (const k of Object.keys(S.czasy)) if (+k.split('|')[0] === W) delete S.czasy[k]; delete S.treningi[W + '|A']; delete S.treningi[W + '|B']; };
  czysc();
  // Kolejka: suma serii, superseria przeplatana (plan cyklu 1, dzien B: A1/A2 i B1/B2).
  const kB = A.kolejkaSesji('B', W);
  const sumaB = S.plan.days.B.items.reduce((a, it) => a + A.plannedOf(it, W, 'B').sets, 0);
  test('kolejka ma tyle krokow, ile serii w dniu', kB.length === sumaB && kB.length > 0);
  const a1 = S.plan.days.B.items.find(it => it.superset === 'A1'), a2 = S.plan.days.B.items.find(it => it.superset === 'A2');
  const idx = kB.map(k => k.it.superset || '-');
  const p1 = idx.indexOf('A1'), p2 = idx.indexOf('A2');
  test('superseria przeplata serie pary: A1 s1, A2 s1, A1 s2…', p2 === p1 + 1 && idx[p1 + 2] === 'A1' && idx[p1 + 3] === 'A2' && kB[p1].i === 0 && kB[p1 + 2].i === 1);
  test('kroki poza superseria ida seria po serii', kB[0].it === S.plan.days.B.items[0] && kB[0].i === 0 && kB[1].i === 1);
  test('nastepny krok to pierwszy bez zapisu', A.nastepnyKrok(kB, 'B', W) === 0);
  A.logSet(W, 'B', kB[0].it.n, 0, { r: 5, kg: null, pr: 5, pk: null });
  test('po zapisie pierwszej serii nastepny to drugi krok', A.nastepnyKrok(kB, 'B', W) === 1);
  czysc();

  // Ekran: pierwsza seria dnia A, Zaliczona → zapis, czas serii, przerwa z opisu cwiczenia.
  S.view = '#/d/A'; A.render();
  test('ekran sesji ma przycisk Prowadz sesje', app.querySelectorAll('.prowstart').length === 1 && app.textContent.includes('Prowadź sesję'));
  const prow = A.prowadzSesje('A', W);
  const kA = A.kolejkaSesji('A', W);
  test('tryb prowadzenia otwiera sie na pierwszej serii', !!prow && prow.querySelector('.prnr').textContent === '1/' + kA.length && prow.textContent.includes(kA[0].it.name));
  const okBtn = () => prow.querySelectorAll('.prok')[0];
  prow.querySelector('.pr-powt').querySelectorAll('.krok3-b')[1].click();      // + jedno powtorzenie
  okBtn().click();
  const z0 = A.logGet(W, 'A', kA[0].it.n)[0];
  test('Zaliczona zapisuje serie z ustawiona liczba powtorzen', !!z0 && z0.r === kA[0].pl.target + 1 && z0.pr === kA[0].pl.target);
  test('czas serii zapisany', Array.isArray(S.czasy[W + '|A|' + kA[0].it.n]) && !!S.czasy[W + '|A|' + kA[0].it.n][0]);
  test('trening wystartowal przy pierwszej serii', !!S.treningi[W + '|A'] && !!S.treningi[W + '|A'].start);
  const sek = A.przerwaPo(kA[0].it, 'A', W);
  const st = A.stanPrzerwy();
  test('po serii ekran przerwy z odliczaniem z opisu cwiczenia', st.leci && st.tTotal === sek && !!prow.querySelector('.pr-odl') && !!prow.querySelector('.pr-nast') && prow.querySelector('.pr-nast').textContent.includes(kA[1].it.name));
  prow.querySelectorAll('.prok')[0].click();                   // Dalej →
  test('Dalej konczy przerwe i pokazuje druga serie', !A.stanPrzerwy().leci && prow.querySelector('.prnr').textContent === '2/' + kA.length);
  // Ponowne otwarcie prowadzenia sprzata poprzednia instancje (jeden .prow, stary uchwyt zamkniety).
  const prowBis = A.prowadzSesje('A', W);
  test('ponowne otwarcie zostawia jedna instancje', document.querySelectorAll('.prow').length === 1 && prowBis !== prow);
  prowBis.querySelector('.prx').click();
  const prow3 = A.prowadzSesje('A', W);
  // dalej testujemy na swiezej instancji
  test('po zamknieciu da sie otworzyc znowu', !!prow3 && document.querySelectorAll('.prow').length === 1);
  // Enter w polu liczbowym nie zalicza serii — tylko zapisuje liczbe w stepperze.
  const vPowt = prow3.querySelector('.pr-powt').querySelector('.krok3-v');
  vPowt.click();
  const polePowt = vPowt.querySelector('.wpis');
  polePowt.value = '9';
  polePowt.onkeydown({ key: 'Enter', preventDefault() {}, stopPropagation() {} });
  test('Enter w polu powtorzen ustawia liczbe bez zaliczania serii', vPowt.textContent.startsWith('9') && !A.logGet(W, 'A', kA[1].it.n)[kA[1].i] && prow3.querySelector('.prnr').textContent === '2/' + kA.length);
  vPowt.click();
  const polePowt2 = vPowt.querySelector('.wpis');
  polePowt2.onkeydown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  test('Escape przywraca liczbe ze stepperem (b i jednostka), nie goly tekst', !!vPowt.querySelector('b') && vPowt.querySelector('b').textContent === '9');
  test('kreski postepu: pierwsza zaliczona, druga biezaca', prow3.querySelector('.prkreski').querySelectorAll('i')[0].classList.contains('z') && prow3.querySelector('.prkreski').querySelectorAll('i')[1].classList.contains('teraz'));
  // Ciezar boju w trybie prowadzenia idzie ta sama droga co suwak (kgw).
  const glowny = kA.findIndex(k => k.pl.planKg != null);
  if (glowny >= 0) {
    while (prow3.querySelector('.prnr').textContent.split('/')[0] !== String(glowny + 1)) prow3.querySelectorAll('.prok')[0].click(), (A.stanPrzerwy().leci && prow3.querySelectorAll('.prok')[0].click());
    const kgPrzed = kA[glowny].pl.kg;
    prow3.querySelector('.pr-kg').querySelectorAll('.krok3-b')[1].click();       // +2,5 kg
    test('plus przy ciezarze zapisuje wlasny ciezar boju', A.plannedOf(kA[glowny].it, W, 'A').kg === kgPrzed + 2.5 && S.kgw[W + '|A|' + kA[glowny].it.n] === kgPrzed + 2.5);
    test('ekran pokazuje zaladowany gryf i aktualny ciezar', !!prow3.querySelector('.pr-gryf') && prow3.querySelector('.pr-kg').textContent.includes(fmtPl(kgPrzed + 2.5)));
  }
  prow3.querySelector('.prx').click();
  test('zamkniecie zostawia zapisane serie', !document.querySelector('.prow') && !!A.logGet(W, 'A', kA[0].it.n)[0]);
  if (A.stanPrzerwy().leci) A.stopTimer();

  // Ostatnia seria: bez przerwy, karta zaliczenia.
  czysc();
  kA.slice(0, -1).forEach(k => A.logSet(W, 'A', k.it.n, k.i, { r: k.pl.target, kg: k.pl.kg, pr: k.pl.target, pk: k.pl.planKg }));
  const prow2 = A.prowadzSesje('A', W);
  test('tryb prowadzenia startuje od ostatniej nieodhaczonej serii', prow2.querySelector('.prnr').textContent === kA.length + '/' + kA.length && !!prow2.querySelector('.pr-ost'));
  prow2.querySelectorAll('.prok')[0].click();
  await new Promise(r => setTimeout(r, 320));
  test('ostatnia seria: bez przerwy, prowadzenie zamkniete, karta zaliczenia', !A.stanPrzerwy().leci && !document.querySelector('.prow') && !!document.querySelector('.zal') && A.sesjaKompletna('A', W));
  const zal = document.querySelector('.zal'); if (zal) zal.remove();
  // Karta Dzis: sesja w trakcie → „Prowadź dalej" i nazwa nastepnego cwiczenia.
  czysc();
  A.logSet(W, 'A', kA[0].it.n, 0, { r: kA[0].pl.target, kg: kA[0].pl.kg, pr: kA[0].pl.target, pk: kA[0].pl.planKg });
  const realny = Date.prototype.getDay; Date.prototype.getDay = () => 1;   // poniedzialek → karta Dzis to dzien A
  S.view = '#/'; A.render();
  Date.prototype.getDay = realny;
  const hero = app.querySelector('.dzis-k');
  test('karta Dzis w trakcie sesji prowadzi dalej', !!hero && hero.textContent.includes('Prowadź dalej') && hero.textContent.includes('następna: ' + kA[1].it.name));
  czysc();
}

/* ---------- przyrost od zeszlego tygodnia na karcie Dzis ---------- */
console.log('');
console.log('Przyrost od zeszlego tygodnia');
{
  const W = 3;
  S.week = W;
  const realny = Date.prototype.getDay; Date.prototype.getDay = () => 1;
  S.view = '#/'; A.render();
  Date.prototype.getDay = realny;
  const hero = app.querySelector('.dzis-k');
  const bojA = S.plan.days.A.items.find(it => A.plannedOf(it, W, 'A').planKg != null);
  const teraz = A.plannedOf(bojA, W, 'A').kg, poprz = A.plannedOf(bojA, W - 1, 'A').kg;
  test('karta Dzis mowi, ile dolozyc od zeszlego tygodnia', teraz !== poprz
    ? hero.textContent.includes(fmtPl(Math.abs(teraz - poprz)) + ' kg od zeszłego tygodnia') : !hero.textContent.includes('od zeszłego tygodnia'));
  test('karta Dzis pokazuje ciezar boju', hero.textContent.includes(fmtPl(teraz)));
  S.week = 1; S.view = '#/'; A.render();
  test('w tygodniu 1 nie ma zeszlego tygodnia', !app.querySelector('.dzis-k').textContent.includes('od zeszłego tygodnia'));
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
  test('pole ciezaru startuje na dzwiganym ciezarze', karta.querySelector('.kg-v').textContent.includes(String(planZ).replace('.', ',')));
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
  test('zwinieta karta mowi, co zrobione', /\d+ × \d+/.test(karta.querySelector('.exsum').textContent)
    && karta.querySelectorAll('.swiatla')[0].children.every(x => x.classList.contains('on')));
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
  // z planem cyklu 2 (dzis plan-cykl2.json) ma go zarchiwizowac i zaczac od tygodnia 1.
  const it1 = S.plan.days.A.items.find(x => x.n === 2), pl1 = A.plannedOf(it1, 4, 'A');
  A.logSet(4, 'A', 2, 0, { r: pl1.target, kg: pl1.kg, pr: pl1.target, pk: pl1.planKg });
  S.week = 11; localStorage.setItem('trening.v1', JSON.stringify({ week: 11, e1rm: { bench: 135, front: 102.5, dl: 110 } }));
  const serieC1 = Object.keys(S.log).length;
  app.children = []; timer.children = [];
  const sb2 = { ...sandbox, fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(planCykl2) }) };
  delete sb2.API;
  vm.createContext(sb2);
  for (const plik of ['progresja.js', 'app.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, plik), 'utf8'), sb2, { filename: plik });
  vm.runInContext(`globalThis.API = { state, render, plannedOf, logSet, logGet, kluczSync, archiwum, przerwaPo, judgeWeek, kgOf, raportCyklu, pozycjaBoju, resolve, korektaMaksow, stanLokalny, pullStan };`, sb2);
  const B2 = sb2.API;
  await new Promise(r => setTimeout(r, 20));
  const S2 = B2.state;
  test('plan cyklu 2 wczytany', S2.plan.cykl === 2);
  test('nowy cykl startuje od tygodnia 1', S2.week === 1);
  test('maksy z nowego planu', S2.e1rm.front === 107.5 && S2.e1rm.dl === 120 && S2.e1rm.bench === 135);
  test('dziennik nowego cyklu pusty', Object.keys(S2.log).length === 0);
  const arch = B2.archiwum();
  test('cykl 1 w archiwum z calym dziennikiem', arch[1] && Object.keys(arch[1].log).length === serieC1 && arch[1].week === 11);
  test('osobny klucz synchronizacji cyklu', B2.kluczSync() === S2.key + '-C2');
  test('joga domyslnie krotka', S2.mobShort === true);
  // Ktos, kto zaczal cykl 2 ze starszym planem, ma w pamieci maksy 95/100 i wyciskanie po korekcie.
  S2.korekta = 0;
  S2.e1rm = { front: 95, dl: 100, bench: 137.5 };
  test('korekta maksow dolu wchodzi raz', B2.korektaMaksow(S2.plan) && S2.e1rm.front === 107.5 && S2.e1rm.dl === 120);
  test('korekta nie rusza wyciskania', S2.e1rm.bench === 137.5);
  test('numer korekty jedzie w synchronizacji', B2.stanLokalny().korekta === 3);
  S2.e1rm.front = 110;
  test('drugi raz korekta juz nie wchodzi', !B2.korektaMaksow(S2.plan) && S2.e1rm.front === 110);
  // Baza oddaje stare maksy bez numeru korekty (tak jak u uzytkownika po starcie).
  S2.korekta = 0; S2.e1rm = { front: 95, dl: 100, bench: 135 };
  test('stare maksy z bazy dostaja korekte jeszcze raz', B2.korektaMaksow(S2.plan) && S2.e1rm.front === 107.5);
  S2.korekta = 1; S2.e1rm = { front: 105, dl: 115, bench: 135 };
  test('nowsza wersja poprawia urzadzenie po wersji 1', B2.korektaMaksow(S2.plan) && S2.e1rm.dl === 120 && S2.e1rm.front === 107.5);
  S2.e1rm = { front: 107.5, dl: 120, bench: 135 };
  // Pelna sciezka: start z korekta, potem synchronizacja oddaje z bazy stary stan.
  {
    const staryFetch = sb2.fetch;
    sb2.navigator = { ...sb2.navigator, onLine: true };
    sb2.fetch = url => Promise.resolve({ ok: true, json: () => Promise.resolve(String(url).includes('stan_pull')
      ? [{ ts: new Date(Date.now() + 60000).toISOString(), dane: { week: 1, e1rm: { front: 95, dl: 100, bench: 135 } } }] : null) });
    await B2.pullStan();
    test('synchronizacja ze starymi maksami nie cofa korekty', S2.e1rm.front === 107.5 && S2.e1rm.dl === 120 && S2.korekta === 3);
    sb2.fetch = staryFetch;
    sb2.navigator = { ...sb2.navigator, onLine: false };
  }
  const poz2 = S2.plan.mobility.blocks.flatMap(b => b.items);
  const nazwy1 = new Set(planJson.mobility.blocks.flatMap(b => b.items).map(i => i.name));
  test('nowa joga: 20 pozycji, zadna z cyklu 1', poz2.length === 20 && poz2.every(i => !nazwy1.has(i.name)));
  test('nowa joga: krotka wersja 8-10 pozycji', poz2.filter(i => i.core).length >= 8 && poz2.filter(i => i.core).length <= 10);
  test('nowa joga: kazda pozycja ma kroki, blad, opis i wyszukiwanie filmu', poz2.every(i => i.steps.length >= 4 && i.blad && i.note && i.film));
  test('nowa joga: kazda pozycja ma film (ID YouTube), bez powtorzen', poz2.every(i => /^[A-Za-z0-9_-]{11}$/.test(i.yt || '')) && new Set(poz2.map(i => i.yt)).size === 20);
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
  test('front squat tydz. 1 = 72,5 kg', B2.kgOf('front', 1) === 72.5);
  test('ciag tydz. 1 = 80 kg', B2.kgOf('dl', 1) === 80);
  test('front squat tydz. 10 = 87,5 kg, ciag 97,5 kg', B2.kgOf('front', 10) === 87.5 && B2.kgOf('dl', 10) === 97.5);
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
  test('pole ciezaru przy hantlach i maszynie', app.querySelectorAll('.kgrow').length >= 3);
  test('dzien silowy bez przyciskow filmow', app.querySelectorAll('.film').length === 0);
  S2.view = '#/ustawienia'; B2.render();
  test('archiwum cyklu 1 w Dzienniku', app.textContent.includes('Archiwum · cykl 1') && app.textContent.includes('Kopiuj raport cyklu 1'));
  const pa = S2.plan.days.A.items.find(x => x.n === 2), ppa = B2.plannedOf(pa, 1, 'A');
  B2.logSet(1, 'A', 2, 0, { r: ppa.target, kg: ppa.kg, pr: ppa.target, pk: ppa.planKg });
  test('raport cyklu 2 ma nowe cwiczenia', B2.raportCyklu().includes('Cykl 2') && B2.raportCyklu().includes('Wyciskanie leżąc'));
}

{
  console.log('\nCykl 3: przejscie, plan i rozciaganie');
  // Na localStorage zostaje cykl 2 z poprzedniej sekcji. Maksy po samoregulacji
  // cyklu 2 maja przejsc do cyklu 3 zamiast wartosci awaryjnych z planu.
  const C2 = { bench: 137.5, front: 112.5, dl: 127.5 };
  localStorage.setItem('trening.v1', JSON.stringify({ week: 6, e1rm: C2, korekta: 3 }));
  // Bułgarski w cyklu 2 (dzień A, pozycja 5) dociągnięty w dzienniku do 20 kg, suwak nieruszany.
  const logC2 = JSON.parse(localStorage.getItem('trening.log.v1') || '{}');
  logC2['4|A|5'] = [{ r: 8, kg: 18 }]; logC2['5|A|5'] = [{ r: 8, kg: 20 }, { r: 8, kg: 20 }];
  localStorage.setItem('trening.log.v1', JSON.stringify(logC2));
  localStorage.setItem('trening.acc.v1', '{}');
  const serieC2 = Object.keys(logC2).length;
  app.children = []; timer.children = [];
  const sb3 = { ...sandbox, fetch: url => Promise.resolve({ ok: true, json: () => Promise.resolve(String(url).includes('plan-cykl2') ? planCykl2 : planCykl3) }) };
  delete sb3.API;
  vm.createContext(sb3);
  for (const plik of ['progresja.js', 'app.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, plik), 'utf8'), sb3, { filename: plik });
  vm.runInContext(`globalThis.API = { state, render, plannedOf, logSet, logGet, kluczSync, archiwum, przerwaPo, kgOf, raportCyklu, pozycjaBoju,
    resolve, stanLokalny, bojeDnia, glownyBoj, migracjaPoniedzialku, sesjaPominieta, kolejkaSesji, czasSerii, rozcToggle, rozcDone, rozcKomplet,
    rozcNaDzis, pozycjaDzis, POZYCJA_DNIA, przeniesTydzien, mobItems, zawartoscTygodnia, rozcPozycje, zakresGet, zakresSet, zakresPodpowiedz, zakresHistoria, DZIEN_TYG, SKROT_DNIA, migracjaDniCyklu3, dzisiaj };`, sb3);
  const B3 = sb3.API;
  await new Promise(r => setTimeout(r, 20));
  const S3 = B3.state;
  test('plan cyklu 3 wczytany', S3.plan.cykl === 3 && /kolana i biodra/.test(S3.plan.title));
  test('cykl 3 startuje od tygodnia 1', S3.week === 1);
  test('maksy przechodza z cyklu 2', S3.e1rm.front === C2.front && S3.e1rm.dl === C2.dl && S3.e1rm.bench === C2.bench, JSON.stringify(S3.e1rm));
  test('cykl 2 w archiwum z dziennikiem', B3.archiwum()[2] && Object.keys(B3.archiwum()[2].log).length === serieC2);
  test('osobny, czysty klucz synchronizacji cyklu 3', B3.kluczSync() === S3.key + '-C3b');
  const bulg = S3.plan.days.A.items.find(i => i.name === 'Przysiad bułgarski z hantlami');
  test('ciezar dodatkowego przechodzi z dziennika cyklu 2 po nazwie', B3.plannedOf(bulg, 1, 'A').kg === 20, String(B3.plannedOf(bulg, 1, 'A').kg));
  const gob = S3.plan.days.A.items.find(i => /^Goblet squat z piętami/.test(i.name));
  test('nowe cwiczenie startuje z wartosci z planu', gob && B3.plannedOf(gob, 1, 'A').kg === gob.kgStart);
  test('dziennik cyklu 3 pusty', Object.keys(S3.log).length === 0 && Object.keys(S3.rozc).length === 0);
  const dzis = B3.pozycjaDzis();
  test('dni tygodnia 1 sprzed startu sa pominiete, reszta nie',
    ['A', 'B', 'C'].every(k => B3.sesjaPominieta(k, 1) === (B3.POZYCJA_DNIA[k] < dzis)));
  test('migracja poniedzialku nie dotyka cyklu 3', B3.migracjaPoniedzialku(true) === false && S3.moves.length === 0);

  // Plan: jeden boj na dzien, zawsze pierwszy.
  test('boje jak w cyklu 2: wt wyciskanie, czw bez sztangi, sob przysiad i ciag',
    B3.bojeDnia('A').join() === 'bench' && B3.bojeDnia('B').length === 0 && B3.bojeDnia('C').join() === 'front,dl'
    && S3.plan.days.A.items[0].load.ref && S3.plan.days.C.items[0].load.ref && S3.plan.days.C.items[1].load.ref);
  test('bez maszyn: zadne cwiczenie ani rozgrzewka ich nie wymaga', !/maszyn/i.test(JSON.stringify(S3.plan.days))
    && !/maszyn|bieżni pod górę/i.test(JSON.stringify(S3.plan.warmup.days)));
  test('tydz. 1 = 67,5% maksow z cyklu 2', B3.kgOf('front', 1) === 75 && B3.kgOf('dl', 1) === 85 && B3.kgOf('bench', 1) === 92.5,
    [B3.kgOf('front', 1), B3.kgOf('dl', 1), B3.kgOf('bench', 1)].join('/'));
  for (let w = 1; w <= 12; w++) {
    for (const d of ['A', 'B', 'C']) for (const it of S3.plan.days[d].items) {
      const pl = B3.plannedOf(it, w, d);
      if (!pl.sets || !pl.target) test(`c3 tydz. ${w} ${d}${it.n} ma serie i powtorzenia`, false, String(B3.resolve(it.scheme, w)));
    }
    for (const L of ['bench', 'front', 'dl']) if (!(B3.kgOf(L, w) > 0)) test(`c3 tydz. ${w} ciezar ${L}`, false);
  }
  test('c3: kazde cwiczenie ma serie we wszystkich tygodniach', true);
  const it3 = (d, n) => S3.plan.days[d].items.find(x => x.n === n);
  test('przerwy: przysiad i ciag 3 min', B3.przerwaPo(it3('C', 1), 'C', 5) === 180 && B3.przerwaPo(it3('C', 2), 'C', 5) === 180);
  test('przerwy: wyciskanie 2 min, od bloku 3 2,5 min', B3.przerwaPo(it3('A', 1), 'A', 5) === 120 && B3.przerwaPo(it3('A', 1), 'A', 9) === 150);
  test('przerwy: bulgarski bez przerwy, po podciaganiu 90 s, po skrzyni z wioslowaniem 75 s', B3.przerwaPo(it3('A', 2), 'A', 5) === 0 && B3.przerwaPo(it3('A', 3), 'A', 5) === 90 && B3.przerwaPo(it3('B', 2), 'B', 5) === 75);
  for (const d of ['A', 'B', 'C']) {
    const its = S3.plan.days[d].items;
    for (const it of its.filter(x => x.superset && x.superset.endsWith('2')))
      test(`c3 ${d}: superseria ${it.superset} ma pare tuz przed soba i przerwe po parze`,
        its[its.indexOf(it) - 1].superset === it.superset[0] + '1' && B3.przerwaPo(it, d, 1) >= 45);
    test(`c3 ${d}: kazde cwiczenie ma opis i id, bez filmow`, its.every(x => x.note && /^c3[abc]\d+$/.test(x.id) && !x.film));
    // Budzet godziny: rozgrzewka + drabinka dojsciowa + praca + przerwy z opisu
    // + 15 s na przejscie. Powtorzenia 1,5 × szacunek aplikacji (tempo 3 s w dol),
    // trzymanie na czas i dystans tyle, ile trwa. Drabinka: 4 serie przed pierwszym
    // bojem dnia, 2 przed drugim; dzien bez sztangi jej nie ma.
    for (const w of [1, 6, 10]) {
      const kroki = B3.kolejkaSesji(d, w), boje = B3.bojeDnia(d).length;
      let sek = 7 * 60 + (boje ? 4 * 80 : 0) + Math.max(0, boje - 1) * 2 * 80;
      kroki.forEach((k, i) => { sek += B3.czasSerii(k.it, w, d) * (k.pl.unit ? 1 : 1.5) + 15 + (i < kroki.length - 1 ? B3.przerwaPo(k.it, d, w) : 0); });
      test(`c3 ${d} tydz. ${w} miesci sie w godzinie (~${Math.round(sek / 60)} min)`, sek <= 62 * 60);
    }
  }
  const nazwyC2 = new Set(['A', 'B', 'C'].flatMap(d => planCykl2.days[d].items.map(i => i.name)));
  test('cwiczenia z cyklu 2 maja te same nazwy (suwak pamieta ciezar)',
    ['Przysiad bułgarski z hantlami', 'Wiosłowanie hantlem w podporze', 'Martwy ciąg rumuński jednonóż z hantlem', 'Hip thrust jednonóż z hantlem',
     'Przysiad hiszpański z hantlem (izometria)', 'Spacer farmera jednorącz', 'Face pull z gumą'].every(n => nazwyC2.has(n)
       && ['A', 'B', 'C'].some(d => S3.plan.days[d].items.some(i => i.name === n))));
  const SENS = /skolioz|cobb|przodopochyl|ból|bólu|boles|dolegliw|rehabilit|fizjoterapeu|ortoped|RTG|MRI|diagnoz|leczen|chorob|kontuzj|uraz|skręc|tendinop|patolog|obrzęk|wysięk|drętwi|mrowie|przeciwbólow|specjalist|zwyrodnien|nawrot/i;
  test('plan cyklu 3 bez tresci zdrowotnych', !SENS.test(JSON.stringify(S3.plan)));
  test('joga: te same pozycje co w cyklu 2, zasada o ciezkiej sobocie', JSON.stringify(S3.plan.mobility.blocks) === JSON.stringify(planCykl2.mobility.blocks)
    && S3.plan.mobility.rules.some(l => l.includes('Po ciężkiej sobocie')));

  // Rozgrzewka: pelna drabinka do boju dnia, bez skroconej tabeli „Przed ciągiem".
  S3.view = '#/d/C'; B3.render();
  // Atrapa nie parsuje innerHTML — sprawdzamy wygenerowany kod tabel.
  const tabeleC = app.querySelectorAll('table').map(t => t.innerHTML).join('');
  test('rozgrzewka C: pelna drabinka do przysiadu i skrocona do ciagu', /Serie dojściowe.*Front squat/.test(tabeleC) && /Przed ciągiem.*Martwy ciąg/.test(tabeleC));
  S3.view = '#/d/A'; B3.render();
  test('rozgrzewka A: drabinka do wyciskania', /Serie dojściowe.*Wyciskanie/.test(app.querySelectorAll('table').map(t => t.innerHTML).join('')));
  S3.view = '#/d/B'; B3.render();
  test('dzien B bez sztangi: bez tabeli serii dojsciowych', app.querySelectorAll('table').length === 0 && app.textContent.includes('Wejście na skrzynię'));

  // Rozciaganie we wtorek i czwartek.
  const R = S3.plan.rozciaganie;
  test('rozciaganie: sroda i piatek (dni bez silowni)', R && R.dni.map(x => x.dzien).join() === '3,5');
  test('rozciaganie: kazda pozycja ma kroki, blad, opis, minutnik i wyszukiwanie filmu',
    R.items.length >= 5 && R.items.every(i => i.steps.length >= 4 && i.blad && i.note && i.film && i.sec > 0));
  const idJogi = new Set(B3.mobItems().map(i => i.id));
  test('rozciaganie: unikalne id, inne niz w jodze', new Set(R.items.map(i => i.id)).size === R.items.length && R.items.every(i => !idJogi.has(i.id)));
  for (const v of ['#/rozciaganie/sr', '#/rozciaganie/pt/3', '#/rozciaganie']) {
    S3.view = v; let blad = null;
    try { B3.render(); } catch (e) { blad = e; }
    test('cykl 3 renderuje ' + v, !blad && app.textContent.includes('Rozciąganie'), blad && blad.stack);
  }
  // Test zakresow: blok w danych, kolejnosc sesji, poziomy.
  const ZK = R.zakresy, N = R.items.length + ZK.items.length;
  test('test zakresow: 4 pozycje z poziomami, ocenami i opisem', ZK && ZK.items.length === 4
    && ZK.items.every(i => i.poziomy.length >= 4 && i.steps.length >= 4 && i.blad && i.note && i.film && i.sec > 0)
    && ZK.oceny.map(o => o.v).join() === '0,1,2');
  test('test zakresow: id unikalne wobec rozciagania i jogi', new Set([...R.items, ...ZK.items].map(i => i.id)).size === N && ZK.items.every(i => !idJogi.has(i.id)));
  const kolej = B3.rozcPozycje().map(i => i.id);
  test('kolejnosc sesji: rozciaganie, zakresy, oddech na koniec', kolej.length === N && kolej[N - 1] === 'r6' && kolej.indexOf('q1') === R.items.length - 1);
  S3.view = '#/rozciaganie/pt'; B3.render();
  test('widok rozciagania: przelacznik dni, prowadzenie i wszystkie karty', app.querySelectorAll('.mobopt').length === 2
    && !!app.querySelector('.prowstart') && app.querySelectorAll('.ex.mob').length === N);
  test('karta rozciagania: etykieta „Po co", nie „Pod sztangę"', app.textContent.includes('Po co') && !app.textContent.includes('Pod sztangę'));
  test('panel zakresu na kazdej pozycji testu: strzalki i trzy oceny', app.querySelectorAll('.zakres').length === 4
    && app.querySelectorAll('.zoc').length === 12 && app.querySelectorAll('.zstr').length === 8);
  test('historia i zasady testu w widoku', app.textContent.includes('Zakresy tydzień po tygodniu') && app.textContent.includes('Jak prowadzić test zakresów'));
  test('bez zapisu: podpowiedz poziom 1', B3.zakresPodpowiedz(1, 'sr', 'q1').p === 1 && app.textContent.includes('Poziom 1 z 5'));

  B3.rozcToggle(1, 'sr', 'r1');
  test('odhaczenie liczy sie per tydzien i dzien', B3.rozcDone(1, 'sr') === 1 && B3.rozcDone(1, 'pt') === 0 && B3.rozcDone(2, 'sr') === 0);
  test('rozciaganie jedzie w paczce stanu', B3.stanLokalny().rozc['1|sr'].r1 === 1);
  B3.rozcToggle(1, 'sr', 'r1');
  test('drugie tapniecie cofa i sprzata klucz', B3.rozcDone(1, 'sr') === 0 && !S3.rozc['1|sr']);

  // Ocena zapisuje poziom i ocene, liczy sie jako zrobione i jedzie w paczce stanu.
  B3.zakresSet(1, 'sr', 'q1', { p: 2, o: 1 });
  test('ocena zapisana pod tydzien|dzien|z', B3.stanLokalny().rozc['1|sr|z'].q1.p === 2 && B3.rozcDone(1, 'sr') === 1);
  test('jedna sesja na poziomie: ten sam poziom', B3.zakresPodpowiedz(1, 'pt', 'q1').p === 2);
  B3.zakresSet(1, 'pt', 'q1', { p: 2, o: 0 });
  test('dwa razy bez reakcji stawu: o poziom wyzej', B3.zakresPodpowiedz(2, 'sr', 'q1').p === 3);
  B3.zakresSet(2, 'sr', 'q1', { p: 3, o: 2 });
  test('po ocenie 2: poziom nizej', B3.zakresPodpowiedz(2, 'pt', 'q1').p === 2);
  test('podpowiedz patrzy tylko wstecz', B3.zakresPodpowiedz(1, 'pt', 'q1').p === 2 && B3.zakresHistoria('q1', null).length === 3);
  B3.zakresSet(1, 'sr', 'q4', { p: 4, o: 0 }); B3.zakresSet(1, 'pt', 'q4', { p: 4, o: 1 });
  test('ostatni poziom nie rosnie dalej', B3.zakresPodpowiedz(2, 'sr', 'q4').p === 4);
  S3.view = '#/rozciaganie/sr/2'; B3.render();
  test('panel po ocenie 2 mowi, zeby wyjsc z pozycji', app.textContent.includes('Wyjdź z pozycji') && app.querySelectorAll('.zoc.on.z2').length === 1);
  test('historia pokazuje zapisy', app.querySelectorAll('.zh').length === 5);
  test('raport cyklu ma linie zakresow', B3.raportCyklu().includes('Zakresy Śr: Siad na piętach z podkładką poz. 2/5 · ciągnie w mięśniu'));
  B3.przeniesTydzien(2, 5);
  test('przeniesienie tygodnia zabiera tez test zakresow', !!B3.zakresGet(5, 'sr', 'q1') && !B3.zakresGet(2, 'sr', 'q1'));
  B3.przeniesTydzien(5, 2);
  // ✓ na pozycji testu bez oceny = „spokojnie" na podpowiadanym poziomie; drugi ✓ kasuje.
  const podp = B3.zakresPodpowiedz(3, 'sr', 'q1').p;
  B3.rozcToggle(3, 'sr', 'q1');
  test('✓ bez oceny zapisuje 0 na podpowiadanym poziomie (po ocenie 2 na poz. 3 → 2)', podp === 2 && JSON.stringify(B3.zakresGet(3, 'sr', 'q1')) === JSON.stringify({ p: 2, o: 0 }));
  B3.rozcToggle(3, 'sr', 'q1');
  test('drugi ✓ kasuje zapis testu', !B3.zakresGet(3, 'sr', 'q1') && !S3.rozc['3|sr|z']);
  for (const k of Object.keys(S3.rozc)) delete S3.rozc[k];

  for (const i of B3.rozcPozycje()) B3.rozcToggle(1, 'pt', i.id);
  test('komplet czwartku wymaga tez testu zakresow', B3.rozcKomplet(1, 'pt') && !B3.rozcKomplet(1, 'sr') && B3.rozcDone(1, 'pt') === N);
  S3.view = '#/'; B3.render();
  test('Dzis: rozciaganie i zakresy w tygodniu, piatek zrobiony', app.textContent.includes('Rozciąganie i zakresy')
    && app.querySelectorAll('.wiersz').some(r => r.textContent.includes('Piątek') && r.querySelectorAll('.wstan')[0].classList.contains('ok')));
  test('raport cyklu liczy rozciaganie', B3.raportCyklu().includes(`Rozciąganie — Pt ${N}/${N}`));
  test('rozciaganie nie zmienia zawartosci tygodnia dla dni A–D', B3.zawartoscTygodnia(1).serie === 0 && B3.zawartoscTygodnia(1).mob === 0);
  B3.przeniesTydzien(1, 4);
  test('przeniesienie calego tygodnia zabiera rozciaganie', B3.rozcKomplet(4, 'pt') && !B3.rozcKomplet(1, 'pt'));
  B3.przeniesTydzien(4, 1);

  for (const v of ['#/', '#/d/A', '#/d/B', '#/d/C', '#/mobilnosc', '#/postep', '#/zasady', '#/1rm', '#/ustawienia']) {
    S3.view = v; let blad = null;
    try { B3.render(); } catch (e) { blad = e; }
    test('cykl 3 renderuje ' + v, !blad && app.children.length > 0, blad && blad.stack);
  }
  S3.view = '#/ustawienia'; B3.render();
  test('archiwum cyklu 2 w Dzienniku', app.textContent.includes('Archiwum · cykl 2') && app.textContent.includes('Kopiuj raport cyklu 2'));
  S3.view = '#/zasady'; B3.render();
  // Dni tygodnia z planu: wt/czw/sob + niedziela, jak w dzienniku cyklu 2.
  test('cykl 3: sesje we wtorek, czwartek i sobote', JSON.stringify(B3.DZIEN_TYG) === JSON.stringify({ 0: 'D', 2: 'A', 4: 'B', 6: 'C' })
    && B3.POZYCJA_DNIA.A === 1 && B3.POZYCJA_DNIA.B === 3 && B3.POZYCJA_DNIA.C === 5 && B3.POZYCJA_DNIA.D === 6);
  S3.view = '#/'; B3.render();
  const rodzaje = app.querySelectorAll('.d7-z').map(z => ['wolne', 'sila', 'ruch'].find(c => z.classList.contains(c)));
  test('pasek tygodnia: pn wolne, wt A, sr rozciaganie, czw B, pt rozciaganie, sob C, nd joga',
    rodzaje.join() === 'wolne,sila,ruch,sila,ruch,sila,ruch', rodzaje.join());
  // Jednorazowa poprawka dla urządzenia, które zaczęło cykl 3 ze starym układem pn/śr/pt.
  localStorage.setItem('trening.migracja.v1', '{}');
  S3.week = 1;
  Object.assign(S3.pominiete, { '1|A': true, '1|B': true, '1|C': true });
  for (const k of Object.keys(S3.rozc)) delete S3.rozc[k];
  S3.rozc['1|wt'] = { r1: 1 }; S3.rozc['1|cz|z'] = { q1: { p: 2, o: 0 } };
  const dzisM = B3.pozycjaDzis();
  test('migracja dni zwraca zmiane', B3.migracjaDniCyklu3(true) === true);
  test('pominiecie zostaje tylko na dniach, ktore juz minely', ['A', 'B', 'C'].every(k => !!S3.pominiete['1|' + k] === (B3.POZYCJA_DNIA[k] < dzisM)));
  test('rozciaganie wt/czw przepiete na sr/pt', S3.rozc['1|sr'].r1 === 1 && S3.rozc['1|pt|z'].q1.p === 2 && !S3.rozc['1|wt'] && !S3.rozc['1|cz|z']);
  test('migracja dni tylko raz', B3.migracjaDniCyklu3(true) === false);
  for (const k of Object.keys(S3.rozc)) delete S3.rozc[k];
  for (const k of Object.keys(S3.pominiete)) delete S3.pominiete[k];
  S3.view = '#/zasady'; B3.render();
  test('zasady: wt A, sr i pt rozciaganie, sob C', app.textContent.includes('Wtorek — Dzień A') && app.textContent.includes('Środa — rozciąganie') && app.textContent.includes('Sobota — Dzień C'));
}

{
  console.log('\nCykl 4: przejscie, plan, stawy i minutnik');
  // Urządzenie w cyklu 3, tydzień 1: czwartek (dzień B) częściowo zrobiony w tym tygodniu.
  const ts = new Date().toISOString();
  const trzy = (r, kg) => [0, 1, 2].map(() => ({ r, kg, ts, pr: r, pk: null }));
  const C3 = { bench: 150, front: 135, dl: 135 };
  for (const k of ['trening.kgw.v1', 'trening.mob.v1', 'trening.rozc.v1', 'trening.rekal.v1', 'trening.adjust.v1', 'trening.czasy.v1', 'trening.pominiete.v1', 'trening.queue.v1', 'trening.moves.v1']) localStorage.removeItem(k);
  localStorage.setItem('trening.cykl.v1', '3');
  localStorage.setItem('trening.v1', JSON.stringify({ week: 1, e1rm: C3, korekta: 3 }));
  localStorage.setItem('trening.acc.v1', '{}');
  // stary plan B: 1 skrzynia, 3 hip thrust jednonóż (w cyklu 4 go nie ma), 6 deska boczna
  localStorage.setItem('trening.log.v1', JSON.stringify({ '1|B|1': trzy(8, 10), '1|B|3': trzy(10, 10), '1|B|6': [{ r: 8, ts }, { r: 8, ts }, { r: 15, ts }] }));
  localStorage.setItem('trening.treningi.v1', JSON.stringify({ '1|B': { start: ts, end: null } }));
  app.children = []; timer.children = [];
  const sb4 = { ...sandbox, fetch: url => Promise.resolve({ ok: true, json: () => Promise.resolve(String(url).includes('plan-cykl3') ? planCykl3 : planBiezacy) }) };
  delete sb4.API;
  vm.createContext(sb4);
  for (const plik of ['progresja.js', 'app.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, plik), 'utf8'), sb4, { filename: plik });
  vm.runInContext(`globalThis.API = { state, render, plannedOf, logSet, logGet, kluczSync, archiwum, przerwaPo, kgOf, raportCyklu, resolve, bojeDnia,
    sesjaPominieta, kolejkaSesji, czasSerii, rozcPozycje, bilansStawow, fazySerii, biegSerii, startTimer, stopTimer, stanPrzerwy, jednostka, naCzas,
    pozycjaDzis, POZYCJA_DNIA, DZIEN_TYG, trening, prowadzSesje, STAWY, ukladTygodnia, mobItems };`, sb4);
  const B4 = sb4.API;
  await new Promise(r => setTimeout(r, 60));
  const S4 = B4.state, D = S4.plan.days;
  const it4 = (d, wzor) => D[d].items.find(x => wzor.test(x.name));
  test('plan cyklu 4 wczytany', S4.plan.cykl === 4 && /kolana, kostki, biodra/.test(S4.plan.title));
  test('cykl 4 startuje od tygodnia 1 z maksami z cyklu 3', S4.week === 1 && S4.e1rm.bench === 150 && S4.e1rm.front === 135 && S4.e1rm.dl === 135);
  test('cykl 3 w archiwum', B4.archiwum()[3] && Object.keys(B4.archiwum()[3].log).length === 3);
  test('czysty klucz synchronizacji cyklu 4', B4.kluczSync() === S4.key + '-C4');
  test('dni: wtorek A, czwartek B, sobota C, niedziela joga', JSON.stringify(B4.DZIEN_TYG) === JSON.stringify({ 0: 'D', 2: 'A', 4: 'B', 6: 'C' }));

  // Sesja z tego tygodnia przechodzi po nazwach ćwiczeń; reszta zostaje w archiwum.
  const skrzynia = it4('B', /^Wejście na skrzynię/), deska = it4('B', /^Deska boczna/);
  test('serie z tego tygodnia przechodza do tygodnia 1 po nazwie cwiczenia',
    B4.logGet(1, 'B', skrzynia.n).filter(Boolean).length === 3 && B4.logGet(1, 'B', skrzynia.n)[0].kg === 10
    && B4.logGet(1, 'B', deska.n).map(r => r.r).join() === '8,8,15');
  test('cwiczenie, ktorego nie ma w nowym planie, zostaje tylko w archiwum',
    Object.keys(S4.log).length === 2 && !D.B.items.some(x => /^Hip thrust/.test(x.name)));
  test('czwartek z przeniesionymi seriami nie jest pominiety i ma start treningu', !B4.sesjaPominieta('B', 1) && !!B4.trening(1, 'B'));
  test('ciezar hantli z dziennika cyklu 3 trafia do nowego planu', B4.plannedOf(skrzynia, 2, 'B').kg === 10);
  test('dni sprzed startu bez zapisu sa pominiete', ['A', 'C'].every(k => B4.sesjaPominieta(k, 1) === (B4.POZYCJA_DNIA[k] < B4.pozycjaDzis())));

  // Plan: boje w swoich dniach, bez maszyn, każde ćwiczenie ma cel.
  test('boje: wt wyciskanie, czw bez sztangi, sob przysiad i ciag',
    B4.bojeDnia('A').join() === 'bench' && B4.bojeDnia('B').length === 0 && B4.bojeDnia('C').join() === 'front,dl');
  test('bez maszyn', !/maszyn/i.test(JSON.stringify(D)) && !/bieżni|rower/i.test(JSON.stringify(S4.plan.warmup.days)));
  const CELE = ['kolano', 'kostka', 'biodro', 'gora', 'tulow', 'kondycja'];
  test('kazde cwiczenie ma cel z dozwolonej listy, id i opis', ['A', 'B', 'C'].every(d => D[d].items.every(x =>
    Array.isArray(x.cel) && x.cel.length && x.cel.every(c => CELE.includes(c)) && /^c4[abc]\d+$/.test(x.id) && x.note)));
  let zle4 = '';
  for (let w = 1; w <= 12; w++) for (const d of ['A', 'B', 'C']) for (const x of D[d].items) {
    const pl = B4.plannedOf(x, w, d);
    if (!pl.sets || !pl.target) zle4 += ` ${w}${d}${x.n}`;
  }
  test('kazde cwiczenie ma serie i cel w kazdym tygodniu', zle4 === '', zle4);
  const dodatkowe = ['A', 'B', 'C'].flatMap(d => D[d].items.filter(x => x.scheme.tyg).map(x => [d, x]));
  test('tydzien 7 i 12: cwiczenia dodatkowe po 2 serie', dodatkowe.length >= 15 && dodatkowe.every(([d, x]) => B4.plannedOf(x, 7, d).sets === 2 && B4.plannedOf(x, 12, d).sets === 2));
  const bulg = it4('A', /^Przysiad bułgarski/);
  test('schemat zmienia sie miedzy blokami (bulgarski 3 × 8 → 3 × 6)', B4.plannedOf(bulg, 2, 'A').target === 8 && B4.plannedOf(bulg, 9, 'A').target === 6);
  test('tydz. 1 = 67,5% maksow', B4.kgOf('bench', 1) === 100 && B4.kgOf('front', 1) === 90 && B4.kgOf('dl', 1) === 90);

  // Worek i serie na czas.
  const worek = it4('A', /^Worek/), kopen = it4('B', /kopenhaski/), hiszp = it4('B', /hiszpański/);
  const plW = B4.plannedOf(worek, 1, 'A');
  test('rundy na worku: 3 × 2 min, od bloku 3 3 × 3 min', plW.sets === 3 && plW.target === 2 && B4.jednostka(plW) === 'min' && B4.naCzas(plW)
    && B4.plannedOf(worek, 9, 'A').target === 3 && B4.czasSerii(worek, 1, 'A') === 120);
  const fW = B4.fazySerii(worek, plW, 1), fK = B4.fazySerii(kopen, B4.plannedOf(kopen, 1, 'B'), 1), fH = B4.fazySerii(hiszp, B4.plannedOf(hiszp, 1, 'B'), 1);
  test('runda: 5 s na ustawienie, potem 2 min z gongiem', fW.map(f => f.tryb + f.sek).join() === 'start5,praca120' && fW[1].dzwiek === 'runda');
  test('cwiczenie na strone: przygotowanie, strona, zmiana, strona', fK.map(f => f.tryb + f.sek).join() === 'start5,praca25,start5,praca25' && fK[3].etykieta === 'Strona 2 z 2');
  test('izometria obunoz: jedna faza pracy', fH.map(f => f.tryb + f.sek).join() === 'start5,praca45');
  let koniec = 0;
  B4.biegSerii(hiszp, B4.plannedOf(hiszp, 1, 'B'), 1, 'B', { naKoniec: () => { koniec++; } });
  const stB = B4.stanPrzerwy();
  test('minutnik serii rusza od przygotowania', stB.leci && stB.tryb === 'start' && stB.etykieta === 'Przygotuj się' && stB.tTotal === 5);
  test('pasek zegara w trybie serii ma przycisk Przerwij', timer.querySelectorAll('.tbtn').some(b => b.textContent === 'Przerwij'));
  B4.stopTimer();
  test('przerwanie minutnika nie zalicza serii', koniec === 0 && !B4.stanPrzerwy().leci && B4.stanPrzerwy().tryb === 'przerwa');

  // Przerwy: wyciskanie w parze z piszczelowym.
  const bench = D.A.items[0], pisz = D.A.items[1];
  test('wyciskanie w parze: bez przerwy po sztandze, 90 s po piszczelowym, od bloku 3 2 min',
    bench.superset === 'A1' && pisz.superset === 'A2' && B4.przerwaPo(bench, 'A', 5) === 0 && B4.przerwaPo(pisz, 'A', 5) === 90 && B4.przerwaPo(pisz, 'A', 9) === 120);
  test('przysiad i ciag: 3 min', B4.przerwaPo(D.C.items[0], 'C', 5) === 180 && B4.przerwaPo(D.C.items[1], 'C', 5) === 180);
  for (const d of ['A', 'B', 'C']) {
    const its = D[d].items;
    test(`c4 ${d}: superserie maja pare tuz przed soba i przerwe po parze`, its.filter(x => x.superset && x.superset.endsWith('2'))
      .every(x => its[its.indexOf(x) - 1].superset === x.superset[0] + '1' && B4.przerwaPo(x, d, 1) >= 45));
    for (const w of [1, 6, 10]) {
      const kroki = B4.kolejkaSesji(d, w), boje = B4.bojeDnia(d).length;
      let sek = 7 * 60 + (boje ? 4 * 80 : 0) + Math.max(0, boje - 1) * 2 * 80;
      kroki.forEach((k, i) => { sek += B4.czasSerii(k.it, w, d) * (k.pl.unit ? 1 : 1.5) + 15 + (i < kroki.length - 1 ? B4.przerwaPo(k.it, d, w) : 0); });
      test(`c4 ${d} tydz. ${w} miesci sie w godzinie (~${Math.round(sek / 60)} min)`, sek <= 62 * 60);
    }
  }

  // Bilans stawów.
  for (const k of Object.keys(S4.log)) delete S4.log[k];
  const b0 = B4.bilansStawow(1);
  test('bilans: kazdy staw ma zaplanowane serie, nic nie zrobione', B4.STAWY.every(s => b0[s.k].total >= 12 && b0[s.k].done === 0), JSON.stringify(b0));
  B4.logSet(1, 'A', bulg.n, 0, { r: 8, kg: 15, pr: 8, pk: null });
  const b1 = B4.bilansStawow(1);
  test('seria bulgarskiego liczy sie kolanu i biodru, nie kostce', b1.kolano.done === 1 && b1.biodro.done === 1 && b1.kostka.done === 0);
  test('tydzien 7 ma mniej zaplanowanych serii', B4.bilansStawow(7).kolano.total < b0.kolano.total);

  const SENS = /skolioz|cobb|przodopochyl|ból|bólu|boles|dolegliw|rehabilit|fizjoterapeu|ortoped|RTG|MRI|diagnoz|leczen|chorob|kontuzj|uraz|skręc|tendinop|patolog|obrzęk|wysięk|drętwi|mrowie|przeciwbólow|specjalist|zwyrodnien|nawrot/i;
  test('plan cyklu 4 bez tresci zdrowotnych', !SENS.test(JSON.stringify(S4.plan)));
  test('rozciaganie: 7 pozycji + 4 testy zakresow, rownowaga przed oddechem',
    B4.rozcPozycje().length === 11 && B4.rozcPozycje().slice(-2).map(i => i.id).join() === 'r7,r6');
  test('joga: te same pozycje co w cyklu 2', JSON.stringify(S4.plan.mobility.blocks) === JSON.stringify(planCykl2.mobility.blocks));

  // Ekrany.
  for (const v of ['#/', '#/d/A', '#/d/B', '#/d/C', '#/d/B/7', '#/mobilnosc', '#/rozciaganie/sr', '#/rozciaganie/pt/3', '#/postep', '#/plan', '#/zasady', '#/1rm', '#/ustawienia']) {
    S4.view = v; let blad = null;
    try { B4.render(); } catch (e) { blad = e; }
    test('cykl 4 renderuje ' + v, !blad && app.children.length > 0, blad && blad.stack);
  }
  S4.view = '#/'; B4.render();
  test('Dzis: karta sesji, mapa stawow z trzema stawami, pasek 7 dni',
    app.querySelectorAll('.dzis-k').length === 1 && app.querySelectorAll('.st-w').length === 3 && app.querySelectorAll('.d7').length === 7);
  test('Dzis: wiersze tygodnia w kolejnosci dni', app.querySelectorAll('.wiersz').length === 5);
  S4.view = '#/d/A'; B4.render();
  const karty = app.querySelectorAll('.ex');
  test('sesja: kazda karta ma swiatla serii i znaczek celu', karty.length === D.A.items.length && karty.every(k => k.querySelectorAll('.swiatla').length === 1 && k.querySelectorAll('.cele').length === 1));
  const kartaWorka = karty.find(k => k.textContent.includes('Worek'));
  test('rundy maja przycisk minutnika przy kazdej serii', kartaWorka.querySelectorAll('.sstart').length === 3 && kartaWorka.textContent.includes('min'));
  test('sesja bez suwakow', app.querySelectorAll('.suwak').length === 0);
  S4.view = '#/plan'; B4.render();
  test('Plan: fazy cyklu, szesc dni i zasady', app.querySelectorAll('.fz').length === 5 && app.querySelectorAll('.pl-dz').length === 6
    && app.textContent.includes('Trzy stawy') && app.textContent.includes('Worek'));
  test('zakladka Plan jest aktywna', timer.querySelectorAll('.tab').find(t => t.classList.contains('on')).textContent.includes('Plan'));
  S4.view = '#/postep'; B4.render();
  test('Postep: stawy tydzien po tygodniu i zakresy', app.textContent.includes('Stawy tydzień po tygodniu') && app.querySelectorAll('.sth-rz').length === 3 && app.textContent.includes('Zakresy tydzień po tygodniu'));
  // Prowadzenie: seria na czas pokazuje minutnik zamiast licznika powtórzeń.
  for (const k of Object.keys(S4.log)) delete S4.log[k];
  D.A.items.filter(x => x !== worek).forEach(x => { const pl = B4.plannedOf(x, 1, 'A'); for (let i = 0; i < pl.sets; i++) B4.logSet(1, 'A', x.n, i, { r: pl.target, kg: pl.kg, pr: pl.target, pk: pl.planKg }); });
  const prow4 = B4.prowadzSesje('A', 1);
  test('prowadzenie rundy: minutnik ze startem, bez licznika powtorzen', !!prow4.querySelector('.pr-czas') && !!prow4.querySelector('.pr-startczas') && !prow4.querySelector('.pr-powt')
    && prow4.querySelector('.pr-zegar').textContent === '2:00');
  prow4.querySelector('.pr-startczas').click();
  test('start minutnika w prowadzeniu rusza serie na czas', B4.stanPrzerwy().leci && B4.stanPrzerwy().tryb === 'start');
  prow4.querySelector('.prx').click();
  test('wyjscie z prowadzenia zatrzymuje minutnik serii', !B4.stanPrzerwy().leci && !document.querySelector('.prow'));
  for (const k of Object.keys(S4.log)) delete S4.log[k];
}

console.log('\n' + (zle ? `${zle} BLEDOW, ${ok} ok` : `Wszystkie ${ok} testow przeszlo`));
process.exit(zle ? 1 : 0);
