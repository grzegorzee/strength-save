# PLAN PROJEKTU - Strength Save

> Cel, kamienie milowe, zadania

---

## CEL GŁÓWNY

Multi-user aplikacja PWA do śledzenia treningów siłowych z AI-generated planami, integracją Strava, panelem admina i analityką. Plany treningowe 2-5x w tygodniu z dynamicznym czasem trwania (8-16 tygodni).

---

## KAMIENIE MILOWE

- [x] **M1:** MVP - podstawowe śledzenie treningów ✅
- [x] **M2:** Firebase integration (Firestore + Auth) ✅
- [x] **M3:** Pomiary ciała ✅
- [x] **M4:** v3.0.0 - Warmup, notatki, edycja, nawigacja historyczna ✅
- [x] **M5:** v3.1.0 - Quick wins, stabilność, jakość, wykresy ✅
- [x] **M6:** v4.0.0 - Multi-user + Admin Panel + Strava Integration ✅
- [x] **M7:** v5.0.0 - AI Onboarding + Exercise Library + AI Coach ✅
- [x] **M8:** v5.1.0 - Plan Management + Strava Views + Bug Fixes ✅
- [ ] **M9:** PWA offline mode (service worker caching)
- [ ] **M10:** Export do PDF / raporty tygodniowe

---

## FUNKCJONALNOŚCI (v5.1.0)

### Core
- [x] Plan treningowy 2-5x/tydzień (dynamiczne weekdays)
- [x] 5-8 ćwiczeń dziennie + superserie
- [x] Czas trwania planu 8-16 tygodni z expiration
- [x] Seria rozgrzewkowa (warmup) - pomarańczowa
- [x] Notatki do każdego ćwiczenia
- [x] Instrukcje wykonania ćwiczeń (rozwijane) + video URL
- [x] Timer odpoczynku (circular progress, presets, wibracja)

### AI
- [x] AI-powered onboarding (5 kroków → plan → review)
- [x] AI generowanie nowego planu po wygaśnięciu (NewPlan)
- [x] AI Coach: insights na Dashboard (cache 24h)
- [x] AI Chat: rozmowa z trenerem
- [x] AI Quick Action: "Podsumuj tydzień" z Strava
- [x] Exercise library (60+ ćwiczeń z kategoriami)
- [x] ExerciseSwapDialog (zamiana ćwiczenia w review)

### Plan Management
- [x] Banner "Plan się skończył" na Dashboard
- [x] Strona NewPlan (cel, dni, AI generate, review, save)
- [x] Dynamiczny `getTrainingSchedule()` (weeks + days)
- [x] `planDurationWeeks`, `planStartDate`, `currentWeek`, `isPlanExpired`
- [x] Auto-detect istniejących użytkowników (skip onboarding)
- [x] Przywracanie domyślnego planu (fix bug v5.0)

### Strava
- [x] OAuth flow via Cloud Functions
- [x] Sync aktywności (365 dni lookback przy pierwszym sync)
- [x] Aktywności Strava w planie tygodnia (Dashboard)
- [x] Aktywności Strava w kalendarzu (TrainingPlan)
- [x] Aktywności Strava w podsumowaniu (Analytics)
- [x] Aktywności Strava w AI podsumowaniu tygodnia
- [x] StravaActivityCard (ikony, dystans, tempo, tętno)

### Nawigacja i widoki
- [x] Dashboard (greeting, stats, AI insights, plan tygodnia, Strava, PR)
- [x] Plan dnia (co dziś?)
- [x] Plan tygodniowy (kalendarz + Strava)
- [x] Aktywny trening (auto-save 500ms)
- [x] Ukończony trening (podsumowanie)
- [x] Tryb edycji (bez auto-save)
- [x] Nawigacja do przeszłych treningów z `?date=`
- [x] Klikalne ukończone treningi w Analytics

### Analytics
- [x] 4 taby: Podsumowanie, Wykresy, Pomiary, Rekordy
- [x] Progresja ciężarów (wykresy liniowe, filtr per dzień)
- [x] Pomiary ciała (multi-line chart)
- [x] Rekordy osobiste (PR detection)
- [x] Klikalne ukończone treningi → WorkoutDay

