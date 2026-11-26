# Generator planu cyklu 5 (plan.json). Zamknięte cykle: plan-cykl1.json … plan-cykl4.json.
# Uruchom: python3 tools/cykl5.py
# Treść wyłącznie treningowa — repozytorium jest publiczne.
#
# Cykl 5 składa plan z metod trenerów, którzy od lat prowadzą ludzi do siły
# bez psucia stawów:
#   boje            — 5/3/1 Forever, Jim Wendler (seria rekordowa + FSL,
#                     dwie fale budowy → siódmy tydzień → fala rekordów, TM 85%)
#   kolana, kostki  — ATG, Ben Patrick (ATG split squat, unoszenie palców, Nordic),
#                     jednonóż, Mike Boyle (skrzynia, ciąg jednonóż),
#                     izometria, Keith Baar (przysiad hiszpański)
#   noszenie        — Dan John (spacer farmera, jednorącz)
#   rozgrzewka      — RAMP, Ian Jeffreys, z Big 3 Stuarta McGilla
#   worek           — kondycja według Joela Jamiesona (baza + interwały)
# Tydzień bez zmian: wt A (wyciskanie), czw B (bez sztangi), sob C (front squat
# i martwy ciąg), nd joga i test zakresów. Pn, śr i pt wolne.
import json, os, re, copy
ROOT = os.path.join(os.path.dirname(__file__), '..')
stary = json.load(open(os.path.join(ROOT, 'plan-cykl4.json'), encoding='utf-8'))

# cel: które stawy dostają pracę — z tego aplikacja liczy bilans tygodnia.
#   kolano, kostka, biodro (stawy), gora, tulow, kondycja, rozciaganie (reszta)
# fig: figurka ćwiczenia (figury.js). sPowt: sekundy na powtórzenie, gdy tempo
# jest inne niż domyślne 3 s.
def it(n, id_, name, scheme, load, rpe, note, cel, fig, superset=None, noCut=False, kgStart=None, sPowt=None):
    d = {'n': n, 'id': id_, 'name': name, 'superset': superset, 'scheme': scheme, 'load': load, 'rpe': rpe,
         'note': note, 'noCut': noCut, 'cel': cel, 'fig': fig}
    if kgStart is not None: d['kgStart'] = kgStart
    if sPowt is not None: d['sPowt'] = sPowt
    return d

REF = lambda r: {'ref': r}

# Schemat ćwiczenia dodatkowego na 12 tygodni: budowa 1 (tyg. 1–3), budowa 2 (4–6),
# tydzień 7 lżej (2 serie), rekordy (8–11), tydzień 12 test (2 serie).
def _dwie(schemat):
    return re.sub(r'^\s*\d+', '2', schemat)
def S(b1, b2=None, b3=None):
    b2 = b2 or b1; b3 = b3 or b2
    return {'tyg': [b1] * 3 + [b2] * 3 + [_dwie(b2)] + [b3] * 4 + [_dwie(b3)]}

# ---------- boje: 5/3/1 Forever ----------
# TM (Training Max) = 85% maksa z aplikacji. Plan trzyma procenty od maksa
# (aplikacja liczy od E1RM), a obok — te same procenty od TM, do opisu.
TM = 0.85
def wiersz(w, block, top, tm, rpe, fsl, tmFsl, rpeFsl, fslDl, gora):
    d = {'week': w, 'block': block, 'scheme': top, 'pct': round(TM * tm, 4), 'rpe': rpe,
         'fsl': fsl, 'pctFsl': round(TM * tmFsl, 4), 'rpeFsl': rpeFsl, 'tmPct': tm, 'tmPctFsl': tmFsl}
    if gora: d.update({'benchText': None, 'pullup': None})
    else: d.update({'dlAdj': 0, 'barHeight': 'z podłogi', 'fslDl': fslDl})
    return d

# (tydzień, blok, seria rekordowa, %TM, sufit RPE, FSL, %TM FSL, RPE FSL, FSL ciągu)
FALE = [
  (1, '1', '1 × 5', .85, 8, '5 × 5', .65, 7, '3 × 5'),
  (2, '1', '1 × 5', .90, 8.5, '5 × 5', .70, 7, '3 × 5'),
  (3, '1', '1 × 5', .95, 9, '5 × 5', .75, 7, '3 × 5'),
  (4, '2', '1 × 5', .85, 8, '5 × 5', .65, 7, '3 × 5'),
  (5, '2', '1 × 5', .90, 8.5, '5 × 5', .70, 7, '3 × 5'),
  (6, '2', '1 × 5', .95, 9, '5 × 5', .75, 7, '3 × 5'),
  (7, 'deload', '1 × 5', .70, 5, '2 × 5', .60, 5, '2 × 5'),
  (8, '3', '1 × 5+', .85, 9, '3 × 5', .65, 7, '2 × 5'),
  (9, '3', '1 × 3+', .90, 9, '3 × 5', .70, 7, '2 × 5'),
  (10, '3', '1 × 1+', .95, 9, '3 × 5', .75, 7, '2 × 5'),
  (11, '3', '1 × 5+', .90, 9, '3 × 5', .70, 7, '2 × 5'),
  (12, '3', '1 × 3+', 1.00, 9, '2 × 5', .65, 6, '1 × 5'),
]
weeks = {
  'lower': [wiersz(*f, gora=False) for f in FALE],
  'upper': [wiersz(*f, gora=True) for f in FALE],
}

