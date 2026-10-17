# Generator planu cyklu 2 (plan.json). Cykl 1 zostaje w plan-cykl1.json.
# Uruchom: python3 tools/cykl2.py
# Tresc wylacznie treningowa — repozytorium jest publiczne.
import json, os
ROOT = os.path.join(os.path.dirname(__file__), '..')
stary = json.load(open(os.path.join(ROOT, 'plan-cykl1.json'), encoding='utf-8'))

def it(n, id_, name, scheme, load, rpe, note, superset=None, noCut=False, kgStart=None):
    d = {'n': n, 'id': id_, 'name': name, 'superset': superset, 'scheme': scheme, 'load': load, 'rpe': rpe, 'note': note, 'noCut': noCut}
    if kgStart is not None: d['kgStart'] = kgStart
    return d

REF = lambda r: {'ref': r}

A = [
  it(1, 'c2a1', 'Mobilizacja odcinka piersiowego na wałku', '2 × 8', 'masa ciała', '—',
     'Wałek pod łopatkami, dłonie podtrzymują głowę, pośladki na podłodze. Z wydechem odchyl się nad wałkiem, z wdechem wróć. Przesuń wałek o kilka centymetrów i powtórz. Ruch w odcinku piersiowym, nie w lędźwiach — żebra trzymaj w dole.'),
  it(2, 'c2a2', 'Wyciskanie leżąc', REF('upper.scheme'), REF('bench.kg'), REF('upper.rpe'),
     'Bój główny. Przerwy 2 min. Łopatki ściągnięte i wbite w ławkę, stopy płasko, umiarkowany mostek. Sztanga schodzi na dolną część mostka, łokcie ok. 45° od tułowia. Sufit RPE pilnuje zapasu — tu nie szukasz maksa.', noCut=True),
  it(3, 'c2a3', 'Podciąganie — negatywy', '4 × 5', 'wejście z ławki, 4 s w dół', 8,
     'Przerwy 2 min. Wejdź z ławki do pozycji brodą nad drążkiem, łopatki ściągnięte w dół. Opuszczaj się 4 s do pełnego zwisu. Gdy 4 × 5 idzie swobodnie, dorzuć 1–2 pełne podciągnięcia na początku każdej serii.'),
  it(4, 'c2a4', 'Wiosłowanie hantlem w podporze', '3 × 10 / stronę', 'podwójna progresja', 7,
     'Przerwa 90 s. Kolano i dłoń na ławce, plecy płasko. Ciągnij hantel do biodra, nie do barku — łokieć blisko tułowia, łopatka zjeżdża w dół i do kręgosłupa. 1 s pauzy na górze, bez skrętu tułowia.', kgStart=20),
  it(5, 'c2a5', 'Przysiad bułgarski z hantlami', '3 × 8 / nogę', 'podwójna progresja', 7,
     'Przerwa 90 s. Tylna stopa na ławce, przednia na tyle daleko, żeby kolano w dole było nad stopą lub lekko przed nią. Kolano prowadzisz w linii drugiego palca stopy, 3 s w dół. Tułów lekko pochylony obciąża pośladek, pionowy — udo.', noCut=True, kgStart=12),
  it(6, 'c2a6', 'Spacer farmera jednorącz', '3 × 30 m / stronę', 'podwójna progresja', 7,
     'Przerwa 60 s. Ciężki hantel w jednej ręce, druga ręka swobodnie. Barki na jednym poziomie, tułów pionowo — nie przechylaj się w żadną stronę. Krótkie, spokojne kroki. Pracują mięśnie skośne i biodro po przeciwnej stronie.', kgStart=24),
  it(7, 'c2a7', 'Y-T-W leżąc na ławce skośnej', '3 × 6 / literę', 'bez ciężaru albo 1–2 kg', 6,
     'SUPERSERIA z bird dogiem — 60 s po parze. Leżysz przodem na ławce ustawionej na ok. 30°. Ramiona unosisz kciukami w górę w kształt litery Y, potem T, potem W (łokcie zgięte, ściągnij łopatki). 2 s pauzy na górze każdej litery. Szyja przedłuża kręgosłup.', superset='A1'),
  it(8, 'c2a8', 'Bird dog z pauzą', '3 × 8 / stronę', 'masa ciała', '—',
     'Klęk podparty, dłonie pod barkami, kolana pod biodrami. Z wydechem wyprostuj przeciwną rękę i nogę do poziomu, 3 s pauzy, wróć bez opierania. Miednica nie przechyla się na bok — wyobraź sobie szklankę wody na lędźwiach.', superset='A2'),
]
B = [
  it(1, 'c2b1', 'Knee-to-wall — mobilizacja zgięcia grzbietowego stopy', '2 × 10 / nogę', 'masa ciała', '—',
     'Stopa ok. 10 cm od ściany, pięta cały czas na podłodze. Wypchnij kolano do ściany w linii drugiego palca, 2 s, wróć. Gdy dotykasz ściany swobodnie, odsuń stopę o 1 cm.'),
  it(2, 'c2b2', 'Przysiad hiszpański z hantlem (izometria)', '4 × 45 s', 'podwójna progresja', 6,
     'Przerwa 60 s. Guma za kolanami przyczepiona do stałego punktu, hantel trzymany przy klatce. Zejdź do ok. 60–70° zgięcia w kolanie, piszczele pionowo, tułów pionowo, i trzymaj. Trudniej = cięższy hantel, nie głębiej.', noCut=True, kgStart=8),
  it(3, 'c2b3', 'Zejście ze stopnia, wolne', '3 × 8 / nogę', 'masa ciała → hantel', 7,
     'Przerwa 60 s. Stoisz jedną nogą na stopniu 15–20 cm. Druga noga schodzi powoli przed stopień i tylko dotyka piętą podłogi — 3 s w dół. Kolano nogi na stopniu w linii drugiego palca, miednica pozioma. Wracasz siłą nogi na stopniu.'),
  it(4, 'c2b4', 'Hip thrust jednonóż z hantlem', '3 × 10 / nogę', 'podwójna progresja', 7,
     'Przerwa 60 s. Łopatki na ławce, hantel na biodrze nogi pracującej. Wypchnij biodra w górę, aż tułów i udo będą w linii, 2 s pauzy. Żebra w dole — ruch z bioder, nie z wyginania lędźwi.', kgStart=10),
  it(5, 'c2b5', 'Plank kopenhaski (krótka dźwignia)', '3 × 20 s / stronę', 'masa ciała', '—',
     'Przerwa 60 s. Bokiem na przedramieniu, kolano górnej nogi na ławce, dolna noga swobodnie. Unieś biodra do linii prostej i trzymaj. Pracują przywodziciele górnej nogi i boczna taśma tułowia. Wydłużenie: stopa zamiast kolana na ławce.'),
  it(6, 'c2b6', 'Chód boczny z gumą', '3 × 12 / stronę', 'coraz grubsza guma', 6,
     'Przerwa 60 s. Mała guma nad kolanami albo przy kostkach, półprzysiad, stopy na szerokość bioder. Krok w bok bez opadania kolan do środka i bez kołysania tułowiem. Pracuje pośladek średni, który trzyma kolano w osi.'),
  it(7, 'c2b7', 'Zgięcie grzbietowe na maszynie (piszczelowy przedni)', '3 × 15', 'podwójna progresja', 7,
     'SUPERSERIA z wspięciami — 90 s po parze. Pełny zakres: palce wysoko do góry, 1 s pauzy, 3 s w dół. Gdy 3 × 15 wchodzi czysto, dokładasz najmniejszy skok na maszynie. Ustaw raz suwakiem ciężar, którego używasz — aplikacja go zapamięta.', superset='A1', kgStart=10),
  it(8, 'c2b8', 'Wspięcia na palce jednonóż, kolano ugięte', '3 × 15 / nogę', 'masa ciała → hantel', 7,
     'Przednia część stopy na stopniu, kolano ugięte ok. 20–30° przez cały ruch — tak pracuje płaszczkowaty, który stabilizuje kostkę. Pełny zakres, 1 s na górze, 3 s w dół.', superset='A2'),
  it(9, 'c2b9', 'Ewersja stopy z gumą (siedząc)', '2 × 20 / nogę', 'coraz grubsza guma', 6,
     'Przerwa 45 s. Siedzisz, guma wokół przedniej części stopy, zaczepiona po wewnętrznej stronie. Odwiedź stopę na zewnątrz, ruch tylko w kostce — kolano i udo nieruchomo.'),
  it(10, 'c2b10', 'Pallof press z gumą', '3 × 10 / stronę', 'coraz grubsza guma', 7,
     'Przerwa 45 s. Guma przyczepiona bokiem na wysokości klatki. Stań bokiem, dłonie przy mostku, wypchnij ręce przed siebie i trzymaj 2 s. Guma ciągnie w bok, ty nie dajesz się obrócić — to są mięśnie głębokie w pracy.'),
  it(11, 'c2b11', 'Rozciąganie zginacza biodra w półklęku', '2 × 45 s / stronę', 'masa ciała', '—',
     'Półklęk, pod tylnym kolanem złożony koc, przednia stopa płasko, oba kolana zgięte pod kątem prostym. Napnij pośladek tylnej nogi i podwiń miednicę — rozciąganie czujesz z przodu biodra bez przesuwania się do przodu. Łagodnie, bez sprężynowania. Dobre też codziennie po pracy przy biurku.'),
]
C = [
  it(1, 'c2c1', 'Oddech 90/90 ze stopami na ścianie', '2 × 5 oddechów', 'masa ciała', '—',
     'Leżysz na plecach, stopy na ścianie, biodra i kolana zgięte pod kątem prostym. Lekko dociśnij pięty, aż poczujesz tył uda. Wdech nosem w boki żeber, długi wydech ustami — żebra schodzą w dół, lędźwie miękko do podłogi. Ustawia miednicę przed przysiadem.'),
  it(2, 'c2c2', 'Front squat', REF('lower.scheme'), REF('front.kg'), REF('lower.rpe'),
     'Bój główny. Przerwy 3 min. Sztanga na przednich naramiennych, łokcie wysoko. Głębokość: tak nisko, jak plecy zostają neutralne, a kolana idą w linii stóp. Tułów pionowo przez cały ruch.', noCut=True),
  it(3, 'c2c3', 'Martwy ciąg', REF('lower.scheme'), REF('dl.kg'), REF('lower.rpe'),
     'Bój główny. Przerwy 3 min. Teraz z podłogi. Sztanga nad środkiem stopy, łopatki nad sztangą, plecy neutralne. Najpierw napięcie (zabierz luz ze sztangi), potem pchasz podłogę nogami. Każde powtórzenie od zera — bez odbijania.', noCut=True),
  it(4, 'c2c4', 'Martwy ciąg rumuński jednonóż z hantlem', '3 × 8 / nogę', 'podwójna progresja', 7,
     'Przerwa 90 s. Hantel w ręce po stronie nogi wolnej. Biodro cofa się, tułów i wolna noga tworzą jedną linię jak dźwignia, kolano nogi podporowej lekko ugięte. Miednica równo — nie otwieraj biodra w bok. Stabilizacja biodra, kolana i kostki naraz.', kgStart=12),
  it(5, 'c2c5', 'Wiosłowanie z gumą siedząc', '3 × 15', 'coraz grubsza guma', 7,
     'SUPERSERIA z face pullem — 60 s po parze. Siad prosty, guma wokół stóp, plecy pionowo. Ciągnij łokcie w tył przy tułowiu, ściągnij łopatki, 1 s pauzy. Nie odchylaj się — pracują plecy, nie lędźwie.', superset='A1'),
  it(6, 'c2c6', 'Face pull z gumą', '3 × 15', 'coraz grubsza guma', 6,
     'Guma na wysokości twarzy. Ciągnij do czoła, rozkładając dłonie na boki, łokcie wysoko, kciuki do tyłu. 1 s pauzy z łopatkami ściągniętymi. Prostuje barki po dniu przy biurku.', superset='A2'),
  it(7, 'c2c7', 'Dead bug', '3 × 8 / stronę', 'masa ciała', '—',
     'Przerwa 45 s. Na plecach, ręce w górę, biodra i kolana zgięte 90°. Lędźwie przyklejone do podłogi przez cały czas. Z wydechem opuszczasz przeciwną rękę i nogę do podłogi, wracasz. Gdy lędźwie się odklejają — mniejszy zakres.'),
  it(8, 'c2c8', 'Otwieranie odcinka piersiowego w leżeniu bokiem', '2 × 8 / stronę', 'masa ciała', '—',
     'Leżysz bokiem, kolana zgięte 90° i dociśnięte do podłogi (możesz przytrzymać je dolną ręką). Górna ręka zatacza łuk nad tobą na drugą stronę, wzrok za dłonią, wydech w końcowej pozycji. Kolana zostają razem — ruch tylko w odcinku piersiowym.'),
]

