# Plan 12 tygodni

Statyczna aplikacja (PWA) z 12-tygodniowym planem treningowym. Ustawiasz numer tygodnia
na górze ekranu i wszystko poniżej przelicza się samo: ciężary bojów, schematy serii,
sufity RPE, serie dojściowe w rozgrzewce i blok cardio.

Bez kont, bez bazy danych, bez backendu. Po pierwszym otwarciu działa offline.

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

## Co się zapisuje

Tylko dwie rzeczy, w `localStorage` pod kluczem `trening.v1`:

- numer tygodnia (1–12)
- trzy wartości E1RM

Odklikane serie żyją w pamięci karty i znikają po jej zamknięciu. Link `?t=9`
otwiera aplikację od razu na konkretnym tygodniu.

## Ikony

```bash
node tools/make-icons.mjs
```

## Deploy na GitHub Pages

Repozytorium → Settings → Pages → Source: `main`, katalog `/ (root)`.
Adres: `https://<login>.github.io/<repo>/`. Na telefonie: menu przeglądarki →
„Dodaj do ekranu głównego".

Po każdej zmianie plików podbij `CACHE` w `sw.js`, inaczej service worker poda starą wersję.

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
