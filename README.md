# Trening

Statyczna aplikacja (PWA) z 12-tygodniowym planem treningowym pod **zdrowe kolana,
kostki i biodra**. Prowadzi przez sesję seria po serii, odlicza przerwy i rundy na
worku, liczy ciężary bojów z numeru tygodnia i pokazuje, ile pracy dostał w tygodniu
każdy z trzech stawów.

Bez kont, bez backendu poza opcjonalną synchronizacją dziennika. Po pierwszym
otwarciu działa offline.

## Plan (cykl 4)

Sprzęt: sztanga ze stojakiem, ławka, hantle, drążek, gumy, skrzynia albo stopień
i worek treningowy. Żadnych maszyn.

| Dzień | Sesja |
|---|---|
| wt | **A · Góra** — wyciskanie (w parze z piszczelowym), bułgarski + podciąganie, goblet z piętami w górze + Nordic, rundy na worku |
| śr | rozciąganie i test zakresów w domu, ~17 min |
| czw | **B · Biodra**, bez sztangi — skrzynia + wiosłowanie, ciąg jednonóż + plank kopenhaski, przysiad hiszpański + deska boczna, łydka + strzałkowe, rundy na worku |
| pt | rozciąganie i test zakresów |
| sob | **C · Dół** — front squat, martwy ciąg, łydka stojąc + spacer farmera |
| nd | joga (20 pozycji statycznych, wersja krótka ~20 min) |

- **Trzy stawy.** Każde ćwiczenie ma w planie pole `cel` (`kolano`, `kostka`,
  `biodro`, `gora`, `tulow`, `kondycja`). Z niego aplikacja rysuje znaczek stawu na
  karcie ćwiczenia i liczy bilans tygodnia (`bilansStawow`).
- **Bloki.** Schemat ćwiczeń dodatkowych jest zapisany na każdy tydzień
  (`scheme.tyg`): blok 1 (tyg. 1–3), blok 2 (4–6), tydzień 7 lżej (2 serie),
  blok 3 (8–11), tydzień 12 sprawdzian. Boje idą procentami E1RM jak dotąd.
- **Worek.** Rundy to zwykłe ćwiczenie ze schematem `3 × 2 min`; aplikacja odlicza
  rundę i przerwę sama.
- **Test zakresów.** Głębokie zgięcie kolana i rotacja biodra wracają poziom po
  poziomie, z oceną 0–1–2 po każdej pozycji; aplikacja podpowiada poziom.

Plan robi generator `tools/cykl4.py` → `plan.json`. Zamknięte cykle leżą
w `plan-cykl1.json` … `plan-cykl3.json` (potrzebne do raportu z archiwum; generatory
`tools/cykl2.py` i `tools/cykl3.py` piszą już tylko tam). Joga: `tools/joga2.py`.

Treść planu jest wyłącznie treningowa — repozytorium jest publiczne. Test
w `tools/test-widoki.mjs` pilnuje listy słów, które nie mają prawa się w nim znaleźć.

## Co jest w aplikacji

- **Dziś** — kartka z kalendarza (dzień miesiąca dużą cyfrą) i pierścień tygodnia
  cyklu; tap w pierścień rozwija 12 tygodni, a zmiana tygodnia wymaga potwierdzenia.
  Tydzień to **karuzela siedmiu plakatów** przesuwana palcem: siłownia, dni w domu,
  joga i dzień wolny. Plakat w fokusie (sesja dzisiejsza, zaległa albo najbliższa)
  jest żółty i ma figurkę boju, ciężar, przyrost od zeszłego tygodnia i serie na
  staw. Kropki dni pod spodem pokazują stan i przewijają do dnia. Niżej **mapa
  stawów** tygodnia (noga z boku: biodro, kolano, kostka).
- **Sesja** — scena i kolejka zamiast listy formularzy. **Scena** pokazuje jedną
  serię: animowaną figurkę ćwiczenia ze znakami stawów, ciężar i powtórzenia
  (− / + albo klawiatura), schemat, sufit RPE i talerze na stronę. Na dole ekranu
  jest **jeden duży przycisk**: „Zrobione" zapisuje serię i puszcza przerwę,
  „Start · 25 s" rusza serię na czas, w przerwie „Pomiń przerwę" i „+30 s".
  Zegar gra na scenie: przerwa to czarna scena z żółtym odliczaniem, seria na
  czas — żółta. Po przerwie scena sama wraca do następnej serii.
- **Kolejka** pod sceną — każde ćwiczenie jako wiersz ze światłami serii. Tap
  przenosi scenę na to ćwiczenie i rozwija jego serie do poprawek: ✓, arkusz
  z powtórzeniami i ciężarem, cofnięcie, „Odhacz wszystkie serie".
