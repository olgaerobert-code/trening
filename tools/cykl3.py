# Generator planu cyklu 3 (plan.json). Cykl 2 zostaje w plan-cykl2.json, cykl 1 w plan-cykl1.json.
# Uruchom: python3 tools/cykl3.py
# Tresc wylacznie treningowa — repozytorium jest publiczne.
#
# Cel cyklu: kolana i biodra. Każdy dzień zaczyna się jednym bojem ze sztangą
# (pn front squat, śr wyciskanie, pt martwy ciąg), a resztę godziny wypełniają
# superserie pod kolano i biodro. Wtorek i czwartek: 12 minut rozciągania w domu.
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
  it(1, 'c3a1', 'Front squat', REF('lower.scheme'), REF('front.kg'), REF('lower.rpe'),
     'Bój główny. Przerwy 3 min. Sztanga na przednich naramiennych, łokcie wysoko, tułów pionowo. Kolana mogą wyjść przed palce — ważne, żeby szły w linii drugiego palca stopy i nie zapadały się do środka. Głębokość: tak nisko, jak plecy zostają neutralne, a pięty na podłodze. 2 s w dół, w górę zdecydowanie.', noCut=True),
  it(2, 'c3a2', 'Przysiad bułgarski z hantlami', '3 × 8 / nogę', 'podwójna progresja', 7,
     'SUPERSERIA z podciąganiem — 90 s po parze. Tylna stopa na ławce, przednia tak daleko, żeby w dole kolano było nad stopą albo lekko przed nią. 3 s w dół, kolano w linii drugiego palca, miednica pozioma. Tułów lekko pochylony obciąża pośladek, pionowy — udo. Zaczynasz słabszą nogą.', superset='A1', noCut=True, kgStart=12),
  it(3, 'c3a3', 'Podciąganie', '3 × 5', 'pełne albo negatywy 4 s', 8,
     'Łopatki najpierw w dół, potem ciągniesz łokcie do żeber, broda nad drążek. Jeśli 5 pełnych nie wchodzi czysto, zacznij serię od tylu pełnych, ile masz, a resztę dobij negatywami: wejście z ławki, 4 s w dół do pełnego zwisu.', superset='A2'),
  it(4, 'c3a4', 'Prostowanie nóg na maszynie', '3 × 12', 'podwójna progresja', 7,
     'SUPERSERIA z uginaniem — 60 s po parze. Oś maszyny na wysokości kolana, wałek nad kostką. 1 s w górę, 1 s pauzy z mocno napiętym udem przy prostej nodze, 3 s w dół. Jeśli przód kolana daje o sobie znać przy pełnym wyproście, kończ ruch 15–20° wcześniej. Przysiad nie dociąga prostego mięśnia uda — to ćwiczenie tak.', superset='B1', kgStart=25),
  it(5, 'c3a5', 'Uginanie nóg siedząc na maszynie', '3 × 10', 'podwójna progresja', 7,
     'Tułów lekko pochylony do przodu — tył uda pracuje wtedy w długim zakresie i rośnie szybciej niż na maszynie leżącej. 1 s pauzy w zgięciu, 3 s powrót, bez odbijania ciężaru. Tył uda trzyma kolano od tyłu — przeciwwaga dla całej pracy czworogłowego w tym dniu.', superset='B2', kgStart=25),
  it(6, 'c3a6', 'Zgięcie grzbietowe na maszynie (piszczelowy przedni)', '3 × 12', 'podwójna progresja', 7,
     'SUPERSERIA ze wspięciami — 45 s po parze. Pełny zakres: palce wysoko do góry, 1 s pauzy, 3 s w dół. Piszczelowy przedni hamuje kolano nad stopą przy schodzeniu ze schodów i w dole przysiadu.', superset='C1', kgStart=10),
  it(7, 'c3a7', 'Wspięcia na palce siedząc na maszynie', '3 × 15', 'podwójna progresja', 7,
     'Kolano zgięte pod kątem prostym wyłącza brzuchaty łydki i zostawia pracę płaszczkowatemu — głównemu amortyzatorowi kolana przy schodzeniu ze schodów. Pełny zakres: pięta nisko, 1 s na górze, 3 s w dół. Bez maszyny: siad na ławce, hantle na udach tuż nad kolanami, przednia część stóp na talerzu.', superset='C2', kgStart=30),
]

