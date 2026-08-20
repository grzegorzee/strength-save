# PLAN REDESIGNU: Historia (wariant 1a z history-tab.dc.html)

> Fala 2, 2026-08-20. Ekran: `src/pages/WorkoutHistory.tsx` (+ fala 1: DateRangeField T20.5, chipy kinetic T23-7, i18n dat).
> Artboard: `docs/design-2026-08-20/dc/history-tab.dc.html` (wariant 1a: cykle jako poziom nadrzędny, sesje jako jednoliniowe wiersze grupowane tygodniami).
> Zasada nadrzędna: mockup jest POMARAŃCZOWY, wdrożenie używa TOKENU akcentu (`--primary`/`--accent`, paleta 11). Zero nowych hexów; strażnik: `src/test/accent-hardcode-scan.test.ts` (T24d).

---

## 1) INWENTARZ FUNKCJI DO ZACHOWANIA (32 pozycje)

Źródło: aktualny `src/pages/WorkoutHistory.tsx` (537 linii, stan po fali T1-T24).

| # | Funkcja (dziś) | Miejsce w nowym designie |
|---|---|---|
| 1 | Stan ładowania (`!isLoaded` → "Ładowanie") | Bez zmian (ten sam wczesny return) |
| 2 | Nagłówek h1 "Historia treningów" + podtytuł (e2e: critical, full-app sprawdzają heading w `main`) | h1 ZOSTAJE widoczny w main (styl font-heading uppercase italic jak dziś), w jednym wierszu z ikonami szukania i filtrów po prawej. Podtytuł `history.subtitle` wypada (sam tekst, nie funkcja) |
| 3 | Wyszukiwarka (query po dacie/dayId/nazwie dnia/focusie/nazwach ćwiczeń) | Input zwijany: ikona lupy w wierszu h1 przełącza widoczność; auto-otwarty gdy query niepuste. Ten sam placeholder `history.searchPlaceholder` |
| 4 | Chipy statusu: Wszystkie / Ukończone / Drafty (filtr serwerowy `completed`) | Rząd 1 chipów (komponent `Chip` kinetic, bez zmian logiki; e2e accent-color szuka buttona `/^wszystkie$/i` → label bez zmian) |
| 5 | Chip "Tylko z PR" (`onlyPRs`, rowMeta.prCount) | W rzędzie 1 chipów, jak dziś |
| 6 | Chipy dni planu: "Wszystkie dni" + dzień per `trainingPlan` (tylko gdy plan istnieje) | Rząd 2 chipów, `overflow-x-auto` + `shrink-0` (jak dayChips w mockupie) |
| 7 | `DateRangeField` (from/to, `testId="history-date-range"`, filtr serwerowy) | Zwijany pod ikoną filtrów (wiersz h1); auto-otwarty gdy zakres ustawiony. TestId bez zmian |
| 8 | Wybór 2 treningów do porównania (`toggleCompare`, max 2 FIFO, ring na wybranych) | Chip COMPARE (`history.compare`) włącza tryb porównania: tap w wiersz = zaznacz/odznacz (ring-primary/50 jak dziś). Dodatkowo pozycja "Porównaj"/"Usuń z porównania" w menu ⋯ wiersza (drugie wejście, działa bez trybu) |
| 9 | Karta porównania (delta tonażu/serii/ćwiczeń, konwersja jednostek) | Bez zmian logiki; restyling: `border-primary/30 bg-primary/5` zostaje |
| 10 | Podpowiedź `history.compareHint` | Pod rzędem COMPARE (jak w mockupie: "You can select up to 2..."), pokazywana gdy tryb COMPARE aktywny lub coś zaznaczone |
| 11 | Licznik sesji po filtrach + polska liczebność (`sessionWord`) | Linia licznika nad kartami: lewa strona "{cykle} · {sesje}" (mono, muted), prawa "TONAŻ …" (szczegóły w sekcji 2.6) |
| 12 | "Wyślij do trenera" cała historia (`data-testid="history-email"` → `EmailWorkoutDialog mode='history'`, zakresy week/last30) | Pill w rzędzie COMPARE (mockup: "Send to coach"), z ikoną Mail i pełnym labelem `email.sendToCoach` (e2e sprawdza `toContainText('Wyślij do trenera')`) |
| 13 | "Eksport CSV" (`data-testid="history-export-csv"` → `ExportWorkoutsDialog` z cycles) | Drugi pill obok "Wyślij do trenera" (mockup go nie ma, funkcja MUSI zostać); label `exportCsv.historyButton` (e2e sprawdza tekst "Eksport CSV") |
| 14 | Dialog maila POJEDYNCZEGO treningu (`history-row-email`, mode='workout', ZAWSZE zamontowany, zamykanie tylko `open=false` - pułapka Radix) | Pozycja "Wyślij do trenera" w menu ⋯ wiersza (testid zostaje na itemie). Oba `EmailWorkoutDialog` montowane jak dziś, bez unmountu |
| 15 | Grupowanie po miesiącach (nagłówek: miesiąc+rok, liczba sesji, tonaż grupy) | Zostaje jako FALLBACK: (a) sekcja "Poza cyklami" dla sesji bez dopasowanego cyklu, (b) CAŁA lista gdy user nie ma żadnego widocznego cyklu (to ścieżka większości testów e2e, które nie seedują cykli) |
| 16 | Wiersz: data + badge ukończony/draft | Jednoliniowy wiersz (mockup): data w kolumnie mono po lewej; badge "draft" (`secondary`) tylko dla szkiców (completed = brak badge, jak mockup) |
| 17 | Wiersz: badge czasu trwania (Clock, `rowMeta.durationLabel`, format "1h 12m" - e2e sprawdza dokładnie ten tekst) | Druga linia wiersza: "{serie} · {durationLabel}" mono muted. Format `formatDurationCompact` BEZ zmian |
| 18 | Wiersz: badge PR (Trophy + prCount; dziś fitness-warning) | Badge "N PR" w wierszu, wg mockupu w akcencie: `bg-primary/15 text-primary` (zmiana wizualna zgodna z brief: PR to nie status semantyczny; strażnik kolorów przechodzi) |
| 19 | Nazwa dnia + focus przez resolver (snapshot → cykl → plan; `localizeDayName`/`localizeFocus`, fallback `history.noFocus`) | Główna linia wiersza: "{dayName} · {focus}", `truncate` (mockup: ellipsis). Resolver bez zmian |
| 20 | Grid statystyk wiersza: ćwiczenia / tonaż / serie | Tonaż → prawa kolumna wiersza (mono, semibold). Liczba serii → druga linia. Liczba ćwiczeń → widoczna w rozwinięciu Szczegóły (lista ćwiczeń) i w karcie porównania; nie ginie |
| 21 | "Otwórz trening" → `navigate(/workout/:dayId?date&session)` | Tap w CAŁY wiersz (mockup 1a: "one tap to open"); poza trybem COMPARE. Dodatkowo pozycja "Otwórz trening" w menu ⋯ (dostępność) |
| 22 | "Porównaj"/"Usuń z porównania" per wiersz | Menu ⋯ wiersza + tryb COMPARE (poz. 8) |
| 23 | "Szczegóły" rozwiń/zwiń (expandedIds, chevron) | Ikona-chevron w wierszu z `aria-label` = `history.details` ("Szczegóły") - dzięki temu 3 testy full-app (`getByRole('button', { name: 'Szczegóły' })`) przechodzą BEZ zmian |
| 24 | "Wyślij do trenera" per wiersz (`history-row-email`) | Menu ⋯ (poz. 14); wymaga aktualizacji e2e (sekcja 5) |
| 25 | "Usuń" per wiersz (`data-testid="history-delete"`) | Menu ⋯, item destructive z testid; wymaga uwagi w e2e (sekcja 5) |
| 26 | AlertDialog usuwania (`history-delete-dialog`, `history-delete-confirm`, `deleteWorkoutEverywhere`, spinner, toasty, czyszczenie compareIds, deletedIds) | Bez zmian (cała maszyneria stanu zostaje 1:1) |
| 27 | Rozwinięcie: serie per ćwiczenie (`formatHistorySetLabel`: kg×reps, BW, czas/dystans/asysta - e2e sprawdza "1:30", "24 kg · 40 m · 1:00", "8×-25 kg"), nieukończone przekreślone, metryki RPE/ból/technika, notatki ćwiczenia | Bez zmian logiki; render pod wierszem wewnątrz karty cyklu (bg-surface-lowest jak dziś) |
| 28 | Rozwinięcie: notatka treningu (`notes.dayNote`) | Bez zmian |
| 29 | "Załaduj więcej" (hasMore/isLoadingMore, paginacja 100) | Bez zmian, przycisk na dole listy |
| 30 | Empty state A: zero treningów w ogóle → `EmptyState` + CTA "pierwszy trening" | Bez zmian |
| 31 | Empty state B: filtry nic nie zostawiły → karta `history.empty` | Bez zmian |
| 32 | Jednostki (`useUnit` toDisplay/unit) + formatowanie liczb wg locale | Bez zmian; tonaże zbiorcze przez istniejący `formatTonnage` z `src/lib/units.ts` ("5.6 t" / "k lbs") |

