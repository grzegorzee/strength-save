# Strength Save (FitTracker)

> Quick reference - wszystko w jednym miejscu

---

## PODSTAWOWE INFO

| Pole | Wartość |
|------|---------|
| **Nazwa** | Strength Save / FitTracker |
| **Cel** | Multi-user aplikacja PWA do śledzenia treningów siłowych |
| **Status** | AKTYWNY (v6.8.0) |
| **Data utworzenia** | Styczeń 2026 |
| **Data aktualizacji** | 2026-04-03 |
| **Użytkownicy** | g.jasionowicz@gmail.com (admin), role: admin + user |

---

## LINKI

- **Live:** https://grzegorzee.github.io/strength-save/
- **Repo:** https://github.com/grzegorzee/strength-save
- **Firebase Console:** https://console.firebase.google.com/project/fittracker-workouts

---

## KLUCZOWE PLIKI

### Dokumentacja
| Plik | Opis |
|------|------|
| START.md | Ten plik - quick reference |
| REQUIREMENTS.md | **Wymagania, env vars, instalacja, deploy, troubleshooting** |
| PLAN.md | Plan, kamienie milowe, zadania |
| DECYZJE.md | Log decyzji projektowych |
| DOCUMENTATION.md | **Pełna dokumentacja techniczna systemu** |

### Kod źródłowy - Core
| Plik | Opis |
|------|------|
| src/App.tsx | Routing, auth wrapper, providerzy |
| src/contexts/UserContext.tsx | UserProvider, profil, onboarding detection |
| src/hooks/useFirebaseWorkouts.ts | Główny hook Firebase (workouts, measurements) |
| src/hooks/useTrainingPlan.ts | Plan treningowy per-user (duration, expiration) |
| src/hooks/useStrava.ts | Integracja Strava (activities, sync) |
| src/hooks/usePlanCycles.ts | Cykle treningowe (archiwizacja planów, historia, CRUD) |
| src/hooks/useAISwap.ts | Zamiana ćwiczeń przez AI (3 alternatywy) |
| src/hooks/useOnlineStatus.ts | Detekcja online/offline + pending ops |
| src/hooks/useAuth.ts | Google sign-in, email/password, reset hasła |
| src/hooks/use-mobile.tsx | Detekcja urządzenia mobilnego |

### Kod źródłowy - Strony
| Plik | Opis |
|------|------|
| src/pages/Dashboard.tsx | Strona główna, **"Rozpocznij trening"**, stats, plan tygodnia, Strava |
| src/pages/WorkoutDay.tsx | Aktywny trening / widok ukończonego / edycja |
| src/pages/TrainingPlan.tsx | Kalendarz + plan tygodniowy + Strava |
| src/pages/Analytics.tsx | Analityka: podsumowanie, **per-exercise progresja**, pomiary, rekordy |
| src/pages/Onboarding.tsx | Wizard 5 kroków → AI generuje plan → review + swap |
| src/pages/NewPlan.tsx | Generowanie nowego planu po wygaśnięciu |
| src/pages/DayPlan.tsx | Plan na dzisiaj (co dziś?) — ukryty z nawigacji, dostępny przez URL |
| src/pages/Settings.tsx | Ustawienia konta, Strava connect/sync |
| src/pages/Achievements.tsx | Osiągnięcia i rekordy osobiste **(z datami PR)** |
| src/pages/Cycles.tsx | **Aktualny plan** + historia cykli treningowych |
| src/pages/PlanEditor.tsx | Edytor planu treningowego |