# ---------- rozciąganie na koniec: te same pozycje co w cyklu 4 ----------
ROZC = {x['name']: x for d in stary['days'].values() for x in d['items'] if x.get('rozc')}
def rozc(n, klucz, nazwa):
    d = copy.deepcopy(ROZC[nazwa])
    d['n'] = n
    d['id'] = f'c5{klucz}{n}'
    return d

ZGINACZ, LYDKA = 'Zginacz biodra w półklęku', 'Łydka przy ścianie'
POSLADEK, PRZYWODZICIELE, TYL_UDA = 'Pośladek: kolano do przeciwnego barku', 'Przywodziciele: nogi na ścianie w rozkroku', 'Tył uda z paskiem leżąc'

# Nazwy ćwiczeń z cyklu 4 są przepisane co do litery: aplikacja pamięta ciężar
# hantli po nazwie, a serie z bieżącego tygodnia przechodzą po nazwie i dniu.

A = [
  it(1, 'c5a1', 'Wyciskanie leżąc', REF('upper.scheme'), REF('bench.kg'), REF('upper.rpe'),
     'Bój główny. Przerwa 3 min. 5/3/1: to jest seria rekordowa — dwie pierwsze serie fali (ok. 65% i 75% TM) masz w tabeli rozgrzewki. W budowie (tydz. 1–6) równo 5 powtórzeń, bez dokładania. W rekordach (8–12) „+": tyle, ile wejdzie czysto, z jednym powtórzeniem w zapasie. Łopatki ściągnięte i wbite w ławkę, stopy płasko, sztanga na dolną część mostka, łokcie ok. 45° od tułowia.',
     ['gora'], 'wyciskanie', noCut=True),
  it(2, 'c5a2', 'Wyciskanie leżąc · FSL', REF('upper.fsl'), REF('bench.fsl'), REF('upper.rpeFsl'),
     'SUPERSERIA z podciąganiem — 75 s po parze. FSL (First Set Last): ciężar pierwszej serii 5/3/1 jeszcze raz, na objętość — 5 × 5 w budowie, 3 × 5 w rekordach. Każde powtórzenie takie samo jak w serii rekordowej: to praca, nie walka.',
     ['gora'], 'wyciskanie', superset='A1'),
  it(3, 'c5a3', 'Podciąganie', S('5 × 4', '5 × 5', '3 × 6'), 'pełne albo negatywy 4 s', 8,
     'Na każdą serię pchania seria ciągnięcia — zasada Wendlera dla ćwiczeń dodatkowych. Łopatki najpierw w dół, potem łokcie do żeber, broda nad drążek. Gdy pełne się kończą, dobijasz serię negatywami: wejście z ławki, 4 s w dół do pełnego zwisu.',
     ['gora'], 'podciaganie', superset='A2'),
  it(4, 'c5a4', 'ATG split squat z hantlami', S('3 × 8', '3 × 10', '3 × 8'), 'podwójna progresja', 7,
     'SUPERSERIA z unoszeniem palców — 75 s po parze. Ben Patrick (ATG): długi wykrok, przednia stopa płasko, przednie kolano jedzie daleko za palce, aż tył uda dotknie łydki, tylne kolano tuż nad podłogą. 3 s w dół, 1 s pauzy, w górę. Na start przednia stopa na talerzu 5–10 kg — gdy pełny zakres jest lekki, schodzisz na podłogę, potem dokładasz hantle. Zaczynasz słabszą nogą.',
     ['kolano', 'biodro'], 'atg-split', superset='B1', noCut=True, kgStart=8, sPowt=4),
  it(5, 'c5a5', 'Unoszenie palców przy ścianie (piszczelowy przedni)', S('3 × 15', '3 × 20'), 'masa ciała', 7,
     'Tibialis raise z programu ATG. Plecy i pośladki o ścianę, pięty 30–40 cm od niej, nogi proste. Palce stóp jak najwyżej, 1 s na górze, opuść bez klapania. Trudniej: stopy dalej od ściany, potem jedna noga. Przód goleni hamuje stopę i kolano przy każdym kroku w dół — schody, zbieganie, praca nóg na worku.',
     ['kostka'], 'piszczelowy', superset='B2', sPowt=1.5),
  it(6, 'c5a6', 'Nordic z asekuracją rękami', S('3 × 4', '3 × 5', '3 × 6'), 'masa ciała', 8,
     'Przerwa 60 s. Kolana na kocu, pięty zaczepione pod obciążoną sztangą w stojaku albo pod innym stałym punktem. Ciało w jednej linii od kolan do głowy, biodra wyprostowane. Opuszczaj się tak wolno, jak dasz radę (cel 3–5 s), na końcu złap się dłońmi jak przy pompce i odepchnij do góry. Tył uda trzyma kolano od tyłu — przeciwwaga dla całej pracy przodu uda.',
     ['kolano'], 'nordic', sPowt=5),
  it(7, 'c5a7', 'Worek: interwały', S('4 × 2 min', '4 × 2 min', '6 × 1 min'), 'mocno, technicznie', 8,
     'Przerwa 60 s, w marszu. Joel Jamieson: krótkie odcinki mocno, żeby podnieść sufit kondycji — baza w tempie rozmowy jest w czwartek. Kombinacje 2–3 ciosów, po każdej krok w bok albo w tył, cały czas na przedniej części stóp. W drugiej fali ostatnie 30 s każdego odcinka na pełnym tempie, w bloku rekordów odcinki krótsze i mocniejsze od początku. Skręt zawsze ze stopy i biodra — pięta tylnej nogi obraca się razem z biodrem.',
     ['kostka', 'biodro', 'kondycja'], 'worek'),
]
for nazwa in (ZGINACZ, LYDKA):
    A.append(rozc(len(A) + 1, 'a', nazwa))

