# Plan wdrożenia: redesign zakładki Plan (plan-tab.dc.html, wariant 1b)

> Ekran: `src/pages/TrainingPlan.tsx` (+ `TrainingDayCard`, `PlanNextStepCard`).
> Spec wyglądu: `docs/design-2026-08-20/dc/plan-tab.dc.html` + `plan-tab.png`.
> Zasady: BRIEF-REDESIGN.md (fala 2). Zero nowych hexów, przechodzi
> `src/test/accent-hardcode-scan.test.ts` (strażnik limonki T24d).

## 0. Kontekst i decyzje ramowe

- Mockup pokazuje własny header (avatar G + TRAINING PLAN + Edit) i bottom nav.
  W apce header to globalny `AppHeader` (avatar-inicjał, tytuł `layout.title.plan`,
  dzwonek, licznik treningów), bottom nav to `AppNavigation`. Oba zostają BEZ ZMIAN,
  ekran realizuje tylko treść pod headerem. Przycisk Edit z mockupu ląduje w bloku
  tytułu strony (rząd akcji, jak dziś po T16).
- Mockup nie pokazuje: Cykli, DeloadBanner, HybridWeekStrip, rules tip, kalendarza
  desktop, akcji przełóż/pomiń, kart cardio. Zasada 1 briefu: wszystko zostaje,
  wkomponowane w język wizualny mockupu (szczegóły w sekcji 2).
- "Cykle i Historia dostępne": Cykle = drugi pill obok Edytuj w rzędzie akcji
  (dokładnie jak dziś, testid `plan-cycles-link` bez zmian). Historia = zakładka
  bottom nav (bez zmian) plus badge "Historia" przy przeglądaniu przeszłych
  tygodni (istniejący `trainingplan.history`). Nie dokładamy trzeciego przycisku.
- Notatki dnia (T10): wejście przez klik w kartę dnia -> WorkoutDay ->
  `WorkoutDayNoteSection`. Karty dni pozostają klikalne z tym samym routingiem,
  więc wejście zachowane bez dodatkowej pracy.
- Mockup ma tytuł planu "Hypertrophy II". Zapisany plan NIE MA pola nazwy
  (meta w `useTrainingPlan` bez name; nazwa istnieje tylko w szablonach wizarda).
  Nie zmyślamy danych: tytułem display zostaje h1 `trainingplan.title`
  ("Plan treningowy"), co przy okazji trzyma zielony e2e `critical.spec.ts`.

## 1. Inwentarz funkcji do zachowania (34 pozycje)

