# Plan wdrożenia: redesign zakładki Historia (history-tab.dc.html, wariant 1a)

> Źródła: `docs/design-2026-08-20/dc/history-tab.dc.html` (obowiązująca specyfikacja),
> `BRIEF-REDESIGN.md`, `plan/tokens.md` (fundament tokenów fali 2, konsumowany 1:1),
> `src/pages/WorkoutHistory.tsx` (stan obecny po T1-T24), e2e: `critical`, `accent-color`,
> `email-coach-button`, `export-csv-dialog`, `full-app`, `workout-delete-from-day`,
> `mobile-nav-reachability`, strażnik `src/test/accent-hardcode-scan.test.ts`.
>
> Istota artboardu 1a: CYKLE jako poziom nadrzędny historii. Karta cyklu mówi, co
> wyprodukował (sesje, tonaż, PR, frekwencja); w środku sesje jako jednolinijkowe
> wiersze grupowane po tygodniach. Cztery przyciski wiersza → tap otwiera trening,
> reszta akcji w menu ⋯. Karta filtrów kurczy się do rzędów chipów.

---

## 0. Decyzje kierunkowe

1. **Header globalny bez zmian.** Mockup rysuje własny header (avatar G + HISTORY +
   ikony search/filter) i bottom nav — w apce to globalny `AppHeader`
   (`layout.title.history`) i `AppNavigation`. Ekran realizuje wyłącznie treść pod
   headerem (ta sama decyzja co `plan/plan-tab.md`). Ikony search/filter z mockupu
   NIE idą do `AppHeader`; wyszukiwarka zostaje w treści ekranu.
2. **Grupowanie: cykl → tydzień.** Sesje z dopasowanym cyklem (po `cycleId`,
   fallback po zakresie dat cyklu) lądują w kartach cykli; sesje bez cyklu w sekcji
   "Poza cyklami" grupowanej po miesiącach (dzisiejsza logika `groupedByMonth`
   przeniesiona tam 1:1). User bez żadnego cyklu = widok miesięczny jak dziś
   (bez pustych kart cykli).
3. **Nazwa cyklu nie istnieje w danych** (`PlanCycle` nie ma pola name — ta sama
   sytuacja co plan w `plan-tab.md`). Nie zmyślamy "Hypertrophy II": tytuł karty =
   `history.cycleTitle` "Cykl {n}" (numeracja od najstarszego), pod spodem zakres
   dat + liczba tygodni. Chip ACTIVE tylko przy `status === 'active'`.
4. **Akcje wiersza:** tap w wiersz = Otwórz trening; pozostałe akcje (Szczegóły,
   Porównaj, Wyślij do trenera, Usuń) w `DropdownMenu` pod ⋯ (nowy testid
   `history-row-menu`). Testidy `history-row-email` i `history-delete` przechodzą
   na pozycje menu (wymaga aktualizacji 4 testów e2e, patrz §5).
5. **Etykieta "Filtry" zostaje w DOM** jako eyebrow nad chipami (uppercase przez
   CSS) — `critical.spec.ts` (`getByText('Filtry')`) zostaje zielony bez zmian.
6. **Chipy filtrów zostają komponentem `Chip`** (kinetic) — `accent-color.spec.ts`
   (button /^wszystkie$/i z tłem akcentu) zostaje zielony bez zmian.
7. **Kolory WYŁĄCZNIE z tokenów** wg `plan/tokens.md` §2 + klasy pomocnicze §4
   (`.eyebrow-mono`, `.chip-mono`, `.accent-ring`, `.accent-wash`). Zero nowych
   hexów, zero `color-mix` (strażnik limonki + nowy `design-token-guard`).
8. **Statystyki cyklu bez fałszu:** zakończone cykle mają finalne `cycle.stats`
   (totalWorkouts, totalTonnage, prs[], completionRate) — pokazujemy 4 statystyki.
   Aktywny cykl ma stats nieaktualne między closeoutami, więc jego rząd statystyk
   liczymy na kliencie z `useWorkoutRange(startDate → dziś, completed)` (hook
   istnieje): sesje, tonaż, PR-y; frekwencji dla aktywnego NIE pokazujemy
   (wymagałaby liczenia expected — do zrobienia w osobnym kroku, nie zmyślać).
   Gdy range fetch padnie (offline bez cache): rząd statystyk aktywnego cyklu
   ukryty, sesje z listy widoczne normalnie.
9. **Sparkline tonażu per tydzień: POMIJAMY** (fala 2). Historia jest paginowana —
   sparkline z niepełnych danych to fałszywy wykres. Fallback: karta bez sparkline
   (informację niesie rząd statystyk + meta tygodni). Kandydat na falę 3 z danymi
   z `useWorkoutRange`.
