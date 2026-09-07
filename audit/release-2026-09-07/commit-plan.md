# Plan izolowanych commitów — release iOS 143 / Android 49

Plan read-only z 7 IX: 141 zmienionych plików śledzonych, pusty indeks, nowe
pliki audytu i regresji. Root równolegle tworzy artefakty, więc przed stagingiem
trzeba odświeżyć samą listę nazw. Nie zmieniono źródeł, indeksu ani HEAD; nie
uruchamiano testów. Nie odczytywano diffu ani treści `docs/LAUNCH-RUNBOOK.md`.

Poniżej 10 grup review. Wzorce ścieżek oznaczają **wyłącznie obecnie zmienione
pliki audytu**, nie polecenia zbiorczego `git add`. Wspólne pliki dzielimy po
opisanych fragmentach. W treści commita należy wymienić poszczególne IDs,
przyczynę i istniejący dowód RED→GREEN. Główne raporty/zbiorcze dowody są w G10.

| Grupa i proponowany temat | Zakres oraz ścieżki |
|---|---|
| **G1 — Backend: niezawodne usuwanie kont i zadania Firebase** (B1–B3, B13) | `functions/src/registration.ts`, `functions/src/registration.integration.test.ts`, `functions/src/security.ts`, `functions/src/security.test.ts`, `functions/src/garmin-entitlement.ts`, `functions/src/email-templates.ts`; `firestore.indexes.json`, `storage.rules`, `scripts/test-storage-rules.mjs`; fragmenty `firestore.rules` i `scripts/test-firestore-rules.mjs` dotyczące `deletionPending`. B13: `functions/src/workout-aggregate.ts`, `functions/src/bug-reports.ts`, `functions/src/repairs/admin-user-repair.ts`, `functions/src/error-digest.ts`, `functions/src/cost-digest.ts`, `functions/src/firebase-admin-static-runtime.test.ts`; wyłącznie importy/referencje `FieldValue`/`Timestamp` również w `functions/src/index.ts`, `functions/src/revenuecat.ts`, `functions/src/consents.ts` i powyższym registration. Lokalne fixture uruchomienia rzeczywistych callable: `e2e/emulator/app-check.ts`, `e2e/emulator/critical-auth.spec.ts`, `e2e/emulator/offline-user-provider.spec.ts`, `e2e/emulator/plan-lifecycle.spec.ts`, `e2e/emulator/workout-conflict.spec.ts`, `playwright.emulator.config.ts`. |
| **G2 — Zakupy przypisane do konta i poprawne webhooki** (B4, B6–B8) | `src/lib/purchases.ts`, `src/hooks/useSubscription.ts`, `src/pages/Paywall.tsx`; z `src/hooks/useAuth.ts` tylko inicjalizacja RevenueCat dla cached UID. `src/test/purchases-identity.test.ts`, `src/test/use-subscription-bootstrap.test.tsx`, `src/test/paywall-purchase-feedback.test.tsx`. `functions/src/revenuecat.ts` poza B13, `functions/src/revenuecat.test.ts`, `functions/src/revenuecat-transfer.ts`, `functions/src/revenuecat-transfer.test.ts`, `functions/src/revenuecat-webhook.test.ts`, `scripts/ensure-functions-emulator-secrets.mjs`. |
| **G3 — Granice zgód, native Health i prywatność zapisów** (B5, B9–B11, NAT-01–04, OB-N1/N2/N4) | `src/lib/health-bridge.ts`, `src/lib/health-sync.ts`, `src/hooks/useManualActivities.ts`, `src/components/HealthSettings.tsx`, `src/contexts/UserContext.tsx`, `src/lib/consent-confirmation.ts`, `src/lib/consents-api.ts`, `src/lib/protected-callable.ts`; fragmenty auth/WorkoutDay/Onboarding/hooka zapisów opisane niżej. `functions/src/strava-health-commit.ts`, `functions/src/strava-health-commit.test.ts`; Strava `syncUserActivities` w `functions/src/index.ts`; owner check w `functions/src/consents.ts`, `functions/src/consents-response.test.ts`. Android `android/app/src/main/java/com/grzegorzjasionowicz/strengthsave/HealthSyncPlugin.kt`, `android/app/src/main/java/com/grzegorzjasionowicz/strengthsave/HealthPermissionsRationaleActivity.kt`, tylko HC queries/rationale w `android/app/src/main/AndroidManifest.xml`; `ios/App/App/HealthSync/HealthSyncPlugin.swift`. Firestore: exercises przez callable oraz brakujący sidecar przy delete, wraz z odpowiadającymi testami Rules. |
| **G4 — Pełny snapshot treningu przed usunięciem szkicu** (W1–W4) | `src/lib/workout-final-sync.ts`, `src/lib/workout-hydration.ts`, `src/lib/workout-sync-engine.ts`, `src/test/workout-final-sync.test.ts`, `src/test/launch-workout-snapshot-integrity.test.ts`; wyłącznie usunięcie warunkowego `undefined` dla `skippedExercises` w `src/pages/WorkoutDay.tsx`. Notatki, usunięte serie oraz pending Health nie mogą dostać fałszywego ACK. |
| **G5 — CSV/restore przypisane do właściciela i odzyskiwanie częściowego importu** (W5–W9, B12, partial CSV follow-up) | `src/lib/workout-csv.ts`, `src/lib/workout-import/batch.ts`, `src/lib/workout-import/mapper.ts`, `src/lib/workout-import/parser.ts`, `src/lib/workout-restore-v3.ts`, `src/components/WorkoutImportWizard.tsx`; import CSV/JSON i Undo w `src/hooks/useFirebaseWorkouts.ts`. `functions/src/workout-restore-v3.ts`, `functions/src/workout-restore-v3.test.ts`. `src/test/workout-csv.test.ts`, `src/test/workout-import-*.test.*` poza backfill, `src/test/workout-restore-v3.test.ts`; PL/EN tylko `import.healthConsentRequired` i `import.accountChanged`; `e2e/full-app.spec.ts` tylko legal-version import i aktywny grant dla fixture Strong/RPE. |
| **G6 — Trwały wybór planu i idempotentny onboarding po restarcie** (OB-W1–W3, OB-N3, cross-week P1) | `src/hooks/usePlanCycles.ts`, `src/lib/cycle-actions.ts`, `src/lib/onboarding-draft.ts`, `src/components/PlanPreview.tsx`, `src/components/PlanStartStep.tsx`; logika draft/resume/legal-draft gate/save singleflight w `src/components/PlanWizard.tsx` i `src/pages/Onboarding.tsx`. `src/test/onboarding-draft.test.ts`, `src/test/onboarding-preview-recovery.test.tsx`, `src/test/plan-wizard-draft-consent.test.tsx`, `src/test/plan-cycle-choice-sequence.test.tsx`, `src/test/plan-cycle-same-start-replan.test.tsx`; PL/EN tylko `ob.errExistingPlanRecovery`. |
| **G7 — Formularze z recovery, krótsze copy i dostępny login z klawiaturą** (UX, steering usera) | `src/components/MeasurementsForm.tsx`, `src/pages/Measurements.tsx`, `src/pages/Login.tsx`, `src/components/GarminSettings.tsx`; `src/test/measurements-*.test.tsx`, `src/test/login-screen.test.tsx`, `e2e/login-keyboard.spec.ts`, `e2e/auth-registration.spec.ts`; copy hunks PlanWizard/Onboarding (usunięcie socialProof i opisów), pozostałe zmienione wartości PL/EN poza G5/G6/G8. `src/test/onboarding-plain-language-contract.test.ts`, `src/test/product-copy-clarity.test.ts`, `src/test/plan-wizard-welcome.test.tsx`; zmienione oczekiwania tekstu w testach onboardingu. |
| **G8 — Android: systemowy alarm przerwy i wybór dźwięku** (NAT-05) | `src/lib/rest-notification.ts`, `src/components/AndroidTimerPermission.tsx`, `src/pages/Profile.tsx`; manifest tylko `SCHEDULE_EXACT_ALARM`; `android/app/src/main/res/raw/rest_alarm.wav`, `android/app/src/main/res/raw/rest_bell.wav`, `android/app/src/main/res/raw/rest_horn.wav`. `src/test/android-timer-permission.test.tsx`, `src/test/android-timer-resources.test.ts`, `src/test/rest-notification.test.ts`, `src/test/rest-timer-controller.test.tsx`; PL/EN tylko trzy `rest.exactAlarm.*`. |
| **G9 — Rozgrzewka: świeży start telefonu, resume i brak powtórnego ruchu** (WU-01/02, owner preference follow-up) | `src/lib/prestart-warmup.ts`, `src/lib/warmup-prompt.ts`, `src/lib/workout-autostart.ts`, `src/components/PreferenceSync.tsx`; wyłącznie warmup fragmenty WorkoutDay z listy poniżej. `src/test/prestart-warmup.test.ts`, `src/test/preference-sync-warmup-prompt.test.tsx`, `src/test/workout-autostart.test.ts`, `src/test/warmup-routine-dialog.test.tsx`, `src/test/warmup-movement-uniqueness.test.tsx`; `e2e/warmup-persistence.spec.ts`, `e2e/warmup-prompt-preference.spec.ts`, `e2e/workout-milestone.spec.ts`, `e2e/plan-edit-during-workout.spec.ts`, `e2e/resume-after-kill.spec.ts`, `e2e/batch-save.spec.ts`, `e2e/plan-cycle-day-ids.spec.ts`. Helper i pozostałe fresh-start fixture hunks według tabeli wspólnych plików. |
| **G10 — Bramki i dowody wydania 143/49** (REL, SEC-REVIEW, zależności, CI) | `.github/workflows/deploy.yml`, `vite.config.ts`, `package-lock.json`, `functions/package.json`, `functions/package-lock.json`; `scripts/release-artifact-fingerprints.mjs`, `scripts/release-candidate-manifest-helpers.mjs`, `scripts/release-candidate-manifest.mjs`, `src/test/release-artifact-fingerprints.test.ts`, `src/test/release-brand-contract.test.ts`, `src/test/release-candidate-manifest.test.ts`. Wersje: `android/app/build.gradle`, `ios/App/App.xcodeproj/project.pbxproj`, `release/release-train.json`, `release/history/release-train-before-launch-audit.json`, `release/ios/testflight-143-pl.txt`, `release/android/internal-2026-09-07/README.md`. Stabilne daty/ścieżki dowodów/oczekiwane blokady sieci: `e2e/reschedule-flow.spec.ts`, `src/test/plan-tab-order.test.tsx`, `e2e/label-overflow-audit.spec.ts`, `e2e/progress-visual-audit.spec.ts`, `e2e/release-audit.spec.ts` i screenshot helper hunks. Dokumenty: `START.md`, `DECYZJE.md`, `docs/GOOGLE-PLAY-SETUP.md`, `docs/LAUNCH-RUNBOOK.md`, `docs/LAUNCH-AUDIT-2026-09-06.md`, `docs/LAUNCH-DEVICE-QA-2026-09-06.md`, `audit/latest.json`, `audit/audit-2026-09-07T08-55-48Z.json`, `audit/launch-2026-09-06/**`, `audit/release-2026-09-07/**` — jawnie wybrane raporty/receipts/dowody, nie katalogi cache. |

