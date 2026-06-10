# Plan wdrozenia poprawek po audycie

Cel: wdrozyc poprawki wykryte w audycie bez mieszania zakresow, z testami po kazdym etapie. Prace prowadzic krok po kroku. Nie laczyc fixow security, sync i UI w jednym commicie.

## Zasady pracy

- Nie ruszaj zmian niezwiązanych z aktualnym etapem.
- Przed kazdym etapem sprawdz `rtk git status --short`.
- Po kazdym etapie uruchom minimum `rtk npm run typecheck` i testy celowane.
- Jezeli etap dotyka Functions, uruchom `rtk npm --prefix functions run build`.
- Jezeli etap dotyka rules, uruchom `rtk npm run test:rules`.
- Jezeli etap dotyka UI flow, uruchom celowane Playwright tests albo dopisz nowy test.
- Kazdy fix powinien miec test regresyjny, chyba ze jest czysto konfiguracyjny.

## Etap 0: ustabilizowac walidacje projektu

1. Napraw `npm run lint`, zeby nie skanowal artefaktow `build/ios`, `dist`, `android/app/src/main/assets`, `test-results`, `playwright-report`.
2. Ustal domyslny jezyk w E2E albo w testach. Obecnie Playwright oczekuje PL, a app renderuje EN.
3. Doprowadz `rtk npm run e2e` do zielonego lub rozdziel suite na `e2e:mock` i pozniejsze `e2e:emulator`.

Akceptacja:

- `rtk npm run lint` przechodzi.
- `rtk npm run typecheck` przechodzi.
- `rtk npm run test` przechodzi.
- `rtk npm run e2e` nie jest czerwony z powodu locale drift.

## Etap 1: security i auth

1. `adminDeleteUser`
   - Najpierw usuwaj/blokuj konto Auth albo nie polykaj bledu `admin.auth().deleteUser(uid)`.
   - Usuwaj dane stronicowane, nie tylko pierwsze `limit(500)`.
   - Dodaj brakujace kolekcje: `strava_connections`, `api_keys`, `api_audit_logs`, `api_rate_limits`, `notification_logs`, `email_verification_codes`, ewentualne `auth_audit_logs`.
   - Zapis audytu wykonuj tak, aby nie utrudnial faktycznego GDPR delete; rozwaz osobny sanitized audit log.

2. Firestore rules i backend access
   - `hasSelfAccess` ma wymagac statusu `active`, nie tylko `access.enabled !== false`.
   - `assertAppAccess` w Functions ma analogicznie wymagac `status === active`, poza adminem.
   - Dodaj rules test: `pending_verification + access.enabled=true` nie moze czytac/pisac workouts/plans.

3. Email verification
   - `sendEmail` ma rzucac blad, gdy Resend zwroci `response.error`.
   - `requestEmailVerificationCode` nie moze zwracac `{ sent: true }`, jesli email nie zostal przyjety przez provider.
   - Dodaj test callable lub unit dla bledu wysylki.

4. Apple provider
   - `providerFromToken` ma rozpoznawac `apple.com`.
   - Ustal docelowa polityke: Apple jako social auth aktywny od razu albo Apple + email verification. Implementacja i UI musza mowic to samo.

5. API export keys
   - Przy kazdym export API sprawdzaj aktualny status/role/access wlasciciela klucza.
   - Democja, zawieszenie albo usuniecie konta ma uniewazniac mozliwosc eksportu.

Akceptacja:

- `rtk npm --prefix functions run build` przechodzi.
- `rtk npm run test:rules` przechodzi i zawiera nowe przypadki status/access.
- Dodane testy dla `adminDeleteUser`, email failure i API key re-auth.

## Etap 2: Strava i ustawienia HR

1. OAuth state
   - Generuj losowy `state`, przechowuj go server-side lub w profilu/connection pending z TTL.
   - Frontend musi przeslac `state` z callback URL do callable.
   - Backend musi odrzucic brak/niezgodnosc `state`.

2. Reconnect i batch delete
   - Usuwaj stare aktywnosci Strava stronicowanymi batchami po maks. 450 operacji.
   - Nie zapisuj nowej connection przed krokiem, ktory moze zostawic polaczony, ale niespojnny stan, albo rob recovery.

