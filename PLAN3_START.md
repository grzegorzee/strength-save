# PLAN 3 START - Strength Save

> Punkt startowy po wdrożeniu Plan 1 i Plan 2

---

## Status

- Wersja aplikacji: `v6.8.0`
- Data: `2026-04-03`
- Produkcja:
  - GitHub Pages: `https://grzegorzee.github.io/strength-save/`
  - Firebase project: `fittracker-workouts`
- Jakość po wdrożeniu:
  - `npm run lint` OK
  - `npx vitest run` OK (`182/182`)
  - `npx playwright test --reporter=line` OK (`75/75`)
  - `npm run build` OK

---

## Co zostało zrobione w Planie 1

### 1. Stabilność harmonogramu i dat

- Usunięte twarde założenia `Pn/Śr/Pt` z kluczowych ekranów.
- Wspólny silnik harmonogramu planu jest w [src/lib/plan-schedule.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/plan-schedule.ts).
- Dashboard, Day Plan, Training Plan i Analytics liczą dni planu spójnie.
- Logika dat została ujednolicona wokół lokalnych helperów zamiast `toISOString().split('T')[0]`.

### 2. Cykle i poprawność danych

- Nowe treningi dostają `cycleId` przy starcie sesji.
- Statystyki cyklu czytają:
  - najpierw po `cycleId`
  - fallbackiem po zakresie dat dla starszych danych
- Wspólna logika statystyk cyklu siedzi w [src/lib/cycle-insights.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/cycle-insights.ts).
- Hook cykli jest uproszczony i oparty o wspólny moduł w [src/hooks/usePlanCycles.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/hooks/usePlanCycles.ts).

### 3. Bezpieczeństwo zapisu treningu

- Aktywny draft treningu działa `local-first` i jest oparty o `IndexedDB`.
- UI nie pokazuje już fałszywego stanu „zapisano lokalnie”, jeśli trwały zapis draftu się nie uda.
- Pojawił się wyraźny model:
  - `local saved`
  - `sync pending`
  - `final sync pending`
  - `local-only provisional session`
- Główne pliki:
  - [src/pages/WorkoutDay.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/pages/WorkoutDay.tsx)
  - [src/lib/workout-draft-db.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/workout-draft-db.ts)
  - [src/lib/workout-draft.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/workout-draft.ts)

### 4. PWA update safety

- Update PWA nie przerywa aktywnego treningu.
- Guard aktualizacji jest w [src/lib/pwa-update-guard.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/pwa-update-guard.ts).
- Prompt aktualizacji respektuje stan aktywnego treningu w [src/components/PWAUpdatePrompt.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/components/PWAUpdatePrompt.tsx).

### 5. Access control i admin

- Dostęp nie jest już oparty tylko o klienta.
- Backend/rules respektują `access.enabled`.
- Admin dostał read-only podgląd użytkownika i kontrolę dostępu.
- Kluczowe miejsca:
  - [src/contexts/UserContext.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/contexts/UserContext.tsx)
  - [src/hooks/useAuth.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/hooks/useAuth.ts)
  - [firestore.rules](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/firestore.rules)
  - [functions/src/index.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/functions/src/index.ts)

### 6. CI i realny gate jakości

- Deploy workflow wymusza jakość przed publikacją.
- Playwright przestał być tylko smoke suite.
- Krytyczne flow mają twarde asercje w:
  - [e2e/critical.spec.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/e2e/critical.spec.ts)
  - [e2e/batch-save.spec.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/e2e/batch-save.spec.ts)
  - [e2e/full-app.spec.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/e2e/full-app.spec.ts)

---

## Co zostało zrobione w Planie 2

### 1. Prawdziwy offline-first start treningu

- Trening można zacząć bez internetu.
- Pojawił się model `provisional session`, który żyje lokalnie i dopiero później promuje się do Firestore.
- Session helpers:
  - [src/lib/workout-session.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/workout-session.ts)
- Start/promocja/sync:
  - [src/pages/WorkoutDay.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/pages/WorkoutDay.tsx)
  - [src/hooks/useFirebaseWorkouts.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/hooks/useFirebaseWorkouts.ts)

### 2. Sync Center

- Jest globalny podgląd aktywnego draftu i kolejki sesji czekających na sync.
- Są akcje:
  - `Synchronizuj teraz`
  - `Retry all`
  - `Usuń szkic`
  - `Otwórz trening`
