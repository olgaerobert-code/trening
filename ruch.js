/* Warstwa efektów. Nie dotyka danych: nic nie czyta z localStorage, nic nie
   zapisuje, nie woła funkcji app.js. Tylko patrzy na DOM, który app.js
   buduje, i dokłada ruch:
   - duch poprzedniego ekranu, który odsuwa się, gdy wjeżdża nowy,
   - fala po tapnięciu w przycisk,
   - konfetti przy odhaczeniu serii i przy zaliczeniu sesji,
   - paralaksa litery dnia i numeru tygodnia przy przewijaniu,
   - pochylenie karty „Dziś" pod palcem,
   - dolna kapsuła wypełniająca się w czasie przerwy,
   - wstęga tygodni przewinięta do bieżącego, bieżnia z tekstem pod nagłówkiem,
   - karty poniżej ekranu wjeżdżają dopiero, gdy do nich przewiniesz.
   prefers-reduced-motion wyłącza wszystko. */
(() => {
  const app = document.getElementById('app');
  const pasek = document.getElementById('timer');
  if (!app || !('MutationObserver' in window)) return;
  const spokojnie = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (spokojnie) return;
  document.documentElement.dataset.ruch = '1';

  const raf = window.requestAnimationFrame.bind(window);
  const glebokosc = h => (h || '#/').replace(/^#\/?/, '').split('/').filter(Boolean).length;

  /* ---------- przewinięcie: paralaksa + zapamiętana pozycja dla ducha ---------- */
  let scrollPrzed = 0, czekaScroll = false;
  const naScroll = () => {
    if (czekaScroll) return;
    czekaScroll = true;
    raf(() => {
      czekaScroll = false;
      document.documentElement.style.setProperty('--sy', String(Math.max(0, window.scrollY)));
    });
  };
  window.addEventListener('scroll', () => { naScroll(); odsloniete(); }, { passive: true });
  // pozycja sprzed renderu: app.js może przewinąć do góry, scroll event przyjdzie później
  document.addEventListener('pointerdown', () => { scrollPrzed = window.scrollY; }, { capture: true, passive: true });
  window.addEventListener('hashchange', () => { scrollPrzed = window.scrollY; }, { capture: true });

  /* ---------- duch poprzedniego ekranu ---------- */
  let duch = null, duchTimer = 0, ostatniHash = location.hash || '#/';
  const pokazDucha = (stare, kierunek) => {
    if (!stare.length) return;
    if (!duch) {
      duch = document.createElement('div');
      duch.id = 'duch';
      duch.setAttribute('aria-hidden', 'true');
      document.body.append(duch);
    }
    duch.innerHTML = '';
    duch.className = kierunek;
    const w = document.createElement('div');
    w.style.transform = `translateY(${-scrollPrzed}px)`;
    w.style.pointerEvents = 'none';
    for (const n of stare) w.append(n);
    duch.append(w);
    clearTimeout(duchTimer);
    duchTimer = setTimeout(() => { if (duch) duch.innerHTML = ''; }, 420);
  };

  /* ---------- wstęga tygodni, bieżnia, karty poniżej ekranu ---------- */
  const wstega = () => {
    const strip = app.querySelector('.wstrip');
    const now = strip && strip.querySelector('.wp.now');
    if (!strip || !now) return;
    raf(() => {
      const left = now.offsetLeft - (strip.clientWidth - now.offsetWidth) / 2;
      try { strip.scrollTo({ left, behavior: 'smooth' }); } catch { strip.scrollLeft = left; }
    });
  };
  const bieznia = () => {
    const top = app.querySelector('.top');
    if (!top || top.querySelector('.marq')) return;
    const data = (top.querySelector('.data') || {}).textContent || '';
    const sub = (top.querySelector('.wsub') || {}).textContent || '';
    const tekst = [data, sub, 'Plan 12 tygodni'].filter(Boolean).join('  ·  ') + '  ·  ';
    const m = document.createElement('div');
    m.className = 'marq';
    m.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 2; i++) { const s = document.createElement('span'); s.textContent = tekst.repeat(3); m.append(s); }
    const row = top.querySelector('.toprow');
    if (row) row.after(m); else top.append(m);
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(wpisy => {
    for (const e of wpisy) if (e.isIntersecting) { e.target.classList.add('widac'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -40px 0px' }) : null;
  // bezpiecznik: gdyby obserwator nie zadziałał, przewinięcie samo odsłania karty
  let czekaOdslon = false;
  const odsloniete = () => {
    if (czekaOdslon) return;
    czekaOdslon = true;
    raf(() => {
      czekaOdslon = false;
      const h = window.innerHeight;
      app.querySelectorAll('.ukryty:not(.widac)').forEach(el => { if (el.getBoundingClientRect().top < h) el.classList.add('widac'); });
    });
  };
  const ponizej = () => {
    if (!io) return;
    const h = window.innerHeight;
    app.querySelectorAll('.ex, .card, .lista, details.acc, .note, .stats, .zmiany, .hero, .przsesja').forEach(el => {
      if (el.classList.contains('ukryty') || el.classList.contains('widac')) return;
      const r = el.getBoundingClientRect();
      if (r.top > h + 40) { el.classList.add('ukryty'); io.observe(el); }
    });
  };

  /* ---------- obserwacja #app: nowy ekran ---------- */
  let kierunekTimer = 0;
  new MutationObserver(muts => {
    const stare = [], nowe = [];
    for (const m of muts) {
      for (const n of m.removedNodes) if (n.nodeType === 1) stare.push(n);
      for (const n of m.addedNodes) if (n.nodeType === 1) nowe.push(n);
    }
    if (!nowe.length) return;
    const nowyEkran = nowe.some(n => n.matches('.stagger') || n.querySelector('.stagger'));
    const hash = location.hash || '#/';
    if (nowyEkran) {
      const d = glebokosc(hash) - glebokosc(ostatniHash);
      const kierunek = d > 0 ? 'w-glab' : d < 0 ? 'w-tyl' : '';
      app.classList.remove('w-glab', 'w-tyl');
      if (kierunek) app.classList.add(kierunek);
      clearTimeout(kierunekTimer);
      kierunekTimer = setTimeout(() => app.classList.remove('w-glab', 'w-tyl'), 900);
      // duch tylko przy zmianie adresu — odświeżenie tego samego ekranu ma być niewidoczne
      if (hash !== ostatniHash) pokazDucha(stare.filter(n => !nowe.includes(n)), kierunek);
      wstega();
      bieznia();
      raf(ponizej);
    }
    ostatniHash = hash;
  }).observe(app, { childList: true });

  /* ---------- fala po tapnięciu ---------- */
  const FALA = '.tile, .wp, .tab, .tbtn, .btn, .mini, .wchip, .plr, .trn-start, .trn-stop, .prok, .mobopt, .seg-ctl button, .step button, .timebtn, .back, .kgwroc, .film, .more, .wiecej, details.acc > summary, .zmiany > summary';
  document.addEventListener('pointerdown', e => {
    if (e.button && e.button !== 0) return;
    const el = e.target.closest && e.target.closest(FALA);
    if (!el || e.target.closest('input, .suwak, .tick')) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    const cs = getComputedStyle(el);
    if (cs.position === 'static') el.style.position = 'relative';
    if (cs.overflow === 'visible') el.style.overflow = 'hidden';
    const s = document.createElement('span');
    s.className = 'fala';
    const d = Math.max(r.width, r.height) * 2.2;
    s.style.width = s.style.height = d + 'px';
    s.style.left = (e.clientX - r.left - d / 2) + 'px';
    s.style.top = (e.clientY - r.top - d / 2) + 'px';
    el.append(s);
    s.addEventListener('animationend', () => s.remove(), { once: true });
    setTimeout(() => s.remove(), 900);
  }, { passive: true });

  /* ---------- konfetti ---------- */
  let plotno = null, ctx = null, czastki = [], leci = false;
  const kolorZ = (el, nazwa, dflt) => {
    const v = el ? getComputedStyle(el).getPropertyValue(nazwa).trim() : '';
    return v || dflt;
  };
  const plotnoGotowe = () => {
    if (!plotno) {
      plotno = document.createElement('canvas');
      plotno.id = 'konfetti';
      plotno.setAttribute('aria-hidden', 'true');
      document.body.append(plotno);
      ctx = plotno.getContext('2d');
    }
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (plotno.width !== innerWidth * dpr || plotno.height !== innerHeight * dpr) {
      plotno.width = innerWidth * dpr; plotno.height = innerHeight * dpr;
      plotno.style.width = innerWidth + 'px'; plotno.style.height = innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  };
  const klatka = () => {
    if (!czastki.length) { leci = false; ctx.clearRect(0, 0, innerWidth, innerHeight); plotno.style.display = 'none'; return; }
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of czastki) {
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.rot += p.vr; p.zycie -= 1;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.zycie / 20));
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.kolor;
      if (p.kolo) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    czastki = czastki.filter(p => p.zycie > 0 && p.y < innerHeight + 40);
    raf(klatka);
  };
  const wybuch = (x, y, ile, kolory, sila) => {
    plotnoGotowe();
    plotno.style.display = 'block';
    for (let i = 0; i < ile; i++) {
      const kat = Math.random() * Math.PI * 2, v = (0.4 + Math.random()) * sila;
      czastki.push({
        x, y, vx: Math.cos(kat) * v, vy: Math.sin(kat) * v - sila * .6, g: .32 + Math.random() * .1,
        w: 4 + Math.random() * 6, h: 3 + Math.random() * 4, rot: Math.random() * Math.PI, vr: (Math.random() - .5) * .3,
        kolor: kolory[i % kolory.length], zycie: 60 + Math.random() * 40, kolo: Math.random() < .3,
      });
    }
    if (!leci) { leci = true; raf(klatka); }
  };
  const haptyka = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch {} };

  // odhaczenie serii / pozycji jogi: klasa done / zrobione pojawia się na wierszu
  new MutationObserver(muts => {
    for (const m of muts) {
      const t = m.target;
      if (t.nodeType !== 1) continue;
      const bylo = m.oldValue || '';
      const seria = t.classList.contains('setrow') && t.classList.contains('done') && !/\bdone\b/.test(bylo);
      const joga = t.classList.contains('ex') && t.classList.contains('zrobione') && !/\bzrobione\b/.test(bylo);
      if (!seria && !joga) continue;
      const tick = t.querySelector('.tick') || t;
      const r = tick.getBoundingClientRect();
      const dc = kolorZ(t, '--dc', '') || kolorZ(t, '--tc', '');
      const good = kolorZ(document.documentElement, '--good', '#3DDC84');
      wybuch(r.left + r.width / 2, r.top + r.height / 2, 16, [good, dc || good, '#ffffff'], 6);
      haptyka(12);
    }
  }).observe(app, { attributes: true, subtree: true, attributeFilter: ['class'], attributeOldValue: true });

  // zaliczenie sesji: karta .zal wjeżdża poza #app
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType !== 1 || !n.classList || !n.classList.contains('zal')) continue;
      const karta = n.querySelector('.zkarta') || n;
      const tc = kolorZ(karta, '--tc', '#3987e5');
      const kolory = [tc, '#ffffff', kolorZ(document.documentElement, '--good', '#3DDC84'), '#F5B041'];
      setTimeout(() => {
        wybuch(innerWidth * .25, innerHeight * .55, 70, kolory, 11);
        wybuch(innerWidth * .75, innerHeight * .55, 70, kolory, 11);
        haptyka([20, 40, 30]);
      }, 350);
    }
  }).observe(document.body, { childList: true });

  /* ---------- pochylenie karty „Dziś" pod palcem ---------- */
  let pochylona = null;
  const pochyl = (el, x, y) => {
    const r = el.getBoundingClientRect();
    const px = (x - r.left) / r.width - .5, py = (y - r.top) / r.height - .5;
    el.style.setProperty('--ry', (px * 8).toFixed(2) + 'deg');
    el.style.setProperty('--rx', (-py * 8).toFixed(2) + 'deg');
  };
  const prostuj = () => { if (pochylona) { pochylona.style.removeProperty('--rx'); pochylona.style.removeProperty('--ry'); pochylona = null; } };
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest && e.target.closest('.tile.hero-s');
    if (!el) return;
    pochylona = el; pochyl(el, e.clientX, e.clientY);
  }, { passive: true });
  document.addEventListener('pointermove', e => {
    if (pochylona) { pochyl(pochylona, e.clientX, e.clientY); return; }
    if (e.pointerType === 'mouse') { const el = e.target.closest && e.target.closest('.tile.hero-s'); if (el) { pochylona = el; pochyl(el, e.clientX, e.clientY); } }
  }, { passive: true });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(z => document.addEventListener(z, prostuj, { passive: true }));
  document.addEventListener('pointerout', e => { if (pochylona && !pochylona.contains(e.relatedTarget)) prostuj(); }, { passive: true });

  /* ---------- dolna kapsuła: wypełnienie w czasie przerwy ---------- */
  if (pasek) {
    let bylDone = false;
    const odswiezPasek = () => {
      const fg = pasek.querySelector('.ring .fgc');
      if (!fg) { pasek.style.setProperty('--p', '0'); bylDone = false; return; }
      const c = parseFloat(fg.getAttribute('stroke-dasharray')) || 0;
      const o = parseFloat(fg.getAttribute('stroke-dashoffset')) || 0;
      const ring = pasek.querySelector('.ring');
      const idle = ring && ring.classList.contains('idle');
      pasek.style.setProperty('--p', idle || !c ? '0' : Math.max(0, Math.min(1, o / c)).toFixed(3));
      const done = !!(ring && ring.classList.contains('done'));
      if (done && !bylDone) {
        pasek.classList.add('koniec');
        setTimeout(() => pasek.classList.remove('koniec'), 1900);
        const r = ring.getBoundingClientRect();
        wybuch(r.left + r.width / 2, r.top + r.height / 2, 24, [kolorZ(document.documentElement, '--good', '#3DDC84'), '#ffffff'], 7);
      }
      bylDone = done;
    };
    new MutationObserver(odswiezPasek).observe(pasek, { childList: true, subtree: true, attributes: true, attributeFilter: ['stroke-dashoffset', 'class'] });
    odswiezPasek();
  }
})();

