# Generator planu cyklu 4 (plan.json). Zamknięte cykle: plan-cykl1.json … plan-cykl3.json.
# Uruchom: python3 tools/cykl4.py
# Tresc wylacznie treningowa — repozytorium jest publiczne.
#
# Cel cyklu: zdrowe kolana, kostki i biodra. Sprzęt: sztanga ze stojakiem, ławka,
# hantle, drążek, gumy, skrzynia i worek treningowy — żadnych maszyn.
# Tydzień: wt A (wyciskanie + kolana), czw B (bez sztangi: biodra i kostki),
# sob C (front squat i martwy ciąg), śr/pt kwadrans rozciągania i testu zakresów,
# nd joga. Boje stoją w tych samych dniach co w cyklach 2 i 3.
import json, os, sys, copy
ROOT = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, os.path.dirname(__file__))
from joga2 import JOGA
stary = json.load(open(os.path.join(ROOT, 'plan-cykl3.json'), encoding='utf-8'))

# cel: które stawy dostają pracę — z tego aplikacja liczy bilans tygodnia.
#   kolano, kostka, biodro (stawy), gora, tulow, kondycja (reszta)
# sPowt: sekundy na powtórzenie, gdy tempo jest inne niż domyślne 3 s.
def it(n, id_, name, scheme, load, rpe, note, cel, superset=None, noCut=False, kgStart=None, sPowt=None):
    d = {'n': n, 'id': id_, 'name': name, 'superset': superset, 'scheme': scheme, 'load': load, 'rpe': rpe, 'note': note, 'noCut': noCut, 'cel': cel}
    if kgStart is not None: d['kgStart'] = kgStart
    if sPowt is not None: d['sPowt'] = sPowt
    return d

REF = lambda r: {'ref': r}

# Schemat ćwiczenia dodatkowego na 12 tygodni: blok 1 (tyg. 1–3), blok 2 (4–6),
# tydzień 7 lżej (2 serie), blok 3 (8–11), tydzień 12 sprawdzian (2 serie).
import re
def _dwie(schemat):
    return re.sub(r'^\s*\d+', '2', schemat)
def S(b1, b2=None, b3=None):
    b2 = b2 or b1; b3 = b3 or b2
    return {'tyg': [b1] * 3 + [b2] * 3 + [_dwie(b2)] + [b3] * 4 + [_dwie(b3)]}

# Nazwy ćwiczeń z poprzednich cykli są przepisane co do litery: suwak ciężaru
# pamięta ciężar po nazwie, więc bułgarski czy wiosłowanie startują z tego, co było.

A = [
  it(1, 'c4a1', 'Wyciskanie leżąc', REF('upper.scheme'), REF('bench.kg'), REF('upper.rpe'),
     'Bój główny. SUPERSERIA z unoszeniem palców — 90 s po parze (od bloku 3: 120 s). Łopatki ściągnięte i wbite w ławkę, stopy płasko, umiarkowany mostek. Sztanga schodzi na dolną część mostka, łokcie ok. 45° od tułowia. W tym cyklu góra jest na utrzymanie — sufit RPE pilnuje zapasu. Między seriami idziesz pod ścianę: nogi i tak czekają.',
     ['gora'], superset='A1', noCut=True),
  it(2, 'c4a2', 'Unoszenie palców przy ścianie (piszczelowy przedni)', S('3 × 15', '3 × 20'), 'masa ciała', 7,
     'Plecy i pośladki o ścianę, pięty 30–40 cm od niej, nogi proste. Unieś palce stóp jak najwyżej, 1 s na górze, opuść bez klapania. Trudniej: stopy dalej od ściany, potem na jednej nodze. Piszczelowy przedni hamuje stopę i kolano przy każdym kroku w dół — to on amortyzuje schody.',
     ['kostka'], superset='A2', sPowt=1.5),
  it(3, 'c4a3', 'Przysiad bułgarski z hantlami', S('3 × 8', '3 × 8', '3 × 6'), 'podwójna progresja', 7,
     'SUPERSERIA z podciąganiem — 90 s po parze. Tylna stopa na ławce, przednia tak daleko, żeby w dole kolano było nad stopą albo lekko przed nią. 3 s w dół, kolano w linii drugiego palca, miednica pozioma. Tułów lekko pochylony obciąża pośladek, pionowy — udo. Zaczynasz słabszą nogą. W bloku 3 mniej powtórzeń, cięższe hantle.',
     ['kolano', 'biodro'], superset='B1', noCut=True, kgStart=12),
  it(4, 'c4a4', 'Podciąganie', S('3 × 5', '3 × 6', '4 × 5'), 'pełne albo negatywy 4 s', 8,
     'Łopatki najpierw w dół, potem ciągniesz łokcie do żeber, broda nad drążek. Jeśli pełne nie wchodzą czysto, zacznij serię od tylu pełnych, ile masz, a resztę dobij negatywami: wejście z ławki, 4 s w dół do pełnego zwisu.',
     ['gora'], superset='B2'),
  it(5, 'c4a5', 'Goblet squat z piętami na podwyższeniu (do skrzyni)', S('3 × 12', '3 × 12', '3 × 10'), 'podwójna progresja', 7,
     'SUPERSERIA z Nordikiem — 75 s po parze. Pięty na talerzach 5 kg albo klinie, stopy wąsko, hantel pionowo przy mostku. 3 s w dół do skrzyni na wysokości kolan — dotknij jej bez siadania całym ciężarem — i w górę. Tułów pionowo, kolana wychodzą do przodu nad palce. Z całego planu to ćwiczenie najmocniej skupia pracę na przodzie uda.',
     ['kolano'], superset='C1', kgStart=16),
  it(6, 'c4a6', 'Nordic z asekuracją rękami', S('3 × 4', '3 × 5', '3 × 6'), 'masa ciała', 8,
     'Kolana na kocu, pięty zaczepione pod obciążoną sztangą w stojaku albo pod innym stałym punktem. Ciało w jednej linii od kolan do głowy, biodra wyprostowane. Opuszczaj się tak wolno, jak dasz radę (cel 3–5 s), na końcu złap się dłońmi jak przy pompce i odepchnij do góry. Blok 1: połowa zakresu. Tył uda trzyma kolano od tyłu — przeciwwaga dla całej pracy czworogłowego.',
     ['kolano'], superset='C2', sPowt=5),
  it(7, 'c4a7', 'Worek: rundy', S('3 × 2 min', '4 × 2 min', '3 × 3 min'), 'tempo rozmowy', 7,
     'Przerwa 60 s. Runda 1: lewy prosty i praca nóg dookoła worka. Runda 2: lewy–prawy, po każdej kombinacji krok w bok. Od rundy 3: dowolne kombinacje, ostatnie 20 s szybciej. Cały czas na przedniej części stóp, kolana miękkie. Przy prawym prostym i sierpie pięta tylnej nogi obraca się razem z biodrem — skręt idzie ze stopy i biodra, kolano tylko za nimi podąża. Tempo takie, żeby dało się mówić pełnymi zdaniami.',
     ['kostka', 'biodro', 'kondycja']),
]