Uzupełnienie testów G3: `src/test/health-platform-contract.test.ts`,
`src/test/native-health-release.test.ts`, `src/test/consents-api.test.ts`,
`src/test/consent-owner-boundary.test.ts`, `src/test/onboarding-consent-confirmation.test.tsx`,
`src/test/protected-callable.test.ts`, `src/test/user-provider-bootstrap.test.tsx`,
`src/test/workout-save-original-grant.test.ts`, `e2e/emulator/consent-owner.spec.ts`.
Mock `mergeConfirmedConsentMirror` należy do G3 w istniejących plikach
`src/test/onboarding-accent.test.tsx`, `src/test/onboarding-answers-save.test.tsx`,
`src/test/onboarding-marketing-step.test.tsx`, `src/test/onboarding-measure-prompt-sequence.test.tsx`,
`src/test/onboarding-skip-preview.test.tsx`, `src/test/plan-preview-choose-other.test.tsx`.
Oczekiwania zmienionej copy w tych samych plikach należą do G7.

## Wspólne pliki — dokładny podział fragmentów

| Plik | Fragment i grupa |
|---|---|
| `src/pages/WorkoutDay.tsx` | **G9**: blok autostartu przy ok. 1441–1460 (`offerAdhocPreStart` → `offerPreStart`, `isWatchStart`, przekazanie `{ offerWarmup }`, usunięcie otwarcia po dowolnym return); sygnatura `handleStartWorkout` przy 1656; otwarcie wyłącznie po durable save i `!adoptableDraft` przy 1819; komentarz sheet przy 3214. **G3**: tylko argument `healthConsent` → `activeHealthGrant` przy 2423. **G4**: tylko pełne `skippedExercises` przy 2557. Numery są bieżące; wybierać po kotwicach, bo wcześniejsze hunki przesuwają linie. |
| `src/hooks/useAuth.ts` | **G2**: `void logInPurchases(cachedFirebaseUser.uid)`. **G3**: import `setHealthAccountOwner` i oba wywołania cached/auth-listener. Te linie współdzielą jeden mały hunk — podzielić ręcznie. Warmup nie potrzebuje zmian tego pliku. |
| `src/hooks/useFirebaseWorkouts.ts` | **G3**: backfill `update.exercises` przez v2 adapter oraz czwarty argument captured grant w `batchSaveWorkout`. **G5**: import `auth`, owner argumenty obu importów JSON, cały `importCsvSessions`, owner-only `deleteImportBatch`; analogicznie backfill sekcja testu `workout-import-restore.test.ts` do G3, importy/fixtures restore do G5. |
| `src/pages/Onboarding.tsx` | **G3**: destructure `mergeConfirmedConsentMirror` i handler `recordConsents` → merge mirror. **G6**: save ref, preview persistence, retry/back locks. **G7**: usunięcie prop `socialProof`. |
| `src/components/PlanWizard.tsx` | **G6**: restored reviewed days, legal gate dla lokalnego draftu, blokowanie save/back, zachowanie wyboru. **G7**: usunięcie `socialProof` z interfejsu/destructure/render oraz usunięte zdania baseline/protocol. Destructure wymaga ręcznego splitu. |
| `src/i18n/locales/pl.ts`, `src/i18n/locales/en.ts` | **G5**: `import.healthConsentRequired`, `import.accountChanged`; **G6**: `ob.errExistingPlanRecovery`; **G8**: `rest.exactAlarm.needed/unavailable/openSettings`; **G7**: pozostałe zmienione klucze (login, onboarding, measurements, devices, rest/warmup copy). G9 nie wymaga żadnej nowej wartości locale. Zawsze stage PL i EN razem. |
| `firestore.rules` i `scripts/test-firestore-rules.mjs` | **G1**: `deletionPending` dla self access/profile i testy zamykanego konta. **G3**: tylko pusty bootstrap exercises, brak raw update exercises, idempotent delete base/sidecar, odpowiednie testy (w tym import fixture seed po odmowie direct write). Zależność wdrożenia: nowy klient G5 musi być dostępny przed włączeniem restrykcyjnych Rules na produkcji. |
| `functions/src/security.ts` | Cały bieżący diff to **G1/B3**: `deletionPending` w AccessProfile i odmowa `hasCallableAppAccess`. Nie dodawać go do commita zakupów tylko dlatego, że oba obszary używają tej funkcji. |
| `functions/src/index.ts`, `functions/src/consents.ts`, `functions/src/revenuecat.ts`, `functions/src/registration.ts` | **G1/B13**: tylko modułowe importy i referencje `FieldValue`/`Timestamp`; reszta odpowiednio Strava/consent **G3**, billing **G2**, usuwanie **G1**. Nie stage całego `functions/src/` do jednego commita. |
| `android/app/src/main/AndroidManifest.xml` | **G3**: HC package query i rationale activity/alias. **G8**: wyłącznie `SCHEDULE_EXACT_ALARM`. Build numbers są oddzielnie w G10. |
| `e2e/helpers.ts` | **G9**: obowiązkowy `skipPreStartWarmup` i poprawione komentarze warunkowego helpera. **G10**: `auditScreenshotPath` oraz jego importy. |
| `e2e/full-app.spec.ts` | **G9**: skip helper import i cztery wywołania po fresh autostart. **G5**: LEGAL_VERSIONS i aktywna zgoda health tylko dla testu importu RPE. |
| `e2e/mobile-keyboard-dialogs.spec.ts` | **G9**: skip helper import i jedno pominięcie fresh prompt. **G10**: screenshot helper import/ścieżki. |