Niezmiennik całego ekranu: **każda załadowana i przefiltrowana sesja jest wyrenderowana dokładnie raz** (suma sesji we wszystkich grupach == `filteredWorkouts.length`). Test w sekcji 5.

---

## 2) STRUKTURA NOWEGO EKRANU (sekcja po sekcji, mapowanie na tokeny)

Mapowanie neutralnych hexów mockupu → tokeny apki (dark: `src/index.css`):

| Hex mockupu | Rola w mockupie | Token/klasa apki |
|---|---|---|
| `#0e0e0e` | tło ekranu | `bg-background` (daje Layout, nic nie ustawiamy) |
| `#131313` | wiersze sesji, karty przeszłych cykli | `bg-surface-low` |
| `#1c1c1c` | karta aktywnego cyklu, chipy nieaktywne | karta: `bg-surface-container`; chip nieaktywny: `bg-surface-highest` (istniejący `Chip`) |
| `#262626` | divider w karcie | `bg-surface-high` (h-px) |
| `#f2f1ee` | tekst główny | `text-foreground` |
| `#dedcd6` | tekst drugorzędny mocny (tonaż wiersza) | `text-foreground/80` → użyć `text-foreground` (bez nowych odcieni) |
| `#9a9892` | meta/mono labels | `text-muted-foreground` |
| `#767469` | sub-meta wiersza | `text-muted-foreground` (nie mnożymy odcieni) |
| `var(--acc)` + `color-mix 8-20%` | akcent + tła akcentowe | `text-primary`, `bg-primary`, `bg-primary/10`, `bg-primary/15`, `ring-primary/50` |
| `#141005` (tekst na akcencie) | tekst aktywnego chipa | `text-accent-foreground` / `text-primary-foreground` (istniejące) |

