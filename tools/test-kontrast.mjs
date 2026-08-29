/* Kontrast palety na powierzchniach kart.  Uruchom:  node tools/test-kontrast.mjs
 *
 * Kolory serii sa dobrane pod daltonizm i tego nie ruszamy — ale kontrast liczy sie
 * WZGLEDEM TLA, wiec kazda zmiana powierzchni uniewaznia poprzedni pomiar. Ten test
 * pilnuje, zeby ciepla paleta nie kosztowala czytelnosci.
 *
 * Progi: tekst glowny 7:1 (AAA), tekst drugorzedny 4.5:1 (AA),
 *        tekst pomocniczy i obiekty graficzne 3:1 (AA large / non-text).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let ok = 0, zle = 0;
const test = (nazwa, wartosc, prog) => {
  const dobrze = wartosc >= prog;
  if (dobrze) { ok++; console.log('  OK   ' + nazwa + '  ' + wartosc.toFixed(2) + ':1  (prog ' + prog + ')'); }
  else { zle++; console.log('  BLAD ' + nazwa + '  ' + wartosc.toFixed(2) + ':1  ponizej progu ' + prog); }
};

const hex = h => {
  const n = h.replace('#', '');
  return [0, 2, 4].map(i => parseInt(n.slice(i, i + 2), 16));
};
const lum = h => {
  const [r, g, b] = hex(h).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const kontrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

/* Paleta czytana wprost z index.html, zeby test nie rozjechal sie z kodem. */
const css = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const tok = nazwa => {
  const m = css.match(new RegExp('--' + nazwa + ':\\s*(#[0-9a-fA-F]{6})'));
  if (!m) throw new Error('brak tokenu --' + nazwa + ' w index.html');
  return m[1];
};

const bg = tok('bg'), s1 = tok('s1'), s2 = tok('s2'), s3 = tok('s3');
const ink = tok('ink'), ink2 = tok('ink-2'), ink3 = tok('ink-3');
const serie = { 'seria 1 (wyciskanie)': tok('series-1'), 'seria 2 (front squat)': tok('series-2'), 'seria 3 (ciag)': tok('series-3') };

console.log('Powierzchnie: bg ' + bg + ' · s1 ' + s1 + ' · s2 ' + s2 + ' · s3 ' + s3 + '\n');

console.log('Tekst na tle strony');
test('glowny', kontrast(ink, bg), 7);
test('drugorzedny', kontrast(ink2, bg), 4.5);
test('pomocniczy', kontrast(ink3, bg), 3);

console.log('\nTekst na karcie (s1)');
test('glowny', kontrast(ink, s1), 7);
test('drugorzedny', kontrast(ink2, s1), 4.5);
test('pomocniczy', kontrast(ink3, s1), 3);

console.log('\nTekst na powierzchni podniesionej (s2)');
test('drugorzedny', kontrast(ink2, s2), 4.5);
test('pomocniczy', kontrast(ink3, s2), 3);

console.log('\nKolory serii na karcie (s1) — obiekty graficzne');
for (const [n, h] of Object.entries(serie)) test(n + ' ' + h, kontrast(h, s1), 3);

console.log('\nKolory serii na tle strony (bg)');
for (const [n, h] of Object.entries(serie)) test(n + ' ' + h, kontrast(h, bg), 3);

console.log('\nRozroznialnosc powierzchni miedzy soba');
test('bg vs s1', kontrast(bg, s1), 1.08);
test('s1 vs s2', kontrast(s1, s2), 1.08);
test('s2 vs s3', kontrast(s2, s3), 1.08);

console.log('\n' + (zle ? `${zle} BLEDOW, ${ok} ok` : `Wszystkie ${ok} pomiarow w normie`));
process.exit(zle ? 1 : 0);
