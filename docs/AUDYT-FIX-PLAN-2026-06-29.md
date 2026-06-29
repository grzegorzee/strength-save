# Plan naprawy po audycie (2026-06-29, build 46 / 6.13.0)

> Źródło: audyt 9 obszarów (reguły Firestore, sync, lifecycle, resolver, statystyki, timery, hardening, wersje, bramki).
> Dowody zweryfikowane w kodzie (plik:linia) i na prod read-only (5 userów, 56 treningów, 13 cykli).
> Zasada wykonania: Karpathy (TDD, surgical, simplicity). Każde zadanie = osobny commit z testem. Zero deploy/push/iOS build bez zgody usera.

## Zasady dla każdego zadania

1. Najpierw test odtwarzający problem (vitest / playwright), dopiero potem fix. Czerwony przed, zielony po.
2. Zmiana dotyka TYLKO swojego obszaru. Nie poprawiaj sąsiedniego kodu przy okazji.
3. Przed commitem: `npm run typecheck && npm run lint && npm run test`. Dla zadań dotykających reguł: `npm run test:rules` (JDK21: `export JAVA_HOME=/opt/homebrew/opt/openjdk@21; export PATH="$JAVA_HOME/bin:$PATH"`). Dla nawigacji/UI: `npm run e2e:mock`.
4. Osobny commit per zadanie, opis z root cause. Wpis do `DECYZJE.md` (co, dlaczego, root cause, weryfikacja).
5. NIE pushować na origin, NIE `npm run deploy`, NIE `release:ios`. Po zakończeniu loop zatrzymać się i poczekać na zgodę usera na publikację.
6. Dane usera święte: żadnych testów na realnym koncie. Prod tylko do odczytu.

---

## Kolejność wykonania (rosnące ryzyko, baseline bramek najpierw)

### Z1. e2e: naprawa 2 czerwonych testów nawigacji  [#12, P2]
- Problem: testy oczekują mobilnego hamburgera/drawera usuniętego w build 46 (commit 938aadb).
- Dowód: `e2e/ui-improvements.spec.ts:46` klika `getByRole('button', { name: 'Nawigacja główna' })` (TimeoutError, przycisku nie ma); `e2e/nav-analytics.spec.ts:7` zakłada "History only in side menu".
- Fix: zaktualizować oba testy do obecnej nawigacji (tylko dolny `AppNavigation`, bez bocznego menu mobilnego). Jeśli scenariusz drawera nie ma już sensu na mobile, usunąć dany test/asercję; zachować pokrycie dolnej nawigacji.
- Weryfikacja: `npm run e2e:mock` 0 failed.
- Deploy: nie (zmiana w `e2e/`).

### Z2. Tonaż cyklu liczy serie rozgrzewkowe  [#3, P2]
- Problem: tonaż cyklu zawyżony o rozgrzewki, niespójny z `summary-utils`.
- Dowód: `src/lib/cycle-insights.ts:112-114` sumuje bez `&& !set.isWarmup`; `summary-utils.ts:31` ma filtr; PR-y w tym samym pliku rozgrzewki pomijają (`:132`).
- Fix: dodać `&& !set.isWarmup` w `cycle-insights.ts:114`.
- Weryfikacja: test w `src/test/cycle-insights.test.ts` (cykl z serią rozgrzewkową nie wlicza jej do tonażu); istniejące testy zielone.
- Deploy: web + iOS.

### Z3. Cleanup martwego kodu hardeningu  [#9, P2]
- Problem: sieroty po revercie build 46 i nieużywane moduły.
- Dowód: `enforceWorkingSetCount` w `ExerciseCard.tsx` (153,178,198,210-221,451,597,607) i `exercise-utils.ts` (197,209) bez żadnego wołającego (prop usunięty w 938aadb) → zawsze false; `src/lib/offline-queue.ts` (`.add()` nieużywane, tylko `.size()` w `useOnlineStatus.ts:36`); `workout-draft-db.ts:449 markCompletedLocally` zdefiniowane, nigdzie nie wołane.
- Fix: usunąć prop `enforceWorkingSetCount` i martwe gałęzie; usunąć `offline-queue.ts` + odwołanie w `useOnlineStatus.ts` (zostawić realne źródło `pendingOps`); usunąć `markCompletedLocally`. Surgical, bez zmiany zachowania.
- Weryfikacja: `npm run typecheck && npm run lint && npm run test`; ręcznie sprawdzić że `offline-queue.test.ts` (jeśli testuje martwy moduł) zostaje sensowny albo usunięty wraz z modułem.
- Deploy: web + iOS.

