# Generator planu cyklu 3 (plan.json). Cykl 2 zostaje w plan-cykl2.json, cykl 1 w plan-cykl1.json.
# Uruchom: python3 tools/cykl3.py
# Tresc wylacznie treningowa — repozytorium jest publiczne.
#
# Cel cyklu: kolana i biodra. Tydzień jak w dzienniku cyklu 2: wt A (wyciskanie),
# czw B (bez sztangi, jednonóż), sob C (front squat i martwy ciąg); środa i piątek
# kwadrans rozciągania i testu zakresów w domu, niedziela joga. Bez maszyn: sztanga,
# hantle, ławka, drążek, gumy i skrzynia.
import json, os, sys
ROOT = os.path.join(os.path.dirname(__file__), '..')
sys.path.insert(0, os.path.dirname(__file__))
from joga2 import JOGA
stary = json.load(open(os.path.join(ROOT, 'plan-cykl2.json'), encoding='utf-8'))

def it(n, id_, name, scheme, load, rpe, note, superset=None, noCut=False, kgStart=None):
    d = {'n': n, 'id': id_, 'name': name, 'superset': superset, 'scheme': scheme, 'load': load, 'rpe': rpe, 'note': note, 'noCut': noCut}
    if kgStart is not None: d['kgStart'] = kgStart
    return d

REF = lambda r: {'ref': r}

# Nazwy ćwiczeń, które zostają z cyklu 2, są przepisane co do litery: suwak ciężaru
# pamięta ciężar po nazwie, więc bułgarski czy wiosłowanie startują z tego, co było.

A = [
  it(1, 'c3a1', 'Wyciskanie leżąc', REF('upper.scheme'), REF('bench.kg'), REF('upper.rpe'),
     'Bój główny. Przerwy 2 min (od bloku 3: 150 s). Łopatki ściągnięte i wbite w ławkę, stopy płasko, umiarkowany mostek. Sztanga schodzi na dolną część mostka, łokcie ok. 45° od tułowia. W tym cyklu góra jest na utrzymanie — sufit RPE pilnuje zapasu.', noCut=True),
  it(2, 'c3a2', 'Przysiad bułgarski z hantlami', '3 × 8 / nogę', 'podwójna progresja', 7,
     'SUPERSERIA z podciąganiem — 90 s po parze. Tylna stopa na ławce, przednia tak daleko, żeby w dole kolano było nad stopą albo lekko przed nią. 3 s w dół, kolano w linii drugiego palca, miednica pozioma. Tułów lekko pochylony obciąża pośladek, pionowy — udo. Zaczynasz słabszą nogą.', superset='A1', noCut=True, kgStart=12),
  it(3, 'c3a3', 'Podciąganie', '3 × 5', 'pełne albo negatywy 4 s', 8,
     'Łopatki najpierw w dół, potem ciągniesz łokcie do żeber, broda nad drążek. Jeśli 5 pełnych nie wchodzi czysto, zacznij serię od tylu pełnych, ile masz, a resztę dobij negatywami: wejście z ławki, 4 s w dół do pełnego zwisu.', superset='A2'),
  it(4, 'c3a4', 'Goblet squat z piętami na podwyższeniu (do skrzyni)', '3 × 12', 'podwójna progresja', 7,
     'SUPERSERIA z Nordikiem — 75 s po parze. Pięty na talerzach 5 kg albo klinie, stopy wąsko, hantel pionowo przy mostku. 3 s w dół do skrzyni na wysokości kolan — dotknij jej bez siadania całym ciężarem — i w górę. Tułów pionowo, kolana wychodzą do przodu nad palce. Z całego planu to ćwiczenie najmocniej skupia pracę na przodzie uda.', superset='B1', kgStart=16),
  it(5, 'c3a5', 'Nordic z asekuracją rękami', '3 × 5', 'masa ciała', 8,
     'Kolana na kocu, pięty zaczepione pod sztangą w stojaku (obciążoną) albo pod innym stałym punktem. Ciało w jednej linii od kolan do głowy, biodra wyprostowane. Opuszczaj się tak wolno, jak dasz radę (cel 3–5 s), na końcu złap się dłońmi jak przy pompce i odepchnij do góry. Dwa pierwsze tygodnie tylko połowa zakresu — to ćwiczenie daje mocne zakwasy. Tył uda trzyma kolano od tyłu, przeciwwaga dla całej pracy czworogłowego.', superset='B2'),
  it(6, 'c3a6', 'Unoszenie palców przy ścianie (piszczelowy przedni)', '3 × 20', 'masa ciała', 7,
     'SUPERSERIA ze wspięciami — 45 s po parze. Plecy i pośladki o ścianę, pięty 30–40 cm od niej, nogi proste. Unieś palce stóp jak najwyżej, 1 s na górze, opuść powoli bez klapania. Trudniej: stopy dalej od ściany albo na jednej nodze. Piszczelowy przedni hamuje kolano nad stopą przy schodzeniu ze schodów i w dole przysiadu.', superset='C1'),
  it(7, 'c3a7', 'Wspięcia na palce siedząc z hantlami', '3 × 15', 'podwójna progresja', 7,
     'Siad na ławce, kolana pod kątem prostym, hantle na udach tuż nad kolanami, przednia część stóp na talerzu. Pięta nisko, 1 s na górze, 3 s w dół. Suwak to łączny ciężar hantli. Zgięte kolano wyłącza brzuchaty łydki i zostawia pracę płaszczkowatemu — głównemu amortyzatorowi kolana przy schodzeniu.', superset='C2', kgStart=20),
]