B = [
  it(1, 'c3b1', 'Wyciskanie leżąc', REF('upper.scheme'), REF('bench.kg'), REF('upper.rpe'),
     'Bój główny. Przerwy 2 min (od bloku 3: 150 s). Łopatki ściągnięte i wbite w ławkę, stopy płasko, umiarkowany mostek. Sztanga schodzi na dolną część mostka, łokcie ok. 45° od tułowia. W tym cyklu góra jest na utrzymanie — sufit RPE pilnuje zapasu.', noCut=True),
  it(2, 'c3b2', 'Hip thrust ze sztangą', '3 × 10', 'podwójna progresja', 7,
     'SUPERSERIA z face pullem — 90 s po parze. Łopatki na ławce, sztanga z grubą nakładką na biodrach, stopy tak, żeby w górze piszczele były pionowo. Wypchnij biodra, aż tułów i uda będą w linii, 2 s pauzy z mocno napiętymi pośladkami. Broda przy klatce, żebra w dół — ruch z bioder, nie z wyginania lędźwi. Najmocniejsze ćwiczenie na pośladek wielki, a kolano prawie się nie rusza.', superset='A1', kgStart=60),
  it(3, 'c3b3', 'Face pull z gumą', '3 × 15', 'coraz grubsza guma', 6,
     'Guma na wysokości twarzy. Ciągnij do czoła, rozkładając dłonie na boki, łokcie wysoko, kciuki do tyłu. 1 s pauzy z łopatkami ściągniętymi. Prostuje barki po dniu przy biurku.', superset='A2'),
  it(4, 'c3b4', 'Przysiad hiszpański z hantlem (izometria)', '3 × 45 s', 'podwójna progresja', 6,
     'SUPERSERIA z plankiem kopenhaskim — 60 s po parze. Guma za kolanami przyczepiona do stałego punktu, hantel trzymany przy klatce. Zejdź do ok. 60–70° zgięcia w kolanie, piszczele pionowo, tułów pionowo, i trzymaj, mocno napinając uda. Trudniej = cięższy hantel, nie głębiej. Kolana bardzo dobrze znoszą izometrię — mocny bodziec dla czworogłowego i więzadła rzepki bez ruchu w stawie.', superset='B1', noCut=True, kgStart=8),
  it(5, 'c3b5', 'Plank kopenhaski', '3 × 25 s / stronę', 'kolano na ławce', '—',
     'Bokiem na przedramieniu, kolano górnej nogi na ławce, dolna noga swobodnie. Unieś biodra do linii prostej i trzymaj. Progresja: najpierw czas (do 3 × 30 s), potem co 2–3 s unosisz dolną nogę do ławki. Stopa zamiast kolana na ławce dopiero wtedy, gdy wewnętrzna strona kolana nic nie zgłasza. Przywodziciele trzymają kolano w osi razem z pośladkiem średnim.', superset='B2'),
  it(6, 'c3b6', 'Odwodzenie bioder na maszynie, w pochyleniu', '3 × 15', 'podwójna progresja', 7,
     'SUPERSERIA z marszem biodrowym — 60 s po parze. Usiądź na brzegu siedziska i pochyl tułów do przodu. Rozepchnij kolana w 1 s, 1 s pauzy w szerokiej pozycji, 2–3 s powrót bez trzaskania ciężarem. Pochylenie przesuwa pracę na pośladek średni i górną część wielkiego — te, które nie pozwalają kolanu zapadać się do środka.', superset='C1', kgStart=35),
  it(7, 'c3b7', 'Marsz biodrowy z mini gumą (leżąc)', '3 × 8 / stronę', 'coraz grubsza guma', 7,
     'Na plecach, mini guma na śródstopiach, biodra i kolana zgięte 90°, lędźwie przyklejone do podłogi. Jedna noga wysuwa się w dół do prawie prostej, druga zostaje w górze i nie daje się ściągnąć gumie — 2 s pauzy, zmiana. Zginacze biodra po dniu siedzenia są skrócone, ale słabe: to je wzmacnia powyżej 90°, gdzie nie sięga żadne inne ćwiczenie.', superset='C2'),
]