def lower(w, block, scheme, pct, rpe):
    return {'week': w, 'block': block, 'scheme': scheme, 'pct': pct, 'dlAdj': 0, 'rpe': rpe, 'barHeight': 'z podłogi'}
def upper(w, block, scheme, pct, rpe):
    return {'week': w, 'block': block, 'scheme': scheme, 'pct': pct, 'rpe': rpe, 'benchText': None, 'pullup': None}

weeks = {
  # Start z ciężarów z końca cyklu 1 (tydz. 10: front 4×6 @ 72,5, ciąg z podwyższenia 4×6 @ 85,
  # oba „z zapasem"): tydzień 1 to ok. 70 kg i 77,5 kg na 3×8, ciąg trochę niżej, bo z podłogi.
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
  'skip': ['Rozciągania statycznego przed sztangą — zostaje na koniec dnia B i na jogę.',
           'Długiego rolowania — 1–2 minuty na miejsce, które naprawdę tego potrzebuje, wystarczą.',
           'Krążeń bioder i pracy w końcowych zakresach.',
           'Ćwiczeń do upadku mięśniowego — rozgrzewka ma przygotować, nie zmęczyć.'],
  'notes': ['Przerwy między seriami dojściowymi: 60 s. Mają rozgrzewać, nie męczyć.',
            'W dniu C przed ciągiem wystarczą DWIE serie (50% × 5, 75% × 3) — po przysiadzie jesteś rozgrzany.'],
  'days': {
    'A': {'label': 'DZIEŃ A — góra  ·  ~6 min', 'steps': [
      {'what': 'Rower albo orbitrek spokojnie', 'dose': '4 min', 'note': 'Bez zadyszki.'},
      {'what': 'Band pull-apart', 'dose': '2 × 15', 'note': 'Ręce na wysokości barków, łopatki ściągnięte.'},
      {'what': 'Rotacja zewnętrzna z gumą', 'dose': '1 × 15 / rękę', 'note': 'Łokieć przy tułowiu.'},
      {'what': 'Mobilizacja odcinka piersiowego', 'dose': '2 × 8', 'note': 'To ćwiczenie nr 1 dnia A — nie robisz go drugi raz.'},
      {'what': 'Serie dojściowe do wyciskania', 'dose': 'wg tabeli', 'note': ''}]},
    'B': {'label': 'DZIEŃ B — kolana i kostki  ·  ~6 min', 'steps': [
      {'what': 'Rower spokojnie', 'dose': '5 min', 'note': 'Kolana mają być ciepłe przed izometrią.'},
      {'what': 'Krążenia w kostkach', 'dose': '10 / stronę', 'note': 'Wolne kółka stopą, kolano nieruchomo.'},
      {'what': 'Mostek biodrowy obunóż', 'dose': '1 × 15', 'note': 'Budzi pośladki przed pracą jednonóż.'}]},
    'C': {'label': 'DZIEŃ C — dół  ·  ~7 min', 'steps': [
      {'what': 'Rower spokojnie', 'dose': '4 min', 'note': 'Najcięższy dzień — nie skracaj tego.'},
      {'what': 'Oddech 90/90 ze stopami na ścianie', 'dose': '2 × 5 oddechów', 'note': 'To ćwiczenie nr 1 dnia C.'},
      {'what': 'Goblet squat z lekkim hantlem', 'dose': '1 × 8', 'note': 'Ustawia wzorzec przed sztangą. 3 s w dół.'},
      {'what': 'Serie dojściowe do front squata', 'dose': 'wg tabeli', 'note': ''},
      {'what': 'Serie dojściowe do ciągu', 'dose': '50% × 5, 75% × 3', 'note': 'Krótsza wersja.'}]},
  },
}

