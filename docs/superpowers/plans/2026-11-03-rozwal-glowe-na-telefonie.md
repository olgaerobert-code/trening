# Rozwal głowę na telefonie — prowadzenie sesji seria po serii

Cel: aplikacja prowadzi przez trening seria po serii tak dobrze, że chce się ją
pokazać kumplowi na siłowni. Używana na telefonie, między seriami, spoconym
kciukiem. Plan ścisza to, co dziś gra cały czas, i dokłada jeden tryb, który
naprawdę prowadzi.

Kierunek wizualny zostaje: tablica wyników na stadionie nocą, krój Archivo,
kolory dni (A niebieski, B zielony, C pomarańczowy, joga fioletowa). Jedyną
gwiazdą jest sztanga 3D z talerzami w kolorach IPF.

Zasady obowiązujące w każdym etapie:

- Dane są święte. Nie ruszamy logiki E1RM, korekt, rekalibracji, synchronizacji
  ani `migracjaPoniedzialku`. Zapis serii idzie wyłącznie przez istniejące
  `logSet`, `kgwSet`, `state.acc` + `saveAcc`, `zapiszCzasSerii`,
  `rozpocznijTrening`, `zakonczTrening`.
- Po każdej zmianie plików podbijamy wersje: `?v=N` przy `app.js`,
  `progresja.js`, `ruch.js` w `index.html`, przy `plan.json` i `plan-cykl${n}.json`
  w `app.js`, cała lista `ASSETS` w `sw.js` oraz `CACHE` w `sw.js`.
- Każdy etap kończy się trzema zielonymi testami (`tools/test-progresja.mjs`,
  `tools/test-widoki.mjs`, `tools/test-kontrast.mjs`), commitem po polsku na
  gałęzi `prowadzenie-sesji` i pushem tej gałęzi. Nigdy do `main`.
- Przeglądarka testowa ma bazę odciętą przed załadowaniem strony
  (`page.route('**/*.supabase.co/**', r => r.abort())`) i kod planu
  `trening.key.v1 = TEST-FABL-0001`.
- Ruch: elementy interfejsu poniżej 300 ms, ease-out, bez ease-in. Tylko
  `transform` i `opacity`. Nic nie gra w tle bez przerwy. `prefers-reduced-motion`
  wyłącza wszystko. Pauza, gdy karta jest w tle.
- Nowe funkcje logiki (bez DOM-u) dostają testy w `tools/test-widoki.mjs`; atrapa
  DOM-u tam obsługuje tylko proste selektory klas (`.klasa`), `classList`,
  `textContent`, `click()`.

## Etap A — Ściszenie

Co dziś gra cały czas i ma ucichnąć:

1. `index.html`: zorza w tle (`body::before` z animacją `zorza`) — zostaje
   nieruchome, bardzo delikatne tło albo nic. Plamy na kartach
   (`.tile.hero-s::before`, `.lista .tile::before`, `.zkarta::before`,
   `.prowstart::before`, keyframes `plama`) — usunąć. Krążąca poświata na obwodzie
   panelu (`.panel::before` z `spin`) — zastąpić statyczną cienką obwódką
   w kolorach dni. Biegnące pasy na paskach postępu (`pasy`), pulsowanie
   (`pulsuj` na `.filmplay`, `.pico`, `.prmin.leci b`), miganie (`migaj` na
   `.syncst.wait`), błysk na przycisku (`blysk-cta`) — usunąć. Gradientowy
   połysk na numerze tygodnia (`.wval b` z `background-clip:text`) — zwykły kolor
   atramentu.
2. Wersalikowe podpisy z rozstrzelonymi literami nad każdym nagłówkiem
   (`.eyebrow`, `.m .ml`, `.stat .sl`, `.ps .pl2`, `.top .data`, `.wsub`, `.hpg`,
   `.sprog`, `.kglab`, `.przenlab`, `.back`, `.tab`, `.sztanga3d-opis`, `.more`,
   `.wiecej`, `.filmzmien`, `.zeye`, `.zbl`, `.trn-et`, `.preye`, `.prmin span`,
   `.przv span`, `.prl`, `.blad span`, `.posztange span`, `th`) — zwykłe pismo,
   bez `letter-spacing`, bez `text-transform`, 12–13 px, kolor `--ink-3`.
   Nagłówki sekcji (`.sekcja`, `.card h3`) zostają Archivo, ale bez linii
   rysowanej od lewej.