C = [
  it(1, 'c3c1', 'Martwy ciąg', REF('lower.scheme'), REF('dl.kg'), REF('lower.rpe'),
     'Bój główny. Przerwy 3 min. Z podłogi, jako pierwsze ćwiczenie dnia — pełna drabinka dojściowa. Sztanga nad środkiem stopy, łopatki nad sztangą, plecy neutralne. Najpierw napięcie (zabierz luz ze sztangi), potem pchasz podłogę nogami. Każde powtórzenie od zera — bez odbijania.', noCut=True),
  it(2, 'c3c2', 'Wejście na skrzynię z wolnym zejściem', '3 × 8 / nogę', 'podwójna progresja', 7,
     'SUPERSERIA z wiosłowaniem — 75 s po parze (wiosłowanie daje nogom chwilę). Skrzynia tak wysoka, żeby udo nogi na skrzyni było najwyżej poziomo. Hantle w dłoniach, cała stopa na skrzyni. Wchodzisz siłą nogi na górze — dolna tylko się odrywa, bez odbijania. Schodzisz tą samą nogą przez 3 s, kolano w linii drugiego palca, miednica pozioma. Najpierw cała seria na jedną nogę, potem druga.', superset='A1', noCut=True, kgStart=10),
  it(3, 'c3c3', 'Wiosłowanie hantlem w podporze', '3 × 8 / stronę', 'podwójna progresja', 7,
     'Kolano i dłoń na ławce, plecy płasko. Ciągnij hantel do biodra, nie do barku — łokieć blisko tułowia, łopatka zjeżdża w dół i do kręgosłupa. 1 s pauzy na górze, bez skrętu tułowia.', superset='A2', kgStart=20),
  it(4, 'c3c4', 'Martwy ciąg rumuński jednonóż z hantlem', '3 × 8 / nogę', 'podwójna progresja', 7,
     'SUPERSERIA z deską boczną — 60 s po parze. Hantel w ręce po stronie nogi wolnej. Biodro cofa się, tułów i wolna noga tworzą jedną linię jak dźwignia, kolano nogi podporowej lekko ugięte. Miednica równo — biodro wolnej nogi nie otwiera się w bok. Po ciągu ciężar umiarkowany: tu chodzi o kontrolę biodra, kolana i kostki naraz.', superset='B1', kgStart=12),
  it(5, 'c3c5', 'Deska boczna z odwodzeniem nogi', '3 × 8 / stronę', 'masa ciała', '—',
     'Deska boczna na przedramieniu: łatwiej z dolnym kolanem na macie, trudniej na prostych nogach. Biodra w górze, w jednej linii z barkami. Górną, prostą nogę unosisz na 30–40 cm, 1 s pauzy, 2 s w dół. Pracuje pośladek średni obu nóg naraz — górnej w ruchu, dolnej w podporze — i boczna taśma tułowia.', superset='B2'),
  it(6, 'c3c6', 'Wspięcia na palce stojąc na maszynie', '3 × 12', 'podwójna progresja', 7,
     'SUPERSERIA ze spacerem farmera — 60 s po parze. Na maszynie, w suwnicy Smitha albo na stopniu z hantlem w dłoni. Kolana proste, ale nie zablokowane. Pięta nisko w dół, 1 s na górze, 3 s w dół. Przy prostym kolanie pracuje brzuchaty łydki — druga połowa łydki obok płaszczkowatego z poniedziałku.', superset='C1', kgStart=40),
  it(7, 'c3c7', 'Spacer farmera jednorącz', '3 × 30 m / stronę', 'podwójna progresja', 7,
     'Ciężki hantel w jednej ręce, druga ręka swobodnie. Barki na jednym poziomie, tułów pionowo — nie przechylaj się w żadną stronę. Krótkie, spokojne kroki, kolana w linii stóp. Pośladek średni po przeciwnej stronie trzyma miednicę poziomo przy każdym kroku.', superset='C2', kgStart=24),
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
           'lifts': [{'lift': 'front', 'name': 'Front squat'}, {'lift': 'bench', 'name': 'Wyciskanie leżąc'}, {'lift': 'dl', 'name': 'Martwy ciąg'}]},
  'skip': ['Rozciągania statycznego przed sztangą — zostaje na wtorek, czwartek i niedzielę.',
           'Długiego rolowania — 1–2 minuty na miejsce, które naprawdę tego potrzebuje, wystarczą.',
           'Krążeń bioder, skrętów kolana i pracy w końcowych zakresach.',
           'Ćwiczeń do upadku mięśniowego — rozgrzewka ma przygotować, nie zmęczyć.'],
  'notes': ['Przerwy między seriami dojściowymi: 60 s. Mają rozgrzewać, nie męczyć.',
            'Każdy dzień ma jeden bój ze sztangą i zawsze stoi on na początku — pełna drabinka dojściowa za każdym razem.'],
  'days': {
    'A': {'label': 'DZIEŃ A — kolana  ·  ~7 min', 'steps': [
      {'what': 'Chód tyłem na bieżni pod górę', 'dose': '3 min', 'note': 'Nachylenie 8–10%, 2–3 km/h, ręce na poręczach. Stopa ląduje od palców, kolano prostuje się pod tobą — czworogłowy rozgrzewa się bez uderzeń w kolano. Bez bieżni: rower.'},
      {'what': 'Knee-to-wall', 'dose': '1 × 10 / nogę', 'note': 'Pięta na podłodze, kolano do ściany w linii drugiego palca, 2 s przy ścianie.'},
      {'what': 'Dead bug', 'dose': '1 × 6 / stronę', 'note': 'Lędźwie przyklejone do podłogi, długi wydech przy opuszczaniu ręki i nogi. Ustawia napięcie brzucha, które trzyma tułów pod sztangą.'},
      {'what': 'Goblet squat do skrzyni', 'dose': '1 × 8', 'note': 'Lekki hantel, 3 s w dół, siad na skrzyni bez opadania. Ustawia tor kolan przed sztangą.'},
      {'what': 'Serie dojściowe do front squata', 'dose': 'wg tabeli', 'note': ''}]},
    'B': {'label': 'DZIEŃ B — biodra  ·  ~6 min', 'steps': [
      {'what': 'Rower spokojnie', 'dose': '3 min', 'note': 'Bez zadyszki.'},
      {'what': 'Chód boczny z mini gumą', 'dose': '1 × 10 / stronę', 'note': 'Półprzysiad, kolana nie zapadają się do środka. Budzi pośladek średni.'},
      {'what': 'Mostek biodrowy obunóż', 'dose': '1 × 15', 'note': 'Budzi pośladki przed hip thrustem.'},
      {'what': 'Band pull-apart', 'dose': '2 × 15', 'note': 'Ręce na wysokości barków, łopatki ściągnięte.'},
      {'what': 'Rotacja zewnętrzna barku z gumą', 'dose': '1 × 15 / rękę', 'note': 'Łokieć przy tułowiu.'},
      {'what': 'Serie dojściowe do wyciskania', 'dose': 'wg tabeli', 'note': ''}]},
    'C': {'label': 'DZIEŃ C — zawias  ·  ~7 min', 'steps': [
      {'what': 'Rower albo chód tyłem na bieżni', 'dose': '4 min', 'note': 'Najcięższy bój tygodnia — nie skracaj tego.'},
      {'what': 'Oddech 90/90 ze stopami na ścianie', 'dose': '1 × 5 oddechów', 'note': 'Wydech ustami, żebra w dół, lędźwie miękko do podłogi. Ustawia miednicę przed ciągiem.'},
      {'what': 'Zawias biodrowy z kijem', 'dose': '1 × 8', 'note': 'Kij wzdłuż pleców dotyka tyłu głowy, łopatek i kości krzyżowej. Cofasz biodra, kij nie odkleja się od żadnego punktu.'},
      {'what': 'Serie dojściowe do ciągu', 'dose': 'wg tabeli', 'note': 'Ciąg jest pierwszy — pełna drabinka, nie skrócona.'}]},
  },
}

