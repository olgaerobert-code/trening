/* Ruch, który nie dotyka danych: liczby na kartach liczą się od zera przy
   wejściu w widok. Skrypt tylko obserwuje #app — nic nie zapisuje, nic nie
   czyta z localStorage, a po animacji zostawia w DOM-ie dokładnie ten tekst,
   który wstawił app.js. prefers-reduced-motion wyłącza wszystko. */
(() => {
  const app = document.getElementById('app');
  if (!app || !('MutationObserver' in window)) return;
  const spokojnie = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  const CEL = '.tile.hero-s .hv, .hero .hv, .pk b, .stat .sv, .ps .pv, .zbig, .przv b, .m .mv.kg';
  const RE = /^\s*(\d{1,3}(?:[  ]\d{3})*|\d+)(?:,(\d+))?\s*$/;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const widziane = new WeakSet();

  const licz = el => {
    if (widziane.has(el)) return;
    widziane.add(el);
    const node = Array.from(el.childNodes).find(n => n.nodeType === 3 && RE.test(n.nodeValue));
    if (!node) return;
    const oryg = node.nodeValue;
    const m = RE.exec(oryg);
    const calk = parseInt(m[1].replace(/[  ]/g, ''), 10);
    const ulamek = m[2] || '';
    if (!calk || calk > 99999) return;
    const spacje = m[1].includes(' ') || m[1].includes(' ');
    const fmt = n => spacje ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : String(n);
    const czas = 650, start = performance.now();
    const krok = teraz => {
      if (node.nodeValue !== oryg && !node.nodeValue.startsWith(fmt(ostatni))) return; // app.js zmienił tekst — nie walczymy
      const t = Math.min(1, (teraz - start) / czas);
      const n = Math.round(calk * ease(t));
      ostatni = n;
      node.nodeValue = t < 1 ? fmt(n) + (ulamek ? ',' + ulamek : '') : oryg;
      if (t < 1) requestAnimationFrame(krok);
    };
    let ostatni = 0;
    requestAnimationFrame(krok);
  };

  const obserwuj = () => {
    if (spokojnie && spokojnie.matches) return;
    const wejscie = app.querySelector('.stagger');
    if (!wejscie) return;
    wejscie.querySelectorAll(CEL).forEach(licz);
  };

  new MutationObserver(muts => {
    if (muts.some(m => m.addedNodes.length)) obserwuj();
  }).observe(app, { childList: true });

  // Karta zaliczenia sesji wjeżdża poza #app.
  new MutationObserver(muts => {
    if (spokojnie && spokojnie.matches) return;
    for (const m of muts) for (const n of m.addedNodes) {
      if (n.nodeType === 1 && n.classList && n.classList.contains('zal')) n.querySelectorAll('.zbig').forEach(licz);
    }
  }).observe(document.body, { childList: true });
})();