3. `ruch.js`: bieżnia pod nagłówkiem (`bieznia`) — usunąć. Konfetti i wibracja
   przy każdej serii — usunąć; konfetti zostaje tylko na karcie zaliczenia
   sesji. Odsłanianie kart przy przewijaniu (`.ukryty`/`.widac`) — usunąć, karty
   są widoczne od razu. Duch poprzedniego ekranu — 220 ms, ease-out. Fala po
   tapnięciu — 320 ms. Pochylenie karty „Dziś" pod palcem — usunąć. Paralaksa
   litery dnia — zostaje, bo działa tylko przy przewijaniu i tylko przez
   `transform`.
4. Sztanga 3D: koniec z obracaniem w tle. Pętla `requestAnimationFrame` chodzi
   wyłącznie, gdy talerze wjeżdżają (ok. 600 ms) albo gdy palec ją obraca.
   W spoczynku jeden statyczny kadr pod kątem około −0,55 rad. Pauza, gdy karta
   jest w tle (`document.hidden`).
5. Ekrany na całą wysokość: karty ćwiczeń w sesji wracają do naturalnej
   wysokości (koniec z `min-height: 100dvh` na `.ex`), żeby lista przewijała
   się szybko. Plakaty sesji na Dziś (`.lista .tile`) — najwyżej 42vh. Karta
   „Dziś" (`.tile.hero-s`) — naturalna wysokość ze sztangą.
6. Wejście widoku: `rise` 260 ms, ease-out, odstępy 30 ms, najwyżej 6 elementów
   z opóźnieniem.

Kryterium: w DevTools po 3 s od wejścia na ekran Dziś nie ma żadnej trwającej
animacji poza tym, co użytkownik właśnie dotknął. Trzy testy zielone.

## Etap B — Telefon pod kciukiem

1. Pasek stanu iPhone'a: `apple-mobile-web-app-status-bar-style` na
   `black-translucent`, góra ekranu z `env(safe-area-inset-top)` na `.wrap`,
   `.prow .prgora`, `.trn.live` (sticky), `.aktualizacja`. `theme-color` zgodny
   z tłem obu motywów.
2. Cele dotyku co najmniej 48 × 48 px: `.tick` 52 px, `.tbtn` 48 px wysokości,
   `.mini` 44 px, `.wchip` 44 px, `.dk` 40 px z marginesem, przyciski `.step`
   48 px, `.prx`, `.filmx` 44 px, `.back` z paddingiem 12 px. Suwaki: tor 6 px,
   kciuk 30 px, wysokość pola 48 px.
3. Klawiatura zamiast suwaka tam, gdzie liczba jest ważna: tapnięcie w liczbę
   ciężaru (`.kglab b`) i w liczbę powtórzeń (`.setval b`) otwiera w tym samym
   miejscu pole `<input type="text" inputmode="decimal">` (powtórzenia:
   `inputmode="numeric"`), 18 px (iOS nie powiększa ekranu przy ≥ 16 px),
   zaznaczone w całości. Enter albo utrata fokusu zapisuje tą samą drogą co
   suwak (`podglad` + `zapiszKg`; dla powtórzeń jak `sl.onchange`). Escape
   anuluje. Pole przy fokusie wjeżdża na środek ekranu
   (`scrollIntoView({block:'center'})`), żeby klawiatura go nie zasłoniła.
   Funkcja `parsujLiczbe(tekst)` jest czysta i ma test (przecinek, kropka,
   spacje, zakres).
4. `touch-action: manipulation` i `user-select: none` na przyciskach;
   `overscroll-behavior` zostaje.

Kryterium: wszystkie elementy klikalne w sesji mają co najmniej 44 px w obu
osiach (sprawdzone skryptem Playwright). Testy zielone.

## Etap C — Przytrzymanie ✓