B = [
  it(1, 'c5b1', 'Przysiad hiszpański z hantlem (izometria)', S('4 × 45 s'), 'podwójna progresja', 7,
     'Przerwa 45 s. Keith Baar: długa izometria daje ścięgnu rzepki obciążenie bez ruchu w stawie — dlatego na początek dnia, zanim nogi się zmęczą. Gruba guma za kolanami, przyczepiona do słupka stojaka. Stopy do przodu, siadasz w tył do kąta 60–90° w kolanie, piszczele pionowo, tułów prosto, hantel przy mostku. 45 s bez ruchu. Trudniej = cięższy hantel, nie głębiej.',
     ['kolano'], 'hiszpanski', kgStart=8),
  it(2, 'c5b2', 'Wejście na skrzynię z wolnym zejściem', S('3 × 8', '3 × 8', '3 × 6'), 'podwójna progresja', 7,
     'SUPERSERIA z wiosłowaniem — 60 s po parze. Mike Boyle: jednonóż to podstawa treningu nóg poza sztangą. Skrzynia na wysokość kolana, cała stopa na skrzyni, wchodzisz siłą nogi na górze — tylna tylko odbija się palcami. Zejście 3 s, kolano w linii drugiego palca. Hantle w dłoniach. W bloku rekordów mniej powtórzeń, cięższe hantle.',
     ['kolano', 'biodro'], 'skrzynia', superset='A1', noCut=True, kgStart=10, sPowt=4),
  it(3, 'c5b3', 'Wiosłowanie hantlem w podporze', S('3 × 10', '3 × 10', '3 × 8'), 'podwójna progresja', 8,
     'Kolano i dłoń na ławce, plecy płasko. Ciągniesz łokieć do biodra, 1 s na górze, 2 s w dół. Tułów nie obraca się za hantlem.',
     ['gora'], 'wioslowanie', superset='A2', kgStart=20),
  it(4, 'c5b4', 'Martwy ciąg rumuński jednonóż z hantlem', S('3 × 8', '3 × 8', '3 × 6'), 'podwójna progresja', 7,
     'SUPERSERIA z plankiem kopenhaskim — 45 s po parze. Mike Boyle: ciąg na jednej nodze uczy biodro trzymać miednicę. Hantel w ręce po stronie nogi wolnej, biodro w tył, tułów i wolna noga jak dźwignia, kolano stojącej nogi lekko ugięte. Miednica równo — biodro wolnej nogi nie otwiera się w bok. Stopa podporowa trzyma trzy punkty: pięta, duży i mały palec.',
     ['biodro', 'kostka'], 'rdl-jednonoz', superset='B1', kgStart=12, sPowt=4),
  it(5, 'c5b5', 'Plank kopenhaski', S('3 × 20 s / stronę', '3 × 25 s / stronę', '3 × 30 s / stronę'), 'masa ciała', 7,
     'Podpór bokiem na przedramieniu, kolano górnej nogi na ławce (krótka dźwignia), dolna noga wolno pod ławką. Biodra w górze, ciało w jednej linii. Trudniej: unieś dolną nogę do ławki, potem stopa zamiast kolana. Przywodziciele trzymają biodro i kolano od środka.',
     ['biodro'], 'kopenhaski', superset='B2'),
  it(6, 'c5b6', 'Pompki', S('3 × 12', '3 × 15', '3 × 12'), 'masa ciała', 8,
     'SUPERSERIA ze wspięciami — 45 s po parze. Pchanie jako ćwiczenie dodatkowe raz w tygodniu poza wyciskaniem — u Wendlera to stały punkt planu. Ciało w jednej linii, dłonie pod barkami, łokcie ok. 45° od tułowia, klatka do podłogi. W bloku rekordów nogi na ławce.',
     ['gora'], 'pompki', superset='C1', sPowt=2.5),
  it(7, 'c5b7', 'Wspięcia na palce jednonóż, kolano ugięte', S('3 × 12', '3 × 15', '3 × 12'), 'podwójna progresja', 8,
     'Przednia część stopy na stopniu, kolano ugięte ok. 30° i takie zostaje przez całą serię. Pięta wolno w dół poniżej stopnia, pauza, w górę na palce, 1 s na górze. Ugięte kolano przenosi pracę na płaszczkowatą — mięsień, który trzyma kostkę przy każdym kroku i lądowaniu. Hantel w ręce po stronie pracującej nogi, gdy 15 jest lekkie.',
     ['kostka'], 'wspiecia-ugiete', superset='C2'),
  it(8, 'c5b8', 'Spacer farmera jednorącz', S('2 × 30 m / stronę', '2 × 30 m / stronę', '2 × 40 m / stronę'), 'podwójna progresja', 7,
     'Przerwa 45 s. Dan John: noszenie ciężaru buduje biodra i tułów jak mało co. Ciężki hantel w jednej ręce, druga swobodnie, barki na jednym poziomie, tułów pionowo — nie przechylasz się w żadną stronę. Krótkie, spokojne kroki. Po 30 m zmiana ręki.',
     ['biodro', 'tulow'], 'farmer', kgStart=24),
  it(9, 'c5b9', 'Worek: rundy', S('3 × 3 min'), 'tempo rozmowy', 6,
     'Przerwa 60 s. Joel Jamieson: baza tlenowa — tempo, przy którym da się mówić pełnymi zdaniami. Runda 1: lewy prosty i praca nóg dookoła worka w obie strony. Runda 2: lewy–prawy, po każdej kombinacji dwa kroki w bok. Runda 3: dowolne kombinacje, ostatnie 20 s szybciej. Na przedniej części stóp, kolana miękkie, skręt ze stopy i biodra.',
     ['kostka', 'biodro', 'kondycja'], 'worek'),
]
for nazwa in (POSLADEK, PRZYWODZICIELE):
    B.append(rozc(len(B) + 1, 'b', nazwa))

