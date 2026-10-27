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