- Kluczowe pliki:
  - [src/components/SyncCenterCard.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/components/SyncCenterCard.tsx)
  - [src/lib/workout-sync-queue.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/workout-sync-queue.ts)
  - [src/hooks/useOnlineStatus.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/hooks/useOnlineStatus.ts)

### 3. Cykle jako realny feature

- Zakładka `Cykle` ma już closeout/progres, rekomendacje i porównanie do poprzedniego cyklu.
- Dashboard dostał warstwę „co dalej z planem?” opartą o cykl i stan planu.
- Kluczowe pliki:
  - [src/pages/Cycles.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/pages/Cycles.tsx)
  - [src/components/CycleDetail.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/components/CycleDetail.tsx)
  - [src/lib/cycle-insights.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/cycle-insights.ts)
  - [src/lib/plan-next-step.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/plan-next-step.ts)

### 4. Historia treningów

- Doszedł osobny ekran historii:
  - filtrowanie
  - wyszukiwanie
  - statusy
  - porównanie 2 sesji
- Główna implementacja: [src/pages/WorkoutHistory.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/pages/WorkoutHistory.tsx)

### 5. Self-service export/import dla usera

- Backup i restore są dostępne zwykłemu użytkownikowi w ustawieniach.
- UI:
  - [src/components/DataManagement.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/components/DataManagement.tsx)
  - [src/pages/Settings.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/pages/Settings.tsx)
- Dane dalej obsługuje [src/hooks/useFirebaseWorkouts.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/hooks/useFirebaseWorkouts.ts).

### 6. Onboarding-to-plan loop

- Dashboard nie pokazuje już tylko prostego bannera końca planu.
- Jest karta rekomendująca kolejny krok:
  - kontynuacja
  - closeout
  - przygotowanie nowego planu
  - wejście do cykli lub historii

### 7. Telemetria jakości produktu

- Klient zbiera operacyjne eventy jakościowe:
  - local save failures
  - recovery
  - retry sync
  - provisional start/promotion
  - sync success/failure
- Flush telemetrii:
  - [src/lib/app-telemetry.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/app-telemetry.ts)
  - [src/components/TelemetryHeartbeat.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/components/TelemetryHeartbeat.tsx)
- Admin ma skrót health summary w [src/pages/admin/AdminDashboard.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/pages/admin/AdminDashboard.tsx).

---

## Jak wygląda architektura po Planie 1 i Planie 2

### Frontend

#### Routing i shell

- Główny routing: [src/App.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/App.tsx)
- Layout + sidebar: [src/components/Layout.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/components/Layout.tsx), [src/components/AppNavigation.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/components/AppNavigation.tsx)
- Error/update handling:
  - [src/components/ErrorBoundary.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/components/ErrorBoundary.tsx)
  - [src/lib/lazy-with-retry.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/lazy-with-retry.ts)
  - [src/components/PWAUpdatePrompt.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/components/PWAUpdatePrompt.tsx)

#### Auth i access

- Auth i profil usera: [src/contexts/UserContext.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/contexts/UserContext.tsx)
- Login/logout: [src/hooks/useAuth.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/hooks/useAuth.ts)
- Admin-only routes: [src/components/AdminRoute.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/components/AdminRoute.tsx)

#### Trening i synchronizacja

- `WorkoutDay` jest centrum logiki sesji:
  - aktywny trening
  - recovery
  - sync
  - offline provisional session
  - finish flow
- Lokalny storage:
  - `IndexedDB draft`: [src/lib/workout-draft-db.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/workout-draft-db.ts)
  - `legacy/fallback`: [src/lib/workout-draft.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/workout-draft.ts)
  - `sync queue`: [src/lib/workout-sync-queue.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/workout-sync-queue.ts)
  - `session model`: [src/lib/workout-session.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/workout-session.ts)
- Warstwa Firebase CRUD: [src/hooks/useFirebaseWorkouts.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/hooks/useFirebaseWorkouts.ts)

#### Plan i cykle

- Plan treningowy:
  - [src/hooks/useTrainingPlan.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/hooks/useTrainingPlan.ts)
  - [src/lib/plan-schedule.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/plan-schedule.ts)
- Cykle:
  - [src/hooks/usePlanCycles.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/hooks/usePlanCycles.ts)
  - [src/lib/cycle-insights.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/cycle-insights.ts)
  - [src/lib/plan-next-step.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/plan-next-step.ts)

#### Analytics i historia