### Statystyki
- [x] Ukończone treningi
- [x] Całkowity tonaż (kg × powtórzenia)
- [x] Seria treningowa (streak)
- [x] Aktualna waga
- [x] Suma powtórzeń w podsumowaniu

### Multi-User
- [x] Multi-email whitelist (`VITE_ALLOWED_EMAILS`)
- [x] UserContext + UserProvider (profil, rola, onboarding)
- [x] userId na wszystkich danych
- [x] Per-user plany treningowe z duration
- [x] Firestore composite indexes + security rules

### Admin
- [x] AdminRoute guard
- [x] AdminDashboard (lista użytkowników)
- [x] UserPlanEditor (edycja planu per-user)

### Techniczne
- [x] Firebase Firestore (real-time sync)
- [x] Google OAuth + multi-email whitelist
- [x] GitHub Pages deployment
- [x] Debounce 500ms przy auto-save
- [x] Sanityzacja danych dla Firebase
- [x] Import/Export JSON
- [x] Strict TypeScript
- [x] 25 testów Vitest
- [x] Dark mode
- [x] PWA (vite-plugin-pwa)
- [x] Error Boundary

---

## ZADANIA

### Do zrobienia (backlog)
- [ ] **PWA offline mode** — cache'owanie ostatnich treningów (service worker)
- [ ] **Powiadomienia push** — przypomnienie o treningu
- [ ] **Export do PDF** — raport tygodniowy/miesięczny
- [ ] **Testy hooka useFirebaseWorkouts** — mockowanie Firebase
- [ ] **Walidacja danych z Firebase** — sprawdzanie struktury onSnapshot

### Pomysły na przyszłość
- [ ] Personalizacja planu (dodawanie własnych ćwiczeń poza AI)
- [ ] Strava auto-sync (Cloud Function cron)
- [ ] Social features (porównywanie z innymi)
- [ ] Progressive overload suggestions (AI)
- [ ] Trening cardio tracking (wbudowany, bez Strava)

---

## ZROBIONE (v5.1.0 - 2026-03-08)

**Bug fixes:**
- [x] Auto-detect istniejących użytkowników → skip onboarding
- [x] Przywracanie domyślnego planu (fix nadpisania z v5.0)
- [x] Strava sync 365 dni lookback (zamiast 30 dni)
- [x] Klikalne ukończone treningi w Analytics

**Plan Management:**
- [x] Rozszerzony Weekday type (7 dni zamiast 3)
- [x] Dynamiczny getTrainingSchedule() (weeks + days)
- [x] Plan duration: planDurationWeeks, planStartDate, currentWeek, isPlanExpired
- [x] Banner "Plan się skończył" na Dashboard
- [x] NewPlan.tsx (generowanie nowego planu po wygaśnięciu)

**Onboarding:**
- [x] Review planu po AI generation (lista ćwiczeń + swap)
- [x] ExerciseSwapDialog w onboardingu i NewPlan
- [x] GeneratedPlan interface (days + planDurationWeeks)
- [x] AI decyduje o planDurationWeeks (8-12)

**Strava Views:**
- [x] Aktywności Strava w planie tygodnia (Dashboard)
- [x] Aktywności Strava pod kalendarzem (TrainingPlan)
- [x] Aktywności Strava w podsumowaniu (Analytics)
- [x] AI "Podsumuj tydzień" z Strava data (AIChat)
- [x] Strava sync: logi + 365 dni lookback

**Nowe pliki:**
- [x] `src/pages/NewPlan.tsx`
- [x] `ExerciseReplacement` type w `src/types/index.ts`

---

## ZROBIONE (v5.0.0 - 2026-03-08)

- [x] AI-powered onboarding flow (5 kroków wizard)
- [x] AI generowanie planu treningowego (OpenAI)
- [x] Exercise library (60+ ćwiczeń, 8 kategorii)
- [x] ExerciseSwapDialog
- [x] AI Coach insights na Dashboard
- [x] AI Chat page
- [x] onboardingCompleted flag w user profile