3. Disconnect
   - Po disconnect albo ukryj wszystkie aktywnosci, gdy `connected=false`, albo usun/importuj je zgodnie z jasna polityka.

4. Existing activity refresh
   - Sync nie powinien tylko pomijac znanych `stravaId`; powinien aktualizowac pola, ktore Strava mogla dopelnic pozniej.

5. Max HR
   - Przenies zapis `estimatedMaxHR`/`maxHRManualOverride` do callable albo poluzuj rules z waska walidacja.
   - Dodaj test dla normalnego usera.

Akceptacja:

- Test dla Strava callback z poprawnym i blednym `state`.
- Test batch delete >500 aktywnosci.
- Max HR zapisuje sie dla zwyklego usera.

### Etap 2-lite: Strava jako funkcja admin/per-user

Decyzja produktowa: Strava nie jest funkcja domyslna dla wszystkich uzytkownikow. Zostaje dostepna tylko dla admina albo dla uzytkownika z jawnym `features.strava === true`.

Zakres wykonany:

- `canUseStrava` na froncie pozostaje `true` tylko dla admina albo jawnego `features.strava === true`.
- UI entrypointy Stravy sa schowane za `canUseStrava` albo dostaja puste dane z `useStrava`.
- Callable Functions Stravy sa blokowane osobnym guardem `assertStravaAccess`.
- Scheduled sync pomija polaczone konta, ktore nie maja juz dostepu do Stravy.
- OAuth `state` jest losowy, zapisywany server-side z TTL i walidowany w callbacku.

Celowo poza 2-lite:

- reconnect cleanup z paginowanym batch delete >500,
- aktualizacja juz znanych aktywnosci,
- pelna polityka disconnect dla historycznych aktywnosci,
- Max HR callable/rules cleanup.

## Etap 3: treningi, drafty, offline sync

1. Multi-draft
   - IndexedDB store nie moze byc keyPath `userId`; klucz powinien rozrozniac `userId + sessionId` lub `userId + dayId + date`.
   - UI ma blokowac start nowego treningu, gdy istnieje niesynchronizowany draft, albo pokazac wybor: kontynuuj, kolejkuj, odrzuc.

2. Atomic create
   - `createWorkoutSession` uzyj transakcji albo `setDoc` z bezpieczna semantyka create/merge, z kontrola istniejacego dokumentu.

3. Conflict protection
   - Dodaj `updatedAt`/`revision` i sprawdzanie konfliktow przy `batchSaveWorkout`.
   - Final validation nie moze tylko potwierdzac, ze wlasnie nadpisalismy cloud.

4. Final sync after provisional promotion
   - Jesli promocja provisional -> remote sie uda, a final save padnie, pending draft musi miec remote `sessionId`.
   - Reconciliation nie moze chowac final-sync-pending danych.

5. Sync Center parity
   - Payload Sync Center musi zapisywac te same pola co `WorkoutDay`: `rpe`, `pain`, `quality`, exercise `name`, `dayName`, `dayFocus`, `durationSec`, `startedAt`.
   - Validation ma sprawdzac takze metadane, nie tylko sets/completed.

6. Queue robustness
   - `workoutSyncQueue` nie moze bezposrednio rzucac z `localStorage.setItem`; bledy quota/security maja byc obslugiwane.
   - Rozwaz przeniesienie kolejki do IndexedDB, bo dane sa prywatne i wieksze niz typowe localStorage.

Akceptacja:

- Test: start drugiego treningu przy dirty draft nie usuwa pierwszego.
- Test: provisional promotion OK + final save FAIL + reload pokazuje pending local data.
- Test: Sync Center retry zachowuje metryki i snapshoty.
- Test: konflikt offline vs nowszy cloud nie jest cicho nadpisywany.

## Etap 4: plany, cykle i edytory

1. Lifecycle atomowy
   - `startCycleWithPlan`, onboarding i NewPlan maja traktowac archive/save/create cycle jako jedna operacje logiczna z rollbackiem albo idempotentnym recovery.
   - Nie oznaczaj onboardingu jako complete, jesli active cycle nie powstal.

2. Active cycle snapshot
   - Po edycji planu zdecyduj: active cycle snapshot aktualizujemy, czy tworzymy nowy cycle revision.
   - Obecny stan dryfuje: `training_plans` sie zmienia, `plan_cycles.days` zostaje stare.