B = [
  it(1, 'c4b1', 'Wejście na skrzynię z wolnym zejściem', S('3 × 8', '3 × 8', '3 × 6'), 'podwójna progresja', 7,
     'SUPERSERIA z wiosłowaniem — 75 s po parze (wiosłowanie daje nogom chwilę). Skrzynia tak wysoka, żeby udo nogi na skrzyni było najwyżej poziomo. Hantle w dłoniach, cała stopa na skrzyni. Wchodzisz siłą nogi na górze — dolna tylko się odrywa, bez odbijania. Schodzisz tą samą nogą przez 3 s, kolano w linii drugiego palca, miednica pozioma. Najpierw cała seria na jedną nogę, potem druga.',
     ['kolano', 'biodro'], superset='A1', noCut=True, kgStart=10),
  it(2, 'c4b2', 'Wiosłowanie hantlem w podporze', S('3 × 8', '3 × 8', '3 × 6'), 'podwójna progresja', 7,
     'Kolano i dłoń na ławce, plecy płasko. Ciągnij hantel do biodra, nie do barku — łokieć blisko tułowia, łopatka zjeżdża w dół i do kręgosłupa. 1 s pauzy na górze, bez skrętu tułowia.',
     ['gora'], superset='A2', kgStart=20),
  it(3, 'c4b3', 'Martwy ciąg rumuński jednonóż z hantlem', S('3 × 8'), 'podwójna progresja', 7,
     'SUPERSERIA z plankiem kopenhaskim — 60 s po parze. Hantel w ręce po stronie nogi wolnej. Biodro cofa się, tułów i wolna noga tworzą jedną linię jak dźwignia, kolano nogi podporowej lekko ugięte. Miednica równo — biodro wolnej nogi nie otwiera się w bok. Stopa podporowa trzyma trzy punkty: piętę, podstawę dużego i małego palca. Biodro, kolano i kostka uczą się tu trzymać oś naraz.',
     ['biodro', 'kostka'], superset='B1', kgStart=12),
  it(4, 'c4b4', 'Plank kopenhaski', S('3 × 25 s / stronę', '3 × 30 s / stronę'), 'kolano na ławce', '—',
     'Bokiem na przedramieniu, kolano górnej nogi na ławce, dolna noga swobodnie. Unieś biodra do linii prostej i trzymaj. Progresja: najpierw czas, potem co 2–3 s unosisz dolną nogę do ławki. Stopa zamiast kolana na ławce dopiero wtedy, gdy wewnętrzna strona kolana nic nie zgłasza. Przywodziciele trzymają kolano w osi razem z pośladkiem średnim.',
     ['biodro'], superset='B2'),
  it(5, 'c4b5', 'Przysiad hiszpański z hantlem (izometria)', S('3 × 45 s'), 'podwójna progresja', 6,
     'SUPERSERIA z deską boczną — 45 s po parze. Guma za kolanami przyczepiona do stojaka, hantel trzymany przy klatce. Zejdź do ok. 60–70° zgięcia w kolanie, piszczele pionowo, tułów pionowo, i trzymaj, mocno napinając uda. Trudniej = cięższy hantel, nie głębiej. Kolana bardzo dobrze znoszą izometrię — mocny bodziec dla czworogłowego i więzadła rzepki bez ruchu w stawie.',
     ['kolano'], superset='C1', noCut=True, kgStart=8),
  it(6, 'c4b6', 'Deska boczna z odwodzeniem nogi', S('3 × 6 / stronę', '3 × 8 / stronę'), 'masa ciała', '—',
     'Deska boczna na przedramieniu: łatwiej z dolnym kolanem na macie, trudniej na prostych nogach. Biodra w górze, w jednej linii z barkami. Górną, prostą nogę unosisz na 30–40 cm, 1 s pauzy, 2 s w dół. Pracuje pośladek średni obu nóg naraz — górnej w ruchu, dolnej w podporze — ten, który nie pozwala kolanu zapadać się do środka.',
     ['biodro', 'tulow'], superset='C2'),
  it(7, 'c4b7', 'Wspięcia na palce jednonóż, kolano ugięte', S('3 × 10 / nogę', '3 × 12 / nogę'), 'masa ciała → hantel', 7,
     'SUPERSERIA z ewersją — 45 s po parze. Przednia część stopy na stopniu, kolano ugięte ok. 20–30° przez cały ruch — tak pracuje płaszczkowaty, główny amortyzator kostki i kolana przy schodzeniu. Pięta nisko w dół, 1 s na górze, 3 s w dół. Gdy komplet idzie lekko, hantel w ręce po stronie nogi pracującej.',
     ['kostka'], superset='D1'),
  it(8, 'c4b8', 'Ewersja stopy z gumą (siedząc)', S('2 × 15 / nogę'), 'coraz grubsza guma', 6,
     'Siedzisz, guma wokół przedniej części stopy, zaczepiona po wewnętrznej stronie. Odwiedź stopę na zewnątrz, 1 s pauzy, powrót wolno. Ruch tylko w kostce — kolano i udo nieruchomo. Mięśnie strzałkowe trzymają kostkę z boku: to one łapią stopę, gdy ląduje krzywo.',
     ['kostka'], superset='D2', sPowt=1.5),
  it(9, 'c4b9', 'Worek: rundy', S('3 × 2 min', '4 × 2 min'), 'tempo rozmowy', 7,
     'Przerwa 60 s. Dziś nacisk na nogi: runda 1 — krążysz wokół worka w obie strony na lewym prostym. Runda 2 — po każdej kombinacji dwa kroki w bok albo w tył. Runda 3 — kombinacje z ciosem na dół: uginasz kolana, nie plecy. Cały czas na przedniej części stóp. Pięta tylnej nogi obraca się razem z biodrem — skręt idzie ze stopy i biodra, kolano tylko za nimi podąża.',
     ['kostka', 'biodro', 'kondycja']),
]