### Kod źródłowy - Dane i logika
| Plik | Opis |
|------|------|
| src/data/trainingPlan.ts | Domyślny plan + typy + getTrainingSchedule() |
| src/data/exerciseLibrary.ts | Biblioteka 84 ćwiczeń z kategoriami **(+ isBodyweight flag)** |
| src/lib/ai-onboarding.ts | Generowanie planu AI (OpenAI) |
| src/lib/ai-coach.ts | callOpenAI(), getSwapSuggestions(), callOpenAIStream() (gpt-5-mini) |
| src/lib/offline-queue.ts | Kolejka operacji offline (localStorage) |
| src/lib/pr-utils.ts | Detekcja rekordów osobistych, calculate1RM (Epley) |
| src/lib/summary-utils.ts | Streak, bounds tygodnia, tonnage |
| src/lib/exercise-utils.ts | parseRepRange, Smart Rest Timer, lookupExerciseType, **createPrefilledSets**, **isBodyweightExercise** |
| src/lib/exercise-progression.ts | Historia ćwiczeń, plateau detection, progression summary |
| src/lib/heatmap-utils.ts | GitHub-style heatmap data (workouts + Strava) |
| src/lib/race-predictor.ts | Predykcje wyścigowe (Riegel formula) |
| src/lib/training-load.ts | TRIMP, CTL/ATL/TSB (Fitness/Fatigue/Form) |
| src/lib/share-utils.ts | Generowanie obrazu treningu (html2canvas-pro) |
| src/lib/workout-draft-db.ts | **Active workout draft: IndexedDB source of truth + localStorage migration/fallback** |
| src/lib/workout-draft.ts | Legacy draft migration + awaryjny fallback localStorage |
| src/lib/registration-api.ts | Callable API: rejestracja, invite, waitlista, auth audit |
| src/lib/pending-invite.ts | Local pending invite code przed logowaniem / rejestracją |
| src/lib/utils.ts | cn(), **formatLocalDate()** — shared utilities |
| src/lib/chart-config.ts | Konfiguracja wykresów (tooltip style, kolory) |
| src/lib/strava-utils.ts | Formatowanie Strava (pace, distance, seasons, HR zones) |
| src/types/index.ts | Centralne typy (SetData, WorkoutSession, etc.) |
| src/types/strava.ts | Typy StravaActivity, StravaConnection, HRZoneConfig |
| src/types/cycles.ts | Typy PlanCycle, PlanCycleStats |

### Kod źródłowy - Nowe komponenty (v6.x)
| Plik | Opis |
|------|------|
| src/components/ExerciseProgressionDialog.tsx | Wykres progresji ćwiczenia (est. 1RM + max weight) |
| src/components/WarmupRoutineDialog.tsx | Checklist rozgrzewki + stretching z timerem |
| src/components/ShareWorkoutDialog.tsx | Udostępnianie/pobieranie obrazu treningu |
| src/components/TrainingHeatmap.tsx | GitHub-style heatmap aktywności (rok) |
| src/components/strava/RacePredictor.tsx | Predykcje 5K/10K/Półmaraton/Maraton |
| src/components/CycleCard.tsx | Karta cyklu treningowego (lista) |
| src/components/CycleDetail.tsx | Szczegóły cyklu (PRy, plan, statystyki) |
| src/components/EmailVerificationGate.tsx | Ekran wpisania kodu mailowego po rejestracji email |
| src/components/strava/TrainingLoadChart.tsx | Wykres Fitness/Fatigue/Form (CTL/ATL/TSB) |
| src/components/strava/CaloriesChart.tsx | Wykres kalorii |
| src/components/strava/CardioPersonalBests.tsx | Rekordy cardio |
| src/components/strava/ElevationChart.tsx | Wykres przewyższeń |
| src/components/strava/HRZoneDistribution.tsx | Rozkład stref HR |
| src/components/strava/MonthlyActivities.tsx | Aktywności miesięczne |
| src/components/strava/PaceTrendChart.tsx | Trend tempa biegu |
| src/components/strava/SeasonFilter.tsx | Filtr sezonowy |
| src/components/strava/StravaSummaryStats.tsx | Statystyki podsumowujące Strava |
| src/components/strava/WeeklyKmChart.tsx | Tygodniowe kilometry |

### Firebase Cloud Functions
| Plik | Opis |
|------|------|
| functions/src/index.ts | Eksporty Functions: Strava, AI, admin API, registration |
| functions/src/registration.ts | **syncUserProfile, email verification code, invite, waitlist, auth audit, access toggle** |
| functions/src/ai-usage.ts | **AI cost tracking** (checkUsageLimit, recordUsage, $5/user/month) |
| functions/src/weekly-digest.ts | Weekly Digest Email (Resend, per-user, co poniedziałek 08:00) |

---

## TECHNOLOGIE

| Technologia | Wersja | Zastosowanie |
|-------------|--------|--------------|
| React | 18.x | Frontend framework |
| TypeScript | 5.x | Typowanie (strict mode) |
| Vite | 5.x | Bundler + dev server |
| Firebase | 12.x | Firestore, Auth, Cloud Functions |
| Tailwind CSS | 3.x | Styling (utility-first) |
| shadcn/ui | - | Komponenty UI (Radix primitives) |
| React Router | 6.x | Routing (HashRouter) |
| Recharts | 2.x | Wykresy (progresja, pomiary) |
| React Query | 5.x | Query cache |
| OpenAI API | - | AI Coach + generowanie planów |
| Strava API | - | Import aktywności sportowych |
| Lucide React | 0.462 | Ikony |
| date-fns | 3.x | Formatowanie dat |
| Zod | 3.x | Schema validation |
| Sonner | 1.x | Toast notifications |
| vite-plugin-pwa | 1.x | Progressive Web App |
| html2canvas-pro | - | Generowanie obrazów z HTML (Share Workout) |
| Resend | 6.x | Email API (Weekly Digest, verification, invite, access emails) |
| Vitest | 3.x | Testy jednostkowe (167 testów) |
| Playwright | 1.x | Testy E2E (83 testy, VITE_E2E_MODE) |
| gh-pages | 6.x | Deploy na GitHub Pages |