### Z4. Ujednolicić ukrywanie pustych/technicznych cykli  [#4, P2]
- Problem: martwy filtr `isCycleVisible` (flagi nigdzie nieustawiane) + Dashboard nie odsiewa pustych cykli, więc pusty completed cykl może trafić do porównania.
- Dowód: `src/lib/cycle-visibility.ts:3` czyta `technical`/`hiddenFromInsights` (grep: nigdzie nieustawiane → zawsze true); `Dashboard.tsx:184,201` filtruje tylko `isCycleVisible`, inaczej niż `Cycles.tsx:137` i `Achievements.tsx:192` (`stats.totalWorkouts>0`). Prod: user MwiWFE ma 7 pustych completed cykli.
- Fix: jeden helper widoczności `isCycleVisible(c) && (c.status==='active' || c.stats.totalWorkouts>0)` użyty we wszystkich 3 miejscach (Dashboard, Cycles, Achievements). Nie ustawiamy nowych flag, opieramy się na `totalWorkouts`.
- Weryfikacja: test jednostkowy helpera (pusty completed → ukryty, aktywny pusty → widoczny, completed z treningami → widoczny).
- Deploy: web + iOS.

### Z5. Stale staty completed cyklu  [#5, P2]
- Problem: staty completed liczone raz przy archiwizacji; gdy trening dojdzie/zmieni się później, completed cykl pokazuje 0% lub znika.
- Dowód: `usePlanCycles.ts:128,137 archiveCurrentPlan` liczy `computeStats` jednorazowo; brak recompute. Prod: MwiWFE cykl `5Hp8zu20` ma 1 trening ale `stats.totalWorkouts=0` → ukryty.
- Fix (najprostszy, simplicity-first): w widokach completed liczyć staty live z treningów tak samo jak aktywny (`buildActiveCyclePreview`/`computeCycleStats`), zamiast czytać zapisane `cycle.stats`. Zapisane `stats` zostają jako cache, ale UI ma jedno źródło prawdy = treningi.
- Alternatywa (jeśli live wszędzie za duża): recompute `stats` completed cyklu przy zapisie treningu należącego do tego cyklu.
- Weryfikacja: test (completed cykl + treningi dołożone po archiwizacji → poprawny totalWorkouts/completionRate); sprawdzić CycleCard/CycleDetail/Achievements.
- Deploy: web + iOS.

### Z6. P1: fałszywy konflikt sync po wznowieniu z tła  [#1, P1 — KRYTYCZNE]
- Problem: po zgaszeniu ekranu i powrocie (iOS purguje WKWebView) fałszywy "Trening edytowany na innym urządzeniu"; wybór "Pobierz z chmury" = utrata serii.
- Dowód: `markDraftSynced` przy edycji w trakcie syncu (`draft.version !== expectedDraftVersion`) zwraca draft bez zmian → `cloudRevision` nie trafia do IndexedDB (`src/lib/workout-draft-db.ts:440`). Korekta żyje tylko w pamięci (`WorkoutDay.tsx:637-645`), ginie przy purge. Po resume `expectedRevision` z IDB ≠ serwer → `WORKOUT_CONFLICT` (`workout-final-sync.ts:30-36`, `useFirebaseWorkouts.ts:606`).
- Fix: w `markDraftSynced` zapisywać `cloudUpdatedAt`/`cloudRevision` ZAWSZE (to fakt serwera, niezależny od edycji draftu), nawet gdy `draft.version !== expectedDraftVersion`; przy niezgodnej wersji aktualizować tylko znaczniki chmury, nie ruszać `dirty` ani treści. Tym samym po purge IDB ma aktualny `cloudRevision`.
- Weryfikacja: test jednostkowy `workout-draft-db` (edycja podbija version w trakcie syncu → cloudRevision i tak zapisany; dirty pozostaje true). Test integracyjny scenariusza: draft v1 → sync start (expected v1) → edycja do v2 → markDraftSynced(expected=v1, cloudRevision=R) → reload z IDB → expectedRevision==R → brak konfliktu przy zgodnym serwerze. Ręcznie: realne urządzenie, scenariusz background/resume z edycją serii tuż przed zgaszeniem ekranu.
- Deploy: web + iOS (po ręcznym teście background/resume).

