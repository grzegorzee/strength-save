# WP-H (X28): Historia v2 "tiles" — kafle cykli, poziom cyklu, jeden Export

> **For agentic workers:** TDD, przeczytaj `docs/plans/x28/00-OVERVIEW.md`, global constraints z x27 ORAZ `docs/plans/x28/design-history-tiles.md` (pełna specyfikacja wizualna — wiążąca). Pracujesz w IZOLOWANYM WORKTREE — commituj swoją pracę na swojej gałęzi po zielonych bramkach.

**Goal:** przebudowa `/history` wg designu 2a+2b+2c: poziom 1 = kafle cykli (sparkline tonażu, tag, PRs) + przycisk PERIOD + jeden przycisk Export + LATEST SESSIONS; poziom 2 = widok cyklu (`?cycle=`) ze statami, chipsami i sesjami grupowanymi tygodniami; pełna płaska lista pod `?list=all` (tam wyszukiwarka i dotychczasowe filtry); Export = bottom sheet z zakresem (okres/cykl/wszystko) i formatami (PDF / CSV / do trenera); Porównaj i wyślij-sesję w menu ⋯.

**Kontekst techniczny (stan po X27):**
- `src/pages/WorkoutHistory.tsx` (~700 linii): hooki `useWorkoutHistoryPage` (paginacja), `usePlanCycles`, `useWorkoutAggregate` (licznik/tonaż all-time), `useCycleSessions` (lazy sesje przeszłych cykli), resolver nazw, `assignWorkoutsToCycles`/`buildCycleSparkline`/`weekNoFor`/`groupCycleWorkoutsByWeek` (`src/lib/history-cycles.ts`), `cycleRangeLabel` z guardem "teraz" (fix E-8UE4S — ZACHOWAJ semantykę!), dialogi EmailWorkoutDialog (history+workout), ExportWorkoutsDialog (CSV), delete z AlertDialog, tryb porównania.
- Komponenty: `src/components/history/HistorySessionRow.tsx` (wiersz sesji z menu ⋯ — kontrakt testów: komplet akcji), `CycleCard.tsx`.
- Wzorce poziomów: `?group=` w `ExerciseLibrary.tsx:124-156`; kafle `GroupTile` (użyj własnego wariantu kafla cyklu — sparkline zamiast obrazka, NIE zmieniaj GroupTile).
- PDF: `src/lib/pdf-report.ts`; CSV: logika w `ExportWorkoutsDialog`; mail: `EmailWorkoutDialog` mode history.
- Testy kontraktowe: `src/test/workout-history-redesign.test.tsx` (12 testów — w tym regresja E-8UE4S i niezmienniki "menu ⋯ ma komplet akcji", "sesja bez cyklu osiągalna", "licznik == suma wierszy"), `route-smoke` (/history na 6 stanach), e2e history w `full-app.spec.ts` + inne (grep `history` w e2e/).
- i18n: anchor `history.*`. Fixtury: canonical-states (rozszerzaj o nowe id na końcu).

**Files:**
- Modify: `src/pages/WorkoutHistory.tsx`, `src/components/history/CycleCard.tsx` (→ kafel wg designu lub nowy `CycleTile.tsx` obok), `src/i18n/locales/*`
- Create: `src/components/history/CycleDetailView.tsx` (poziom 2 — wydziel z WorkoutHistory dla czytelności), `src/components/history/HistoryExportSheet.tsx` (2c), `src/test/history-tiles.test.tsx`
- Test: aktualizacja `workout-history-redesign.test.tsx` (niezmienniki ZOSTAJĄ — przenieś asercje do nowej struktury, NIE usuwaj żadnego niezmiennika), e2e specy history (aktualizacja selektorów bez uruchamiania)

## Niezmienniki (NIE WOLNO zgubić — testy mają je pilnować)

1. Każda sesja osiągalna: kafel "Poza cyklami" + pełna lista `?list=all` z paginacją (loadMore) i wyszukiwarką.
2. Regresja E-8UE4S: aktywny cykl `endDate: ''` renderuje zakres z "teraz" na kaflu i w nagłówku poziomu 2 (test zostaje).
3. Komplet akcji sesji (Otwórz/Szczegóły/Porównaj/Wyślij do trenera/Usuń) dostępny z wiersza (menu ⋯) na poziomie 2 i w pełnej liście.
4. Licznik nagłówka = realna liczba sesji (aggregate all-time gdy bez filtrów — obecna logika).
5. Draft ma badge; filtr draftów działa (chip DRAFTS na poziomie 2 i/lub w pełnej liście).
6. Usuwanie: AlertDialog z X (kontrakt X27), po usunięciu wiersz znika wszędzie.
7. Tonaż w podsumowaniu: bez filtrów = aggregate backendowy; z filtrami = suma listy (obecna zasada "nigdy dane zmyślone").

