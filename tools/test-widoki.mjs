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
import vm from 'node:vm';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..');

let ok = 0, zle = 0;
const test = (nazwa, warunek, dopisek = '') => {
  if (warunek) { ok++; console.log('  OK   ' + nazwa); }
  else { zle++; console.log('  BLAD ' + nazwa + (dopisek ? '\n         ' + dopisek : '')); }
};

/* ---------- minimalny DOM ---------- */
class Klasy {
  constructor(el) { this.el = el; }
  add(...n) { for (const x of n) { if (/\s/.test(x)) throw new Error('classList.add ze spacja: ' + x); this.el._cls.add(x); } }
  remove(...n) { for (const x of n) this.el._cls.delete(x); }
  toggle(n, si) { const ma = si === undefined ? !this.el._cls.has(n) : si; ma ? this.el._cls.add(n) : this.el._cls.delete(n); }
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

console.log('\n' + (zle ? `${zle} BLEDOW, ${ok} ok` : `Wszystkie ${ok} testow przeszlo`));
process.exit(zle ? 1 : 0);