Dziś tapnięcie w ✓ odhacza, a drugie tapnięcie cofa. Spocony kciuk cofa przez
pomyłkę. Nowe zachowanie wiersza serii:

1. Tap w ✓ na nieodhaczonej serii: odhacza (jak dziś) + wibracja 12 ms.
2. Tap w ✓ na odhaczonej serii: nic nie cofa; przycisk robi krótki ruch
   (`transform`, 200 ms) i pod wierszem na 1,5 s pojawia się podpowiedź
   „Przytrzymaj, żeby poprawić".
3. Przytrzymanie ✓ (450 ms, z wibracją na progu) na dowolnej serii otwiera
   arkusz korekty od dołu (`.arkusz`): nazwa ćwiczenia, „Seria 2 z 4", dwa
   duże steppery (− 8 + powtórzeń, − 90 + kg co 2,5), przyciski „Zapisz",
   „Cofnij odhaczenie" (tylko dla odhaczonej) i „Anuluj". Zapis idzie tą samą
   drogą co suwak. Arkusz zamyka się tapnięciem w tło albo Escape.
4. Przytrzymanie wykrywa `pointerdown` → `setTimeout(450)`, przerwane przez
   `pointerup`, `pointercancel`, `pointerleave` albo ruch > 10 px (przewijanie).
   Logika w czystej funkcji `przytrzymanie(el, { tap, hold, ms })`, zwracającej
   funkcję sprzątającą; test sprawdza, że krótkie naciśnięcie woła `tap`,
   a długie `hold` (atrapa `setTimeout` w sandboxie testu).

Kryterium: w teście widoków seria odhacza się tapnięciem, drugi tap jej nie
cofa, `hold` otwiera arkusz, „Cofnij odhaczenie" cofa. Testy zielone.

## Etap D — Przerwa i powiadomienie

1. Powiadomienie o końcu przerwy niezależne od ustawienia zegarka: osobny
   przełącznik „Powiadomienie o końcu przerwy" w Dziennik → W trakcie sesji
   (`state.powiadomPrzerwa`, zapis w `trening.v1` razem z `autoPrzerwa`,
   domyślnie włączone). `powiadomZegarek` wysyła, gdy włączony jest zegarek
   ALBO ten przełącznik; powiadomienie ma `tag: 'przerwa'`, `renotify: true`,
   `vibrate: [200,100,200]`. Prośba o zgodę przez istniejący krok z karty
   „Zegarek" (bez nowego ekranu).
2. Kapsuła w czasie przerwy: obok pierścienia przyciski „+30 s" i „Pomiń"
   (48 px), odliczanie czytelne z metra (`.ring .lab` 16 px).
3. Koniec przerwy, gdy aplikacja jest w tle: po powrocie pierścień pokazuje
   „0:00" na zielono (stan `tFired`, jest), kapsuła błyska raz (jest).
4. W trybie prowadzenia (etap E) przerwa jest pełnoekranowa.

Kryterium: test `przedluzPrzerwe(30)` wydłuża `tEnd`; test przełącznika
w ustawieniach. Testy zielone.

## Etap E — „Prowadź sesję"

Tryb prowadzenia dla dni A, B, C, wzorowany na `prowadzJoge`
(`app.js`, funkcja `prowadzJoge`): jedna seria na cały ekran.

1. Wejście: na górze ekranu sesji duży przycisk „Prowadź sesję" w kolorze dnia
   (jak `.prowstart` w jodze), dostępny tylko w bieżącym tygodniu albo gdy
   sesja nie jest kompletna. Startuje od pierwszej nieodhaczonej serii.
2. Kolejka serii: czysta funkcja `kolejkaSesji(day, w)` zwraca listę kroków
   `{ it, i, pl, super }` w kolejności wykonania; superseria przeplata serie pary
   (A1 s1, A2 s1, A1 s2, A2 s2…), ćwiczenia poza superserią idą seria po serii.
   Test: kolejność, liczba kroków = suma serii, `nastepnyKrok` omija odhaczone.