rules = [
  {'heading': 'Układ tygodnia', 'lines': [
    'Poniedziałek — Dzień A: GÓRA i postawa (wyciskanie, plecy, praca jednonóż, mięśnie głębokie).',
    'Środa — Dzień B: kolana, kostki i mięśnie głębokie. Bez sztangi.',
    'Piątek — Dzień C: DÓŁ ze sztangą (front squat, martwy ciąg z podłogi) i postawa.',
    'Niedziela — joga, domyślnie wersja krótka (~20 min), pełna, gdy jest czas.',
    'Na każde ćwiczenie pchające przypadają co najmniej dwa ciągnące — tak plan równoważy godziny przy biurku.']},
  {'heading': 'Czas trwania', 'lines': [
    'Dzień A ~55 min, dzień B ~50 min, dzień C ~55 min. Plus 6–7 min rozgrzewki.',
    'PRZERWY: boje 2–3 min, praca jednonóż 60–90 s, mięśnie głębokie 45 s. Superserie: bez przerwy w środku, odpoczynek po parze.',
    'Timer przerwy rusza sam po odhaczeniu serii — przerwy w cyklu 1 były 1,5–3× dłuższe niż plan, a ćwiczenia z końca listy wypadały.',
    'Jeśli brakuje czasu, tniesz w kolejności: ostatnie ćwiczenie dnia → jedna seria z superserii → jedna seria pracy jednonóż.',
    'Boju głównego, przysiadu bułgarskiego i przysiadu hiszpańskiego nie tniesz.',
    'Rozciąganie zginacza biodra w półklęku z dnia B możesz robić codziennie po pracy — 2 minuty.']},
  {'heading': 'Cel cyklu', 'lines': [
    'Kolana, biodra i kostki: siła jednonóż, kontrola kolana w osi, przód i tył goleni.',
    'Mięśnie głębokie: ćwiczenia, w których tułów opiera się ruchowi (dead bug, bird dog, Pallof, spacer farmera, plank kopenhaski).',
    'Postawa: plecy i łopatki w każdej sesji, odcinek piersiowy i przód bioder na otwarcie po siedzeniu.',
    'Boje zostają, ale jako baza — sufit RPE 7 na dole, 7,5–8 na górze. Nie testujesz maksa.']},
  {'heading': 'Ciężary', 'lines': [
    'Start cyklu: front squat E1RM 105 kg, martwy ciąg z podłogi 115 kg, wyciskanie 135 kg — z ostatnich tygodni cyklu 1 (front 4×6 @ 72,5, ciąg 4×6 @ 85 z zapasem). Tydzień 1: front ~70 kg, ciąg ~77,5 kg.',
    'Ciąg schodzi z podwyższenia na podłogę, dlatego jego E1RM startuje niżej niż w cyklu 1.',
    'Sufit RPE jest nadrzędny wobec procentów: jeśli ciężar wychodzi ciężej niż sufit, zdejmujesz z gryfu.',
    'Korekta z dwóch tygodni i podwyżka dołu po blokach działają jak w cyklu 1. Każdą da się cofnąć.']},
  {'heading': 'Progresja ćwiczeń dodatkowych', 'lines': [
    'Przy hantlach i maszynie ustaw raz suwakiem ciężar, którego używasz — aplikacja go zapamięta i podpowie podwyżkę.',
    'Gdy dwa tygodnie z rzędu robisz komplet powtórzeń, dokładasz najmniejszy skok.',
    'Przy gumach: najpierw pełny zakres i pauza, dopiero potem grubsza guma.',
    'Izometria: trudniej = cięższy hantel, nie głębsze zejście.']},
  {'heading': 'Zasada złego dnia', 'lines': [
    'Rozgrzewka idzie wyraźnie ciężej niż zwykle: zdejmujesz 10% i robisz zaplanowaną objętość lżej.',
    'Plecy sztywne rano: zamień dzień C na dzień B. Kolejność da się przestawić w obrębie tygodnia.',
    'Ćwiczenie, w którym coś nie gra w stawie (nie zmęczenie mięśnia) — pomiń je w tej sesji i zanotuj.']},
  {'heading': 'Tydzień 7 — lżejszy (nie jest opcjonalny)', 'lines': [
    'Boje: 2 × 6 przy 55% (dół) i 62,5% (góra), RPE 5.',
    'Ćwiczenia dodatkowe: 2 serie zamiast 3, ten sam ciężar. Mobilność i oddech bez zmian.']},
  {'heading': 'Tydzień 12 — sprawdzian', 'lines': [
    'Bez testu maksa. Boje lżej (3 × 5).',
    'Dół: po seriach roboczych weź ciężar z tygodnia 3 front squata i zrób jedną serię na maksymalną liczbę powtórzeń — stop przy 15 albo RPE 8. Porównaj z tygodniem 3.',
    'Jednonóż: zanotuj, ile powtórzeń zejścia ze stopnia robisz czysto na każdą nogę i jak długo trzymasz plank kopenhaski. To jest miara celu tego cyklu.']},
  {'heading': 'Kiedy powtórzyć tydzień', 'lines': [
    'Tydzień podbijasz, gdy każda sesja zmieściła się w suficie RPE.',
    'Jeśli nie — powtarzasz ten sam tydzień z tym samym ciężarem. To nie jest opóźnienie planu.']},
]