rules = [
  {'heading': 'Układ tygodnia', 'lines': [
    'Poniedziałek — Dzień A: KOLANA. Front squat, przysiad bułgarski, przód i tył uda na maszynach, golenie.',
    'Wtorek — rozciąganie w domu, ~12 min.',
    'Środa — Dzień B: BIODRA. Wyciskanie, hip thrust, przysiad hiszpański, przywodziciele, pośladek średni, zginacze biodra.',
    'Czwartek — rozciąganie, to samo co we wtorek.',
    'Piątek — Dzień C: ZAWIAS. Martwy ciąg, wejście na skrzynię, ciąg jednonóż, łydki, spacer farmera.',
    'Niedziela — joga, domyślnie krótka (~20 min), pełna, gdy jest czas.',
    'Przysiad i ciąg nie stoją już w jednej sesji: każdy bój ma swój dzień i świeże nogi, a po nim zostaje ~35 min na pracę pod kolano i biodro.']},
  {'heading': 'Czas trwania', 'lines': [
    'Dni A, B i C: ~50–55 min pracy plus 6–7 min rozgrzewki — mieści się w godzinie.',
    'PRZERWY: przysiad i ciąg 3 min, wyciskanie 2 min (od bloku 3: 2,5 min). Superserie bez przerwy w środku; po parze 75–90 s przy jednonóż, 60 s przy lżejszych, 45 s przy goleniach.',
    'Timer przerwy rusza sam po odhaczeniu serii. Trzymaj się go — od tego zależy, czy ostatnia superseria zmieści się w godzinie.',
    'Jeśli brakuje czasu, tniesz w kolejności: ostatnie ćwiczenie dnia → trzecia seria ostatniej superserii → trzecia seria środkowej superserii.',
    'Nie tniesz: boju głównego, przysiadu bułgarskiego, przysiadu hiszpańskiego ani wejścia na skrzynię.']},
  {'heading': 'Cel cyklu', 'lines': [
    'Kolana: silny czworogłowy w całym zakresie — przysiad i bułgarski w zgięciu, izometria w środku, prostowanie na maszynie przy prostej nodze — i tył uda jako przeciwwaga.',
    'Biodra: pośladek wielki (hip thrust, ciąg), pośladek średni (odwodzenie, deska boczna, spacer farmera), przywodziciele (kopenhaski) i zginacze biodra (marsz z gumą).',
    'Kontrola jednonóż: bułgarski, skrzynia, ciąg jednonóż — kolano w osi pod ciężarem, a nie tylko bez niego.',
    'Golenie: piszczelowy przedni i obie części łydki (siedząc — płaszczkowaty, stojąc — brzuchaty), bo to one amortyzują kolano przy każdym kroku w dół.',
    'Zakres: rozciąganie we wtorek i czwartek plus joga w niedzielę. Trzy razy w tygodniu, bo przy rozciąganiu liczy się częstotliwość, nie długość jednej sesji.',
    'Góra na utrzymanie: wyciskanie raz w tygodniu, ciągnięcie trzy razy (podciąganie, face pull, wiosłowanie).']},
  {'heading': 'Ciężary', 'lines': [
    'Maksy przechodzą z cyklu 2 tak, jak zostawiła je samoregulacja — nic nie wpisujesz ręcznie. Tydzień 1 to 67,5% tych maksów: lżej niż końcówka cyklu 2, bo nogi dostają dużo nowej pracy.',
    'Ćwiczenia, które zostały z cyklu 2 pod tą samą nazwą (bułgarski, wiosłowanie, ciąg jednonóż, piszczelowy, przysiad hiszpański, spacer farmera), startują z ciężarem ustawionym wtedy suwakiem.',
    'Sufit RPE jest nadrzędny wobec procentów: jeśli ciężar wychodzi ciężej niż sufit, zdejmujesz z gryfu.',
    'Korekta z dwóch tygodni i podwyżka dołu po blokach działają jak w cyklu 2. Każdą da się cofnąć.']},
  {'heading': 'Progresja ćwiczeń dodatkowych', 'lines': [
    'Przy hantlach i maszynach ustaw raz suwakiem ciężar, którego używasz — aplikacja go zapamięta i podpowie podwyżkę.',
    'Gdy dwa tygodnie z rzędu robisz komplet powtórzeń, dokładasz najmniejszy skok.',
    'Tempo jest częścią ćwiczenia: 3 s w dół przy bułgarskim, skrzyni, prostowaniu i uginaniu. Szybsze powtórzenie z większym ciężarem to nie progres.',
    'Izometria: trudniej = cięższy hantel, nie głębiej.',
    'Plank kopenhaski: najpierw czas, potem unoszenie dolnej nogi, dopiero na końcu stopa zamiast kolana na ławce.',
    'Przy gumach: najpierw pełny zakres i pauza, dopiero potem grubsza guma.']},
  {'heading': 'Zasada złego dnia', 'lines': [
    'Rozgrzewka idzie wyraźnie ciężej niż zwykle: zdejmujesz 10% i robisz zaplanowaną objętość lżej.',
    'Plecy sztywne rano w piątek: ciąg lżej o 10% albo zamień piątek ze środą. Kolejność da się przestawić w obrębie tygodnia.',
    'Ćwiczenie, w którym coś nie gra w stawie (nie zmęczenie mięśnia) — najpierw mniejszy zakres, potem mniejszy ciężar, a jeśli dalej nie gra, pomiń je w tej sesji i zanotuj.']},
  {'heading': 'Tydzień 7 — lżejszy (nie jest opcjonalny)', 'lines': [
    'Boje: 2 × 6 przy 55% (dół) i 62,5% (góra), RPE 5.',
    'Ćwiczenia dodatkowe: 2 serie zamiast 3, ten sam ciężar. Rozciąganie i joga bez zmian.']},
  {'heading': 'Tydzień 12 — sprawdzian', 'lines': [
    'Bez testu maksa. Boje lżej (3 × 5).',
    'Przysiad: po seriach roboczych weź ciężar front squata z tygodnia 3 i zrób jedną serię na maks. powtórzeń — stop przy 15 albo RPE 8. Porównaj z tygodniem 3.',
    'Kolana i biodra — porównaj z tygodniem 2 w Raporcie cyklu: ciężar w bułgarskim, na skrzyni, w przysiadzie hiszpańskim, prostowaniu i hip thruście przy tym samym tempie oraz sekundy w planku kopenhaskim.',
    'To jest miara celu tego cyklu — nie ciężar na sztandze.']},
  {'heading': 'Kiedy powtórzyć tydzień', 'lines': [
    'Tydzień podbijasz, gdy każda sesja zmieściła się w suficie RPE.',
    'Jeśli nie — powtarzasz ten sam tydzień z tym samym ciężarem. To nie jest opóźnienie planu.']},
]