3. Ekran serii: kreski postępu na górze (po jednej na krok, odhaczone w kolorze
   dnia), nazwa ćwiczenia, sztanga 3D dla boju głównego (`.ex.main` →
   ta sama scena co w karcie, załadowana na bieżący ciężar, statyczna),
   wielka liczba kg (tap = stepper ±2,5, zapis przez tę samą drogę co suwak:
   wydzielić z `setRows` funkcję `zapiszCiezar(it, day, w, pl, kg)`),
   „Seria 2 z 4 · cel 8 powt. · RPE 7", stepper powtórzeń (− 8 +, 56 px),
   wielki przycisk „Zaliczona ✓" (64 px). Ostatnia seria ćwiczenia ma podpis
   „Ostatnia seria".
4. Po zaliczeniu: zapis przez `logSet` + `zapiszCzasSerii` +
   `startPrzyPierwszejSerii`, potem ekran przerwy: wielkie odliczanie
   (`startTimer(przerwaPo(...))`), pierścień, „+30 s", „Pomiń", pod spodem
   „Następna: Seria 3 z 4 · 90 kg × 8" albo „Następne ćwiczenie: …". Koniec
   przerwy: wibracja i powiadomienie (etap D), ekran zostaje z przyciskiem
   „Dalej" — nie przeskakuje sam, bo telefon może leżeć na ławce.
5. Po ostatnim kroku: `zakonczTrening` (jeśli trening wystartował) → karta
   zaliczenia. ✕ wychodzi do listy; każda seria jest już zapisana, nic nie
   ginie. Escape, strzałki jak w jodze. `keepAwake(true)`. Przy ukryciu karty
   nic nie odlicza na ekranie (timer liczy od `tEnd`).
6. Dziś: gdy sesja bieżącego tygodnia jest w trakcie, karta „Dziś" pokazuje
   „W trakcie · seria 5/24 · następna: Wiosłowanie", a przycisk „Prowadź dalej →"
   otwiera sesję z trybem prowadzenia (`#/d/A?prowadz=1`, parametr
   odczytywany raz w `render`).

Kryterium: test przechodzi dwa kroki trybu prowadzenia na atrapie DOM-u
(zalicza serię → wpis w `state.log`, czas serii zapisany, przerwa
wystartowana, ostatni krok bez przerwy). Testy zielone.

## Etap F — Porządek na Dziś i w dokumentacji

1. Dziś: karta „Dziś" ze sztangą, pod nią kompaktowe plakaty sesji (42vh),
   panel tygodnia bez krążącej poświaty. Bez bieżni.
2. README: sekcje „Wygląd" i „Ruch" opisują stan po tym planie (ściszenie,
   prowadzenie sesji, przytrzymanie ✓, klawiatura, powiadomienie). Lista „Co się
   zapisuje" uzupełniona o `powiadomPrzerwa`.
3. Testy: 276 + nowe.

## Część kreatywna (między F a G)

Pięć pomysłów w jednym zdaniu każdy, bramka (częstotliwość, cel, szybkość,
funkcja), najwyżej dwa zbudowane, każdy w osobnym commicie. Gwiazdą zostaje
sztanga 3D.

## Etap G — Finał

1. Wersje podbite (`?v=`, `ASSETS`, `CACHE`).
2. Trzy testy, zrzuty „po" (Dziś, sesja A, sesja C, joga, Postęp, tryb
   prowadzenia, arkusz korekty, przerwa) w `/tmp`, nie w repo.
3. Pull request z gałęzi `prowadzenie-sesji` do `main` z opisem po polsku.
   Merge wykonuje właściciel po sprawdzeniu na telefonie.

Do sprawdzenia na prawdziwym telefonie przed merge: pasek stanu iPhone'a,
przytrzymanie ✓, klawiatura, wibracja, powiadomienie o końcu przerwy, tryb
„Prowadź sesję" na jednym prawdziwym treningu.

## Odstępstwa od planu

- Plik planu nie istniał w repozytorium ani na żadnej gałęzi, a skille
  superpowers, emil-design-eng, apple-design, mobile-native i frontend-design
  nie były dostępne w sesji. Plan został odtworzony z briefu właściciela
  (lista etapów A–G, zasady, część kreatywna, lista rzeczy do sprawdzenia na
  telefonie) i zapisany tutaj przed rozpoczęciem pracy.