/* ══ Sztanga 3D ══
   Rysowana na płótnie, bez bibliotek: gryf, kołnierze, tuleje i talerze w kolorach
   IPF. Obraca się sama, da się ją obrócić palcem, a talerze wjeżdżają na gryf,
   gdy zmienia się ciężar (suwak „Ciężar na sztandze" albo karta „Dziś").
   Czyta tylko liczbę z DOM-u, który buduje app.js — niczego nie zapisuje. */
(() => {
  if (!document.documentElement.dataset.ruch) return;
  const app = document.getElementById('app');
  if (!app) return;
  const raf = window.requestAnimationFrame.bind(window);

  // [kg, kolor, promień mm, grubość mm (lekko pogrubiona, żeby było ją widać)]
  const TALERZE = [[25, '#D7263D', 225, 30], [20, '#1F5FBF', 225, 26], [15, '#F4C20D', 225, 22], [10, '#1F9D55', 225, 18], [5, '#ECEDEF', 114, 18], [2.5, '#D7263D', 95, 14], [1.25, '#C3C7CF', 80, 12]];
  const GRYF = { pol: 1100, trzonR: 14, kolnierzX: 735, kolnierzSzer: 30, kolnierzR: 30, tulejaR: 25, start: 768 };
  const rozklad = kg => {
    const out = []; let r = (kg - 20) / 2;
    if (!(r > 0)) return out;
    for (const p of TALERZE) while (r >= p[0] - 1e-6) { out.push(p); r -= p[0]; }
    return out;
  };
  const parseKg = t => { const m = /(\d+(?:[.,]\d+)?)/.exec(t || ''); return m ? parseFloat(m[1].replace(',', '.')) : NaN; };
  const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const cien = (h, k) => { const [r, g, b] = hex2rgb(h).map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return `rgb(${r},${g},${b})`; };
  const ease = t => 1 - Math.pow(1 - t, 3);

  const sceny = new Set();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(ws => { for (const w of ws) { const s = w.target._scena; if (s) s.widoczna = w.isIntersecting; } }) : null;

  function Scena(host, kolor) {
    const c = document.createElement('canvas');
    c.className = 'sztanga3d';
    c.setAttribute('aria-hidden', 'true');
    const opis = document.createElement('div');
    opis.className = 'sztanga3d-opis';
    host.append(c, opis);
    const s = { c, ctx: c.getContext('2d'), opis, kolor, kg: NaN, talerze: [], theta: -0.55, dTheta: 0, drag: null, widoczna: true, t0: performance.now(), ostatniKg: null, W: 0, H: 0 };
    c._scena = s;
    if (io) io.observe(c);
    // obrót palcem: tylko poziomo, pionowe przewijanie zostaje stronie
    c.addEventListener('pointerdown', e => { s.drag = { x: e.clientX, th: s.dTheta, ruch: 0 }; try { c.setPointerCapture(e.pointerId); } catch {} }, { passive: true });
    c.addEventListener('pointermove', e => { if (!s.drag) return; const dx = e.clientX - s.drag.x; s.drag.ruch = Math.max(s.drag.ruch, Math.abs(dx)); s.dTheta = s.drag.th + dx * 0.012; }, { passive: true });
    const koniec = () => { s.drag = null; };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(z => c.addEventListener(z, koniec, { passive: true }));
    // przeciągnięcie po sztandze na karcie „Dziś" nie ma otwierać sesji
    c.addEventListener('click', e => { if (s.ostatniRuch > 8) { e.stopPropagation(); e.preventDefault(); } }, true);
    c.addEventListener('pointerup', e => { s.ostatniRuch = s.drag ? s.drag.ruch : 0; }, { capture: true, passive: true });
    sceny.add(s);
    return s;
  }

  const ustawKg = (s, kg) => {
    if (!(kg >= 0) || kg === s.kg) return;
    s.kg = kg;
    const nowe = rozklad(kg);
    const teraz = performance.now();
    // każdy talerz ma pozycję bieżącą i docelową; usuwane zjeżdżają z tulei
    const stare = s.talerze.filter(t => !t.won);
    const wynik = [];
    let x = GRYF.start;
    nowe.forEach((spec, i) => {
      const cel = x + spec[3] / 2;
      const byl = stare[i] && stare[i].spec === spec ? stare[i] : null;
      if (byl) { byl.cel = cel; byl.od = byl.x; byl.start = teraz; wynik.push(byl); }
      else wynik.push({ spec, x: GRYF.pol + 260 + i * 40, od: GRYF.pol + 260 + i * 40, cel, start: teraz + i * 70, won: false });
      x += spec[3];
    });
    stare.slice(nowe.length).forEach((t, i) => { t.won = true; t.od = t.x; t.cel = GRYF.pol + 300 + i * 40; t.start = teraz + i * 50; wynik.push(t); });
    stare.forEach((t, i) => { if (i < nowe.length && t.spec !== nowe[i] && !wynik.includes(t)) { t.won = true; t.od = t.x; t.cel = GRYF.pol + 300; t.start = teraz; wynik.push(t); } });
    s.talerze = wynik;
    const naStrone = nowe.map(p => String(p[0]).replace('.', ',')).join(' · ');
    s.opis.textContent = nowe.length ? `na stronę: ${naStrone} kg` : kg > 0 ? 'sam gryf 20 kg' : '';
  };

  const rysuj = (s, teraz) => {
    const { c, ctx } = s;
    const rect = c.getBoundingClientRect();
    if (!rect.width) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(rect.width), H = Math.round(rect.height);
    if (s.W !== W || s.H !== H) { s.W = W; s.H = H; c.width = W * dpr; c.height = H * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // pozycje talerzy
    let ruch = false;
    for (const t of s.talerze) {
      const p = Math.min(1, Math.max(0, (teraz - t.start) / 520));
      t.x = t.od + (t.cel - t.od) * ease(p);
      if (p < 1) ruch = true;
    }
    s.talerze = s.talerze.filter(t => !(t.won && Math.abs(t.x - t.cel) < 1));

    const th = Math.max(-0.95, Math.min(0.95, s.theta * Math.sin((teraz - s.t0) / 2600) + s.dTheta));
    const ph = 0.22;
    const sc = (W - 28) / (2 * GRYF.pol + 120);
    const cx = W / 2, cy = H / 2 + 4;
    const cT = Math.cos(th), sT = Math.sin(th), cP = Math.cos(ph), sP = Math.sin(ph);
    const proj = (x, y, z) => { const x1 = x * cT - z * sT, z1 = x * sT + z * cT; return [cx + x1 * sc, cy - (y * cP - z1 * sP) * sc, z1 * cP + y * sP]; };
    const L = [0.35, 0.8, 0.5]; const Ln = Math.hypot(...L); L[0] /= Ln; L[1] /= Ln; L[2] /= Ln;
    const N = 22;

    // walec wzdłuż osi x od xa do xb, promień R, kolor bazowy; blizszy koniec rysowany jako ścianka
    const walec = (xa, xb, R, kolor, dziura) => {
      const dA = xa * sT * cP, dB = xb * sT * cP;
      const xNear = dA > dB ? xa : xb, xFar = dA > dB ? xb : xa;
      const tyl = [], przod = [], norm = [];
      for (let k = 0; k <= N; k++) {
        const a = k / N * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        tyl.push(proj(xFar, R * ca, R * sa)); przod.push(proj(xNear, R * ca, R * sa));
        const nx = -sa * sT, nz1 = sa * cT, ny1 = ca;
        const ny = ny1 * cP - nz1 * sP, nz = nz1 * cP + ny1 * sP;
        norm.push([nx, ny, nz]);
      }
      // ścianka boczna: tylko połowa zwrócona do kamery
      for (let k = 0; k < N; k++) {
        const n = norm[k], n2 = norm[k + 1];
        if (n[2] + n2[2] <= 0) continue;
        const lam = Math.max(0, (n[0] + n2[0]) / 2 * L[0] + (n[1] + n2[1]) / 2 * L[1] + (n[2] + n2[2]) / 2 * L[2]);
        ctx.fillStyle = cien(kolor, 0.42 + 0.62 * lam);
        ctx.beginPath(); ctx.moveTo(tyl[k][0], tyl[k][1]); ctx.lineTo(tyl[k + 1][0], tyl[k + 1][1]); ctx.lineTo(przod[k + 1][0], przod[k + 1][1]); ctx.lineTo(przod[k][0], przod[k][1]); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .6; ctx.stroke();
      }
      // czoło od strony kamery
      const faceLam = Math.abs(sT * cP);
      ctx.fillStyle = cien(kolor, 0.72 + 0.4 * faceLam);
      ctx.beginPath(); przod.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.stroke();
      if (dziura) {
        // otwór na gryf i pierścień wokół niego
        const o = [];
        for (let k = 0; k <= N; k++) { const a = k / N * Math.PI * 2; o.push(proj(xNear, dziura * Math.cos(a), dziura * Math.sin(a))); }
        ctx.fillStyle = cien(kolor, 0.5);
        ctx.beginPath(); o.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
        const r2 = R * 0.78, o2 = [];
        for (let k = 0; k <= N; k++) { const a = k / N * Math.PI * 2; o2.push(proj(xNear, r2 * Math.cos(a), r2 * Math.sin(a))); }
        ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1;
        ctx.beginPath(); o2.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
      }
    };

    const STAL = '#9AA0AA', STAL2 = '#B4B9C2';
    // kolejność: trzon i wewnętrzne tuleje najpierw, potem wszystko od najdalszego
    walec(-GRYF.kolnierzX, GRYF.kolnierzX, GRYF.trzonR, STAL);
    const obiekty = [];
    for (const strona of [-1, 1]) {
      const sg = strona;
      obiekty.push({ d: sg * (GRYF.kolnierzX + 15) * sT * cP, f: () => walec(sg * GRYF.kolnierzX, sg * (GRYF.kolnierzX + GRYF.kolnierzSzer), GRYF.kolnierzR, STAL2) });
      let koniec = GRYF.start;
      for (const t of s.talerze) koniec = Math.max(koniec, t.x + t.spec[3] / 2);
      obiekty.push({ d: sg * (GRYF.kolnierzX + 40) * sT * cP - 1e3, f: () => walec(sg * (GRYF.kolnierzX + GRYF.kolnierzSzer), sg * koniec, GRYF.tulejaR, STAL) });
      obiekty.push({ d: sg * (koniec + 50) * sT * cP, f: () => walec(sg * koniec, sg * GRYF.pol, GRYF.tulejaR, STAL) });
      for (const t of s.talerze) {
        const x0 = sg * t.x;
        obiekty.push({ d: x0 * sT * cP, f: () => walec(x0 - t.spec[3] / 2, x0 + t.spec[3] / 2, t.spec[2], t.spec[1], GRYF.tulejaR + 2) });
      }
    }
    obiekty.sort((a, b) => a.d - b.d).forEach(o => o.f());

    // cień pod sztangą
    const g = ctx.createRadialGradient(cx, H - 10, 10, cx, H - 10, W * 0.45);
    g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, H - 10, W * 0.45, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    return ruch;
  };

  // Rysujemy co drugą klatkę (~30 kl/s) i nie w czasie przewijania strony —
  // na telefonie liczy się każda klatka, a sztanga i tak obraca się powoli.
  let petla = false, parzysta = false, przewija = 0;
  window.addEventListener('scroll', () => { przewija = performance.now(); }, { passive: true });
  const krok = () => {
    let zywe = false;
    const teraz = performance.now();
    parzysta = !parzysta;
    for (const s of sceny) {
      if (!s.c.isConnected) { sceny.delete(s); continue; }
      zywe = true;
      if (!s.widoczna || document.hidden) continue;
      if (parzysta && !s.drag) continue;
      if (teraz - przewija < 160 && !s.drag) continue;
      rysuj(s, teraz);
    }
    if (zywe) raf(krok); else petla = false;
  };
  const uruchom = () => { if (!petla) { petla = true; raf(krok); } };

  // karta ćwiczenia głównego: liczba z suwaka „Ciężar na sztandze" (na żywo) albo z karty
  const kgKarty = card => {
    const b = card.querySelector('.kglab b');
    if (b) return parseKg(b.textContent);
    const kg = card.querySelector('.mv.kg');
    return kg ? parseFloat(kg.dataset.cnt) : NaN;
  };
  const zalozNaKarte = card => {
    if (card.querySelector('.sztanga3d')) return;
    const head = card.querySelector('.exhead');
    if (!head) return;
    const host = document.createElement('div');
    host.className = 'sztanga3d-host';
    head.after(host);
    const s = Scena(host, getComputedStyle(card).getPropertyValue('--dc').trim());
    ustawKg(s, kgKarty(card));
    const odswiez = () => { const kg = kgKarty(card); if (kg !== s.kg) ustawKg(s, kg); };
    card.addEventListener('input', () => raf(odswiez), { passive: true });
    new MutationObserver(() => raf(odswiez)).observe(card, { childList: true, characterData: true, subtree: true });
    uruchom();
  };
  // karta „Dziś": liczba z .hv[data-cnt]
  const zalozNaHero = hero => {
    if (hero.querySelector('.sztanga3d')) return;
    const hv = hero.querySelector('.hv[data-cnt]');
    const htop = hero.querySelector('.htop');
    if (!hv || !htop) return;
    const host = document.createElement('div');
    host.className = 'sztanga3d-host hero3d';
    htop.after(host);
    const s = Scena(host, '#fff');
    ustawKg(s, parseFloat(hv.dataset.cnt));
    uruchom();
  };
  const przejrzyj = () => {
    app.querySelectorAll('.ex.main').forEach(zalozNaKarte);
    app.querySelectorAll('.tile.hero-s').forEach(zalozNaHero);
  };
  new MutationObserver(muts => { if (muts.some(m => m.addedNodes.length)) raf(przejrzyj); }).observe(app, { childList: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) uruchom(); });
  przejrzyj();
})();