B = [
  it(1, 'c3b1', 'Wejście na skrzynię z wolnym zejściem', '3 × 8 / nogę', 'podwójna progresja', 7,
     'SUPERSERIA z wiosłowaniem — 75 s po parze (wiosłowanie daje nogom chwilę). Skrzynia tak wysoka, żeby udo nogi na skrzyni było najwyżej poziomo. Hantle w dłoniach, cała stopa na skrzyni. Wchodzisz siłą nogi na górze — dolna tylko się odrywa, bez odbijania. Schodzisz tą samą nogą przez 3 s, kolano w linii drugiego palca, miednica pozioma. Najpierw cała seria na jedną nogę, potem druga.', superset='A1', noCut=True, kgStart=10),
  it(2, 'c3b2', 'Wiosłowanie hantlem w podporze', '3 × 8 / stronę', 'podwójna progresja', 7,
     'Kolano i dłoń na ławce, plecy płasko. Ciągnij hantel do biodra, nie do barku — łokieć blisko tułowia, łopatka zjeżdża w dół i do kręgosłupa. 1 s pauzy na górze, bez skrętu tułowia.', superset='A2', kgStart=20),
  it(3, 'c3b3', 'Hip thrust jednonóż z hantlem', '3 × 10 / nogę', 'podwójna progresja', 7,
     'SUPERSERIA z face pullem — 60 s po parze. Łopatki na ławce, hantel na biodrze nogi pracującej, druga noga w górze. Wypchnij biodra, aż tułów i udo będą w linii, 2 s pauzy z mocno napiętym pośladkiem. Żebra w dół — ruch z bioder, nie z wyginania lędźwi. Miednica nie opada na stronę wolnej nogi.', superset='B1', kgStart=10),
  it(4, 'c3b4', 'Face pull z gumą', '3 × 15', 'coraz grubsza guma', 6,
     'Guma na wysokości twarzy. Ciągnij do czoła, rozkładając dłonie na boki, łokcie wysoko, kciuki do tyłu. 1 s pauzy z łopatkami ściągniętymi. Prostuje barki po dniu przy biurku.', superset='B2'),
  it(5, 'c3b5', 'Martwy ciąg rumuński jednonóż z hantlem', '3 × 8 / nogę', 'podwójna progresja', 7,
     'SUPERSERIA z deską boczną — 60 s po parze. Hantel w ręce po stronie nogi wolnej. Biodro cofa się, tułów i wolna noga tworzą jedną linię jak dźwignia, kolano nogi podporowej lekko ugięte. Miednica równo — biodro wolnej nogi nie otwiera się w bok. Kontrola biodra, kolana i kostki naraz; ciężar tak, żeby w sobotę ciąg był świeży.', superset='C1', kgStart=12),
  it(6, 'c3b6', 'Deska boczna z odwodzeniem nogi', '3 × 8 / stronę', 'masa ciała', '—',
     'Deska boczna na przedramieniu: łatwiej z dolnym kolanem na macie, trudniej na prostych nogach. Biodra w górze, w jednej linii z barkami. Górną, prostą nogę unosisz na 30–40 cm, 1 s pauzy, 2 s w dół. Pracuje pośladek średni obu nóg naraz — górnej w ruchu, dolnej w podporze — ten, który nie pozwala kolanu zapadać się do środka.', superset='C2'),
  it(7, 'c3b7', 'Przysiad hiszpański z hantlem (izometria)', '3 × 45 s', 'podwójna progresja', 6,
     'SUPERSERIA z plankiem kopenhaskim — 60 s po parze. Guma za kolanami przyczepiona do stojaka albo innego stałego punktu, hantel trzymany przy klatce. Zejdź do ok. 60–70° zgięcia w kolanie, piszczele pionowo, tułów pionowo, i trzymaj, mocno napinając uda. Trudniej = cięższy hantel, nie głębiej. Kolana bardzo dobrze znoszą izometrię — mocny bodziec dla czworogłowego i więzadła rzepki bez ruchu w stawie.', superset='D1', noCut=True, kgStart=8),
  it(8, 'c3b8', 'Plank kopenhaski', '3 × 25 s / stronę', 'kolano na ławce', '—',
     'Bokiem na przedramieniu, kolano górnej nogi na ławce, dolna noga swobodnie. Unieś biodra do linii prostej i trzymaj. Progresja: najpierw czas (do 3 × 30 s), potem co 2–3 s unosisz dolną nogę do ławki. Stopa zamiast kolana na ławce dopiero wtedy, gdy wewnętrzna strona kolana nic nie zgłasza. Przywodziciele trzymają kolano w osi razem z pośladkiem średnim.', superset='D2'),
  it(9, 'c3b9', 'Marsz biodrowy z mini gumą (leżąc)', '2 × 8 / stronę', 'coraz grubsza guma', 7,
     'Przerwa 45 s. Na plecach, mini guma na śródstopiach, biodra i kolana zgięte 90°, lędźwie przyklejone do podłogi. Jedna noga wysuwa się w dół do prawie prostej, druga zostaje w górze i nie daje się ściągnąć gumie — 2 s pauzy, zmiana. Zginacze biodra po dniu siedzenia są skrócone, ale słabe: to je wzmacnia powyżej 90°.'),
]