### Z7. Asymetria status: reguły vs callable  [#2, P2]
- Problem: konto bez pola `status` (legacy/Google) zapisze trening (reguły OK), ale AI/Strava odrzuci ("Active app access required").
- Dowód: `firestore.rules:24-29` brak status = aktywny; `functions/src/security.ts:78 hasCallableAppAccess` wymaga `status==='active'` (test `functions/src/security.test.ts:61` `{}`→false); bramkuje `index.ts:572,676,790`. `registration.ts:392+` update path nie backfilluje status. Prod: 0 userów dotkniętych dziś (wszyscy active).
- Fix: ujednolicić `hasCallableAppAccess` do logiki reguł — brak pola `status` traktować jak aktywny (jawnie nieaktywni: pending_verification/suspended nadal blokowani), zachowując warunek `access.enabled !== false`. Zaktualizować testy `security.test.ts` (oraz `src/test/functions-security.test.ts`) o przypadek braku status = dozwolone.
- Opcjonalnie: backfill `status:'active'` w update path `syncUserProfile` dla profili bez tego pola (self-healing).
- Weryfikacja: `npm run test` (functions-security) + build functions.
- Deploy: functions deploy (osobna zgoda usera, to backend Cloud Functions).

### Z8. Spinner startu treningu bez timeoutu przy pustym uid  [#6, P2]
- Problem: nieskończony spinner bez komunikatu, gdy `uid` chwilowo puste (odświeżanie tokena).
- Dowód: `WorkoutDay.tsx:1560` gate wymaga `isLoaded` z hooków, które przy braku `userId` robią early-return bez `setIsLoaded(true)` (`useTrainingPlan.ts:33`, `usePlanCycles.ts:66`, `workout-read-store.ts:143`); brak timeoutu.
- Fix: w gałęzi `!userId` ustawiać `isLoaded(true)` (źródła "puste, ale gotowe") albo dodać timeout + komunikat "logowanie..." w branchu spinnera. Preferuj pierwsze (prostsze, spójne).
- Weryfikacja: test że przy pustym userId gate nie wisi; ręcznie sprawdzić ekran startu bez crasha.
- Deploy: web + iOS.

### Z9. Twardy throw przy 2 aktywnych cyklach  [#7, P2]
- Problem: przy 2 aktywnych cyklach na datę start pada generycznym toastem, brak recovery.
- Dowód: `src/lib/workout-start.ts:55` `throw 'MULTIPLE_ACTIVE_CYCLES'`, łapane ogólnym catch (`WorkoutDay.tsx:1251`). Prod: nie występuje (każdy user 1 aktywny).
- Fix: zamiast throw deterministyczny wybór (np. najnowszy `createdAt` lub zawierający datę), z logiem ostrzegawczym; start kontynuuje. Brak blokady usera.
- Weryfikacja: test `workout-start` (2 aktywne cykle → wybrany deterministycznie, brak wyjątku).
- Deploy: web + iOS.

### Z10. IntervalTimer nie background-safe  [#8, P2 — latentne, flaga OFF]
- Problem: EMOM/AMRAP po zgaszeniu ekranu nie odpali sygnału rund/finiszu.
- Dowód: `src/components/IntervalTimer.tsx:51-72` tylko `setInterval(1000)`, brak local notification (inaczej niż `RestTimer` + `rest-notification.ts`). Maskowane: `VITE_FEATURE_WORKOUT_TIMERS=false` w prod.
- Fix: przy włączaniu timerów zaplanować local notification na koniec bloku (i ewentualnie granice rund) jak w `scheduleRestEndNotification`. Dopóki flaga OFF, to dług; zrobić razem albo świadomie odłożyć z notą.
- Weryfikacja: test logiki planowania notyfikacji; ręcznie po włączeniu flagi (poza tym wdrożeniem).
- Deploy: web + iOS (tylko jeśli realizowane).

