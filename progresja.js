/* Ocena sesji i korekta E1RM z okna dwóch tygodni.
 *
 * Ten plik działa w dwóch światach: w przeglądarce definiuje funkcje globalnie,
 * a w Node udostępnia je przez module.exports. Dzięki temu dokładnie ta sama
 * logika, która steruje planem, jest pokryta testami z tools/test-progresja.mjs.
 *
 * Kluczowe założenie: NIE liczymy tu E1RM z wykonanej serii. Sufit RPE znaczy
 * „zostaw co najmniej N w zapasie", więc wzór na maks systematycznie zaniżałby
 * plan u kogoś, kto sufitu pilnuje. Patrzymy wyłącznie na odchyłkę od tego,
 * co było zaplanowane.
 */

const KROK = 2.5;              // zaokrąglenie ciężarów, zgodnie z arkuszem Zasady
const LIMIT_KOREKTY = 0.10;    // „nigdy więcej niż 10% naraz"

const round25 = x => Math.round(x / KROK) * KROK;

/* Ocena jednej sesji dla jednego ćwiczenia.
 *
 * planned = { sets, reps, kg }   kg === null przy ćwiczeniach bez liczbowego ciężaru
 * logged  = [ { r, kg }, ... ]   tyle wpisów, ile serii faktycznie zapisano
 *
 * Zwraca: 'brak' | 'niedowoz' | 'czysto' | 'zapas'
 */
function judgeSession(planned, logged) {
  if (!planned || !planned.sets || !planned.reps) return 'brak';
  const rows = (logged || []).filter(s => s && s.r != null);
  // Niekompletny zapis to NIE jest niedowóz. Kto zapomniał wpisać, nie dostaje
  // kary — po prostu nie dostaje korekty.
  if (rows.length < planned.sets) return 'brak';

  let zapas = false;
  for (const s of rows.slice(0, planned.sets)) {
    const lzej = planned.kg != null && s.kg != null && s.kg < planned.kg;
    const ciezej = planned.kg != null && s.kg != null && s.kg > planned.kg;
    if (lzej || s.r < planned.reps) return 'niedowoz';
    if (ciezej || s.r > planned.reps) zapas = true;
  }
  return zapas ? 'zapas' : 'czysto';
}

/* Korekta na podstawie dwóch ostatnich tygodni.
 * older = tydzień N−2, newer = tydzień N−1.
 * Zwraca { pct, powod }.
 */
function adjustment(older, newer) {
  if (older === 'brak' || newer === 'brak') return { pct: 0, powod: 'zbieram dane' };

  const slabo = j => j === 'niedowoz';
  if (slabo(older) && slabo(newer)) return { pct: -0.05, powod: 'dwa tygodnie z niedowozem' };
  // Dokładnie jeden słaby tydzień: trzymamy ciężar i dajemy szansę powtórzyć.
  if (slabo(older) || slabo(newer)) return { pct: 0, powod: 'niedowóz w jednym tygodniu' };

  if (older === 'zapas' && newer === 'zapas') return { pct: 0.05, powod: 'dwa tygodnie z zapasem' };
  return { pct: 0.025, powod: 'dwa tygodnie czysto' };
}

/* Nowe E1RM po korekcie: limit ±10% i zaokrąglenie w dół do 2,5 kg.
 *
 * Zaokrąglamy w dół, bo tak każe arkusz Zasady i bo przy powtarzanych korektach
 * zaokrąglanie do najbliższego potrafi windować plan w górę. Jest jednak haczyk:
 * +2,5% z 80 kg to 82 kg, co po zaokrągleniu w dół wraca do 80 i korekta znika.
 * Dlatego wymuszamy minimum jeden krok w zamierzoną stronę.
 */
function applyAdjustment(e1rm, pct) {
  const capped = Math.max(-LIMIT_KOREKTY, Math.min(LIMIT_KOREKTY, pct));
  if (!capped) return e1rm;
  let out = Math.floor(e1rm * (1 + capped) / KROK) * KROK;
  if (capped > 0 && out <= e1rm) out = e1rm + KROK;
  if (capped < 0 && out >= e1rm) out = e1rm - KROK;
  return out;
}

/* Podwójna progresja ćwiczeń dodatkowych.
 * Dwa tygodnie z kompletem powtórzeń → propozycja najmniejszego skoku w górę.
 * Bez liczbowego ciężaru nie ma czego dodać — zwracamy null.
 */
function accSuggestion(older, newer, lastKg, krok = KROK) {
  if (lastKg == null) return null;
  if (older === 'brak' || newer === 'brak') return null;
  if (older === 'niedowoz' || newer === 'niedowoz') return null;
  return round25(lastKg + krok);
}

/* Ocena calego bloku dla jednego boju.
 *
 * oceny = tablica wynikow judgeSession, po jednym na tydzien bloku, BEZ deloadu
 * (deload jest z zalozenia lekki, wiec nie da sie go ocenic).
 *
 * Arkusz Zasady stawia warunek ostro: „jesli KAZDA sesja zmiescila sie w suficie
 * RPE". Brak zapisu tez lamie komplet — nie dlatego, ze to kara, tylko dlatego,
 * ze o tamtym tygodniu nic nie wiadomo, a rekalibracja o 10% to za duzo, zeby
 * ja opierac na domysle.
 */
function ocenaBloku(oceny) {
  const r = (oceny || []).filter(o => o != null);
  const brak = r.filter(o => o === 'brak').length;
  const slabe = r.filter(o => o === 'niedowoz').length;
  return {
    tygodni: r.length,
    zapisanych: r.length - brak,
    niedowozy: slabe,
    komplet: r.length > 0 && brak === 0 && slabe === 0,
  };
}

/* Rekalibracja po bloku: +10% i ani grama wiecej („nigdy wiecej niz 10% naraz").
 * Zaokraglenie w dol do 2,5 kg, jak wszedzie indziej w planie, z gwarancja
 * jednego kroku — inaczej przy lekkich ciezarach korekta znikalaby w podlodze.
 */
function rekalibracja(e1rm, ocena) {
  if (e1rm == null || !ocena || !ocena.komplet) return null;
  const out = Math.floor(e1rm * 1.1 / KROK) * KROK;
  return out > e1rm ? out : e1rm + KROK;
}

/* Opis wykonanej sesji do pokazania jako „ostatnio”.
 * Jednakowe powtorzenia skracamy do "3 × 8"; rozne wypisujemy "8/8/6",
 * bo wlasnie ta nierownosc niesie informacje.
 */
function opisWykonania(rows) {
  const r = (rows || []).filter(Boolean);
  if (!r.length) return null;
  const powt = r.map(x => x.r);
  const jednakowe = powt.every(x => x === powt[0]);
  const zKg = r.find(x => x.kg != null);
  const fmtKg = n => String(Math.round(n * 100) / 100).replace('.', ',');
  return (jednakowe ? r.length + ' × ' + powt[0] : powt.join('/'))
       + (zKg ? ' @ ' + fmtKg(zKg.kg) + ' kg' : '');
}

/* Tonaz: powtorzenia razy kilogramy. Serie bez liczbowego ciezaru (guma,
 * masa ciala) nie wchodza — nie ma czego mnozyc, a doliczanie ich zerem
 * albo zgadywana masa ciala zafalszowaloby trend. */
function tonaz(rows) {
  return (rows || []).reduce((a, x) => (x && x.kg != null ? a + x.r * x.kg : a), 0);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { judgeSession, adjustment, applyAdjustment, accSuggestion, ocenaBloku, rekalibracja, opisWykonania, tonaz, round25, KROK, LIMIT_KOREKTY };
}