- **Figurki** (`figury.js`) — parametryczny ludzik: każde ćwiczenie to dwie pozy
  opisane kątami, z których powstaje animacja SVG; pozycje rozciągania i jogi
  mają pozy nieruchome. Widać je na scenie, plakatach, kartach pozycji
  i w trybie „Prowadź mnie".
- **Minutnik serii na czas** — izometria i rundy: 5 s na ustawienie, praca, przy
  ćwiczeniach na stronę 5 s na zmianę i druga strona; po ostatnim sygnale seria
  zapisuje się sama i rusza przerwa. Rundy na worku mają gong na start i koniec
  oraz stuknięcie 10 s przed końcem.
- **Dolny pasek** — cztery zakładki (Dziś, Plan, Postęp, Więcej); na ekranie sesji
  jego miejsce zajmuje przycisk sceny.
- **Rozciąganie i test zakresów** (śr, pt) oraz **joga** (nd) — karty z krokami,
  częstym błędem i minutnikiem, tryb „Prowadź mnie"; w jodze filmy w kartach.
- **Plan** — fazy cyklu, tydzień dzień po dniu (po rozwinięciu ćwiczenia ze
  schematem na bieżący tydzień) i zasady prowadzenia cyklu.
- **Postęp** — liczby cyklu, stawy tydzień po tygodniu, poziomy testu zakresów,
  przerwy między seriami, maksy (E1RM) z kalkulatorem, tonaż, wykres ciężarów
  trzech bojów, werdykty bloków i tabele tygodni.
- **Więcej** — synchronizacja i kod planu, ustawienia sesji, zegarek, przeniesienie
  tygodnia albo dnia, kopia zapasowa, archiwum cykli, raport cyklu do skopiowania.
- **Karta zaliczenia** — trzy światła, tonaż, stan stawów po sesji i obrazek
  1080 × 1920 do udostępnienia.

## Wygląd

Kierunek: siłownia w piwnicy w dniu startu. Grafit i papier, jedna turniejowa żółć
na kartę „Dziś" i główne przyciski, a kolory talerzy IPF tylko na narysowanym gryfie
i w seriach wykresu. Staw rozpoznaje się po miejscu na nodze, nie po kolorze.
Hierarchia idzie z wielkości pisma, nie z ramek.

- Kroje: **Trening Grotesk** (Mona Sans, OFL; szeroki i ciężki na liczby i tytuły,
  zwykły na tekst) i **Trening Mono** (Martian Mono, OFL; dane i podpisy). Pliki
  w `fonts/` są przycięte do polskiej łaciny (76 KB razem) i mają zmienioną nazwę
  wewnętrzną — tego wymaga licencja przy modyfikacji. Licencje leżą obok.
- Jasny i ciemny motyw według ustawienia telefonu; tokeny na górze `app.css`.
- Cele dotyku co najmniej 44 px, ruch do 300 ms i tylko po akcji,
  `prefers-reduced-motion` wyłącza animacje.
- Ikony aplikacji rysuje `node tools/make-icons.mjs` (znak trzech stawów).

## Logika, która się nie zmieniła

- `ciężar = floor(E1RM × % / 2,5) × 2,5`; serie dojściowe gryf → 50% → 70% → 85%;
  drugi bój w tej samej sesji (ciąg po przysiadzie) dostaje skróconą drabinkę.