---

## ZROBIONE (v4.0.0 - 2026-03-08)

**Multi-User:**
- [x] Multi-email whitelist (`VITE_ALLOWED_EMAILS`)
- [x] UserContext + UserProvider
- [x] userId w workouts, measurements, training_plans
- [x] useFirebaseWorkouts(userId)
- [x] useTrainingPlan(userId)
- [x] Skrypt migracji (`scripts/migrate-to-multiuser.mjs`)
- [x] Firestore composite indexes + security rules

**Admin Panel:**
- [x] AdminRoute guard
- [x] AdminDashboard (lista użytkowników)
- [x] UserPlanEditor

**Strava Integration:**
- [x] Cloud Functions: stravaAuthUrl, stravaCallback, stravaSync
- [x] OAuth bridge: `public/strava-callback.html`
- [x] useStrava hook
- [x] Settings page (Strava connect/sync/disconnect)
- [x] StravaActivityCard

---

## ZROBIONE (v3.1.0 - 2026-02-23)

- [x] Firebase config do `.env`
- [x] Strict TypeScript (`strict: true`)
- [x] 25 testów Vitest
- [x] React.memo na ExerciseCard
- [x] Debounce 500ms
- [x] Error Boundary
- [x] Dark mode (ThemeProvider)
- [x] Timer odpoczynku (RestTimer)
- [x] Wykresy recharts (progresja + pomiary)
- [x] Podpowiedź poprzedniego ciężaru

---

## ZROBIONE (v3.0.0 - 2026-01-28)

- [x] Seria rozgrzewkowa (warmup)
- [x] Notatki do ćwiczeń
- [x] Tryb edycji bez auto-save
- [x] Nawigacja historyczna z `?date=`
- [x] Suma powtórzeń w podsumowaniu
- [x] DOCUMENTATION.md

---

## NOTATKI

### Kluczowe pliki do modyfikacji

| Zmiana | Plik(i) |
|--------|---------|
| Nowe ćwiczenie do biblioteki | `src/data/exerciseLibrary.ts` |
| Zmiana domyślnego planu | `src/data/trainingPlan.ts` |
| UI treningu | `src/pages/WorkoutDay.tsx` + `src/components/ExerciseCard.tsx` |
| Nowa strona | `src/pages/` + `src/App.tsx` (routing) |
| Firebase operacje | `src/hooks/useFirebaseWorkouts.ts` |
| Plan treningowy | `src/hooks/useTrainingPlan.ts` |
| AI Coach / generowanie planów | `src/lib/ai-coach.ts` + `src/lib/ai-onboarding.ts` |
| Strava | `src/hooks/useStrava.ts` + `functions/src/index.ts` |
| Nawigacja | `src/components/AppNavigation.tsx` |
| Statystyki | `src/pages/Dashboard.tsx` |
| Analytics | `src/pages/Analytics.tsx` |

### Często spotykane problemy

1. **"Undefined is not valid" przy zapisie Firebase**
   → Sprawdź sanityzację w `useFirebaseWorkouts.ts`

2. **Kliknięcie na trening nie pokazuje danych**
   → Sprawdź czy nawigacja przekazuje `?date=` parametr

3. **Plan pokazuje zły tydzień**
   → Sprawdź `getTrainingSchedule()` w `trainingPlan.ts`

4. **Auto-save "mryga"**
   → Użyj `handleSetsChangeLocal` zamiast `handleSetsChange`

5. **Istniejący user widzi onboarding**
   → Sprawdź `ensureUserDoc()` w `UserContext.tsx` (auto-detect workouts)

6. **Strava sync nie zwraca aktywności**
   → Sprawdź logi w Cloud Functions, lookback (365 dni), token refresh

7. **Plan nie wygasa**
   → Sprawdź `planStartDate` i `planDurationWeeks` w Firebase `training_plans/{userId}`
