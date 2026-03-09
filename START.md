# Strength Save (FitTracker)

> Quick reference - wszystko w jednym miejscu

---

## PODSTAWOWE INFO

| Pole | Wartość |
|------|---------|
| **Nazwa** | Strength Save / FitTracker |
| **Cel** | Multi-user aplikacja PWA do śledzenia treningów siłowych |
| **Status** | AKTYWNY (v5.2.0) |
| **Data utworzenia** | Styczeń 2026 |
| **Data aktualizacji** | 2026-03-09 |
| **Użytkownicy** | g.jasionowicz@gmail.com (admin), + whitelist |

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
| src/hooks/useAICoach.ts | AI Coach (insights, cache 24h) |
| src/hooks/useAIChat.ts | Chat z AI trenerem (Firestore conversations) |
| src/hooks/useAISwap.ts | Zamiana ćwiczeń przez AI (3 alternatywy) |
| src/hooks/useOnlineStatus.ts | Detekcja online/offline + pending ops |
| src/hooks/useAuth.ts | Autentykacja Google OAuth + whitelist |
| src/hooks/use-mobile.tsx | Detekcja urządzenia mobilnego |

### Kod źródłowy - Strony
| Plik | Opis |
|------|------|
| src/pages/Dashboard.tsx | Strona główna, stats, plan tygodnia, Strava, AI insights |
| src/pages/WorkoutDay.tsx | Aktywny trening / widok ukończonego / edycja |
| src/pages/TrainingPlan.tsx | Kalendarz + plan tygodniowy + Strava |
| src/pages/Analytics.tsx | Analityka: podsumowanie, wykresy, pomiary, rekordy |
| src/pages/Onboarding.tsx | Wizard 5 kroków → AI generuje plan → review + swap |
| src/pages/NewPlan.tsx | Generowanie nowego planu po wygaśnięciu |
| src/pages/AIChat.tsx | Chat z AI coachem + "Podsumuj tydzień" z Strava |
| src/pages/DayPlan.tsx | Plan na dzisiaj (co dziś?) |
| src/pages/Settings.tsx | Ustawienia konta, Strava connect/sync |
| src/pages/Achievements.tsx | Osiągnięcia i rekordy osobiste |
| src/pages/PlanEditor.tsx | Edytor planu treningowego |

### Kod źródłowy - Dane i logika
| Plik | Opis |
|------|------|
| src/data/trainingPlan.ts | Domyślny plan + typy + getTrainingSchedule() |
| src/data/exerciseLibrary.ts | Biblioteka 84 ćwiczeń z kategoriami |
| src/lib/ai-onboarding.ts | Generowanie planu AI (OpenAI) |
| src/lib/ai-coach.ts | AI Coach: analiza treningów, callOpenAI() (gpt-5-mini) |
| src/lib/ai-chat.ts | sendChatMessage() — chat z kontekstem treningowym |
| src/lib/offline-queue.ts | Kolejka operacji offline (localStorage) |
| src/lib/pr-utils.ts | Detekcja rekordów osobistych |
| src/lib/summary-utils.ts | Streak, bounds tygodnia |
| src/lib/exercise-utils.ts | parseSetCount, createEmptySets, sanitizeSets |
| src/types/index.ts | Centralne typy (SetData, WorkoutSession, etc.) |
| src/types/strava.ts | Typy StravaActivity, StravaConnection |

### Firebase Cloud Functions
| Plik | Opis |
|------|------|
| functions/src/index.ts | stravaAuthUrl, stravaCallback, stravaSync |

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
| Vitest | 3.x | Testy jednostkowe |
| gh-pages | 6.x | Deploy na GitHub Pages |

---

## STRUKTURA DANYCH FIREBASE