C = [
  it(1, 'c4c1', 'Front squat', REF('lower.scheme'), REF('front.kg'), REF('lower.rpe'),
     'Bój główny. Przerwy 3 min. Sztanga na przednich naramiennych, łokcie wysoko, tułów pionowo. Kolana mogą wyjść przed palce — ważne, żeby szły w linii drugiego palca stopy i nie zapadały się do środka. Głębokość: tak nisko, jak plecy zostają neutralne, a pięty na podłodze. 2 s w dół, w górę zdecydowanie.',
     ['kolano', 'biodro'], noCut=True),
  it(2, 'c4c2', 'Martwy ciąg', REF('lower.scheme'), REF('dl.kg'), REF('lower.rpe'),
     'Bój główny. Przerwy 3 min. Z podłogi; po przysiadzie wystarczą dwie serie dojściowe (50% × 5, 75% × 3). Sztanga nad środkiem stopy, łopatki nad sztangą, plecy neutralne. Najpierw napięcie (zabierz luz ze sztangi), potem pchasz podłogę nogami. Każde powtórzenie od zera — bez odbijania.',
     ['biodro'], noCut=True),
  it(3, 'c4c3', 'Wspięcia na palce stojąc na stopniu z hantlem', S('3 × 15', '3 × 12', '3 × 10'), 'podwójna progresja', 7,
     'SUPERSERIA ze spacerem farmera — 60 s po parze. Obunóż, przednia część stóp na stopniu albo talerzu, hantel w jednej ręce, druga dłoń o stojak. Kolana proste, ale nie zablokowane. Pięta nisko, 1 s na górze, 3 s w dół. Z bloku na blok mniej powtórzeń i cięższy hantel; gdy brakuje hantli — na jednej nodze. Przy prostym kolanie pracuje brzuchaty łydki, druga połowa łydki obok płaszczkowatego z czwartku.',
     ['kostka'], superset='A1', kgStart=16),
  it(4, 'c4c4', 'Spacer farmera jednorącz', S('3 × 30 m / stronę'), 'podwójna progresja', 7,
     'Ciężki hantel w jednej ręce, druga ręka swobodnie. Barki na jednym poziomie, tułów pionowo — nie przechylaj się w żadną stronę. Krótkie, spokojne kroki, kolana w linii stóp. Pośladek średni po przeciwnej stronie trzyma miednicę poziomo przy każdym kroku. Mało miejsca: chodź tam i z powrotem, licząc kroki zamiast metrów.',
     ['biodro', 'tulow'], superset='A2', kgStart=24),
]

def lower(w, block, scheme, pct, rpe):
    return {'week': w, 'block': block, 'scheme': scheme, 'pct': pct, 'dlAdj': 0, 'rpe': rpe, 'barHeight': 'z podłogi'}
def upper(w, block, scheme, pct, rpe):
    return {'week': w, 'block': block, 'scheme': scheme, 'pct': pct, 'rpe': rpe, 'benchText': None, 'pullup': None}

# Ten sam szkielet co w cyklu 2: blok 1 objętość, blok 2 siła, tydzień 7 lżej,
# blok 3 ciężej, tydzień 12 sprawdzian. Procenty liczą się od maksów, które
# przechodzą z cyklu 2 (e1rmZPoprzedniego), więc tydzień 1 jest krokiem w tył
# wobec końcówki cyklu 2 — nogi dostają w tym czasie dużo nowej pracy.
weeks = {
  'lower': [lower(1,'1','3 × 8',.675,7), lower(2,'1','3 × 8',.70,7), lower(3,'1','3 × 8',.725,7),
            lower(4,'2','4 × 6',.725,7), lower(5,'2','4 × 6',.75,7), lower(6,'2','4 × 6',.775,7),
            lower(7,'deload','2 × 6',.55,5),
            lower(8,'3','4 × 5',.775,7), lower(9,'3','4 × 5',.80,7), lower(10,'3','4 × 5',.825,7),
            lower(11,'3','4 × 5',.825,7), lower(12,'3','3 × 5 + kontrola',.70,7)],
  'upper': [upper(1,'1','3 × 8',.675,7), upper(2,'1','3 × 8',.70,7), upper(3,'1','3 × 8',.725,7),
            upper(4,'2','4 × 6',.725,7.5), upper(5,'2','4 × 6',.75,7.5), upper(6,'2','4 × 6',.775,7.5),
            upper(7,'deload','2 × 6',.625,5),
            upper(8,'3','4 × 5',.775,7.5), upper(9,'3','4 × 5',.80,7.5), upper(10,'3','4 × 5',.825,8),
            upper(11,'3','4 × 5',.825,8), upper(12,'3','3 × 5',.80,7)],
}