10. **Bez separatorów 1px** (mockupowy divider `#262626` w karcie cyklu) — No-Line
    Rule z DESIGN.md/tokens.md: hierarchię robi odstęp i poziom powierzchni.
11. h1 ekranu zostaje w treści (`history.title`, e2e critical), ale **bez `italic`**
    (Space Grotesk nie ma italica — ryzyko 4 w tokens.md; spójnie z resztą fali 2).

---

## 1. Inwentarz funkcji do zachowania (37 pozycji)

Źródło: pełny przegląd `src/pages/WorkoutHistory.tsx` (stan po T1-T24). Każda
pozycja MUSI być dostępna po redesignie.

| # | Funkcja (stan obecny) | Miejsce w nowym designie |
|---|---|---|
| 1 | Stan ładowania (`common.loading`, animate-pulse przed `isLoaded`) | Bez zmian (ten sam guard na górze renderu) |
| 2 | h1 "Historia treningów" + podtytuł (e2e critical: heading w `main`) | Blok tytułu display: h1 `font-heading font-bold uppercase tracking-tight` (bez italic), podtytuł `text-muted-foreground` |
| 3 | Tytuł karty filtrów "Filtry" (e2e critical: `getByText('Filtry')`) | Eyebrow `.eyebrow-mono text-muted-foreground` nad rzędami chipów (DOM-text "Filtry", uppercase przez CSS) |
| 4 | Wyszukiwarka (data, dayId, nazwa dnia, focus, nazwy ćwiczeń przez resolver) | Pole na górze treści: `Input` `h-11 rounded-full bg-surface-low border-0 pl-9` + ikona Search; logika filtra bez zmian |
| 5 | Chip statusu "Wszystkie" (e2e accent-color: button /^wszystkie$/i, aktywny = kolor akcentu) | Rząd chipów statusu, nadal komponent `Chip` (active = `bg-accent`) |
| 6 | Chipy "Ukończone" / "Drafty" (filtr `completed` idzie też server-side do hooka) | Ten sam rząd chipów; logika `selectedStatus` bez zmian |
| 7 | Chip "Tylko z PR" (`onlyPRs` po `rowMeta.prCount`) | Ten sam rząd chipów |
| 8 | Chipy dni planu ("Wszystkie dni" + `localizeDayName`; ukryte gdy brak planu) | Drugi rząd chipów, poziomo przewijalny (`overflow-x-auto` wewnątrz kontenera — strona bez h-scrolla) |
| 9 | `DateRangeField` zakres dat (testid `history-date-range`, Wyczyść, filtr server-side) | Pod rzędami chipów, komponent bez zmian |
| 10 | Karta porównania 2 sesji: delta tonażu (jednostka + znak −), delta serii, delta ćwiczeń, nagłówek "data vs data" | Karta `rounded-xl .accent-wash` + nagłówek z ikoną `text-primary`; kafle wewnętrzne `bg-surface-low rounded-lg`, wartości `font-heading tabular-nums` |
| 11 | Licznik przefiltrowanych sesji z odmianą PL (`sessionOne/Few/Many`) | Linia zbiorcza nad listą (lewa strona, `.eyebrow-mono`), rozszerzona o liczbę cykli (§2.F) |
| 12 | Hint "max 2 treningi do porównania" (`history.compareHint`) | Drobny tekst `text-[11px] text-muted-foreground` pod rzędem akcji (jak w mockupie pod COMPARE) |
| 13 | Przycisk "Wyślij do trenera" — cała historia (testid `history-email`, `EmailWorkoutDialog mode="history"`, initialEmail z `preferences.trainerEmail`) | Rząd akcji: przycisk `variant="outline" h-11 rounded-full flex-1` (pigułka jak mockupowy "Send to coach") |
| 14 | Przycisk "Eksport CSV" (testid `history-export-csv`, `ExportWorkoutsDialog` z cycles) | Ten sam rząd akcji, druga pigułka |
| 15 | Dialog maila POJEDYNCZEGO treningu (mode="workout", **zawsze zamontowany**, zamykanie tylko przez `open=false` — pułapka Radix z CLAUDE.md) | Bez zmian strukturalnych (nadal stały mount pod ekranem); otwierany z menu ⋯ wiersza |
| 16 | Grupowanie chronologiczne z nagłówkiem grupy (liczba sesji + tonaż grupy) | Cykle: meta tygodnia "{n} sesji · {t} {unit}" w nagłówku tygodnia; "Poza cyklami": nagłówki miesięcy jak dziś (przeniesiona logika `groupedByMonth`) |
| 17 | Data sesji w wierszu (`tabular-nums`) | Lewa kolumna wiersza: data skrócona "20 sie" `font-mono` (pełna data w rozwinięciu i dialogu usuwania) |
| 18 | Rozróżnienie statusu ukończony/draft (badge) | Draft: `.chip-mono` "draft" przy tytule wiersza; ukończony = stan domyślny (bez badge, jak mockup) + filtr statusu z poz. 6 |
| 19 | Czas trwania w wierszu bez rozwijania (`durationLabel`; e2e Z80: '1h 12m' widoczne od razu) | Linia meta wiersza: "{ćw} ćw. · {serie} serii · 1h 12m" (substring-match `getByText('1h 12m')` nadal trafia) |
| 20 | Badge PR z liczbą (`prCount`, Trophy) | Pigułka `.chip-mono bg-primary/15 text-primary` "{n} PR" po prawej stronie wiersza (mockup: akcent, nie warning — PR to osiągnięcie, nie ostrzeżenie) |
| 21 | Etykieta dnia: nazwa dnia · focus (resolver + localize + `noFocus`; snapshot "Szybki trening" — e2e) | Tytuł wiersza (środek): `text-sm font-medium truncate`; focus w rozwinięciu, gdy tytuł by nie mieścił obu (patrz §6.7) |
| 22 | Statystyki wiersza: liczba ćwiczeń / tonaż w jednostce usera / ukończone serie robocze (B-T1) | Ćwiczenia+serie w linii meta; tonaż wyeksponowany po prawej `font-mono font-semibold tabular-nums` (jak mockup "5,579") |
| 23 | Akcja "Otwórz trening" → `/workout/{dayId}?date=&session=` | Tap w wiersz (cały wiersz, poza ⋯) + pozycja "Otwórz trening" w menu ⋯ (dubel dla dostępności) |
| 24 | Akcja "Porównaj"/"Usuń z porównania" (toggle, max 2, FIFO) + wyróżnienie zaznaczonego wiersza | Pozycja w menu ⋯; zaznaczony wiersz: `.accent-ring` + `bg-primary/[0.08]` |
| 25 | Akcja "Szczegóły" (rozwiń/zwiń, wiele naraz) | Pozycja w menu ⋯ (rozwinięcie renderuje się pod wierszem); testy e2e aktualizowane (§5) |
| 26 | Akcja "Wyślij do trenera" per wiersz (testid `history-row-email`) | Pozycja w menu ⋯ z tym samym testid |
| 27 | Akcja "Usuń" (testid `history-delete`) | Pozycja w menu ⋯ z tym samym testid, styl destructive |
| 28 | Dialog potwierdzenia usunięcia (testidy `history-delete-dialog`/`history-delete-confirm`, opis z dniem i datą, spinner `isDeleting`, destructive) + `deleteWorkoutEverywhere` + toasty + czyszczenie `compareIds`/`deletedIds` | Bez zmian logicznych; AlertDialog zostaje jak jest |
| 29 | Rozwinięcie: serie robocze per ćwiczenie z `formatHistorySetLabel` (BW / czas 1:30 / dystans / asysta 8×-25 kg; przekreślenie nieukończonych) — e2e tracked labels | Panel rozwinięcia pod wierszem; markup jak dziś, tła zmapowane na poziomy surface (§2.J) |
| 30 | Rozwinięcie: metryki RPE / ból / technika | Bez zmian w panelu rozwinięcia |
| 31 | Rozwinięcie: notatka ćwiczenia (StickyNote) | Bez zmian w panelu rozwinięcia |
| 32 | Rozwinięcie: notatka dnia (`notes.dayNote`) | Bez zmian w panelu rozwinięcia |
| 33 | Paginacja "Załaduj więcej" (`hasMore`/`isLoadingMore`, filtry server-side) | Przycisk na dole listy `variant="outline" rounded-full h-11` (globalny, pod wszystkimi grupami) |
| 34 | Empty state zero treningów: `EmptyState` + CTA "Zacznij pierwszy trening" → `/` (Z82) | Bez zmian logicznych |
| 35 | Empty state brak wyników filtrów (`history.empty`) | Karta `bg-surface-low rounded-xl p-8 text-center text-muted-foreground` |
| 36 | Jednostki kg/lb przez `useUnit`/`toDisplay` wszędzie (tonaż, serie, delty) | Bez zmian; dotyczy też nowych statystyk cykli i mety tygodni |
| 37 | Sortowanie malejąco po dacie (`parseLocalDate`) | Bez zmian; grupowanie cykl→tydzień zachowuje porządek malejący wewnątrz grup |

