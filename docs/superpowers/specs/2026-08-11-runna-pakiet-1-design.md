# Runna pakiet 1: pętla sesji + tydzień + odstępstwa od planu (spec)

Data: 2026-08-11 · Status: zatwierdzony kierunkowo przez usera (czat: "przygotuj nowy plan wdrożenia" po researchu) · Źródło: `docs/RESEARCH-RUNNA-2026-08-11.md` (część 1: funkcje, część 2: ekrany i flow)

OSOBNY pakiet: nie miesza się z pętlą przełożenia treningu + kroku marketingowego
(`docs/PROMPT-WDROZENIE-PRZELOZENIE-ONBOARDING-2026-08-11.md`). Start wdrożenia
DOPIERO gdy tamta pętla ma wszystkie kroki odhaczone. Zależność realna: tray
zaległości (C2) używa `scheduleOverrides` z tamtego pakietu.

Aktualizacja 2026-08-12 (dyskusja z userem): zakres PEŁNY, ale wydanie
w DWÓCH buildach (najpierw etapy A+B, potem C); A3 zmienione na edycję
z ekranu podsumowania; dodany backfill rekordów (A5). Bramka startowa
spełniona: pętla przełożenia domknięta, hotfix b.92 wydany (iOS 93, AAB v9).

## Zasady nadrzędne pakietu

1. **Adaptacja za zgodą** (lekcja nr 1 z recenzji Runny): ŻADNA logika z tego
   pakietu nie zmienia planu, ciężarów ani cyklu bez jawnego tapnięcia usera.
   Silnik proponuje, user zatwierdza, zmiana jest odwracalna.
2. **Środowisko siłowni**: telefon leży, ekran gaśnie, JS w tle nie żyje.
   Zero nowych timerów JS; sygnały czasowe wyłącznie systemowe (jak dziś).
3. **Ton bez pretensji**: komunikaty o zaległościach neutralne ("przenieś",
   nigdy "zawaliłeś"). Pochwały skalibrowane do realnego wykonania (bez
   "way too nice", to była skarga na Runnę).
4. Szczegółowe layouty: sekcje raportu przywołane per krok (nie dubluję ich
   tu; raport jest częścią specu).

## ETAP A: pętla po sesji

### A1. Sekwencja completion (raport cz. 2, sekcja 3.1)

