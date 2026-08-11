# PROMPT: Runna pakiet 1 (pętla sesji + tydzień + odstępstwa) — do /loop

> Odpalany w nowym oknie przez `/loop`. Każda iteracja robi JEDEN nieodhaczony
> krok ze STANU poniżej, weryfikuje, odhacza, commituje. Wszystkie kroki
> odhaczone i krok 15 zadany userowi = zakończ pętlę (stop) i podsumuj.

## BRAMKA STARTOWA (sprawdzaj na początku KAŻDEJ iteracji)

Ten pakiet NIE MOŻE się mieszać z pakietem przełożenia treningu. Zanim
zrobisz cokolwiek: otwórz `docs/PROMPT-WDROZENIE-PRZELOZENIE-ONBOARDING-2026-08-11.md`.
Jeżeli JAKIKOLWIEK jego krok jest nieodhaczony albo `git status` pokazuje
cudze niezacommitowane zmiany: NIE wykonuj kroku, zakończ iterację z noop
(pętla sprawdzi później). Zależność realna: krok 9 używa `scheduleOverrides`
z tamtego pakietu.

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
   systemowe. Mechaniki timera przerwy NIE ruszać (krok 8 to prezentacja).
3. **Niezmiennik globalny**: user ignorujący nowe funkcje ma DOKŁADNIE
   dzisiejsze zachowanie. Każdy krok dodaje test "stara ścieżka nietknięta".
4. **Nie dotykaj**: `Onboarding.tsx`, `ConsentCheckboxes`, paywall (osobne
   pakiety) oraz mechaniki notyfikacji/deadline timera.
5. **Nowe pole dokumentu = rules hasOnly + testy rules + sprawdzony mapper**
   (lekcja builda 88: mapper pole-po-polu gubi nowe pola).
6. Chirurgicznie: jeden krok = jeden commit. Test przed fixem. Bramki przed
   odhaczeniem: `npm run test`, `typecheck`, `lint` (+ rules/functions gdy
   krok ich dotyka). Ton komunikatów: neutralny, bez pretensji.
7. **Deploy: NIGDY sam.** Krok 15 to pytanie do usera, nie akcja.

## STAN (odhaczaj [x] po weryfikacji, commituj ten plik razem z krokiem)

- [ ] **1. Ocena sesji: model + rules.** Pole oceny (kciuk + chipsy) na
  dokumencie sesji, rules hasOnly + testy, mapper sprawdzony. Zapis z ekranu
  completion jeszcze bez UI (czysta warstwa danych + testy).
- [ ] **2. Sekwencja completion.** Celebracja → kciuk/chipsy → podsumowanie
  deterministyczne (tonaż, czas, serie, PR per ćwiczenie, plan vs wykonanie)
  → powrót z podświetlonym następnym dniem (spec A1). Brzegi: pusta sesja
  bez celebracji, ocena pomijalna, offline. Testy komponentów + sekwencji.
- [ ] **3. "Sprawdź serie" przed zapisem.** Opcjonalna edycja inline po
  "Zakończ", przed celebracją (spec A3); sanityzacja kg; test: poprawka
  widoczna w zapisie finalnym i historii.
- [ ] **4. Ocena zasila silnik.** "Za ciężko" obniża NASTĘPNĄ propozycję,
  kciuk góra = normalna progresja, brak oceny = zachowanie identyczne jak
  dziś (spec A2). Test sekwencji dwóch sesji.
- [ ] **5. Share card + celebracja PR.** Render HTML/CSS 1080x1920 wg layoutu
  z raportu cz. 2 sekcja 3.2 (hero wybierane, glass, limonka), share sheet,
  PR toast w sesji (spec A4). Test renderu (snapshot DOM) + brzegi.
- [ ] **6. Karta tygodnia.** Checkmarki dni (w tym dzień przełożony
  w NOWEJ dacie i pominięty jako wygaszony), pasek sesji, tonaż tygodnia
  (spec B1). Testy: agregacja + overrides + stany brzegowe.
- [ ] **7. Dashboard: kolejność + dzień wolny.** Sekcje wg B2, karta
  regeneracji, "Szybki trening" na dole. Test niezmiennika: wszystkie
  dotychczasowe elementy Dashboardu obecne (wzorzec profile-sections).
- [ ] **8. WorkoutDay: przerwa-hero + press-and-hold.** Prezentacja dwóch
  stanów (B3), przytrzymanie na "Zakończ" z fallbackiem a11y, skip tanim
  tapem. Mechanika timera bez zmian (test: te same wywołania notyfikacji
  co przed zmianą).
- [ ] **9. Pomiń trening.** Stan skipped per data (model, rules, UI w menu
  karty dnia i w trayu), odwracalny, wygaszony checkmark w tygodniu,
  silnik neutralny wobec skipa (spec C1). Testy modelu + rules + UI.
- [ ] **10. Tray zaległości (minimalny).** Trigger, sheet [Pomiń]/[Przenieś]/
  [Kontynuuj od dziś z propozycją silnika], pamięć odrzucenia, cisza przy
  aktywnym drafcie (spec C2). Test sekwencji: zaległość → każda opcja.
- [ ] **11. Tryb "nie na 100%".** Model okresu + redukcja propozycji + rampa
  powrotu + badge + wyłączalność (spec C3). Push przed końcem (functions
  + testy). Test pełnego cyklu życia trybu i kolizji z deloadem.
- [ ] **12. Tryb urlopu.** Deklaracja z datami, przetasowanie deloadu,
  wydłużenie cyklu o pełne tygodnie (id dni bez zmian, X19), rampa, push
  powrotny, anulowanie, wykluczenie z C3 (spec C4). Testy silnika + sekwencji.
- [ ] **13. Ad-hoc zasila silnik.** Audyt przepływu (tonaż tygodnia, historia
  ciężarów, propozycje); test odtwarzający lukę, potem domknięcie (spec C5).
- [ ] **14. Bramki całości + DECYZJE.md.** `npm run test` + `typecheck` +
  `lint` + `build` + `build:mobile` + `check:dist-smoke` + testy functions +
  `test:rules` + `e2e:mock`. Wpis do DECYZJE.md (co, dlaczego, spec,
  weryfikacja, commity).
- [ ] **15. STOP: zapytaj usera o deploy.** Web + iOS (bump z repo) +
  Android AAB + functions (jeśli 11/12 dodały push). Zaproponuj też opcję
  podziału na dwa wydania (A+B teraz, C później). DOPIERO po jego zgodzie.

## Koniec pętli

Kroki 1-14 odhaczone i krok 15 zadany userowi = stop pętli, podsumowanie:
co zmienione, jakie testy, co czeka na zgodę i testy urządzeniowe
(scenariusze: completion + press-and-hold + tray + tryby na iPhone).