Fonty mockupu → apka: `Space Grotesk` (klasa `.disp`) → `font-heading` (już skonfigurowany w tailwind.config i ładowany w index.html); `Inter` → domyślny `font-body`; `ui-monospace` (`.mono`) → tailwindowy `font-mono` (systemowy stack, już używany w apce) + `tracking-[0.08em]`/`tabular-nums`. ZERO nowych `<link>` do Google Fonts.

### 2.1 Wiersz tytułowy (w main, pod globalnym AppHeaderem)

AppHeader (avatar + tytuł + dzwonek) NIE jest dotykany - już realizuje górę mockupu. W main:
`h1` "Historia treningów" (jak dziś: `font-heading font-bold uppercase italic tracking-tight`) + po prawej dwa icon-buttony 36px (`rounded-xl bg-surface-highest`, ikony `Search` i `SlidersHorizontal`/`ListFilter` z lucide, `text-muted-foreground`):
- lupa: toggle widoczności inputa szukania (aria-label `history.search`),
- filtry: toggle widoczności `DateRangeField` (aria-label `history.filters`).

### 2.2 Wyszukiwarka (zwijana)

Dzisiejszy `Input` z ikoną Search, bez zmian klas; render warunkowy `searchOpen || searchQuery`.

### 2.3 Rzędy chipów (zawsze widoczne)

- Rząd 1 (status): Wszystkie / Ukończone / Drafty / Tylko z PR - istniejący `Chip` (aktywny = `bg-accent text-accent-foreground`, to już podąża za akcentem).
- Rząd 2 (dni planu): "Wszystkie dni" + dni, kontener `flex gap-2 overflow-x-auto`, chipy `shrink-0 whitespace-nowrap`.
- `DateRangeField` pod spodem, gdy rozwinięty (poz. 7).

### 2.4 Rząd COMPARE + akcje

`flex items-center gap-2`: `Chip` "Porównaj" (active = tryb porównania) · spacer · pill "Wyślij do trenera" (`history-email`) · pill "Eksport CSV" (`history-export-csv`). Pille: `Button variant="outline" size="sm" className="rounded-full"` (mockup: pill `bg-surface-highest`). Pod rzędem hint `history.compareHint` (`text-xs text-muted-foreground`), widoczny gdy tryb aktywny lub `compareIds.length > 0`.

