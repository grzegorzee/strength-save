# Z215: mapa zależności od pełnej historii treningów

> Stan na 2026-08-10. Kontekst: globalny listener `workout-read-store` pobiera
> 500 najnowszych treningów (limit) dla każdego zalogowanego ekranu. Ta mapa
> klasyfikuje każde obliczenie zależne od `workouts` przed implementacją Z216
> (recent realtime + pagination) i Z217 (agregaty). Pomiary są już tierowane
> per ekran (Z213), aktywności mają okna (Z214).

## Klasyfikacja

- **RECENT** — wystarczy realtime okno ostatnich treningów (bieżący listener,
  docelowo mniejszy limit).
- **RANGE** — zapytanie o zakres dat na żądanie (`fetchWorkoutRange` /
  `fetchWorkoutHistoryPage`, już istnieją od X10).
- **AGGREGATE** — semantycznie all-time; przy >500 treningach obecny wynik jest
  JUŻ przybliżeniem (licznik/tonaż liczone z okna 500). Docelowo wersjonowany
  dokument agregatu (Z217) aktualizowany przy finalizacji/edycji/usunięciu.

## Mapa obliczeń

| Obliczenie | Implementacja | Konsumenci | Klasa | Test fixture (zamrożenie) |
|---|---|---|---|---|
| Tonaż all-time `getTotalWeight` | `calculateTonnage` (`summary-utils`) | Dashboard (kafel), Achievements | AGGREGATE | `summary-utils.test.ts`, `z215-history-freeze.test.ts` |
| Licznik ukończonych `getCompletedWorkoutsCount` | `useFirebaseWorkouts` | Dashboard, Achievements, WorkoutDay (numer treningu przy finalizacji) | AGGREGATE | `z215-history-freeze.test.ts` |
| „Twoje liczby" (czas, tonaż, serie, streaki, PR, ulubione, 1. data) | `buildAllTimeStats` (`all-time-stats`) | AllTimeStatsSheet | AGGREGATE | `all-time-stats.test.ts`, `z215-history-freeze.test.ts` |
| Streak bieżący + najdłuższy | `calculateStreakDetails` / `calculateLongestStreak` (`summary-utils`) | AllTimeStatsSheet, share image (`share-utils`), AnalyticsChartsTab (zakładka streak) | AGGREGATE (longest); bieżący liczy TYGODNIE od realnego „dziś" (wartość na stałym fixture dryfuje w czasie — zamrożony tylko longest), przerwa >tygodnia go kończy, więc RECENT wystarcza w praktyce — klasyfikowany AGGREGATE dla spójności jednego źródła | `summary-utils.test.ts`, `z215-history-freeze.test.ts` (longest) |
| Detekcja PR przy finalizacji | inline WorkoutDay (`previousWorkoutsForPR` = completed z listenera) + `buildHistoryRowMeta` (`history-stats`) | WorkoutDay (toast PR), Historia (odznaki PR) | AGGREGATE (per-exercise best) — obecnie okno 500 | `history-stats.test.ts`, `pr-utils.test.ts` |
| Best 1RM / max weight per ćwiczenie | `pr-utils` (`getExerciseBest1RM`) | ExerciseProgressionDialog, CycleDetail | AGGREGATE (docelowo per-exercise best w agregacie) | `pr-utils.test.ts` |
| Poprzedni trening dnia (prefill ciężarów, `previousWorkout`) | inline WorkoutDay:524 + `next-set-advice` | WorkoutDay/ExerciseCard | RECENT (ostatni trening danego dnia planu) | `next-set-advice.test.ts` (logika porad) |
| `getWorkoutsByDay` / `getTodaysWorkout` / `getLatestWorkout` | `useFirebaseWorkouts` | WorkoutDay, DayPlan, TrainingPlan | RECENT | `workout-day-view.test.ts` (niezmiennik listy) |
| Przegląd miesięcy (12 mies.) | `monthly-stats` | Analytics Podsumowanie | RANGE (12 miesięcy wstecz) | `monthly-stats.test.ts` |
| Tygodniowe podsumowania (12 tyg.) | `buildLocalWeeklySummaries` | AnalyticsWeeklyTab | RANGE (12 tygodni) | brak dedykowanego — pokryte E2E analytics |
| Wykresy (treningi, tonaż, waga, streak, progresja) | inline AnalyticsChartsTab | Analytics Wykresy | RANGE (wybrany okres) + AGGREGATE dla streak | E2E analytics + `z215-history-freeze.test.ts` (tonaż) |
| Hybrid load (12 tyg. balans + interferencja 7 dni) | `hybrid-load` (`computeDailyLoads` agreguje per dzień) | HybridLoadCard, HybridWeekStrip | RANGE (12 tyg. / 7 dni) | `hybrid-load.test.ts` |
| Statystyki cyklu | `computeCycleStats` (`cycle-insights`) | Cycles/CycleDetail | RANGE (zakres dat cyklu) | `cycle-insights.test.ts` |
| Historia treningów (lista) | `fetchWorkoutHistoryPage` | WorkoutHistory | GOTOWE (paginacja kursorem od X10) | `workout-read-store.test.ts` |
| Sync/draft (promocja provisional, retry) | SyncCenterCard, AutoSyncOnReconnect | point-reads po id + kolejka | RECENT (nie zależy od pełnej historii) | testy syncu (X10/X23) |
| Progresja (silnik targetów) | `progression-engine` | WorkoutDay, plan | RECENT (ostatnie tygodnie cyklu) | `progression-engine.test.ts` |
| Raport PDF (12 mies.) | `buildTrainingReportModel` (`pdf-report`) | Analytics | RANGE (12 miesięcy) | E2E analytics-pdf |

## Konsekwencje dla Z216/Z217

1. **Z216 (recent realtime + pagination):** globalny listener może zejść z 500
   do okna realnie potrzebnego przez RECENT (WorkoutDay/DayPlan/Dashboard
   timeline; ostatni trening każdego dnia planu mieści się w ~kilkudziesięciu
   wpisach). Widoki RANGE przechodzą na `fetchWorkoutRange` na żądanie.
   `AutoSyncOnReconnect` nie potrzebuje szerokiego listenera (point-reads).
2. **Z217 (agregaty):** dokument agregatu pokrywa klasę AGGREGATE (tonaż,
   licznik, streaki, per-exercise best/PR, ulubione ćwiczenie, pierwsza data,
   czas łączny). Wymagany test RÓWNOWAŻNOŚCI: agregat liczony przyrostowo ==
   `buildAllTimeStats`/`calculateTonnage` na tym samym fixture (golden values
   w `z215-history-freeze.test.ts`). Brak agregatu = fallback na obecne
   obliczenia z okna (bez regresji względem dzisiejszego zachowania).
3. **Uczciwe nazwanie obecnego stanu:** przy >500 treningach dzisiejsze
   „all-time" liczby są liczone z okna 500 — agregat Z217 je NAPRAWIA, a nie
   tylko przyspiesza. Backfill musi być wznawialny i bezpieczny (bez zapisu na
   koncie usera bez zgody).

## Dodatkowe listenery poza workouts (kontekst kosztowy)

- `usePlanCycles`: 13 konsumentów × osobny listener (60 doc.) — kandydat na
  współdzielony store przy Z216 (dedup, nie zmiana wyników).
- `useExerciseNotes` (300), `useCustomExercises` (100): małe, poza zakresem.
- Pomiary: tierowane per ekran od Z213. Aktywności: okna od Z214.