import sys
sys.path.insert(0, os.path.dirname(__file__))
from joga2 import JOGA
mob = JOGA

plan = {
  'cykl': 2,
  'title': 'Cykl 2 · kolana, biodra, postawa',
  'schedule': 'pon A · śr B · pt C · nd joga',
  'bar': stary['bar'], 'plates': stary['plates'],
  'e1rm': {'front': 105, 'dl': 115, 'bench': 135},
  # Jednorazowo nadpisuje maksy dołu u kogoś, kto zaczął cykl 2 ze starszym planem (95/100).
  'korektaE1rm': {'wersja': 1, 'front': 105, 'dl': 115},
  'weeks': weeks,
  'days': {
    'A': {'key': 'A', 'title': 'GÓRA · postawa i jednonóż', 'day': 'Poniedziałek', 'minutes': 55, 'items': A},
    'B': {'key': 'B', 'title': 'DÓŁ · kolana, kostki, mięśnie głębokie', 'day': 'Środa', 'minutes': 50, 'items': B},
    'C': {'key': 'C', 'title': 'DÓŁ · boje i postawa', 'day': 'Piątek', 'minutes': 55, 'items': C},
  },
  'warmup': warmup,
  'rules': rules,
  'mobility': mob,
  'deloadTekst': 'Boje 2 × 6 lekko, ćwiczenia dodatkowe po 2 serie, ten sam ciężar. Mobilność i oddech bez zmian.',
  'tydzien12Tekst': 'Bez testu maksa. Dół: po seriach roboczych jedna seria na maks. powtórzeń z ciężarem z tygodnia 3 (stop przy 15 albo RPE 8). Zanotuj zejście ze stopnia i plank kopenhaski.',
}
json.dump(plan, open(os.path.join(ROOT, 'plan.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('plan.json: cykl', plan['cykl'], '·', sum(len(d['items']) for d in plan['days'].values()), 'ćwiczeń')