---

## STRUKTURA DANYCH FIREBASE

```
fittracker-workouts (project)
│
├── users/                       # Profile użytkowników
│   └── {uid}/
│       ├── email, displayName, role, lastLogin
│       ├── access.enabled, status, auth.primaryProvider, authProviders[]
│       ├── verification.emailVerifiedAt, registration.source, inviteId, waitlistId
│       ├── onboardingCompleted, onboarding.state, cohorts[]
│       └── stravaConnected, stravaAthleteId, stravaLastSync
│
├── workouts/                    # Sesje treningowe (per-user)
│   └── workout-{timestamp}/
│       ├── id, userId, dayId, date, completed
│       ├── exercises: [{ exerciseId, sets[], notes? }]
│       └── skippedExercises?: string[]
│
├── measurements/                # Pomiary ciała (per-user)
│   └── measurement-{timestamp}/
│       ├── id, userId, date
│       └── weight?, armLeft?, chest?, waist?, ...
│
├── training_plans/              # Plany treningowe (per-user)
│   └── {userId}/
│       ├── days: TrainingDay[]
│       ├── durationWeeks: number (8-16)
│       ├── startDate: string (YYYY-MM-DD)
│       └── updatedAt: string (ISO)
│
├── plan_cycles/                 # Historia cykli treningowych (per-user)
│   └── {auto-id}/
│       ├── userId, status ('active'|'completed')
│       ├── days: TrainingDay[], durationWeeks, startDate, endDate
│       ├── createdAt
│       └── stats: { totalWorkouts, totalTonnage, prs[], completionRate }
│
├── strava_activities/           # Aktywności Strava (per-user)
│   └── {auto-id}/
│       ├── userId, stravaId, name, type, date
│       ├── distance?, movingTime?, averageSpeed?
│       └── stravaUrl, syncedAt
│
├── invites/                    # Invite codes i metadata
│   └── {auto-id}/
│       ├── code, email?, status, expiresAt
│       ├── cohorts[], featureFlags{}
│       └── redeemedAt, redeemedBy, waitlistEntryId
│
├── waitlist_entries/           # Leady / zgłoszenia przed rejestracją
│   └── {auto-id}/
│       ├── email, displayName?, note?, source
│       └── status, convertedUserId, linkedInviteId
│
├── email_verification_codes/   # Hashowane kody mailowe
│   └── {base64(email)}/
│       ├── uid, codeHash, expiresAt
│       └── attempts, status
│
├── auth_audit_logs/            # Audit auth/admin
│   └── {auto-id}/
│       ├── eventType, uid?, email?, actorUid?
│       └── createdAt, metadata{}
│
├── notification_logs/          # Log wysłanych maili
│   └── {auto-id}/
│       ├── type, email, userId?
│       └── responseId, error?, createdAt
│
└── ai_usage/                   # AI cost tracking (per-user per-month)
    └── {userId_YYYY-MM}/
        ├── userId, month
        ├── promptTokens, completionTokens
        ├── estimatedCostUsd, callCount
        └── updatedAt
```

---

## SZYBKI START

### Rozpoczęcie pracy nad projektem

```bash
# 1. Przejdź do folderu projektu
cd "/Users/grzegorzjasionowicz/Documents/Baza Wiedzy/FIRMA/projekty/strength_save"

# 2. Zainstaluj zależności (jeśli potrzeba)
npm install

# 3. Uruchom lokalnie
npm run dev

# 4. Otwórz http://localhost:5173
```

### Deploy na GitHub Pages

🔴 **OBOWIĄZKOWE po każdej zmianie kodu!** Sam `git push` na `main` NIE aktualizuje strony live. ZAWSZE po commitcie musisz też:

```bash
npm run deploy
```

To buduje `dist/` i pushuje na branch `gh-pages` → GitHub Pages serwuje nową wersję.

### Testy

```bash
npm run test        # Jednorazowy run
npm run test:watch  # Watch mode
```

### Build

```bash
npm run build       # Production build
npm run build:dev   # Development build
```

---

## ROUTING