## Edge cases

1. 0 cykli (świeży user z sesjami ad-hoc): grid pokazuje tylko kafel "Poza cyklami"; 0 sesji → EmptyState jak dotąd.
2. PERIOD filtruje poziom 1 (liczniki kafli i LATEST) po zakresie dat; czyszczenie zakresu wraca do all-time. Sparkline liczony z sesji cyklu niezależnie od PERIOD (kształt cyklu, nie wycinka) — odnotuj tę decyzję w UI raportu.
3. `?cycle=<id>` nieznany → poziom 1. Wejście/wyjście resetuje scroll (wzorzec exercises).
4. Sesje lazy przeszłych cykli (`useCycleSessions`): wejście w przeszły cykl dociąga sesje (istniejący mechanizm) — spinner w poziomie 2.
5. LONGEST FIRST: sort po `durationSec` malejąco w ramach cyklu; sesje bez durationSec na końcu.
6. Export sheet: zakres THIS PERIOD aktywny tylko gdy PERIOD ustawiony (inaczej domyślnie ACTIVE CYCLE gdy istnieje, else ALL HISTORY); każdy format używa ISTNIEJĄCEJ ścieżki generacji z przefiltrowanym zbiorem sesji.
7. Radix: sheet/dialogi zamykane wyłącznie przez open=false; zamknięcie sheeta PRZED nawigacją/mutacją.

## Tasks

- [ ] **H1 (TDD, poziom 1):** testy w `history-tiles.test.tsx` (fixtures canonical-states + wzorzec z workout-history-redesign): kafle cykli (aktywny z tagiem ACTIVE i zakresem z "teraz"; przeszłe z zakresem dat), kafel "Poza cyklami", LATEST SESSIONS (3 najnowsze), link "All sessions" → `?list=all` (pełna lista z wyszukiwarką). Run → FAIL → implementacja → PASS.
- [ ] **H2 (TDD, poziom 2):** testy: `?cycle=` renderuje nagłówek (nazwa, pill ACTIVE, zakres, 4 staty), chipsy filtrów działają (ALL/PRS ONLY/DRAFTS/LONGEST FIRST), sesje grupowane tygodniami (nagłówek WEEK n · CURRENT w akcencie dla bieżącego), wiersz ma menu ⋯ z kompletem akcji, back wraca. Implementacja `CycleDetailView`. → PASS.
- [ ] **H3 (TDD, Export sheet):** testy: przycisk Export otwiera sheet; chipsy zakresu przełączają; PDF/CSV/do trenera wołają istniejące mechanizmy z właściwym zbiorem (mock); Cancel/X zamyka. Implementacja `HistoryExportSheet` (formaty delegują do istniejących: pdf-report, logika CSV z ExportWorkoutsDialog — wydziel funkcję jeśli była w komponencie, EmailWorkoutDialog history). → PASS.
- [ ] **H4:** aktualizacja `workout-history-redesign.test.tsx` — KAŻDY niezmiennik przeniesiony do nowej struktury (żaden test nie skasowany bez odpowiednika); e2e history specy zaktualizowane (bez uruchamiania).
- [ ] **H5:** `npx vitest run` (OOM: NODE_OPTIONS=--max-old-space-size=6144) + `npm run typecheck` + `npm run lint` + route sweep zielone. COMMIT na gałęzi worktree: `feat(x28): WP-H Historia v2 tiles - kafle cykli, widok cyklu, jeden Export` (+ drugi commit jeśli logicznie rozdzielne). Raport: nazwa gałęzi + hash(y), pliki, decyzje, co do testu na urządzeniu.

## Pułapki

- Zakres dat w labelach: użyj bieżącego wzorca z kodu (po sweepie X27 separator zakresów to zwykły łącznik/przecinek — sprawdź `cycleRangeLabel` i trzymaj spójność; guard "teraz" zostaje).
- `parseLocalDate` w renderze ZAKAZANY (guard date-label-guard) — etykiety przez `formatLocalDateLabel`/safe warianty; logika sortowań może używać rzucającego (plik WorkoutHistory jest na liście wyjątków z dokładną LICZBĄ wystąpień — aktualizuj mapę wyjątków świadomie).
- `color-mix` zakazany (design go używa — mapuj na /10 /15).
- Nie ruszaj `HistorySessionRow` kontraktu menu (testy).
- Worktree: NIE wykonuj `git push`; tylko lokalne commity na swojej gałęzi.