| # | Funkcja (stan obecny) | Miejsce w nowym designie |
|---|---|---|
| 1 | h1 "Plan treningowy" (e2e critical: heading w main) | Duży tytuł display bloku tytułu (font-heading, jak "Hypertrophy II" na mockupie) |
| 2 | Podsumowanie programu `trainingplan.programSummary` (e2e: /tygodniowy program/i) | Linia meta nr 1 pod paskiem postępu (mockupowa linia "Mon · Tue · Thu · Fri") |
| 3 | Przycisk Cykle `plan-cycles-link` -> /cycles | Pill w rzędzie akcji tytułu, obok Edytuj (styl mockupowego pilla Edit) |
| 4 | Przycisk Edytuj -> /plan/edit | Pill w rzędzie akcji tytułu (ikona Pencil + label, rounded-full, bg-surface-high) |
| 5 | Badge "Tydzień {x}/{y}" / "Historia" (e2e: /Tydzień \d+\/\d+/) | Mono chip przy tytule (jak "WK 12/12" na mockupie): font-mono, text-primary |
| 6 | Pasek postępu planu + % (T17: liczony z treningów) + etykiety Start/%/Koniec | Pasek pełnej szerokości pod tytułem (h-1.5, tor bg-surface-high, fill token akcentu); etykiety zwinięte: % zostaje w linii meta nr 2, Start/Koniec znikają wizualnie ale % ukończenia (jedyna informacja) zostaje |
| 7 | PlanNextStepCard `plan-next-step` (kontynuuj / powtórz / przygotuj nowy, emisja zdarzenia ended, isRepeating, toasty repeat) | Banner "Decide" pod blokiem tytułu: bg-surface-low + ring-1 ring-inset ring-primary/40, akcja jako pill bg-primary/15 text-primary; wszystkie akcje i testid bez zmian |
| 8 | DeloadBanner (`deload-banner`, `deload-apply`, `deload-active-badge`, tylko planStarted) | Bez zmian funkcjonalnych, pod bannerem Decide (dzisiejsza pozycja) |
| 9 | Strzałka tygodnia wstecz | Okrągły przycisk w-8 h-8 rounded-full bg-surface-high (mockup) |
| 10 | Strzałka tygodnia naprzód | Jak wyżej, drugi przycisk |
| 11 | Zakres dat tygodnia (dd.MM – dd.MM.rrrr) | Mono label po lewej rzędu nawigacji (font-mono, tracking-wide, text-foreground/80) |
| 12 | Link "← Bieżący tydzień" (gdy displayWeek != actualCurrentWeek) | Zostaje w rzędzie nawigacji tygodnia (pod zakresem dat na wąskich) |
| 13 | Nagłówek dnia timeline (nazwa dnia + data) | Wchodzi DO karty dnia: meta "PON 17 · {focus} · {n} ćwiczeń" (mockup); nagłówek nad kartą zostaje tylko dla dni bez karty treningu (samo cardio) |
| 14 | "Dodaj cardio" per dzień `add-cardio-day-<date>` | Ikona HeartPulse w nagłówku dnia / rzędzie akcji dnia (jak dziś, nad kartami) |
| 15 | Skrót Edytuj per dzień treningowy (-> /plan/edit) | Zostaje obok "dodaj cardio" w rzędzie akcji dnia |
| 16 | Karty cardio `manual-activity-card` (StravaActivityCard) + edycja manualnych | Bez zmian, renderowane w dniu nad/pod kartą treningu |
| 17 | Klik karty dnia -> WorkoutDay (ukończony: buildWorkoutRoute; inny: /workout/:dayId?date=) | Cała karta klikalna (jak dziś); wejście do notatek dnia T10 zachowane |
| 18 | Status ukończony / ukończony dziś (badge) | Badge "ZROBIONY"/"DZIŚ" w przygaszonym akcencie (bg-primary/15 text-primary) + ikona check po prawej (mockup) |
| 19 | Status zaległy missed (przeszły nieukończony, nie pominięty) | Badge destructive (bez zmian semantyki), karta opacity-60 |
| 20 | Status pominięty skipped (wyciszony, bez pretensji) | Badge neutralny dashed (bez zmian), karta opacity-50 |
| 21 | Akcja "Przełóż trening" (aria-label, e2e reschedule-flow) | Ikona CalendarClock na karcie (jak dziś); aria-label "Przełóż trening" bez zmian |
| 22 | Akcja Pomiń/Przywróć `day-skip-toggle` + toasty | Ikona na karcie (jak dziś) |
| 23 | Karty ukończonych treningów spoza planu (workoutToDay) | Ta sama nowa karta dnia (wariant bez planu) |
| 24 | Sortowanie T9 (tydzień z dziś: dziś pierwszy, minione na dole) | Logika bez zmian (orderTimelineDayKeys) |
| 25 | Kafle statystyk Tydzień / Ukończone / Pozostało | Dane zwinięte do bloku tytułu: tydzień = chip "Tydzień x/y", ukończone+pozostałe = linia meta nr 2 "{done} zrobione · {left} zostało" (nowy klucz i18n); kafle znikają jako osobne pudełka, informacja zostaje w 100% |
| 26 | Kalendarz miesięczny desktop (lg): siatka, nawigacja miesięcy, stany dni | Bez zmian (prawa kolumna lg; mockup jest mobile 390px) |
| 27 | Legenda kalendarza (Ukończone / Zaplanowane / Strava przy canUseStrava) | Bez zmian |
| 28 | Karta wybranego dnia (desktop): status, "Przejdź do treningu", lista strava | Bez zmian |
| 29 | HybridWeekStrip (`hybrid-week-strip`, `interference-banner`, `interference-dismiss`, persystencja dismissu) | Bez zmian, pozycja po liście dni (kolejność T9 z plan-tab-order.test) |
| 30 | Przycisk "Nie na 100%?" `plan-reduced-open` + stan aktywny z datą + ReducedModeDialog (kolizja z urlopem) + toasty | Stopka mockupu: lewy przycisk (HeartPulse + label, h-12 rounded-xl bg-surface-low); stan aktywny jak dziś (border-fitness-warning bg-fitness-warning/10) |
| 31 | Przycisk "Urlop / wyjazd" `plan-vacation-open` + stan aktywny + VacationDialog + toasty | Stopka mockupu: prawy przycisk (Plane + label); stan aktywny border-primary/40 bg-primary/10 |
| 32 | Rules tip (waga + przerwy z getTrainingRules) | Zostaje na samym dole (pod stopką trybów), dzisiejszy styl tokenowy |
| 33 | AddCardioDialog (dodanie z defaultDate / edycja / usunięcie) | Bez zmian (mount na końcu) |
| 34 | RescheduleSheet (zamknięcie PRZED mutacją, lekcja b.92) + toasty moved/swapped/failed | Bez zmian |