```
HashRouter (GitHub Pages)
│
├── /login               → Login
├── /register            → Register
├── /                    → Dashboard (stats, plan tygodnia, AI insights, Strava)
├── /day                 → DayPlan (co dziś?)
├── /plan                → TrainingPlan (kalendarz + Strava)
├── /workout/:dayId      → WorkoutDay (?date=YYYY-MM-DD)
├── /achievements        → Achievements (rekordy, badge)
├── /cycles              → Cycles (historia cykli treningowych)
├── /plan/edit           → PlanEditor (edycja planu)
├── /analytics           → Analytics (4 taby: summary, charts, measurements, records)
├── /exercises           → ExerciseLibrary (biblioteka ćwiczeń)
├── /settings            → Settings (konto + Strava connect/sync)
├── /new-plan            → NewPlan (generowanie nowego planu po wygaśnięciu)
├── /onboarding          → Onboarding (wizard 5 kroków → AI plan → review)
├── /strava/callback     → StravaCallback (OAuth handler)
├── /admin               → AdminDashboard (lista użytkowników) [admin only]
├── /admin/plans/:userId → UserPlanEditor (edycja planu usera) [admin only]
│
│ Redirecty (stare URL-e):
├── /stats → Analytics
├── /summary → Analytics
├── /progress → Analytics
└── /measurements → Analytics
```

---

## KLUCZOWE FUNKCJONALNOŚCI (v6.8.0)

### Core
- Plan treningowy 2-5 dni/tydzień (dynamiczne weekdays)
- AI generowanie planu na podstawie onboarding quiz (OpenAI)
- Review planu z możliwością zamiany ćwiczeń (ExerciseSwapDialog)
- Czas trwania planu (8-16 tygodni) z auto-expiration
- **Cykle treningowe** — archiwizacja planów, historia z PRami i statystykami, generowanie nowego planu z kontekstem starego
- **Przypomnienie przed końcem planu** — żółty banner gdy <= 2 tygodnie do końca
- Banner "Plan się skończył" → generowanie nowego planu
- Serie rozgrzewkowe (warmup), notatki, instrukcje, superserie
- **Smart Rest Timer** — czas odpoczynku oparty na typie ćwiczenia (compound/isolation) i intensywności (%1RM)
- **Warmup Routine UI** — interaktywny checklist rozgrzewki + stretching z 30s timerem
- **One-Click Start** — auto-start treningu z Dashboard/DayPlan + scroll do pierwszego ćwiczenia
- **Pre-fill z Progresją** — nowy trening startuje z danymi z poprzedniego + sugerowana progresja ciężaru (+2.5kg compound / +1kg isolation)
- **Pomiń Ćwiczenie** — pomiń ćwiczenie na dziś (zostaje w planie na przyszłość)
- **Dodaj/Usuń Serie** — dynamiczne dodawanie i usuwanie serii podczas treningu

### AI
- AI Coach: analiza treningów, insights na Dashboard (cache 24h)
- **AI Chat: streaming SSE** (token-by-token, Firestore per-user, $5/month limit)
- AI Quick Action: "Podsumuj tydzień" (treningi + Strava)
- AI generowanie planów treningowych (onboarding + new plan)
- **AI cost tracking** — $5/user/miesiąc limit, admin panel z widokiem per user

### Strava & Cardio Analytics
- OAuth flow przez Firebase Cloud Functions
- Sync aktywności (365 dni lookback przy pierwszym sync)
- Aktywności Strava w planie tygodnia (Dashboard)
- Aktywności Strava w kalendarzu (TrainingPlan)
- Aktywności Strava w podsumowaniu (Analytics)
- Aktywności Strava w AI podsumowaniu tygodnia
- **Strava Deep Integration** — 9 dedykowanych komponentów (Calories, Elevation, HR Zones, Pace Trend, Monthly Activities, Weekly Km, Season Filter, Summary Stats, Personal Bests)
- **Race Predictor** — predykcje czasów na 5K/10K/Półmaraton/Maraton (Riegel formula)
- **Training Load (TRIMP)** — wykres Fitness/Fatigue/Form (CTL 42d / ATL 7d / TSB)

### Analytics
- 4 taby: Podsumowanie, Wykresy, Pomiary, Rekordy
- Klikalne ukończone treningi → przejście do WorkoutDay
- Wykresy progresji ciężarów (recharts)
- Wykresy pomiarów ciała (multi-line)
- Rekordy osobiste (PR detection)
- **Exercise Timeline** — wykres progresji per ćwiczenie (est. 1RM + max weight) z plateau detection
- **Training Heatmap** — GitHub-style grid aktywności (53×7, kolory emerald, year selector)