C = [
  it(1, 'c5c1', 'Front squat', REF('lower.scheme'), REF('front.kg'), REF('lower.rpe'),
     'Bój główny. Przerwa 3 min. 5/3/1: seria rekordowa — dwie pierwsze serie fali masz w tabeli rozgrzewki. W budowie równo 5, w rekordach „+" z jednym powtórzeniem w zapasie. Sztanga na przednich naramiennych, łokcie wysoko, tułów pionowo. Kolana mogą wyjść przed palce — ważne, żeby szły w linii drugiego palca stopy. Głębokość: tak nisko, jak trzymasz plecy neutralnie.',
     ['kolano', 'biodro'], 'front-squat', noCut=True),
  it(2, 'c5c2', 'Front squat · FSL', REF('lower.fsl'), REF('front.fsl'), REF('lower.rpeFsl'),
     'Przerwy 2 min. FSL (First Set Last): ciężar pierwszej serii 5/3/1 na objętość — 5 × 5 w budowie, 3 × 5 w rekordach. Każde powtórzenie na tej samej głębokości i w tym samym torze kolan co seria rekordowa.',
     ['kolano', 'biodro'], 'front-squat', noCut=True),
  it(3, 'c5c3', 'Martwy ciąg', REF('lower.scheme'), REF('dl.kg'), REF('lower.rpe'),
     'Bój główny. Przerwa 3 min. 5/3/1, tak jak przysiad. Z podłogi; po przysiadzie wystarczą dwie serie dojściowe (50% × 5, 75% × 3). Sztanga nad środkiem stopy, łopatki nad sztangą, plecy neutralne. Najpierw napnij plecy i „wyciągnij luz" ze sztangi, potem pchaj podłogę nogami.',
     ['biodro'], 'martwy-ciag', noCut=True),
  it(4, 'c5c4', 'Martwy ciąg · FSL', REF('lower.fslDl'), REF('dl.fsl'), REF('lower.rpeFsl'),
     'Przerwy 2 min. FSL ciągu jest krótszy niż przysiadu — 3 × 5 w budowie, 2 × 5 w rekordach — bo plecy pracowały już przy front squacie. Każde powtórzenie od zera, bez odbijania od podłogi.',
     ['biodro'], 'martwy-ciag'),
  it(5, 'c5c5', 'Wspięcia na palce stojąc na stopniu z hantlem', S('3 × 15', '3 × 12', '3 × 10'), 'podwójna progresja', 7,
     'SUPERSERIA ze spacerem farmera — 60 s po parze. Obunóż, przednia część stóp na stopniu albo talerzu, hantel w jednej ręce, druga dłoń na ścianie. Kolana proste. Pięty wolno w dół poniżej stopnia, 1 s pauzy w rozciągnięciu, w górę na palce, 1 s na górze. Prosta noga to łydka — ta, która odbija na worku.',
     ['kostka'], 'wspiecia', superset='A1', kgStart=16),
  it(6, 'c5c6', 'Spacer farmera z dwoma hantlami', S('3 × 30 m', '3 × 30 m', '3 × 40 m'), 'podwójna progresja (kg na rękę)', 7,
     'Dan John: najprostsze ćwiczenie siłowe na świecie — podnieś coś ciężkiego i idź. Dwa ciężkie hantle, barki w dół i w tył, tułów pionowo, krótkie szybkie kroki. Stopy stawiasz prosto, kolana nie uciekają do środka. Ciężar podajesz na jedną rękę.',
     ['biodro', 'tulow', 'kostka'], 'farmer2', superset='A2', kgStart=24),
]
for nazwa in (TYL_UDA, ZGINACZ, LYDKA):
    C.append(rozc(len(C) + 1, 'c', nazwa))