warmup = {
  'ramp': {'steps': ['Gryf 2 × 8', '50% × 5', '70% × 3', '85% × 2', 'Ciężar roboczy'],
           'lifts': [{'lift': 'bench', 'name': 'Wyciskanie leżąc'}, {'lift': 'front', 'name': 'Front squat'}, {'lift': 'dl', 'name': 'Martwy ciąg'}]},
  'skip': ['Rozciągania statycznego przed sztangą — zostaje na koniec treningu i na niedzielę.',
           'Długiego rolowania — 1–2 minuty na miejsce, które naprawdę tego potrzebuje, wystarczą.',
           'Krążeń bioder, skrętów kolana i pracy w końcowych zakresach.',
           'Ćwiczeń do upadku mięśniowego — rozgrzewka ma przygotować, nie zmęczyć.'],
  'notes': ['Przerwy między seriami dojściowymi: 60 s. Mają rozgrzewać, nie męczyć.',
            'W sobotę przed ciągiem wystarczą DWIE serie (50% × 5, 75% × 3) — po przysiadzie jesteś rozgrzany.'],
  'days': {
    'A': {'label': 'DZIEŃ A — wyciskanie i kolana  ·  ~7 min', 'steps': [
      {'what': 'Worek albo walka z cieniem, lekko', 'dose': '2 min', 'note': 'Same proste i praca nóg, bez siły. Ma rozgrzać barki, biodra i kostki, nie zmęczyć.'},
      {'what': 'Podskoki na palcach (pogo)', 'dose': '2 × 15', 'note': 'Obunóż, niskie i ciche, kolana prawie proste, pięty nie dotykają podłogi. Sprężyna ma być w kostce.'},
      {'what': 'Band pull-apart', 'dose': '2 × 15', 'note': 'Ręce na wysokości barków, łopatki ściągnięte.'},
      {'what': 'Rotacja zewnętrzna barku z gumą', 'dose': '1 × 15 / rękę', 'note': 'Łokieć przy tułowiu.'},
      {'what': 'Serie dojściowe do wyciskania', 'dose': 'wg tabeli', 'note': ''},
      {'what': 'Przed bułgarskim: goblet squat do skrzyni', 'dose': '1 × 8', 'note': 'Po wyciskaniu, zanim zaczniesz superserię — kolana mają być ciepłe. 3 s w dół.'}]},
    'B': {'label': 'DZIEŃ B — biodra i kostki, bez sztangi  ·  ~6 min', 'steps': [
      {'what': 'Worek albo walka z cieniem, lekko', 'dose': '2 min', 'note': 'Praca nóg dookoła worka, luźne proste.'},
      {'what': 'Knee-to-wall', 'dose': '1 × 10 / nogę', 'note': 'Pięta na podłodze, kolano do ściany w linii drugiego palca, 2 s przy ścianie.'},
      {'what': 'Chód boczny z mini gumą', 'dose': '1 × 10 / stronę', 'note': 'Półprzysiad, kolana nie zapadają się do środka. Budzi pośladek średni.'},
      {'what': 'Marsz biodrowy z mini gumą (leżąc)', 'dose': '1 × 8 / stronę', 'note': 'Lędźwie przyklejone do podłogi, 2 s pauzy. Budzi zginacze biodra po dniu siedzenia.'},
      {'what': 'Band pull-apart', 'dose': '1 × 15', 'note': 'Przed wiosłowaniem.'}]},
    'C': {'label': 'DZIEŃ C — dół ze sztangą  ·  ~8 min', 'steps': [
      {'what': 'Worek albo walka z cieniem, lekko', 'dose': '2 min', 'note': 'Najcięższy dzień tygodnia — nie skracaj rozgrzewki.'},
      {'what': 'Oddech 90/90 ze stopami na ścianie', 'dose': '1 × 5 oddechów', 'note': 'Wydech ustami, żebra w dół, lędźwie miękko do podłogi. Ustawia miednicę przed sztangą.'},
      {'what': 'Knee-to-wall', 'dose': '1 × 10 / nogę', 'note': 'Pięta na podłodze, kolano do ściany w linii drugiego palca.'},
      {'what': 'Podskoki na palcach (pogo)', 'dose': '2 × 15', 'note': 'Niskie i ciche. Budzi łydki i ścięgna przed przysiadem.'},
      {'what': 'Goblet squat do skrzyni', 'dose': '1 × 8', 'note': 'Lekki hantel, 3 s w dół. Ustawia tor kolan przed sztangą.'},
      {'what': 'Serie dojściowe do front squata', 'dose': 'wg tabeli', 'note': ''},
      {'what': 'Serie dojściowe do ciągu', 'dose': '50% × 5, 75% × 3', 'note': 'Krótsza wersja — po przysiadzie jesteś rozgrzany.'}]},
  },
}