3. PlanWizard weekdays
   - Continue disabled, dopoki liczba wybranych dni != `daysPerWeek`.
   - `applyWeekdays` ma ustawic dokladnie wybrane dni bez duplikatow.

4. Start date
   - Nie przesuwaj wybranej daty bez jasnej informacji. Jesli snap do poniedzialku zostaje, pokaz preview: wybrano X, cykl startuje Y.

5. Exercise IDs
   - Nie generuj id z `length + 1`. Uzyj stabilnego unikalnego generatora per day.
   - Dotyczy user i admin editorow.

6. Merge cycles
   - `mergeContinuousCycles` nie moze laczyc tylko po bliskosci dat. Dodaj plan identity/template hash/exercise overlap.

Akceptacja:

- Testy dla PlanWizard invalid weekdays.
- Testy dla partial failure onboarding/NewPlan.
- Test dla braku duplicate exercise IDs po remove middle + add.
- Test dla active cycle snapshot/revision.

## Etap 5: exercise identity, i18n i dane statyczne

1. Swap exercise identity
   - Zamiana cwiczenia powinna zmieniac identity albo zachowywac alias/mapping, zeby PR/progresja nie mieszaly starego i nowego cwiczenia.
   - Przy weighted <-> bodyweight wyczysc albo przelicz stale set data.

2. EN instructions
   - `localizeExerciseInstruction` nie moze ignorowac oryginalnej instrukcji i powielac tego samego tekstu dla kilku custom tips.

3. Locale/date
   - Date-only strings `YYYY-MM-DD` parsuj przez `parseLocalDate`, nie `new Date(date)`.
   - Usun twarde `pl-PL` z user-facing komponentow, uzyj `dateLocale(lang)`.

4. Units
   - Napraw round-trip lbs -> kg -> lbs; obecny save path zaokragla kg do 0.5.
   - Ustal, czy unit setting obejmuje tylko wage/ciezar, czy tez obwody. Jesli obejmuje imperial, dodaj inches dla wymiarow.

5. Dane statyczne
   - Zmien `Wyciskanie sztangi/hantli (Płasko)` na kanoniczna pozycje biblioteki albo dodaj mapping.
   - Ujednolic instrukcje `Wznosy bokiem leżąc (Y-Raise)`.
   - Dodaj test coverage dla library/details/i18n mapping i techniki Y-Raise.

Akceptacja:

- Test timezone dla date-only w non-PL timezone.
- Test lbs persisted round-trip.
- Test EN custom instructions.
- Test static data consistency.

## Etap 6: UI/accessibility i mobile

1. Mobile nav
   - Zamien offscreen drawer na Radix `Sheet` albo dodaj `inert`, `aria-hidden`, focus trap, Escape, initial focus.

2. Workout focused mode
   - Ukryj bottom nav na `/workout/*` albo wprowadz jeden shell footer slot, zeby nav i CTA nie walczyly o dol ekranu.

3. Form labels
   - Dodaj programatyczne labele do reps/weight inputs, login fields, switches/selects w Profile/Settings.

4. Push notification UX
   - Usun fake switch z Profile albo skieruj go do real settings.
   - Dodaj Android `POST_NOTIFICATIONS` i sprawdz runtime permission.

5. Clickable chips
   - Zamien `Badge` z `onClick` na button/toggle/radio z `aria-pressed` lub `aria-checked`.

6. Dialogs
   - Ujednolic destructive flows na `AlertDialog`, bez `window.confirm/prompt`.
   - Dodaj safe-area i max-height/overflow dla mobile dialogs.

Akceptacja:

- Playwright/a11y smoke: keyboard tab nie trafia w zamkniety drawer.
- Mobile screenshot/visual check dla aktywnego treningu.
- Inputy serii maja czytelne accessible names.

## Etap 7: performance i reliability

1. PWA update guard
   - Przestaw web PWA na manual prompt, bez `skipWaiting` podczas aktywnego treningu.
   - Chunk reloady (`vite:preloadError`, `lazy-with-retry`) przepusc przez ten sam guard.