### 2.5 Karta porównania

Jak dziś (poz. 9), renderowana nad listą gdy `comparison != null`.

### 2.6 Linia licznika

`flex justify-between` mono 10-11px `text-muted-foreground tracking-[0.14em] uppercase`:
- lewa: "{n} CYKLI · {m} SESJI" - n = liczba widocznych cykli (`cycles.filter(isCycleVisibleWithData)`), m = `filteredWorkouts.length` (uczciwa liczba z załadowanego okna, jak dziś; liczebność `sessionWord` + analogiczny `cycleWord`),
- prawa: "TONAŻ {formatTonnage(...)}" - bez filtrów: agregat `useWorkoutAggregate(uid)?.totals.totalTonnageKg` (dokument backendowy, realne dane); gdy agregat null (E2E, offline, brak dokumentu) LUB filtry aktywne: suma `calculateTonnage` po `filteredWorkouts` (dane załadowane, uczciwe). Nigdy dane zmyślone.

### 2.7 Karta AKTYWNEGO cyklu (`bg-surface-container rounded-3xl p-4`)

Dane: `activeCycle = cycles.find(status==='active')` przefiltrowany `isCycleVisible`; staty LIVE przez istniejący `buildActiveCyclePreview(activeCycle, workoutsOfCycle)` z `src/lib/cycle-insights.ts` (ten sam mechanizm co Cykle/Dashboard).

- Nagłówek: nazwa cyklu (patrz new_features: fallback "Cykl {n}" - cykle NIE mają pola nazwy) `font-heading text-lg font-bold` + badge "AKTYWNY" (`bg-primary/15 text-primary font-mono text-[9px] uppercase rounded-full`) + linia zakresu "1 cze – 23 sie · 12 tyg." (`text-xs text-muted-foreground`, formatowanie dat przez istniejące `dateLocale(lang)`), chevron zwijania (karta domyślnie rozwinięta; stan lokalny).
- 4 staty (`flex gap-2`, każdy `flex-1`): SESJE (`stats.totalWorkouts`), TONAŻ (`formatTonnage(stats.totalTonnage)`), PR (`stats.prs.length`, wartość `text-primary`), FREKWENCJA (`stats.completionRate%`). Wartości `font-heading font-bold`, etykiety mono 8-9px `text-muted-foreground uppercase tracking-[0.09em]`.
- Sparkline 12 tygodni: `flex gap-[3px] items-end h-8`; słupek = tonaż tygodnia cyklu (bucket po `calendarDayDiff(startDate, date)/7`), wysokość % max; bieżący tydzień `bg-primary`, pozostałe `bg-primary/30`, `rounded-sm`. Renderowana TYLKO gdy okno danych pokrywa start cyklu (sekcja 6, ryzyko paginacji).
- Divider `h-px bg-surface-high`.
- Tygodnie: nagłówek "TYDZIEŃ {n}" mono (bieżący: `text-primary` + dopisek `history.weekCurrent`), po prawej "{k} SESJI · {tonaż}"; pod nim wiersze sesji.
- Wiersz sesji (`flex items-center gap-2.5 rounded-xl bg-surface-low px-3 py-2.5`; sesja z dziś/bieżąca pierwsza w bieżącym tygodniu: `bg-primary/10`):
  - data `font-mono text-[10px] text-muted-foreground w-11 shrink-0` (format "20 SIE" przez `toLocaleDateString(dateLocale, {day, month:'short'})` uppercase),
  - środek `min-w-0`: linia 1 nazwa+focus `truncate text-sm font-medium` (+ badge "draft" dla szkiców), linia 2 "{serie} · {durationLabel}" `font-mono text-[10px] text-muted-foreground`,
  - badge "{n} PR" `bg-primary/15 text-primary font-mono text-[9px] rounded-full shrink-0` (gdy prCount>0),
  - tonaż `font-mono text-xs font-semibold text-right w-14 shrink-0 tabular-nums`,
  - chevron Szczegóły (icon-button, `aria-label={t('history.details')}`) + ⋯ menu (shadcn `DropdownMenu`, `aria-label={t('history.rowActions')}`): Otwórz trening / Porównaj lub Usuń z porównania / Wyślij do trenera (`data-testid="history-row-email"`) / Usuń (`data-testid="history-delete"`, destructive).
  - Tap w wiersz: tryb COMPARE → toggle zaznaczenia (ring); normalnie → `navigate(...)`. Wewnętrzne przyciski: `e.stopPropagation()`.
  - Zaznaczenie do porównania: `ring-2 ring-inset ring-primary/50` (jak dziś).