rules = [
  {'heading': 'Układ tygodnia', 'lines': [
    'Trzy treningi i niedziela. Poniedziałek, środa i piątek są wolne — rozciąganie nie ma osobnych dni, kończy każdy trening.',
    'Wtorek — Dzień A: GÓRA i kolana. Wyciskanie, przysiad bułgarski, goblet z piętami w górze, Nordic, worek, na koniec rozciąganie.',
    'Czwartek — Dzień B: BIODRA i kostki, bez sztangi. Skrzynia, ciąg jednonóż, kopenhaski, przysiad hiszpański, łydka i strzałkowe, worek, na koniec rozciąganie.',
    'Sobota — Dzień C: DÓŁ ze sztangą. Front squat, martwy ciąg, łydki, spacer farmera, na koniec rozciąganie.',
    'Niedziela — joga, domyślnie krótka (~20 min), pełna, gdy jest czas, a po niej test zakresów (~8 min).',
    'Boje stoją tam, gdzie zawsze: wyciskanie we wtorek, przysiad i ciąg w sobotę. Czwartek jest bez sztangi.',
    'Sprzęt: sztanga ze stojakiem, ławka, hantle, drążek, gumy (długa i mini), skrzynia albo stopień, worek. Żadnych maszyn.']},
  {'heading': 'Trzy stawy', 'lines': [
    'Kolana: silny czworogłowy w całym zakresie — front squat i bułgarski w zgięciu, przysiad hiszpański w środku, goblet z piętami w górze na sam przód uda — i tył uda jako przeciwwaga (Nordic, ciąg jednonóż).',
    'Kostki: cztery rzeczy, których potrzebuje każda kostka. Siła łydki przy prostym i ugiętym kolanie, przód goleni (piszczelowy), bok (strzałkowe z gumą) i sprężystość — podskoki w rozgrzewce i praca nóg na worku.',
    'Biodra: pośladek wielki (ciąg, bułgarski, skrzynia), pośladek średni (deska boczna z odwodzeniem, spacer farmera), przywodziciele (kopenhaski) i rotacja pod prędkością na worku.',
    'Każde ćwiczenie w aplikacji ma znaczek stawu, a ekran Dziś pokazuje, ile serii dostał w tym tygodniu każdy z trzech.',
    'Góra jest na utrzymanie: wyciskanie raz w tygodniu, ciągnięcie dwa razy (podciąganie, wiosłowanie).']},
  {'heading': 'Worek', 'lines': [
    'Dwa razy w tygodniu na koniec sesji, 3–4 rundy, plus dwie lekkie minuty w każdej rozgrzewce.',
    'To nie jest trening boksu, tylko praca dla stawów: sprężysta kostka, biodro, które obraca się szybko, i kondycja bez biegania.',
    'Tempo rozmowy: dasz radę mówić pełnymi zdaniami. Ostatnie 20 s rundy można przyspieszyć.',
    'Skręt zawsze ze stopy i biodra — pięta tylnej nogi odrywa się i obraca. Stopa przyklejona do podłogi przy ciosie to skręt w kolanie.',
    'Rękawice albo owijki. Nadgarstek prosto, uderzasz dwiema pierwszymi kostkami.',
    'Aplikacja odlicza rundę i przerwę sama: gong na start i koniec, stuknięcie 10 s przed końcem.']},
  {'heading': 'Rozciąganie na koniec', 'lines': [
    'Każdy trening kończy się dwiema–trzema pozycjami statycznymi, razem 4–6 minut. Scena prowadzi je jak serie na czas: 5 s na ustawienie, trzymanie, zmiana strony — bez przerw między pozycjami.',
    'Wtorek: zginacz biodra i łydka. Czwartek: pośladek i przywodziciele. Sobota: tył uda, zginacz biodra i łydka.',
    'Rozciąganie ma ciągnąć w mięśniu, nie w stawie. Gdy czujesz coś w kolanie albo w pachwinie, zmniejsz zakres.',
    'Bez sprężynowania. Wejdź do 6–7 na 10 i trzymaj; z każdym wydechem pozwól sobie zejść odrobinę dalej.',
    'Nie przed sztangą — dlatego stoi na samym końcu sesji, po worku.',
    'Dłuższa praca nad zakresem i test zakresów są w niedzielę, razem z jogą.']},
  {'heading': 'Czas trwania', 'lines': [
    'Każdy dzień: 6–8 min rozgrzewki, ~50 min pracy i 4–6 min rozciągania na koniec — razem około godziny.',
    'PRZERWY: przysiad i ciąg 3 min. Wyciskanie idzie w parze z piszczelowym: 90 s po parze (od bloku 3: 2 min). Superserie bez przerwy w środku; po parze 90 s przy bułgarskim, 75 s przy skrzyni i goblecie, 60 s przy lżejszych, 45 s przy kostkach.',
    'Timer przerwy rusza sam po odhaczeniu serii. Trzymaj się go — od tego zależy, czy worek zmieści się w godzinie.',
    'Jeśli brakuje czasu, tniesz w kolejności: jedna runda na worku → trzecia seria ostatniej superserii → trzecia seria środkowej superserii.',
    'Nie tniesz: boju głównego, przysiadu bułgarskiego, wejścia na skrzynię ani przysiadu hiszpańskiego.']},
  {'heading': 'Ciężary', 'lines': [
    'Maksy przechodzą z poprzedniego cyklu tak, jak zostawiła je samoregulacja — nic nie wpisujesz ręcznie. Tydzień 1 to 67,5% tych maksów.',
    'Ćwiczenia, które zostały pod tą samą nazwą (bułgarski, wiosłowanie, ciąg jednonóż, skrzynia, goblet, przysiad hiszpański, spacer farmera), startują z ostatnim ciężarem zapisanym w dzienniku.',
    'Sufit RPE jest nadrzędny wobec procentów: jeśli ciężar wychodzi ciężej niż sufit, zdejmujesz z gryfu.',
    'Korekta z dwóch tygodni i podwyżka dołu po blokach działają jak dotąd. Każdą da się cofnąć.']},
  {'heading': 'Progresja ćwiczeń dodatkowych', 'lines': [
    'Plan sam zmienia serie i powtórzenia między blokami — w bloku 3 jest mniej powtórzeń i cięższe hantle. Aplikacja pokazuje schemat na bieżący tydzień.',
    'Przy hantlach ustaw raz ciężar, którego używasz — aplikacja go zapamięta i podpowie podwyżkę, gdy dwa tygodnie z rzędu robisz komplet.',
    'Tempo jest częścią ćwiczenia: 3 s w dół przy bułgarskim, skrzyni, goblecie i wspięciach. Szybsze powtórzenie z większym ciężarem to nie progres.',
    'Nordic: blok 1 połowa zakresu, potem coraz niżej bez łapania się rękami, dopiero na końcu wolniej.',
    'Izometria: trudniej = cięższy hantel, nie głębiej.',
    'Plank kopenhaski: najpierw czas, potem unoszenie dolnej nogi, dopiero na końcu stopa zamiast kolana na ławce.',
    'Piszczelowy przy ścianie: trudniej = stopy dalej od ściany, potem jedna noga.',
    'Podskoki w rozgrzewce: gdy 2 × 15 jest ciche i lekkie, przejdź na skakankę (2 × 30 s), potem na jedną nogę.']},
  {'heading': 'Zasada złego dnia', 'lines': [
    'Rozgrzewka idzie wyraźnie ciężej niż zwykle: zdejmujesz 10% i robisz zaplanowaną objętość lżej.',
    'Kostka albo kolano odzywa się przy podskokach lub na worku: tego dnia podskoki zamień na wspięcia, a na worku stój szerzej i bij z miejsca.',
    'Plecy sztywne rano w sobotę: ciąg lżej o 10% albo zamień sobotę z czwartkiem. Kolejność da się przestawić w obrębie tygodnia.',
    'Ćwiczenie, w którym coś nie gra w stawie (nie zmęczenie mięśnia) — najpierw mniejszy zakres, potem mniejszy ciężar, a jeśli dalej nie gra, pomiń je w tej sesji i zanotuj.']},
  {'heading': 'Tydzień 7 — lżejszy (nie jest opcjonalny)', 'lines': [
    'Boje: 2 × 6 przy 55% (dół) i 62,5% (góra), RPE 5.',
    'Ćwiczenia dodatkowe: 2 serie zamiast 3, ten sam ciężar — aplikacja pokazuje już skrócony schemat. Worek: 2 rundy. Rozciąganie i joga bez zmian.']},
  {'heading': 'Tydzień 12 — sprawdzian', 'lines': [
    'Bez testu maksa. Boje lżej (3 × 5).',
    'Przysiad: po seriach roboczych weź ciężar front squata z tygodnia 3 i zrób jedną serię na maks. powtórzeń — stop przy 15 albo RPE 8. Porównaj z tygodniem 3.',
    'Kolana, kostki i biodra — porównaj z tygodniem 2 w Raporcie cyklu: ciężar w bułgarskim, na skrzyni, w goblecie i przysiadzie hiszpańskim przy tym samym tempie, zakres w Nordicu, powtórzenia we wspięciach jednonóż i sekundy w planku kopenhaskim.',
    'Zakresy: porównaj poziomy testu zakresów z pierwszym tygodniem.',
    'To jest miara celu tego cyklu — nie ciężar na sztandze.']},
  {'heading': 'Kiedy powtórzyć tydzień', 'lines': [
    'Tydzień podbijasz, gdy każda sesja zmieściła się w suficie RPE.',
    'Jeśli nie — powtarzasz ten sam tydzień z tym samym ciężarem. To nie jest opóźnienie planu.']},
]

