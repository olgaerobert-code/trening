/* Figurki ćwiczeń: parametryczny ludzik w widoku z boku.
 *
 * Każde ćwiczenie to dwie pozy (A i B) opisane kątami odcinków ciała, a nie
 * współrzędnymi — dzięki temu kończyny mają stałą długość, a ruch między pozami
 * wygląda jak ruch, nie jak rozciąganie gumy. Z póz powstaje SVG z animacją SMIL
 * (bez pętli w JS): kilkanaście klatek pośrednich liczonych z interpolacji kątów.
 *
 * Kąty w stopniach, kierunek odcinka od stawu bliższego do dalszego:
 * 0 = w prawo, 90 = w dół, -90 = w górę, 180 = w lewo. Ludzik patrzy w prawo.
 *
 * Plik działa w przeglądarce (globalne `Figury`) i w Node (module.exports).
 */
(function (root) {
  const UDO = 24, PODUDZIE = 24, TULOW = 28, RAMIE = 18, PRZEDRAMIE = 17, STOPA = 10, SZYJA = 11, GLOWA = 6.6;
  const ZIEMIA = 104;
  const rad = d => d * Math.PI / 180;
  const krok = (p, kat, dl) => [p[0] + Math.cos(rad(kat)) * dl, p[1] + Math.sin(rad(kat)) * dl];
  const wstecz = (p, kat, dl) => krok(p, kat, -dl);

  /* Poza → punkty. Kotwica mówi, który punkt stoi w miejscu:
     's' kostka bliższej nogi, 's2' dalszej, 'p' palce bliższej stopy, 'k' kolano,
     'h' biodro, 'd' nadgarstek bliższej ręki. */
  function punkty(q) {
    const n = q.n || [90, 90, 0], n2 = q.n2 || n, r = q.r || [90, 90], r2 = q.r2 || r;
    const t = q.t == null ? -90 : q.t, [typ, ax, ay] = q.a;
    let bio;
    if (typ === 's') bio = wstecz(wstecz([ax, ay], n[1], PODUDZIE), n[0], UDO);
    else if (typ === 's2') bio = wstecz(wstecz([ax, ay], n2[1], PODUDZIE), n2[0], UDO);
    else if (typ === 'p') bio = wstecz(wstecz(wstecz([ax, ay], n[2], STOPA), n[1], PODUDZIE), n[0], UDO);
    else if (typ === 'k') bio = wstecz([ax, ay], n[0], UDO);
    else if (typ === 'd') bio = wstecz(wstecz(wstecz([ax, ay], r[1], PRZEDRAMIE), r[0], RAMIE), t, TULOW);
    else bio = [ax, ay];
    const bark = krok(bio, t, TULOW);
    const kol = krok(bio, n[0], UDO), kos = krok(kol, n[1], PODUDZIE), pal = krok(kos, n[2], STOPA);
    const kol2 = krok(bio, n2[0], UDO), kos2 = krok(kol2, n2[1], PODUDZIE), pal2 = krok(kos2, n2[2], STOPA);
    const lok = krok(bark, r[0], RAMIE), nad = krok(lok, r[1], PRZEDRAMIE);
    const lok2 = krok(bark, r2[0], RAMIE), nad2 = krok(lok2, r2[1], PRZEDRAMIE);
    const glowa = krok(bark, q.g == null ? t : q.g, SZYJA);
    return { bio, bark, kol, kos, pal, kol2, kos2, pal2, lok, nad, lok2, nad2, glowa };
  }

  const lerp = (a, b, u) => a + (b - a) * u;
  const mieszaj = (A, B, u) => {
    const tab = (x, y, dom) => (x || y || dom).map((_, i) => lerp((x || dom)[i], (y || x || dom)[i], u));
    const nA = A.n || [90, 90, 0], nB = B.n || nA, rA = A.r || [90, 90], rB = B.r || rA;
    return {
      a: [A.a[0], lerp(A.a[1], B.a[1], u), lerp(A.a[2], B.a[2], u)],
      t: lerp(A.t == null ? -90 : A.t, B.t == null ? (A.t == null ? -90 : A.t) : B.t, u),
      g: A.g == null && B.g == null ? null : lerp(A.g == null ? (A.t == null ? -90 : A.t) : A.g, B.g == null ? (B.t == null ? -90 : B.t) : B.g, u),
      n: tab(nA, nB), n2: tab(A.n2 || nA, B.n2 || nB), r: tab(rA, rB), r2: tab(A.r2 || rA, B.r2 || rB),
    };
  };

  /* ---------- pozy ----------
     vb: własny viewBox, gdy ruch wychodzi poza kadr; rek: rekwizyty;
     s: który punkt dostaje znak stawu dla celu (biodro / kolano / kostka). */
  const STOI = { a: ['s', 76, 101], n: [90, 90, 0], t: -90, r: [92, 88] };
  const F = {
    'front-squat': {
      A: { a: ['s', 74, 101], n: [88, 92, 0], t: -90, r: [12, -170] },
      B: { a: ['s', 74, 101], n: [-8, 118, 0], t: -70, r: [16, -166] },
      rek: [['sztanga', 'nad', 8.5]],
    },
    'martwy-ciag': {
      A: { a: ['s', 74, 101], n: [28, 102, 0], t: -18, r: [90, 90], g: -42 },
      B: { a: ['s', 74, 101], n: [90, 90, 0], t: -90, r: [90, 90] },
      rek: [['sztanga', 'nad']],
    },
    'wyciskanie': {
      A: { a: ['h', 94, 73], t: 180, n: [10, 97, 0], r: [-90, -90] },
      B: { a: ['h', 94, 73], t: 180, n: [10, 97, 0], r: [55, -90] },
      rek: [['lawka', 44, 104, 79], ['sztanga', 'nad', 9.5]],
    },
    'podciaganie': {
      A: { a: ['d', 82, 2], r: [-90, -90], t: -90, n: [78, 168, 120] },
      B: { a: ['d', 82, 2], r: [75, -90], t: -84, n: [72, 160, 120] },
      rek: [['drazek', 82, 2]],
    },
    'goblet': {
      A: { a: ['s', 78, 97], n: [88, 92, 14], t: -90, r: [72, -68] },
      B: { a: ['s', 78, 97], n: [-4, 118, 14], t: -76, r: [66, -72] },
      rek: [['klin', 72, 86, 104], ['skrzynia', 42, 66, 85], ['odwaznik', 'nad']],
    },
    'nordic': {
      A: { a: ['k', 62, 99], n: [90, 180, 110], t: -90, r: [60, -30] },
      B: { a: ['k', 62, 99], n: [138, 180, 110], t: -42, r: [58, 82] },
      rek: [['zaczep', 38, 93]],
    },
    'piszczelowy': {
      A: { a: ['s', 68, 101], n: [75, 75, 0], t: -106, r: [96, 94] },
      B: { a: ['s', 68, 101], n: [75, 75, -36], t: -106, r: [96, 94] },
      rek: [['sciana', 38]],
    },
    'bulgarski': {
      A: { a: ['s', 96, 101], n: [80, 95, 0], n2: [115, 178, 120], t: -90, r: [90, 90] },
      B: { a: ['s', 96, 101], n: [10, 105, 0], n2: [110, -135, 150], t: -80, r: [90, 90] },
      rek: [['lawka', 24, 60, 82], ['hantel', 'nad']],
    },
    'skrzynia': {
      A: { a: ['s', 92, 79], n: [0, 100, 0], n2: [105, 69, 0], t: -76, r: [80, 60] },
      B: { a: ['s', 92, 79], n: [90, 90, 0], n2: [100, 112, 30], t: -90, r: [95, 85] },
      rek: [['skrzynia', 80, 116, 82]],
    },
    'wioslowanie': {
      A: { a: ['h', 60, 58], t: -8, n: [110, 58, 0], n2: [60, 176, 100], r: [90, 90], r2: [50, 130] },
      B: { a: ['h', 60, 58], t: -8, n: [110, 58, 0], n2: [60, 176, 100], r: [200, 85], r2: [50, 130] },
      rek: [['lawka', 40, 122, 82], ['hantel', 'nad']],
    },
    'rdl-jednonoz': {
      A: { a: ['s', 78, 101], n: [90, 90, 0], n2: [96, 100, 20], t: -90, r: [92, 90] },
      B: { a: ['s', 78, 101], n: [75, 95, 0], n2: [170, 172, 100], t: -10, r: [90, 90], g: -25 },
      rek: [['hantel', 'nad']],
    },
    'kopenhaski': {
      A: { a: ['s', 120, 72], n: [-9, -9, -70], n2: [0, 20, -40], t: 171, r: [-9, -9], r2: [90, 0] },
      B: { a: ['s', 120, 72], n: [-12, -6, -70], n2: [0, 26, -40], t: 174, r: [-9, -9], r2: [90, 0] },
      rek: [['lawka', 106, 146, 76]],
    },
    'hiszpanski': {
      A: { a: ['s', 86, 101], n: [-2, 90, 0], t: -84, r: [72, -68] },
      B: { a: ['s', 86, 101], n: [2, 90, 0], t: -82, r: [72, -68] },
      rek: [['slupek', 146, 60], ['guma', 146, 74, 'kol'], ['hantel', 'nad']],
    },
    'deska-boczna': {
      A: { a: ['s2', 128, 99], n2: [13, 13, -60], n: [13, 13, -60], t: 193, r: [13, 13], r2: [90, 0] },
      B: { a: ['s2', 128, 99], n2: [13, 13, -60], n: [-15, -15, -70], t: 193, r: [13, 13], r2: [90, 0] },
    },
    'wspiecia-ugiete': {
      A: { a: ['p', 92, 92], n: [70, 110, -14], n2: [55, 150, 100], t: -88, r: [-8, -8] },
      B: { a: ['p', 92, 92], n: [70, 110, 48], n2: [55, 150, 100], t: -88, r: [-8, -8] },
      rek: [['skrzynia', 66, 100, 95], ['sciana', 122]],
    },
    'ewersja': {
      A: { a: ['h', 58, 74], t: -86, n: [0, 78, 5], n2: [6, 96, 0], r: [100, 100] },
      B: { a: ['h', 58, 74], t: -86, n: [0, 78, -28], n2: [6, 96, 0], r: [100, 100] },
      rek: [['lawka', 34, 72, 79], ['guma', 132, 101, 'pal']],
    },
    'wspiecia': {
      A: { a: ['p', 90, 92], n: [90, 90, -12], t: -90, r: [90, 90], r2: [-6, -6] },
      B: { a: ['p', 90, 92], n: [90, 90, 48], t: -90, r: [90, 90], r2: [-6, -6] },
      rek: [['skrzynia', 66, 100, 95], ['sciana', 122], ['hantel', 'nad']],
    },
    'farmer': {
      A: { a: ['h', 80, 55], n: [68, 82, -8], n2: [108, 122, 40], t: -90, r: [90, 90], r2: [104, 96] },
      B: { a: ['h', 80, 55], n: [108, 122, 40], n2: [68, 82, -8], t: -90, r: [90, 90], r2: [84, 80] },
      rek: [['odwaznik', 'nad']], chod: true,
    },
    // Pozy nieruchome: plakaty dni w domu i dnia wolnego.
    'polklek': { A: { a: ['s', 98, 101], n: [0, 90, 0], n2: [110, 178, 170], t: -92, r: [-78, -86], r2: [-70, -80] } },
    'drzewo': { A: { a: ['s', 80, 101], n: [90, 90, 0], n2: [40, 150, 100], t: -90, r: [-72, -104], r2: [-108, -76] } },
    'lezenie': { A: { a: ['h', 92, 97], t: 180, n: [0, 4, -80], n2: [-22, 40, 0], r: [8, 0], r2: [150, 200] } },
    'worek': {
      A: { a: ['h', 62, 55], t: -82, n: [100, 110, 20], n2: [70, 95, 0], r: [70, -75], r2: [62, -72] },
      B: { a: ['h', 66, 55], t: -78, n: [104, 114, 30], n2: [72, 95, 0], r: [72, -78], r2: [-6, -4] },
      rek: [['worek', 106, 128, 6, 80]], szybko: true,
    },
  };

  // Ćwiczenie → figurka. Klucz to id pozycji z planu.
  const MAPA = {
    c4a1: 'wyciskanie', c4a2: 'piszczelowy', c4a3: 'bulgarski', c4a4: 'podciaganie', c4a5: 'goblet', c4a6: 'nordic', c4a7: 'worek',
    c4b1: 'skrzynia', c4b2: 'wioslowanie', c4b3: 'rdl-jednonoz', c4b4: 'kopenhaski', c4b5: 'hiszpanski', c4b6: 'deska-boczna',
    c4b7: 'wspiecia-ugiete', c4b8: 'ewersja', c4b9: 'worek',
    c4c1: 'front-squat', c4c2: 'martwy-ciag', c4c3: 'wspiecia', c4c4: 'farmer',
  };
  const STAW_PUNKT = { biodro: 'bio', kolano: 'kol', kostka: 'kos' };

  const f1 = x => (Math.round(x * 10) / 10).toString();
  const f3 = x => (Math.round(Math.min(1, x) * 1000) / 1000).toString();
  const sciezka = pts => pts.map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join(' ');
  const gladko = u => u * u * (3 - 2 * u);

  // Rekwizyty stojące w miejscu.
  function staly(r, gora) {
    const [typ, a, b, c, d] = r;
    if (typ === 'lawka') return `<rect class="rk" x="${a}" y="${c}" width="${b - a}" height="5" rx="2.5"/><path class="rl" d="M${a + 6} ${c + 5}V${ZIEMIA}M${b - 6} ${c + 5}V${ZIEMIA}"/>`;
    if (typ === 'skrzynia') return `<rect class="rk" x="${a}" y="${c}" width="${b - a}" height="${ZIEMIA - c}" rx="2"/>`;
    if (typ === 'klin') return `<path class="rk" d="M${a} ${ZIEMIA}L${a} ${ZIEMIA - 6}L${b} ${ZIEMIA}Z"/>`;
    if (typ === 'sciana') return `<path class="rs" d="M${a} ${f1(gora)}V${ZIEMIA}"/>`;
    if (typ === 'drazek') return `<path class="rl" d="M${a - 30} ${ZIEMIA}V${b}H${a + 4}"/><circle class="rk" cx="${a}" cy="${b}" r="3"/>`;
    if (typ === 'zaczep') return `<rect class="rk" x="${a - 4}" y="${b - 5}" width="12" height="5" rx="2.5"/><path class="rl" d="M${a + 2} ${b}V${ZIEMIA}"/>`;
    if (typ === 'slupek') return `<path class="rs" d="M${a} ${b}V${ZIEMIA}"/>`;
    if (typ === 'worek') return `<path class="rl" d="M${(a + b) / 2} ${c - 8}V${c}"/><rect class="rk worek" x="${a}" y="${c}" width="${b - a}" height="${d - c}" rx="${(b - a) / 2}"/>`;
    return '';
  }
  // Rekwizyt trzymany w ręce: rysowany w (0,0), przesuwany za nadgarstkiem.
  function trzymany(typ, r) {
    if (typ === 'sztanga') return `<circle class="tal" r="${r || 11}"/><circle class="tal-o" r="2.4"/>`;
    if (typ === 'hantel') return '<rect class="tal" x="-6" y="-1" width="12" height="9" rx="3"/>';
    if (typ === 'odwaznik') return '<path class="rl2" d="M-3.4 1.5V-2.5H3.4V1.5"/><circle class="kula" cy="6.5" r="5.6"/>';
    return '';
  }

  /* SVG figurki. opts.klatka: 0 albo 1 = nieruchoma poza A / B (do miniatur i testów),
     opts.cele: lista celów ćwiczenia — biodro, kolano i kostka dostają znak na stawie. */
  function svg(klucz, opts = {}) {
    const f = F[klucz] || F[MAPA[klucz]];
    if (!f) return '';
    const stoi = opts.klatka != null || !f.B || opts.bezRuchu;
    // Oś czasu: postój w A, przejście do B, postój w B, powrót. Chód i worek bez postojów.
    const KL = 7, klatki = [], czasy = [];
    if (stoi) { klatki.push(punkty(opts.klatka ? f.B || f.A : f.A)); czasy.push(0); }
    else {
      const post = f.chod || f.szybko ? 0.02 : 0.12, ruch = (1 - 2 * post) / 2;
      const dodaj = (u, t) => { klatki.push(punkty(mieszaj(f.A, f.B, u))); czasy.push(t); };
      dodaj(0, 0);
      for (let i = 0; i <= KL; i++) dodaj(gladko(i / KL), post + ruch * i / KL);
      for (let i = 0; i <= KL; i++) dodaj(gladko(1 - i / KL), 2 * post + ruch + ruch * i / KL);
    }
    const dur = f.szybko ? 1.1 : f.chod ? 1.5 : 3.2;
    const anim = (attr, wart) => (stoi ? '' : `<animate attributeName="${attr}" dur="${dur}s" repeatCount="indefinite" keyTimes="${czasy.map(f3).join(';')}" values="${wart.join(';')}"/>`);
    // keyTimes muszą kończyć się na 1 i rosnąć — ostatnia klatka dostaje 1.
    if (!stoi) czasy[czasy.length - 1] = 1;
    const linia = (klasa, ...nazwy) => {
      const d = klatki.map(k => sciezka(nazwy.map(n => k[n])));
      return `<path class="${klasa}" d="${d[0]}">${anim('d', d)}</path>`;
    };
    const kolo = (klasa, nazwa, r) => `<circle class="${klasa}" r="${r}" cx="${f1(klatki[0][nazwa][0])}" cy="${f1(klatki[0][nazwa][1])}">` +
      anim('cx', klatki.map(k => f1(k[nazwa][0]))) + anim('cy', klatki.map(k => f1(k[nazwa][1]))) + '</circle>';
    const rek = f.rek || [];
    // Kadr: prostokąt wokół wszystkich klatek ruchu i rekwizytów, z marginesem.
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = ZIEMIA + 2;
    const obejmij = (x, y, m = 0) => { x0 = Math.min(x0, x - m); x1 = Math.max(x1, x + m); y0 = Math.min(y0, y - m); y1 = Math.max(y1, y + m); };
    for (const k of klatki) {
      for (const n of Object.keys(k)) obejmij(k[n][0], k[n][1], n === 'glowa' ? GLOWA : 4);
      for (const r of rek) if (['sztanga', 'hantel', 'odwaznik'].includes(r[0])) obejmij(k[r[1]][0], k[r[1]][1], r[0] === 'sztanga' ? (r[2] || 11) + 2 : 13);
    }
    for (const r of rek) {
      const [typ, a, b, c, d] = r;
      if (typ === 'lawka' || typ === 'skrzynia') { obejmij(a, c); obejmij(b, c); }
      else if (typ === 'klin') { obejmij(a, ZIEMIA - 6); obejmij(b, ZIEMIA); }
      else if (typ === 'sciana') obejmij(a, ZIEMIA, 3);
      else if (typ === 'drazek') { obejmij(a - 30, b, 3); obejmij(a + 4, b, 3); }
      else if (typ === 'zaczep') obejmij(a, b, 8);
      else if (typ === 'slupek') obejmij(a, b, 3);
      else if (typ === 'worek') { obejmij(a, c - 8); obejmij(b, d); }
      else if (typ === 'guma') obejmij(a, b, 2);
    }
    const M = 7;
    const vb = [x0 - M, y0 - M, x1 - x0 + 2 * M, y1 - y0 + M + 3].map(f1);
    const zx0 = x0 - M + 2, zx1 = x1 + M - 2;
    let tyl = '', przod = '';
    for (const r of rek) {
      if (['sztanga', 'hantel', 'odwaznik'].includes(r[0])) {
        const n = r[1];
        const ruch = stoi ? '' : `<animateTransform attributeName="transform" type="translate" dur="${dur}s" repeatCount="indefinite" keyTimes="${czasy.map(f3).join(';')}" values="${klatki.map(k => f1(k[n][0]) + ' ' + f1(k[n][1])).join(';')}"/>`;
        przod += `<g transform="translate(${f1(klatki[0][n][0])} ${f1(klatki[0][n][1])})">${trzymany(r[0], r[2])}${ruch}</g>`;
      } else if (r[0] === 'guma') {
        const d = klatki.map(k => `M${r[1]} ${r[2]}L${f1(k[r[3]][0])} ${f1(k[r[3]][1])}`);
        tyl += `<path class="guma" d="${d[0]}">${anim('d', d)}</path>`;
      } else tyl += staly(r, y0 - M);
    }
    let stawy = '';
    for (const c of opts.cele || []) if (STAW_PUNKT[c]) stawy += kolo('staw', STAW_PUNKT[c], 4.3);
    return `<svg class="fig" viewBox="${vb.join(' ')}" aria-hidden="true">` +
      `<path class="zm" d="M${f1(zx0)} ${ZIEMIA + 1}H${f1(zx1)}"/>` + tyl +
      linia('cz dal', 'bark', 'lok2', 'nad2') + linia('cz dal', 'bio', 'kol2', 'kos2', 'pal2') +
      linia('cz tul', 'bio', 'bark') +
      linia('cz', 'bio', 'kol', 'kos', 'pal') + linia('cz', 'bark', 'lok', 'nad') +
      przod + kolo('gl', 'glowa', GLOWA) + stawy + '</svg>';
  }

  const Figury = { svg, ma: klucz => !!(F[klucz] || F[MAPA[klucz]]), klucze: () => Object.keys(F), punkty, F, MAPA };
  if (typeof module !== 'undefined' && module.exports) module.exports = Figury;
  else root.Figury = Figury;
})(typeof globalThis !== 'undefined' ? globalThis : this);