# ---------- rozgrzewka: RAMP (Ian Jeffreys) z Big 3 Stuarta McGilla ----------
BIG3 = {'what': 'McGill Big 3: brzuszek McGilla, deska boczna, bird dog', 'dose': '5 × 10 s · 2 × 10 s / stronę · 4 × 10 s / stronę',
        'note': 'Stuart McGill: trzy ćwiczenia, które usztywniają tułów bez zginania kręgosłupa. Każde powtórzenie to 10 s napięcia i spokojnego oddechu — bez zmęczenia.'}
warmup = {
  'ramp': {'steps': ['Gryf 2 × 8', '50% × 5', '70% × 5', '85% × 3', 'Seria rekordowa'],
           'lifts': [{'lift': 'bench', 'name': 'Wyciskanie leżąc'}, {'lift': 'front', 'name': 'Front squat'}, {'lift': 'dl', 'name': 'Martwy ciąg'}]},
  'skip': ['Rozciągania statycznego przed sztangą — zostaje na koniec treningu i na niedzielę.',
           'Długiego rolowania — 1–2 minuty na miejsce, które naprawdę tego potrzebuje, wystarczą.',
           'Krążeń bioder, skrętów kolana i pracy w końcowych zakresach.',
           'Ćwiczeń do upadku mięśniowego — rozgrzewka ma przygotować, nie zmęczyć.'],
  'notes': ['Rozgrzewka idzie według RAMP Iana Jeffreysa: rozgrzać, uruchomić, rozruszać, przygotować do ciężaru.',
            'Serie dojściowe do serii rekordowej to zarazem dwie pierwsze serie 5/3/1 — przerwy 60–90 s.',
            'W sobotę przed ciągiem wystarczą DWIE serie (50% × 5, 75% × 3) — po przysiadzie jesteś rozgrzany.'],
  'days': {
    'A': {'label': 'DZIEŃ A — wyciskanie i kolana  ·  ~7 min', 'steps': [
      {'what': 'Walka z cieniem albo lekko worek', 'dose': '2 min', 'note': 'Same proste i praca nóg, bez siły. Ma rozgrzać barki, biodra i kostki, nie zmęczyć.'},
      BIG3,
      {'what': 'Band pull-apart', 'dose': '2 × 15', 'note': 'Wendler robi je codziennie. Ręce na wysokości barków, łopatki ściągnięte.'},
      {'what': 'Serie dojściowe do wyciskania', 'dose': 'wg tabeli', 'note': ''},
      {'what': 'Przed ATG split squatem: wykrok bez ciężaru', 'dose': '1 × 6 / nogę', 'note': 'Po wyciskaniu, zanim zaczniesz superserię. Kolano wolno za palce, tylko tyle, ile jest lekko.'}]},
    'B': {'label': 'DZIEŃ B — jednonóż, bez sztangi  ·  ~6 min', 'steps': [
      {'what': 'Walka z cieniem albo lekko worek', 'dose': '2 min', 'note': 'Praca nóg dookoła worka, luźne proste.'},
      {'what': 'Patrick step', 'dose': '1 × 15 / nogę', 'note': 'Ben Patrick (ATG). Stoisz jedną nogą na niskim stopniu, drugą opuszczasz piętą do podłogi, uginając kolano stojącej nogi do przodu za palce. Wolno, bez odbicia. Budzi przód uda przed izometrią.'},
      {'what': 'Knee-to-wall', 'dose': '1 × 10 / nogę', 'note': 'Pięta na podłodze, kolano do ściany w linii drugiego palca, 2 s przy ścianie.'},
      {'what': 'Chód boczny z mini gumą', 'dose': '1 × 10 / stronę', 'note': 'Półprzysiad, kolana nie zapadają się do środka. Budzi pośladek średni.'},
      {'what': 'Podskoki na palcach (pogo)', 'dose': '2 × 15', 'note': 'Obunóż, niskie i ciche, kolana prawie proste, pięty nie dotykają podłogi. Sprężyna ma być w kostce.'}]},
    'C': {'label': 'DZIEŃ C — dół ze sztangą  ·  ~8 min', 'steps': [
      {'what': 'Walka z cieniem albo lekko worek', 'dose': '2 min', 'note': 'Najcięższy dzień tygodnia — nie skracaj rozgrzewki.'},
      BIG3,
      {'what': 'Knee-to-wall', 'dose': '1 × 10 / nogę', 'note': 'Pięta na podłodze, kolano do ściany w linii drugiego palca.'},
      {'what': 'Goblet squat do skrzyni', 'dose': '1 × 8', 'note': 'Lekki hantel, 3 s w dół. Ustawia tor kolan przed sztangą.'},
      {'what': 'Serie dojściowe do front squata', 'dose': 'wg tabeli', 'note': ''},
      {'what': 'Serie dojściowe do ciągu', 'dose': '50% × 5, 75% × 3', 'note': 'Krótsza wersja — po przysiadzie jesteś rozgrzany.'}]},
  },
}