C = [
  it(1, 'c3c1', 'Front squat', REF('lower.scheme'), REF('front.kg'), REF('lower.rpe'),
     'Bój główny. Przerwy 3 min. Sztanga na przednich naramiennych, łokcie wysoko, tułów pionowo. Kolana mogą wyjść przed palce — ważne, żeby szły w linii drugiego palca stopy i nie zapadały się do środka. Głębokość: tak nisko, jak plecy zostają neutralne, a pięty na podłodze. 2 s w dół, w górę zdecydowanie.', noCut=True),
  it(2, 'c3c2', 'Martwy ciąg', REF('lower.scheme'), REF('dl.kg'), REF('lower.rpe'),
     'Bój główny. Przerwy 3 min. Z podłogi; po przysiadzie wystarczą dwie serie dojściowe (50% × 5, 75% × 3). Sztanga nad środkiem stopy, łopatki nad sztangą, plecy neutralne. Najpierw napięcie (zabierz luz ze sztangi), potem pchasz podłogę nogami. Każde powtórzenie od zera — bez odbijania.', noCut=True),
  it(3, 'c3c3', 'Wspięcia na palce stojąc na stopniu z hantlem', '3 × 15', 'podwójna progresja', 7,
     'SUPERSERIA ze spacerem farmera — 60 s po parze. Obunóż, przednia część stóp na stopniu albo talerzu, hantel w jednej ręce, druga dłoń o ścianę. Kolana proste, ale nie zablokowane. Pięta nisko, 1 s na górze, 3 s w dół. Gdy 15 idzie lekko — na jednej nodze, 3 × 10. Przy prostym kolanie pracuje brzuchaty łydki — druga połowa łydki obok płaszczkowatego z wtorku.', superset='A1', kgStart=16),
  it(4, 'c3c4', 'Spacer farmera jednorącz', '3 × 30 m / stronę', 'podwójna progresja', 7,
     'Ciężki hantel w jednej ręce, druga ręka swobodnie. Barki na jednym poziomie, tułów pionowo — nie przechylaj się w żadną stronę. Krótkie, spokojne kroki, kolana w linii stóp. Pośladek średni po przeciwnej stronie trzyma miednicę poziomo przy każdym kroku.', superset='A2', kgStart=24),
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
  'skip': ['Rozciągania statycznego przed sztangą — zostaje na środę, piątek i niedzielę.',
           'Długiego rolowania — 1–2 minuty na miejsce, które naprawdę tego potrzebuje, wystarczą.',
           'Krążeń bioder, skrętów kolana i pracy w końcowych zakresach.',
           'Ćwiczeń do upadku mięśniowego — rozgrzewka ma przygotować, nie zmęczyć.'],
  'notes': ['Przerwy między seriami dojściowymi: 60 s. Mają rozgrzewać, nie męczyć.',
            'W sobotę przed ciągiem wystarczą DWIE serie (50% × 5, 75% × 3) — po przysiadzie jesteś rozgrzany.'],
  'days': {
    'A': {'label': 'DZIEŃ A — wyciskanie i kolana  ·  ~7 min', 'steps': [
      {'what': 'Marsz z wysokim kolanem i chód tyłem', 'dose': '3 min', 'note': 'Na zmianę 30 s marszu w miejscu z wysokim unoszeniem kolan i 30 s chodu tyłem (stopa ląduje od palców). Masz rower albo bieżnię — 4 min na nich.'},
      {'what': 'Band pull-apart', 'dose': '2 × 15', 'note': 'Ręce na wysokości barków, łopatki ściągnięte.'},
      {'what': 'Rotacja zewnętrzna barku z gumą', 'dose': '1 × 15 / rękę', 'note': 'Łokieć przy tułowiu.'},
      {'what': 'Serie dojściowe do wyciskania', 'dose': 'wg tabeli', 'note': ''},
      {'what': 'Przed bułgarskim: goblet squat do skrzyni', 'dose': '1 × 8', 'note': 'Po wyciskaniu, zanim zaczniesz superserię — kolana mają być ciepłe. 3 s w dół.'}]},
    'B': {'label': 'DZIEŃ B — jednonóż, bez sztangi  ·  ~6 min', 'steps': [
      {'what': 'Marsz z wysokim kolanem i chód tyłem', 'dose': '3 min', 'note': 'Jak we wtorek. Kolana mają być ciepłe przed skrzynią.'},
      {'what': 'Knee-to-wall', 'dose': '1 × 10 / nogę', 'note': 'Pięta na podłodze, kolano do ściany w linii drugiego palca, 2 s przy ścianie.'},
      {'what': 'Chód boczny z mini gumą', 'dose': '1 × 10 / stronę', 'note': 'Półprzysiad, kolana nie zapadają się do środka. Budzi pośladek średni.'},
      {'what': 'Mostek biodrowy obunóż', 'dose': '1 × 15', 'note': 'Budzi pośladki przed pracą jednonóż.'},
      {'what': 'Dead bug', 'dose': '1 × 6 / stronę', 'note': 'Lędźwie przyklejone do podłogi, długi wydech przy opuszczaniu ręki i nogi.'}]},
    'C': {'label': 'DZIEŃ C — dół ze sztangą  ·  ~7 min', 'steps': [
      {'what': 'Marsz z wysokim kolanem i chód tyłem', 'dose': '3 min', 'note': 'Najcięższy dzień tygodnia — nie skracaj tego.'},
      {'what': 'Oddech 90/90 ze stopami na ścianie', 'dose': '1 × 5 oddechów', 'note': 'Wydech ustami, żebra w dół, lędźwie miękko do podłogi. Ustawia miednicę przed sztangą.'},
      {'what': 'Knee-to-wall', 'dose': '1 × 10 / nogę', 'note': 'Pięta na podłodze, kolano do ściany w linii drugiego palca.'},
      {'what': 'Goblet squat do skrzyni', 'dose': '1 × 8', 'note': 'Lekki hantel, 3 s w dół. Ustawia tor kolan przed sztangą.'},
      {'what': 'Serie dojściowe do front squata', 'dose': 'wg tabeli', 'note': ''},
      {'what': 'Serie dojściowe do ciągu', 'dose': '50% × 5, 75% × 3', 'note': 'Krótsza wersja — po przysiadzie jesteś rozgrzany.'}]},
  },
}