## Najmniejszy review rozgrzewki

G9 można zatwierdzić oddzielnie: wskazane warmup-only hunki WorkoutDay, cały
diff trzech warmup/autostart helpers oraz PreferenceSync, ich regresje i jawna
obsługa nowego promptu w E2E. Bez zmian snapshot/Health/skip danych, bez locale,
wersji buildów i Rules. Dwa usunięte wiersze generatora (WU-01) można wydzielić
jeszcze drobniej; przy zachowaniu limitu dziesięciu grup pozostają w G9, z osobnym
opisem i dowodem RED→GREEN. Fragmenty tej grupy nie wymagają zmian treningów usera.

## Granica stagingu i kolejność

G1 wprowadza wspólne poprawki runtime i fixture emulatora; G2/G3 opierają na nich
swoje testy. G4/G5 domykają zapis/restore przed rolloutem Rules G3. G6/G7 i G8/G9
mają opisane wspólne pliki, więc kolejne indeksowanie musi zachować już wybrane
hunki. G10 zawiera finalne metadane i receipts dopiero dla ostatecznego stanu
źródeł; commitowanie kolejnych grup nie oznacza częściowego deployu usług.

Poza zakresem audytu pozostają zastane nieśledzone `animacje-cwiczen/**` (497
plików), `docs/design-2026-08-20/**` (235), `.agents/skills/product-audit/SKILL.md`
oraz generowany `.firebase/hosting.aG9zdGluZy1hdXRo.cache`. Plan uwzględnia je
przez jawne wyłączenie; nie wolno wciągnąć ich przez `git add .`. Logi ignorowane
przez Git pozostają lokalnymi dowodami, chyba że root wybierze konkretny plik.
Usunięta historyczna wartość credential w LAUNCH-RUNBOOK nie może trafić do
opisu commita/raportu; zapisać wyłącznie opis usunięcia i stan rotacji osobno.
