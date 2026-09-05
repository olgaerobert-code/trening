# Plan 12 tygodni

Statyczna aplikacja (PWA) z 12-tygodniowym planem treningowym. Ustawiasz numer tygodnia
na górze ekranu i wszystko poniżej przelicza się samo: ciężary bojów, schematy serii,
sufity RPE i serie dojściowe w rozgrzewce.

Bez kont, bez bazy danych, bez backendu. Po pierwszym otwarciu działa offline.

## Co jest w środku

- **Dni A / B / C** — ćwiczenia z ciężarem na wybrany tydzień, superserie sparowane
  wizualnie, opisy wykonania i pasek postępu sesji
- **Dziennik serii** — powtórzenia na suwaku przy każdej serii, ciężar **jeden na
  ćwiczenie** (sztangę ładujesz raz). Wszystko wypełnione z planu, ruszasz tylko przy
  odchyłce. Zmiany trafiają prosto do DOM-u, bez przebudowy ekranu — ~3 ms na ruch
- **Własny ciężar boju** — zjechanie suwakiem z liczby, którą podał plan, zostaje
  zapisane: na ten jeden tydzień to jest ciężar tego ćwiczenia. Karta i gryf pokazują
  go od razu, kolejne serie idą z nim, a pod suwakiem stoi liczba z planu i przycisk
  **Wróć do planu**. Zapisana sesja pokazuje ciężar z dziennika, nie z planu:
  po przeniesieniu tygodnia albo po wczytaniu kopii na ekranie stoi to, co
  naprawdę było na sztandze. Ocena sesji liczy się dalej wobec planu — zjazd
  w dół to niedowóz, bo tym właśnie jest
- **Samoregulacja** — dwa ostatnie tygodnie treningowe sterują E1RM na kolejny:
  +5% / +2,5% / 0% / −5%, limit ±10%, z przyciskiem Cofnij. Nic nie pyta o zgodę:
  plan przelicza się przy wejściu, a decyzje zostają do cofnięcia, nie do podjęcia
- **Synchronizacja** — dziennik między telefonem a laptopem przez kod planu (Supabase),
  offline first: wpis zawsze ląduje lokalnie i dosyła się, gdy wróci zasięg
- **Przeniesienie tygodnia** — sesja zapisana pod złym numerem przepina się w ustawieniach
  jednym ruchem: serie, własne ciężary bojów i odklikana joga. Cel musi być pusty,
  ruch w drugą stronę cofa zmianę, a drugie urządzenie powtarza go u siebie
- **Kalkulator talerzy** — tapnięcie w ciężar pokazuje, co założyć na gryf
  (kolory wg standardu IPF)
- **Postęp** — wykres trzech bojów przez 12 tygodni (jedna oś, krzyżyk i dymek pod
  palcem), pod nim bloki z werdyktami sesji i rekalibracją, a na dole zwinięte tabele
  tygodni. Kalkulator 1RM siedzi pod kartą E1RM na ekranie głównym — używa się go
  dwa razy na cykl, więc nie zajmuje kafla
- **Timer przerwy** — pierścień odliczający, 60 / 90 / 120 / 180 s, sygnał dźwiękowy
  (odliczanie 3-2-1 i trójdźwięk na koniec) plus wibracja; przełącznik wyciszenia
- **Niedziela — joga** — praktyka pod boje w sześciu blokach (~44 min): sekwencja
  stojąca, balans, biodra i pozycja przednia. Wersja krótka ~20 min, odklikiwanie
  liczone per tydzień, minutnik przy pozycjach z czasem. Każda z 22 pozycji ma pod
  „Jak to zrobić" **wejście krok po kroku**, częsty błąd i zdanie o tym, co daje pod
  sztangą — praktyka nie zakłada, że znasz nazwy z sanskrytu
- **Dziś** — aplikacja startuje na **najświeższej sesji tygodnia, która nie jest
  jeszcze zapisana w całości**: dziennik uzupełnia się po treningu, często dopiero
  następnego dnia, więc w sobotę otwiera piątkowy dzień C, a nie ekran główny.
  Sesji z przyszłości nie proponuje. Przy komplecie wraca do dzisiejszego dnia
  (pon → A, śr → B, pt → C, nd → joga), oznacza jego kafel i w dzień wolny mówi,
  kiedy następna. Do wyłączenia w ustawieniach
