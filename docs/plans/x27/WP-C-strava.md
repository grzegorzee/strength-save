# WP-C: Strava — ręczny sync maks. raz dziennie + rozdzielenie spacerów od biegów

> **For agentic workers:** wykonuj task-by-task, TDD. Przeczytaj najpierw `00-OVERVIEW.md`.

**Goal:** (1) przycisk ręcznego syncu Strava można użyć maksymalnie raz na dobę (server-side enforcement + czytelny stan w UI); (2) spacery (Walk/Hike) przestają zaburzać statystyki biegowe: pace, tygodniowe km, "longest run", PR-y — oraz są odróżnialne w widokach.

**Architecture:** cooldown już istnieje server-side (5 min) — podnosimy do 24 h i pokazujemy stan w UI na bazie `users/{uid}.stravaLastSync`. Klasyfikacja: wprowadzamy w `strava-utils.ts` jawne predykaty `isRunLike` (Run+TrailRun+VirtualRun) i `isWalkLike` (Walk+Hike) i używamy ich konsekwentnie; totals rozdzielone na bieg/spacer.

**Tech stack:** React + TS, Firebase Functions, vitest.

**Spec / kontekst (ustalone rozpoznaniem):**
- Cooldown: `MANUAL_SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000` w `functions/src/strava-activity.ts:80`; pure helper `manualSyncRetryAfterSeconds(lastSyncIso, nowMs, minIntervalMs?)` `:88-99`; enforcement w `functions/src/index.ts:532-536` (`HttpsError("resource-exhausted", ...)`); klient mapuje na `strava.err.rateLimited` w `src/hooks/useStrava.ts:139-142`. Stan: `users/{uid}.stravaLastSync` (ISO). Scheduled sync (`stravaScheduledSync`, cron 10:00 UTC) i OAuth callback OMIJAJĄ cooldown — tak ma zostać.
- Przycisk syncu: `src/pages/Settings.tsx:361`, handler `:108-121`, `syncActivities()` w `useStrava.ts:118-149`.
- Klasyfikacja: `isPaceActivity` (`src/lib/strava-utils.ts:125-126`) = Run||Walk||Hike RAZEM (używane w `computeSummaryStats:170-175`, `computePaceTrendData:250-257`, `computeMonthlySummaries:312-318`); `isRunActivity` (`:134-135`) = Run only (używane w cardio PR `:438` i `src/lib/race-predictor.ts:43`).
- Totals mieszają wszystko: `computeWeeklyKm` `:212-215`, `computeMonthlySummaries` totalKm `:300-303`, `detectCardioPRs` "longest_run" `:456-462` (długi spacer może wygrać "longest run").
- Normalizacja typów: `src/lib/activity-icons.ts` (`baseActivityType:45`, mapa `SPORT_TYPE_BASE:25-37` — TrailRun/VirtualRun→Run; Walk zostaje Walk). UI filtr istnieje tylko: `StravaTab.tsx:48` (odfiltrowuje WeightTraining/Crossfit).
- Backend digest: `functions/src/weekly-digest.ts:86` filtruje `type === "Run"` (gubi TrailRun/VirtualRun) — ujednolicić.

**Files:**
- Modify: `functions/src/strava-activity.ts`, `src/hooks/useStrava.ts`, `src/pages/Settings.tsx`, `src/lib/strava-utils.ts`, `src/lib/race-predictor.ts` (tylko jeśli podmiana predykatu), `src/components/strava/StravaTab.tsx`, `functions/src/weekly-digest.ts`
- Test: `src/test/strava-utils.test.ts` (jeśli istnieje — rozszerz; jeśli nie — utwórz), test cooldownu w `functions` (istniejący test `manualSyncRetryAfterSeconds` — znajdź po nazwie), test UI przycisku w `src/test/`
- i18n: klucze przy anchorze `strava.*`

**Interfaces:**
- Produces (dla spójności w przyszłości): `isRunLike(a): boolean` i `isWalkLike(a): boolean` eksportowane z `src/lib/strava-utils.ts`. `isRunLike` = dotychczasowa semantyka `isRunActivity` (Run + sportType zawiera "Run"); `isWalkLike` = type/sportType Walk lub Hike.

## Edge cases

1. Pierwszy sync (brak `stravaLastSync`) — zawsze przechodzi (istniejąca semantyka helpera).
2. `fullSync` podlega temu samemu 24 h cooldownowi (jak dziś 5-minutowemu).
3. Klient offline / stary `stravaLastSync` w cache — UI liczy odblokowanie z danych profilu; jeśli server odrzuci mimo aktywnego przycisku, toast z godziną odblokowania (payload `retryAfterSeconds` już wraca w komunikacie błędu — wykorzystaj).
4. Aktywność bez `sport_type` (stare rekordy) — klasyfikacja spada na `type`; brak obu → traktuj jak "Other", nie Run.
5. Treadmill (manualny typ) jest biegowy w `INTENSE_CARDIO_TYPES` — NIE zmieniaj `hybrid-load.ts` (poza zakresem).
6. Pace trend i avg pace liczone TYLKO z `isRunLike` (spacer z wózkiem nie psuje trendu tempa). Spacery dostają własną pozycję w podsumowaniu (patrz C3).

## Tasks

### Task C1: cooldown 24 h (backend, TDD)