# Test zakresów jest w niedzielę, na ekranie jogi. Rozciąganie nie ma osobnych dni —
# jego pozycje kończą treningi A, B i C (niżej, ROZC_NA_KONIEC).
def r(id_, name, dose, sec, steps, blad, note, film, **extra):
    return {'id': id_, 'name': name, 'dose': dose, 'sec': sec, 'steps': steps, 'blad': blad, 'note': note, 'film': film, **extra}

# Test zakresów: końcowe zakresy wracają poziom po poziomie, z oceną po każdej
# pozycji (0 spokojnie, 1 ciągnie w mięśniu, 2 coś w stawie). Ostatnie poziomy
# to już aktywna kontrola w zakresie, nie samo trzymanie. Siłownia i joga bez zmian.
def z(id_, name, dose, sec, poziomy, steps, blad, note, film):
    return r(id_, name, dose, sec, steps, blad, note, film, poziomy=poziomy)

ZAKRESY = {
  'title': 'Test zakresów', 'minutes': 8,
  'why': 'Głębokie zgięcie kolana i rotacja biodra, poziom po poziomie, z oceną po każdej pozycji. Ostatnie poziomy to już aktywna kontrola w zakresie, nie samo trzymanie.',
  'oceny': [
    {'v': 0, 'k': 'spokojnie', 'opis': 'lekkie rozciąganie albo nic'},
    {'v': 1, 'k': 'ciągnie w mięśniu', 'opis': 'tak ma być'},
    {'v': 2, 'k': 'coś w stawie', 'opis': 'ucisk albo kłucie — wyjdź z pozycji'},
  ],
  'rules': [
    'Tydzień 1 to test: w każdej pozycji zaczynasz od poziomu 1 i idziesz w górę tylko tak daleko, jak ocena zostaje 0 albo 1. Zapisujesz poziom, na którym kończysz.',
    'Ocena: 0 — spokojnie, 1 — ciągnie w mięśniu (tak ma być), 2 — coś w stawie, ucisk albo kłucie. Przy 2 wychodzisz z pozycji od razu.',
    'Zasada 24 godzin: jeśli dzień po kolano i biodro zachowują się normalnie — bez większej sztywności, bez puchnięcia — zostajesz na poziomie albo idziesz o jeden wyżej. Jeśli coś się odezwało, następnym razem poziom niżej, a nie rezygnacja.',
    'Test robisz raz w tygodniu, w niedzielę po jodze. Aplikacja podpowiada poziom z ostatnich zapisów: po dwóch spokojnych niedzielach na tym samym poziomie — o jeden wyżej, po ocenie 2 — o jeden niżej.',
    'Końcowe zakresy są tylko tutaj. W jodze i przed sztangą dalej ich nie ma, a plan na siłowni zostaje bez zmian, dopóki test nie pokaże, jak kolana na to reagują.',
    'Lotos, pełny gołąb i siad między piętami nie wracają — łączą końcowy zakres ze skrętem w kolanie i do niczego nie są potrzebne.',
  ],
  'items': [
    z('q1', 'Siad na piętach z podkładką', '30 s', 30,
      ['Gruba podkładka (zwinięty koc) między udami a łydkami, dłonie na podłodze',
       'Cienka poduszka, dłonie na udach',
       'Złożony ręcznik',
       'Bez podkładki, część ciężaru na dłoniach',
       'Bez podkładki, pełny siad, 60 s'],
      ['Klęknij na kocu, kolana na szerokość bioder, stopy prosto do tyłu — pięty pod pośladkami, nie po bokach.',
       'Wsuń podkładkę z twojego poziomu między uda a łydki, tuż za kolanami.',
       'Powoli opuść pośladki na podkładkę, dłonie asekurują.',
       'Trzymaj 30 s, oddychając spokojnie. Wychodzisz przez klęk podparty, bez gwałtownego wstawania.'],
      'Stopy rozjeżdżające się na boki i pośladki między piętami. Taki siad daje skręt w kolanie — stopy zostają prosto pod pośladkami.',
      'Głębokie zgięcie kolana bez skrętu: zakres, w którym kolano bywa przy klęknięciu i w dole przysiadu. Oswojony przestaje być niewiadomą.',
      'kneeling heel sit cushion knee flexion progression'),
    z('q2', 'Głęboki przysiad z trzymaniem framugi', '30 s', 30,
      ['Siad na niskim stołku (~30 cm), chwila w dole i powrót',
       'Stołek ~15 cm albo stos książek',
       'Pełny przysiad, pięty na podkładce 2–3 cm',
       'Pełny przysiad, pięty na podłodze',
       'Pełny przysiad, dłonie tylko asekurują; 3 razy wejście i wyjście z dołu'],
      ['Stań przodem do otwartych drzwi, stopy na szerokość bioder albo trochę szerzej, palce lekko na zewnątrz.',
       'Złap framugę obiema rękami na wysokości klatki.',
       'Zjedź w dół do swojego poziomu, kolana nad stopami, ręce przejmują tyle ciężaru, ile trzeba.',
       'Trzymaj 30 s w dole, oddychając. Wychodzisz siłą nóg, ręce pomagają.'],
      'Kolana uciekające do środka w dole. Rozepchnij je nad małe palce stóp, a jeśli się nie da — poziom niżej.',
      'Pełny przysiad to zwykła codzienność: kucanie, podnoszenie czegoś z podłogi. Z rękami na framudze uczysz kolana i biodra dołu bez ciężaru na plecach.',
      'assisted deep squat hold doorframe'),
    z('q3', 'Siad 90/90 (rotacja biodra)', '30 s / stronę', 30,
      ['Pośladki na poduszce, dłonie za plecami, poduszka pod tylnym kolanem',
       'Bez poduszki pod pośladkami, dłonie za plecami',
       'Tułów pionowo, dłonie lekko na podłodze',
       'Tułów pochylony nad przednią goleń, plecy długie',
       'Tułów pionowo, 5 razy uniesienie tylnego kolana na 2 s'],
      ['Usiądź na macie. Przednia noga zgięta 90° przed tobą, goleń w poprzek; tylna noga zgięta 90° z boku, stopa do tyłu.',
       'Przednie kolano i stopa leżą na podłodze, tylne kolano — tak nisko, jak pozwala biodro.',
       'Ustaw się według poziomu, ciężar możliwie równo na obu pośladkach.',
       'Trzymaj 30 s. Zmiana strony: dłonie za plecami, oba kolana przechodzą na drugą stronę.'],
      'Ciągnięcie po wewnętrznej stronie tylnego kolana. Odsuń tylną stopę dalej od pośladka albo podłóż poduszkę pod to kolano — rotacja ma być w biodrze.',
      'Przednia noga to rotacja zewnętrzna biodra, tylna — wewnętrzna. Biodro, które ma obie, nie oddaje ruchu kolanu przy zmianie kierunku i na schodach.',
      '90 90 hip stretch beginner hands behind'),
    z('q4', 'Czwórka leżąc (rotacja zewnętrzna biodra)', '30 s / stronę', 30,
      ['Stopa dolnej nogi na ścianie, pośladki daleko od ściany',
       'Stopa na ścianie, pośladki bliżej ściany',
       'Bez ściany, dłonie przyciągają udo dolnej nogi do klatki',
       'Bez ściany, dłonie przyciągają udo, 60 s'],
      ['Leżysz na plecach, oba kolana zgięte.',
       'Połóż kostkę prawej nogi na lewym udzie tuż nad kolanem, prawa stopa zgięta — palce do siebie.',
       'Ustaw się według poziomu, aż poczujesz rozciąganie w prawym pośladku i z boku biodra.',
       'Trzymaj 30 s, zmień stronę.'],
      'Luźna, opadająca stopa górnej nogi. Stopa zgięta (palce do siebie) trzyma kolano stabilnie — wtedy ruch zostaje w biodrze.',
      'Łagodniejszy krewny gołębia: ta sama rotacja zewnętrzna biodra, ale z plecami na podłodze i bez ciężaru na kolanie.',
      'supine figure four stretch'),
  ],
}