rules = [
  {'heading': 'Układ tygodnia', 'lines': [
    'Wtorek — Dzień A: WYCISKANIE i kolana. Wyciskanie, przysiad bułgarski, goblet z piętami w górze, Nordic, golenie.',
    'Środa — rozciąganie i test zakresów w domu, ~16 min.',
    'Czwartek — Dzień B: JEDNONÓŻ, bez sztangi. Skrzynia, hip thrust jednonóż, ciąg jednonóż, deska boczna, przysiad hiszpański, plank kopenhaski.',
    'Piątek — rozciąganie i test zakresów, to samo co w środę.',
    'Sobota — Dzień C: DÓŁ ze sztangą. Front squat, martwy ciąg, łydki, spacer farmera.',
    'Niedziela — joga, domyślnie krótka (~20 min), pełna, gdy jest czas.',
    'Boje stoją tam, gdzie w cyklu 2: wyciskanie we wtorek, przysiad i ciąg w sobotę. Czwartek jest bez sztangi — cały pod kolana i biodra.',
    'Sprzęt: sztanga ze stojakiem, ławka, hantle, drążek, gumy (długa i mini), skrzynia albo stopień. Żadnych maszyn.']},
  {'heading': 'Czas trwania', 'lines': [
    'Każdy dzień: ~50–55 min pracy plus 6–7 min rozgrzewki — mieści się w godzinie.',
    'PRZERWY: przysiad i ciąg 3 min, wyciskanie 2 min (od bloku 3: 2,5 min). Superserie bez przerwy w środku; po parze 90 s przy bułgarskim, 75 s przy skrzyni i goblecie, 60 s przy lżejszych, 45 s przy goleniach.',
    'Timer przerwy rusza sam po odhaczeniu serii. Trzymaj się go — od tego zależy, czy ostatnia superseria zmieści się w godzinie.',
    'Jeśli brakuje czasu, tniesz w kolejności: ostatnie ćwiczenie dnia → trzecia seria ostatniej superserii → trzecia seria środkowej superserii.',
    'Nie tniesz: boju głównego, przysiadu bułgarskiego, wejścia na skrzynię ani przysiadu hiszpańskiego.']},
  {'heading': 'Cel cyklu', 'lines': [
    'Kolana: silny czworogłowy w całym zakresie — front squat i bułgarski w zgięciu, izometria w środku, goblet z piętami w górze na sam przód uda — i tył uda jako przeciwwaga (Nordic, ciąg jednonóż).',
    'Biodra: pośladek wielki (hip thrust jednonóż, ciąg), pośladek średni (deska boczna z odwodzeniem, spacer farmera), przywodziciele (kopenhaski) i zginacze biodra (marsz z gumą).',
    'Kontrola jednonóż: bułgarski, skrzynia, ciąg i hip thrust jednonóż — kolano w osi pod ciężarem, a nie tylko bez niego.',
    'Golenie: piszczelowy przy ścianie i obie części łydki (siedząc — płaszczkowaty, stojąc — brzuchaty), bo to one amortyzują kolano przy każdym kroku w dół.',
    'Zakres: rozciąganie w środę i piątek plus joga w niedzielę. Trzy razy w tygodniu, bo przy rozciąganiu liczy się częstotliwość, nie długość jednej sesji.',
    'Końcowe zakresy wracają w środę i piątek: głębokie zgięcie kolana i rotacja biodra, poziom po poziomie, z oceną 0–1–2. Siłownia i joga zostają bez nich, dopóki test nie pokaże, jak kolana reagują.',
    'Góra na utrzymanie: wyciskanie raz w tygodniu, ciągnięcie trzy razy (podciąganie, wiosłowanie, face pull).']},
  {'heading': 'Ciężary', 'lines': [
    'Maksy przechodzą z cyklu 2 tak, jak zostawiła je samoregulacja — nic nie wpisujesz ręcznie. Tydzień 1 to 67,5% tych maksów: lżej niż końcówka cyklu 2, bo nogi dostają dużo nowej pracy.',
    'Ćwiczenia, które zostały z cyklu 2 pod tą samą nazwą (bułgarski, wiosłowanie, ciąg jednonóż, hip thrust jednonóż, przysiad hiszpański, spacer farmera, face pull), startują z ostatnim ciężarem zapisanym w dzienniku cyklu 2.',
    'Sufit RPE jest nadrzędny wobec procentów: jeśli ciężar wychodzi ciężej niż sufit, zdejmujesz z gryfu.',
    'Korekta z dwóch tygodni i podwyżka dołu po blokach działają jak w cyklu 2. Każdą da się cofnąć.']},
  {'heading': 'Progresja ćwiczeń dodatkowych', 'lines': [
    'Przy hantlach ustaw raz suwakiem ciężar, którego używasz — aplikacja go zapamięta i podpowie podwyżkę.',
    'Gdy dwa tygodnie z rzędu robisz komplet powtórzeń, dokładasz najmniejszy skok.',
    'Tempo jest częścią ćwiczenia: 3 s w dół przy bułgarskim, skrzyni, goblecie i wspięciach. Szybsze powtórzenie z większym ciężarem to nie progres.',
    'Nordic: dwa pierwsze tygodnie połowa zakresu, potem coraz niżej bez łapania się rękami, dopiero na końcu wolniej.',
    'Izometria: trudniej = cięższy hantel, nie głębiej.',
    'Plank kopenhaski: najpierw czas, potem unoszenie dolnej nogi, dopiero na końcu stopa zamiast kolana na ławce.',
    'Piszczelowy przy ścianie: trudniej = stopy dalej od ściany, potem jedna noga.',
    'Przy gumach: najpierw pełny zakres i pauza, dopiero potem grubsza guma.']},
  {'heading': 'Zasada złego dnia', 'lines': [
    'Rozgrzewka idzie wyraźnie ciężej niż zwykle: zdejmujesz 10% i robisz zaplanowaną objętość lżej.',
    'Plecy sztywne rano w sobotę: ciąg lżej o 10% albo zamień sobotę z czwartkiem. Kolejność da się przestawić w obrębie tygodnia.',
    'Ćwiczenie, w którym coś nie gra w stawie (nie zmęczenie mięśnia) — najpierw mniejszy zakres, potem mniejszy ciężar, a jeśli dalej nie gra, pomiń je w tej sesji i zanotuj.']},
  {'heading': 'Tydzień 7 — lżejszy (nie jest opcjonalny)', 'lines': [
    'Boje: 2 × 6 przy 55% (dół) i 62,5% (góra), RPE 5.',
    'Ćwiczenia dodatkowe: 2 serie zamiast 3, ten sam ciężar. Rozciąganie i joga bez zmian.']},
  {'heading': 'Tydzień 12 — sprawdzian', 'lines': [
    'Bez testu maksa. Boje lżej (3 × 5).',
    'Przysiad: po seriach roboczych weź ciężar front squata z tygodnia 3 i zrób jedną serię na maks. powtórzeń — stop przy 15 albo RPE 8. Porównaj z tygodniem 3.',
    'Kolana i biodra — porównaj z tygodniem 2 w Raporcie cyklu: ciężar w bułgarskim, na skrzyni, w goblecie, przysiadzie hiszpańskim i hip thruście jednonóż przy tym samym tempie, zakres w Nordicu oraz sekundy w planku kopenhaskim.',
    'To jest miara celu tego cyklu — nie ciężar na sztandze.']},
  {'heading': 'Kiedy powtórzyć tydzień', 'lines': [
    'Tydzień podbijasz, gdy każda sesja zmieściła się w suficie RPE.',
    'Jeśli nie — powtarzasz ten sam tydzień z tym samym ciężarem. To nie jest opóźnienie planu.']},
]

