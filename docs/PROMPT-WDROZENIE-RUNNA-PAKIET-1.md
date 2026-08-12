# PROMPT: Runna pakiet 1 (pętla sesji + tydzień + odstępstwa) — do /loop

> Odpalany przez `/loop`. Każda iteracja robi JEDEN nieodhaczony krok ze
> STANU poniżej, weryfikuje, odhacza, commituje. Pakiet wychodzi w DWÓCH
> wydaniach (kroki 11 i 18 to deploye, pre-autoryzowane). Wszystkie kroki
> odhaczone = zakończ pętlę (stop) i podsumuj.

## BRAMKA STARTOWA (sprawdzaj na początku KAŻDEJ iteracji)

Ten pakiet NIE MOŻE się mieszać z pakietem przełożenia treningu. Zanim
zrobisz cokolwiek: otwórz `docs/PROMPT-WDROZENIE-PRZELOZENIE-ONBOARDING-2026-08-11.md`.
Jeżeli JAKIKOLWIEK jego krok jest nieodhaczony albo `git status` pokazuje
cudze niezacommitowane zmiany: NIE wykonuj kroku, zakończ iterację z noop
(pętla sprawdzi później). Zależność realna: kroki 12-13 używają
`scheduleOverrides` z tamtego pakietu. Stan na 2026-08-12: tamta pętla
domknięta i wydana (iOS 93, AAB v9), bramka OTWARTA.

## Kontekst

Spec: `docs/superpowers/specs/2026-08-11-runna-pakiet-1-design.md`.
Raport źródłowy (layouty ekranów!): `docs/RESEARCH-RUNNA-2026-08-11.md`.
Czytaj OBA przed pierwszym krokiem każdej iteracji. Obowiązuje CLAUDE.md
projektu (Karpathy, checklist, i18n w OBU plikach, sekwencje, dane usera
święte).

## Twarde zasady

1. **Adaptacja za zgodą**: żadna logika pakietu nie zmienia planu, ciężarów
   ani cyklu bez jawnego tapnięcia usera. Propozycja → akceptacja → odwracalne.
2. **Środowisko siłowni**: zero nowych timerów JS; sygnały czasowe wyłącznie
   systemowe. Mechaniki timera przerwy NIE ruszać (krok 9 to prezentacja).
3. **Niezmiennik globalny**: user ignorujący nowe funkcje ma DOKŁADNIE
   dzisiejsze zachowanie. Każdy krok dodaje test "stara ścieżka nietknięta".
4. **Nie dotykaj**: `Onboarding.tsx`, `ConsentCheckboxes`, paywall (osobne
   pakiety) oraz mechaniki notyfikacji/deadline timera.
5. **Nowe pole dokumentu = rules hasOnly + testy rules + sprawdzony mapper**
   (lekcja builda 88: mapper pole-po-polu gubi nowe pola).
6. Chirurgicznie: jeden krok = jeden commit. Test przed fixem. Bramki przed
   odhaczeniem: `npm run test`, `typecheck`, `lint` (+ rules/functions gdy
   krok ich dotyka). Ton komunikatów: neutralny, bez pretensji.