ROZCIAGANIE = {
  'key': 'R', 'title': 'Rozciąganie', 'minutes': 8,
  # wJodze: nie jest osobnym dniem tygodnia — blok testu stoi na ekranie niedzielnej jogi.
  'wJodze': True,
  'dni': [{'k': 'nd', 'dzien': 0, 'nazwa': 'Niedziela', 'skrot': 'Nd'}],
  'intro': 'Test zakresów po jodze: cztery pozycje, w każdej poziom i ocena.',
  'rules': [],
  'items': [],
  'zakresy': ZAKRESY,
}

# Rozciąganie na koniec treningu: pozycje statyczne jako serie na czas, bez przerw.
# Dopisane NA KOŃCU list A, B, C — numery wcześniejszych ćwiczeń (a z nimi dziennik) zostają.
def rozc(n, id_, name, scheme, fig, note):
    d = it(n, id_, name, scheme, 'łagodnie, 6–7 na 10', '—', note, ['rozciaganie'])
    d['rozc'] = True
    d['fig'] = fig
    return d

ZGINACZ = ('Zginacz biodra w półklęku', '1 × 45 s / stronę', 'polklek',
  'Półklęk, tylne kolano na złożonym kocu albo macie, przednia stopa płasko. Napnij pośladek tylnej nogi i podwiń miednicę, dopiero potem przesuń biodra 2–3 cm do przodu — ciągnie z przodu biodra tylnej nogi. Tułów pionowo, żebra w dół. Nie pchaj bioder daleko w przód z wygiętymi lędźwiami.')
