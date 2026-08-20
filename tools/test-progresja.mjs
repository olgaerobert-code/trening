// Testy logiki progresji.  Uruchom:  node tools/test-progresja.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const P = require('../progresja.js');

let ok = 0, zle = 0;
const test = (nazwa, a, e) => {
  const A = JSON.stringify(a), E = JSON.stringify(e);
  if (A === E) { ok++; console.log('  OK   ' + nazwa); }
  else { zle++; console.log('  BLAD ' + nazwa + '\n         jest:   ' + A + '\n         oczek.: ' + E); }
};

const plan = { sets: 4, reps: 8, kg: 97.5 };
const serie = (n, r, kg) => Array.from({ length: n }, () => ({ r, kg }));

console.log('\nOcena sesji');
test('komplet powtórzeń przy planowanym ciężarze → czysto',
  P.judgeSession(plan, serie(4, 8, 97.5)), 'czysto');
test('więcej powtórzeń w jednej serii → zapas',
  P.judgeSession(plan, [{ r: 8, kg: 97.5 }, { r: 8, kg: 97.5 }, { r: 8, kg: 97.5 }, { r: 10, kg: 97.5 }]), 'zapas');
test('cięższy ciężar przy komplecie → zapas',
  P.judgeSession(plan, serie(4, 8, 100)), 'zapas');
test('mniej powtórzeń w ostatniej serii → niedowoz',
  P.judgeSession(plan, [{ r: 8, kg: 97.5 }, { r: 8, kg: 97.5 }, { r: 8, kg: 97.5 }, { r: 6, kg: 97.5 }]), 'niedowoz');
test('zdjęty ciężar mimo kompletu powtórzeń → niedowoz',
  P.judgeSession(plan, serie(4, 8, 90)), 'niedowoz');
test('zapisane 3 serie z 4 → brak (nie kara za niewpisanie)',
  P.judgeSession(plan, serie(3, 8, 97.5)), 'brak');
test('zero wpisów → brak',
  P.judgeSession(plan, []), 'brak');
test('ćwiczenie bez liczbowego ciężaru, komplet → czysto',
  P.judgeSession({ sets: 3, reps: 12, kg: null }, serie(3, 12, null)), 'czysto');

console.log('\nKorekta z dwóch tygodni');
test('czysto + czysto → +2,5%', P.adjustment('czysto', 'czysto'), { pct: 0.025, powod: 'dwa tygodnie czysto' });
test('zapas + zapas → +5%', P.adjustment('zapas', 'zapas'), { pct: 0.05, powod: 'dwa tygodnie z zapasem' });
test('czysto + zapas → +2,5%', P.adjustment('czysto', 'zapas'), { pct: 0.025, powod: 'dwa tygodnie czysto' });
test('niedowoz + niedowoz → −5%', P.adjustment('niedowoz', 'niedowoz'), { pct: -0.05, powod: 'dwa tygodnie z niedowozem' });
test('czysto + niedowoz → 0%', P.adjustment('czysto', 'niedowoz'), { pct: 0, powod: 'niedowóz w jednym tygodniu' });
test('niedowoz + czysto → 0%', P.adjustment('niedowoz', 'czysto'), { pct: 0, powod: 'niedowóz w jednym tygodniu' });
test('brak danych w N−1 → 0%', P.adjustment('czysto', 'brak'), { pct: 0, powod: 'zbieram dane' });
test('brak danych w N−2 → 0%', P.adjustment('brak', 'zapas'), { pct: 0, powod: 'zbieram dane' });

console.log('\nZastosowanie korekty');
test('150 kg +2,5% → 152,5', P.applyAdjustment(150, 0.025), 152.5);
test('150 kg +5% → 157,5', P.applyAdjustment(150, 0.05), 157.5);
test('150 kg −5% → 142,5', P.applyAdjustment(150, -0.05), 142.5);
test('limit: +30% ścięte do +10%', P.applyAdjustment(150, 0.30), 165);
test('limit: −30% ścięte do −10%', P.applyAdjustment(150, -0.30), 135);
test('zaokrąglenie do 2,5 kg', P.applyAdjustment(80, 0.025), 82.5);
test('zero korekty nie rusza wartości', P.applyAdjustment(105, 0), 105);

console.log('\nPodwójna progresja ćwiczeń dodatkowych');
test('dwa tygodnie czysto → +2,5 kg', P.accSuggestion('czysto', 'czysto', 20), 22.5);
test('zapas w obu → +2,5 kg', P.accSuggestion('zapas', 'zapas', 20), 22.5);
test('niedowóz blokuje propozycję', P.accSuggestion('czysto', 'niedowoz', 20), null);
test('brak danych blokuje propozycję', P.accSuggestion('brak', 'czysto', 20), null);
test('bez liczbowego ciężaru brak propozycji', P.accSuggestion('czysto', 'czysto', null), null);

console.log('\nScenariusz z planu: wyciskanie, E1RM 150');
{
  // tydzień 7 (deload) pomijamy w ocenie — sprawdzamy tylko 8 i 9
  const t8 = P.judgeSession({ sets: 5, reps: 4, kg: 123.75 }, serie(5, 4, 123.75));
  const t9 = P.judgeSession({ sets: 5, reps: 4, kg: 127.5 }, serie(5, 5, 127.5));
  const k = P.adjustment(t8, t9);
  test('tydz. 8 czysto, tydz. 9 z nadwyżką → +2,5%', [t8, t9, k.pct], ['czysto', 'zapas', 0.025]);
  test('E1RM 150 → 152,5', P.applyAdjustment(150, k.pct), 152.5);
}

console.log('');
console.log('Historia i tonaz');
test('jednakowe powtorzenia skracamy',
  P.opisWykonania([{r:8,kg:105},{r:8,kg:105},{r:8,kg:105}]), '3 × 8 @ 105 kg');
test('nierowne powtorzenia wypisujemy',
  P.opisWykonania([{r:8,kg:105},{r:8,kg:105},{r:6,kg:105}]), '8/8/6 @ 105 kg');
test('bez ciezaru - sam zapis powtorzen',
  P.opisWykonania([{r:12,kg:null},{r:12,kg:null}]), '2 × 12');
test('puste wejscie -> nic', P.opisWykonania([]), null);
test('dziury w tablicy pomijane', P.opisWykonania([null,{r:5,kg:60},null]), '1 × 5 @ 60 kg');
test('przecinek dziesietny w ciezarze', P.opisWykonania([{r:4,kg:127.5}]), '1 × 4 @ 127,5 kg');
test('tonaz 3 x 8 @ 105', P.tonaz([{r:8,kg:105},{r:8,kg:105},{r:8,kg:105}]), 2520);
test('tonaz pomija serie bez ciezaru',
  P.tonaz([{r:8,kg:105},{r:12,kg:null},{r:8,kg:105}]), 1680);
test('tonaz z pustych serii to zero', P.tonaz([null,null]), 0);

console.log('\n' + (zle ? `${zle} BŁĘDÓW, ${ok} ok` : `Wszystkie ${ok} testów przeszło`));
process.exit(zle ? 1 : 0);