### Z11. ai-coach: resolver zamiast surowego id  [#11, P2 — latentne, kod martwy]
- Problem: re-aktywacja coacha podałaby AI surowe `exerciseId` przy braku snapshotu.
- Dowód: `src/lib/ai-coach.ts:103,466` `map.get(id) || ex.name || ex.exerciseId` (plan-first, pomija cykle/defaultPlan). `prepareCoachData`/`generateWorkoutSummary` nigdzie nieimportowane.
- Fix: przy podłączaniu coacha przekazać `cycles` + użyć `resolveExerciseName` (snapshot-first), jak Analytics/Achievements. Dziś latentne; zrobić przy okazji lub zostawić notę TODO przy funkcjach.
- Weryfikacja: test resolvera w kontekście coacha (jeśli realizowane).
- Deploy: functions/web (tylko jeśli realizowane).

### Z12. Bramka preflight + aktualizacja CLAUDE.md  [#10, P2]
- Problem: `release-ios-preflight.mjs` nie sprawdza `CURRENT_PROJECT_VERSION`; CLAUDE.md mówi "4 wystąpienia", realnie 6.
- Dowód: agent potwierdził 6 wystąpień `CURRENT_PROJECT_VERSION` (=46) i `MARKETING_VERSION` (=6.13.0) w `project.pbxproj`; preflight waliduje tylko marketing/package/Info.plist.
- Fix: dodać do `scripts/release-ios-preflight.mjs` sprawdzenie spójności wszystkich `CURRENT_PROJECT_VERSION` (równe sobie). Poprawić w `CLAUDE.md` checklist "4 wystąpienia" → "6 wystąpień".
- Weryfikacja: `node scripts/release-ios-preflight.mjs` przechodzi przy spójnych wersjach, faila przy rozjeździe.
- Deploy: nie (skrypt + dok).

---

## Globalne kryterium DONE (cel loop)

Wszystkie poniższe spełnione jednocześnie:

1. Każde zadanie Z1-Z12 zaadresowane: zaimplementowane LUB świadomie odłożone z notą w tym pliku (status `[ODŁOŻONE: powód]`). Z6 (#1 P1) MUSI być zrobione, nie wolno odłożyć.
2. Każdy zrealizowany fix ma test (vitest lub playwright) odtwarzający problem, czerwony przed fixem.
3. Bramki zielone: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:rules` (JDK21), `npm run e2e:mock` (0 failed).
4. Każdy fix = osobny commit z opisem root cause. Bez push, bez deploy, bez iOS build.
5. `DECYZJE.md` zaktualizowane wpisem zbiorczym lub per zadanie.
6. Ten plik zaktualizowany: każde zadanie oznaczone `[ZROBIONE]` / `[ODŁOŻONE: powód]` z numerem commita.
7. Na końcu: krótki raport w czacie (co zrobione, co odłożone i dlaczego) + lista do zgody usera: push origin, `npm run deploy` (web), `release:ios` (iOS), `firebase deploy --only functions` (dla Z7).

## Status (uzupełniać w trakcie)

- Z1 e2e nawigacja: [ZROBIONE] — testy zaktualizowane do nawigacji bez mobilnego drawera (commit nast.)
- Z2 tonaż rozgrzewki: [ ]
- Z3 cleanup martwego kodu: [ ]
- Z4 widoczność cykli: [ ]
- Z5 stale staty completed: [ ]
- Z6 P1 sync konflikt: [ ]
- Z7 asymetria status: [ ]
- Z8 spinner timeout: [ ]
- Z9 multiple active cycles: [ ]
- Z10 interval timer bg: [ ]
- Z11 ai-coach resolver: [ ]
- Z12 preflight + CLAUDE.md: [ ]
