# LOG DECYZJI - Strength Save

> Wszystkie ważne decyzje projektowe w jednym miejscu

---

**Data utworzenia:** 2026-01-28
**Ostatnia aktualizacja:** 2026-06-11 (release-prep: closeout + weekly-digest, build 36)

---

## DECYZJE

### 2026-06-29 — Realizacja planu naprawy po audycie (docs/AUDYT-FIX-PLAN-2026-06-29.md)

Wykonanie zadań Z1-Z12 metodą TDD (test odtwarzający → minimalny surgical fix), osobny commit per zadanie. Bez push/deploy/iOS/functions deploy (czeka na zgodę usera). Poniżej per zadanie.

**Z9 — Twardy throw przy 2 aktywnych cyklach (#7, P2).** `workout-start.ts:55` rzucał `MULTIPLE_ACTIVE_CYCLES`, łapane generycznym catch w `WorkoutDay.tsx:1251` → toast błędu, brak recovery, start zablokowany. Prod: nie występuje (każdy user 1 aktywny) — defensywa danych. Root cause: anomalia danych traktowana jako błąd krytyczny zamiast degradacji. Fix: zamiast throw deterministyczny wybór najnowszego aktywnego cyklu (`createdAt` malejąco, tie-break `id`) z `console.warn`; start kontynuuje. Catch generyczny zostaje (inne błędy). Test `workout-start.test.ts` (2 aktywne cykle, obie kolejności wejścia → wybrany „newer", brak wyjątku). Weryfikacja: vitest 424, typecheck/lint OK.

**Z8 — Nieskończony spinner startu treningu przy pustym uid (#6, P2).** Gate `startSourcesReady` w `WorkoutDay.tsx:1560` wymaga 4 źródeł `isLoaded`. Trzy z nich robiły early-return bez ustawienia loaded przy `!userId`: `useTrainingPlan.ts:33`, `usePlanCycles.ts:66` oraz `workout-read-store.ts` (`getWorkoutReadSnapshot('')` → EMPTY_SNAPSHOT z `isLoaded:false`). Gdy uid chwilowo puste (odświeżanie tokena), spinner wisiał bez komunikatu ani timeoutu. Root cause: brak konwencji „puste, ale gotowe" w 3 z 4 źródeł (loader draftu `WorkoutDay.tsx:712` JUŻ ją miał: `!uid → setIsDraftLoaded(true)`). Fix (spójny z istniejącym wzorcem): `!userId → setIsLoaded(true)` w obu hookach; w read-store osobna stabilna `EMPTY_LOADED_SNAPSHOT` (isLoaded:true) zwracana dla pustego uid (stabilna referencja konieczna dla useSyncExternalStore). Test `workout-start-sources.test.ts` (mock `@/lib/firebase` bo realny init pada w jsdom): `getWorkoutReadSnapshot('')` → isLoaded true, puste dane. Hooki: zmiana to mechaniczne odwzorowanie zweryfikowanego wzorca draftu (brak harnessu renderHook+firestore w repo). Weryfikacja: vitest 423, e2e:mock 116 (jeden przebieg miał flake exercise-card-v3:62, zielony po powtórce i w pełnym ponowieniu), typecheck/lint OK.

**Z7 — Asymetria status: reguły vs callable (#2, P2).** `firestore.rules` (hasSelfAccess, :24-33) traktuje brak pola `status` jak aktywny (fix z incydentu „Missing or insufficient permissions"), ale `functions/src/security.ts hasCallableAppAccess` wymagał `status === 'active'` → konto bez `status` (Google/legacy) zapisze trening, ale AI/Strava odrzuci („Active app access required"). Bramkuje `index.ts:572,676,790`. Prod: 0 userów dotkniętych dziś (wszyscy active po backfillu) — defekt latentny. Root cause: niespójna logika dostępu między warstwą reguł a callable. Fix: `hasCallableAppAccess` zrównane z regułami — brak `profile` (dokument nie istnieje) = false; brak pola `status` (doc istnieje) = aktywny; jawnie nieaktywni (pending_verification/suspended) nadal blokowani; warunek `access.enabled !== false` zachowany. Testy zaktualizowane w `functions/src/security.test.ts` (18 zielonych) i `src/test/functions-security.test.ts` (brak status = dozwolone, undefined = blok, access.enabled:false = blok). Build functions OK.

⚠ ŚWIADOME ODWRÓCENIE wcześniejszej decyzji z 2026-06-29 („pusty profil {} ma dalej być odrzucany"). Uzasadnienie: audyt Z7 wykazał, że to ASYMETRIA — reguły już pozwalają `{}` na zapis, więc callable powinien być spójny; w przeciwnym razie legit konto bez `status` ma częściowy, mylący dostęp. Bezpieczeństwo: wymagamy istnienia dokumentu profilu (`undefined` → blok) i `access.enabled !== false`, więc niezarejestrowany/wyłączony user dalej nie wejdzie. Jeśli user nie zgadza się na poszerzenie dostępu dla pustego `{}` — rollback tego commita. Wymaga `firebase deploy --only functions` (osobna zgoda). Weryfikacja: vitest root 422, functions 18, typecheck/lint/build OK.

**Z6 — P1 KRYTYCZNE: fałszywy konflikt sync po wznowieniu z tła (#1).** Po zgaszeniu ekranu i powrocie (iOS purguje WKWebView) pojawiał się fałszywy „Trening edytowany na innym urządzeniu"; wybór „Pobierz z chmury" = utrata serii. Root cause (potwierdzony w kodzie): `markDraftSynced` (`workout-draft-db.ts:440`) zwracał draft BEZ ZMIAN, gdy `draft.version !== expectedDraftVersion` (edycja serii w trakcie syncu podbiła version). Skutek: `cloudUpdatedAt`/`cloudRevision` (fakt serwera) NIE trafiały do IndexedDB. Korekta żyła tylko w pamięci (`WorkoutDay.tsx:637-645`) i ginęła przy purge. Po resume `expectedRevision` czytane z IDB (`WorkoutDay.tsx:554` = `draft.cloudRevision`) było stale ≠ serwer → `hasWorkoutWriteConflict` true → `WORKOUT_CONFLICT` (`workout-final-sync.ts:30`, `useFirebaseWorkouts.ts:606`). Fix (surgical): w `markDraftSynced` znaczniki chmury zapisywane ZAWSZE (fakt serwera, niezależny od edycji draftu); przy niezgodnej wersji aktualizowane są WYŁĄCZNIE `cloudUpdatedAt`/`cloudRevision`, bez ruszania `dirty` i treści (lokalna edycja czeka na własny sync). Testy: jednostkowy (edycja podbija version w trakcie syncu → cloudRevision=6 i cloudUpdatedAt=777 zapisane, dirty=true, version=2, treść zachowana) + integracyjny (reload z IDB → `hasWorkoutWriteConflict(serwer rev 6, cloudRevision 6)`=false; kontrola negatywna ze stale rev 5 → true). Istniejący test „does not clear a newer local draft" nadal zielony (dirty/version zachowane). ⚠ DŁUG: wymaga ręcznego testu background/resume z edycją serii tuż przed zgaszeniem ekranu na realnym urządzeniu PRZED iOS release. Weryfikacja automatyczna: vitest 422, typecheck/lint OK.

**Z5 — Stale staty completed cyklu (#5, P2).** `usePlanCycles.archiveCurrentPlan` liczy `computeStats` jednorazowo przy archiwizacji i zapisuje do `cycle.stats`. Gdy trening dojdzie/zmieni się PO archiwizacji (np. spóźniony sync z innego urządzenia), completed cykl pokazuje przestarzałe staty — prod: MwiWFE cykl `5Hp8zu20` ma 1 trening, ale `stats.totalWorkouts=0` → po Z4 byłby ukryty. Root cause: zapisane staty completed to migawka, nie żywe źródło. Fix (simplicity-first, jedno źródło prawdy = treningi): helper `withLiveCompletedStats(cycle, workouts)` w `cycle-insights.ts` (analog `buildActiveCyclePreview`, ale zachowuje `endDate` cyklu) przelicza `stats` z treningów otagowanych `cycleId`. Użyty dla completed cykli w Dashboard (`visibleCycles`), Cycles (`visibleCycles`) i Achievements (`seasonShelf`) PRZED filtrem widoczności (Z4) i wyświetleniem — `CycleCard`/`CycleDetail`/medale dostają świeże staty. Zapisane `cycle.stats` zostają jako cache. Aktywny cykl bez zmian (osobny `buildActiveCyclePreview`). Test `cycle-insights.test.ts` (completed ze stale stats=0 + trening w slocie → live totalWorkouts=1, completionRate>0, tonaż 400, endDate zachowany). Weryfikacja: vitest 420, e2e:mock 116, typecheck/lint OK.

**Z4 — Niespójne ukrywanie pustych cykli (#4, P2).** `Dashboard.tsx:184` filtrował cykle tylko przez `isCycleVisible` (flagi `technical`/`hiddenFromInsights` nigdzie nieustawiane → zawsze true), bez warunku `totalWorkouts>0`, więc pusty completed cykl mógł trafić do `previousCompletedCycle` i porównania. `Cycles.tsx:137` i `Achievements.tsx:192` dodawały warunek osobno, każdy inaczej. Root cause: brak jednego źródła prawdy dla „cykl wart pokazania". Fix: helper `isCycleVisibleWithData(c) = isCycleVisible(c) && (c.status==='active' || c.stats.totalWorkouts>0)` w `cycle-visibility.ts`, użyty w Dashboard (184), Cycles (137) i Achievements (192). Bez nowych flag — opiera się na `stats.totalWorkouts`. (Stale staty completed → osobne zadanie Z5.) Test jednostkowy `cycle-visibility.test.ts` (pusty completed ukryty, aktywny pusty widoczny, completed z treningami widoczny, techniczny ukryty). Weryfikacja: vitest 418, e2e:mock 116, typecheck/lint OK.

**Z3 — Cleanup martwego kodu po revercie build 46 (#9, P2).** Trzy sieroty, wszystkie zweryfikowane gremem jako nieosiągalne w produkcji:
1. `enforceWorkingSetCount` — prop usunięty z wywołania `ExerciseCard` w build 46 (`938aadb`), więc zawsze `false`; martwe gałęzie w `ExerciseCard.tsx` (interfejs, destrukturyzacja, `sanitizeSets` 3. arg, blok `if (enforceWorkingSetCount...)` w useEffect, warunki przy przycisku delete/add-set) i w `exercise-utils.ts` (3. param + gałąź enforce w `sanitizeSets`). Usunięto wszystko + test `enforces exactly the planned working-set count`.
2. `src/lib/offline-queue.ts` — `.add()` wołane tylko w teście; w produkcji `offlineQueue.size()` zawsze 0. Usunięto moduł + test; w `useOnlineStatus.ts` realne źródło `pendingOps` to `queueCount + activeCount` (zachowane), zastąpiono `offlineQueue.size()` zerem (zachowanie identyczne, `Math.max(0, ...)` uproszczony).
3. `workout-draft-db.markCompletedLocally` — metoda wołana tylko w teście; pole `completedLocally` żyje przez inną ścieżkę (`WorkoutDay.tsx:1436`, czytane w `useWatchPlanPreview`/`WorkoutDay`), więc usunięto wyłącznie martwą metodę + jej test.

Zmiany czysto refaktorowe, bez zmiany zachowania (TDD-exception: refactor → testy zielone przed i po, minus testy usuniętego martwego API). Weryfikacja: typecheck/lint OK, vitest 414 (47 plików, było 422/48 — minus 6 offline-queue + 1 enforce + 1 markCompletedLocally), e2e:mock 116 passed.

**Z2 — Tonaż cyklu wliczał serie rozgrzewkowe (#3, P2).** `cycle-insights.ts:114` sumował tonaż bez filtra `!set.isWarmup`, podczas gdy `summary-utils.calculateTonnage` (:30) i obliczanie PR-ów w tym samym pliku (:132) rozgrzewki pomijają → tonaż cyklu zawyżony, niespójny. Root cause: pominięty warunek `isWarmup` przy tonażu. Fix (surgical, 1 linia): dodano `&& !set.isWarmup` w reduktorze tonażu. Test regresji w `cycle-insights.test.ts` (rozgrzewka 1000 kg + robocza 360 kg → tonaż 360, było 1360). Weryfikacja: vitest 422 zielone (+1), typecheck/lint OK.

**Z1 — e2e: 2 czerwone testy nawigacji (#12, P2).** Build 46 (`938aadb`) usunął mobilny hamburger/drawer; `sidebarOpen` w `Layout.tsx` nigdy nie jest ustawiane na `true`, więc `Sheet` (boczne menu) na mobile nie da się otworzyć. Dwa testy klikały nieistniejący `button 'Nawigacja główna'` → TimeoutError. Root cause: testy zakładały drawer usunięty w build 46. Fix (tylko `e2e/`): `nav-analytics.spec.ts` — usunięto część otwierającą boczne menu i szukającą Historii (na mobile Historia nie jest już w nawigacji), zachowano pokrycie dolnego paska (Analityka jest, Historia nie); `ui-improvements.spec.ts` — usunięto klik hamburgera + Escape, zachowano asercję braku sidebara na mobile i pętlę Tab sprawdzającą, że linki tylko-sidebarowe (history/measurements/achievements/cycles) nie łapią fokusa. Weryfikacja: `e2e:mock` 116 passed (było 2 failed), typecheck/lint/test 421 zielone.



**Serie:** podczas aktywnego treningu nie dało się dodać/usunąć serii roboczej (tylko rozgrzewkowe). Przyczyna: `enforceWorkingSetCount` (regresja z hardeningu `880cb9e`) wymuszał liczbę serii z planu, ukrywając przyciski +/× (`ExerciseCard` linie 451, 597). Fix: usunięto prop `enforceWorkingSetCount` z wywołania `ExerciseCard` w `WorkoutDay.tsx` (default false) → pełna swoboda jak przed hardeningiem. Reszta logiki (`sanitizeSets`) działa w trybie niewymuszonym.

**Hamburger:** przycisk menu (top-left, `AppHeader`) otwierał mobilny boczny Sheet, który nie działał na iOS (WKWebView). Usunięty: `AppHeader` bez `Menu`/`onMenuClick`, `Layout` nie przekazuje `onMenuClick`. Nawigacja mobilna w całości na dolnym pasku (`AppNavigation` bottom-nav, niezależny). Desktopowy sidebar bez zmian.

Obie to regresje z pakietu hardeningu, nie z builda 44. 421 testów, typecheck, lint, build zielone.

### 2026-06-29 — Zastój/PR pokazywały surowe exerciseId (ex-1-2) zamiast nazw legacy ćwiczeń

**Objaw:** sekcja "Zastój" na Osiągnięciach pokazywała `ex-1-2`, `ex-2-3` zamiast nazw (część ćwiczeń, np. "Uginanie nóg", rozwiązywała się poprawnie).

**Root cause:** mapa `exerciseNames` przekazywana do `detectPlateaus` (Achievements.tsx) jest budowana z `oneRMRecords`, które są **deduplikowane po nazwie** — gdy legacy id (`ex-1-2` = "Przysiad ze sztangą") ma tę samą nazwę co aktualny `tpl-ex-35`, dedup zostawia jeden id i wyrzuca drugi z mapy. `detectPlateaus`/`detectNewPRs` grupują po surowym exerciseId (wszystkie), więc wyrzucony legacy id → `map.get(id) ?? id` → surowe id. Dane są OK: każdy wpis treningu MA zapisane `ex.name`.

**Fix (u źródła, fallback do snapshotu, dane już istnieją):**
- `achievements-utils.ts` `detectPlateaus`: zbiera `ex.name` per id, `exerciseNames.get(exId) ?? snapshotNames.get(exId) ?? exId`.
- `pr-utils.ts` `detectNewPRs`: `... || ex.name || ex.exerciseId`.
- `ai-coach.ts` (kontekst dla AI): `... || ex.name || ex.exerciseId` (AI widziało surowe id).
- Test regresji w `achievements-utils.test.ts` (legacy id + pusta mapa → nazwa ze snapshotu).

**Audyt innych miejsc:** `cycle-insights.ts` już miał fallback do snapshotu; `AnalyticsChartsTab`, Rekordy w Achievements i ExerciseProgression używają `resolver.resolveExerciseName` (snapshot-first) — OK.

421 testów, typecheck, lint zielone. Fix kliencki: web zdeployowany; iOS wymaga builda 45.

### 2026-06-29 — "Missing or insufficient permissions" przy starcie treningu: reguły wymagały status=='active', którego nie mają konta Google

**Objaw:** user nie mógł rozpocząć/zapisać treningu — czerwony błąd "Missing or insufficient permissions". Strona renderowała się (odczyty działały), padał dopiero zapis.

**Root cause (systematic-debugging, potwierdzony na danych prod read-only):** hardening reguł (`880cb9e`, `1aede0f`) dodał `hasSelfAccess`, które do KAŻDEGO zapisu (create/update workouts, plan_cycles, measurements, telemetry) wymaga `users/{uid}.status == 'active'`. Reguły read mają bypass `isAdmin()`, ale write NIE — dlatego odczyty działały, a zapisy padały. Konta z logowania Google (i sprzed flow rejestracji) NIGDY nie dostały pola `status` — gałąź logowania w `registration.ts` aktualizuje `lastLoginAt`, ale nie ustawia `status`. Skala: 2 z 5 userów bez `status` (g.jasionowicz/admin + realna userka joannawojtun32). Dla nie-admina blokowane były nawet odczyty.

**Dlaczego test:rules tego nie złapał:** harness `seedUser` ZAWSZE ustawiał `status` — przypadek dokumentu BEZ pola `status` nie był pokryty.

**Fix (pełny):**
1. Reguła `hasSelfAccess` backward-compat: brak pola `status` = traktuj jak aktywny; jawnie nieaktywni (`pending_verification`, `suspended`) nadal blokowani. Plik `firestore.rules`. Wdrożone na prod (`firebase deploy --only firestore:rules`).
2. Regresja w `scripts/test-firestore-rules.mjs`: dokument users bez `status` → zapis dozwolony (red→green; 46/46 testów reguł przechodzi). `pending_verification` nadal blokowany.
3. Backfill `status:'active'` + `access:{enabled:true}` na 2 kontach (admin SDK, merge, idempotentnie) — naprawia też dostęp do Cloud Functions callable (`hasCallableAppAccess` wymaga status=='active'). Zweryfikowane.

**Źródło dla nowych kont jest OK:** `registerUser` (registration.ts:350-351) ustawia `status`/`access` dla nowych userów. Incydent dotyczył wyłącznie kont legacy. Świadomie NIE ruszano `hasCallableAppAccess` (pusty profil `{}` ma dalej być odrzucany — istniejąca intencja bezpieczeństwa; wszystkie obecne konta mają już status po backfillu).

**To NIE był błąd kodu builda 44** (stabilizacja treningów) — czysto warstwa reguł + dane legacy.

### 2026-06-27 — Stabilizacja treningów: wyścig startu, konflikt Sync Center, odporne statystyki, naprawa danych (build 44 / 6.13.0)

**Objaw:** banner „Ustabilizuj realizację planu" + frekwencja 9/16 (56%) i 7 „opuszczonych",
mimo że właściciel zrobił 16 treningów. Pełna analiza: `docs/ANALIZA_I_PLAN_STABILIZACJI_TRENINGOW_2026-06-27.md`.

**Root cause (2 defekty danych + 4 defekty kodu):**
1. 6 ukończonych sesji (16–26.06) bez `cycleId` → statystyki cyklu ich nie liczyły.
2. Sesja 19.06 miała 13 zaliczonych serii, ale `completed=false` (utknęła między draftem a chmurą).
3. Wyścig startu: `WorkoutDay` autostartował po `isLoaded` listy treningów, nie czekając na plan + cykle + draft → sesje bez `cycleId` i mieszanie ćwiczeń planu domyślnego z właściwym.
4. Sync Center nie rozróżniał typów błędów ani nie oferował rozwiązania konfliktu rewizji.
5. Statystyki liczyły `treningi/oczekiwane` zamiast slotów kalendarza; brak `cycleId` zamieniał obecność w nieobecność; pusty techniczny cykl trafiał na półkę medali (fałszywy „Sezon 0%").
6. Telemetria pisała liczniki jako literalne klucze `counters.x` zamiast mapy `counters`.

**Zrobione (kod):**
- Faza 2: `src/lib/workout-start.ts` (gate `areWorkoutStartSourcesReady` na workouts+plan+cykle+draft, `buildWorkoutStartSnapshot`, `findUniqueCycleForDate`). Autostart i przycisk startu zablokowane do załadowania wszystkich źródeł; bezpieczny backfill `cycleId` przez transakcję `createWorkoutSession` tylko gdy dokładnie jeden cykl pasuje do daty.
- Faza 3: `src/lib/workout-sync-conflict.ts` (`classifyWorkoutSyncError`, `summarizeLocalDraft/Cloud`); SyncCenterCard pokazuje konflikt z porównaniem (ćwiczenia/serie), nie ponawia konfliktu automatycznie; AutoSyncOnReconnect pomija konflikty rewizji.
- Faza 4: `cycle-insights.ts` liczy frekwencję wg slotów kalendarza, dedup duplikatów, cap 100%, `orphanWorkoutCount`; przy orphanie/pending-final pokazuje neutralne „Statystyki wymagają synchronizacji" zamiast coachingu. `cycle-visibility.ts` (`isCycleVisible`) ukrywa cykle `technical`/`hiddenFromInsights` w Dashboard/Cycles/Achievements/usePlanCycles.
- Faza 5: telemetria zapisuje prawdziwą mapę `counters`; nowe metryki `revision_conflict`, `orphan_workout`, `mixed_plan_exercise_set`. Narzędzie `scripts/audit-repair-training-data.mjs` (backup → preview → apply --confirm → verify, backup z SHA256 przed zapisem).
- Feature flag `VITE_FEATURE_WORKOUT_TIMERS=false` (`src/lib/feature-flags.ts`): timery odpoczynku/EMOM/AMRAP/rozgrzewki + ich UI i timer na Watch wyłączone domyślnie; pomiar czasu sesji zostaje.

**Zrobione (dane produkcyjne, konto `g.jasionowicz@gmail.com`, uid U6GDdfg7...):**
- Faza 0: 3 backupy z SHA256 w `private-backups/` (gitignored).
- Faza 1 (zweryfikowane porównaniem snapshotów przed/po): 6 sesji dostało `cycleId=otL65epGl1lQ9eyKIZrO`; ćwiczenia oczyszczone do 5/7/6/5/7 (usunięte puste obce wpisy); 19.06 `completed=true`; techniczny cykl `lkjSbPbc3suvlhEBtFYK` oznaczony `technical=true, hiddenFromInsights=true`.

**Weryfikacja:** `typecheck`, `lint`, `test` (48 plików / 420 testów), `build` web + mobile — wszystkie zielone. Preflight wersji: 6.13.0 / build 44 spójne (Info.plist + 6× MARKETING_VERSION + CURRENT_PROJECT_VERSION).

**Zostaje (Faza 6, ręczne):** test na fizycznym iPhonie (zgaszony ekran, resume, finalizacja, słaby zasięg) i Watch; te bramki realizuje TestFlight. Pełny scenariusz Sync Center (reload bez nawrotu draftu) do potwierdzenia na urządzeniu. `test:rules`/`e2e:emulator` nieuruchomione w tej sesji (reguły Firestore niezmienione).

### 2026-06-18/24 — Pusty paywall IAP: root cause = brak App Review pierwszej subskrypcji (WSTRZYMANE, czeka na usera)

**Objaw:** natywny paywall iOS nie ładuje pakietów (`getOfferings()` → `code=23`, puste pakiety).

**Root cause (systematic-debugging, dowód warstwa po warstwie):** to NIE bug w kodzie ani błąd
konfiguracji. Wszystkie warstwy zielone (klucz w buildzie, kod, RC offering+produkty, ASC
READY_TO_SUBMIT+ceny+lokalizacje, Paid Apps Agreement Active, bundle). Jedyna przyczyna: app w
`PREPARE_FOR_SUBMISSION`, **pierwsza subskrypcja nigdy nie przeszła App Review** — StoreKit nie
serwuje produktów first-time app w sandbox/TestFlight, dopóki IAP nie pójdzie do review z buildem.
Potwierdzone na urządzeniu (build 40 z diagnostyką na ekranie): `cfg=true THROW code=23 ... no App
Store products registered ... for your offerings`. RC backend (odpytany kluczem z builda) zwraca
poprawne identyfikatory — porażka jest na poziomie StoreKit fetch.

**Decyzja:** jedyna droga = wysłać apkę 1.0 z subskrypcjami do App Review (i tak konieczne do sprzedaży).

**Zrobione:** build 40 (diagnostyka, potwierdził root cause) → build 41 (czysty, VALID na TestFlight);
cena Free; kategoria Health & Fitness; privacy/support URL; konto demo Auth (`applereview@strengthsave.app`).

**Blokery (czeka na usera):** service account Firebase (grzegorzee bez GCP IAM na fittracker →
brak Firestore admin write do nadania PRO comp koncie demo); dane kontaktowe recenzenta; akceptacja copy.

**Pełny status + checklist + dane referencyjne:** `docs/APP-REVIEW-IAP-STATUS.md`.

### 2026-06-18 — Naprawa 3 bugów z treningu na siłowni (audyt + TDD wg Karpathy)

**Kontekst:** User zgłosił 3 bugi po realnym treningu (5G, ekran zgaszony). Audyt root cause (3 równoległych agentów Explore) → potwierdzenie w kodzie → fix każdego przez TDD (test odtwarzający RED → fix GREEN), izolowane commity (1 bug = 1 zmiana).

**Bug 1 — miks ćwiczeń z dwóch dni planu w podsumowaniu (część 0/4 serii, część zrobiona).**
Root cause: `findWorkoutForRoute` z `allowDateFallback` wracał do treningu INNEGO dnia planu z tej samej daty (fallback ignoruje `dayId`). Przy starcie dzisiejszego treningu dnia A, gdy istniał ukończony trening dnia B z tej samej daty, init wczytywał ćwiczenia B do `exerciseSets` (`WorkoutDay.tsx:785`), user dorabiał A, a zapis `Object.entries(exerciseSets)` (`:1356`) utrwalał miks obu dni pod jedną sesją.
Fix: nowa opcja `today` w `findWorkoutForRoute` — cross-day fallback działa tylko dla dat PRZESZŁYCH (oglądanie historii po zmianie planu, chronione testem `:16-32`). Dla dzisiejszej daty fallback zablokowany → nowy trening startuje czysto z `baseDay`. Podłączone w widoku (`:189`) i init (`:701`).
Weryfikacja: 3 nowe testy w `workout-lookup.test.ts` (blokada cross-day dziś, fallback historii w przeszłości, własny dzień dziś).

**Bug 2 — layout „rozjeżdża się" w bok przy zamianie ćwiczenia.**
Root cause: nazwy ćwiczeń w nagłówku dialogu zamiany (`WorkoutDay.tsx:1897`) i w pozycjach listy biblioteki (`:1924`) były we flex-kontenerze bez `min-w-0`/`truncate`. Flex-item z długim tekstem ma `min-width:auto`, więc rozpychał kontener szerzej niż ekran → poziomy scroll całej strony.
Fix: `min-w-0` + `truncate` na tekstach, `shrink-0` na przycisku Zamknij.
Weryfikacja: build + scenariusz manualny (CSS layout poza zasięgiem unit-testu).

**Bug 3 — pusta kolumna POPRZ. mimo istniejącej historii.**
Root cause: `getPreviousHint` (`ExerciseCard.tsx`) indeksował `previousSets[globalIndex]`, gdzie `globalIndex` liczył rozgrzewki+robocze bieżącej sesji, a `previousSets` to surowa tablica historii. Różna liczba rozgrzewek między sesjami rozjeżdżała indeksy → `'—'`.
Fix: nowa czysta funkcja `previousWorkingSet()` (`exercise-utils.ts`) filtruje rozgrzewki po obu stronach i indeksuje po kolejności serii roboczych (spójnie z `createPrefilledSets`). `renderSetRow` przekazuje working index.
Weryfikacja: 4 testy w `exercise-utils.test.ts`.

**Uwaga o danych:** Fix bug 1 zatrzymuje tworzenie NOWYCH miksów. Treningi już zapisane z miksem (jeśli istnieją w Firestore) pozostaną — to osobna naprawa danych, nie dotykano konta usera (dane święte). Build/resume na urządzeniu do potwierdzenia bug 2.

**Stan:** 376/376 testów zielone, typecheck + lint + build OK. 3 izolowane commity na `main`.

### 2026-06-11 — Rebrand ikony aplikacji: limonkowy hantel 3D

**Co:** Nowa ikona (3D hantel na limonkowym tle #DDF70D, wygenerowana w ChatGPT) wdrożona wszędzie: iOS AppIcon + watch icon (1024px, rogi zalane limonką, bez kanału alpha — wymóg App Store), splash screen (ikona na tle #0e0e0e, 9 wariantów — zastąpiła stare logo tarczy), PWA (pwa-192/512), favicon.png 96px + favicon.svg (embedded PNG), logo w sidebarze (AppNavigation) i na ekranie logowania (zamiast badge "SS" i lucide Dumbbell), tytuł logowania w font-heading (Space Grotesk).

**Dlaczego:** Wyróżnialność w App Store (kategoria fitness = morze ciemnych ikon, solid lime się wybija) + spójność z motywem neon lime apki. Wybrano wariant solid (bez gradientu/tekstury) — najlepsza czytelność przy 60px, zgodnie z Apple HIG.

**Technika:** ImageMagick — maska roundrectangle (promień 186/1254 jak w wypieczonych rogach źródła), wersja kwadratowa (rogi zalane #DDF70D) dla iOS/PWA i wersja z przezroczystymi rogami dla favicon/UI. theme-color #0a0a1a → #0e0e0e (index.html + manifest PWA).

**Weryfikacja:** 350 testów zielonych, typecheck, lint, build OK, web zdeployowany (favicon.svg/png widoczne na live). Nowa ikona iOS pojawi się w TestFlight przy następnym buildzie.

### 2026-06-11 — Aplikacja Apple Watch (StrengthWatch): logowanie serii z nadgarstka

Cel: logowanie treningu bezpośrednio na zegarku, bez wyjmowania telefonu.

**Architektura (zweryfikowana E2E na sparowanych symulatorach iPhone 17 + Watch Ultra 3):**
- Target watchOS `StrengthWatch` (SwiftUI, watchOS 10+, single-target watch app) osadzony w apce iOS. Źródła: `ios/App/WatchApp/`. Target dodawany skryptem `scripts/add_watch_target.rb` (gem xcodeproj, idempotentny).
- Transport: WatchConnectivity. Telefon → zegarek: `updateApplicationContext` (JSON pod kluczem `workout`). Zegarek → telefon: `sendMessage` z fallbackiem `transferUserInfo` (kolejkowane, działa gdy apka telefonu uśpiona).
- Most do warstwy web: lokalny plugin Capacitora `WatchBridge` (`ios/App/App/WatchBridge/`), rejestrowany przez `BridgeViewController` (subclass `CAPBridgeViewController`, podpięty w Main.storyboard). Eventy z zegarka trafiają do trwałej kolejki w UserDefaults (max 500) i są odbierane przez JS listenerem `watchEvent` + `drainEvents()` przy starcie/foregroundzie — nic nie ginie, gdy webview nie żyje.
- Web: `src/lib/watch-bridge.ts` (protokół + API pluginu), `src/hooks/useWatchWorkoutSync.ts` (wysyłka stanu z debounce 800 ms, dedup eventów po `at`), wpięty w `WorkoutDay.tsx`. Serie z zegarka przechodzą przez `handleSetsChange` → draft IndexedDB → istniejący sync do Firestore (zero nowych ścieżek zapisu).
- Zasada MVP: trening trzeba WYSTARTOWAĆ na telefonie (draft + sessionId), zegarek służy do logowania serii. Eventy dla nieaktywnej sesji czekają w natywnej kolejce.
- Zegarek trzyma payload w UserDefaults (działa offline); merge przychodzącego kontekstu zachowuje lokalnie zaliczone serie.
- UI zegarka: lista ćwiczeń (postęp x/y) → serie → edytor (steppery powt./ciężar ±2,5 kg, prefill z poprzedniej zaliczonej serii) → „Zalicz serię" (haptyka). Teksty PL.
- Build: `CURRENT_PROJECT_VERSION = 28` (build 27 wydała równoległa sesja grywalizacji z czystego worktree). Ikona watch = ikona iOS 1024.
- Koordynacja: w repo pracowała równolegle sesja grywalizacji — commit watch zrobiony jawnymi ścieżkami (bez `git add -A`); klucze i18n watch weszły przypadkiem z commitem 901eb27 (nieszkodliwe).
- Dowody E2E: `audit/shots/watch/` (10-watch-context, 13-watch-after-log, 14-phone-after-watch-log — toast „Set from watch" + seria zaliczona na telefonie).
- Wdrożone: web (GH Pages) + **TestFlight build 28** (upload OK, Beta App Review APPROVED od razu). Signing zegarka: `scripts/watch_signing.py` (bundle ID `...watchkitapp` zarejestrowany, profil „Strength Save Watch App Store" na istniejącym cercie Distribution, mapowanie dopisane do ExportOptions-manual.plist — plik poza repo).

### 2026-06-11 (cz. 2) — Start treningu z zegarka + podgląd planu (build 29)

- Zegarek pokazuje plan dnia PRZED startem sesji (Dashboard → `useWatchPlanPreview`, payload `active:false`, prefill jak w WorkoutDay) i ma przycisk „Rozpocznij trening".
- Event `startWorkout` → globalny `WatchEventRouter` (App.tsx) nawiguje do WorkoutDay z `autostart=true`; sesja powstaje istniejącą ścieżką. Plugin dostał `peekEvents` (podgląd kolejki bez kasowania — eventy serii konsumuje wyłącznie WorkoutDay).
- Zaliczenie serii na zegarku w trybie podglądu = niejawny start (sticky lokalny override do potwierdzenia `active:true` z telefonu).
- Aktywny draft → Dashboard wysyła stan z draftu (`active:true`) — zegarek aktualny bez otwierania WorkoutDay (zweryfikowane na symulatorze).
- 4 testy `WatchEventRouter` (nawigacja, peek, filtr daty/typu, dedup po `at`). Ścieżka preview→start nie miała pełnego E2E na symulatorze (dzisiejszy dzień miał realny draft na koncie admina — nie fałszujemy danych treningowych); pierwsza realna weryfikacja w nowy dzień treningowy.
- Wdrożone: web (GH Pages) + **TestFlight build 29** (Beta App Review APPROVED).

### 2026-06-11 (cz. 3) — Rest timer na zegarku + zakończenie treningu z nadgarstka (build 30)

- Rest timer: po zaliczeniu serii zegarek odlicza odpoczynek (czas z ustawień telefonu, klucz `rest-timer-default`, fallback 90 s, payload `restSeconds`); pasek na liście ćwiczeń i w widoku serii, tap = pomiń, haptyka na koniec; nie startuje po ostatniej serii ćwiczenia. Uwaga: haptyka końca timera wymaga działającej apki (bez extended runtime session — świadomie poza zakresem).
- Zakończenie z zegarka: confirmationDialog z liczbą zaliczonych serii → event `workoutFinished` → telefon finalizuje przez `handleCompleteWorkout` (ref, bez drugiego dialogu; guard isCompleted/isExplicitSaving). Zegarek pokazuje sticky ekran „Trening zakończony"; telefon po ukończeniu wysyła `noWorkout`.
- Zweryfikowane na symulatorze (screenshoty 19-26): timer 1:28→0:57, dialog z licznikiem „Zaliczone serie: 2", cancel. Finalizacji NIE wykonano na realnym koncie admina (nie fałszujemy danych treningowych); testowe eventy serii wyczyszczone z natywnej kolejki (plutil -remove). W drafcie dnia pozostała testowa seria 45 kg×6 (wyciskanie, seria 1) z cz. 1 — do ręcznego odznaczenia.
- Wdrożone: web (GH Pages) + **TestFlight build 30** (Beta App Review APPROVED).

### 2026-06-11 (cz. 4) — 5 bugów zgłoszonych z realnego treningu (build 32)

Feedback z porannego treningu na iPhone 14 Pro. Wszystkie 5 naprawione, commit `82e3ad7`.

- **Metryki/Notatka (ExerciseCard):** szare „linki" (`text-muted-foreground/40`) wyglądały na nieaktywne i po otwarciu sekcji znikały bez możliwości zwinięcia. Teraz: przyciski z ramką i jasnym tekstem, działają jak toggle (drugi klik zwija, dane zostają), stan aktywny podświetlony primary.
- **RestTimer — kółko START:** po końcu odliczania kółko pokazywało „START!" (text-2xl, nie mieściło się) i nie było klikalne. Teraz kółko = przycisk: po końcu klik restartuje przerwę, w trakcie pauzuje/wznawia; tekst zmniejszony (text-base). Test: tap po finishu restartuje odliczanie.
- **Brak wibracji/dźwięku końca przerwy na iOS — ROOT CAUSE:** po zgaszeniu ekranu WKWebView wstrzymuje JS, więc `finishTimer` (haptic+beep) w ogóle nie odpalał się w tle. Fix: `@capacitor/local-notifications` — powiadomienie systemowe (dźwięk+wibracja) planowane na deadline+1s przy starcie/wznowieniu timera, anulowane przy pauzie/reset/zamknięciu i przy końcu w foregroundzie (wtedy gra in-app sygnał, +1s bufora eliminuje podwójny dźwięk). Nowy moduł `src/lib/rest-notification.ts`, permission lazy przy pierwszym timerze.
- **„Nie udało się zapisać szkicu lokalnie":** IndexedDB w WKWebView potrafi stracić połączenie po powrocie z tła. `saveActiveDraft`: retry (świeże połączenie) → fallback `localStorage` → błąd tylko gdy oba padną. Komunikat akcjonowalny (nie zamykaj apki, zakończ trening), banner zamykalny (X).
- **Scroll do góry po odblokowaniu telefonu:** dwa defekty starego mechanizmu: (1) klucz `workout-scroll:${sessionId}` pękał po promocji provisional→remote (sessionId się zmienia), (2) pojedynczy `scrollTo` po 250 ms clampował do 0, bo lista jeszcze się nie wyrenderowała. Teraz: klucz `workout-scroll:${uid}:${date}`, restore z retry (250/700/1500/2600 ms, czeka aż strona urośnie), dodatkowo restore na `visibilitychange→visible` gdy iOS wyzeruje scroll bez remountu (warunek: scrollY<100, zapis y>200, świeży <15 min).
- Weryfikacja: 350/350 testów, typecheck+lint czyste. Wdrożone: web (GH Pages) + **TestFlight build 32** (Beta App Review APPROVED).
- **Proces na przyszłość (Karpathy):** bugi typu „timer nie gra przy zgaszonym ekranie" i „scroll wraca na górę" wynikały z testowania wyłącznie na symulatorze/web w foregroundzie. Przy zmianach dotykających cyklu życia apki (timery, zapis, scroll) obowiązkowy scenariusz weryfikacji: zgaś ekran / zbackgrounduj apkę / wróć — na realnym urządzeniu lub z symulacją suspendu, zanim build pójdzie na TestFlight.

### 2026-06-11 (cz. 5) — Zegarek: jednostki kg/lbs + Digital Crown (w buildzie 32)

- Payload watch niesie `unit` (localStorage `unit-system`, jak UnitContext); zegarek wyświetla i steppuje w jednostce usera (krok 2,5 kg / 5 lbs), model i eventy zawsze w kg (zaokrąglenie do 2 miejsc po konwersji). Naprawia hardcoded „kg" na zegarku.
- Edytor serii: Digital Crown kręci ciężarem (`focusable` + `digitalCrownRotation`, haptyka detentów). Koronka niezweryfikowana na symulatorze (idb nie symuluje crown) — sprawdzić na realnym zegarku.
- Commit `116e831`. Build 31 (upload OK, VALID) NIE został rozdystrybuowany — w międzyczasie sesja bugfixowa wypuściła build 32 z main zawierającym te zmiany; dystrybucja 31 byłaby zbędna. Lekcja: `release-ios.sh` pollował 40×, a ASC przetwarzał dłużej; przy TIMEOUT sprawdzić `asc_api.py builds` i ewentualnie dokończyć `testflight_external.py <nr>` ręcznie.

### 2026-06-11 (cz. 6) — Zegarek: one-tap logowanie następnej serii (build 33)

- `WorkoutStore.nextSetSuggestion`: pierwsza niezaliczona seria treningu (wartości z serii albo ostatniej zaliczonej; bez sensownych wartości przycisk się nie pokazuje — zostaje edytor).
- `QuickLogButton` na liście ćwiczeń (z nazwą ćwiczenia) i w widoku ćwiczenia. Jeden tap = seria zalogowana + haptyka + rest timer. Trzy interakcje → jedna.
- Zweryfikowane na symulatorze (screenshoty 29-30): tap zalogował rozgrzewkę, timer ruszył, sugestia przeskoczyła na „Seria 2 · 6 × 50 kg" (pominęła zaliczoną serię 1).
- Testowa rozgrzewka 10×30 mogła wejść do draftu „Góra B" (live drain) — do odznaczenia razem z serią 45 kg×6 z cz. 1, jeśli draft jeszcze aktywny.
- Wdrożone: **TestFlight build 33** (Beta App Review APPROVED). Web bez zmian (iteracja czysto watchowa, bez deploya).

### 2026-06-11 (cz. 7) — Zegarek: sesja treningowa HealthKit + live tętno (build 34)

- `WorkoutSessionManager`: HKWorkoutSession (.traditionalStrengthTraining, indoor) + HKLiveWorkoutBuilder. Start gdy trening aktywny (start z zegarka / kontekst `active` z telefonu / powrót do apki), stop przy finish lub `noWorkout`. Efekt: apka żyje cały trening (haptyka rest timera przy opuszczonej ręce), trening siłowy w Apple Health (tętno, kalorie), live BPM w nagłówku listy.
- Signing: capability HEALTHKIT przez API unieważnia istniejący profil → `watch_signing.py` usuwa wszystkie profile o tej nazwie (też INVALID — blokują create konfliktem nazwy 409) i tworzy świeży. Entitlements `com.apple.developer.healthkit` + `INFOPLIST_KEY_NSHealth*UsageDescription` w add_watch_target.rb.
- NIEZWERYFIKOWANE na symulatorze: trening usera był już ukończony (zegarek poprawnie pokazał „Dziś odpoczynek"), test wymagałby sfałszowania sesji. Realna weryfikacja = pierwszy trening z zegarkiem; arkusz zgody HealthKit pojawi się raz na zegarku.
- Wdrożone: **TestFlight build 34** (Beta App Review APPROVED). Web bez zmian.

### 2026-06-11 (cz. 8) — Zegarek: komplikacja na tarczę (build 35)

- Target `StrengthWatchWidgets` (widget extension watchOS, appex w PlugIns apki zegarkowej): accessoryCircular/Corner (hantla) + accessoryInline; tap otwiera apkę. Skrypt `scripts/add_watch_widget_target.rb` (idempotentny), własny Info.plist z `NSExtensionPointIdentifier = com.apple.widgetkit-extension` (`GENERATE_INFOPLIST_FILE=NO` — kluczy NSExtension nie da się wygenerować z INFOPLIST_KEY_*).
- Signing: `watch_signing.py` zgeneralizowany (ensure_bundle_id/create_profile z parametrami) + sekcja widgets: bundle `...watchkitapp.widgets` (Z4Q5Q88AX9), profil „Strength Save Watch Widgets App Store", ExportOptions z trzema mapowaniami profili.
- Wersje appex MUSZĄ równać się wersjom apki zegarkowej (CFBundleShortVersionString/CFBundleVersion) — bump teraz dotyczy 6 wystąpień CURRENT_PROJECT_VERSION w pbxproj (App ×2, StrengthWatch ×2, Widgets ×2).
- Weryfikacja: build + appex w PlugIns + apka startuje bez crashu; dodanie komplikacji do tarczy do sprawdzenia na realnym zegarku.
- Wdrożone: **TestFlight build 35** (Beta App Review APPROVED). Po 7 iteracjach (buildy 28-30, 32-35) apka watch ma komplet: komplikacja → preview → start → one-tap serie → rest timer (sesja HK trzyma apkę żywą) → live tętno → finish → Apple Health.

### 2026-06-11 (cz. 9) — Release-prep: weryfikacja MUST/SHOULD z PLAN_RELEASE_1.0 (build 36)

Pętla /loop nad sekcją 5 planu release. Kluczowa lekcja: plan audytu był NIEAKTUALNY względem kodu — większość pozycji naprawiły wcześniejsze commity ("audit fixes 13 HIGH"). Każdą pozycję zweryfikowano względem kodu i testów zamiast ślepo "naprawiać".

- **Zweryfikowane jako zrobione wcześniej:** adminDeleteUser (paginacja + błąd auth), reguły Firestore `status=='active'` (testy rules na emulatorze: PASS, w tym deny dla pending_verification), sendEmail rzuca przy błędzie Resend, stabilne ID ćwiczeń (nextId licznik), PlanWizard dni==daysPerWeek, PWA update guard, a11y drawer (Radix Sheet), locale E2E (pl-PL, 111/111 green).
- **NAPRAWIONE — closeout cyklu (bug znaleziony wizualną weryfikacją):** NewPlan liczył statystyki na żywo z workouts (`buildActiveCyclePreview`) i pokazywał ZERA zanim workouts się załadowały, ignorując snapshot `cycle.stats` zapisany przy zamknięciu. Fix: snapshot ?? przeliczenie. Regresja przykryta asercjami 28/32 i 88% w replan.spec.ts; screenshot potwierdza dane + medal sezonu.
- **NAPRAWIONE — weekly-digest:** Resend SDK nie rzuca przy odrzuceniu (błąd w `response.error`); digest logował sukces mimo odrzucenia. Funkcja weeklyDigest wdrożona na Firebase.
- **Domena strengthsave.app w Resend: VERIFIED** (API) — kody rejestracyjne dochodzą.
- **Poza zakresem (świadomie):** otwarcie rejestracji (czeka na decyzje cenowe + RevenueCat, tydzień 1 planu), konflikt draftów multi-device (jedyny otwarty SHOULD).
- Koordynacja: kolizja numeru builda przy uploadzie (równoległa sesja watch wgrała 33-35) — przeskok na 36 z HEAD łączącym obie sesje.
- Wdrożone: web (GH Pages), functions (weeklyDigest), **TestFlight build 36** (Beta App Review APPROVED). Commity `afd1909` + `1fd26f1`. Statusy odhaczone w `docs/PLAN_RELEASE_1.0.md` sekcja 5.

### 2026-06-11 (cz. 13) — Funnel onboardingu wariant B WDROŻONY (build 38): hard paywall bez wyjścia + teaser planu

**Co i dlaczego:** realizacja decyzji z cz. 12 (`docs/PROMPT_ONBOARDING_B.md`). Flow: quiz (bez zmian logiki) → zapis planu → teaser "Twój plan jest gotowy" (zamglone ćwiczenia) → hard paywall bez strzałki wstecz (jedyna ucieczka: Wyloguj) → trial → dashboard z confetti (`/?welcome=1`). Świeży user na iOS bez PRO nie widzi już ŻADNEGO ekranu apki poza paywallem.

**Implementacja:**
- **Route guard (domknięcie dziury z cz. 12):** czysta funkcja `resolvePaywallGuard` (`src/lib/paywall-guard.ts`) + hook `useHardPaywall` (sprawdza `workouts limit(1)`; fail-open przy błędzie odczytu — apki nie zamykamy userowi z danymi, monetyzację chronią bramki akcji) + `PaywallRouteGuard` owijający całe drzewo tras w `App.tsx`. Status `enforced` → każda trasa poza `/paywall` przekierowuje na paywall; `pending` → loader (zero mignięcia dashboardem). Kolejność decyzji: PRO z dowolnego ustalonego źródła zwalnia guard bez czekania na RevenueCat.
- **Anty-"data hostage" zachowane:** user z ukończonymi treningami i wygasłym dostępem zostaje w read-only + bramki akcji + baner (bez zmian). Admin i tier `comp` omijają wszystko. Web: ZERO zmian (invite-only).
- **Teaser** jako wewnętrzny krok `/paywall` w trybie hard (decyzja wykonawcza: jedna trasa = prosty guard, zero problemów z back-stackiem): czas trwania, dni/tydzień, lista dni z ćwiczeniami pod `blur` + gradient, CTA "Odblokuj 30 dni za darmo" odsłania cennik. Po zakupie/restore w trybie hard nawigacja na `/?welcome=1` (tryb zapamiętany w ref, bo zakup gasi `enforced` przed redirectem).
- **Zapowiedź trialu:** dyskretna linijka na ekranie Welcome wizarda ("Najpierw ułożymy Twój plan. Potem 30 dni testujesz za darmo.") — prop `trialNotice` w PlanWizard, włączany tylko w onboardingu na iOS (nie replan, nie web).
- **Seam testowy E2E:** `E2EAuthState` rozszerzony o `simulateNative` / `subscription` / `hasWorkouts`; `isPaywallPlatform()` honoruje symulację tylko w `VITE_E2E_MODE` (RC nieaktywny — efekty RC sprawdzają Capacitor bezpośrednio).
- Wymogi App Review 3.1.2 na paywallu nietknięte (ceny z RC, trial, nota o odnowieniu, restore, legal).

**Weryfikacja:** typecheck + lint + **370 unit** (w tym 8 nowych `paywall-guard.test.ts`: świeży→enforced, expired z treningami→off, admin/comp→off, web→off, pending) + **116 E2E** (5 nowych `paywall-funnel.spec.ts` ze screenshotami teaser+paywall: redirect z `/`, `/plan`, `/analytics`, `/settings`; brak strzałki wstecz; link Wyloguj; expired/admin/comp/web bez redirectu). Scenariusz manualny na urządzeniu: świeże konto → quiz → teaser → paywall; sprawdzić, że back-swipe nie wychodzi z paywalla i że po starcie trialu wchodzi dashboard z confetti.

**Wdrożone:** web (GH Pages) + **TestFlight build 38** (upload OK, Beta App Review **APPROVED**, Robert dostaje build automatycznie). Test zakupu sandbox z cz. 12 nadal otwarty (propagacja produktów po stronie Apple) — ponowić na buildzie 38.

### 2026-06-11 (cz. 12) — Test usera na buildzie 37: decyzja o przebudowie funnelu (wariant B)

**Problem z realnego testu usera:** (1) z paywalla po onboardingu można wyjść strzałką wstecz i przeglądać całą apkę (gating łapie tylko akcje: start treningu, nowy plan), co dla świeżego usera wygląda jak działająca darmowa apka; (2) brak zapowiedzi płatności na początku onboardingu = wrażenie bait-and-switch; (3) paywall to suchy cennik, nie wykorzystuje momentu "właśnie ułożyliśmy Ci plan".

**Rozważone warianty:** A) domknięcie obecnego flow (paywall bez wyjścia), B) pełna przebudowa funnelu wzorem Fitbod (quiz → teaser zamglonego planu → hard paywall → trial → reveal), C) kompromis (A + narracja "plan gotowy"). **Decyzja usera: B.** Zadanie przekazane do osobnej sesji: prompt w `docs/PROMPT_ONBOARDING_B.md` (krótki /goal + pełny kontekst; /goal ma limit 4000 znaków). Zasada zachowana: read-only + eksport dla wygasłych userów Z DANYMI zostaje; hard gate dotyczy tylko świeżych kont bez treningów.

**Test zakupu sandbox:** wstrzymany — StoreKit nie zwracał produktów (stan MISSING_METADATA; po wgraniu screenshotów recenzji oba produkty READY_TO_SUBMIT od ~16:00; pozostała propagacja po stronie Apple, godziny). Ponowić na buildzie 37.

### 2026-06-11 (cz. 11) — Tydzień 1 monetyzacji WDROŻONY (build 37) + podwyżka cen US

**Kod monetyzacji (commity ed9318b, f432437, rejestracja, build 37 TestFlight APPROVED):**
- RevenueCat SDK (configure na starcie, logIn/logOut = uid Firebase), model `subscription` na profilu + `useSubscription` (admin → Firestore comp/webhook → RC CustomerInfo), webhook `revenuecatWebhook` WDROŻONY (sekret REVENUECAT_WEBHOOK_AUTH; chroni tier comp; grace period przy billing_issue).
- Paywall `/paywall`: ceny z RC Offerings, triale 14/30 dni, nota o auto-odnowieniu (3.1.2), restore, linki legal per język. Gating tylko iOS: start treningu, kreator planu, koniec onboardingu → paywall; historia/eksport/konto wolne; baner PRO na Dashboardzie. Web bez paywalla.
- Rejestracja: mobile otwarta (platform w syncUserProfile), web invite-only (isInviteUsable przed utworzeniem profilu). Login na native bez waitlisty/invite. Funkcje wdrożone.
- Testy: 361 app + 63 functions + 10 E2E. Build SPM padł raz na fetchu RevenueCat → fix: `xcodebuild -resolvePackageDependencies -scmProvider system`.

**Podwyżka cen US PRZED startem (zero subskrybentów):** $2.99→**$4.99** (monthly), $19.99→**$29.99** (yearly). Powód: USA jest kotwicą equalizacji — zaniżone US ceny zaniżały 173 pozostałe terytoria; odwrócona siła nabywcza vs PL. Polska BEZ ZMIAN (14,99/99,99 zł, jawna decyzja). Re-equalizacja: DEU €5.99/€34.99, GBR £4.99/£29.99, JPN ¥800/¥5000. Zmiana przez `scripts/asc_subscriptions.py prices`; przejściowe 500 przy hurtowych POST-ach to re-POST-y już zastosowanych zmian (zweryfikowano per terytorium). Stan: oba produkty 175 cen + 175 intro offers, POL nietknięta. Uwaga na przyszłość: weryfikuj ceny po `customerPrice`, nie po ID price pointu (Apple ma wiele pointów o tej samej cenie klienta).

**Hardening do tygodnia 2 (finding security review):** pole `platform` w syncUserProfile jest deklaracją klienta (spoofowalne) — techniczny user może założyć webowe konto bez invite. Ryzyko zaakceptowane na teraz (ochrona przychodu = paywall iOS); właściwy fix: **Firebase App Check** (App Attest) przed publicznym launchem.

**Zostało (user):** RC dashboard: entitlement `pro` + offering default (2 pakiety) + webhook (URL + Authorization). Potem test sandbox na urządzeniu.

### 2026-06-11 (cz. 10) — Monetyzacja: decyzje cenowe + formalności ASC ZALICZONE (Paid Apps ACTIVE)

**Decyzje usera (wiążące dla 1.0):**
- Cennik: **14,99 zł/mies** ($2.99 US) + **99,99 zł/rok** ($19.99 US). BEZ lifetime.
- Triale asymetryczne: miesięczny 14 dni free, roczny 30 dni free (intro offers per produkt; raz na konto Apple per grupa).
- Apka mobilna BEZ kodów invite: zaloguj/zarejestruj na jednym ekranie (email verification zostaje). Web pozostaje invite-only.
- Płatności: RevenueCat (wariant A) zamiast własnego StoreKit.
- Otwarte: zachowanie po końcu trialu (rekomendacja: read-only historia + eksport, blokada nowych treningów).

**Formalności App Store Connect (przeprowadzone z userem krok po kroku, wszystko jednego dnia, finał: Paid Apps ACTIVE):**
- Zaktualizowana ADP License Agreement zaakceptowana → odblokowała resztę.
- Legal Entity uzupełnione; DSA trader: YES, dane publiczne (adres CEIDG, contact@strengthsave.app), dokument tożsamości i adresu: **PDF z VIES** (rejestr VAT UE, po angielsku — sposób na wymóg "English (US)"; NIP 6852331914 zwraca imię+adres). Status: In Review (nie blokuje IAP).
- Paid Apps Agreement: **ACTIVE**. Bank mBank PLN: **ACTIVE** (routing = cyfry 3-10 NRB, SWIFT BREXPLPWMBK). Tax: W-8BEN **ACTIVE** (Foreign TIN=NIP, treaty Poland art. 8 business profits 0%) + Certificate of Foreign Status **ACTIVE** (Individual/Sole proprietor, Title: Owner).
- SBP (15% prowizji): formularz do dokończenia (associated accounts: 4×No; rola Marketing u klienta się nie liczy).
- Dokumenty prawne privacy+terms PL/EN w `landing/legal/` (commit 36f37ed), do publikacji na strengthsave.app.

**Następne:** produkty subskrypcji przez ASC API (agent), RevenueCat (user: konto + In-App Purchase Key), kod: login bez invite + paywall + entitlement gating.

### 2026-06-08 (cz. 6) — Przełącznik jednostek kg ↔ lbs działa w CAŁEJ aplikacji

Cel: przełącznik kg/lbs (Profil) zmienia KAŻDĄ wagę w apce (wyświetlanie, pola wpisywania, wykresy, tonaż, rekordy, podpowiedzi, pomiary, share, onboarding). Wcześniej działał tylko w 4 plikach. **NIE wdrożone** (commit/push/deploy odłożone na życzenie usera — zmiany w working tree).

**Zasada (bez zmiany modelu danych):** kg KANONICZNE w Firestore, konwersja wyłącznie na warstwie UI. Wyświetlanie przez `fmt(kg)`/`toDisplay(kg)`, wpisywanie przez `fromInput(value)` (→ kg przy zapisie), tonaż przez `fmtTonnage(kg)`. Zero twardego "kg" w kontekstach wagi.

**Infrastruktura rozszerzona:** `units.ts` +`formatTonnage` (kg→"12.3 t" / lbs→"27.1 k lbs", tysiące funtów) +`weightUnitLabel`. `UnitContext` +`fmtTonnage`. Nowy `src/test/units.test.ts` (14 testów: round-trip kgToLbs/lbsToKg, formatWeight, formatTonnage, fromInput/toDisplay, brak zaokrąglenia kg przy zapisie).

**Naprawione (~17 plików):**
- **Wpisywanie:** `ExerciseCard` (serie — bez ruszania `setData`/`onSetsChange`, tylko konwersja), `MeasurementsForm` (waga ciała: pre-fill `toDisplay`, zapis `fromInput`; obwody w cm NIE ruszane).
- **Strony:** `Dashboard` (kafelek tonażu `fmtTonnage`, trend +suffix konwertowany, waga ciała, PR), `Analytics` (3 komponenty: schowek, kafelki, wykresy tonaż/waga/per-ćwiczenie z konwersją danych PRZED Recharts + oś/tooltip, weekly summaries), `Achievements` (kafelki, life-PR +delta, wykres trendu 6 mies., milestones, lista rekordów+1RM, dialog historii), `WorkoutHistory`, `Cycles`, `CycleDetail`, `Measurements`, `NewPlan`, `WorkoutDay` (badge tonażu per-ćwiczenie, prompt AI coach, dane share).
- **Komponenty:** `RzaMetricsCard`, `ExerciseProgressionDialog` (wykres+statystyki; bodyweight=powtórzenia bez konwersji przez helper `dispVal`), `ShareWorkoutDialog`+`share-utils` (obrazek share: `generateWorkoutImage` +param `unit`, tonaż przez `formatTonnage`), `PlanWizard` (onboarding "kg/mies" → jednostka usera).
- **Liby z podpowiedziami:** `next-set-advice` (`getNextSetAdvice` +param `unit`, formatowanie wag w `reason`) i `exercise-utils` (`getProgressionAdvice` +param `unit`). Oba `unit: UnitSystem = 'kg'` (default = output identyczny jak wcześniej → 287 testów bez zmian; testy asertujące `'↑ +2.5kg'` i `reason` nietknięte).
- **i18n:** 24 klucze (12 PL + 12 EN) sparametryzowane `{unit}` zamiast twardego "kg": nsadvice.*, progress.increaseWeight, cycles.kgTonnage/kgPerWorkout/est1RM, achievements.totalTonnageSub/ms.tonnage, comp.progression.maxKg, analytics.copy.tonnage/weight, measurements.field.weight, ob.precision.kgMonth.

**Pułapki rozwiązane:** tonaż w lbs (duże liczby) → `formatTonnage` ("t"/"k lbs") zamiast surowego fmt. Progi/milestones: logika `achieved` zostaje na kg, konwertowany TYLKO label. Brak podwójnej konwersji. Nie zaokrąglamy kg przy zapisie (100 lbs = 45.359 kg, zaokrąglenie tylko przy wyświetlaniu).

**Weryfikacja:** `tsc` OK, `eslint` czysty na zmienionych plikach (pozostałe 2 błędy pre-existing: `build/` artefakt iOS + `functions/src/registration.ts`), 287/287 testów, `build:mobile` OK. Playwright (tymczasowy spec, usunięty): `unit-system='lbs'` → nagłówek WorkoutDay "lbs"/zero "kg", label Measurements "Weight (lbs)", Dashboard renderuje bez crashu.

**Świadomie POZA zakresem:** proza generowana przez AI w cotygodniowym podsumowaniu (`generateWeeklySummary` Cloud Function, server-side) nadal cytuje kg — pełna konwersja wymaga zmiany backendu + przekazania `unit` + deploy funkcji. Kafelki liczbowe tego podsumowania (tonaż, PR) JUŻ konwertowane. Strava (km/pace) = dystans, poza zakresem przełącznika wagi. `generateWorkoutSummary` (ai-coach) — nieużywany w UI, pominięty.

---

### 2026-06-08 (cz. 5) — Zgoda na push + poranne przypomnienie o treningu (build 14)

- **Zgoda (Settings → Powiadomienia, `NotificationSettings.tsx`):** przycisk "Włącz powiadomienia" (świadoma akcja → systemowy prompt iOS + rejestracja tokenu) + status + toggle porannego przypomnienia (`notificationPrefs.dailyReminder`). `push-notifications.ts` rozdzielony: `registerPushForUser` (przy starcie, BEZ promptu — tylko gdy zgoda już jest) vs `requestPushPermission` (z Ustawień, prompt).
- **Cron `dailyTrainingReminder` (functions/daily-reminder.ts, deployed):** `onSchedule every day 07:00 Europe/Warsaw`. Push TYLKO w dni gdy user ma dziś zaplanowany dzień treningowy (czyta training_plans/{uid}.days, dopasowanie po weekday; dni wolne pomija). Spersonalizowane: imię + focus dnia. Respektuje dailyReminder + dostęp + token. i18n settings.notif.* (PL/EN). 267 testów. Build 14 VALID+podpięty.
- APNs key skonfigurowany przez usera w tej sesji (Apple Developer → Keys → upload do Firebase Cloud Messaging) — push iOS gotowy do testu.

---

### 2026-06-08 (cz. 4) — Panel admina Faza 1-3 + powiadomienia push (build 13)

Cel: rozbudowa panelu admina (wgląd, kontrola per user, broadcast, flagi) + push do userów/grup. Admin tylko `g.jasionowicz@gmail.com`, BEZ ról (nikt nie nadaje sobie admina).

**Backend (registration.ts + index.ts, deployed):** `adminGetUserLogs` (notification_logs + auth_audit per uid, bez composite indexu), `adminSendUserEmail`, `adminResendVerification`, `adminBroadcastEmail` (all/cohort), `adminSendPush` (FCM sendEachForMulticast, tokeny z users.fcmTokens), `adminDeleteUser` (Auth + Firestore, blokada usunięcia siebie). `updateUserAccess` +reason (zawieszenie → audyt). **AI gate per user**: `assertAiEnabled` w proxyOpenAI/streamOpenAI (features.ai!==false, admin zawsze, domyślnie ON). firestore.rules: `config/feature_flags` (auth read, admin write).

**Frontend (AdminDashboard + 3 karty modularne):** Puls aplikacji (10 metryk, getCountFromServer dla treningów+cykli). Lista userów: szukaj + filtry (aktywni/zawieszeni/bez dostępu/niezweryf.) + sort. Karta usera: logi per-user (Maile/Logowania), koszt AI per user, AI on/off + Strava per user, zawieś z powodem, akcje (mail, kod, reset onboardingu, cohorty, usuń 2x). AdminCommsCard (broadcast mail + push do all/cohort), AdminFeatureFlagsCard (config/feature_flags).

**Push (FCM):** `@capacitor-firebase/messaging`, `lib/push-notifications.ts` (registerPushForUser/listenPushTokenRefresh → users.fcmTokens), `PushRegistrar` w App (native). iOS: aps-environment=production w App.entitlements, capability PUSH_NOTIFICATIONS na App ID (ASC API), profil regen z push (UUID c85f25b1). Build 13 VALID+podpięty.

⚠️ **DOSTARCZANIE PUSH NA iOS WYMAGA KROKU ZEWNĘTRZNEGO:** klucz APNs (.p8) w Apple Developer (Certificates → Keys → Apple Push Notifications service) → upload do Firebase Console → Project Settings → Cloud Messaging → Apple app configuration → APNs Authentication Key. Bez tego iOS nie wygeneruje tokenu FCM ani nie dostarczy push. Backend/klient/UI gotowe.

**Decyzje:** wgląd głównie client-side (reguły admina pozwalają na users/workouts/cycles/ai_usage; logi notification_logs/auth wymagają funkcji bo rules=false). Bez systemu ról. AI domyślnie ON (toggle zapisuje features.ai). 246 testów, tsc/eslint czyste.

---

### 2026-06-08 (cz. 3) — Fixy onboardingu (build 11) + nawigacja (build 12)
Backlog 1-5 onboardingu (404 redirect, walidacja PlanBuilder, banner grace/kickoff, frekwencja rekomendacji, PL nazwy planów, wyszukiwarka bez-diakrytyczna, spójność nagłówków, confetti) + dolny pasek (pigułka pod ikoną) + boczne menu (sekcje GŁÓWNE/POSTĘPY/KONTO). Patrz commity a987c55..1039e42.

---

### 2026-06-08 (cz. 2) — DOKOŃCZENIE: email działa + Apple Sign-In live (build 10) + branding Google + email-gate UX

Z tokenami usera (Cloudflare + pełny klucz Resend, użyte tylko w pamięci sesji) dokończono blokady zewnętrzne z cz. 1:

- **Email z strengthsave.app — DZIAŁA.** Domena dodana w Resend (id 75a2bd1b), 3 rekordy DNS wpisane do Cloudflare przez API (DKIM TXT, SPF MX, SPF TXT) + DMARC (`v=DMARC1; p=none; rua=mailto:grzegorzee@gmail.com`). Domena **verified**. Klucz funkcji (re_Matw, send-only) jest w tym samym koncie → probe wysyłki zwrócił `id`, mail dotarł. `firebase deploy --only functions` wykonany — 24 funkcje live z `from: noreply@strengthsave.app`. Kody rejestracji dochodzą do każdego.
- **Apple Sign-In — LIVE w TestFlight (build 10).** Capability `APPLE_ID_AUTH` włączona na App ID przez ASC API (`scripts/_enable_apple_signin.py`, settings `APPLE_ID_AUTH_APP_CONSENT/PRIMARY_APP_CONSENT`). Provider Apple włączony w Firebase Console (user). Stary profil usunięty + nowy `Strength Save App Store` z capability (UUID 50cc6fd9, `scripts/_regen_apple_profile.py`, reuse cert F52LLKV85G). `CODE_SIGN_ENTITLEMENTS=App/App.entitlements` wpięty do pbxproj (Debug+Release), build 9→10. Pipeline TestFlight: ARCHIVE+EXPORT+UPLOAD SUCCEEDED, build 10 VALID, podpięty do grupy "Wewnętrzni". Do testu na urządzeniu: TestFlight → update build 10 → "Zaloguj przez Apple".
- **Branding logowania Google** (user w konsolach): OAuth consent screen App name "Strength Save" + logo + authorized domain strengthsave.app; authorized domain dodany w Firebase Auth. Fix "logowania do randomowego projektu".
- **Email-gate UX** (build 10): przyciski "Otwórz [provider]" (detekcja domeny maila, `lib/inbox-links.ts`) pod polem kodu + cooldown 60s na ponowne wysłanie kodu.

Build 10 zawiera CAŁOŚĆ sesji (nav, Achievements, Historia, Apple Sign-In, email-gate). 237 testów, tsc/eslint czyste.

---

### 2026-06-08 — Backlog 1-5 (nawigacja, Achievements, Historia, email, Apple Sign-In)

**Kontekst:** realizacja celu "zrobić 1-5 z backlogu + maile z domeny strengthsave.app".

1. **Nawigacja wstecz (spójna).** Decyzja: jeden wzorzec — `AppHeader` dostaje `onBack` dla tras NIE-root; trasy root (bottom nav: `/`, `/plan`, `/history`, `/exercises`, `/profile`) bez strzałki. `Layout.handleBack` = `navigate(-1)` z fallbackiem na `/` gdy brak historii (deep link, `window.history.state.idx`). Usunięto zdublowane in-content back-arrows (Settings, PlanEditor, AdminDashboard, UserPlanEditor, WorkoutHistory) — dublowały tytuł z AppHeader. Focused flow (Workout/Exercise) i fullscreen (NewPlan) zostają z własnym back.

2. **Achievements premium.** Nowy `lib/achievements-utils.ts` (testowalne; 10 testów): `getExercise1RMProgress` (rekord + delta vs poprzedni najlepszy), `getMonthlyTonnage` (6 mies., `refDate` param — sandbox blokuje `new Date()` w testach), `detectPlateaus` (rekord starszy niż ostatnie 3 z min. 4 sesji), `computeMilestones` (progi workouts/tonnage/records). UI: karty top-3 życiowych 1RM z przyrostem, wykres tonażu 6 mies. (Recharts), siatka odznak achieved/locked, karta zastoju z CTA do progresji. Usunięto zdublowaną kartę "Tonaż" (zastąpiona trendem). **Wilks ODŁOŻONY** — brak pola płci + niejednoznaczne mapowanie big-3 (High/Low Bar, Hack Squat); ryzyko mylących liczb sprzeczne z tylko_fakty.

3. **Historia premium.** Filtry statusu i dnia planu jako chipy (Kinetic: aktywny `fitness-cyan`, nieaktywny `surface-highest`) zamiast Select. Grupowanie sesji po miesiącach z nagłówkiem (miesiąc rok + liczba sesji + tonaż). Search + zakres dat zostają.

4. **Email z domeny strengthsave.app (KOD).** `from: Strength Save <noreply@strengthsave.app>` w `registration.ts` + `weekly-digest.ts` (było `onboarding@resend.dev`). ⚠️ **NIE deployować funkcji** zanim domena nie jest zweryfikowana w Resend (DNS SPF/DKIM) — inaczej kody rejestracji przestaną dochodzić. Klucz Resend (sekret Firebase) jest send-only → dodanie/weryfikacja domeny to krok w dashboardzie Resend + DNS u rejestratora.

5. **Apple Sign-In (KOD).** Google Sign-In był już zrobiony. Apple wymagany przez App Store skoro jest Google. Dodano `appleProvider` (firebase.ts), `useAuth.signInWithApple` (mirror Google, `skipNativeAuth:true` globalnie → `rawNonce` z plugina), przycisk iOS w Login (logo Apple SVG, czarny per HIG), `capacitor.config` providers +`apple.com`, `ios/App/App/App.entitlements` (gotowy, NIE wpięty do pbxproj). **Decyzja: nie wpinać entitlementu do pbxproj teraz** — bez capability w profilu provisioning zepsułoby pipeline TestFlight (signing mismatch). Aktywacja = kroki zewnętrzne (portal Apple → profil/pbxproj → Firebase provider Apple → test → nowy build).

**Weryfikacja:** tsc clean, eslint clean, 232 testy (222+10), `build:mobile` OK, screenshoty Playwright (nav, achievements, history, login). Commity per zadanie.

**Stan zadania 5 (Android/App Store):** kod gotowy. Android projekt OK (google-services.json, applicationId, versionCode 1) — brak release keystore (sekret) + Play Console. App Store release = submission/review. Wszystko poza CLI (kroki zewnętrzne).

---

### v0.0.1 build 1-9 (2026-06-06 → 2026-06-08) — TestFlight + redesign całej apki + naprawa cykli

**Publikacja iOS (TestFlight, w pełni przez API/CLI, bez Xcode GUI ani fastlane):**
- App ID, certyfikat Distribution, profil App Store utworzone przez App Store Connect API (`scripts/asc_api.py`, `scripts/ios_signing.py`). Pipeline `scripts/ios-testflight.sh` (build:mobile → cap sync → archive UNSIGNED → export manual → altool upload). Klucz API (Admin) w `_secrets/oauth/AuthKey_UD43687FB9.p8` + `appstore-connect.env`.
- Pułapki: (1) automatic cloud signing wymaga roli Admin klucza → obejście: ręczny cert+profil przez API + manual signing; (2) p12 z openssl 3 → `MAC verification failed` → `openssl pkcs12 -export -legacy`; (3) archive z automatic signing chce Development profil (wymaga device) → `CODE_SIGNING_ALLOWED=NO`, podpis przy eksporcie; (4) rekord apki — Apple BLOKUJE create przez API (`403 apps does not allow CREATE`), jedyny krok GUI; (5) `build/` w .gitignore (prywatny klucz dist). Internal testing: grupa "Wewnętrzni" + tester przez API. Wersja 0.0.1 (start, nie 1.0).
- Firebase Storage zainicjalizowany + `storage.rules` (avatars/{uid}: write tylko właściciel, obrazy <5MB) wdrożone.

**Naprawy UX treningu/podsumowania:**
- Pre-fill wagi bierze OSTATNIĄ wagę bez auto-progresji (+1/+2.5) — była regresja 14→15; sugestia podbicia w badge CEL. Sygnatura `createPrefilledSets` uproszczona.
- Czas trwania treningu: `WorkoutSession.durationSec` + `startedAt`/`completedAt` (backup, liczone w `syncDraftToFirebase` final przez `batchSaveWorkout`). Stare treningi pokażą "—".
- Scroll-restore po wygaszeniu (iOS WKWebView reload w tle) — `window.scrollY` do localStorage przy hidden/pagehide, restore po remount (TTL 15 min).
- RestTimer: `@capacitor/haptics` (navigator.vibrate martwy na iOS) + bez `animate-pulse`. Checkbox serii: obrys gdy niezaznaczony. Autosave badge chowany (tylko błąd). Usunięty zdublowany górny stoper.

**Naprawa cykli (lifecycle):**
- PR-y w `computeCycleStats` = RZECZYWISTE rekordy (`detectNewPRs` vs historia sprzed cyklu), nie top-10 → koniec "10 i 10".
- `buildCycleRecommendation.canCloseout` — przycisk "Domknij cykl" tylko gdy wygasł (`isExpired` z planowanego końca startDate+durationWeeks, NIE endDate=dziś z preview).
- Helper `lib/cycle-actions.ts startCycleWithPlan` — "Powtórz plan" (Cykle+Dashboard, wagi z historii), "Zmień plan", auto-przedłużenie (>7 dni bez decyzji → auto nowy cykl + toast).

**Design — Kinetic Precision w CAŁEJ apce (23 pliki):** indigo/blue/violet → lime/cyan; emerald → fitness-success; amber → fitness-warning/lime; sky → cyan; semantyczne badge → tokeny; hex+white-opacity → surface/muted. Karta podsumowania premium (badge kg stały kształt). Avatar object-cover. Italic na nagłówkach sekcji. Nawigacja: Dashboard/Plan/Historia/Ćwiczenia/Profil. Celowo zostają: Strava (brand+wykresy), flame rozgrzewki, koszty admina, toast.

**ODŁOŻONE:** Email weryfikacyjny (Resend) — `from: onboarding@resend.dev` (sandbox) dociera tylko na adres właściciela konta Resend. Naprawa: zweryfikować domenę apki w Resend + zmienić `from` w `functions/src/registration.ts:195` + `weekly-digest.ts:222` + `firebase deploy --only functions`.

### v6.11.4 (2026-05-30) — Final sync bez utraty treningu

**Decyzja:** Finalny zapis treningu jest teraz potwierdzany odczytem z serwera przed
usunięciem lokalnego draftu. IndexedDB pozostaje źródłem bezpieczeństwa do momentu, gdy
Firestore zwróci `completed=true` oraz te same ćwiczenia, serie i ciężary.

| Zmiana | Szczegóły | Status |
|--------|-----------|--------|
| Walidacja final sync | `batchSaveWorkout` nie wystarcza jako dowód. Po finalnym zapisie `WorkoutDay` i `SyncCenter` robią read-back z serwera i walidują payload przez `workout-final-sync.ts` | ✅ |
| Brak kasowania draftu przy częściowym zapisie | Jeśli chmura nie potwierdzi kompletnego treningu, draft zostaje lokalnie, wraca do kolejki i pokazuje status final sync pending | ✅ |
| Eksport awaryjny | Sync Center ma przycisk eksportu lokalnego draftu do JSON | ✅ |
| Widoczna wersja PWA | Podbicie do `v6.11.4` pozwala sprawdzić, że użytkownik działa na nowym buildzie | ✅ |


### v6.11.0 (2026-05-29) — Coach następnej serii (1. funkcja AI dająca wartość)

**Decyzja:** Pierwszy z 3 pomysłów AI. Rdzeń deterministyczny (darmowy), AI tylko on-demand
(zero kosztu w tle — lekcja z usunięcia AI z planów). Odpowiada na pytanie „ile dziś nałożyć".

| Element | Szczegóły | Status |
|---------|-----------|--------|
| `src/lib/next-set-advice.ts` | `getNextSetAdvice` — konkretny cel (ciężar×powt.) z TRENDU całej historii (`getExerciseHistory` + `detectPlateau`), nie tylko ostatniego treningu. Kind: progress / hold / deload | ✅ |
| Deload przy plateau | Zastój ≥4 sesje → sugestia -10% ciężaru zamiast forsowania | ✅ |
| `ExerciseCard` badge "🎯 Cel: X kg × Y" | Zastępuje ogólne "↑ +2.5kg" gdy jest historia; fallback do starego badge dla 1 treningu. Plus jednozdaniowe uzasadnienie | ✅ |
| Przycisk "Coach AI" (on-demand) | `callOpenAI` z kontekstem (5 ostatnich sesji, sugestia, notatki) → 1-2 zdania porady w toaście. Koszt tylko po kliknięciu, limit $5 pilnuje `proxyOpenAI` | ✅ |

**Jakość:** typecheck ✓, lint ✓, vitest 209/209 ✓ (7 nowych), playwright 99/99 ✓, build ✓.

**Pozostałe 2 pomysły AI (backlog):** asystent doboru ćwiczeń w kreatorze planu; wykrywanie plateau + deload na poziomie całego planu (proaktywny sygnał na Dashboard).


### v6.10.0 (2026-05-29) — Koniec AI w tworzeniu planów + własny builder

**Decyzja:** Usunięto generowanie planów przez AI (nieprzewidywalne, kosztowne, zależne od
OpenAI). Tworzenie planu = gotowe szablony (`planTemplates`) albo ręczny kreator od zera.
AI zostaje tam, gdzie analizuje realne dane (Coach, Chat, podsumowania) — nie zgaduje planu.

| Zmiana | Szczegóły | Status |
|--------|-----------|--------|
| Usunięto AI z `NewPlan` | Tryb 'ai' (quiz + `generateTrainingPlan`) wycięty. Toggle: Gotowe plany / Własny plan | ✅ |
| Usunięto AI z `Onboarding` | 5-krokowy quiz + AI generate → wybór gotowego szablonu | ✅ |
| Nowy `src/components/PlanBuilder.tsx` | Ręczny kreator: dni (weekday+focus), ćwiczenia z biblioteki, serie, czas trwania. Walidacja: dzień = focus + min 1 ćwiczenie | ✅ |
| `fromCycle` bez AI | Kreator prefilluje dni skopiowane ze starego cyklu (zamiast AI-regeneracji) | ✅ |
| Usunięto `src/lib/ai-onboarding.ts` | Osierocony po wycięciu AI (Karpathy: czyść własny bałagan). `ai-coach.ts` zostaje (Coach/Chat) | ✅ |

**Jakość:** typecheck ✓, lint ✓, vitest 202/202 ✓, playwright 99/99 ✓ (1 test E2E zaktualizowany pod nowy onboarding), build ✓.

**Backlog AI (do realizacji osobno, używa realnych danych):** progresja per ćwiczenie,
wykrywanie plateau/deload, asystent doboru ćwiczeń w kreatorze, analiza dysbalansu objętości,
predykcja celów, normalizacja nazw ćwiczeń, analiza ryzyka przeciążenia (TRIMP).


### v6.9.4 (2026-05-29) — Naprawa historii po zmianie planu + snapshot (prewencja)

**Problem:** Po odpaleniu nowego planu (FBW → push/pull, start 1 czerwca) historyczne
treningi przestały się poprawnie wyświetlać: ukończony trening pokazywał pustą strukturę
nowego planu, znikały nazwy ćwiczeń, rekordy, osiągnięcia; plan startujący w przyszłości
pokazywał 8% i przyszły tydzień; cykle miały ujemne wartości. Dane w Firestore były
bezpieczne — to był bug warstwy odczytu (kod resolwował historię przez aktualny plan,
a `dayId`/`exerciseId` są niestabilne między planami).

| Decyzja | Kontekst | Status |
|---------|----------|--------|
| Wspólny resolver nazw `src/lib/exercise-name-resolver.ts` | Priorytet: snapshot w treningu → zarchiwizowany cykl → aktualny plan → defaultPlan → id. Reużyty w WorkoutDay, WorkoutHistory, Achievements, Analytics, cycle-insights | ✅ |
| `WorkoutDay` renderuje historię z ZAPISANEGO treningu, nie z planu | Snapshot dnia odbudowany z `workoutForDate.exercises`, gdy oglądamy ukończony/przeszły trening | ✅ |
| Snapshot w modelu: `ExerciseProgress.name`, `WorkoutSession.dayName/dayFocus` | Opcjonalne, wstecznie zgodne. Zapisywane od teraz przy każdym treningu → odporność na przyszłe zmiany planu | ✅ |
| `currentWeek=0` i guard `computeCycleStats` dla planu startującego w przyszłości | Eliminuje fałszywe 8% i NaN; plan tygodnia pokazuje pierwszy tydzień planu | ✅ |
| `buildCycleComparison` zwraca null dla świeżego cyklu (0 treningów) | Koniec mylących ujemnych delt (np. -50000 kg) | ✅ |
| Przycisk „Napraw dane historyczne" (Ustawienia) + `backfillHistoricalWorkouts` | Jednorazowe dotagowanie cycleId + snapshot nazw ze zarchiwizowanych cykli; idempotentne, ręczne (po eksporcie backupu) | ✅ |
| Auto-dotagowanie przy zmianie planu (`NewPlan.handleApprove`) | Po archiwizacji starego planu untagged treningi dostają cycleId — zapobiega powtórce problemu | ✅ |

**Jakość:** typecheck ✓, lint ✓, vitest 202/202 ✓, playwright 99/99 ✓, build ✓.
**Globalnie wdrożone:** zasady Karpathy (`~/.claude/karpathy-guidelines.md`) jako pierwszy krok każdego developmentu.


### v6.8.0 (2026-04-03)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-03 | **IndexedDB jako source of truth dla aktywnego treningu** — local-first draft + periodic/background sync | `React state + localStorage` nie wystarczał przy ubijaniu karty / przejściu telefonu w tło. Draft treningu ma być trwały lokalnie, a Firebase tylko warstwą checkpoint/final sync. | AKTYWNA |
| 2026-04-03 | **Offline-first start treningu** — provisional session bez wymaganego dokumentu w Firebase | Użytkownik ma móc zacząć trening bez internetu. Zdalna sesja jest tworzona dopiero po odzyskaniu połączenia i promocji lokalnej sesji. | AKTYWNA |
| 2026-04-03 | **Sync Center** — jawny stan kolejek syncu, retry i discard lokalnych sesji | Warstwa synchronizacji przestała być ukryta. Użytkownik i admin muszą widzieć, co jest tylko lokalne, co czeka na sync i co się nie udało. | AKTYWNA |
| 2026-04-03 | **CycleId jako źródło prawdy dla nowych treningów** — dual-read dla starych danych | Statystyki cyklu nie mogą opierać się tylko na zakresie dat. Nowe sesje są przypinane do `cycleId`, stare dane dalej działają przez fallback. | AKTYWNA |
| 2026-04-03 | **Access control po stronie backendu** — `access.enabled` i `status` egzekwowane w rules/functions | Sam client-side guard był za słaby. Dostęp użytkownika do danych i callable functions ma być blokowany też po backendzie. | AKTYWNA |
| 2026-04-03 | **Auth model: Google + email/password + kod mailowy** | Rejestracja ma być dostępna dla zwykłego usera bez admin handoff. Email verification jest obsłużony przez Functions + Resend, nie przez passwordless email-link. | AKTYWNA |
| 2026-04-03 | **Invite i waitlista jako warstwa operacyjna, nie bramka wejścia** | User po weryfikacji dostaje dostęp od razu. Invite i waitlista służą do cohort, onboarding contextu, flag i operacji admina, a nie do blokowania podstawowego wejścia. | AKTYWNA |
| 2026-04-03 | **Role tylko `admin` + `user`** — reszta przez statusy, cohorty i feature flags | Nie dokładamy nowych ról typu coach/staff. Produktowo wystarczą role bazowe plus metadata konta. | AKTYWNA |
| 2026-04-03 | **Osobne strony `/#/login` i `/#/register`** + redirect zalogowanego usera z auth routes | Rozdzielenie intencji upraszcza UX. Po zalogowaniu user nie może zostać na ekranie auth i ma być przeniesiony na dashboard lub onboarding. | AKTYWNA |
| 2026-04-03 | **Admin auth ops** — invite, waitlista, audit auth, suspend/restore, access toggle | Panel admina ma obsługiwać nie tylko plan i feature flags, ale też pełny lifecycle wejścia użytkownika do aplikacji. | AKTYWNA |
| 2026-04-03 | **Playwright jako realny gate dla flow auth i offline** — 83 scenariusze | Krytyczne scenariusze productowe muszą być testowane E2E, nie tylko smoke. Dotyczy to auth, offline startu, Sync Center i admin operations. | AKTYWNA |

### v6.7.0 (2026-04-02)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-02 | **Bodyweight exercises** — `isBodyweight` flag w exerciseLibrary, ukrycie pola kg w ExerciseCard, PR na reps | Dead Bug, Plank, Reverse Crunch itd. nie mają obciążenia. Pole kg było wymagane i bezużyteczne. Teraz grid 3-kolumnowy, progresja "+powt.", `getExerciseBestReps()`. | AKTYWNA |
| 2026-04-02 | **Batch save** — localStorage draft + Firestore writeBatch zamiast debounced autosave | Każda zmiana reps/weight powodowała zapis do Firebase (debounce 500ms). Teraz dane zapisywane TYLKO przy "Zakończ trening". `workout-draft.ts` jako backup. Draft recovery po crash/reload. `beforeunload` warning. | AKTYWNA |
| 2026-04-02 | **Dashboard "Rozpocznij trening"** — karta z 3 stanami na górze Dashboard | Użytkownik musiał nawigować do Plan dnia lub Plan treningowy żeby zacząć. Teraz: training day → przycisk start, completed → "Ukończony!", rest day → "Dzisiaj wolne" + info o następnym. | AKTYWNA |
| 2026-04-02 | **Nawigacja 8→6 zakładek** — usunięto "Plan dnia" i "AI Coach" z sidebar | Plan dnia zbędny z Dashboard start button. AI Coach nieużywany. Trasy dostępne przez URL. | AKTYWNA |
| 2026-04-02 | **Analytics per-exercise** — grid osobnych wykresów zamiast jednego overlapping | 30kg ćwiczenie obok 150kg na wspólnej osi Y = nieczytelne. Teraz każde ćwiczenie ma własny chart 150px z własną skalą Y. Bodyweight = reps na osi Y. | AKTYWNA |
| 2026-04-02 | **PR dates** — `bestDate` w ExerciseBest + wyświetlanie w Achievements | Rekordy nie miały daty. Teraz "80kg × 5 rep · 15 mar". | AKTYWNA |
| 2026-04-02 | **Cycles aktualny plan** — karta na górze z progress bar, tydzień X z Y | Cycles pokazywał tylko historyczne cykle, nie aktualny plan. | AKTYWNA |
| 2026-04-02 | **Playwright E2E** — VITE_E2E_MODE, 60 testów (smoke, nav, features, edge cases) | Brak E2E testów. Krytyczne dla weryfikacji batch save. | AKTYWNA |
| 2026-04-02 | **Security audit — 5 agentów równolegle** — CRITICAL: Strava auth fix, role escalation block, useAIChat userId fix | Audyt bezpieczeństwa znalazł 2 CRITICAL (Strava bez auth, role escalation), 3 HIGH, 7 MEDIUM. Wszystkie naprawione. | AKTYWNA |
| 2026-04-02 | **Usunięcie AI Chat/Coach** — useAIChat, useAICoach, useChatMessages, AIChat.tsx, ai-chat.ts | Nieużywane moduły. Usunięcie zmniejsza attack surface i kod (-815 linii). ai-coach.ts zostaje (callOpenAI, getSwapSuggestions). | AKTYWNA |
| 2026-04-02 | **Input validation** — clampSet() 0-999, notes cap 2000/5000, importData schema validation | Audit znalazł brak walidacji zakresów. Dodano server-side clamping i whitelist pól przy imporcie. | AKTYWNA |
| 2026-04-02 | **OpenAI hardening** — model allowlist, maxTokens cap 4000, max 50 messages | Audit: user mógł wybrać dowolny model i maxTokens. Teraz tylko gpt-5-mini/gpt-4.1-mini. | AKTYWNA |
| 2026-04-02 | **Cleanup /simplify** — formatLocalDate→utils, E2E helpers, callback refs, draft debounce, latestPR limit | Audyt /simplify: 20 findings, naprawiono top 11. -50 linii, lepsza memoizacja, mniej re-renderów. | AKTYWNA |

### v6.6.0 (2026-04-01)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-04-01 | **One-Click Autostart** — `?autostart=true` query param + useEffect auto-start + scrollIntoView | Użytkownik musiał kliknąć 2-3 razy żeby rozpocząć trening (Dashboard → WorkoutDay → "Rozpocznij"). Teraz jedno kliknięcie z Dashboard startuje sesję i scrolluje do pierwszego ćwiczenia. `autostartDone` ref zapobiega podwójnemu odpaleniu. | AKTYWNA |
| 2026-04-01 | **Pre-fill z progresją** — `createPrefilledSets()` w exercise-utils.ts, wywoływane przy tworzeniu nowej sesji | Sety startowały od 0/0 mimo że mamy dane z poprzedniego treningu. Teraz kopiuje reps + weight + increment z getProgressionAdvice (+2.5kg compound, +1kg isolation). completed=false — user potwierdza ✓. Fallback do createEmptySets() przy braku historii. | AKTYWNA |
| 2026-04-01 | **Skip exercise = tylko na dziś** — `skippedExercises?: string[]` w WorkoutSession, NIE modyfikuje planu | User chciał pomijać ćwiczenia bez wpływu na plan. skippedExercises zapisywane w Firebase per-sesja. Ćwiczenie filtrowane w aktywnym widoku, widoczne z badge "Pominięte" w podsumowaniu. | AKTYWNA |
| 2026-04-01 | **Dynamiczne serie** — handleAddSet/handleRemoveSet w ExerciseCard, max 10, min 1 | Stała liczba serii (z planu) nie pozwalała na elastyczność. Nowa seria kopiuje dane z ostatniej. Firebase już przechowuje dynamiczną tablicę SetData[], więc brak zmian modelu. | AKTYWNA |

### v6.5.0 (2026-03-24)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-24 | **Plan Cycles w osobnej kolekcji** — `plan_cycles/{autoId}` zamiast subcollection pod `training_plans` | Niezależne query, prostsze indeksy, brak limitu zagnieżdżenia. Każdy cykl ma pełny snapshot planu + statystyki. | AKTYWNA |
| 2026-03-24 | **Archiwizacja przy tworzeniu nowego planu** — `archiveCurrentPlan()` przed `savePlan()` | `training_plans/{userId}` przechowuje tylko JEDEN aktywny plan (setDoc nadpisuje). Archiwizacja zapobiega utracie historii. | AKTYWNA |
| 2026-03-24 | **Stats obliczane przy archiwizacji** — snapshot statystyk (tonaż, PRy, frekwencja) w dokumencie cyklu | Unikamy kosztownych retrospektywnych query. Stats frozen at cycle end. | AKTYWNA |
| 2026-03-24 | **generatePlanFromCycle** — osobna funkcja AI z kontekstem starego planu + PRów | AI dostaje pełny kontekst progresji: stary plan JSON, rekordy, frekwencję. Generuje plan z progresją. | AKTYWNA |
| 2026-03-24 | **Żółty banner ≤2 tygodnie** — `weeksRemaining` w useTrainingPlan, osobny od `isPlanExpired` | Proaktywne przypomnienie zamiast reaktywnego "plan się skończył". User ma czas zaplanować nowy cykl. | AKTYWNA |
| 2026-03-24 | **Share z photo — FileReader + brightness filter** — zdjęcie jako tło z `filter: brightness(0.4)` | Nie uploadujemy zdjęcia nigdzie — base64 w pamięci, renderowane przez html2canvas-pro. Prywatność preserved. | AKTYWNA |
| 2026-03-24 | **cycleId opcjonalne w WorkoutSession** — backward compatible, stare workouty bez cycleId | Brak migration wymagana. Nowe workouty dostają cycleId, stare działają bez zmian. | AKTYWNA |

### v6.4.1 (2026-03-17)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-17 | **savePlan zachowuje startDate/durationWeeks** — always-include zamiast optional spread | `setDoc` nadpisywał cały dokument, kasując metadata planu przy każdej edycji ćwiczenia. Dashboard pokazywał "Tydzień 1/12" zamiast prawidłowego tygodnia. | AKTYWNA |
| 2026-03-17 | **Auto-repair missing startDate** — query earliest workout → Monday → updateDoc | One-time self-healing: jeśli plan nie ma startDate, odtwarza go z historii treningów. Zapobiega konieczności ręcznej naprawy w Firebase. | AKTYWNA |

### v6.4.0 (2026-03-13)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-13 | **Streaming AI Chat (SSE)** — streamOpenAI onRequest + callOpenAIStream na froncie | Token-by-token UX zamiast czekania na pełną odpowiedź. onRequest zamiast onCall bo onCall nie wspiera SSE. | AKTYWNA |
| 2026-03-13 | **Per-user chat w Firestore** — chat_messages collection z userId isolation | Zastępuje localStorage (max 50 msg, ginęły po wylogowaniu) i legacy chat_conversations (brak per-user isolation). One-time migration z localStorage. | AKTYWNA |
| 2026-03-13 | **$5/user/miesiąc AI limit** — ai_usage/{userId_YYYY-MM} z FieldValue.increment() | Ochrona przed nadużyciami. Atomowe inkrementy (concurrent-safe). checkUsageLimit() przed każdym callem. | AKTYWNA |
| 2026-03-13 | **Cost tracking we wszystkich AI functions** — proxyOpenAI, generateWeeklySummary, streamOpenAI | Pełny obraz kosztów per user. Admin widzi global + per-user. | AKTYWNA |
| 2026-03-13 | **Manual auth w streamOpenAI** — Authorization: Bearer {idToken} zamiast onCall auth | onRequest nie ma wbudowanego auth jak onCall. verifyIdToken() ręcznie. | AKTYWNA |
| 2026-03-13 | **chat_conversations DEPRECATED** — zakomentowane w firestore.rules | Zastąpione przez chat_messages z per-user isolation. Legacy collection. | AKTYWNA |

### v6.3.0 (2026-03-12)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-12 | **Resend zamiast SendGrid** — Weekly Digest używa Resend API | User wybrał Resend, prostsze API, darmowy tier wystarczający | AKTYWNA |
| 2026-03-12 | **Auto-detect emaili z Firebase Auth** — `listUsers()` zamiast hardcoded secret | Digest wysyłany do każdego użytkownika z kontem, bez ręcznej konfiguracji | AKTYWNA |
| 2026-03-12 | **Per-user digest** — osobne query workouts + strava per userId | Każdy user dostaje swoje statystyki, nie globalne | AKTYWNA |
| 2026-03-12 | **Kompaktowe karty Strava w TrainingPlan** — inline rows zamiast pełnych StravaActivityCard | Na mobile pełne karty zajmowały za dużo miejsca, rozjeżdżały layout | AKTYWNA |
| 2026-03-12 | **Grupowanie po dacie w timeline** — Strava + trening z tego samego dnia razem | Czystszy layout, data wyświetlana raz, elementy logicznie powiązane | AKTYWNA |

### v6.1.0 (2026-03-11)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-11 | **Exercise Timeline z Recharts** — LineChart (est. 1RM primary + max weight dashed) | Wizualizacja progresji per ćwiczenie, reuse calculate1RM z pr-utils | AKTYWNA |
| 2026-03-11 | **Plateau detection** — brak progresu max weight w ostatnich N sesjach | Prosta heurystyka (domyślnie 4 sesje), alert w dialogu | AKTYWNA |
| 2026-03-11 | **Smart Rest Timer (intensity-based)** — czas odpoczynku zależy od typu ćwiczenia i % 1RM | Compound 90s base, isolation 60s, +30s >80% 1RM, +60s >90% 1RM. Superset first 15s, non-first 60s | AKTYWNA |
| 2026-03-11 | **lookupExerciseType** — lookup compound/isolation z exerciseLibrary | Reuse istniejącej biblioteki, fallback 'compound' dla nieznanych | AKTYWNA |
| 2026-03-11 | **Warmup Routine UI z timerami** — checklist + inline 30s countdown | Dane z warmupStretching.ts (już istniały), focus-based stretching | AKTYWNA |
| 2026-03-11 | **Training Heatmap (GitHub-style)** — grid 53×7 z 5 poziomami intensywności | Łączy workouts + Strava w jedną wizualizację, year selector | AKTYWNA |
| 2026-03-11 | **Share Workout via html2canvas-pro** — generowanie PNG 540×960 (IG story) | Ciemny gradient, stats grid, lista ćwiczeń, navigator.share + download fallback | AKTYWNA |
| 2026-03-11 | **Race Predictor (Riegel formula)** — T2 = T1 × (D2/D1)^1.06 | Predykcje 5K/10K/HM/Marathon z najlepszego effort w Strava | AKTYWNA |
| 2026-03-11 | **Training Load (TRIMP/Banister)** — CTL 42d EWMA, ATL 7d EWMA, TSB = CTL - ATL | Wymaga aktywności z HR, default restHR=60, maxHR z connection | AKTYWNA |
| 2026-03-11 | **Weekly Digest (Cloud Function)** — onSchedule Monday 08:00 Warsaw | HTML email inline CSS, stats grid + Strava highlights, per-user | AKTYWNA |
| 2026-03-11 | **escapeHtml w share-utils** — XSS protection przy innerHTML | Pre-commit hook złapał innerHTML bez sanityzacji, dodano escapeHtml() | AKTYWNA |

### v5.1.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **Auto-detect istniejących użytkowników** — w `ensureUserDoc()` sprawdzamy czy user ma workouty → auto `onboardingCompleted: true` | Bug v5.0: istniejący użytkownicy widzieli onboarding i tracili swój plan | AKTYWNA |
| 2026-03-08 | **Przywracanie domyślnego planu** — jeśli existing user nie miał `onboardingCompleted`, przywracamy defaultPlan | Bug v5.0 nadpisywał plany istniejących użytkowników | AKTYWNA |
| 2026-03-08 | **Rozszerzony Weekday type (7 dni)** — `'monday' \| 'tuesday' \| ... \| 'sunday'` | Plany 2-5 dni/tydzień wymagają mappingu na dowolny dzień | AKTYWNA |
| 2026-03-08 | **Dynamiczny getTrainingSchedule()** — akceptuje `weeks` i `days` params | Plany AI mają różną liczbę dni i tygodni | AKTYWNA |
| 2026-03-08 | **Plan duration tracking** — `planDurationWeeks`, `planStartDate`, `currentWeek`, `isPlanExpired` | Plany mają czas trwania (8-16 tygodni), po upływie → nowy plan | AKTYWNA |
| 2026-03-08 | **Banner expired plan** — Dashboard pokazuje banner "Twój plan się zakończył!" z linkiem do /new-plan | UX: jasna komunikacja + call-to-action | AKTYWNA |
| 2026-03-08 | **NewPlan.tsx** — oddzielna strona generowania nowego planu (cel, dni, AI, review, save) | Oddzielony od onboardingu: mniejszy, prostszy, podsumowuje stary plan | AKTYWNA |
| 2026-03-08 | **Review planu po AI generation** — onboarding i NewPlan pokazują plan z "Zamień" buttonsami | User widzi plan PRZED zapisem, może zamienić ćwiczenia | AKTYWNA |
| 2026-03-08 | **ExerciseSwapDialog** — dialog zamiany ćwiczenia z filtrami po kategorii | Filtruje bibliotekę, ukrywa już użyte, zachowuje oryginalne sety | AKTYWNA |
| 2026-03-08 | **GeneratedPlan interface** — `{ days, planDurationWeeks }` zamiast plain array | AI zwraca czas trwania planu (8-12 tygodni) | AKTYWNA |
| 2026-03-08 | **Strava 365 dni lookback** — pierwszy sync pobiera rok wstecz (zamiast 30 dni) | Użytkownicy chcieli widzieć starsze aktywności | AKTYWNA |
| 2026-03-08 | **Strava w planie tygodnia** — Dashboard, TrainingPlan, Analytics, AIChat | Strava aktywności widoczne obok treningów siłowych | AKTYWNA |
| 2026-03-08 | **AI "Podsumuj tydzień" z Strava** — quick action w AIChat buduje prompt z treningami + Strava | Pełny obraz tygodnia: siłownia + bieganie/rower/etc. | AKTYWNA |
| 2026-03-08 | **Klikalne ukończone treningi w Analytics** — `<button>` zamiast `<div>` z navigate | UX: użytkownik może przejść do szczegółów treningu | AKTYWNA |

### v5.0.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **AI-powered onboarding** — 5-krokowy wizard → AI generuje plan | Nowi użytkownicy dostają spersonalizowany plan zamiast domyślnego | AKTYWNA |
| 2026-03-08 | **Exercise library (60+ ćwiczeń)** — `exerciseLibrary.ts` z kategoriami i video URL | AI używa nazw z biblioteki (priorytet), swap dialog filtruje po kategoriach | AKTYWNA |
| 2026-03-08 | **AI Coach na Dashboard** — insights: plateau, progress, consistency, suggestion, warning | Analiza treningów po 3+ ukończonych, cache 24h | AKTYWNA |
| 2026-03-08 | **OpenAI integration** — `callOpenAI()` w `ai-coach.ts`, `VITE_OPENAI_API_KEY` | Generowanie planów i AI coaching przez API | AKTYWNA |
| 2026-03-08 | **onboardingCompleted flag** — pole w `users/{uid}` decyduje o onboarding vs Dashboard | Kontrola flow nowych użytkowników | AKTYWNA |

### v4.0.0 (2026-03-08)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-03-08 | **Multi-user: UserContext + userId** — każdy hook przyjmuje userId, dane izolowane per-user | Dodanie drugiego użytkownika, plany per-user | AKTYWNA |
| 2026-03-08 | **Multi-email whitelist** — `VITE_ALLOWED_EMAILS` (comma-separated) | Skalowalne podejście do autentykacji | AKTYWNA |
| 2026-03-08 | **Admin panel z rolami** — `role: 'admin' \| 'user'`, AdminRoute guard | Admin zarządza planami wszystkich użytkowników | AKTYWNA |
| 2026-03-08 | **Per-user training plans** — `training_plans/{userId}` z days, durationWeeks, startDate | Każdy użytkownik ma własny plan z czasem trwania | AKTYWNA |
| 2026-03-08 | **Strava via Cloud Functions** — stravaAuthUrl, stravaCallback, stravaSync (callable) | OAuth wymaga server-side, token refresh | AKTYWNA |
| 2026-03-08 | **Strava OAuth bridge** — `strava-callback.html` → HashRouter `#/strava/callback` | GitHub Pages + HashRouter = Strava nie może redirectować na hash URL | AKTYWNA |
| 2026-03-08 | **Firestore composite indexes** — userId ASC + date DESC na workouts, measurements, strava_activities | Zapytania z `where('userId')` + `orderBy('date')` | AKTYWNA |
| 2026-03-08 | **Firestore security rules** — użytkownicy czytają/piszą tylko swoje dane, admin read all | Bezpieczeństwo danych multi-user | AKTYWNA |

### v3.1.0 (2026-02-23)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-02-23 | **Strict TypeScript** — `strict: true` w tsconfig.app.json, zero błędów | Jakość — strictNullChecks, noImplicitAny | AKTYWNA |
| 2026-02-23 | **Testy Vitest** — 25 testów dla exercise-utils i trainingPlan | Pokrycie kluczowych utility functions | AKTYWNA |
| 2026-02-23 | **exercise-utils.ts** — wyciągnięto parseSetCount, createEmptySets, sanitizeSets z ExerciseCard | Testowalność — utility w oddzielnym pliku | AKTYWNA |
| 2026-02-23 | **Strona Postępy** — wykresy recharts: progresja ciężarów + pomiary ciała | Wizualizacja progresu treningowego | AKTYWNA |
| 2026-02-23 | **RestTimer w WorkoutDay** — circular progress, presety, wibracja | Timer dostępny w trakcie treningu (manualne uruchomienie) | AKTYWNA |
| 2026-02-23 | **Dark mode** — ThemeProvider (next-themes) + toggle Sun/Moon | CSS variables, class strategy | AKTYWNA |
| 2026-02-23 | **Error Boundary** — class component owijający App | Fallback UI zamiast białej strony | AKTYWNA |
| 2026-02-23 | **Dashboard: bieżący tydzień** — getThisWeekDates() zamiast getLatestWorkout() | Plan tygodnia nie pokazywał starych treningów | AKTYWNA |
| 2026-02-23 | **Firebase config do .env** — credentials przeniesione do VITE_* | Bezpieczeństwo — klucze poza źródłami | AKTYWNA |
| 2026-02-23 | **React.memo na ExerciseCard** — zapobiega re-renderom | Skakanie UI przy auto-save | AKTYWNA |
| 2026-02-23 | **Debounce 500ms** (wcześniej 300ms) — mniej zapisów do Firebase | Rzadsze zapisy, mniej onSnapshot callbacks | AKTYWNA |
| 2026-02-23 | **Podpowiedź poprzedniego ciężaru** — "Poprzednio: 8×40kg" | User nie musi pamiętać ciężarów | AKTYWNA |

### v3.0.0 (2026-01-28)

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-01-28 | **Seria rozgrzewkowa (warmup)** — pierwsza seria, pomarańczowa, ikona płomienia | Oddzielenie rozgrzewki od serii roboczych | AKTYWNA |
| 2026-01-28 | **Notatki do ćwiczeń** — opcjonalne pole tekstowe pod seriami | Zapisywanie odczuć, uwag technicznych | AKTYWNA |
| 2026-01-28 | **Tryb edycji bez auto-save** — `handleSetsChangeLocal` modyfikuje tylko lokalny state | Auto-save powodował "mryganie" UI | AKTYWNA |
| 2026-01-28 | **Parametr `?date=` w URL** — wszystkie nawigacje do workout przekazują datę | Bez tego kliknięcie na przeszły trening pokazywało dzisiejszą datę | AKTYWNA |
| 2026-01-28 | **Plan tygodniowy od bieżącego poniedziałku** | Wcześniej pokazywał następny tydzień | AKTYWNA |
| 2026-01-28 | **Przycisk "Zapisz zmiany" statyczny** — nie fixed | Fixed button skakał na mobile przy klawiaturze | AKTYWNA |

---

## DECYZJE ARCHITEKTONICZNE

| Data | Decyzja | Kontekst | Status |
|------|---------|----------|--------|
| 2026-01 | **HashRouter zamiast BrowserRouter** | GitHub Pages nie obsługuje server-side routing | AKTYWNA |
| 2026-01 | **Firebase Firestore** | Real-time sync, Google Auth, darmowy tier | AKTYWNA |
| 2026-01 | **Multi-email whitelist** | VITE_ALLOWED_EMAILS (comma-separated) | AKTYWNA |
| 2026-01 | **Sanityzacja danych przed Firebase** | Firebase nie akceptuje `undefined` | AKTYWNA |
| 2026-02 | **OpenAI API client-side** | VITE_OPENAI_API_KEY, bezpośrednie wywołania | AKTYWNA |
| 2026-03 | **Strava OAuth server-side** | Firebase Cloud Functions (callable) | AKTYWNA |
| 2026-03 | **Per-user data isolation** | Firestore security rules + composite indexes | AKTYWNA |
| 2026-03 | **AI plan duration (8-16 weeks)** | AI decyduje na podstawie celu/doświadczenia | AKTYWNA |
| 2026-03 | **SSE streaming via onRequest** | onCall nie wspiera streaming, onRequest + manual Bearer auth | AKTYWNA |
| 2026-03 | **AI cost tracking per-user per-month** | FieldValue.increment() atomowe, $5 limit, ai_usage collection |
| 2026-03 | **Plan Cycles (osobna kolekcja)** | plan_cycles/{autoId} z snapshot planu + stats, archiwizacja przy nowym planie |
| 2026-03 | **Photo share (client-side only)** | FileReader base64, brightness filter, html2canvas-pro, zero upload | AKTYWNA |

---

## ODRZUCONE OPCJE

| Data | Opcja | Powód odrzucenia |
|------|-------|------------------|
| 2026-01-28 | Auto-save w trybie edycji | "Mryganie" i zbędne zapisy Firebase |
| 2026-01-28 | Fixed button na dole (tryb edycji) | Skakał przy klawiaturze na mobile |
| 2026-01 | LocalStorage zamiast Firebase | Brak sync między urządzeniami |
| 2026-01 | BrowserRouter | Nie działa na GitHub Pages |
| 2026-03 | Strava OAuth client-side | Wymaga server-side dla token exchange |
| 2026-03 | Natychmiastowy zapis planu z onboardingu | Użytkownik nie mógł zweryfikować/zamienić ćwiczeń |
| 2026-03 | 30 dni lookback Strava (pierwszy sync) | Za mało aktywności widocznych dla nowych użytkowników |

---

## KONTEKST TECHNICZNY (dla przyszłych sesji)

### Handlery w WorkoutDay.tsx
- `handleSetsChange` → aktywny trening, AUTO-SAVE z debounce 500ms
- `handleSetsChangeLocal` → tryb edycji, TYLKO lokalny state
- `handleFinishEditing` → zapis wszystkiego na raz po edycji

### Struktura SetData
```typescript
interface SetData {
  reps: number;       // Zawsze number, nigdy undefined
  weight: number;     // Zawsze number, nigdy undefined
  completed: boolean; // Zawsze boolean
  isWarmup?: boolean; // Opcjonalne, true tylko dla warmup
}
```

### Nawigacja z datą
```typescript
navigate(`/workout/${dayId}?date=${targetDate}`)
const [searchParams] = useSearchParams();
const targetDate = searchParams.get('date') || today;
```

### Znajdowanie bieżącego poniedziałku
```typescript
const dayOfWeek = start.getDay();
const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
start.setDate(start.getDate() - daysSinceMonday);
```

### Onboarding detection
```typescript
// UserContext.tsx
const workoutsSnap = await getDocs(
  query(collection(db, 'workouts'), where('userId', '==', user.uid), limit(1))
);
const isExistingUser = !workoutsSnap.empty;
// isExistingUser → auto onboardingCompleted: true
```

### Plan expiration
```typescript
// useTrainingPlan.ts
const currentWeek = Math.floor((now - startDate) / (7 * 24 * 60 * 60 * 1000)) + 1;
const isPlanExpired = currentWeek > planDurationWeeks;
```

---

## SESJA 2026-06-05/06 — i18n pełne, katalog 241, 10 planów, onboarding redesign, replan, fixy

### Decyzje produktowe (z ankiet z userem)
- **Plany:** zostawić istniejące, dać lepsze nazwy (bez nazwisk — "Jeremy Ethier" → "Balanced Builder"), dobić do **10** (6 rename + 4 flagowce pod cele onboardingu). Nazwy brandowe Kinetic (Iron Foundation, Push Pull Legs Engine, Upper/Lower Forge, Hypertrophy Split, Tension Protocol; Foundational Strength 5x5, Powerbuilding Protocol, Lean Engine, Kinetic Athlete).
- **Custom ćwiczenia (dodawanie własnych do bazy):** ODPUSZCZONE — katalog 241 wystarczy, user wybiera z katalogu zamiast dodawać. (Firestore per-user custom exercises pominięte.)
- **Katalog:** "idziemy na grubo" — +135 ćwiczeń (maszyny popularnych siłowni + wolne ciężary + BW), nie tylko top 30. Każde komplet PL+EN.
- **Onboarding:** pełny 5-krokowy kreator wg makiet usera (Welcome → Baseline/poziom → Objective/cel → Protocol/dni+harmonogram+data → Precision/rekomendacja). Rekomendacja + przeglądanie 10 + ułóż własny.
- **Replan (po skończeniu planu):** spójny z onboardingiem przez wspólny `PlanWizard`. Start od rekomendacji (pre-fill z profilu) + "Zmień ustawienia". Closeout (świętowanie wyników cyklu) PRZED wyborem. Preview + swap ćwiczeń przed zatwierdzeniem.

### Decyzje techniczne / architektura
- **i18n:** PL pozostaje KANONICZNE w danych (nazwy ćwiczeń/dni/focus = slug CDN, lookup szczegółów, zapis Firestore, resolver historii). Lokalizuje się TYLKO wyświetlanie. Czysta funkcja `translate(lang,key,params)` w `@/i18n` używana też w lib/ (poza Reactem; funkcje lib biorą `lang` z domyślnym 'pl' by testy przeszły). Helpery: localizeExerciseName/Instruction/Category, localizeDayName/Focus/WeekdayShort, dateLocale. Wartości PL w locale dla kluczy asertowanych w testach = 1:1 z oryginałem.
- **Focusy planów** muszą być tokenizowalne przez localizeFocus (mapa słów PL→EN word-by-word) — nowe plany używają prostego słownictwa (Nogi/Klatka/Plecy/Barki, Całe ciało A, Dół/Góra/Kondycja, Siła A), nie wielowyrazowych fraz.
- **PlanWizard** (`src/components/PlanWizard.tsx`) = jedno źródło prawdy dla wyboru planu. Props: showWelcome, initial (pre-fill), startAtPrecision, confirmLabelKey, onConfirm(choice), onExitBack. Onboarding.tsx i NewPlan.tsx = cienkie wrappery (różnią się tylko zapisem: onboarding→completed, replan→archive+cycle).
- **Porównanie cykli:** tonaż liczony NA TRENING (averageTonnagePerWorkout), nie suma — suma świeżego cyklu vs zakończonego zawsze dawała absurdalny minus (-69978 kg).
- **Naprawy danych usera (np. fantomowy cykl):** robione jako narzędzia W APCE (user uruchamia, ma dostęp przez security rules), bo z CLI brak admin-dostępu do Firestore (ADC PERMISSION_DENIED). Przykład: "Usuń cykl" w CycleDetail (deleteCycle odtagowuje cycleId, nie kasuje treningów).
- **Root-cause fantomowych cykli:** auto-repair w Cycles.tsx tworzył duplikaty bo guard na ref żył tylko w jednym mountcie. Fix: guard per planStartDate + localStorage zamiast ref.

### 🔴 WNIOSKI ZE WSZYSTKICH BUILDÓW (kluczowe — biały ekran iOS)
- **Base path = przyczyna białego ekranu na iOS.** `vite.config.ts`: `base: isMobileBuild ? './' : '/strength-save/'`. iOS WKWebView serwuje z roota → WYMAGA builda mobilnego (base `./`). Build webowy (base `/strength-save/`) wgrany do iOS = assety 404 = biały ekran (bez ErrorBoundary, bo bundle się nie ładuje).
- **`npm run deploy` ma predeploy `vite build` (WEB) i NADPISUJE `dist`.** Jeśli po deployu zrobisz `cap sync ios`, skopiujesz build WEBowy do iOS → biały ekran. **Zawsze:** `npm run build:mobile && ./node_modules/.bin/cap sync ios && ./node_modules/.bin/cap run ios --target=<UDID>`. Weryfikacja: `grep 'src="' ios/App/App/public/index.html` musi pokazać `./assets/...`, NIE `/strength-save/assets/...`.
- **`cap sync` NIE wystarcza** do zobaczenia zmian na uruchomionej apce iOS — trzeba `cap run` (xcodebuild przebudowuje .app). Sam `cap sync` tylko kopiuje pliki.
- **Service worker NIE był przyczyną** białego ekranu (fresh uninstall+reinstall też był biały) — to czysto base path. (Ale SW PWA w WKWebView to potencjalne źródło problemów z cache przy update.)
- **RTK hook** przepisuje `npx cap` → `npm cap` (błąd "Missing script") — używaj `./node_modules/.bin/cap`.
- **Weryfikacja wizualna bez urządzenia:** Chrome-extension MCP bywa offline; WKWebView nie pipuje konsoli JS do stdout (OSLog = systemowy szum). Działa **Playwright** (headless chromium) + dev server z `.env.local` `VITE_E2E_MODE=true` + `addInitScript` ustawiający localStorage `fittracker_e2e_auth_state={"scenario":"new-user"|"active-admin"}`. PO TEŚCIE USUŃ `.env.local` (E2E-bypass nie może trafić na produkcję). `waitUntil:'domcontentloaded'` (NIE 'networkidle' — HMR websocket wisi). Onboarding = new-user; replan `/new-plan` = active-admin.
- **Multi-plik scalanie danych (i18n/ćwiczenia):** agenci piszą fragmenty (JSON/klucze), główny agent scala deterministycznie skryptem ze sprawdzeniem dup/parity/kolizji — zero równoległej edycji wspólnych plików. tsc waliduje komplet (en typowany `Record<keyof typeof pl,string>`).
- **Każdy etap weryfikowany:** `npx tsc --noEmit -p tsconfig.app.json` + `npx eslint .` + `npm run build:mobile` + `npx vitest run` (219 testów). Build/testy NIE łapią błędu base-path (to runtime iOS) — dlatego potrzebny screenshot symulatora po `cap run`.

---

## SESJA 2026-06-10 — audyt 20 agentów + naprawa 13 HIGH + 9 funkcji UX (v6.12.0)

**Audyt:** 20 agentów (po jednym na obszar) + adwersaryjna weryfikacja każdego critical/high. Wynik: 141 znalezisk, 140 potwierdzonych (0 critical, 13 high, 74 medium, 53 low). Pełny raport: `audit/AUDYT_KOMPLETNY_2026-06-10.md`.

**Naprawione wszystkie 13 HIGH:**
1. `VITE_OPENAI_API_KEY` usunięty z CI (deploy.yml) i z sekretów repo — klient go nie używał. UWAGA: klucz był publiczny w bundlu do 2026-03-09 → wymaga ROTACJI w OpenAI dashboard (manualnie).
2. Konflikt dwóch urządzeń: seed `cloudUpdatedAt` (cloudMetaRef) + kolejka sync nie wycina już pól + dialog "Zachowaj moją / Pobierz z chmury" zamiast cichego nadpisania.
3. `savePlan`: guard na `isLoaded` + `merge: true` (zapis przed snapshotem kasował custom plan).
4. Swap w podglądzie NewPlan przez `swapExerciseIdentity` (videoUrl: undefined wywalał setDoc).
5. Powrót preview→wizard przywraca stan (prop `resume` w PlanWizard + initialDays w PlanBuilder).
6. Reset planu (PlanEditor) za AlertDialogiem.
7. Pre-fill wag: fallback po nazwie ćwiczenia z całej historii (id zmieniają się między cyklami).
8. Reconnect Strava kasuje aktywności TYLKO przy zmianie konta (athleteId); to samo konto zachowuje historię >365 dni.
9. Disconnect Strava z potwierdzeniem (ostrzeżenie o utracie).
10. Flagi admina (config/feature_flags) faktycznie egzekwowane: aiEnabled w assertAiEnabled, registrationOpen w syncUserProfile (kill switch na cost abuse); generateWeeklySummary ma bramkę AI.
11. Streak: parseLocalDate zamiast new Date('YYYY-MM-DD') — poniedziałki liczone w UTC+ (test regresyjny).
12. Self-service usunięcie konta (Apple 5.1.1(v)): callable deleteOwnAccount + wspólny purgeUserData (też avatary Storage i app_telemetry_daily) + dialog z wpisaniem USUŃ w Profilu.
13. Import backupu z dialogiem podsumowania (data, liczby, nadpisania) zamiast natychmiastowego wykonania.

**Funkcje UX (1-6, 8-10; 7 pominięta na życzenie):**
- AutoSyncOnReconnect: zaległe final-synci domykane po powrocie online; wskaźnik zapisu 2 stany ("na telefonie"/"w chmurze HH:MM").
- Pełny backup (plan+cykle, schemaVersion 2), import batchami bez limitu 500, updatedAt/revision zachowane.
- ConfirmDialog (wspólny) wpięty w cleanup/merge/reset admina/API keys.
- Szkice kreatora planu w localStorage (builder + preview) z bannerem "kontynuować?".
- PreferenceSync: users/{uid}.preferences (jednostki, język, timer, dźwięk) między web i iOS; users.language pisany dla push/digest.
- Dashboard: planEnded (wygasły LUB zakończony wcześniej), odliczanie "startuje za X dni", karta przedłużenia ZAMIAST cichego auto-startu cyklu.
- Odznaki z paskiem postępu (%), podpowiedź "zrób jeszcze N treningów, aby utrzymać serię".
- Profil linkuje do sekcji Ustawień (?section= + scroll), wykres tonażu z zakresem 8/12 tyg/Wszystko (domyślnie 12).

**Wcześniej w tej sesji:** zawsze ciemny motyw (forcedTheme, usunięty toggle) + licznik ukończonych treningów w nagłówku; iOS build 25 na TestFlight.

**Do zrobienia ręcznie:** rotacja klucza OpenAI w dashboardzie OpenAI (sekret w Secret Manager: openai-api-key) — stary był publiczny w bundlu GH Pages do 2026-03-09.

---

## SESJA 2026-06-11 — grywalizacja: tarcza serii, odznaki specjalne, medale sezonów

- **Tarcza serii (streak freeze):** `calculateStreakDetails` w `summary-utils.ts`. Tydzień bez 2 treningów nie zeruje serii, jeśli starszy tydzień jest zaliczony i poprzednia tarcza była >=4 tyg. wcześniej (max ~1/mies.). Bieżący tydzień nigdy nie łamie serii (naprawia reset w poniedziałek). Notka na Dashboardzie gdy tarcza uratowała zeszły tydzień.
- **Odznaki specjalne:** `computeSpecialBadges` (achievements-utils): Ranny ptaszek (<7:00), Comeback (21+ dni przerwy), Niedzielny wojownik, Konsekwentny (4 tyg. z kompletem planu). Sekcja w Achievements.
- **Medale sezonów:** `season-medals.ts` (złoto >=85%, srebro >=65%, brąz >=40% frekwencji). Chip na closeout cyklu + sekcja "Półka medali" w Achievements.
- Wdrożone: web (GH Pages) + iOS TestFlight build 27.
- **UWAGA build 27 z czystego worktree:** w repo trwa równoległa praca nad Apple Watch (useWatchWorkoutSync, watch-bridge, target StrengthWatch w pbxproj — NIEZACOMMITOWANE). Deploy i build iOS zrobione z czystego HEAD, żeby nie wypuścić WIP. Numer buildu 27 podbity TYLKO w worktree — pbxproj w repo dalej ma 26; przy commitowaniu pracy nad Watch ustawić CURRENT_PROJECT_VERSION >= 28.