# Środa i piątek (dni bez siłowni): rozciąganie i test zakresów w domu. Te same pozycje oba dni.
def r(id_, name, dose, sec, steps, blad, note, film, **extra):
    return {'id': id_, 'name': name, 'dose': dose, 'sec': sec, 'steps': steps, 'blad': blad, 'note': note, 'film': film, **extra}

# Test zakresów: końcowe zakresy wracają poziom po poziomie, z oceną po każdej
# pozycji (0 spokojnie, 1 ciągnie w mięśniu, 2 coś w stawie). Ostatnie poziomy
# to już aktywna kontrola w zakresie, nie samo trzymanie. Siłownia i joga bez zmian.
def z(id_, name, dose, sec, poziomy, steps, blad, note, film):
    return r(id_, name, dose, sec, steps, blad, note, film, poziomy=poziomy)

ZAKRESY = {
  'title': 'Test zakresów', 'minutes': 5,
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
    'Najwyżej jeden poziom w górę na tydzień w każdej pozycji. Aplikacja podpowiada poziom z ostatnich zapisów: po dwóch spokojnych razach — o jeden wyżej, po ocenie 2 — o jeden niżej.',
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
  'key': 'R', 'title': 'Rozciąganie', 'minutes': 16,
  'dni': [{'k': 'sr', 'dzien': 3, 'nazwa': 'Środa', 'skrot': 'Śr'},
          {'k': 'pt', 'dzien': 5, 'nazwa': 'Piątek', 'skrot': 'Pt'}],
  'intro': 'Kwadrans w domu, najlepiej wieczorem po pracy. Najpierw pięć pozycji rozciągania statycznego: wchodzisz łagodnie, oddychasz i trzymasz. Przód bioder, tył i wewnętrzna strona uda, pośladek i łydki — to, co siedzenie skraca, a przysiad i ciąg potrzebują długie. Potem test zakresów: głębokie zgięcie kolana i rotacja biodra, poziom po poziomie, z oceną zapisywaną w aplikacji. Na koniec oddech. Gdy klęczysz, kolano leży na kocu. Potrzebne: mata, koc, poduszka, pasek albo ręcznik, ściana, framuga i krzesło.',
  'rules': [
    'Rozciąganie ma ciągnąć w mięśniu, nie w stawie. Gdy czujesz coś w kolanie albo w pachwinie, zmniejsz zakres.',
    'Bez sprężynowania. Wejdź do 6–7 na 10 i trzymaj; z każdym wydechem pozwól sobie zejść odrobinę dalej.',
    'Liczy się częstotliwość: dwa razy w tygodniu po kwadransie plus niedzielna joga dają więcej niż jedna długa sesja.',
    'Nie przed sztangą. Rozciąganie statyczne zostaje na dni bez treningu siłowego.',
    'Zginacz biodra możesz dorzucić w każdy dzień pracy — 2 minuty po wstaniu od biurka.',
  ],
  'items': [
    r('r1', 'Zginacz biodra w półklęku', '2 × 45 s / stronę', 45,
      ['Półklęk, tylne kolano na złożonym kocu, przednia stopa płasko, oba kolana zgięte pod kątem prostym.',
       'Napnij pośladek tylnej nogi i podwiń miednicę, jakbyś chował kość ogonową pod siebie.',
       'Dopiero teraz przesuń biodra 2–3 cm do przodu — rozciąganie pojawia się z przodu biodra tylnej nogi.',
       'Tułów pionowo, żebra w dół. Trzymaj 45 s, zmień stronę, potem drugi raz na obie.'],
      'Pchanie bioder daleko w przód z wygiętymi lędźwiami. Wtedy ciągnie w krzyżu, a przód biodra zostaje taki, jaki był.',
      'Przód biodra skrócony po dniu siedzenia nie pozwala domknąć bioder w górze ciągu i hip thrustu — dłuższy daje pełny wyprost bez wyginania lędźwi.',
      'half kneeling hip flexor stretch posterior pelvic tilt'),
    r('r2', 'Tył uda z paskiem leżąc', '60 s / nogę', 60,
      ['Połóż się na plecach, jedna noga prosta na podłodze.',
       'Pasek albo ręcznik na śródstopie drugiej nogi, unieś ją w górę.',
       'Przyciągaj nogę paskiem, aż poczujesz rozciąganie w środku tyłu uda. Kolano lekko ugięte, stopa luźno.',
       'Lędźwie i noga na podłodze leżą płasko. Trzymaj 60 s, zmień nogę.'],
      'Ciągnięcie z prostym, zablokowanym kolanem — wtedy ciągnie pod kolanem, a nie w udzie. Ugnij kolano o kilka stopni.',
      'Dłuższy tył uda to głębszy zawias biodrowy w ciągu jednonóż i rumuńskim bez zaokrąglania pleców.',
      'supine hamstring stretch with strap'),
    r('r3', 'Przywodziciele: nogi na ścianie w rozkroku', '90 s', 90,
      ['Połóż się na plecach pośladkami jak najbliżej ściany, proste nogi oparte o ścianę.',
       'Pozwól nogom powoli rozjechać się na boki w kształt litery V.',
       'Nie dociskaj — ciężar nóg robi wszystko. Kolana proste, ale miękkie.',
       'Zostań 90 s. Wyjście: złącz nogi rękami, zegnij kolana, przetocz się na bok.'],
      'Dociskanie ud dłońmi. To rozciąganie bierne — grawitacja wystarczy.',
      'Przywodziciele puszczają bez żadnego obciążenia kolan. Dłuższe dają swobodniejszy przysiad z kolanami w linii stóp.',
      'legs up the wall straddle adductor stretch'),
    r('r4', 'Pośladek: kolano do przeciwnego barku', '45 s / stronę', 45,
      ['Leżysz na plecach, obie nogi proste.',
       'Zegnij prawą nogę i obejmij kolano obiema dłońmi.',
       'Prowadź kolano w stronę lewego barku, aż poczujesz rozciąganie w prawym pośladku. Stopa luźno.',
       'Lewa noga i miednica leżą na podłodze. Trzymaj 45 s, zmień stronę.'],
      'Ciągnięcie za stopę zamiast za kolano. Trzymasz kolano — wtedy zostaje w jednej linii z udem.',
      'Pośladek i tył biodra bez rotacji w kolanie — bezpieczny zamiennik gołębia, którego w tym planie nie ma.',
      'supine knee to opposite shoulder glute stretch'),
    r('r5', 'Łydka przy ścianie: prosta i ugięta noga', '30 s + 30 s / nogę', 30,
      ['Dłonie na ścianie, jedna noga z tyłu, pięta na podłodze, palce prosto do ściany.',
       'Tylne kolano proste — przenieś biodra do przodu, aż poczujesz łydkę. Trzymaj 30 s.',
       'Teraz ugnij tylne kolano, pięta dalej na podłodze — rozciąganie schodzi niżej, nad piętę. Trzymaj 30 s.',
       'Zmień nogę.'],
      'Pięta odrywa się od podłogi albo palce uciekają na zewnątrz. Stopa prosto, pięta przyklejona.',
      'Zgięcie grzbietowe stopy decyduje, jak nisko zejdziesz w front squacie z piętami na podłodze i kolanem w osi.',
      'wall calf stretch straight and bent knee soleus'),
    r('r6', 'Oddech z łydkami na krześle', '1 min', 60,
      ['Połóż się na plecach, łydki na siedzisku krzesła albo kanapy — biodra i kolana zgięte pod kątem prostym.',
       'Dłonie na dolnych żebrach.',
       'Wdech nosem w boki żeber, długi wydech ustami — żebra schodzą w dół, lędźwie miękko opadają do podłogi.',
       'Zostań minutę, 5–6 spokojnych oddechów.'],
      'Oddychanie górą klatki z unoszeniem barków. Ruch ma być w dolnych żebrach i brzuchu.',
      'Po rozciąganiu przód bioder i lędźwie puszczają, a miednica wraca do neutralnego ustawienia — tego samego, od którego zaczynasz przysiad.',
      '90 90 breathing feet on chair', naKoniec=True),
  ],
  'zakresy': ZAKRESY,
}