# Wtorek i czwartek: krótkie rozciąganie statyczne w domu. Te same pozycje oba dni.
def r(id_, name, dose, sec, steps, blad, note, film):
    return {'id': id_, 'name': name, 'dose': dose, 'sec': sec, 'steps': steps, 'blad': blad, 'note': note, 'film': film}

ROZCIAGANIE = {
  'key': 'R', 'title': 'Rozciąganie', 'minutes': 12,
  'dni': [{'k': 'wt', 'dzien': 2, 'nazwa': 'Wtorek', 'skrot': 'Wt'},
          {'k': 'cz', 'dzien': 4, 'nazwa': 'Czwartek', 'skrot': 'Cz'}],
  'intro': 'Dwanaście minut w domu, najlepiej wieczorem po pracy. Każda pozycja to rozciąganie statyczne: wchodzisz łagodnie, oddychasz i trzymasz. Przód bioder, tył i wewnętrzna strona uda, pośladek i łydki — to, co siedzenie skraca, a przysiad i ciąg potrzebują długie. Kolano nigdy nie dostaje skrętu, a gdy na nim klęczysz, leży na kocu. Potrzebne: mata, koc, pasek albo ręcznik, ściana i krzesło.',
  'rules': [
    'Rozciąganie ma ciągnąć w mięśniu, nie w stawie. Gdy czujesz coś w kolanie albo w pachwinie, zmniejsz zakres.',
    'Bez sprężynowania. Wejdź do 6–7 na 10 i trzymaj; z każdym wydechem pozwól sobie zejść odrobinę dalej.',
    'Liczy się częstotliwość: dwa razy po 12 minut plus niedzielna joga dają więcej niż jedna długa sesja w tygodniu.',
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
      '90 90 breathing feet on chair'),
  ],
}