Po zakończeniu treningu, w tej kolejności: (1) pełnoekranowa celebracja
("Trening zaliczony", konfetti w limonce, haptyka), (2) ocena jednym tapem:
kciuk góra / kciuk dół; dół otwiera chipsy "Za ciężko / Za długo / Słabszy
dzień" (zero pól tekstowych), (3) podsumowanie: 3 liczby hero (tonaż, czas,
serie), blok PR per ĆWICZENIE, porównanie plan vs wykonanie ("90% zaplanowanych
serii, wolumen +4% vs poprzedni tydzień"), (4) [Udostępnij] + powrót na
Dashboard z podświetloną kartą następnego dnia.

- Podsumowanie liczone DETERMINISTYCZNIE z danych sesji i historii (bez AI
  w v1; żadnych kosztów per trening).
- Ocena zapisywana do sesji (nowe pole; rules: sprawdzić hasOnly dokumentu
  treningu) + mirror dla silnika.
- Brzegi: trening bez żadnej odhaczonej serii nie dostaje celebracji (przepływ
  odrzucenia bez zmian); ocena pomijalna (X zamyka, brak oceny = brak sygnału,
  flow idzie dalej); offline: całość działa lokalnie, sync jak dziś.

### A2. Ocena zasila silnik progresji (kontrakt "za zgodą")

"Za ciężko" z A1 obniża PROPOZYCJĘ silnika na następny raz (nie podbija
ciężaru), "kciuk góra" bez uwag = normalna progresja. Zmiana wyłącznie
w propozycji pokazywanej userowi; nic nie nadpisuje planu automatycznie.
Test: sekwencja sesja→ocena "za ciężko"→następna sesja pokazuje propozycję
bez podbicia; brak oceny = zachowanie identyczne jak dziś (niezmiennik).

### A3. Edycja serii z ekranu podsumowania (zmiana 2026-08-12)

BEZ osobnego ekranu "Sprawdź serie" między "Zakończ trening" a celebracją:
u Runny przegląd lapów ma sens, bo dane przychodzą z automatu (treadmill);
u nas serie odhaczane są ręcznie na bieżąco, a dodatkowy krok to tarcie
przy KAŻDYM treningu. Zamiast tego: edycja ciężaru/powtórzeń inline
dostępna z ekranu podsumowania completion (krok 3 sekwencji A1), przez
istniejącą ścieżkę edycji sesji. Brzegi: edycja przechodzi przez
sanityzację (kg kanoniczne); poprawka widoczna w historii, agregatach
i danych silnika; user, który nic nie zmienia, nie ma żadnego
dodatkowego tapu.

### A4. Share card + celebracja PR (raport cz. 2, sekcja 3.2)

Karta 1080x1920 renderowana z HTML/CSS (canvas/PNG, bez nowych assetów
binarnych): layout dokładnie wg sekcji 3.2 (glass panel, hero-statystyka
wybierana przez usera: tonaż / PR / czas, rząd 3 liczb, pasek "Tydzień N z M",
brand). Systemowy share sheet. PR w trakcie sesji: toast + badge, pełna
celebracja w completion. Brzegi: brak PR = hero domyślnie tonaż; render
w WKWebView (canvas) przetestowany na urządzeniu; udostępnianie opt-in
(nic nie wychodzi samo).

### A5. Backfill rekordów sprzed instalacji (dodane 2026-08-12; raport cz. 1, szybka wygrana 7)

Ręczne wpisanie starych PR-ów w bojach głównych (Profil, sekcja TWOJE DANE),
żeby celebracja PR (A1/A4) nie gratulowała ciężarów dźwiganych przed
instalacją i żeby progresja startowała z prawdziwego baseline'u. Detekcja PR
(toast w sesji, blok w completion, hero na share card) porównuje wynik
z max(historia w apce, backfill). Brzegi: walidacja nierealnych wartości
(życzliwy komunikat, nie błąd); kg kanoniczne; brak backfillu = zachowanie
identyczne jak dziś; nowe pole dokumentu: rules hasOnly + testy + sprawdzony
mapper (lekcja builda 88).

## ETAP B: Dashboard i ekran treningu

### B1. Karta tygodnia (raport cz. 2, sekcja 1.3)

"Tydzień N z M" + rząd dni z checkmarkami (ukończone limonka, zaplanowane
w kolorze typu, wolne wygaszone; dzień przełożony przez scheduleOverrides
pokazuje się w NOWEJ dacie), pasek "2 z 4 sesji", tonaż tygodnia. Brzegi:
tydzień z deloadem oznaczony; plan bez startu / dzień poza cyklem = stan
jak dziś (bez regresu); agregaty liczone z sesji (wzorzec useWorkoutAggregate).

### B2. Kolejność Dashboardu + karta dnia wolnego (raport cz. 2, sekcje 1.1-1.2)

Kolejność: karta dziś (+ jedno zdanie "po co ten trening" z celu dnia planu)
→ karta tygodnia → reszta → "Szybki trening" na dole. Dzień wolny = karta
"Dzień regeneracji" (wyciszony wariant, 1-2 statyczne tipy per partia
z wczoraj), nie pusty ekran. Niezmiennik: wszystkie obecne elementy
Dashboardu zostają (przesuwamy, nie usuwamy); baner aktywnej sesji i logika
draftów NIETKNIĘTE.

### B3. WorkoutDay: przerwa-hero + press-and-hold (raport cz. 2, sekcje 2.3-2.4)

Stan "przerwa": pasek przerwy rośnie do dominującego elementu (wielki
countdown + "następne: X kg x N"), po końcu wraca. Stan "seria": ciężar
i powtórzenia jako największe cyfry karty aktywnego ćwiczenia. "Zakończ
trening" przez przytrzymanie (ring postępu w limonce; tap = hint), skip
przerwy zwykłym tapem (tanie wyjście, reguła #6). Brzegi: mechanika timera
(deadline, notyfikacje, suspend/resume) NIETKNIĘTA, zmiana czysto
prezentacyjna; press-and-hold dostępny też z klawiatury/a11y (fallback:
podwójny tap z potwierdzeniem).

## ETAP C: odstępstwa od planu

### C1. Jawne "Pomiń trening" (raport cz. 1, TOP 3)

Akcja na dniu planu (menu karty dnia, obok "Przełóż" z poprzedniego pakietu):
stan `skipped` per data (model per-data jak scheduleOverrides, osobne pole,
te same reguły pruningu). Skutki: dzień znika z "zaległych", silnik nie
liczy pominięcia jako porażki ani nie podbija po nim ciężaru, karta tygodnia
pokazuje dzień jako pominięty (wygaszony checkmark). Odwracalne ("Przywróć").
Rules: nowe pole w hasOnly + testy.

### C2. Tray zaległości, wersja minimalna (raport cz. 2, sekcja 1.4 + cz. 1 TOP 2)

Trigger: nieukończona i niepominięta sesja starsza niż 2 dni albo pusty
miniony tydzień. Bottom sheet na Dashboardzie: [Pomiń] (C1), [Przenieś]
(istniejący sheet scheduleOverrides), przy zaległości tygodnia+ dodatkowo
[Kontynuuj od dziś] (propozycja silnika z obniżonym ciężarem, do
zatwierdzenia; zasada "za zgodą"). Bez przebudowy cyklu w v1. Brzegi:
odrzucenie traya (X) zapamiętane dla danej zaległości (nie wraca co wejście);
detekcja NIE odpala się przy aktywnym drafcie; ton neutralny.

### C3. Tryb "nie na 100%" (raport cz. 1, TOP 1)

Wejście z Profilu (sekcja TRENING) i z traya C2: okres 3-14 dni + poziom
(lżej -20% / tylko główne boje / pauza). W oknie trybu propozycje ciężarów
obniżone, po zakończeniu rampa powrotna (85% → 92% → 100% w kolejnych
sesjach zamiast skoku). Push przed końcem trybu (functions, wzorzec
istniejących puszy). Brzegi: tryb widoczny jako badge na Dashboardzie
(stan ma być jawny i wyłączalny w każdej chwili, reguła #6); nakładanie się
z deloadem cyklu: tryb WYGRYWA, deload się nie dubluje; test sekwencji:
wejście → sesja w trybie → koniec → rampa → powrót do bazy.

### C4. Tryb urlopu (raport cz. 1, TOP 6)

Deklaracja przerwy z datami (3-21 dni) + wybór (nic / tylko główne boje).
Silnik: deload cyklu przesuwa się na tydzień wyjazdu (przerwa PEŁNI ROLĘ
deloadu, nie dubluje go), po powrocie łagodna rampa jak w C3, push w dniu
końca. Brzegi: urlop nachodzący na koniec cyklu (cykl się wydłuża o pełne
tygodnie przerwy, id dni bez zmian, niezmiennik X19); anulowanie urlopu
przed startem i w trakcie; kolizja z trybem C3 (jeden aktywny naraz,
UI blokuje drugi z komunikatem).

### C5. Ad-hoc zasila silnik (raport cz. 1, TOP 7)

Audyt przepływu: serie z szybkiego treningu muszą wchodzić do: tonażu
tygodnia (B1), historii ciężarów per ćwiczenie i propozycji silnika
(user zrobił ad-hoc 5x5 100 kg → plan nie proponuje 90 kg "wg rozpiski").
Najpierw test odtwarzający lukę (jeśli istnieje), potem domknięcie.
Zakres: bez zmian Stravy (cardio poza pakietem).

## Poza zakresem pakietu (świadomie)

- Onboarding i paywall (ekrany, obietnica liczbowa): OSOBNY pakiet, koliduje
  z właśnie wdrażanym krokiem marketingowym.
- Live Activity, push planu do Garmina, Workout Mirroring, test siły,
  pytanie do trenera: duże zakłady, osobne inicjatywy.
- Plan pomostowy po celu, recap końca cyklu (3.3), Strava upload, iCal feed,
  edycja dni tygodnia w trakcie planu: backlog (wysoki priorytet retencyjny,
  ale pakiet musi mieć granice).
- Pełny realign cyklu w trayu (wersja L z raportu).

## Testy i niezmienniki pakietu

- Niezmiennik globalny: user, który niczego nie ocenia, nie pomija i nie
  włącza trybów, ma DOKŁADNIE dzisiejsze zachowanie apki (każdy etap dodaje
  ścieżkę, żadnej nie podmienia).
- Sekwencje obowiązkowe: (1) sesja → ocena → wpływ na następną propozycję,
  (2) skip → tydzień → brak traya, (3) zaległość → tray → każda z opcji,
  (4) tryb C3/C4 pełny cykl życia, (5) przerwanie treningu w trakcie
  completion (zabicie apki między zapisem a celebracją: zapis nie ginie,
  celebracja nie wraca zombie).
- Rules: każde nowe pole dokumentu (ocena sesji, skipped, tryby) w hasOnly
  + testy; mapper profilu/sesji sprawdzony pod kątem gubienia pól (lekcja
  builda 88).
- Bramki standardowe + `check:dist-smoke` na build:mobile.

## Wdrożenie (decyzje usera 2026-08-12)

Pakiet wychodzi w DWÓCH buildach, deploy PRE-AUTORYZOWANY przez usera
(czat 2026-08-12: "wdroz wszystkie poprawki"):

1. **Wydanie 1 (etapy A+B + backfill):** po komplecie bramek deploy web +
   iOS (bump z repo) + Android AAB. Functions niepotrzebne (brak nowych
   puszy w A/B).
2. **Wydanie 2 (etap C):** kroki C startują DOPIERO po wydaniu builda
   wydania 1 (build nie może zabrać niedokończonych kroków C). Po komplecie
   bramek deploy web + iOS + AAB + functions (push z C3/C4).