7. **Deploy PRE-AUTORYZOWANY.** User (czat 2026-08-12: "odpal loop i pracuj
   w petli [...] wdroz wszystkie poprawki") autoryzował z góry deploy OBU
   wydań. Kroki 11 i 18 WYKONUJĄ pełny deploy i raportują dowody, nie
   pytają. Obowiązuje pełny checklist wdrożeniowy z CLAUDE.md projektu.

## STAN (odhaczaj [x] po weryfikacji, commituj ten plik razem z krokiem)

### WYDANIE 1: etapy A+B + backfill

- [x] **1. Ocena sesji: model + rules.** Pole oceny (kciuk + chipsy) na
  dokumencie sesji, rules hasOnly + testy, mapper sprawdzony. Zapis z ekranu
  completion jeszcze bez UI (czysta warstwa danych + testy).
- [x] **2. Sekwencja completion.** Celebracja → kciuk/chipsy → podsumowanie
  deterministyczne (tonaż, czas, serie, PR per ćwiczenie, plan vs wykonanie)
  → powrót z podświetlonym następnym dniem (spec A1). Brzegi: pusta sesja
  bez celebracji, ocena pomijalna, offline. Testy komponentów + sekwencji.
- [x] **3. Edycja serii z podsumowania.** BEZ osobnego ekranu po "Zakończ"
  (decyzja 2026-08-12): edycja inline ciężaru/powtórzeń dostępna z ekranu
  podsumowania completion (spec A3), przez istniejącą ścieżkę edycji sesji;
  sanityzacja kg; test: poprawka widoczna w historii i danych silnika.
- [x] **4. Ocena zasila silnik.** "Za ciężko" obniża NASTĘPNĄ propozycję,
  kciuk góra = normalna progresja, brak oceny = zachowanie identyczne jak
  dziś (spec A2). Test sekwencji dwóch sesji.
- [x] **5. Share card + celebracja PR.** Render HTML/CSS 1080x1920 wg layoutu
  z raportu cz. 2 sekcja 3.2 (hero wybierane, glass, limonka), share sheet,
  PR toast w sesji (spec A4). Test renderu (snapshot DOM) + brzegi.
- [x] **6. Backfill rekordów.** Ręczne stare PR-y w bojach głównych (Profil,
  sekcja TWOJE DANE); detekcja PR porównuje z max(historia w apce, backfill);
  walidacja nierealnych wartości (życzliwy komunikat); kg kanoniczne; rules
  hasOnly + testy + sprawdzony mapper (spec A5).
- [x] **7. Karta tygodnia.** Checkmarki dni (w tym dzień przełożony
  w NOWEJ dacie i pominięty jako wygaszony), pasek sesji, tonaż tygodnia
  (spec B1). Testy: agregacja + overrides + stany brzegowe.
- [x] **8. Dashboard: kolejność + dzień wolny.** Sekcje wg B2, karta
  regeneracji, "Szybki trening" na dole. Test niezmiennika: wszystkie
  dotychczasowe elementy Dashboardu obecne (wzorzec profile-sections).
- [x] **9. WorkoutDay: przerwa-hero + press-and-hold.** Prezentacja dwóch
  stanów (B3), przytrzymanie na "Zakończ" z fallbackiem a11y, skip tanim
  tapem. Mechanika timera bez zmian (test: te same wywołania notyfikacji
  co przed zmianą).
- [x] **10. Bramki wydania 1 + DECYZJE.md.** `npm run test` + `typecheck` +
  `lint` + `build` + `build:mobile` + `check:dist-smoke` + `test:rules` +
  `e2e:mock`. Wpis do DECYZJE.md (co, dlaczego, spec, weryfikacja, commity).
- [ ] **11. DEPLOY wydania 1 (pre-autoryzowany).** Web (`npm run deploy`) +
  iOS (bump CURRENT_PROJECT_VERSION z repo, `release-ios.sh` +
  `testflight_external.py`, obie grupy) + Android AAB (bump versionCode).
  Dowody (hash bundla, status TestFlight, ścieżka AAB) do DECYZJE.md.
  Kroki 12+ DOPIERO po komplecie tego kroku.

### WYDANIE 2: etap C (start po deployu wydania 1)

- [ ] **12. Pomiń trening.** Stan skipped per data (model, rules, UI w menu
  karty dnia i w trayu), odwracalny, wygaszony checkmark w tygodniu,
  silnik neutralny wobec skipa (spec C1). Testy modelu + rules + UI.
- [ ] **13. Tray zaległości (minimalny).** Trigger, sheet [Pomiń]/[Przenieś]/
  [Kontynuuj od dziś z propozycją silnika], pamięć odrzucenia, cisza przy
  aktywnym drafcie (spec C2). Test sekwencji: zaległość → każda opcja.
- [ ] **14. Tryb "nie na 100%".** Model okresu + redukcja propozycji + rampa
  powrotu + badge + wyłączalność (spec C3). Push przed końcem (functions
  + testy). Test pełnego cyklu życia trybu i kolizji z deloadem.
- [ ] **15. Tryb urlopu.** Deklaracja z datami, przetasowanie deloadu,
  wydłużenie cyklu o pełne tygodnie (id dni bez zmian, X19), rampa, push
  powrotny, anulowanie, wykluczenie z C3 (spec C4). Testy silnika + sekwencji.
- [ ] **16. Ad-hoc zasila silnik.** Audyt przepływu (tonaż tygodnia, historia
  ciężarów, propozycje); test odtwarzający lukę, potem domknięcie (spec C5).
- [ ] **17. Bramki wydania 2 + DECYZJE.md.** Jak krok 10, dodatkowo testy
  functions. Wpis do DECYZJE.md.
- [ ] **18. DEPLOY wydania 2 (pre-autoryzowany).** Web + iOS (bump z repo,
  obie grupy TestFlight) + Android AAB (bump versionCode) + functions
  (push z kroków 14/15). Dowody do DECYZJE.md.

## Koniec pętli

Kroki 1-18 odhaczone = stop pętli, podsumowanie: co zmienione, jakie testy,
co wydane (hash bundla web, numery buildów iOS/Android) i co czeka na testy
urządzeniowe usera (scenariusze: completion + press-and-hold + backfill +
tray + tryby na iPhone).