### Social & Notifications
- **Share Workout Summary** — generowanie obrazu podsumowania treningu (html2canvas-pro, 540×960 IG story) z opcjonalnym własnym zdjęciem jako tło
- **Weekly Digest Email** — co poniedziałek o 8:00 email z podsumowaniem tygodnia (Resend, per-user, auto-detect z Firebase Auth)

### Auth, Access, Admin
- Osobne strony `/login` i `/register`
- Google sign-in oraz email + hasło + kod mailowy
- Invite flow z przypięciem cohort i metadata po wejściu
- Waitlista dla leadów i ręcznej konwersji na invite
- Access control po stronie backendu (`access.enabled`, `status`)
- Admin panel: użytkownicy, invite, waitlista, audit auth, access toggle, suspend/restore
- Izolacja danych i kolekcji auth przez Firestore rules

---

## JAK ROZPOCZĄĆ KONWERSACJĘ Z CLAUDE

```
Pracuję nad projektem strength_save (FitTracker) - aplikacja do śledzenia treningów.

Przeczytaj:
1. projekty/strength_save/START.md (podstawowe info)
2. projekty/strength_save/DOCUMENTATION.md (pełna dokumentacja techniczna)
3. projekty/strength_save/DECYZJE.md (historia decyzji)

Projekt jest w: /Users/grzegorzjasionowicz/Documents/Baza Wiedzy/FIRMA/projekty/strength_save

[TUTAJ TWOJE ZADANIE]
```

---

## ZMIENNE ŚRODOWISKOWE (skrócone)

```bash
# .env (frontend)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=fittracker-workouts.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fittracker-workouts
VITE_FIREBASE_STORAGE_BUCKET=fittracker-workouts.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_OPENAI_API_KEY=sk-proj-...

# functions/.env (Cloud Functions)
STRAVA_CLIENT_ID=209317
STRAVA_CLIENT_SECRET=...
STRAVA_REDIRECT_URI=https://grzegorzee.github.io/strength-save/strava-callback.html
RESEND_API_KEY=re_...
API_KEY_PEPPER=...
```

**Pełna dokumentacja zmiennych:** → `REQUIREMENTS.md`

---

## CI/CD

**GitHub Actions** (`.github/workflows/deploy.yml`):
- **Trigger:** Push na `main` lub manual dispatch
- **Pipeline:** Checkout → Node 20 → `npm ci` → `npm run build` (z secrets) → Deploy to Pages
- **Secrets:** 9 zmiennych w GitHub Settings → Secrets and variables → Actions

**Ręczny deploy:**
```bash
npm run deploy    # gh-pages -d dist
```

---

## MODEL AI

| Parametr | Wartość |
|----------|---------|
| **Model** | `gpt-5-mini` (OpenAI) |
| **Pricing** | $0.25 / 1M input, $2.00 / 1M output |
| **Context** | 400K tokens |
| **Centralna funkcja** | `callOpenAI()` + `callOpenAIStream()` w `src/lib/ai-coach.ts` |
| **Cost tracking** | `functions/src/ai-usage.ts` — $5/user/miesiąc limit |
| **Streaming** | `streamOpenAI` Cloud Function (SSE, onRequest) |

**Funkcje AI:**
1. **Plan generation** (`ai-onboarding.ts`) — generowanie planu treningowego z onboardingu
2. **AI Coach** (`ai-coach.ts`) — analiza treningów, plateau detection, insights
3. **AI Chat streaming** (`ai-coach.ts` → `callOpenAIStream`) — SSE, token-by-token, Firestore per-user
4. **Exercise swap** (`ai-coach.ts` → `getSwapSuggestions`) — 3 alternatywy dla ćwiczenia
5. **Workout summary** (`ai-coach.ts` → `generateWorkoutSummary`) — podsumowanie treningu

---

## NOTATKI

- Auth: Google + email/password + kod mailowy przez Functions + Resend
- HashRouter zamiast BrowserRouter (GitHub Pages)
- Firebase nie akceptuje `undefined` - dane muszą być sanityzowane
- Debounce 500ms przy auto-save w aktywnym treningu
- OpenAI API key w `VITE_OPENAI_API_KEY` (client-side!)
- Strava client credentials w Firebase Cloud Functions (`functions/.env`)
- Plan expiration: `currentWeek > planDurationWeeks` → banner + /new-plan
- Onboarding: nowi użytkownicy → wizard → AI plan → review → Dashboard
- Istniejący użytkownicy: auto-detect (mają workouty) → skip onboarding
- `chat_conversations` — DEPRECATED (zastąpione przez `chat_messages` per-user w v6.4.0)
- 🔴 **DEPLOY:** `git push` ≠ deploy! Po KAŻDEJ zmianie kodu → `npm run deploy` (gh-pages branch)