- **Samoregulacja**: dwa ostatnie tygodnie sterują E1RM (+5% / +2,5% / 0% / −5%,
  limit ±10%, „Cofnij"). Po bloku 1 i 2 komplet sesji w suficie RPE podnosi dół
  o 10%. Czyste funkcje w `progresja.js`.
- Nie liczymy E1RM z wykonanej serii (sufit RPE znaczy „zostaw zapas"), a przy
  każdej serii zapisujemy też plan z chwili zapisu — korekta w górę nie przerabia
  dawnego „czysto" na „niedowóz".
- **Przerwy**: czas stoi w opisie ćwiczenia („Przerwy 3 min", „90 s po parze
  (od bloku 3: 120 s)"); chwile odhaczeń dają ocenę przerw wobec planu.
- **Dni tygodnia** siedzą w planie (`dzien` przy dniach i jodze, `rozciaganie.dni`).

## Przejście między cyklami

Plan z wyższym `cykl` zamyka poprzedni: dziennik idzie do archiwum na urządzeniu,
nowy cykl startuje od tygodnia 1. Przy przejściu:

- maksy przechodzą z poprzedniego cyklu (`e1rmZPoprzedniego`),
- ćwiczenia dodatkowe o tej samej nazwie dostają ostatni ciężar z dziennika,
- **serie z bieżącego tygodnia kalendarzowego** przechodzą do tygodnia 1 dla
  ćwiczeń, które w nowym planie stoją tego samego dnia pod tą samą nazwą,
- sesje tygodnia 1, których dzień minął bez zapisu, są oznaczone jako pominięte.

Dziennik zna tylko pozycje (`tydzień|dzień|numer ćwiczenia`), więc zmiana ćwiczeń
w planie zawsze idzie przez nowy cykl — inaczej stare serie trafiłyby pod nowe
ćwiczenia. W bazie każdy cykl ma osobny klucz (kod planu + `-C4`).

## Dane i synchronizacja

`localStorage`: stan (`trening.v1`), dziennik serii (`trening.log.v1`), korekty,
własne ciężary, joga (`trening.mob.v1`), rozciąganie i test zakresów
(`trening.rozc.v1`: odhaczenia `{ "3|sr": { r1: 1 } }`, zakresy
`{ "3|sr|z": { q1: { p: 2, o: 1 } } }`), czasy serii, treningi, pominięcia,
archiwum cykli, kolejka wysyłkowa i kod planu.

Supabase (opcjonalnie): wyłącznie liczby — kod planu, tydzień, dzień, ćwiczenie,
seria, powtórzenia, kilogramy, znacznik czasu — plus jedna paczka stanu. Tabele są
zamknięte dla klucza publikowalnego, ruch idzie przez funkcje wymagające kodu planu
(`tools/supabase.sql`). Offline first: wpis ląduje lokalnie i dosyła się, gdy wróci
zasięg.

## Uruchomienie lokalnie

```bash
python -m http.server 8080      # albo: npx serve .
```

Potem `http://localhost:8080`.

**Testy w przeglądarce (Playwright itp.):** lokalna kopia synchronizuje się z tym
samym wspólnym dziennikiem co telefon. Zawsze odcinaj bazę i ustaw testowy kod
planu, zanim strona się załaduje:

```js
await context.route(/supabase\.co/, r => r.abort());
// i w skrypcie startowym: localStorage.setItem('trening.key.v1', 'TEST-FABL-0001')
```

## Testy

```bash
node tools/test-progresja.mjs   # czysta logika: ocena sesji, korekty, rekalibracja
node tools/test-widoki.mjs      # app.js na atrapie DOM-u: widoki, dziennik, przejścia cykli, plan
node tools/test-kontrast.mjs    # kontrast tokenów z app.css w obu motywach
```

`test-widoki.mjs` uruchamia `app.js` w `node:vm` z `navigator.onLine = false`, więc
nie ma jak dotknąć bazy. Logika jest sprawdzana na planie cyklu 1, przejścia na
planach cykli 2 i 3, a bieżący plan ma własną sekcję: komplet serii w każdym
tygodniu, przerwy, fazy minutnika, bilans stawów i **budżet godziny** każdej sesji
(rozgrzewka, drabinka, praca z tempem, przerwy z opisu).

## Wydanie

GitHub Pages z gałęzi `main`, katalog główny. Po każdej zmianie plików podbij
znaczniki wersji, inaczej przeglądarka albo service worker poda starą wersję:

- `?v=N` w `index.html` (`app.css`, `app.js`, `progresja.js`, `figury.js`, krój w `preload`),
  w `app.css` (adresy krojów), w `app.js` (`plan.json`, `plan-cykl${n}.json`)
  i na liście `ASSETS` w `sw.js`,
- `CACHE` w `sw.js`.

Aplikacja sama sprawdza numer wersji przy starcie i powrocie na ekran; w trakcie
sesji pokazuje pasek „Nowa wersja" zamiast przeładowywać.

## Struktura

```
index.html        powłoka: nagłówek, #app, dolny pasek
app.css           tokeny, kroje, wszystkie style
app.js            plan, dziennik, synchronizacja, zegar, widoki
progresja.js      czyste funkcje oceny sesji i korekt (wspólne z testami)
figury.js         figurki ćwiczeń: pozy z kątów → animowane SVG
plan.json         bieżący plan (cykl 4)
plan-cykl*.json   plany zamkniętych cykli
sw.js             cache offline
fonts/            kroje i ich licencje
tools/cykl4.py    generator planu; cykl2.py, cykl3.py, joga2.py
tools/*.mjs       testy, ikony, konwerter arkusza cyklu 1
tools/supabase.sql
```