rules = [
  {'heading': 'Skąd ten plan', 'lines': [
    'Jim Wendler — 5/3/1 Forever: boje w trzytygodniowych falach (5, 3, 5/3/1), jedna seria rekordowa i serie FSL, dwie fale budowy, siódmy tydzień lżej, potem fala rekordów. Małe kroki, zapas w każdej serii, rekordy dopiero wtedy, gdy przychodzą same.',
    'Ben Patrick (ATG, „Knees Over Toes Guy") — kolana i kostki: ATG split squat z kolanem daleko za palcami, unoszenie palców przy ścianie, Nordic, Patrick step w rozgrzewce. Pełny zakres zdobywany stopniowo, pod ciężarem, który da się kontrolować.',
    'Mike Boyle — jednonóż jako podstawa treningu nóg poza sztangą (skrzynia, ciąg jednonóż) i podejście „staw po stawie": kostka i biodro potrzebują ruchu, kolano — stabilności.',
    'Keith Baar — długa izometria na początek czwartku: przysiad hiszpański 4 × 45 s.',
    'Dan John — noszenie ciężarów: spacer farmera z dwoma hantlami w sobotę, jednorącz w czwartek.',
    'Stuart McGill — Big 3 w rozgrzewce przed sztangą: brzuszek McGilla, deska boczna, bird dog.',
    'Joel Jamieson — kondycja na worku: w czwartek baza w tempie rozmowy, we wtorek krótkie interwały mocniej.',
    'Ian Jeffreys — rozgrzewka RAMP: rozgrzać, uruchomić, rozruszać, przygotować do ciężaru.']},
  {'heading': 'Układ tygodnia', 'lines': [
    'Trzy treningi i niedziela. Poniedziałek, środa i piątek są wolne.',
    'Wtorek — Dzień A: wyciskanie 5/3/1 z FSL w parze z podciąganiem, ATG split squat z unoszeniem palców, Nordic, interwały na worku, rozciąganie.',
    'Czwartek — Dzień B, bez sztangi: izometria hiszpańska, skrzynia z wiosłowaniem, ciąg jednonóż z kopenhaskim, pompki ze wspięciami, spacer jednorącz, rundy na worku, rozciąganie.',
    'Sobota — Dzień C: front squat i martwy ciąg 5/3/1 z FSL, łydki ze spacerem farmera, rozciąganie.',
    'Niedziela — joga (domyślnie krótka, ~20 min), a po niej test zakresów (~8 min).',
    'Boje stoją tam, gdzie zawsze: wyciskanie we wtorek, przysiad i ciąg w sobotę. Czwartek jest bez sztangi.',
    'Sprzęt: sztanga ze stojakiem, ławka, hantle, drążek, gumy (długa i mini), skrzynia albo stopień, worek. Żadnych maszyn.']},
  {'heading': '5/3/1 — jak czytać boje', 'lines': [
    'TM (Training Max) = 85% maksa z aplikacji. Procenty 5/3/1 liczą się od TM, dlatego ciężary są niższe, niż sugerowałby maks — tak ma być.',
    'Fala to trzy tygodnie: seria rekordowa na 85%, 90% i 95% TM. Dwie pierwsze serie każdego dnia (ok. 65% i 75% TM) masz w tabeli rozgrzewki.',
    'Budowa (tydz. 1–6, u Wendlera „Leader"): seria rekordowa zawsze na 5 powtórzeń — bez dokładania, nawet gdy czujesz zapas. FSL 5 × 5.',
    'Rekordy (tydz. 8–11, „Anchor"): 5+, 3+, 1+ — tyle powtórzeń, ile wejdzie czysto, z jednym w zapasie. FSL 3 × 5. Tydzień 11 zaczyna nową falę z wyższym TM.',
    'FSL (First Set Last): ciężar pierwszej serii fali jeszcze raz, na objętość. Każde powtórzenie jak w serii rekordowej.',
    'Tydzień 7 to siódmy tydzień Wendlera: lżej, żeby ciało nadrobiło. Tydzień 12 to test TM.']},
  {'heading': 'Jak rośnie ciężar', 'lines': [
    'U Wendlera TM rośnie po każdej fali o 2,5 kg na górze i 5 kg na dole. Tutaj robi to samoregulacja: korekta z dwóch tygodni (+2,5% za dwa czyste tygodnie, +5% za dwa z zapasem) i podwyżka dołu o 5% po każdym bloku budowy. Każdą zmianę da się cofnąć.',
    'Powtórzenia ponad plan w serii „+" aplikacja liczy jako zapas — dwa takie tygodnie podnoszą TM.',
    'Sufit RPE jest nadrzędny: jeśli seria rekordowa idzie ciężej niż sufit, kończysz na zaplanowanych powtórzeniach. Dwa tygodnie poniżej planu obniżają TM o 5%.',
    'Hantle: podwójna progresja — najpierw powtórzenia do górnej granicy w każdej serii, potem cięższy hantel. Aplikacja zapamiętuje ciężar i podpowiada podwyżkę.',
    'Tempo jest częścią ćwiczenia: 3 s w dół przy ATG split squacie, skrzyni i wspięciach. Szybsze powtórzenie z większym ciężarem to nie progres.']},
  {'heading': 'Trzy stawy', 'lines': [
    'Kolana: front squat i ATG split squat w pełnym zgięciu, skrzynia i izometria hiszpańska w środku zakresu, Nordic jako przeciwwaga z tyłu uda.',
    'Kostki: przód goleni (unoszenie palców), łydka przy prostym i ugiętym kolanie, sprężystość na worku i w podskokach w rozgrzewce.',
    'Biodra: martwy ciąg, ciąg jednonóż, plank kopenhaski, noszenie ciężarów i rotacja pod prędkością na worku.',
    'Każde ćwiczenie ma znaczek stawu, a ekran Dziś pokazuje, ile serii dostał w tym tygodniu każdy z trzech.',
    'Góra: wyciskanie z FSL raz w tygodniu, pompki w czwartek, ciągnięcie dwa razy (podciąganie, wiosłowanie).']},
  {'heading': 'Worek', 'lines': [
    'Dwa razy w tygodniu na koniec sesji plus dwie lekkie minuty w każdej rozgrzewce.',
    'Czwartek — baza: 3 rundy po 3 min w tempie rozmowy. Wtorek — interwały: krótsze odcinki mocniej, przerwa w marszu.',
    'Skręt zawsze ze stopy i biodra — pięta tylnej nogi odrywa się i obraca. Stopa przyklejona do podłogi przy ciosie to skręt w kolanie.',
    'Rękawice albo owijki. Nadgarstek prosto, uderzasz dwiema pierwszymi kostkami.',
    'Aplikacja odlicza rundę i przerwę sama: gong na start i koniec, stuknięcie 10 s przed końcem.']},
  copy.deepcopy(next(r for r in stary['rules'] if r['heading'] == 'Rozciąganie na koniec')),
  {'heading': 'Czas trwania', 'lines': [
    'Każdy dzień: 6–8 min rozgrzewki, ~45–50 min pracy i 3–5 min rozciągania — razem około godziny.',
    'PRZERWY: seria rekordowa 3 min, FSL przysiadu i ciągu 2 min, FSL wyciskania w parze z podciąganiem 75 s po parze. Superserie bez przerwy w środku; po parze 75 s przy ATG split squacie, 60 s przy skrzyni i łydkach ze spacerem, 45 s przy ciągu jednonóż i pompkach. Izometria i spacer jednorącz: 45 s.',
    'Timer przerwy rusza sam po odhaczeniu serii. Trzymaj się go — od tego zależy, czy worek zmieści się w godzinie.',
    'Jeśli brakuje czasu, tniesz w kolejności: ostatni odcinek na worku → trzecia seria ostatniej superserii → FSL ciągu.',
    'Nie tniesz: serii rekordowych, FSL przysiadu, ATG split squata ani skrzyni.']},
  {'heading': 'Zasada złego dnia', 'lines': [
    'Rozgrzewka idzie wyraźnie ciężej niż zwykle: seria rekordowa bez „+" — tylko zaplanowane powtórzenia — a FSL o jedną serię krócej.',
    'Kostka albo kolano odzywa się przy podskokach lub na worku: tego dnia podskoki zamień na wspięcia, a na worku stój szerzej i bij z miejsca.',
    'Plecy sztywne rano w sobotę: ciąg lżej o 10% albo zamień sobotę z czwartkiem. Kolejność da się przestawić w obrębie tygodnia.',
    'Ćwiczenie, w którym coś nie gra w stawie (nie zmęczenie mięśnia) — najpierw mniejszy zakres, potem mniejszy ciężar, a jeśli dalej nie gra, pomiń je w tej sesji i zanotuj.']},
  {'heading': 'Tydzień 7 — siódmy tydzień (nie jest opcjonalny)', 'lines': [
    'Boje: seria 1 × 5 przy 70% TM i 2 × 5 przy 60% TM, RPE 5.',
    'Ćwiczenia dodatkowe: 2 serie zamiast 3, ten sam ciężar — aplikacja pokazuje już skrócony schemat. Worek: 2 rundy. Joga i test zakresów bez zmian.']},
  {'heading': 'Tydzień 12 — test TM', 'lines': [
    'Boje: 3+ na 100% TM — tak Wendler sprawdza, czy TM jest dobre. 3 czyste powtórzenia albo więcej: TM w porządku, następny cykl rusza od niego.',
    'Mniej niż 3: TM jest za wysokie — przed kolejnym cyklem obniż maks o 10% w Postęp → Maksy.',
    'Kolana, kostki i biodra: porównaj z tygodniem 2 w Raporcie cyklu ciężar w ATG split squacie, na skrzyni i w przysiadzie hiszpańskim, zakres w Nordicu, powtórzenia we wspięciach jednonóż i sekundy w planku kopenhaskim.',
    'Zakresy: porównaj poziomy testu zakresów z pierwszą niedzielą.']},
  {'heading': 'Kiedy powtórzyć tydzień', 'lines': [
    'Tydzień podbijasz, gdy każda sesja zmieściła się w suficie RPE.',
    'Jeśli nie — powtarzasz ten sam tydzień z tym samym ciężarem. To nie jest opóźnienie planu.']},
]