```
fittracker-workouts (project)
│
├── users/                       # Profile użytkowników
│   └── {uid}/
│       ├── email, displayName, role, lastLogin
│       ├── onboardingCompleted: boolean
│       ├── stravaConnected, stravaTokens, stravaAthleteId
│       └── stravaLastSync
│
├── workouts/                    # Sesje treningowe (per-user)
│   └── workout-{timestamp}/
│       ├── id, userId, dayId, date, completed
│       └── exercises: [{ exerciseId, sets[], notes? }]
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
└── strava_activities/           # Aktywności Strava (per-user)
    └── {auto-id}/
        ├── userId, stravaId, name, type, date
        ├── distance?, movingTime?, averageSpeed?
        └── stravaUrl, syncedAt
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
├── /                    → Dashboard (stats, plan tygodnia, AI insights, Strava)
├── /day                 → DayPlan (co dziś?)
├── /plan                → TrainingPlan (kalendarz + Strava)
├── /workout/:dayId      → WorkoutDay (?date=YYYY-MM-DD)
├── /achievements        → Achievements (rekordy, badge)
├── /plan/edit           → PlanEditor (edycja planu)
├── /analytics           → Analytics (4 taby: summary, charts, measurements, records)
├── /ai                  → AIChat (chat + quick actions + Strava summary)
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

## KLUCZOWE FUNKCJONALNOŚCI (v5.1.0)

### Core
- Plan treningowy 2-5 dni/tydzień (dynamiczne weekdays)
- AI generowanie planu na podstawie onboarding quiz (OpenAI)
- Review planu z możliwością zamiany ćwiczeń (ExerciseSwapDialog)
- Czas trwania planu (8-16 tygodni) z auto-expiration
- Banner "Plan się skończył" → generowanie nowego planu
- Serie rozgrzewkowe (warmup), notatki, instrukcje, superserie
- Timer odpoczynku z circular progress

### AI
- AI Coach: analiza treningów, insights na Dashboard (cache 24h)
- AI Chat: rozmowa z trenerem AI
- AI Quick Action: "Podsumuj tydzień" (treningi + Strava)
- AI generowanie planów treningowych (onboarding + new plan)

### Strava
- OAuth flow przez Firebase Cloud Functions
- Sync aktywności (365 dni lookback przy pierwszym sync)
- Aktywności Strava w planie tygodnia (Dashboard)
- Aktywności Strava w kalendarzu (TrainingPlan)
- Aktywności Strava w podsumowaniu (Analytics)
- Aktywności Strava w AI podsumowaniu tygodnia

### Analytics
- 4 taby: Podsumowanie, Wykresy, Pomiary, Rekordy
- Klikalne ukończone treningi → przejście do WorkoutDay
- Wykresy progresji ciężarów (recharts)
- Wykresy pomiarów ciała (multi-line)
- Rekordy osobiste (PR detection)

### Multi-User
- Multi-email whitelist (VITE_ALLOWED_EMAILS)
- Per-user training plans, workouts, measurements
- Admin panel: zarządzanie użytkownikami i planami
- Izolacja danych (Firestore security rules)

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
VITE_ALLOWED_EMAILS=email1@gmail.com,email2@gmail.com
VITE_OPENAI_API_KEY=sk-proj-...

# functions/.env (Cloud Functions)
STRAVA_CLIENT_ID=209317
STRAVA_CLIENT_SECRET=...
STRAVA_REDIRECT_URI=https://grzegorzee.github.io/strength-save/strava-callback.html
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
| **Centralna funkcja** | `callOpenAI()` w `src/lib/ai-coach.ts` |

**Funkcje AI:**
1. **Plan generation** (`ai-onboarding.ts`) — generowanie planu treningowego z onboardingu
2. **AI Coach** (`ai-coach.ts`) — analiza treningów, plateau detection, insights
3. **AI Chat** (`ai-chat.ts`) — rozmowa z trenerem z kontekstem treningowym
4. **Exercise swap** (`ai-coach.ts` → `getSwapSuggestions`) — 3 alternatywy dla ćwiczenia
5. **Workout summary** (`ai-coach.ts` → `generateWorkoutSummary`) — podsumowanie treningu

---

## NOTATKI

- Whitelist auth: multi-email (`VITE_ALLOWED_EMAILS` comma-separated)
- HashRouter zamiast BrowserRouter (GitHub Pages)
- Firebase nie akceptuje `undefined` - dane muszą być sanityzowane
- Debounce 500ms przy auto-save w aktywnym treningu
- OpenAI API key w `VITE_OPENAI_API_KEY` (client-side!)
- Strava client credentials w Firebase Cloud Functions (`functions/.env`)
- Plan expiration: `currentWeek > planDurationWeeks` → banner + /new-plan
- Onboarding: nowi użytkownicy → wizard → AI plan → review → Dashboard
- Istniejący użytkownicy: auto-detect (mają workouty) → skip onboarding
- `chat_conversations` — legacy collection bez per-user isolation (do naprawy)
- 🔴 **DEPLOY:** `git push` ≠ deploy! Po KAŻDEJ zmianie kodu → `npm run deploy` (gh-pages branch)