- **Raport bloków** — werdykt każdej sesji tydzień po tygodniu, frekwencja, tonaż
  i odklikane niedziele. Po bloku 1 i 2 sprawdza warunek z arkusza („KAŻDA sesja
  w suficie RPE") i sama podnosi ciężary dołu o 10%, a karta na ekranie głównym
  mówi, co się zmieniło, i zostawia „Cofnij". Blok bez kompletu **nie jest
  zamykany**: dziennik uzupełnia się po fakcie, więc podwyżka wejdzie później,
  jeśli brakujące sesje się znajdą. W tygodniu z rekalibracją korekta z dwóch
  tygodni omija podniesione boje — „nigdy więcej niż 10% naraz"
- **Zasady** prowadzenia cyklu

## Wygląd

Kierunek nazywa się **żeliwo**: neutralne powierzchnie mają ciepłe odchylenie (sprzęt
w piwnicy, nie ekran), a wszystkie dane — ciężary, procenty, RPE, tygodnie, serie —
idą krojem monospace, bo dziennik treningowy i tabela obciążeń zawsze były pisane
w kolumnach. Żadnych fontów z sieci: aplikacja ma działać offline.

Element rozpoznawczy to **narysowany załadowany gryf** pod każdym ciężarem z tabeli.
Nie ozdoba — instrukcja ładowania pokazana tak, jak ta rzecz wygląda na stojaku:
kolory wg standardu IPF, talerze ciężkie przy kołnierzu, lekkie na zewnątrz, średnice
i grubości w proporcji do prawdziwych krążków.

Zmiana tła unieważnia pomiar kontrastu, więc paleta ma własny test:

```bash
node tools/test-kontrast.mjs
```

Czyta tokeny wprost z `index.html` i sprawdza 17 par: tekst na trzech powierzchniach
(progi AAA/AA), kolory serii jako obiekty graficzne (≥ 3:1) i rozróżnialność samych
powierzchni między sobą.

Kolory serii na wykresie to sloty 1–3 palety kategorycznej w wariancie dark.
Przeszły komplet kontroli na powierzchni karty: pasmo jasności, próg chromy,
rozróżnialność przy zaburzeniach widzenia barw (najgorsza para ΔE 9,4 przy progu 8),
próg dla widzenia normalnego (20,9 przy progu 15) i kontrast ≥ 3:1.

## Uruchomienie lokalnie

Aplikacja czyta `plan.json` przez `fetch`, więc otwarcie pliku `index.html` bezpośrednio
z dysku nie zadziała. Potrzebny serwer:

```bash
python -m http.server 8080
# albo:  npx serve .
```

Potem `http://localhost:8080`. Na telefonie w tej samej sieci: `http://<IP-komputera>:8080`.

## Dane

`plan.json` to jedyne źródło treści. Powstaje z arkusza `plan-12-tygodni.xlsx`:

```bash
node tools/xlsx-to-json.mjs "C:/ścieżka/do/plan-12-tygodni.xlsx"
```

Konwerter nie ma żadnych zależności — czyta ZIP i XML sam (`tools/xlsx.mjs`).
Skoroszyt był tworzony przez openpyxl, więc komórki z formułami nie mają zapisanych
wyników. Dlatego `plan.json` przechowuje **wejścia** (procenty E1RM, schematy serii,
sufity RPE), a `app.js` odtwarza reguły:

- `ciężar = floor(E1RM × % / 2,5) × 2,5` — zaokrąglenie zawsze w dół do 2,5 kg
- korekta ciągu −5% w tygodniach obniżenia podwyższenia (5 i 9)
- serie dojściowe: gryf → 50% → 70% → 85% → ciężar roboczy (przed ciągiem w dniu C: 50% → 75%)

E1RM zapisane w `plan.json` to wartości startowe. W aplikacji można je podnieść lub obniżyć
o 10% (rekalibracja przewidziana po tygodniu 3 i 7) — zmiana siedzi w `localStorage`
i nie rusza pliku.

### Filtr treści

Konwerter przepuszcza wyłącznie treść treningową. Ma wbudowany bezpiecznik: jeśli
w wyniku znajdzie się cokolwiek z listy `SENSITIVE`, skrypt **przerywa pracę** zamiast
zapisać `plan.json`. Nazwy części ciała są dozwolone (bez nich nie da się opisać techniki),
opisy stanu zdrowia i historii — nie.

Skoroszyt `.xlsx` jest w `.gitignore` i nie trafia do repozytorium.

## Dźwięk

Sygnał jest syntezowany przez Web Audio — zero plików do pobrania, więc offline działa
tak samo. Piknięcia są **planowane w zegarze Web Audio w chwili startu**, nie odpalane
z `setInterval`: przeglądarki na telefonie dławią liczniki, gdy karta jest w tle albo
ekran zgaszony, a harmonogram Web Audio idzie dalej. Dzięki temu dźwięk trafia w sekundę
nawet wtedy, gdy odliczanie na ekranie zwolni. Przerwanie przerwy anuluje zaplanowane tony.

Ograniczenie, na które strona nie ma wpływu: na iPhonie przełącznik ciszy wycisza także
dźwięk ze stron. Wtedy zostaje wibracja.

## Co się zapisuje

W `localStorage`: numer tygodnia, trzy E1RM i przełącznik dźwięku (`trening.v1`),
dziennik serii (`trening.log.v1`), historia korekt (`trening.adjust.v1`), własne
ciężary ćwiczeń dodatkowych (`trening.acc.v1`), kolejka wysyłkowa (`trening.queue.v1`)
i kod planu (`trening.key.v1`).

W Supabase: wyłącznie liczby — kod planu, tydzień, dzień, ćwiczenie, seria,
powtórzenia, kilogramy, znacznik czasu. Tabela jest zamknięta dla klucza publikowalnego,
cały ruch idzie przez funkcje wymagające kodu planu (`tools/supabase.sql`).

Link `?t=9` otwiera aplikację od razu na konkretnym tygodniu. Kod planu **nigdy** nie
trafia do adresu — przepisujesz go ręcznie w ustawieniach.

## Logika progresji

`progresja.js` to czyste funkcje bez DOM-u, wspólne dla przeglądarki i testów:

```bash
node tools/test-progresja.mjs   # czysta logika: ocena sesji, korekty, rekalibracja
node tools/test-widoki.mjs      # render wszystkich widoków na atrapie DOM-u
```

`tools/test-widoki.mjs` uruchamia `app.js` w `node:vm` na atrapie DOM-u — tyle, ile
aplikacja naprawdę używa. `navigator.onLine` jest tam na stałe `false`, więc test
nie ma jak dotknąć Supabase. Złapał już błąd, który wywalał aplikację przy tygodniu 1.

Dwie pułapki, które te testy pilnują:

- **Nie liczymy E1RM z wykonanej serii.** Sufit RPE znaczy „zostaw co najmniej N
  w zapasie", więc wzór zaniżałby plan u kogoś, kto sufitu pilnuje. Oceniamy odchyłkę
  od prescription, nie wartość bezwzględną maksa.
- **Zaokrąglenie w dół nie może zjeść korekty.** +2,5% z 80 kg to 82 kg, co po
  zaokrągleniu w dół wraca do 80. Wymuszamy minimum jeden krok 2,5 kg.

Trzecia, pilnowana w aplikacji: przy każdej serii zapisujemy też **planowane** wartości
z chwili zapisu. Bez tego korekta w górę przerabiałaby dawne „czysto" na „niedowóz"
i napędzała korektę w dół.

## Ikony

```bash
node tools/make-icons.mjs
```

## Deploy na GitHub Pages

Repozytorium → Settings → Pages → Source: `main`, katalog `/ (root)`.
Adres: `https://<login>.github.io/<repo>/`. Na telefonie: menu przeglądarki →
„Dodaj do ekranu głównego".

Po każdej zmianie plików podbij **oba** znaczniki wersji, inaczej przeglądarka
albo service worker poda starą wersję:

- `?v=N` przy `app.js` w `index.html`, przy `plan.json` w `app.js` i w liście `ASSETS` w `sw.js`
- `CACHE` w `sw.js`

## Struktura

```
index.html      struktura + style (wszystko inline, zero CDN)
app.js          router, przeliczenia, timer, kalkulator talerzy
plan.json       dane planu
sw.js           cache offline
tools/xlsx.mjs          czytnik XLSX bez zależności
tools/xlsx-to-json.mjs  konwersja arkusz → plan.json + filtr treści
tools/make-icons.mjs    generator ikon PNG
```