2. Profile load failure
   - Rozroznij profile load error/offline od pending verification.
   - Uzywaj ostatniego znanego profilu, jesli jest dostepny.

3. Analytics bundle
   - Lazy-load chart/Strava subtaby i ogranicz eager Recharts.

4. Heavy calculations
   - Indeksuj workouts raz per memo, nie sortuj w petlach per exercise.

5. Hooks
   - Rozdziel `useFirebaseWorkouts` read subscriptions od write actions.

6. Exercise Library videos
   - Nie autoplay wszystkich widocznych filmow; uzyj posterow/intersection/virtualization.

Akceptacja:

- Build nadal przechodzi.
- Brak niekontrolowanego reloadu podczas aktywnego treningu.
- Analytics summary nie laduje niepotrzebnie Strava/chart kodu.

## Etap 8: test strategy

1. Podnies pokrycie dla krytycznych modulow zamiast globalnych niskich progow.
2. Dodaj Functions unit/integration tests dla auth/admin/Strava/API export.
3. Rozszerz Firestore rules tests o status/access, measurements, cycles, telemetry, api/private collections.
4. Podziel E2E:
   - `mock-ui`: szybkie testy UI bez backendu.
   - `emulator-critical`: real auth/functions/rules dla najwazniejszych flows.
5. Zmien smoke assertions na behavioral assertions.

Akceptacja:

- CI ma zielone: lint, typecheck, unit, rules, functions build, e2e mock.
- Emulator critical moze byc osobnym jobem, ale musi dzialac lokalnie.

## Proponowana kolejnosc commitow

1. Tooling/test baseline: lint ignore + e2e locale.
2. Security: admin delete, status/access rules, email send failure.
3. Strava OAuth/state + Max HR.
4. Workout draft/sync atomicity.
5. Plan/cycle lifecycle.
6. Exercise identity + static data.
7. i18n/date/unit fixes.
8. UI/accessibility.
9. Performance/PWA reliability.
10. Test expansion and CI cleanup.

## Gotowy prompt dla nowego agenta

Skopiuj ponizszy prompt do nowej sesji:

```text
Jestes agentem codingowym w repo:
/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save

Najpierw przeczytaj:
- AGENTS.md / lokalne instrukcje, w tym `/Users/grzegorzjasionowicz/.codex/RTK.md`
- `docs/AUDIT_REMEDIATION_PLAN.md`

Wazne zasady:
- Prefixuj shell commands przez `rtk`.
- Nie cofaj cudzych zmian. Worktree moze byc brudny.
- Nie rob wielkiego refactoru naraz. Wdrażaj etapy po kolei.
- Po kazdym etapie uruchom wskazane testy.
- Kazdy istotny bug musi miec test regresyjny.
- Jesli etap dotyka Functions, uruchom `rtk npm --prefix functions run build`.
- Jesli etap dotyka rules, uruchom `rtk npm run test:rules`.
- Jesli etap dotyka UI, uruchom celowane Playwright tests albo dopisz test.

Twoj cel:
Wdrozyc poprawki z `docs/AUDIT_REMEDIATION_PLAN.md` krok po kroku.

Kolejnosc pracy:
1. Etap 0: napraw walidacje projektu (`lint`, locale drift w E2E).
2. Etap 1: security/auth (`adminDeleteUser`, status/access rules, email verification failure, Apple provider, API key re-auth).
3. Etap 2: Strava i Max HR.
4. Etap 3: workout drafts/offline sync/conflicts/Sync Center parity.
5. Etap 4: plan/cycle lifecycle i duplicate exercise IDs.
6. Etap 5: exercise identity, i18n/date/unit/static data.
7. Etap 6: UI/accessibility/mobile nav/push UX.
8. Etap 7: PWA/performance/reliability.
9. Etap 8: test strategy/CI coverage.

Pracuj iteracyjnie:
- Przed startem etapu napisz krotki plan i sukces criteria.
- Zrob minimalny zakres kodu dla etapu.
- Uruchom testy.
- Jesli testy failuja, napraw albo jasno opisz blocker.
- Po zakonczonym etapie podaj zmienione pliki, testy i ryzyka.

Zacznij od `rtk git status --short`, potem otworz `docs/AUDIT_REMEDIATION_PLAN.md` i wykonaj Etap 0.
```