## 2. Struktura nowego ekranu (sekcja po sekcji) + mapowanie stylów

Kolejność DOM identyczna z dzisiejszą tam, gdzie pilnuje jej
`src/test/plan-tab-order.test.tsx` (timeline -> hybrid strip -> tryby -> tip).
Zewnętrzny wrapper `.exercise-card` znika: sekcje leżą bezpośrednio na tle
(mockup: karty na #0e0e0e = `bg-background`).

Mapowanie neutralnych hexów mockupu na tokeny (dark; light załatwiają tokeny):

| Hex mockupu | Token / klasa apki |
|---|---|
| #0e0e0e (tło strony) | `bg-background` (via Layout, nic nie dodajemy) |
| #131313 (sekcje, banner, stopka) | `bg-surface-low` |
| #1c1c1c (karty dni, chipy) | `bg-surface-high` |
| #262626 (tor pasków) | `bg-surface-highest` |
| #f2f1ee (tekst główny) | `text-foreground` |
| #dedcd6 (tekst wtórny mocny) | `text-foreground/80` |
| #9a9892 (meta) | `text-muted-foreground` |
| #767469 (najciemniejszy) | `text-muted-foreground/70` |
| var(--acc) | `primary` (`text-primary`, `bg-primary`, `bg-primary/10`, `bg-primary/15`, `bg-primary/40`, `ring-primary/40`); tekst na wypełnionym akcencie: `text-primary-foreground` |
| color-mix(acc 11%, #0e0e0e) (karta NEXT) | `bg-primary/10` |
| color-mix(acc 15-16%, transparent) (badge/pill) | `bg-primary/15` |
| color-mix(acc 40-45%, ...) (paski done, ring) | `bg-primary/40`, `ring-primary/40` |

Fonty: Space Grotesk = `font-heading` (już w tailwind.config), Inter = domyślny
body, mono = `font-mono` (domyślny stack Tailwind ui-monospace). ZERO nowych
`<link>` do Google Fonts.

### S1. Blok tytułu

- Rząd 1: `h1` "Plan treningowy" (`font-heading font-bold tracking-tight`,
  ~`text-2xl`, bez italic, jak display mockupu) + chip `font-mono text-[11px]
  tracking-[0.1em] text-primary` z `trainingplan.weekOf` (lub `trainingplan.history`
  dla tygodni przeszłych). Zachowuje oba warunki e2e critical.
- Rząd akcji (na wąskich pod tytułem, wzorzec T16): pill Edytuj + pill Cykle,
  `h-9 rounded-full bg-surface-high text-[13px] font-medium` z ikonami 3.5.
- Pasek postępu: `h-1.5 rounded-full bg-surface-high` + fill
  `bg-gradient-to-r from-primary-light to-primary` (istniejący wzorzec tokenowy),
  szerokość = progressPercent (T17 bez zmian).
- Linia meta nr 1: `trainingplan.programSummary` (text-[12.5px]
  text-muted-foreground) - trzyma e2e.
- Linia meta nr 2 (nowa): `trainingplan.metaProgress` =
  "{done} zrobione · {left} zostało · {percent}%" (dane: completedInPlan,
  remainingWorkouts, progressPercent; wszystkie już liczone).

### S2. Banner decyzji (PlanNextStepCard, restyle w komponencie)

- Kontener: `rounded-2xl bg-surface-low ring-1 ring-inset ring-primary/40`
  dla tone primary/info; tone warning/success zostają na fitness-warning /
  fitness-success z tłem /10 (semantyka statusu, reguła 8 CLAUDE.md).
- Lewa kolumna: tytuł kroku (text-foreground/80 font-medium) + opis
  (text-muted-foreground). Opcjonalna linia statystyk (pkt nowych funkcji nr 3).
- Prawa: główna akcja jako pill `h-11 px-4 rounded-full bg-primary/15
  text-primary font-semibold` (mockupowy "Decide"); akcje wtórne jak dziś.
- Testid `plan-next-step`, emisja zdarzenia, badges, dismiss: bez zmian.

### S3. DeloadBanner

Bez zmian funkcji i testidów; jedynie kosmetyka kontenera na `bg-surface-low
rounded-2xl`, kolory statusowe zostają.

### S4. Nawigacja tygodnia

- Lewa: zakres `font-mono text-[11.5px] tracking-[0.1em] text-foreground/80`.
- Prawa: dwa przyciski `w-8 h-8 rounded-full bg-surface-high text-foreground/80`
  ze strzałkami (lucide ChevronLeft/Right zamiast znaków ‹›, jak mockup SVG).
- "← Bieżący tydzień" zostaje jako tekstowy link `text-primary` gdy trzeba.

### S5. Lista dni (restyle TrainingDayCard)

Karta: `rounded-2xl p-4 bg-surface-high flex flex-col gap-2.5`; wariant NEXT:
`bg-primary/10`.

- Wiersz górny: kolumna z nazwą dnia (`font-heading font-semibold text-base`,
  truncate) i metą `text-xs text-muted-foreground` w formacie
  "PON 17 · {focus} · {n} ćwiczeń" (data: `toLocaleDateString` weekday short +
  day, uppercase; focus i liczba ćwiczeń jak dziś). Po prawej: badge statusu +
  ikona statusu + istniejące przyciski przełóż/pomiń.
- Badge statusu (`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide`):
  - ZROBIONY / DZIŚ (ukończony): `bg-primary/15 text-primary` + ikona Check
    `text-muted-foreground` po prawej (mockup: DONE w przygaszonym akcencie),
  - NASTĘPNY (nowy, patrz nowe funkcje): `bg-primary text-primary-foreground`
    + ikona Play `text-primary` (fill),
  - ZALEGŁY: `bg-destructive/15 text-destructive` (bez zmian),
  - POMINIĘTY: dashed neutral (bez zmian).
- Pasek obciążenia dnia na dole karty: tor `h-1 rounded-full bg-surface-highest`,
  fill `bg-primary` (NEXT/TODAY) lub `bg-primary/40` (pozostałe); szerokość z
  helpera load (nowe funkcje nr 5). Brak danych = pasek nierenderowany.
- Nagłówek dnia NAD kartą redukuje się do rzędu akcji (dodaj cardio + edytuj);
  dla dni z samym cardio zostaje pełny nagłówek z nazwą dnia (jak dziś).

### S6. HybridWeekStrip, S7. Stopka trybów, S8. Rules tip

- HybridWeekStrip: bez zmian (pozycja po liście, przed trybami).
- Stopka: `grid grid-cols-2 gap-2.5`; przyciski `h-12 rounded-xl bg-surface-low
  text-sm font-medium text-foreground/80` z ikoną `text-muted-foreground`
  (HeartPulse / Plane). Stany aktywne: dzisiejsze klasy semantyczne
  (fitness-warning/10, primary/10). Testidy bez zmian.
- Rules tip: bez zmian treści, kontener `bg-surface-low` zamiast primary/[0.04]
  (spójność z mockupem), border-l akcentowy zostaje.

### S9. Desktop (lg)

Grid `lg:grid-cols-[1fr_300px]` zostaje; kalendarz + karta wybranego dnia bez
zmian. Nowe karty dni działają w lewej kolumnie identycznie.

## 3. Lista zmian w plikach

1. `src/pages/TrainingPlan.tsx`
   - zdjęcie wrappera `.exercise-card`, nowy blok tytułu (S1), nowy rząd
     nawigacji tygodnia (S4), przekazanie do TrainingDayCard: `trainingDate`
     (już jest), `isNext`, `loadPercent`; usunięcie kafli statystyk na rzecz
     linii meta nr 2; stopka trybów w gridzie 2 kolumn (styl S7).
   - wyliczenie: mapa tonaży dnia bieżącego tygodnia (helper z pkt 3) i flaga
     "następnego" dnia (pierwszy nieukończony, niepominięty dzień >= dziś w
     widocznym tygodniu; najwyżej jeden).
2. `src/components/TrainingDayCard.tsx`
   - restyle wg S5 (nowe propsy `isNext?: boolean`, `loadPercent?: number`,
     opcjonalna meta z datą); wszystkie istniejące propsy, aria-labels,
     `data-testid="day-skip-toggle"` i logika statusów bez zmian.
3. `src/components/PlanNextStepCard.tsx`
   - restyle wg S2 + opcjonalny prop `statsLine?: string` (linia
     obecność/PR); testid i akcje bez zmian.
4. `src/lib/plan-day-load.ts` (NOWY, czysty helper)
   - `buildDayLoadMap(workouts, weekStartISO, weekEndISO): Map<dateISO, percent>`
     na bazie `calculateTonnage` z `summary-utils` (reużycie, bez kopiowania);
     percent = tonaż dnia / max tonaż dnia w tygodniu; pusta mapa gdy max = 0.
   - `findNextPlannedDate(scheduleDates, completedDates, skippedDates, todayISO)`.
5. `src/i18n/locales/pl.ts` + `src/i18n/locales/en.ts` - nowe klucze (sekcja 4).
6. Testy: `src/test/plan-day-load.test.ts` (nowy),
   `src/test/training-day-card-next.test.tsx` (nowy),
   ewentualne dopasowanie snapshotów w `plan-tab-order.test.tsx` NIE jest
   potrzebne (test opiera się na testidach i kolejności DOM, obie zachowane).

Nie dotykamy: `src/index.css`, `tailwind.config.ts` (wszystko z istniejących
tokenów), `AppHeader`, `AppNavigation`, `Layout`, hooki danych, e2e specy.

## 4. Nowe klucze i18n (pl + en)

| Klucz | PL | EN |
|---|---|---|
| `trainingplan.metaProgress` | `{done} zrobione · {left} zostało · {percent}%` | `{done} done · {left} left · {percent}%` |
| `dayplan.badgeNext` | `Następny` | `Next` |
| `trainingplan.decideStats` | `{attendance}% obecności · {prs} PR` | `{attendance}% attendance · {prs} PRs` |
| `trainingplan.dayLoadAria` | `Obciążenie dnia` | `Day load` |

Uwaga: oba pliki locales naraz, inaczej typecheck padnie (reguła projektu).
Klucze `trainingplan.start` / `trainingplan.end` / `trainingplan.percentDone` /
`trainingplan.statWeek|statCompleted|statRemaining` zostają w plikach (używa ich
jeszcze historia zmian; jeśli po wdrożeniu nic ich nie importuje, usunięcie
osobnym commitem porządkowym, nie w redesignie).

## 5. Testy

Istniejące, które MUSZĄ zostać zielone bez zmian speców:

- e2e `critical.spec.ts` "plan page shows current plan title and schedule
  summary": h1 "Plan treningowy" w main, /tygodniowy program/i, /Tydzień \d+\/\d+/.
- e2e `full-app.spec.ts:679` + `mobile-nav-reachability.spec.ts:69`:
  `plan-cycles-link` klikalny na /plan.
- e2e `full-app.spec.ts:1137`: `manual-activity-card` na /plan (dodanie, edycja,
  usunięcie cardio; teksty "Bieżnia", "30m").
- e2e `full-app.spec.ts:1222`: `hybrid-week-strip`, `interference-banner`,
  `interference-dismiss` + persystencja po reload.
- e2e `full-app.spec.ts:1334`: `deload-banner`, `deload-apply`,
  `deload-active-badge`.
- e2e `reschedule-flow.spec.ts`: button aria "Przełóż trening" na karcie,
  heading sheeta, brak blokad Radix po zamknięciu, zapis overrides.
- unit `plan-tab-order.test.tsx` (niezmiennik T9 + zasada 5): kolejność
  timeline -> hybrid -> tryby oraz obecność `plan-cycles-link`,
  `plan-reduced-open`, `plan-vacation-open`, `hybrid-week-strip`,
  `day-skip-toggle`, `add-cardio-day-<data>`. Nowy layout NIE zmienia kolejności.
- unit `training-day-card-icons.test.tsx` (zero emoji).
- unit `accent-hardcode-scan.test.ts` (strażnik limonki): żadnych hexów ani
  klas lime-* w zmienianych plikach.
- unit `plan-progress.test.ts`, `plan-timeline-order.test.ts`,
  `count-remaining-workouts.test.ts`: nietknięte (logika bez zmian).

Nowe testy:

- `plan-day-load.test.ts`: procenty względem max tygodnia; tydzień bez tonażu =
  pusta mapa (pasków brak); jeden trening = 100%; treningi z samą rozgrzewką =
  tonaż 0; `findNextPlannedDate`: pomija ukończone i pominięte, zwraca najwyżej
  jedną datę, brak kandydata = null (tydzień historyczny, wszystko zrobione).
- `training-day-card-next.test.tsx`: wariant NEXT renderuje badge
  `dayplan.badgeNext` i nie renderuje go żaden inny stan; niezmiennik: stany
  completed/missed/skipped renderują dokładnie te badge co przed zmianą;
  loadPercent undefined = brak paska w DOM.
- Rozszerzenie `plan-next-step-card.test.tsx`: `statsLine` renderowana gdy
  podana, brak linii gdy undefined (zero zmyślonych danych).

Niezmienniki (zasada 5 CLAUDE.md):

- Lista dni tygodnia z planu jest kompletna, sesje tylko DOKŁADAJĄ karty
  (workoutItem branch nie znika).
- Żaden testid ani aria-label z inwentarza nie zmienia nazwy.

Bramka designu: `npm run test`, `typecheck`, `lint`, `build`, potem screenshot
e2e-mock viewport 390 vs `plan-tab.png` na 3 akcentach (limonka default, amber,
sky) - zero pozostałości innego akcentu, struktura zgodna z mockupem.

## 6. Ryzyka i edge-case'y

1. **Brak planu** (trainingPlan.length === 0): blok tytułu renderuje
   programSummary z pustą listą dni; pasek postępu 0%; lista dni pusta;
   PlanNextStepCard prowadzi do utworzenia planu; stopka i dialogi działają.
   Do sprawdzenia ręcznie po wdrożeniu (stan dzisiejszy zachowujemy 1:1).
2. **Plan niewystartowany** (start w przyszłości): week 0, progress 0, brak
   DeloadBanner (planStarted false) - logika bez zmian.
3. **Tydzień historyczny**: chip "Historia" zamiast "Tydzień x/y" (e2e wymaga
   /Tydzień \d+\/\d+/ tylko dla bieżącego stanu seedowanego - zachowane), brak
   kart planu i HybridWeekStrip, karty workoutItem + cardio zostają; load bar
   liczony z workoutów tego tygodnia.
4. **Zmiana koloru DONE z fitness-success na przygaszony akcent** (mockup).
   Ryzyko spójności: kalendarz desktop i karta wybranego dnia dalej używają
   fitness-success dla "ukończony". Decyzja: karty dni idą za mockupem
   (DONE = akcent), kalendarz zostaje bez zmian w tej fali; jeśli właściciel
   zgłosi dysonans, wyrównanie osobnym taskiem. Ikona CheckCircle na kartach
   przechodzi na neutral (jak mockup: check #9a9892).
5. **Pasek load = dane tylko z ukończonych treningów.** Dni przyszłe i tygodnie
   bez historii nie mają tonażu: fallback = brak paska (wymóg zadania, zero
   zmyślonych danych). Tydzień, w którym nic nie ukończono: żadna karta nie ma
   paska, layout kart musi wyglądać dobrze bez niego (gap warunkowy).
6. **Długie teksty**: nazwy dni/focus po polsku (np. "Czwartek · Klatka i
   triceps · 8 ćwiczeń") - truncate z min-w-0 na kolumnie tekstu, badge i ikony
   shrink-0; linia meta nr 1 może się łamać (dozwolone). Test wizualny na 390px.
7. **Wiele elementów jednego dnia** (trening + 2x cardio): karty stackują się
   w dniu jak dziś; rząd akcji dnia nie znika.
8. **Offline**: bez zmian (dane z cache Firestore/localStorage; akcje kolejkowane).
   Redesign nie dodaje żadnych timerów, scrolla ani zapisu - checklist
   background/resume nie jest wyzwalany, ale test przerwania sekwencji
   (plan -> wyjście -> szybki trening -> powrót) obowiązkowy przed wdrożeniem.
9. **Radix**: RescheduleSheet/dialogi bez zmian cyklu życia (zamknięcie przed
   mutacją, lekcja b.92) - nie przenosić ich w drzewie warunkowo.
10. **`decideStats` tylko z realnych danych**: liveActiveCycle.stats
    (completionRate, prs.length) istnieje wyłącznie przy aktywnym cyklu;
    brak cyklu = linia nierenderowana, żadnych placeholderów.
11. **Touch/WebView**: nowe przyciski dziedziczą baseline (touch-action,
    user-select) z index.css; nic nie nadpisujemy.

## 7. Kolejność kroków implementacji

1. `src/lib/plan-day-load.ts` + `plan-day-load.test.ts` (TDD, czysta logika,
   reużycie calculateTonnage) -> weryfikacja: test zielony.
2. Klucze i18n do pl.ts + en.ts -> weryfikacja: `npm run typecheck`.
3. `TrainingDayCard.tsx`: nowe propsy + restyle + `training-day-card-next.test.tsx`
   i niezmiennik istniejących badge -> weryfikacja: testy karty +
   `training-day-card-icons` zielone.
4. `PlanNextStepCard.tsx`: restyle + statsLine + rozszerzenie testu ->
   weryfikacja: `plan-next-step-card.test.tsx`.
5. `TrainingPlan.tsx`: blok tytułu, nawigacja tygodnia, wiring next/load,
   linia meta, stopka; usunięcie kafli statystyk -> weryfikacja:
   `plan-tab-order.test.tsx` (bez modyfikacji spec!), `npm run test` całość.
6. Bramki: `npm run test`, `npm run typecheck`, `npm run lint`,
   `npm run build` + `check:dist-smoke`.
7. e2e celowane: critical, full-app (fragmenty planu), reschedule-flow,
   mobile-nav-reachability (świeży dev server, lekcja 9: pkill vite +
   czyszczenie node_modules/.vite przed biegiem).
8. Pętla weryfikacji designu: screenshot e2e-mock 390px vs plan-tab.png,
   iteracja; powtórka na akcentach limonka/amber/sky (zero obcego akcentu);
   strażnik `accent-hardcode-scan` w pakiecie testów.
9. Ręczny scenariusz sekwencji na urządzeniu (plan -> wyjście -> szybki
   trening -> powrót -> wszystkie dni na miejscu) przed release.