plan = {
  'cykl': 5,
  'title': 'Cykl 5 · 5/3/1 i ATG',
  'schedule': 'wt A · czw B · sob C · nd joga i test zakresów',
  'bar': stary['bar'], 'plates': stary['plates'],
  # Wartości awaryjne — na urządzeniu z cyklem 4 maksy przechodzą z niego (niżej).
  'e1rm': dict(stary['e1rm']),
  'e1rmZPoprzedniego': ['bench', 'front', 'dl'],
  # TM 5/3/1 jako ułamek maksa — do opisu tygodni na ekranie Plan.
  'tm': TM,
  # Podwyżka dołu po bloku budowy: +5% (u Wendlera +5 kg na falę), a nie +10%.
  'rekalProc': 0.05,
  # Nazwy pięciu odcinków cyklu na ekranie Plan.
  'fazy': ['Budowa 1', 'Budowa 2', 'Lżej', 'Rekordy', 'Test TM'],
  'weeks': weeks,
  'days': {
    # `dzien` = getDay (0 niedziela): aplikacja bierze z niego Dziś, pasek tygodnia i pominięcia.
    'A': {'key': 'A', 'title': 'WYCISKANIE · 5/3/1 i kolana ATG', 'day': 'Wtorek', 'dzien': 2, 'minutes': 58, 'items': A},
    'B': {'key': 'B', 'title': 'JEDNONÓŻ · biodra i kostki, bez sztangi', 'day': 'Czwartek', 'dzien': 4, 'minutes': 60, 'items': B},
    'C': {'key': 'C', 'title': 'DÓŁ · front squat i martwy ciąg 5/3/1', 'day': 'Sobota', 'dzien': 6, 'minutes': 58, 'items': C},
  },
  'warmup': warmup,
  'rules': rules,
  'mobility': copy.deepcopy(stary['mobility']),
  'rozciaganie': copy.deepcopy(stary['rozciaganie']),
  'deloadTekst': 'Siódmy tydzień Wendlera: boje 1 × 5 przy 70% TM i 2 × 5 przy 60% TM, ćwiczenia dodatkowe po 2 serie, worek 2 rundy. Joga i test zakresów bez zmian.',
  'tydzien12Tekst': 'Test TM: na 100% TM robisz 3+ czystych powtórzeń. 3 albo więcej — TM jest dobre. Mniej — przed kolejnym cyklem obniż maks o 10% w Postęp → Maksy.',
}
json.dump(plan, open(os.path.join(ROOT, 'plan.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
ile = sum(len(d['items']) for d in plan['days'].values())
print('plan.json: cykl', plan['cykl'], '·', ile, 'pozycji w treningach, w tym',
      sum(1 for d in plan['days'].values() for x in d['items'] if x.get('rozc')), 'rozciągania')