- Rozwinięcie Szczegóły: dzisiejszy blok (poz. 27-28) pod wierszem.
- Stopka karty: "Wszystkie sesje ({N})" `text-primary text-sm font-semibold text-center` - domyślnie karta pokazuje 2 ostatnie tygodnie; klik rozwija wszystkie ZAŁADOWANE sesje cyklu; gdy `hasMore` i najstarsza załadowana sesja > startDate cyklu, klik dodatkowo woła `loadMore` (funkcjonalnie równoważne dzisiejszemu "Załaduj więcej").

### 2.8 Karty przeszłych cykli (zwinięte; `bg-surface-low rounded-3xl p-4`)

Cykle `status==='completed'` + `isCycleVisibleWithData`, malejąco po `endDate`. Staty live przez istniejący `withLiveCompletedStats` gdy sesje cyklu są w oknie, inaczej zapisane `cycle.stats` (cache wg komentarza w cycle-insights - realne dane, nie zmyślone).
Nagłówek (nazwa fallback + zakres + chevron) + 4 staty jak w 2.7. Rozwinięcie: sesje cyklu z załadowanego okna; jeśli okno nie pokrywa całego zakresu cyklu → lazy dociągnięcie przez istniejący `fetchWorkoutRange(uid, {fromDate: cycle.startDate, toDate: cycle.endDate})` (nowy mały hook `useCycleSessions`, wołany dopiero po rozwinięciu, wynik cache'owany per cycleId; loader = `Loader2`). Wiersze i akcje identyczne jak 2.7 (te same komponenty).

### 2.9 Sekcja "Poza cyklami" + fallback bez cykli

Sesje, których nie da się przypisać (brak `workout.cycleId` I data poza zakresem każdego widocznego cyklu): dzisiejsze grupowanie miesiącami (nagłówek miesiąca + licznik + tonaż), wiersze w nowym stylu (2.7). Nagłówek sekcji `history.outsideCycles` tylko, gdy istnieją też karty cykli. Gdy `cycles` widoczne == 0 → cała lista = to grupowanie (bez nagłówka sekcji). Przypisanie sesji do cyklu: najpierw `workout.cycleId`, fallback zakres dat (`startDate <= date <= endDate`); funkcja czysta w nowym `src/lib/history-cycles.ts`.

### 2.10 Dół listy

"Załaduj więcej" (bez zmian) → empty states (bez zmian) → dialogi (bez zmian montowania).

---

## 3) LISTA ZMIAN W PLIKACH

| Plik | Zmiana |
|---|---|
| `src/lib/history-cycles.ts` | NOWY. Czyste funkcje: `assignWorkoutsToCycles(workouts, cycles)` → `{ perCycle: Map<cycleId, WorkoutSession[]>, outside: WorkoutSession[] }`; `groupCycleWorkoutsByWeek(cycle, workouts)`; `buildCycleSparkline(cycle, workouts)` (12 bucketów tonażu); `windowCoversCycleStart(oldestLoadedDate, cycle, hasMore)` |
| `src/hooks/useCycleSessions.ts` | NOWY. Lazy `fetchWorkoutRange` dla rozwiniętego przeszłego cyklu (stan idle/loading/loaded/error, cache per cycleId, error → fallback: pokazuj to co w oknie + toast) |
| `src/components/history/HistorySessionRow.tsx` | NOWY. Jednoliniowy wiersz sesji + menu ⋯ + rozwinięcie Szczegóły (przeniesiona 1:1 dzisiejsza zawartość rozwinięcia). Propsy: workout, meta, resolver, isSelected, isExpanded, compareMode, callbacki |
| `src/components/history/CycleCard.tsx` | NOWY. Karta cyklu (wariant active/past): nagłówek, staty, sparkline (active), tygodnie z HistorySessionRow, "Wszystkie sesje (N)" |
| `src/pages/WorkoutHistory.tsx` | Przebudowa prezentacji wg sekcji 2. CAŁY stan i handlery zostają (searchQuery, selectedDay, selectedStatus, from/to, compareIds, expandedIds, onlyPRs, pendingDelete, deletedIds, isDeleting, oba EmailWorkoutDialog, ExportWorkoutsDialog, AlertDialog, filteredWorkouts, comparison, rowMeta, resolver). Dochodzi: searchOpen, filtersOpen, compareMode, expandedCycleIds; import `useWorkoutAggregate`, `buildActiveCyclePreview`, `withLiveCompletedStats`, `isCycleVisibleWithData`, `formatTonnage`, history-cycles |
| `src/i18n/locales/pl.ts` + `en.ts` | Nowe klucze (sekcja 4) - OBA pliki, inaczej typecheck padnie |
| `src/test/history-cycles.test.ts` | NOWY (sekcja 5) |
| `src/test/workout-history-redesign.test.tsx` | NOWY (sekcja 5) |
| `e2e/email-coach-button.spec.ts` | Aktualizacja: test wiersza otwiera menu ⋯ przed asercją `history-row-email` (sekcja 5) |
| `e2e/critical.spec.ts` | Aktualizacja asercji `getByText('Filtry')` → chip "Wszystkie" + icon-button filtrów (sekcja 5) |

NIE dotykamy: `AppHeader.tsx`, `Layout.tsx`, `useWorkoutHistoryPage`, `workout-read-store`, `history-stats`, `cycle-insights` (tylko importy), `EmailWorkoutDialog`, `ExportWorkoutsDialog`, `DateRangeField`, `Chip`.

---

## 4) NOWE KLUCZE i18n (pl + en)

Teksty mockupu są EN; wdrożenie przez klucze w OBU plikach:

| Klucz | PL | EN |
|---|---|---|
| `history.search` | `Szukaj` | `Search` |
| `history.rowActions` | `Akcje treningu` | `Workout actions` |
| `history.activeBadge` | `AKTYWNY` | `ACTIVE` |
| `history.cycleN` | `Cykl {n}` | `Cycle {n}` |
| `history.cycleOne` | `cykl` | `cycle` |
| `history.cycleFew` | `cykle` | `cycles` |
| `history.cycleMany` | `cykli` | `cycles` |
| `history.weekN` | `Tydzień {n}` | `Week {n}` |
| `history.weekCurrent` | `Tydzień {n} · bieżący` | `Week {n} · current` |
| `history.attendance` | `Frekwencja` | `Attendance` |
| `history.sessionsLabel` | `Sesje` | `Sessions` |
| `history.allSessions` | `Wszystkie sesje ({n})` | `All sessions ({n})` |
| `history.outsideCycles` | `Poza cyklami` | `Outside cycles` |
| `history.weeksShort` | `{n} tyg.` | `{n} wks` |
| `history.setOne` | `seria` | `set` |
| `history.setFew` | `serie` | `sets` |
| `history.setMany` | `serii` | `sets` |
| `history.loadingCycle` | `Wczytywanie sesji cyklu…` | `Loading cycle sessions…` |

Reużywane istniejące: `history.title`, `history.searchPlaceholder`, `history.allShort`, `history.completed`, `history.drafts`, `history.onlyPRs`, `history.allDays`, `history.filters`, `history.compare`, `history.removeFromCompare`, `history.compareHint`, `history.compareTwo`, `history.tonnage`, `history.details`, `history.openWorkout`, `history.delete`, `history.deleteTitle/Desc/deleted/deleteFailed`, `history.empty`, `history.emptyNoWorkouts`, `history.badgeDraft`, `history.noFocus`, `history.bodyweightSet`, `email.sendToCoach`, `exportCsv.historyButton`, `notes.dayNote`, `common.loading`, `common.loadMore`, `common.cancel`, `empty.startFirstWorkout`. Etykieta "PR" zostaje literalna (jak dziś w kodzie).

---

## 5) TESTY

### Istniejące do AKTUALIZACJI

1. `e2e/email-coach-button.spec.ts` (test "wiersz historii..."): akcja `history-row-email` przenosi się do menu ⋯ → przed asercjami dodać otwarcie menu: `await page.getByRole('button', { name: 'Akcje treningu' }).first().click();` (albo testid na triggerze `history-row-menu`). Asercje `toBeVisible`/`toContainText('Wyślij do trenera')`/klik zostają na itemie.
2. `e2e/critical.spec.ts` ("history page shows filters and comparison shell"): `getByText('Filtry')` przestaje istnieć jako nagłówek karty → zamienić na `await expect(page.getByRole('button', { name: /^wszystkie$/i })).toBeVisible();` (chip statusu) + opcjonalnie widoczność icon-buttona `Filtry` po aria-label.
3. `e2e/workout-delete-from-day.spec.ts`: `expect(getByTestId('history-delete')).toHaveCount(0)` przechodzi bez zmian (itemy menu nie są w DOM przy zamkniętym menu), ale asercja słabnie - dopisać komentarz w specu; NIE wymaga zmiany kodu.

### Istniejące, które MUSZĄ przejść bez zmian (niezmienniki selektorów)

- `full-app.spec.ts`: heading "Historia treningów" w main; `getByRole('button', { name: 'Szczegóły' })` (chevron z aria-label!); teksty rozwinięcia ("1h 12m", "8×30", "RPE:", "1:30", "24 kg · 40 m · 1:00", "8×-25 kg", "Szybki trening", "Poniedziałek — Góra"); bottom-nav link "Historia".
- `accent-color.spec.ts`: chip `/^wszystkie$/i` + kolor tła ≠ limonka przy akcencie #1e90ff.
- `export-csv-dialog.spec.ts`: `history-export-csv` widoczny, `toContainText('Eksport CSV')`.
- `email-coach-button.spec.ts` (test przycisku historii): `history-email` widoczny z tekstem.
- Unit: `accent-hardcode-scan.test.ts` (zero limonki/hexów), `i18n-hardcoded-scan` (nowe teksty tylko przez klucze), `history-stats.test.ts`, `history-cache-first.test.ts`, `workout-history-pagination.test.ts` (nie dotykamy tych warstw).

### NOWE testy

1. `src/test/history-cycles.test.ts` (czyste funkcje):
   - przypisanie po `cycleId` wygrywa z zakresem dat; fallback po zakresie; sesja poza wszystkim → `outside`;
   - NIEZMIENNIK KOMPLETNOŚCI: `perCycle` + `outside` == wejściowa lista (bez duplikatów i ubytków) - dla miksów: adhoc, draft, stary trening bez cycleId, sesja w 2 nakładających się zakresach (bierze pierwszy/aktywny);
   - tygodnie: sesja z `startDate` → tydzień 1; granice tygodnia; sparkline: 12 bucketów, sumy tonażu, pusty tydzień = 0;
   - `windowCoversCycleStart`: hasMore + najstarsza załadowana > startDate → false.
2. `src/test/workout-history-redesign.test.tsx` (DOM, wzorzec `workout-day-view.test.ts` - test niezmiennika starego przepływu):
   - bez cykli: render listy miesiącami, wiersz ma menu ⋯ z KOMPLETEM akcji (Otwórz / Porównaj / Wyślij do trenera / Usuń), chevron Szczegóły rozwija serie i notatki;
   - z cyklami: sesje w karcie cyklu, sesja bez cyklu w "Poza cyklami", licznik sesji == suma wyrenderowanych wierszy;
   - tryb COMPARE: chip aktywuje tryb, dwa tapnięcia → karta porównania z deltami; trzecie zaznaczenie wypycha najstarsze (FIFO);
   - filtry: chip Drafty + "Tylko z PR" + zakres dat nadal zawężają;
   - usuwanie: menu → Usuń → dialog → confirm → wiersz znika, compareIds wyczyszczone;
   - oba EmailWorkoutDialog i ExportWorkoutsDialog zamontowane (Radix: zamykanie przez open=false);
   - staty karty cyklu: wartości z `buildActiveCyclePreview` (nie zmyślone), FREKWENCJA == completionRate.

---

## 6) RYZYKA I EDGE-CASE'Y

1. **Paginacja vs kompletność cyklu (główne ryzyko).** Okno historii = 100 sesji; aktywny cykl zwykle mieści się w oknie, ale przeszłe cykle NIE. Dlatego: staty przeszłych cykli z `cycle.stats`/`withLiveCompletedStats`, sesje przeszłego cyklu lazy przez `fetchWorkoutRange`, sparkline aktywnego cyklu tylko gdy okno pokrywa `startDate` (inaczej ukryta - żadnych częściowych wykresów udających całość).
2. **Selektory e2e oparte na tekstach** ("Szczegóły", "Wyślij do trenera", "Eksport CSV", "Wszystkie", "1h 12m", heading). Plan celowo zostawia te teksty/aria-labels; zmiany speców ograniczone do 2 plików (sekcja 5).
3. **Radix: dialogi zawsze zamontowane.** Menu ⋯ (DropdownMenu) otwiera dialog PO zamknięciu menu (`onSelect` + default Radix); AlertDialog i EmailWorkoutDialog montowane na poziomie strony jak dziś - zero unmountu w stanie open (lekcja builda 92).
4. **Tap w wiersz vs przyciski wewnętrzne.** `stopPropagation` na chevronie, ⋯ i itemach; wiersz jako `div role="button"` z obsługą klawiatury (Enter/Spacja) - dostępność. W trybie COMPARE tap NIE nawiguję.
5. **Stany puste:** brak cykli (fallback miesiącami - ścieżka e2e), cykl aktywny bez sesji (karta ze statami 0, bez sekcji tygodni, bez sparkline), brak agregatu (licznik z okna), draft w cyklu (badge draft), sesje w przyszłości/dziś.
6. **Długie teksty:** nazwy dni/focus po EN/PL (`truncate` + `min-w-0`); tonaż "8,850" i "k lbs" (lbs dłuższe - kolumna w-14 + `tabular-nums`, test wizualny w lbs); "12 tyg." przy długim zakresie dat → zakres w osobnej linii.
7. **Offline / cache-first (E-T5):** pierwsza strona z cache Firestore → karta cyklu maluje się z cache, serwer nadpisuje; `fetchWorkoutRange` offline dla przeszłego cyklu → error → pokazujemy sesje z okna + stan błędu z wyjściem (zasada CLAUDE.md #6: przycisk "spróbuj ponownie" w rozwinięciu).
8. **Wiele akcentów:** bramka briefu - screenshot 390px na limonce/amber/sky; wszystkie akcentowe elementy (badge ACTIVE, PR, sparkline, "Wszystkie sesje", ring) wyłącznie przez `primary`/`accent`; strażnik T24d w CI.
9. **Sesja przypisana do niewidocznego cyklu** (technical/hidden): trafia do "Poza cyklami" (nie ginie).
10. **`deletedIds`** musi filtrować także sesje dociągnięte przez `useCycleSessions` (jedno źródło filtra w stronie).
11. **Grupowanie tygodniami przy filtrach:** filtry (szukaj/status/dzień/PR/daty) aplikują się PRZED grupowaniem; tydzień bez sesji po filtrach nie renderuje nagłówka; cykl z 0 sesji po filtrach pokazuje samą kartę ze statami tylko gdy filtry nieaktywne, inaczej jest ukryty (licznik sesji dalej się zgadza).

---

## 7) KOLEJNOŚĆ KROKÓW IMPLEMENTACJI

1. `src/lib/history-cycles.ts` + `src/test/history-cycles.test.ts` (TDD: najpierw czerwone testy przypisania/tygodni/sparkline/niezmiennika kompletności) → verify: `npm run test -- history-cycles`.
2. Klucze i18n w `pl.ts` + `en.ts` → verify: `npm run typecheck`.
3. `HistorySessionRow.tsx` (wiersz + menu ⋯ + przeniesione rozwinięcie) + `workout-history-redesign.test.tsx` część wierszowa → verify: testy DOM zielone.
4. `CycleCard.tsx` (active/past, staty, sparkline, tygodnie) → verify: testy DOM część cyklowa.
5. Przebudowa `src/pages/WorkoutHistory.tsx` (sekcja 2; stan/dialogi/testidy nietknięte) → verify: cały `npm run test`, `npm run lint`.
6. `useCycleSessions.ts` (lazy fetch przeszłego cyklu) + stan błędu z wyjściem → verify: test hooka z mockiem `fetchWorkoutRange`.
7. Aktualizacja `e2e/email-coach-button.spec.ts` + `e2e/critical.spec.ts` → verify: pełne e2e (pamiętać: świeży dev server, `pkill -f vite` + czyszczenie `node_modules/.vite` przy masowych failach - zasada #9).
8. Pętla weryfikacji designu: `npm run build` + screenshot e2e-mock viewport 390 vs artboard 1a; powtórka na 3 akcentach (limonka default, amber, sky) - zero pozostałości innego akcentu, zero horizontal scrolla.
9. Checklist wdrożeniowy z CLAUDE.md (test/typecheck/lint/build, scenariusz sekwencji: historia → otwórz trening → wróć → rozwinięcia/porównanie na miejscu, commit, deploy web, bump iOS itd.) + wpis do `DECYZJE.md`.