**feature_inventory_count = 37**

---

## 2. Struktura nowego ekranu sekcja po sekcji (+ mapowanie stylów)

Wszystkie mapowania hex→token wg `plan/tokens.md` §2 (nie powtarzam pełnej tabeli;
poniżej konkretne klasy per sekcja). Ekran renderuje się w istniejącym `Layout`
(`space-y-6` → zostaje, ew. `space-y-4` dla gęstszego rytmu mockupu).

### A. Blok tytułu
- h1: `text-2xl font-heading font-bold uppercase tracking-tight` (bez `italic`,
  bez ikony History — mockup jej nie ma; ikona była dekoracją).
- Podtytuł `history.subtitle`: `text-sm text-muted-foreground`.

### B. Wyszukiwarka
- Kontener `relative`; `Input` `h-11 rounded-full bg-surface-low border-0 pl-9`
  + `Search` `h-4 w-4 text-muted-foreground` absolutnie.
- Pola formularzy zachowują zaznaczanie tekstu (baseline WebView, CLAUDE.md #7).

### C. Filtry (dawna karta → chipy)
- Eyebrow: `<p class="eyebrow-mono text-muted-foreground">{t('history.filters')}</p>`.
- Rząd 1 (status): `flex flex-wrap gap-2` z `Chip`: Wszystkie / Ukończone / Drafty /
  Tylko z PR (aktywny chip = `bg-accent text-accent-foreground` — kontrakt Chip,
  podąża za akcentem; mockup: `bg: var(--acc)`).
- Rząd 2 (dni planu, tylko gdy `trainingPlan.length > 0`): `flex gap-2
  overflow-x-auto` (scroll wewnątrz kontenera; chipy `whitespace-nowrap shrink-0`).
- Rząd 3: `DateRangeField` bez zmian (testid `history-date-range`).

### D. Rząd akcji + hint porównania
- `flex gap-2`: "Wyślij do trenera" (testid `history-email`) i "Eksport CSV"
  (testid `history-export-csv`) — `Button variant="outline" size="sm"`
  z `h-11 flex-1 rounded-full` (mockupowa pigułka "Send to coach": `#1c1c1c` →
  outline na `bg-surface-low`/`bg-surface-container`, wg wariantu Button).
- Pod spodem: `history.compareHint` `text-[11px] text-muted-foreground`
  (mockupowe "You can select up to 2 workouts to compare.").

### E. Karta porównania (gdy `compareIds.length === 2`)
- Kontener: `rounded-xl accent-wash p-4` (zamiast `border-primary/30 bg-primary/5`;
  zero borderów — wyróżnia tint + ikona `text-primary`).
- Kafle delt: `rounded-lg bg-surface-low p-3`; etykiety `.eyebrow-mono
  text-muted-foreground`; wartości `text-xl font-heading font-bold tabular-nums`.

### F. Linia zbiorcza nad listą
- `flex items-baseline justify-between`, obie strony `.eyebrow-mono text-muted-foreground`:
  - lewa: "{c} {cykl/cykle/cykli} · {s} {sesja/sesje/sesji}" (cykle tylko gdy > 0;
    liczby z PRZEFILTROWANEJ ZAŁADOWANEJ listy — uczciwe, bez all-time),
  - prawa: "{t('history.tonnage')} {x} {unit}" (suma tonażu przefiltrowanych
    załadowanych sesji, `toDisplay`).
- Mockupowe "596 t" (all-time) NIE — nie mamy pewnych danych bez pełnego skanu;
  liczby dotyczą tego, co na liście (spójne z licznikiem sesji dziś).

### G. Karta AKTYWNEGO cyklu (`bg-surface-container rounded-xl p-4 space-y-3`)
Mockup: `#1c1c1c`, radius 24 → `bg-surface-container rounded-xl` (tokens.md §2.1, §2.6).
- Nagłówek: tytuł `font-heading font-bold text-lg` ("Cykl {n}"), obok
  `.chip-mono bg-primary/15 text-primary` "AKTYWNY" (`history.cycleActive`);
  pod spodem `text-xs text-muted-foreground`: "{start} – {end} · {durationWeeks} tyg."
  (daty przez `toLocaleDateString(dateLocale(lang), { day: 'numeric', month: 'short' })`).
- Rząd statystyk (dane z `useWorkoutRange` aktywnego cyklu, decyzja §0.8):
  `flex gap-3`, kolumny `flex-1`: wartość `font-heading font-bold text-base
  tabular-nums` (PR-y w `text-primary` — mockupowe `hot`), etykieta `.eyebrow-mono
  text-muted-foreground` (SESJE / TONAŻ / PR). Frekwencja dla aktywnego ukryta (§0.8).
- Tygodnie (malejąco): nagłówek `flex justify-between`:
  - lewa `.eyebrow-mono`: "TYDZIEŃ {n}" + " · BIEŻĄCY" dla bieżącego
    (`text-primary` dla bieżącego, `text-muted-foreground` dla pozostałych),
  - prawa `.eyebrow-mono text-muted-foreground`: "{n} sesji · {t} {unit}"
    (liczone z widocznych wierszy tygodnia).
- Wiersze sesji tygodnia: `HistorySessionRow` (anatomia w §J), tło `bg-surface-low`
  (mockup: `#131313` w karcie `#1c1c1c`).
- Bez sparkline (decyzja §0.9), bez dividera 1px (§0.10).

### H. Karty ZAKOŃCZONYCH cykli (`bg-surface-low rounded-xl p-4`)
Mockup: `#131313` (poziom niżej niż aktywna karta — zgodnie z hierarchią surface).
- Zwinięta (default): nagłówek (tytuł + zakres jak §G, bez chipa ACTIVE) + rząd
  4 statystyk z `cycle.stats` (SESJE `totalWorkouts` / TONAŻ `totalTonnage` /
  PR `prs.length` w `text-primary` / FREKWENCJA `completionRate`% — etykieta
  z istniejącego `cycles.attendance`), chevron `text-muted-foreground/50`.
- Rozwinięcie (`Collapsible` z ui): tygodnie + wiersze z ZAŁADOWANEJ listy
  (paginacja!); gdy w załadowanej liście nie ma jeszcze sesji tego cyklu:
  `text-xs text-muted-foreground` `history.cycleSessionsNotLoaded`
  (wskazuje na "Załaduj więcej" na dole).
- Wiersze sesji: tło `bg-surface-lowest` LUB `bg-surface-low`? — w karcie
  `bg-surface-low` wiersz idzie na `bg-surface-container` (poziom wyżej niż karta,
  zasada "głębiej = wyżej" z tokens.md §2.1). Jedna reguła dla implementacji:
  wiersz zawsze o JEDEN poziom powierzchni wyżej niż jego karta.

### I. Sekcja "Poza cyklami"
- Tylko gdy istnieją sesje bez dopasowanego cyklu ORAZ istnieje ≥1 cykl:
  nagłówek `.eyebrow-mono text-muted-foreground` `history.outsideCycle`.
- W środku: obecne grupowanie miesięczne (nagłówek miesiąca `font-heading
  font-bold uppercase tracking-tight` bez italic + meta `.eyebrow-mono`:
  "{n} sesji · {t} {unit}"), wiersze `HistorySessionRow` na `bg-surface-low`.
- User bez żadnego cyklu: cała lista w tym układzie (bez nagłówka sekcji) —
  zachowanie dzisiejsze.

### J. Wiersz sesji (`HistorySessionRow`) — anatomia
Mockup: `display:flex; gap:10px; padding:9px 11px; border-radius:13px` →
`flex items-center gap-2.5 rounded-lg px-3 py-2.5` + tło wg karty (§G/§H).
- **Lewa** (`w-11 shrink-0`): data skrócona "20 sie" `font-mono text-[10px]
  text-muted-foreground` (mockup `#9a9892`).
- **Środek** (`flex-1 min-w-0`):
  - tytuł: nazwa dnia (resolver, localize) `text-sm font-medium truncate`;
    przy szkicu obok `.chip-mono` "draft" (`history.badgeDraft`),
  - meta: `font-mono text-[10px] text-muted-foreground/75` (mockup `#767469`):
    "{ćw} ćw. · {serie} serii · {czas}" (czas z `rowMeta.durationLabel`,
    pomijany gdy null).
- **Prawa**: pigułka PR `.chip-mono bg-primary/15 text-primary` "{n} PR"
  (gdy `prCount > 0`); tonaż `font-mono text-xs font-semibold tabular-nums
  text-foreground/80 text-right shrink-0`; przycisk ⋯ `h-11 w-8 grid place-items-center
  text-muted-foreground/50` (testid `history-row-menu`, aria-label
  `history.rowActions`, `onClick` ze `stopPropagation`).
- **Interakcje**: kontener `role="button" tabIndex={0}` + onClick/onKeyDown →
  `navigate(...)` (poz. 23); zagnieżdżony `<button>` tylko w ⋯ (Radix
  DropdownMenuTrigger) — bez nested-buttons, bo wiersz to div z rolą.
- **Menu ⋯** (`DropdownMenu` z ui): Otwórz trening / Szczegóły / Porównaj|Usuń
  z porównania / Wyślij do trenera (testid `history-row-email`) / Usuń (testid
  `history-delete`, `text-destructive`).
- **Zaznaczenie do porównania**: `.accent-ring` + `bg-primary/[0.08]` na wierszu.
- **Rozwinięcie**: pod wierszem, `rounded-lg p-3 space-y-3` na poziomie powierzchni
  wiersza; treść jak dziś (poz. 29-32): chipy serii `bg-surface-highest`
  (ukończone) / `bg-surface-highest/50 line-through text-muted-foreground`
  (nieukończone) — zamiast `bg-muted/60`/`bg-muted/30` (ten sam efekt, jawny poziom).

### K. Paginacja, empty, loading
- "Załaduj więcej": `Button variant="outline"` `rounded-full h-11` wyśrodkowany.
- Empty states i loading: jak w inwentarzu (poz. 1, 34, 35).

### L. Dialogi (email ×2, eksport CSV, usuwanie)
- Bez zmian funkcjonalnych i strukturalnych w tym planie (osobne komponenty,
  restyle dialogów to nie jest zakres ekranu Historii; pułapka Radix — stały mount
  dialogu maila pojedynczego treningu ZOSTAJE).

---

## 3. Lista zmian w plikach

| Plik | Zmiana |
|---|---|
| `src/pages/WorkoutHistory.tsx` | Przebudowa JSX na strukturę §2 (A-L). Logika stanów (filtry, porównanie, usuwanie, paginacja, dialogi) BEZ ZMIAN — zmienia się prezentacja + dochodzi grupowanie z lib i `useWorkoutRange` dla statystyk aktywnego cyklu |
| `src/lib/history-grouping.ts` | NOWY. Czyste funkcje: `matchWorkoutToCycle(workout, cycles)` (cycleId → zakres dat → null), `groupHistoryByCycles(workouts, cycles)` → `{ cycleGroups: [{ cycle, index, weeks: [{ weekNo, isCurrent, workouts }] }], outside: WorkoutSession[] }`, `weekNoFor(date, cycleStart)` (clamp 1..durationWeeks). Bez React, w pełni testowalne |
| `src/components/history/HistorySessionRow.tsx` | NOWY. Wiersz sesji + menu ⋯ + panel rozwinięcia (§2.J). Reużywany w kartach cykli i w sekcji miesięcznej (2 miejsca = uzasadniona ekstrakcja) |
| `src/i18n/locales/pl.ts` | Nowe klucze z §4 |
| `src/i18n/locales/en.ts` | Te same klucze (typecheck wymusza oba pliki) |
| `src/test/history-grouping.test.ts` | NOWY. Testy czystej logiki grupowania + niezmienniki (§5) |
| `src/test/history-session-row.test.tsx` | NOWY. Inwentarz akcji wiersza: menu zawiera wszystkie pozycje, testidy `history-row-menu`/`history-row-email`/`history-delete` obecne, tap w wiersz nawiguje, ⋯ nie nawiguje (stopPropagation) |
| `e2e/full-app.spec.ts` | Aktualizacja 3 testów klikających `getByRole('button', { name: 'Szczegóły' })` (Z74+Z80, ad-hoc, tracked labels): najpierw `getByTestId('history-row-menu').first().click()`, potem `getByRole('menuitem', { name: 'Szczegóły' })` |
| `e2e/email-coach-button.spec.ts` | Aktualizacja testu wiersza: otwarcie `history-row-menu` przed `history-row-email` |

**ZERO zmian:** `useWorkoutHistoryPage`, `workout-read-store`, `usePlanCycles`,
`history-stats`, `summary-utils`, `exercise-name-resolver`, `EmailWorkoutDialog`,
`ExportWorkoutsDialog`, `DateRangeField`, `Chip`, `EmptyState`, `AppHeader`,
`AppNavigation`, `Layout`, `workout-delete`, e2e `critical` / `accent-color` /
`export-csv-dialog` / `workout-delete-from-day` / `mobile-nav-reachability`,
tokeny (`index.css` zmienia wyłącznie plan `tokens.md`, nie ten).

---

## 4. Nowe klucze i18n (pl.ts + en.ts)

| Klucz | PL | EN |
|---|---|---|
| `history.cycleTitle` | `Cykl {n}` | `Cycle {n}` |
| `history.cycleActive` | `Aktywny` | `Active` |
| `history.cycleWeeks` | `{n} tyg.` | `{n} wks` |
| `history.weekHeader` | `Tydzień {n}` | `Week {n}` |
| `history.weekCurrent` | `bieżący` | `current` |
| `history.outsideCycle` | `Poza cyklami` | `Outside cycles` |
| `history.statSessions` | `Sesje` | `Sessions` |
| `history.statPRs` | `PR` | `PRs` |
| `history.rowActions` | `Akcje treningu` | `Workout actions` |
| `history.cycleSessionsNotLoaded` | `Starsze sesje wczytasz przyciskiem „Załaduj więcej” pod listą.` | `Load older sessions with “Load more” below the list.` |
| `history.exercisesUnit` | `ćw.` | `ex.` |
| `history.setOne` | `seria` | `set` |
| `history.setFew` | `serie` | `sets` |
| `history.setMany` | `serii` | `sets` |
| `history.cycleOne` | `cykl` | `cycle` |
| `history.cycleFew` | `cykle` | `cycles` |
| `history.cycleMany` | `cykli` | `cycles` |

Uwagi: uppercase w eyebrow robi CSS (`.eyebrow-mono`), więc wartości i18n zostają
w naturalnej pisowni. Frekwencja reużywa `cycles.attendance`. Tonaż reużywa
`history.tonnage`. Odmiana przez ten sam helper co `sessionWord` (rozszerzyć
lokalnie o parametr zestawu kluczy — bez nowej biblioteki).

---

## 5. Testy

### Istniejące — muszą zostać zielone BEZ zmian (niezmienniki):
- `e2e/critical.spec.ts` — heading "Historia treningów" w `main` + `getByText('Filtry')` (§0.5, §2.A/C).
- `e2e/accent-color.spec.ts` — chip "Wszystkie" jako button z tłem akcentu (§0.6).
- `e2e/export-csv-dialog.spec.ts` — `history-export-csv` widoczny bez otwierania menu (przycisk w rzędzie akcji).
- `e2e/email-coach-button.spec.ts` test 1 — `history-email` widoczny bez menu.
- `e2e/workout-delete-from-day.spec.ts` — `history-delete` count 0 przy pustej historii (menu zamknięte nie renderuje pozycji, pusta lista nie ma wierszy — asercja dalej prawdziwa).
- `e2e/full-app.spec.ts` D-T1 (nawigacja bottom nav → /history), import CSV (widoczność "Poniedziałek — Góra" w wierszach), progresja (setE2EWorkouts).
- `e2e/mobile-nav-reachability.spec.ts` — routing bez zmian.
- `src/test/history-stats.test.ts`, `history-cache-first.test.ts`, `workout-history-pagination.test.ts`, `z215-history-freeze.test.ts` — warstwa lib/hooków nietknięta.
- `src/test/accent-hardcode-scan.test.ts` + nowy `design-token-guard.test.ts` (z planu tokens.md) — nowy kod ekranu bez hexów i `color-mix`.

### Istniejące — do aktualizacji (wskazane, świadome):
- `e2e/full-app.spec.ts`: 3 testy z przyciskiem "Szczegóły" → klik przez `history-row-menu` + `menuitem` (§3).
- `e2e/email-coach-button.spec.ts`: test wiersza → otwarcie menu przed `history-row-email` (§3).

### Nowe:
- `src/test/history-grouping.test.ts`:
  1. **Niezmiennik kompletności:** dla dowolnego zestawu sesji i cykli suma sesji
     w `cycleGroups` + `outside` = wejście (nic nie znika, nic się nie dubluje) —
     to jest odpowiednik lekcji "plan → wyjście → powrót" dla tego ekranu.
  2. Dopasowanie: `cycleId` wygrywa z zakresem dat; sesja poza wszystkim → `outside`.
  3. `weekNoFor`: data przed startem → 1, po końcu → `durationWeeks` (clamp), granice tygodni poniedziałkowe zgodne z datą startu cyklu.
  4. Porządek malejący zachowany wewnątrz tygodni i między tygodniami.
  5. Zero cykli → wszystko w `outside`.
- `src/test/history-session-row.test.tsx`: inwentarz akcji (menu ma 5 pozycji,
  testidy zachowane), tap nawiguje, ⋯ nie nawiguje, draft chip przy `completed=false`,
  '1h 12m' w meta widoczne bez rozwijania, PR pigułka przy `prCount>0`.
- Bramka manualna briefu: screenshoty e2e-mock viewport 390 na akcentach
  lime / amber / sky (+ indigo wg tokens.md) — harness `scripts/design-screenshots.mjs`
  (patrz `plan/harness.md`), porównanie z artboardem 1a.

---

## 6. Ryzyka i edge-case'y

1. **Stats aktywnego cyklu nieaktualne w Firestore** (przeliczane przy closeout) —
   rozwiązane liczeniem z `useWorkoutRange` (§0.8). Fallback błędu: rząd statystyk
   ukryty, reszta karty działa. Koszt: jedno dodatkowe zapytanie zakresowe
   ograniczone datami cyklu (akceptowalne; cache-first Firestore je amortyzuje).
2. **Paginacja vs grupowanie:** lista ładuje się stronami od najnowszych, więc
   karty starszych cykli mogą początkowo nie mieć wierszy. Nagłówki tygodni liczą
   TYLKO z załadowanych wierszy (uczciwe), a pusta rozwinięta karta pokazuje
   `history.cycleSessionsNotLoaded`. Liczba sesji CYKLU w rzędzie statystyk
   pochodzi ze `stats`/range (pełna), więc nie myli się z liczbą wierszy na liście.
3. **Sparkline pominięty świadomie** (fałszywe dane przy niepełnej liście, §0.9).
4. **Sesja bez `cycleId` w zakresie dat cyklu** (ad-hoc, import): dopasowanie po
   zakresie dat — trafia do karty cyklu (mockup: "filed under the cycles they
   belong to"). Test §5.2 utrwala kolejność dopasowania.
5. **Brak jakiegokolwiek cyklu** (nowy user, konto sprzed cykli): widok miesięczny
   jak dziś — zero pustych kart, zero regresji (§2.I).
6. **Filtry a karty cykli:** filtry działają na sesje; karta cyklu bez pasujących
   sesji przy AKTYWNYM filtrze (szukajka/status/dzień/daty/PR) jest ukrywana w
   całości (mniej szumu). Bez filtrów: aktywny cykl zawsze widoczny, zakończone
   widoczne jako zwinięte karty ze statystykami.
7. **Długie teksty:** nazwy dni/ćwiczeń `truncate` + `min-w-0` (lekcja tokens.md
   §9.7 o PL uppercase); tytuł "Poniedziałek — Góra" mieści się przy 390 px, focus
   przenosi się do rozwinięcia. Test wizualny na "Szybki trening" + długa nazwa
   własnego dnia.
8. **Draft bez daty ukończenia / durationLabel=null:** meta bez segmentu czasu
   (separator "·" tylko między obecnymi segmentami).
9. **Offline:** cache-first hooka (E-T5) bez zmian; błąd serwera po udanym cache
   nie zamazuje widoku; range fetch aktywnego cyklu ma własny fallback (ryzyko 1).
10. **Radix:** dialog maila pojedynczego treningu — stały mount, zamykanie tylko
    `open=false` (pułapka z CLAUDE.md, NIE ruszać). DropdownMenu zamykać przed
    akcjami mutującymi dane wiersza (usuwanie: menu → AlertDialog, menu zamyka
    się samo przy wyborze pozycji — wzorzec bezpieczny).
11. **Dostępność:** wiersz jako `div role="button"` wymaga obsługi Enter/Spacja;
    ⋯ ma aria-label; touch targety ≥44 px (h-11) — checklist przed wdrożeniem.
12. **Usunięcie ostatniej sesji tygodnia/cyklu:** `deletedIds` filtruje przed
    grupowaniem → grupa/tydzień znika naturalnie; potwierdza test §5.1 (kompletność
    liczona po filtrze).
13. **Zmiana akcentu:** wszystkie akcentowe elementy (chip ACTIVE, PR pigułki,
    accent-ring, nagłówek bieżącego tygodnia, statystyka PR) na `--primary`/
    `--accent` — bramka 3+1 akcentów (lime/amber/sky/indigo) przez harness.

---

## 7. Kolejność kroków implementacji

Warunek wstępny: wdrożony fundament `plan/tokens.md` (klasy `.eyebrow-mono`,
`.chip-mono`, `.accent-ring`, `.accent-wash` + strażnik design-token-guard).

1. `src/lib/history-grouping.ts` + `src/test/history-grouping.test.ts` (TDD:
   najpierw testy niezmienników) → weryfikacja: `npm run test -- history-grouping`.
2. Klucze i18n do `pl.ts` + `en.ts` → weryfikacja: `npm run typecheck`.
3. `src/components/history/HistorySessionRow.tsx` + `history-session-row.test.tsx`
   → weryfikacja: testy komponentu zielone.
4. Przebudowa `src/pages/WorkoutHistory.tsx` (sekcje §2, bez zmian logiki stanów;
   `useWorkoutRange` dla aktywnego cyklu) → weryfikacja: `npm run test`,
   `npm run typecheck`, `npm run lint`, strażniki akcentu/tokenów zielone.
5. Aktualizacja e2e (`full-app` ×3, `email-coach-button` ×1) → weryfikacja:
   `npm run e2e` (lekcja CLAUDE.md #9: świeży dev server; przy masowych failach
   `pkill -f vite` + czyszczenie `node_modules/.vite`).
6. Bramka wizualna: `node scripts/design-screenshots.mjs --routes=/history`
   (lime/amber/sky; + indigo ręcznie) → porównanie z artboardem 1a; iteracja.
7. Scenariusz sekwencji (checklist CLAUDE.md): historia → otwórz trening z wiersza
   → wróć → rozwinięcie/porównanie/usunięcie → filtry → "Załaduj więcej".
8. `npm run build` + wpis do `DECYZJE.md` (co, dlaczego, mapa funkcji 37/37).