plan = {
  'cykl': 3,
  'title': 'Cykl 3 · kolana i biodra',
  'schedule': 'pon A · wt rozciąganie · śr B · czw rozciąganie · pt C · nd joga',
  'bar': stary['bar'], 'plates': stary['plates'],
  # Wartości awaryjne — na urządzeniu z cyklem 2 maksy przechodzą z niego (niżej).
  'e1rm': dict(stary['e1rm']),
  'e1rmZPoprzedniego': ['bench', 'front', 'dl'],
  'weeks': weeks,
  'days': {
    'A': {'key': 'A', 'title': 'KOLANA · przysiad i czworogłowe', 'day': 'Poniedziałek', 'minutes': 55, 'items': A},
    'B': {'key': 'B', 'title': 'BIODRA · pośladki i przywodziciele', 'day': 'Środa', 'minutes': 50, 'items': B},
    'C': {'key': 'C', 'title': 'ZAWIAS · ciąg i jednonóż', 'day': 'Piątek', 'minutes': 55, 'items': C},
  },
  'warmup': warmup,
  'rules': rules,
  'mobility': JOGA,
  'rozciaganie': ROZCIAGANIE,
  'deloadTekst': 'Boje 2 × 6 lekko, ćwiczenia dodatkowe po 2 serie, ten sam ciężar. Rozciąganie i joga bez zmian.',
  'tydzien12Tekst': 'Bez testu maksa. Front squat: po seriach roboczych jedna seria na maks. powtórzeń z ciężarem z tygodnia 3 (stop przy 15 albo RPE 8). Kolana i biodra: porównaj z tygodniem 2 ciężary w bułgarskim, na skrzyni, w przysiadzie hiszpańskim i hip thruście oraz czas w planku kopenhaskim.',
}
json.dump(plan, open(os.path.join(ROOT, 'plan.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('plan.json: cykl', plan['cykl'], '·', sum(len(d['items']) for d in plan['days'].values()), 'ćwiczeń ·', len(ROZCIAGANIE['items']), 'pozycji rozciągania')