- Główna analityka: [src/pages/Analytics.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/pages/Analytics.tsx)
- Historia treningów: [src/pages/WorkoutHistory.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/pages/WorkoutHistory.tsx)
- Wspólne metryki są nadal częściowo rozproszone między:
  - [src/lib/summary-utils.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/summary-utils.ts)
  - [src/lib/pr-utils.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/pr-utils.ts)
  - [src/lib/exercise-utils.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/exercise-utils.ts)
  - [src/lib/training-load.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/training-load.ts)

### Backend / Firebase

#### Firestore

- Główne kolekcje:
  - `users`
  - `workouts`
  - `measurements`
  - `training_plans`
  - `plan_cycles`
  - `strava_activities`
  - `api_keys`
  - `api_audit_logs`
  - `app_telemetry_daily`
  - `ai_usage`

#### Functions

- Nadal istnieje główny agregat w [functions/src/index.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/functions/src/index.ts)
- Wydzielone helpery domenowe:
  - [functions/src/admin-api.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/functions/src/admin-api.ts)
  - [functions/src/ai-usage.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/functions/src/ai-usage.ts)
  - [functions/src/weekly-digest.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/functions/src/weekly-digest.ts)

#### Access i reguły

- Firestore rules po Planie 1 są znacznie bardziej restrykcyjne.
- Pola administracyjne i access control nie są już traktowane jako czysto klientowe.

---

## Co jeszcze zostało otwarte przed Planem 3

To nie są blokery produkcji, ale to są główne cele następnego etapu:

- `WorkoutDay.tsx` nadal jest za duży i wieloodpowiedzialny.
- `functions/src/index.ts` nadal agreguje za dużo domen w jednym pliku.
- Metryki treningowe są rozproszone po kilku modułach.
- Silnik planu jest już wspólny, ale można jeszcze bardziej uprościć przepływ dashboard/plan/day/analytics.
- Telemetria jest głównie klientowa; backendowy health layer jest jeszcze cienki.

---

## Plan 3 - rekomendowany zakres

### 1. Jeden moduł metryk

Cel:
- jeden zestaw reguł dla:
  - tonażu
  - PR
  - bodyweight handling
  - warmup handling
  - completion rules

Proponowany target:
- `src/lib/workout-metrics.ts`
- albo paczka 2 plików:
  - `workout-metrics.ts`
  - `workout-completion.ts`

### 2. Rozbicie WorkoutDay

Cel:
- oddzielić stan sesji, lokalny draft/sync i completion flow

Proponowany target:
- `src/hooks/useWorkoutSessionState.ts`
- `src/hooks/useWorkoutDraftSync.ts`
- `src/hooks/useWorkoutCompletionFlow.ts`

### 3. Rozbicie backendu per domena

Cel:
- zmniejszyć ryzyko regresji przy kolejnych zmianach

Proponowany target:
- `functions/src/strava.ts`
- `functions/src/openai.ts`
- `functions/src/export-api.ts`
- `functions/src/scheduled-jobs.ts`
- `functions/src/index.ts` jako cienki entrypoint

### 4. Urealnienie testów pod refactor

Cel:
- mniej testów smoke-only, więcej testów logicznych pod nowe moduły

Priorytet:
- metryki
- cykle
- sync
- workout completion

---

## Proponowana kolejność wejścia w Plan 3

1. Wydzielić wspólny moduł metryk bez zmiany zachowania.
2. Oprzeć Analytics, Cykle i Dashboard na tych samych metrykach.
3. Rozdzielić `WorkoutDay` na hooki domenowe.
4. Rozbić `functions/src/index.ts`.
5. Domknąć testy refactor-safe dla nowych modułów.

---

## Szybki kontekst dla następnej sesji

Jeśli następna sesja ma zacząć od razu od Plan 3, najważniejsze pliki do otwarcia na start to:

- [src/pages/WorkoutDay.tsx](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/pages/WorkoutDay.tsx)
- [src/lib/summary-utils.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/summary-utils.ts)
- [src/lib/pr-utils.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/pr-utils.ts)
- [src/lib/exercise-utils.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/exercise-utils.ts)
- [src/lib/cycle-insights.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/src/lib/cycle-insights.ts)
- [functions/src/index.ts](/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save/functions/src/index.ts)

To jest dobry zestaw wejściowy do pierwszego refactoru bez zgadywania, co jest jeszcze aktywne w produkcji.