- [ ] Znajdź istniejący test `manualSyncRetryAfterSeconds` (grep w `src/test/` i `functions/`); dodaj przypadek: `lastSync` 23 h temu → retryAfter > 0; 25 h temu → 0. Zmień oczekiwania na nowy interwał. Run → FAIL.
- [ ] `functions/src/strava-activity.ts:80`: `MANUAL_SYNC_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000` (zostaw nazwę). Run → PASS.
- [ ] Build functions → zielone.

### Task C2: stan przycisku w UI

- [ ] Test UI: przy `stravaLastSync` < 24 h temu przycisk syncu jest disabled i pokazuje kiedy będzie dostępny (klucz `strava.syncAvailableAt`, PL: "Sync dostępny {time}", EN: "Sync available {time}"); przy braku/starym syncu — enabled.
- [ ] Implementacja: w `useStrava.ts` wystaw `nextSyncAvailableAt: Date | null` (licz z `stravaLastSync` + 24 h); w `Settings.tsx:361` disabled + podpis. Format czasu: `toLocaleTimeString`/`toLocaleDateString` wg języka (jutrzejsza data → pokaż też dzień).
- [ ] i18n: `strava.syncAvailableAt` po ostatnim kluczu `strava.*` w pl.ts i en.ts.
- [ ] Run → PASS.

### Task C3: predykaty i rozdzielenie statystyk (TDD)

- [ ] Testy w `src/test/strava-utils.test.ts` (utwórz jeśli brak; fixture aktywności: Run, TrailRun (sportType), Walk, Hike, Ride):
  1. `isRunLike`: true dla Run/TrailRun, false dla Walk/Hike/Ride.
  2. `isWalkLike`: true dla Walk/Hike, false dla Run/Ride.
  3. `computeSummaryStats`: avg pace liczone tylko z run-like (asercja wartości przy fixture z biegiem 5:00/km i spacerem 12:00/km → wynik 5:00/km).
  4. `computeWeeklyKm`: zwraca rozbicie — biegowe km nie zawierają spaceru (patrz niżej sygnatura).
  5. `detectCardioPRs` "longest_run": spacer 20 km NIE wygrywa z biegiem 10 km.
  6. `computePaceTrendData` i `computeMonthlySummaries` pace: tylko run-like.
- [ ] Run → FAIL.
- [ ] Implementacja w `strava-utils.ts`:
  - dodaj `isRunLike` (przenieś semantykę `isRunActivity`) i `isWalkLike`; `isRunActivity` zostaw jako alias (nie wyłamuj istniejących importów) lub podmień użycia — wybierz mniejszy diff.
  - `isPaceActivity` → używane w pace-avg/pace-trend miejscach zastąp `isRunLike` (sam `isPaceActivity` może zostać dla formatowania min/km w kartach aktywności — `StravaActivityCard.tsx:29` pokazuje pace także dla spacerów i to jest OK).
  - `computeWeeklyKm` i `computeMonthlySummaries`: rozdziel dystanse. Minimalny kontrakt: `computeWeeklyKm(activities)` zwraca jak dotąd łączne km (nie łam konsumentów), ale dodaj `computeWeeklyRunKm(activities)` używające `isRunLike`; w miejscach UI, gdzie metryka nazywa się "run"/biegowa, podmień na wariant Run. W `computeMonthlySummaries` dodaj pola `runKm` i `walkKm` obok `totalKm` (konsument: StravaTab/MonthlySummary — zaktualizuj render, żeby pokazywał "Biegi X km · Spacery Y km" tam, gdzie dziś jest jedna liczba; sprawdź realnego konsumenta greppem `computeMonthlySummaries`).
  - `detectCardioPRs` longest_run: filtr `isRunLike`.
- [ ] Run → PASS.

### Task C4: filtr typów w widoku Strava

- [ ] Test: `StravaTab` renderuje chipsy filtra typu ("Wszystko / Biegi / Spacery / Rower / Inne") i po wyborze "Biegi" lista aktywności zawiera tylko run-like.
- [ ] Implementacja w `StravaTab.tsx`: stan `typeFilter`, chipsy wzorem istniejących chipów w apce (`chip-mono` z index.css), filtr aplikowany na listę aktywności PRZED istniejącym filtrem miesiąca. Statystyki summary nad listą mogą pozostać liczone z całości (nie komplikuj — filtr dotyczy listy; odnotuj w raporcie).
- [ ] i18n: `strava.filter.all/runs/walks/rides/other` przy anchorze `strava.*`.
- [ ] Run → PASS.

### Task C5: ujednolicenie digestu (backend)

- [ ] W `functions/src/weekly-digest.ts:86` podmień `a.type === "Run"` na semantykę run-like (Run || sportType zawiera "Run") — mała lokalna funkcja w tym pliku (functions nie importują z src/). Test jednostkowy digestu jeśli istnieje — zaktualizuj.
- [ ] Build functions → zielone.

### Task C6: finał pakietu

- [ ] `npx vitest run` + `npm run typecheck` + `npm run lint` + build functions → zielone.
- [ ] Raport wg protokołu; odnotuj: scheduled sync zostaje na cronie 1x/dzień (całkowity koszt API bez zmian), manual = drugi sync dziennie max.

## Pułapki

- NIE zmieniaj kolejności/semantyki zapisu `stravaLastSync` (ustawiany po udanym syncu — to on napędza cooldown).
- `weekly-digest.ts` ma testy DI (`buildWeeklyDigestDeps`) — nie psuj kontraktu deps.
- Race predictor (`race-predictor.ts:43`) już używa `isRunActivity` — jeśli zostawiasz alias, zero zmian tam.
