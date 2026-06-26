# Plan wdrożenia release-readiness — 2026-06-24

## Cel i źródła prawdy

Ten plan jest wykonawczą checklistą napraw wynikających z
`AUDIT_RELEASE_READINESS_2026-06-24.md`. Zakres i definicja gotowości do
release pozostają w `PLAN_NAPRAWY_2026-06-24.md`.

Nie przechodź do kolejnej fazy, gdy poprzednia ma otwarty P0/P1 lub niespełnione
kryterium akceptacji. Każdy punkt ma być małą, samodzielną zmianą z testem
regresyjnym.

## Warunki pracy

- Każde polecenie shell przez `rtk`.
- Przed każdą fazą: `rtk git status --short`, `rtk git diff --stat`, aktualny branch.
- Nie resetować, stashować, checkoutować ani nadpisywać cudzych zmian.
- Bez deployów, commitów, pushów i zmian sekretów bez osobnej zgody.
- Przed zmianą: test reprodukujący. Po zmianie: test regresyjny i bramki fazy.

## M0 — harness i wiarygodne bramki

- [x] Dodać fail-fast/preflight JDK >=21 dla Rules i emulator E2E.
- [x] Dodać fail-fast/preflight dla binarium Playwright WebKit.
- [x] Rozdzielić w CI i nazewnictwie mock UI E2E od emulator-critical E2E.
- [x] Zastąpić race testy oparte o sleep/fake IndexedDB kontrolowanymi promise'ami.
- [x] Dodać emulatorowy test krytycznego zapisu treningu.

Kryteria akceptacji:

- [x] Brak JDK/WebKit daje czytelny błąd precondition, nie pozorny wynik testu.
- [x] Mock E2E nie jest przedstawiane jako integracja backendowa.
- [x] Race tests kontrolują kolejność A/B/ACK deterministycznie.

Weryfikacja:

```bash
rtk npm run typecheck
rtk npm run lint
rtk npm test
rtk npm run test:rules
rtk npm run e2e
rtk npm run e2e:emulator
rtk npm run e2e:webkit
```

## M1 — auth, privacy, deletion i push

- [x] Zachować i potwierdzić Rules: profile allowlist, subscription deny, immutable owner, prywatne kolekcje.
- [x] Rozszerzyć emulator Rules o subscription, owner fields, access/status i private paths.
- [x] Przenieść FCM z array `fcmTokens` do registry tokenów z ownerem, device markerem i `lastSeen`.
- [x] Zapewnić atomowy reassign/revoke tokenu przy logout i switch konta.
- [x] Usunąć ścieżki bezpośredniego `signOut` omijające wspólny logout helper.
- [x] Przebudować deletion jako idempotentną operation z trwałym postępem i retry po partial failure.
- [x] Nie ignorować błędów Storage/direct-doc cleanup; worker musi móc dokończyć po usunięciu Auth.

Kryteria akceptacji:

- [x] Token nie może należeć jednocześnie do A i B.
- [x] Retry usunięcia konta kończy wszystkie dane i Auth dokładnie raz.
- [x] Rules blokują każde naruszenie owner/access/subscription.

Weryfikacja:

```bash
rtk npm --prefix functions test
rtk npm run test:functions:emulator
rtk npm --prefix functions run build
rtk npm run test:rules
rtk npm run e2e:emulator
```

## M2 — treningi, offline, konflikty i drafty

- [x] Zastąpić `expectedUpdatedAt` przez `expectedRevision` we wszystkich ścieżkach zapisu.
- [x] Transakcja zapisuje `revision + 1` tylko przy ścisłej zgodności expected revision.
- [x] Dodać draft version/content hash i warunkowe przetwarzanie ACK.
- [x] Serializować IndexedDB writes per `(userId, sessionId)` i ignorować stale completion.
- [x] Utworzyć jeden helper promotion provisional → remote; użyć w WorkoutDay, AutoSync i Sync Center.
- [x] Zachować revision/metadane w finalization retry i Sync Center.
- [x] Obsłużyć quota/local storage errors bez fałszywego „saved”.

Kryteria akceptacji:

- [x] Clock skew nie pozwala na cichy overwrite.
- [x] ACK v1 nie czyści lokalnego v2.
- [x] Reload po promotion/finalization nie odtwarza provisional draftu.
- [x] Retry finalizacji używa stabilnego payloadu/revision.

Weryfikacja:

```bash
rtk npm test -- workout-draft workout-draft-db workout-final-sync workout-sync-queue sync-center-payload
rtk npm run test:rules
rtk npm run e2e:emulator
rtk npm run build
```

## M3 — onboarding, plany i cycles

- [x] Dodać deterministic cycle ID lub operation ID do onboarding/start/repeat cycle.
- [x] Uczynić retry workflow idempotentnym; nie tworzyć drugiego active cycle.
- [x] Dodać revision/precondition dla training plan.
- [x] Zdefiniować atomowy contract plan ↔ active-cycle snapshot.
- [x] Zmienić merge/delete cycles na operacje batch <=450 z persistent cursor/checkpointem.
- [x] Dodać recovery po partial failure.
- [x] Liczyć daty i expected sessions po kalendarzu, bez stałej `86_400_000`.

Kryteria akceptacji:

- [x] Retry po failure daje dokładnie jeden active cycle.
- [x] Dwie edycje planu dostają conflict, nie last-writer-wins.
- [x] Merge/delete 501+ workoutów są wznawialne i spójne.
- [x] Start w środę i DST 2026-03-29 są poprawne.