# Joga bez zmian w pozycjach. Ciężki dzień wypada teraz w sobotę, tuż przed nią.
import copy
JOGA_C3 = copy.deepcopy(JOGA)
JOGA_C3['dzien'] = 0
JOGA_C3['rules'] = [l.replace('Po ciężkim piątku', 'Po ciężkiej sobocie') for l in JOGA_C3['rules']]
assert any('Po ciężkiej sobocie' in l for l in JOGA_C3['rules'])

plan = {
  'cykl': 3,
  # Klucz w bazie: kod planu + „-C3b". Pod „-C3" zapisały się testy z przeglądarki,
  # zanim cykl wystartował — ten wiersz nigdy nie jest czytany.
  'kluczCyklu': 'C3b',
  'title': 'Cykl 3 · kolana i biodra',
  'schedule': 'wt A · śr rozciąganie · czw B · pt rozciąganie · sob C · nd joga',
  'bar': stary['bar'], 'plates': stary['plates'],
  # Wartości awaryjne — na urządzeniu z cyklem 2 maksy przechodzą z niego (niżej).
  'e1rm': dict(stary['e1rm']),
  'e1rmZPoprzedniego': ['bench', 'front', 'dl'],
  'weeks': weeks,
  'days': {
    # `dzien` = getDay (0 niedziela): aplikacja bierze z niego Dziś, pasek tygodnia i pominięcia.
    'A': {'key': 'A', 'title': 'GÓRA · wyciskanie i kolana', 'day': 'Wtorek', 'dzien': 2, 'minutes': 52, 'items': A},
    'B': {'key': 'B', 'title': 'JEDNONÓŻ · kolana i biodra bez sztangi', 'day': 'Czwartek', 'dzien': 4, 'minutes': 52, 'items': B},
    'C': {'key': 'C', 'title': 'DÓŁ · front squat i martwy ciąg', 'day': 'Sobota', 'dzien': 6, 'minutes': 55, 'items': C},
  },
  'warmup': warmup,
  'rules': rules,
  'mobility': JOGA_C3,
  'rozciaganie': ROZCIAGANIE,
  'deloadTekst': 'Boje 2 × 6 lekko, ćwiczenia dodatkowe po 2 serie, ten sam ciężar. Rozciąganie i joga bez zmian.',
  'tydzien12Tekst': 'Bez testu maksa. Front squat: po seriach roboczych jedna seria na maks. powtórzeń z ciężarem z tygodnia 3 (stop przy 15 albo RPE 8). Kolana i biodra: porównaj z tygodniem 2 ciężary w bułgarskim, na skrzyni, w goblecie i przysiadzie hiszpańskim oraz czas w planku kopenhaskim.',
}
json.dump(plan, open(os.path.join(ROOT, 'plan.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('plan.json: cykl', plan['cykl'], '·', sum(len(d['items']) for d in plan['days'].values()), 'ćwiczeń ·', len(ROZCIAGANIE['items']), 'pozycji rozciągania')
