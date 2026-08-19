# Dziennik serii i samoregulacja planu

Data: 2026-08-17 · Projekt: `Desktop\trening` (https://olgaerobert-code.github.io/trening/)

## Problem

Dziś serię można tylko odklikać na zielono. Znika to po zamknięciu karty i nie niesie
żadnej informacji: nie wiadomo, czy komplet powtórzeń poszedł łatwo, czy z trudem.
Plan jest przez to sztywny — ciężary płyną wyłącznie z E1RM wpisanego ręcznie.

Cel: zapisywać wykonaną pracę i pozwolić jej sterować planem, tak jak robi to trener —
patrząc na trend, nie na pojedynczą serię.

## Zakres

**Wchodzi:** zapis powtórzeń i ciężaru dla każdej serii · korekta E1RM bojów głównych
z okna dwóch tygodni · podwójna progresja ćwiczeń dodatkowych · synchronizacja między
urządzeniami przez Supabase · eksport i import dziennika.

**Nie wchodzi:** konta i logowanie · wykresy z historii wykonania · notatki tekstowe do
sesji · edycja samego planu (ćwiczeń, schematów serii) · wersjonowanie historii zmian E1RM
poza jednym krokiem wstecz.

---

## 1. Zapis serii

Kropka serii zamienia się w wiersz z dwoma polami: **powtórzenia** i **ciężar**.

- Oba są wstępnie wypełnione tym, co przewiduje plan na dany tydzień. Ciężaru dotykasz
  tylko wtedy, gdy założyłeś co innego.
- Tapnięcie w wiersz oznacza serię jako zrobioną (zielona) i zapisuje wartości.
- RPE nie jest polem. Do przeliczeń przyjmujemy sufit RPE z tabeli na dany tydzień.
- Przy ćwiczeniach bez liczbowego ciężaru („masa ciała", „coraz grubsza guma") pole
  ciężaru przyjmuje liczbę, ale zostaje puste, dopóki sam czegoś nie wpiszesz.

### Dlaczego nie liczymy E1RM wprost z wykonanej serii

Sufit RPE znaczy „nie przekraczaj RPE 7", czyli zostaw **co najmniej** 3 powtórzenia
w zapasie. Zaplanowane 4×8 na 97,5 kg wykonane zgodnie z sufitem daje ze wzoru
E1RM ≈ 133 kg, przy realnym 150 kg. Liczenie maksa wprost z zaplanowanych serii
**systematycznie zaniżałoby plan** — tym mocniej, im lepiej trzymasz się sufitu.

Dlatego regulacja patrzy na **odchyłkę od tego, co było zaplanowane**, a nie na wartość
bezwzględną maksa. Wzór E1RM zostaje tam, gdzie jest poprawny: w kalkulatorze 1RM,
gdzie sam podajesz RPE.

---

## 2. Reguła dwóch tygodni

Wchodząc w tydzień N, aplikacja ocenia sesje z tygodni **N−1** i **N−2** — osobno dla
każdego boju głównego.

### Ocena pojedynczej sesji

| Ocena | Warunek |
|---|---|
| **z zapasem** | wszystkie zaplanowane serie zapisane, w co najmniej jednej więcej powtórzeń niż plan albo cięższy ciężar |
| **czysto** | wszystkie zaplanowane serie zapisane, komplet powtórzeń przy ciężarze ≥ planowanego |
| **niedowóz** | wszystkie serie zapisane, ale w którejkolwiek mniej powtórzeń niż plan |
| **brak danych** | zapisano mniej serii, niż przewiduje plan |

Rozróżnienie „niedowóz" od „brak danych" jest celowe: niezapisana sesja nie może karać
planu. Kto zapomniał wpisać, ten po prostu nie dostaje korekty.

### Korekta E1RM

| N−2 | N−1 | Korekta |
|---|---|---|
| z zapasem | z zapasem | **+5%** |
| czysto lub lepiej | czysto lub lepiej | **+2,5%** |
| cokolwiek | niedowóz | **0%** — powtarzasz ciężar |
| niedowóz | niedowóz | **−5%** |
| brak danych w którymkolwiek | — | **0%**, komunikat „zbieram dane" |

Ograniczenia:

- **Maksymalnie ±10% na jedną korektę** — zasada z arkusza *Zasady*.
- Korekta wchodzi **raz na tydzień i raz na bój**, przy pierwszym wejściu w dany tydzień.
- Wynik zaokrąglany do 2,5 kg.
- Tydzień 7 (deload) nie generuje korekty ani nie jest oceniany — jest z założenia lekki.

### Co widzisz

Przy wejściu w nowy tydzień karta na górze ekranu głównego:

> **Korekta z tygodni 7–8**
> Wyciskanie leżąc +2,5% → E1RM 155 kg *(było 150)*
> Front squat bez zmian — niedowóz w tygodniu 8
> `Cofnij`

`Cofnij` przywraca poprzednie E1RM i oznacza ten tydzień jako pominięty, żeby korekta
nie weszła ponownie.

### Ćwiczenia dodatkowe — podwójna progresja

Dwa tygodnie z kompletem powtórzeń we wszystkich seriach → przy ciężarze pojawia się
propozycja `+2,5 kg`. Tapnięcie ustawia nowy domyślny ciężar dla tego ćwiczenia.

Działa wyłącznie tam, gdzie ciężar jest liczbą. Przy gumie i masie ciała aplikacja
pokazuje samo przypomnienie, bez liczby — nie ma czego dodać.

---

## 3. Dane

### Lokalnie (`localStorage`)

| Klucz | Zawartość |
|---|---|
| `trening.v1` | tydzień, trzy E1RM, przełącznik dźwięku (bez zmian) |
| `trening.log.v1` | dziennik: `"9\|A\|2"` → `[{r, kg, ts}, …]` |
| `trening.adjust.v1` | ostatnia korekta na bój: tydzień zastosowania, delta, poprzednie E1RM |
| `trening.acc.v1` | własne ciężary ćwiczeń dodatkowych |
| `trening.queue.v1` | operacje czekające na wysyłkę |
| `trening.key.v1` | kod planu |

### W Supabase

Tabela `sety`: `plan_key`, `week`, `day`, `ex`, `set_no`, `reps`, `kg`, `ts`.
Klucz główny na `(plan_key, week, day, ex, set_no)`.

Do bazy trafiają **wyłącznie liczby**. Zero nazwisk, zero adresu e-mail, zero czegokolwiek
o stanie zdrowia — ta sama reguła co dla publicznego repozytorium.

### Dostęp

RLS włączony, **bez żadnej polityki** — klucz `anon` nie widzi tabeli bezpośrednio.
Cały ruch idzie przez dwie funkcje `security definer`:

- `log_pull(p_key text)` — zwraca wiersze z tym kodem planu
- `log_push(p_key text, p_rows jsonb)` — wstawia lub nadpisuje wiersze

Kod planu ma minimum 12 znaków, wymuszone w funkcjach. Znasz kod — masz swój dziennik;
nie znasz — nie ma czego przeglądać ani zgadywać.

Klucz `anon` jest z założenia publiczny i wyląduje w repozytorium — tak ma być.
Klucz `service_role` nie pojawia się nigdzie.

---

## 4. Synchronizacja

**Offline first.** Każdy wpis idzie najpierw do `localStorage` i natychmiast widać go na
ekranie. Równolegle ląduje w kolejce. Jest sieć — kolejka leci od razu; nie ma —
czeka i dosyła się przy następnym otwarciu albo powrocie zasięgu (`online`).

Przy starcie aplikacja robi `log_pull` i scala dane z lokalnymi.

**Konflikt** (ten sam tydzień/dzień/ćwiczenie/seria z dwóch urządzeń): wygrywa nowszy
`ts`. Przy jednym użytkowniku i dzienniku treningowym to wystarczy.

**Parowanie urządzeń.** Przy pierwszym uruchomieniu losowany jest kod planu w formacie
`K7M2-P9XQ-4T`. W ustawieniach widzisz go i możesz przepisać na drugie urządzenie.
Kod **nigdy nie trafia do adresu URL** — adres z sekretem ląduje w historii, w zakładkach
i potrafi wyciec nagłówkiem `Referer`.

**Stan połączenia** widoczny w interfejsie: `zsynchronizowano` / `czeka N wpisów` /
`brak połączenia`.

**Uśpienie projektu.** Darmowy projekt Supabase usypia po 7 dniach bez ruchu. Aplikacja
traktuje to jak brak sieci: zapisuje lokalnie i dosyła po obudzeniu. Nic się nie gubi,
ale pierwsze wejście po dłuższej przerwie może wymagać kliknięcia w panelu Supabase.

**Eksport i import** do pliku JSON zostaje niezależnie od synchronizacji — jako kopia
zapasowa i droga przeniesienia na nowy telefon bez bazy.

---

## 5. Obsługa błędów

| Sytuacja | Zachowanie |
|---|---|
| Brak sieci przy zapisie | wpis zostaje lokalnie, trafia do kolejki, interfejs pokazuje `czeka N wpisów` |
| Supabase zwraca błąd | ponowienie z narastającym odstępem, po trzech próbach cichy powrót do kolejki |
| Zły kod planu przy parowaniu | komunikat „nie znaleziono dziennika dla tego kodu", stary kod zostaje |
| Uszkodzony `localStorage` | dziennik startuje pusty, aplikacja działa dalej, korekty wstrzymane do zebrania danych |
| Wpisane powtórzenia poza zakresem 0–50 albo ciężar poza 0–500 kg | pole odrzuca wartość |

---

## 6. Weryfikacja

Logika oceny i korekty siedzi w czystych funkcjach bez DOM-u — `judgeSession()`
i `adjustment()`. Do tego `tools/test-progresja.mjs` uruchamiany Node'em, pokrywający:

- komplet powtórzeń w obu tygodniach → +2,5%
- nadwyżka w obu → +5%
- niedowóz w N−1 → 0% niezależnie od N−2
- niedowóz w obu → −5%
- niekompletny zapis → brak korekty, nie niedowóz
- limit ±10%
- deload pomijany
- korekta nie wchodzi dwa razy w tym samym tygodniu
- `Cofnij` przywraca dokładnie poprzednią wartość

Ręcznie: zapis serii bez sieci → wpis widoczny, kolejka rośnie; przywrócenie sieci →
kolejka schodzi do zera; drugie urządzenie po sparowaniu widzi te same wpisy.

---

## 7. Projekt Supabase

```
URL:                https://jvbdodnoxzowviqwhzfr.supabase.co
Klucz publikowalny: sb_publishable_RYMFMP8_vAaRy6vfgUFhjQ_qqhkOdr8
```

Klucz `sb_publishable_…` jest jawny z założenia (następca klucza `anon`) i trafia do
publicznego repozytorium — tak ma być. Bezpieczeństwo nie opiera się na nim, tylko na
zamkniętej tabeli i kodzie planu. Klucz `service_role` / `secret` nie pojawia się nigdzie.

### Zostało do zrobienia po stronie konta

**Uruchomienie SQL-a** (tabela `sety` + funkcje `log_pull` i `log_push`) w edytorze SQL
w Supabase — to prywatne konto, więc uruchamia się to ręcznie. Skrypt jest częścią wdrożenia i
trafi do `tools/supabase.sql`.

Do czasu uruchomienia SQL-a aplikacja działa w wersji lokalnej — dziennik i regulacja
planu nie potrzebują bazy, synchronizacja dokłada się jako warstwa.