LYDKA = ('Łydka przy ścianie', '1 × 45 s / stronę', 'r5',
  'Dłonie na ścianie, jedna noga z tyłu, pięta na podłodze, stopa prosto. Pierwszą połowę czasu tylne kolano proste, drugą lekko ugięte — rozciąganie schodzi niżej. Pięta nie odrywa się od podłogi.')
POSLADEK = ('Pośladek: kolano do przeciwnego barku', '1 × 45 s / stronę', 'r4',
  'Leżysz na plecach, jedna noga prosto. Kolano drugiej przyciągasz oburącz w stronę przeciwnego barku, aż poczujesz rozciąganie w pośladku. Miednica i oba barki zostają na podłodze.')
PRZYWODZICIELE = ('Przywodziciele: nogi na ścianie w rozkroku', '1 × 60 s', 'r3',
  'Leżysz na plecach z pośladkami blisko ściany, nogi oparte o ścianę. Pozwól im rozejść się na boki pod własnym ciężarem — ciągnie po wewnętrznej stronie ud. Kolana lekko ugięte, lędźwie na podłodze. Nie dociskaj nóg rękami.')
TYL_UDA = ('Tył uda z paskiem leżąc', '1 × 60 s / stronę', 'r2',
  'Leżysz na plecach, pasek albo ręcznik na stopie. Unieś nogę i przyciągaj ją paskiem, aż poczujesz rozciąganie w środku tyłu uda. Kolano lekko ugięte, stopa luźno, druga noga prosto na podłodze. Miednica nie odrywa się od podłogi.')
ROZC_NA_KONIEC = {'A': [ZGINACZ, LYDKA], 'B': [POSLADEK, PRZYWODZICIELE], 'C': [TYL_UDA, ZGINACZ, LYDKA]}
for klucz, lista in (('A', A), ('B', B), ('C', C)):
    for poz in ROZC_NA_KONIEC[klucz]:
        n = max(x['n'] for x in lista) + 1
        lista.append(rozc(n, f'c4{klucz.lower()}{n}', *poz))

# Joga bez zmian w pozycjach. Ciężki dzień wypada teraz w sobotę, tuż przed nią.
import copy
JOGA_C3 = copy.deepcopy(JOGA)
JOGA_C3['dzien'] = 0
JOGA_C3['rules'] = [l.replace('Po ciężkim piątku', 'Po ciężkiej sobocie') for l in JOGA_C3['rules']]
assert any('Po ciężkiej sobocie' in l for l in JOGA_C3['rules'])

plan = {
  'cykl': 4,
  'title': 'Cykl 4 · kolana, kostki, biodra',
  'schedule': 'wt A · czw B · sob C · nd joga i test zakresów',
  'bar': stary['bar'], 'plates': stary['plates'],
  # Wartości awaryjne — na urządzeniu z cyklem 2 maksy przechodzą z niego (niżej).
  'e1rm': dict(stary['e1rm']),
  'e1rmZPoprzedniego': ['bench', 'front', 'dl'],
  'weeks': weeks,
  'days': {
    # `dzien` = getDay (0 niedziela): aplikacja bierze z niego Dziś, pasek tygodnia i pominięcia.
    'A': {'key': 'A', 'title': 'GÓRA · wyciskanie i kolana', 'day': 'Wtorek', 'dzien': 2, 'minutes': 58, 'items': A},
    'B': {'key': 'B', 'title': 'BIODRA · kostki i jednonóż, bez sztangi', 'day': 'Czwartek', 'dzien': 4, 'minutes': 60, 'items': B},
    'C': {'key': 'C', 'title': 'DÓŁ · front squat i martwy ciąg', 'day': 'Sobota', 'dzien': 6, 'minutes': 58, 'items': C},
  },
  'warmup': warmup,
  'rules': rules,
  'mobility': JOGA_C3,
  'rozciaganie': ROZCIAGANIE,
  'deloadTekst': 'Boje 2 × 6 lekko, ćwiczenia dodatkowe po 2 serie, ten sam ciężar, worek 2 rundy. Rozciąganie i joga bez zmian.',
  'tydzien12Tekst': 'Bez testu maksa. Front squat: po seriach roboczych jedna seria na maks. powtórzeń z ciężarem z tygodnia 3 (stop przy 15 albo RPE 8). Stawy: porównaj z tygodniem 2 ciężary w bułgarskim, na skrzyni, w goblecie i przysiadzie hiszpańskim, czas w planku kopenhaskim i poziomy testu zakresów.',
}
json.dump(plan, open(os.path.join(ROOT, 'plan.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('plan.json: cykl', plan['cykl'], '·', sum(len(d['items']) for d in plan['days'].values()), 'pozycji w treningach, w tym', sum(1 for d in plan['days'].values() for x in d['items'] if x.get('rozc')), 'rozciągania')