Weryfikacja:

```bash
rtk npm test -- cycle-actions plan-cycle-utils cycle-insights trainingPlan
rtk npm run typecheck
rtk npm run e2e:emulator
```

## M4 — poprawność domenowa

- [x] Wprowadzić wspólny predykat: completed workout + completed non-warmup working set.
- [x] Zastosować go w PR, achievements, tonnage, insights i cycle stats.
- [x] Oddzielić heatmap `hasWorkout` od tonnage, aby bodyweight nie znikał.
- [x] Walidować measurements w UI, action i imporcie: finite, dodatnie, rozsądny zakres, canonical kg/cm.
- [x] Wprowadzić strict `parseLocalDate` i calendar/date-only utility.
- [x] Reject/clamp HR > maxHR oraz invalid HR/duration w TRIMP.

Kryteria akceptacji:

- [x] Incomplete/warmup nie daje PR.
- [x] Completed bodyweight jest widoczny w heatmapie.
- [x] Invalid measurements i invalid dates nie są zapisywane.
- [x] Leap day, DST i HR boundaries przechodzą testy.

Weryfikacja:

```bash
rtk npm test -- pr-utils heatmap-utils units date-utils training-load cycle-insights
rtk npm run typecheck
rtk npm run build
```

## M5 — AI, schedulery, Watch i iOS

- [x] Usunąć zahardkodowany production streaming URL; dodać config production/staging/emulator.
- [x] Powiązać disconnect HTTP z AbortController upstream OpenAI.
- [x] Uczynić usage reservation/release/record dokładnie jednokrotnym.
- [x] Dodać paginację, candidate selection i bounded concurrency do schedulerów.
- [x] Przygotować resumable Cloud Tasks/cursor przed większą skalą.
- [x] Zmienić Watch bridge na event IDs i `peek → durable persist → ack`.
- [x] Zablokować cichy trim niepotwierdzonych Watch events.
- [x] Dodać HealthKit workout recovery po relaunchu Watch extension.
- [x] Ujednolicić web/iOS/Watch marketing version i build version.
- [x] Dodać preflight blokujący archive przy mismatch version lub braku RevenueCat Apple key.

Kryteria akceptacji:

- [x] Emulator/staging AI nie wywołuje produkcji.
- [x] Disconnect abortuje upstream, a usage rozlicza się raz.
- [x] Watch event nie ginie ani nie duplikuje się po crash/relaunch/live+transfer.
- [x] Scheduler 1k userów ma ograniczoną concurrency.
- [x] iOS release preflight blokuje brak key/version mismatch.

Weryfikacja:

```bash
rtk npm --prefix functions test
rtk npm --prefix functions run build
rtk npm test -- watch-event-router
rtk npm run build:mobile
rtk npm run ios:simulator:smoke
```

Wymagany manualny test na fizycznym iPhone + Watch: permissions, login, sandbox
purchase, offline Watch event, relaunch extension, ACK i finalizacja.

## M6 — wydajność i skalowanie

- [x] Wydzielić shared workout read store od write actions.
- [x] Dodać paginację/range query historii i analytics.
- [x] Strava: zakres/paginacja zamiast całej historii.
- [x] Admin: paginacja i backendowe agregaty zamiast globalnych realtime listenerów.
- [x] Lazy-load chart/Strava i ustalić budget bundle.
- [x] Dodać fixture 1k–5k workouts i 10k Strava activities.

Kryteria akceptacji:

- [x] Udokumentowany limit listenerów i dokumentów na ekran.
- [x] Dashboard/admin nie pobiera całej historii/globalnych kolekcji.
- [x] CI sprawdza budget bundle.

Weryfikacja:

```bash
rtk npm test
rtk npm run build
rtk npm run e2e
```

## M7 — CI, deploy readiness i observability

- [x] Użyć Node 22 dla Functions w CI.
- [x] Dodać `functions.predeploy` wymuszający build/typecheck/test.
- [x] Dodać chroniony Firebase deploy job dla Functions, Rules, Indexes i Storage.
- [x] Zapisać checksum/SHA/revision wdrożonych artefaktów.
- [x] Walidować wymagane env dla web i mobile build.
- [x] Dodać metryki/alerty: conflicts, failed final sync, stale drafts, webhook drops, FCM failures, partial deletion, AI stream errors.
- [x] Nie uruchamiać real deployu bez osobnej zgody użytkownika.

Kryteria akceptacji:

- [x] Brak env lub świeżego artefaktu blokuje release.
- [x] CI nie testuje/deployuje Functions na Node 20.
- [x] Revision wdrożonych kontraktów Firebase jest możliwa do potwierdzenia.

## Końcowa checklista release

- [ ] Brak P0/P1.
- [x] Typecheck, lint, root tests, Functions tests zielone.
- [x] Rules i emulator E2E zielone na JDK >=21.
- [x] Mock E2E i WebKit zielone.
- [ ] Web, mobile i Functions build zielone z pełnym env validation.
- [x] iOS simulator smoke zielony.
- [ ] Manual iPhone/Watch smoke oraz RevenueCat sandbox purchase potwierdzone.
- [ ] Firebase deploy pipeline ma świeży artefakt i zapisaną revision.
- [ ] Każde ryzyko migracyjne ma zatwierdzoną decyzję właściciela.
