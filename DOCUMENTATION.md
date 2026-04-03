# FitTracker - Dokumentacja Systemu v6.8.0

## Spis treści
1. [Architektura](#architektura)
2. [Struktura plików](#struktura-plików)
3. [Modele danych](#modele-danych)
4. [Routing](#routing)
5. [Komponenty](#komponenty)
6. [Hooki](#hooki)
7. [Przepływ danych](#przepływ-danych)
8. [Firebase](#firebase)
9. [AI Integration](#ai-integration)
10. [AI Chat System](#ai-chat-system)
11. [AI Models](#ai-models)
12. [Exercise Progression](#exercise-progression)
13. [Strava Integration](#strava-integration)
14. [Onboarding i Plan Management](#onboarding-i-plan-management)
15. [Offline Support](#offline-support)
16. [Funkcjonalności](#funkcjonalności)
17. [CI/CD Pipeline](#cicd-pipeline)
18. [Deployment](#deployment)
19. [Known Issues / Gotchas](#known-issues--gotchas)
20. [Changelog](#changelog)

---

## Architektura

```
┌──────────────────────────────────────────────────────────────┐
│                           App.tsx                              │
│  ErrorBoundary → ThemeProvider → QueryClient → TooltipProvider │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              AuthenticatedApp                          │   │
│  │         useAuth() — Google, email/password, reset       │   │
│  └──────────────────┬────────────────────────────────────┘   │
│                      │                                        │
│         ┌────────────┴───────────┐                           │
│         │  isAuthenticated?       │                           │
│         │                        │                           │
│    ┌────┴────┐          ┌────────┴────────┐                  │
│    │  NIE    │          │      TAK        │                  │
│    │ <Login/>│          │  <UserProvider>  │                  │
│    └─────────┘          │    <AppRoutes/>  │                  │
│                         └────────┬────────┘                  │
│                                  │                            │
│                    ┌─────────────┴───────────┐               │
│                    │  isNewUser?              │               │
│                    │                         │               │
│              ┌─────┴─────┐          ┌───────┴───────┐       │
│              │    TAK    │          │      NIE      │       │
│              │<Onboarding>│          │  <HashRouter> │       │
│              └───────────┘          │   <Layout/>   │       │
│                                     │   <Outlet/>   │       │
│                                     └───────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

### Technologie

| Kategoria | Technologia | Wersja | Szczegóły |
|-----------|-------------|--------|-----------|
| Frontend | React | 18.x | SPA z JSX/TSX |
| Typowanie | TypeScript | 5.x | strict mode, noImplicitAny |
| Bundler | Vite | 5.x | HMR, SWC plugin |
| Styling | Tailwind CSS | 3.x | utility-first + custom CSS variables |
| UI Kit | shadcn/ui | - | Radix UI primitives + Tailwind |
| Backend | Firebase Firestore | 12.x | Baza NoSQL, real-time subscriptions |
| Auth | Firebase Authentication | 12.x | Google sign-in + email/password |
| Functions | Firebase Cloud Functions | v2 | Strava OAuth, Weekly Digest, OpenAI proxy (Node.js 22) |
| Email | Resend | 6.x | Weekly Digest, verification codes, invites, access emails |
| Image Gen | html2canvas-pro | - | Share Workout PNG |
| Routing | React Router DOM | 6.x | HashRouter (GitHub Pages) |
| Wykresy | Recharts | 2.x | Liniowe, słupkowe, multi-line |
| AI | OpenAI API | - | Generowanie planów + AI Coach |
| Fitness | Strava API | v3 | Import aktywności sportowych |
| State | React Query | 5.x | Cache, background refetch |
| Theme | next-themes | 0.3.x | Dark mode (class strategy) |
| PWA | vite-plugin-pwa | 1.x | Service worker, manifest |
| Ikony | Lucide React | 0.462 | 1000+ ikon SVG |
| Daty | date-fns | 3.x | Formatowanie, kalkulacje |
| Validation | Zod | 3.x | Schema validation |
| Forms | React Hook Form | 7.x | + @hookform/resolvers |
| Toasts | Sonner | 1.x | Eleganckie powiadomienia |
| Testy | Vitest | 3.x | + Testing Library + jsdom |
| Deploy | gh-pages | 6.x | GitHub Pages |

---

## Struktura plików

```
src/
├── App.tsx                    # Główna aplikacja: routing, auth, providerzy
├── main.tsx                   # Entry point (React root)
├── index.css                  # Style globalne (Tailwind + CSS variables)
├── vite-env.d.ts              # Typy Vite env
│
├── contexts/
│   └── UserContext.tsx         # UserProvider + useCurrentUser (profil, onboarding, role)
│
├── components/
│   ├── Layout.tsx             # Wrapper z nawigacją i headerem
│   ├── AppHeader.tsx          # Nagłówek z nazwą użytkownika (dropdown)
│   ├── AppNavigation.tsx      # Boczne menu nawigacyjne
│   ├── AdminRoute.tsx         # Guard: wymaga roli admin
│   ├── ErrorBoundary.tsx      # React Error Boundary z fallback UI
│   ├── PWAUpdatePrompt.tsx    # Prompt aktualizacji PWA
│   ├── ExerciseCard.tsx       # Karta ćwiczenia (sety, notatki, warmup, video)
│   ├── ExerciseSwapDialog.tsx # Dialog zamiany ćwiczenia (biblioteka + filtrowanie)
│   ├── StravaActivityCard.tsx # Karta aktywności Strava (ikony, dystans, tempo)
│   ├── StatsCard.tsx          # Kafelek statystyk (Dashboard)
│   ├── TrainingDayCard.tsx    # Karta dnia treningowego (Dashboard)
│   ├── MeasurementsForm.tsx   # Formularz pomiarów ciała (10 pól)
│   ├── RestTimer.tsx          # Timer odpoczynku (circular progress, presets)
│   ├── DataManagement.tsx     # Export/import JSON (Settings)
│   ├── TypingIndicator.tsx    # Animacja "pisze..." w AI Chat
│   ├── NavLink.tsx            # Link nawigacji z aktywnym stanem
│   ├── ExerciseProgressionDialog.tsx  # Wykres progresji ćwiczenia (est. 1RM + max weight + plateau)
│   ├── WarmupRoutineDialog.tsx  # Checklist rozgrzewki + stretching z 30s timerem
│   ├── ShareWorkoutDialog.tsx   # Udostępnianie/pobieranie obrazu treningu (PNG)
│   ├── TrainingHeatmap.tsx      # GitHub-style heatmap aktywności (53×7 grid, year selector)
│   ├── strava/
│   │   ├── StravaTab.tsx          # Główny tab Strava w Analytics
│   │   ├── RacePredictor.tsx      # Predykcje 5K/10K/Półmaraton/Maraton (Riegel)
│   │   ├── TrainingLoadChart.tsx  # Fitness/Fatigue/Form (CTL/ATL/TSB)
│   │   ├── CaloriesChart.tsx      # Wykres kalorii
│   │   ├── CardioPersonalBests.tsx # Rekordy cardio
│   │   ├── ElevationChart.tsx     # Wykres przewyższeń
│   │   ├── HRZoneDistribution.tsx # Rozkład stref HR
│   │   ├── MonthlyActivities.tsx  # Aktywności miesięczne
│   │   ├── PaceTrendChart.tsx     # Trend tempa biegu
│   │   ├── SeasonFilter.tsx       # Filtr sezonowy (Badge row)
│   │   ├── StravaSummaryStats.tsx # Statystyki podsumowujące
│   │   └── WeeklyKmChart.tsx      # Tygodniowe kilometry
│   └── ui/                    # Komponenty shadcn/ui (~60 komponentów)
│
├── pages/
│   ├── Dashboard.tsx          # Strona główna: greeting, stats, AI insights, plan tygodnia, Strava, PR
│   ├── DayPlan.tsx            # Plan na dzisiaj (week schedule view)
│   ├── TrainingPlan.tsx       # Kalendarz + plan tygodniowy + Strava activities
│   ├── WorkoutDay.tsx         # Aktywny trening / ukończony / edycja (3 tryby)
│   ├── Analytics.tsx          # 4 taby: Podsumowanie, Wykresy, Pomiary, Rekordy
│   ├── Achievements.tsx       # Osiągnięcia i rekordy osobiste
│   ├── PlanEditor.tsx         # Edytor planu (swap, reorder, add, remove)
│   ├── AIChat.tsx             # Chat z AI + quick actions ("Podsumuj tydzień" z Strava)
│   ├── Onboarding.tsx         # Wizard 5 kroków → AI plan → review z swap → zatwierdzenie
│   ├── NewPlan.tsx            # Nowy plan po wygaśnięciu (cel, dni, AI generate, review)
│   ├── ExerciseLibrary.tsx    # Przeglądarka biblioteki ćwiczeń
│   ├── Settings.tsx           # Konto + Strava connect/sync/disconnect
│   ├── Login.tsx              # Wspólny ekran /login i /register
│   ├── StravaCallback.tsx     # Strava OAuth callback handler
│   ├── NotFound.tsx           # 404
│   └── admin/
│       ├── AdminDashboard.tsx # Lista użytkowników z linkami do planów
│       └── UserPlanEditor.tsx # Edycja planu dowolnego użytkownika
│
├── hooks/
│   ├── useFirebaseWorkouts.ts # CRUD workouts + measurements (per-user, real-time)
│   ├── useTrainingPlan.ts     # Plan per-user (duration, expiration, CRUD exercises)
│   ├── useStrava.ts           # Strava: connect, sync, disconnect, activities
│   ├── useAICoach.ts          # AI insights z cache 24h
│   ├── useAIChat.ts           # Chat z AI trenerem (streaming SSE + Firestore chat_messages)
│   ├── useChatMessages.ts     # Real-time chat messages z Firestore (onSnapshot)
│   ├── useAISwap.ts           # Zamiana ćwiczeń przez AI (3 alternatywy)
│   ├── useOnlineStatus.ts     # Online/offline detection + pending ops queue
│   ├── useAuth.ts             # Google sign-in, email/password, reset hasła
│   ├── use-mobile.tsx         # Detekcja urządzenia mobilnego (media query)
│   └── use-toast.ts           # Toast hook (shadcn)
│
├── types/
│   ├── index.ts               # SetData, ExerciseProgress, WorkoutSession, BodyMeasurement, ExerciseReplacement
│   └── strava.ts              # StravaActivity, StravaConnection
│
├── data/
│   ├── trainingPlan.ts        # Domyślny plan 3x/tyg + typy + getTrainingSchedule()
│   ├── exerciseLibrary.ts     # 84 ćwiczeń z kategoriami i video URL
│   └── warmupStretching.ts    # Rozgrzewka i stretching (zintegrowane w WarmupRoutineDialog)
│
└── lib/
    ├── firebase.ts            # Konfiguracja Firebase (env variables)
    ├── ai-onboarding.ts       # generateTrainingPlan() — OpenAI
    ├── ai-coach.ts            # callOpenAI(), prepareCoachData(), analyzeWithAI(), getSwapSuggestions()
    ├── ai-chat.ts             # sendChatMessage() — chat z kontekstem treningowym
    ├── pr-utils.ts            # detectNewPRs(), calculate1RM() (Epley formula)
    ├── summary-utils.ts       # calculateStreak(), calculateTonnage(), getWeekBounds()
    ├── exercise-utils.ts      # parseRepRange(), getProgressionAdvice(), Smart Rest Timer, lookupExerciseType()
    ├── exercise-progression.ts # getExerciseHistory(), detectPlateau(), getProgressionSummary()
    ├── heatmap-utils.ts       # generateHeatmapData(), getIntensityLevel() (GitHub-style)
    ├── race-predictor.ts      # predictRaceTime() (Riegel), findBestEffort(), getRacePredictions()
    ├── training-load.ts       # calculateTRIMP() (Banister), computeDailyLoad(), computeFitnessFatigue()
    ├── share-utils.ts         # generateWorkoutImage() (html2canvas-pro, 540×960 PNG)
    ├── chart-config.ts        # tooltipStyle, CHART_COLORS (shared chart config)
    ├── registration-api.ts    # Callable auth/invite/waitlist/audit API
    ├── pending-invite.ts      # Pending invite code przed logowaniem / rejestracją
    ├── strava-utils.ts        # formatDurationShort, isPaceActivity, filterByYear, compute* (Strava helpers)
    ├── offline-queue.ts       # Kolejka operacji offline (localStorage)
    └── utils.ts               # cn() (clsx + tailwind-merge)

functions/                     # Firebase Cloud Functions
├── package.json               # resend, firebase-admin, firebase-functions
├── tsconfig.json
└── src/
    ├── index.ts               # eksporty Functions: Strava, AI, admin API, registration
    ├── registration.ts        # rejestracja, verify code, invites, waitlist, auth audit, access toggle
    ├── ai-usage.ts            # checkUsageLimit(), recordUsage(), pricing map ($5/user/month)
    └── weekly-digest.ts       # Weekly Digest Email (Resend, per-user, Monday 08:00 Warsaw)

scripts/
└── migrate-to-multiuser.mjs   # Migracja danych do multi-user (dodanie userId)

public/
├── strava-callback.html       # Strava OAuth bridge (HashRouter workaround)
└── ...                        # PWA assets (manifest, icons)
```

---

## Modele danych

### SetData (seria treningowa)
```typescript
interface SetData {
  reps: number;       // Liczba powtórzeń (zawsze number, nigdy undefined)
  weight: number;     // Ciężar w kg (zawsze number)
  completed: boolean; // Czy seria ukończona
  isWarmup?: boolean; // Seria rozgrzewkowa (opcjonalne, true = warmup)
}
```

### ExerciseProgress (postęp ćwiczenia w sesji)
```typescript
interface ExerciseProgress {
  exerciseId: string;   // ID ćwiczenia z planu (np. "ex-1-1")
  sets: SetData[];      // Tablica serii
  notes?: string;       // Notatki do ćwiczenia
}
```

### WorkoutSession (sesja treningowa)
```typescript
interface WorkoutSession {
  id: string;                    // "workout-{timestamp}"
  userId: string;                // UID użytkownika
  dayId: string;                 // "day-1", "day-2", ...
  date: string;                  // YYYY-MM-DD
  exercises: ExerciseProgress[]; // Postępy ćwiczeń
  completed: boolean;            // Czy trening ukończony
  notes?: string;                // Notatki ogólne
  cycleId?: string;              // ID cyklu treningowego (opcjonalne)
}
```

### PlanCycle (cykl treningowy)
```typescript
interface PlanCycleStats {
  totalWorkouts: number;       // Liczba ukończonych treningów
  totalTonnage: number;        // Tonaż w kg
  prs: { exerciseName: string; weight: number; estimated1RM: number }[];
  completionRate: number;      // % ukończonych vs zaplanowanych
}

interface PlanCycle {
  id: string;                  // auto-generated Firestore ID
  userId: string;              // UID użytkownika
  days: TrainingDay[];         // Kopia planu treningowego
  durationWeeks: number;       // Czas trwania (tygodnie)
  startDate: string;           // YYYY-MM-DD
  endDate: string;             // YYYY-MM-DD (puste dla aktywnego)
  status: 'active' | 'completed';
  createdAt: string;           // ISO timestamp
  stats: PlanCycleStats;       // Statystyki (obliczane przy archiwizacji)
}
```

### BodyMeasurement (pomiar ciała)
```typescript
interface BodyMeasurement {
  id: string;          // "measurement-{timestamp}"
  userId: string;      // UID użytkownika
  date: string;        // YYYY-MM-DD
  weight?: number;     // Waga (kg)
  armLeft?: number;    // Ramię lewe (cm)
  armRight?: number;   // Ramię prawe (cm)
  chest?: number;      // Klatka piersiowa (cm)
  waist?: number;      // Talia (cm)
  hips?: number;       // Biodra (cm)
  thighLeft?: number;  // Udo lewe (cm)
  thighRight?: number; // Udo prawe (cm)
  calfLeft?: number;   // Łydka lewa (cm)
  calfRight?: number;  // Łydka prawa (cm)
}
```

### Exercise (definicja ćwiczenia w planie)
```typescript
interface Exercise {
  id: string;           // "ex-1-1", "ex-2-3", ...
  name: string;         // Nazwa ćwiczenia (polska)
  sets: string;         // Opis serii: "3 x 6-8", "3x10-12"
  instructions: {       // Instrukcje wykonania (opcjonalne)
    title: string;
    content: string;
  }[];
  videoUrl?: string;        // Link do YouTube
  isSuperset?: boolean;     // Czy część superserii
  supersetGroup?: string;   // Grupa superserii (np. "5")
}
```

### TrainingDay (dzień treningowy w planie)
```typescript
type Weekday = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface TrainingDay {
  id: string;              // "day-1", "day-2", "day-3", ...
  dayName: string;         // "Poniedziałek", "Środa", "Piątek"
  weekday: Weekday;        // Dzień tygodnia (7 opcji)
  focus: string;           // Cel dnia: "Klatka / Przysiad / Środek Pleców"
  exercises: Exercise[];   // Lista ćwiczeń
}
```

### StravaActivity (aktywność Strava)
```typescript
interface StravaActivity {
  id: string;
  userId: string;
  stravaId: number;
  name: string;
  type: string;             // "Run", "Ride", "Swim", "Walk", "Hike"
  date: string;             // YYYY-MM-DD
  distance?: number;        // metry
  movingTime?: number;      // sekundy
  elapsedTime?: number;     // sekundy
  averageHeartrate?: number;
  maxHeartrate?: number;
  totalElevationGain?: number;
  averageSpeed?: number;    // m/s
  stravaUrl: string;
  syncedAt: string;         // ISO timestamp
}
```

### UserProfile (profil użytkownika)
```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  onboardingCompleted: boolean;
  stravaConnected: boolean;
  stravaTokens?: { accessToken: string; refreshToken: string; expiresAt: number };
  stravaAthleteId?: number;
  stravaAthleteName?: string;
  stravaLastSync?: string;
  lastLogin: string;
}
```

### ExerciseReplacement (zamiana ćwiczenia)
```typescript
interface ExerciseReplacement {
  name: string;
  sets: string;
  videoUrl?: string;
  category?: string;
}
```

### GeneratedPlan (wygenerowany plan AI)
```typescript
interface GeneratedPlan {
  days: TrainingDay[];
  planDurationWeeks: number;  // 8-16
}
```

### OnboardingAnswers (odpowiedzi z onboardingu)
```typescript
interface OnboardingAnswers {
  goal: string;           // 'strength' | 'muscle' | 'fat_loss' | 'health'
  experience: string;     // 'beginner' | 'intermediate' | 'advanced'
  daysPerWeek: number;    // 2-5
  equipment: string[];    // ['barbell', 'dumbbells', 'machines', 'cable', 'bodyweight']
  injuries: string;       // Tekst (opcjonalny)
}
```

### CoachInsight (insight z AI Coach)
```typescript
interface CoachInsight {
  type: 'plateau' | 'progress' | 'consistency' | 'suggestion' | 'warning';
  title: string;
  message: string;
  exerciseId?: string;
  priority: 'high' | 'medium' | 'low';
}
```

### LibraryExercise (ćwiczenie z biblioteki)
```typescript
interface LibraryExercise {
  name: string;
  category: 'chest' | 'back' | 'shoulders' | 'legs' | 'arms' | 'core' | 'glutes' | 'calves';
  type: 'compound' | 'isolation';
  videoUrl?: string;
}
```

---

## Routing

```
HashRouter (dla GitHub Pages — URL z #)
│
├── /                    → Dashboard.tsx
├── /day                 → DayPlan.tsx
├── /plan                → TrainingPlan.tsx
├── /workout/:dayId      → WorkoutDay.tsx
│   └── ?date=YYYY-MM-DD   (parametr daty, opcjonalny)
├── /achievements        → Achievements.tsx
├── /cycles              → Cycles.tsx
├── /plan/edit           → PlanEditor.tsx
├── /analytics           → Analytics.tsx
│   └── ?tab=summary|charts|measurements|records
├── /ai                  → AIChat.tsx
├── /exercises           → ExerciseLibrary.tsx
├── /settings            → Settings.tsx
├── /new-plan            → NewPlan.tsx
│   └── ?fromCycle={cycleId}  (generowanie na bazie starego cyklu)
├── /onboarding          → Onboarding.tsx (tylko nowi użytkownicy)
├── /strava/callback     → StravaCallback.tsx
├── /admin               → AdminDashboard.tsx (AdminRoute guard)
├── /admin/plans/:userId → UserPlanEditor.tsx (AdminRoute guard)
│
│ Redirecty (kompatybilność wsteczna):
├── /stats               → Analytics
├── /summary             → Analytics
├── /progress            → Analytics
└── /measurements        → Analytics
```

### Parametry URL

**WorkoutDay** — parametr `date` w query string:
- `/workout/day-1?date=2026-01-26` — trening z konkretnej daty
- `/workout/day-1` (bez date) — dzisiejsza data

**Analytics** — parametr `tab`:
- `/analytics?tab=charts` — bezpośrednio do wykresów

---

## Komponenty

### Layout.tsx
Wrapper dla wszystkich stron (poza Login i Onboarding).
```
┌─────────────────────────────────────┐
│ AppNavigation │      AppHeader      │
│               │─────────────────────│
│   (sidebar)   │                     │
│               │      <Outlet/>      │
│               │    (page content)   │
│               │                     │
└─────────────────────────────────────┘
```

### ExerciseCard.tsx
Karta ćwiczenia z seriami. Owinięta w `React.memo`.

**Props:**
```typescript
interface ExerciseCardProps {
  exercise: Exercise;
  index: number;
  savedSets?: SetData[];
  savedNotes?: string;
  onSetsChange?: (sets: SetData[], notes?: string) => void;
  isEditable?: boolean;
}
```

**Funkcjonalności:**
- Seria rozgrzewkowa (pomarańczowa, ikona płomienia)
- Serie robocze (zielone gdy ukończone)
- Notatki do ćwiczenia (rozwijane)
- Instrukcje wykonania (rozwijane)
- Link do YouTube video
- Oznaczanie superserii (A/B)
- Podpowiedź poprzedniego ciężaru ("Poprzednio: 8×40kg")

### ExerciseSwapDialog.tsx
Dialog zamiany ćwiczenia na alternatywę z biblioteki.

**Props:**
```typescript
interface ExerciseSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: LibraryExercise['category'] | null;
  currentExerciseName: string;
  usedExerciseNames: string[];
  originalSets: string;
  onSwap: (replacement: ExerciseReplacement) => void;
}
```

Filtruje bibliotekę po kategorii, ukrywa już użyte ćwiczenia.

### WorkoutDay.tsx — 3 tryby

1. **Aktywny trening:** Edycja serii, auto-save z debounce 500ms, przycisk "Zakończ trening"
2. **Ukończony trening:** Podsumowanie (ćwiczenia, serie, powtórzenia), przycisk "Edytuj"
3. **Tryb edycji:** Bez auto-save (lokalny state), przycisk "Zapisz zmiany"

### Dashboard.tsx — sekcje

1. **Greeting** — "Dzień dobry / Cześć / Dobry wieczór" + data
2. **Plan expired banner** — jeśli `isPlanExpired`, link do `/new-plan`
3. **Stats** — 4 kafelki: treningi, tonaż, waga, seria
4. **AI Insights** — max 3 insighty (collapsible), link do AI Chat
5. **Ostatni PR** — rekord osobisty z linkiem do Achievements
6. **Plan tygodnia** — 3+ karty treningowe + aktywności Strava
7. **Link do Analytics**

### Analytics.tsx — 4 taby

1. **Podsumowanie (SummaryTab)** — ukończone treningi (klikalne!), tonaż, aktywności Strava
2. **Wykresy (ChartsTab)** — progresja ciężarów (filtr per dzień), tonaż w czasie
3. **Pomiary (MeasurementsTab)** — formularz + historia + wykresy
4. **Rekordy (RecordsTab)** — osobiste rekordy z PR detection

### Onboarding.tsx — przepływ

```
Krok 1: Cel (siła / masa / redukcja / zdrowie)
  ↓
Krok 2: Doświadczenie (początkujący / średni / zaawansowany)
  ↓
Krok 3: Dni w tygodniu (2-5)
  ↓
Krok 4: Sprzęt (wielokrotny wybór)
  ↓
Krok 5: Kontuzje (opcjonalny tekst)
  ↓
[Generowanie planu AI] — Loader z animacją
  ↓
[Review] — Lista dni i ćwiczeń + "Zamień" przy każdym
  ↓
"Zatwierdzam plan" → savePlan() + onboardingCompleted: true → Dashboard
```

### Cycles.tsx — historia cykli treningowych

Lista zarchiwizowanych i aktywnych cykli, kliknięcie → CycleDetail.

### CycleCard.tsx — karta cyklu

Wyświetla: daty, badge status/duration, focus dni, 4 stats (treningi, tonaż, PRy, frekwencja).

### CycleDetail.tsx — szczegóły cyklu

Statystyki, lista PRów, plan treningowy, przycisk "Wygeneruj nowy plan na bazie tego cyklu" → `/new-plan?fromCycle={cycleId}`.

### NewPlan.tsx — po wygaśnięciu planu

1. Podsumowanie starego planu (dni, focus) — lub info o cyklu źródłowym gdy `?fromCycle`
2. Wybór nowego celu (strength/muscle/fat_loss/health)
3. Wybór dni w tygodniu (2-5)
4. Opcjonalne notatki/zmiany
5. "Wygeneruj nowy plan" → AI (z kontekstem starego cyklu jeśli fromCycle) → review z swap → zatwierdzenie
6. Archiwizacja bieżącego planu do `plan_cycles` przed zapisem nowego

---

## Hooki

### useFirebaseWorkouts(userId)
Główny hook do operacji na treningach i pomiarach.

```typescript
{
  // Stan
  workouts: WorkoutSession[];
  measurements: BodyMeasurement[];
  isLoaded: boolean;
  error: string | null;

  // Treningi
  createWorkoutSession(dayId, date?, cycleId?)
  updateExerciseProgress(sessionId, exerciseId, sets, notes?)
  completeWorkout(sessionId)
  getWorkoutsByDay(dayId)
  getTodaysWorkout(dayId)
  getLatestWorkout(dayId)
  deleteWorkout(workoutId)
  cleanupEmptyWorkouts()

  // Pomiary
  addMeasurement(measurement)
  getLatestMeasurement()

  // Statystyki
  getTotalWeight()
  getCompletedWorkoutsCount()

  // Import/Export
  exportData()
  importData(jsonString)
}
```

**Real-time:** `onSnapshot` na `workouts` i `measurements` (per userId).

### usePlanCycles(userId)
Historia cykli treningowych z Firebase `plan_cycles`.

```typescript
{
  cycles: PlanCycle[];           // Posortowane wg startDate DESC
  isLoaded: boolean;

  getActiveCycle()               // Zwraca aktywny cykl lub null
  archiveCurrentPlan(planDays, durationWeeks, startDate, workouts)  // Archiwizuje bieżący plan
  createActiveCycle(planDays, durationWeeks, startDate)              // Tworzy nowy aktywny cykl
  getCycleById(cycleId)          // Pobiera cykl po ID (local cache + Firestore fallback)
}
```

**Real-time:** `onSnapshot` na `plan_cycles` (per userId, ordered by startDate DESC).

### useTrainingPlan(userId)
Plan treningowy per-user z Firebase `training_plans/{userId}`.

```typescript
{
  plan: TrainingDay[];           // Aktualny plan (lub domyślny)
  isLoaded: boolean;
  isCustom: boolean;             // Czy customowy (z Firebase)
  planDurationWeeks: number;     // Czas trwania (domyślnie 12)
  planStartDate: string | null;  // Data rozpoczęcia (YYYY-MM-DD)
  currentWeek: number;           // Bieżący tydzień (obliczany)
  isPlanExpired: boolean;        // currentWeek > planDurationWeeks
  weeksRemaining: number;        // Ile tygodni zostało (max 0)

  savePlan(newPlan, options?: { durationWeeks?, startDate? })
  swapExercise(dayId, exerciseId, newName, newSets?)
  updateExerciseSets(dayId, exerciseId, newSets)
  removeExercise(dayId, exerciseId)
  addExercise(dayId, exercise)
  moveExercise(dayId, exerciseId, direction: 'up' | 'down')
  resetToDefault()
}
```

**Ważne:** `savePlan` zawsze zachowuje istniejące `startDate` i `durationWeeks` w Firebase — przekazuje je automatycznie, nawet gdy `options` ich nie zawiera. Zapobiega to utracie tych pól przy operacjach edycji ćwiczeń.

**Auto-repair startDate:** Jeśli custom plan istnieje ale brakuje `startDate` (np. utracone przez wcześniejszy bug), hook automatycznie odpytuje kolekcję `workouts` o najstarszy trening użytkownika i odtwarza `startDate` jako poniedziałek tego tygodnia. Naprawa jest jednorazowa (per mount) i zapisuje wynik do Firebase via `updateDoc`.

### useAuth()
Autentykacja przez Google, email + hasło oraz reset hasła.

```typescript
{
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signInWithGoogle()
  registerWithEmail(email, password)
  loginWithEmail(email, password)
  resetPassword(email)
  logout()
}
```

### useStrava(userId)
Integracja Strava — connect, sync, disconnect.

```typescript
{
  activities: StravaActivity[];
  connection: StravaConnection;  // { connected, athleteName, lastSync }
  isSyncing: boolean;
  error: string | null;
  connectStrava()               // Redirect do Strava OAuth
  syncActivities()              // Wywołuje Cloud Function stravaSync
  disconnectStrava()            // Usuwa tokeny
}
```

### useAICoach(userId)
AI Coach z cache 24h (localStorage).

```typescript
{
  insights: CoachInsight[];
  isLoading: boolean;
  error: string | null;
  analyze(force?: boolean)      // force=true ignoruje cache
  lastAnalyzedAt: number | null;
  isReady: boolean;             // Dane załadowane
  hasCache: boolean;            // Czy cache ważny
}
```

### useAIChat(userId)
Chat z AI trenerem — streaming responses via SSE, per-user persistence w Firestore `chat_messages`.

```typescript
{
  messages: ChatMessage[];               // Z useChatMessages (real-time)
  isStreaming: boolean;                  // AI streamuje odpowiedź
  streamingContent: string;             // Częściowa odpowiedź (token-by-token)
  error: string | null;
  usageLimitReached: boolean;           // $5/month limit

  sendMessage(text)                      // Wyślij + streaming response
  clearChat()                            // Wyczyść historię
}
```

**Przepływ:**
1. User pisze wiadomość → `sendMessage(text)`
2. User message zapisany do Firestore `chat_messages` natychmiast
3. `callOpenAIStream()` → SSE streaming via Cloud Function `streamOpenAI`
4. Token-by-token display z cursor animation
5. Po zakończeniu → assistant message zapisany do Firestore `chat_messages`
6. Cost tracking: `ai_usage/{userId_YYYY-MM}` aktualizowany po każdym wywołaniu
7. Limit: $5/user/month — error banner gdy przekroczony

**Migracja:** Jednorazowa migracja z localStorage na Firestore `chat_messages` przy pierwszym załadowaniu.

**Deprecated:** Kolekcja `chat_conversations` jest **deprecated** — zastąpiona przez `chat_messages` z per-user isolation.

### useChatMessages(userId)
Real-time chat messages z Firestore `chat_messages` collection.

```typescript
{
  messages: ChatMessage[];               // Posortowane chronologicznie
  isLoading: boolean;
  addMessage(role, content)              // Dodaj wiadomość do Firestore
  clearMessages()                        // Usuń wszystkie wiadomości usera
}
```

**Implementacja:** `onSnapshot` na `chat_messages` z filtrem `userId` — real-time updates.

**Migracja:** Przy pierwszym załadowaniu sprawdza localStorage i migruje istniejące wiadomości do Firestore (one-time).

### useAISwap(userId)
Znajdowanie alternatyw dla ćwiczenia przez AI.

```typescript
{
  result: SwapSuggestion | null;   // { original, alternatives[] }
  isLoading: boolean;
  error: string | null;
  findSwap(exerciseName, reason)   // Zwraca 3 alternatywy
  reset()                          // Czyści wynik
}
```

Wewnętrznie wywołuje `getSwapSuggestions()` z `ai-coach.ts`, przekazując aktualny plan treningowy.

### useOnlineStatus()
Detekcja online/offline z integracją offline queue.

```typescript
{
  isOnline: boolean;               // navigator.onLine + event listeners
  pendingOps: number;              // Liczba operacji w offline queue
  refreshPendingOps()              // Ręczne odświeżenie licznika
}
```

Polling co 2 sekundy sprawdza rozmiar `offlineQueue`.

---

## Przepływ danych

### Rozpoczęcie treningu
```
1. User klika "Rozpocznij trening" (DayPlan/Dashboard)
   │
2. navigate(`/workout/${dayId}?date=${today}`)
   │
3. WorkoutDay: dayId z URL params, date z query string
   │
4. Sprawdza: istnieje workout(dayId, targetDate)?
   │
   ├── TAK + completed → Widok podsumowania
   ├── TAK + !completed → Kontynuacja treningu
   └── NIE → Przycisk "Rozpocznij trening"
              │
5. handleStartWorkout() → createWorkoutSession(dayId, date)
   │
6. Firebase tworzy doc w 'workouts'
   │
7. onSnapshot → aktualizuje workouts[]
   │
8. useEffect → ustawia sessionId
```

### Batch Save (aktywny trening) — v6.7.0

Od 2026-04-03 aktywny trening działa w modelu local-first:

```
1. User zmienia reps/weight/completed w ExerciseCard
   │
2. handleSetsChange():
   ├── Natychmiastowy update lokalnego state (React)
   └── Zapis całego draftu do IndexedDB (`workoutDraftDb`) z debounce 300ms
   │
3. Firebase dostaje snapshot TYLKO na checkpointach:
   ├── `visibilitychange` / `pagehide`
   ├── timer co 5 minut
   └── event `online` gdy draft jest dirty
   │
4. User klika "Zakończ trening":
   ├── sukces → `batchSaveWorkout(..., { completed: true })` + czyszczenie draftu
   └── offline / błąd sieci → trening oznaczony lokalnie jako ukończony i czeka na sync
```

**Bezpieczeństwo danych:**
- `IndexedDB` jako source of truth aktywnego treningu
- Migracja starego draftu z `localStorage`
- Recovery po reload/crash z lokalnego draftu
- `beforeunload` warning gdy draft ma niesynchronizowane zmiany
- Offline finish: `completedLocally + finalSyncPending`

**Moduły:**
- `src/lib/workout-draft-db.ts` — IndexedDB wrapper, migration, sync flags
- `src/lib/workout-draft.ts` — legacy localStorage migration/fallback

**Hook:** `useFirebaseWorkouts.batchSaveWorkout()` — Firestore `writeBatch` dla atomiczności

### Tryb edycji (po ukończeniu)
```
1. User klika "Edytuj" na ukończonym treningu
   │
2. handleSetsChangeLocal() — TYLKO lokalny state
   │
3. "Zapisz zmiany" → handleFinishEditing()
   │
4. Loop: updateExerciseProgress() dla każdego zmienionego ćwiczenia
```

### Onboarding (nowy użytkownik)
```
1. UserContext: ensureUserDoc() sprawdza workouts
   │
   ├── Ma workouty → isExistingUser = true → onboardingCompleted: true (skip)
   └── Brak workoutów → sprawdź onboardingCompleted
       │
       ├── true → Dashboard
       └── false/brak → isNewUser = true → <Onboarding/>
           │
2. Wizard: 5 kroków → answers
   │
3. generateTrainingPlan(answers) → OpenAI
   │
4. Review: lista ćwiczeń, "Zamień" button → ExerciseSwapDialog
   │
5. "Zatwierdzam plan":
   ├── savePlan(days, { durationWeeks, startDate })
   └── updateDoc(users/{uid}, { onboardingCompleted: true })
```

### Plan expiration
```
useTrainingPlan:
  currentWeek = Math.floor((now - startDate) / 7 days) + 1
  isPlanExpired = currentWeek > planDurationWeeks
  │
Dashboard:
  isPlanExpired → Banner "Twój plan się zakończył!" → /new-plan
  │
NewPlan:
  1. Podsumowanie starego planu
  2. Wybór nowego celu + dni
  3. generateTrainingPlan(answers)
  4. Review z swap
  5. savePlan() → navigate('/')
```

---

## Firebase

### Konfiguracja (`src/lib/firebase.ts`)
```typescript
// Credentials z .env (VITE_FIREBASE_*)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "fittracker-workouts.firebaseapp.com",
  projectId: "fittracker-workouts",
  storageBucket: "fittracker-workouts.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
```

### Kolekcje Firestore

```
fittracker-workouts (project)
│
├── users/{uid}                 # Profile użytkowników
│   ├── email: string
│   ├── displayName: string
│   ├── role: "admin" | "user"
│   ├── access.enabled: boolean
│   ├── status: "pending_verification" | "active" | "suspended" | "deleted"
│   ├── auth.primaryProvider: "google" | "password"
│   ├── authProviders: string[]
│   ├── verification.emailVerifiedAt?: string | null
│   ├── registration.source?: string
│   ├── registration.inviteId?: string | null
│   ├── registration.waitlistId?: string | null
│   ├── onboardingCompleted: boolean
│   ├── onboarding.state?: "not_started" | "in_progress" | "completed"
│   ├── lastLogin: string (ISO)
│   ├── cohorts?: string[]
│   ├── stravaConnected: boolean
│   ├── stravaAthleteId?: number
│   ├── stravaAthleteName?: string
│   └── stravaLastSync?: string (ISO)
│
├── workouts/workout-{timestamp}  # Sesje treningowe
│   ├── id, userId, dayId, date, completed
│   └── exercises: [{ exerciseId, sets: [{reps, weight, completed, isWarmup?}], notes? }]
│
├── measurements/measurement-{timestamp}  # Pomiary ciała
│   ├── id, userId, date
│   └── weight?, armLeft?, armRight?, chest?, waist?, hips?, thighLeft?, thighRight?, calfLeft?, calfRight?
│
├── training_plans/{userId}      # Plany treningowe
│   ├── days: TrainingDay[]
│   ├── durationWeeks: number
│   ├── startDate: string (YYYY-MM-DD)
│   └── updatedAt: string (ISO)
│
├── strava_activities/{auto-id}  # Aktywności Strava
│   ├── userId, stravaId, name, type, date
│   ├── distance?, movingTime?, elapsedTime?
│   ├── averageHeartrate?, maxHeartrate?
│   ├── totalElevationGain?, averageSpeed?
│   └── stravaUrl, syncedAt
│
├── invites/{auto-id}           # Invite codes i metadata
│   ├── code: string
│   ├── email?: string | null
│   ├── status: "active" | "redeemed" | "revoked" | "expired"
│   ├── cohorts: string[]
│   └── redeemedAt?, redeemedBy?, waitlistEntryId?
│
├── waitlist_entries/{auto-id}  # Waitlista / leady
│   ├── email: string
│   ├── displayName?: string | null
│   ├── note?: string | null
│   ├── source: string
│   └── status: "waiting" | "invited" | "converted" | "archived"
│
├── email_verification_codes/{base64(email)}  # Hashowane kody mailowe
│   ├── uid: string
│   ├── codeHash: string
│   ├── expiresAt: string
│   └── attempts, status
│
├── auth_audit_logs/{auto-id}   # Audit auth/admin
│   ├── eventType: string
│   ├── uid?: string | null
│   ├── email?: string | null
│   ├── actorUid?: string | null
│   └── createdAt: string
│
├── notification_logs/{auto-id} # Ślad wysłanych maili
│   ├── type: string
│   ├── email: string
│   └── responseId?, error?, createdAt
│
├── chat_messages/{auto-id}      # Wiadomości AI Chat (per-user)
│   ├── userId: string
│   ├── role: "user" | "assistant"
│   ├── content: string
│   └── createdAt: Timestamp
│
├── ai_usage/{userId_YYYY-MM}   # AI cost tracking (per-user per-month)
│   ├── userId: string
│   ├── month: string (YYYY-MM)
│   ├── promptTokens: number
│   ├── completionTokens: number
│   ├── estimatedCostUsd: number
│   ├── callCount: number
│   └── updatedAt: Timestamp
│
└── chat_conversations/{convId}  # ⚠️ DEPRECATED — zastąpione przez chat_messages
    ├── id, title
    ├── createdAt, updatedAt (ISO)
    └── messages: [{ role, content, timestamp }]
```

**⚠️ `chat_conversations`:** DEPRECATED — zastąpione przez `chat_messages` z per-user isolation. Legacy collection bez pola `userId`.

### Composite Indexes (wymagane)
- `workouts`: userId ASC + date DESC
- `measurements`: userId ASC + date DESC
- `strava_activities`: userId ASC + date DESC
- `chat_messages`: userId ASC + createdAt ASC

### Security Rules (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId
                    && !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']);
      allow create: if request.auth.uid == userId;
      allow read, write: if isAdmin();
    }

    match /workouts/{workoutId} {
      allow read: if resource.data.userId == request.auth.uid;
      allow create: if request.resource.data.userId == request.auth.uid;
      allow update, delete: if resource.data.userId == request.auth.uid;
      allow read: if isAdmin();
    }

    match /measurements/{measurementId} {
      // Identyczne reguły jak workouts (per-user isolation)
    }

    match /training_plans/{planUserId} {
      allow read, write: if request.auth.uid == planUserId;
      allow read, write: if isAdmin();
    }

    match /strava_activities/{activityId} {
      allow read: if resource.data.userId == request.auth.uid;
      allow write: if false;  // Tylko Cloud Functions
      allow read: if isAdmin();
    }

    match /chat_messages/{messageId} {
      allow read: if resource.data.userId == request.auth.uid;
      allow create: if request.resource.data.userId == request.auth.uid;
      allow delete: if resource.data.userId == request.auth.uid;
      allow read, write: if isAdmin();
    }

    match /ai_usage/{usageId} {
      allow read: if usageId.matches(request.auth.uid + '_.*');
      allow read: if isAdmin();
      allow write: if false;  // Tylko Cloud Functions (streamOpenAI)
    }

    match /chat_conversations/{convId} {
      allow read, write: if request.auth != null;  // DEPRECATED: brak per-user isolation
    }
  }
}
```

**Kluczowe zasady:**
- Per-user isolation: `userId == request.auth.uid` na workouts, measurements, strava_activities, chat_messages
- Admin: `role == 'admin'` → read/write all (z wyjątkiem strava_activities write)
- Users nie mogą zmieniać swojego `role` (zabezpieczenie przed eskalacją)
- Strava activities: write disabled (tylko Cloud Functions mają dostęp via admin SDK)
- AI usage: write disabled dla klientów (tylko Cloud Functions `streamOpenAI` zapisuje via admin SDK)
- Chat messages: per-user isolation (userId == auth.uid)
- Chat conversations: **DEPRECATED** — brak per-user isolation (legacy)

### Sanityzacja danych
Firebase nie akceptuje `undefined`. Dane muszą być sanityzowane:
```typescript
const sanitizedSets = sets.map(set => ({
  reps: set.reps ?? 0,
  weight: set.weight ?? 0,
  completed: set.completed ?? false,
  ...(set.isWarmup && { isWarmup: true }),
}));
```

---

## AI Integration

### OpenAI API
Klucz w `VITE_OPENAI_API_KEY`. Wywołanie przez `callOpenAI()` w `src/lib/ai-coach.ts`.

### AI Coach (`useAICoach`)
- Analizuje treningi, pomiary, streak
- Zwraca `CoachInsight[]` z typami: plateau, progress, consistency, suggestion, warning
- Cache 24h w localStorage (invalidacja gdy nowy trening)
- Wyświetlany na Dashboard (max 3 insighty, collapsible)

### AI Plan Generation (`ai-onboarding.ts`)
- `generateTrainingPlan(answers)` → wywołuje OpenAI
- Prompt zawiera bibliotekę ćwiczeń (priorytet nazw z biblioteki)
- AI decyduje o `planDurationWeeks` (8-12) na podstawie celu/doświadczenia
- Retry: 2 próby w przypadku błędu parsowania JSON
- Walidacja struktury: sprawdza id, dayName, weekday, focus, exercises

### AI Chat (`AIChat.tsx`)
- Interaktywny chat z AI trenerem
- Quick actions: "Podsumuj tydzień" — zawiera treningi + aktywności Strava
- `buildWeekSummaryPrompt()` — buduje prompt z danymi tygodnia

---

## AI Chat System

### Architektura (v6.4.0 — Streaming + Per-User)

```
AIChat.tsx (UI)
  ↓
useAIChat(userId) (hook)
  ↓ sendMessage()
  ├── useChatMessages(userId) — Firestore real-time (onSnapshot)
  └── callOpenAIStream() — SSE streaming via Cloud Function
  ↓
Cloud Function: streamOpenAI (onRequest, Bearer token auth)
  ├── checkUsageLimit(userId) — $5/user/month
  ├── OpenAI API (streaming: true)
  ├── recordUsage(userId, tokens) — ai_usage/{userId_YYYY-MM}
  └── SSE response (token-by-token)
  ↓
Firestore: chat_messages/{auto-id} (per-user)
Firestore: ai_usage/{userId_YYYY-MM} (cost tracking)
```

### Typy

```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  createdAt: Timestamp;        // Firestore Timestamp
  userId: string;              // Per-user isolation
}
```

### Streaming SSE

`callOpenAIStream()` w `ai-coach.ts`:
- Wywołuje Cloud Function `streamOpenAI` via fetch z `Accept: text/event-stream`
- Autentykacja: Bearer token (Firebase Auth ID token)
- Parsuje SSE events (`data: {...}`) token-by-token
- UI wyswietla `streamingContent` z cursor animation (pulsujacy blok)
- Po `[DONE]` → zapis kompletnej odpowiedzi do Firestore `chat_messages`

### Cloud Function: `streamOpenAI`

- Typ: `onRequest` (nie `onCall` — SSE wymaga raw HTTP response)
- Auth: Manual verification via `admin.auth().verifyIdToken(bearerToken)`
- Cost tracking: `ai-usage.ts` — `checkUsageLimit()`, `recordUsage()`, pricing map per model
- Limit: $5/user/month → 429 status gdy przekroczony
- CORS: dozwolone origin z Firebase Hosting

### Przepływ sendMessage()

1. User wpisuje tekst → `sendMessage(text)`
2. User message zapisany do Firestore `chat_messages` natychmiast
3. `callOpenAIStream(history, workouts, measurements, plan)`:
   - Buduje system prompt z `CHAT_SYSTEM_PROMPT` + dane treningowe (JSON)
   - Dodaje historię rozmowy (z `useChatMessages`)
   - SSE streaming via `streamOpenAI` Cloud Function
4. Token-by-token → `streamingContent` aktualizowany w real-time
5. Po zakończeniu → assistant message zapisany do Firestore `chat_messages`
6. `useChatMessages` onSnapshot → UI aktualizuje się automatycznie
7. Cost tracking: `ai_usage/{userId_YYYY-MM}` zaktualizowany po każdym wywołaniu

### Cost Tracking

| Pole | Opis |
|------|------|
| `promptTokens` | Suma tokenów wejsciowych (kumulatywna w miesiacu) |
| `completionTokens` | Suma tokenow wyjsciowych |
| `estimatedCostUsd` | Szacowany koszt USD (na podstawie pricing map) |
| `callCount` | Liczba wywolan AI w miesiacu |
| Limit | $5/user/month — error banner w UI |

### Migracja z localStorage

Jednorazowa migracja przy pierwszym zaladowaniu `useChatMessages`:
1. Sprawdza `localStorage` na istnieje wiadomosci chatu
2. Jesli znalezione → zapisuje do Firestore `chat_messages` z `userId`
3. Czysci localStorage
4. Kolejne ladowania → tylko Firestore

### Quick Actions

`AIChat.tsx` oferuje szybkie akcje:
- **"Podsumuj tydzien"** — `buildWeekSummaryPrompt()` zbiera treningi + Strava z biezacego tygodnia

---

## AI Models

### Aktualny model: `gpt-5-mini`

| Parametr | Wartość |
|----------|---------|
| Model | `gpt-5-mini` |
| Provider | OpenAI |
| Context window | 400K tokens |
| Input pricing | $0.25 / 1M tokens |
| Output pricing | $2.00 / 1M tokens |
| Endpoint | `https://api.openai.com/v1/chat/completions` |
| Konfiguracja | `src/lib/ai-coach.ts:156` — hardcoded w `callOpenAI()` |

### Centralna funkcja: `callOpenAI()`

```typescript
// src/lib/ai-coach.ts
export async function callOpenAI(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: 'gpt-5-mini', messages }),
  });
  // ... parse response
}
```

Wszystkie AI features korzystają z tej jednej funkcji.

### Funkcje AI i ich pliki

| Funkcja | Plik | Wywołanie |
|---------|------|-----------|
| Plan generation | `ai-onboarding.ts` | `generateTrainingPlan(answers)` |
| Coach analysis | `ai-coach.ts` | `analyzeWithAI(data)` → `CoachInsight[]` |
| Exercise swap | `ai-coach.ts` | `getSwapSuggestions(exercise, reason, plan)` |
| Workout summary | `ai-coach.ts` | `generateWorkoutSummary(workout, prev, plan)` |
| Plan suggestions | `ai-coach.ts` | `suggestPlanChanges(data)` |
| Chat | `ai-chat.ts` | `sendChatMessage(history, workouts, measurements, plan)` |

### Zmiana modelu

Żeby zmienić model AI, wystarczy zmienić string `'gpt-5-mini'` w `callOpenAI()` na inny model. Kompatybilne modele (OpenAI API format):
- OpenAI: `gpt-4o`, `gpt-4o-mini`, `o3-mini`
- Inne providery (wymagają zmiany endpoint): Claude, Gemini, DeepSeek

---

## Exercise Progression

### parseRepRange() — parsowanie schematów serii

```typescript
// "3 x 6-8" → { min: 6, max: 8 }
// "3 x 10"  → { min: 10, max: 10, isFixed: true }
// "3 x MAX" → { min: 0, max: 0, isMax: true }
```

Plik: `src/lib/exercise-utils.ts`

### getProgressionAdvice() — podpowiedź progresji

Logika oparta na pozycji ćwiczenia w dniu treningowym:

| Pozycja | Typ | Increment |
|---------|-----|-----------|
| Index 0-2 | Compound | **+2.5 kg** |
| Index 3+ lub superset | Isolation | **+1 kg** |

**Reguły:**
- Wszystkie serie ≥ max repsów → `↑ +2.5kg` (lub `+1kg` dla izolacji)
- Jakakolwiek seria < min repsów → `Utrzymaj ciężar`
- Pomiędzy → `Powtórz`
- `isMax` (np. "3 x MAX") → brak podpowiedzi

### getRestDuration() — Smart Rest Timer (v6.1.0)

Czas odpoczynku oparty na typie ćwiczenia i intensywności (% estimated 1RM).

| Kontekst | Czas |
|----------|------|
| Superset (pierwszy w parze) | **15 sekund** |
| Superset (drugi w parze) | **60 sekund** |
| Compound (base) | **90 sekund** |
| Isolation (base) | **60 sekund** |
| Compound/Isolation + >80% 1RM | base + **30 sekund** |
| Compound/Isolation + >90% 1RM | base + **60 sekund** |

**Nowe pola w RestContext:**
```typescript
interface RestContext {
  exerciseIndex: number;
  isSuperset: boolean;
  isFirstInSuperset: boolean;
  exerciseType?: 'compound' | 'isolation';  // z lookupExerciseType()
  weight?: number;                          // ostatni ciężar
  estimated1RM?: number;                    // z getExerciseBest1RM()
}
```

### lookupExerciseType() — typ ćwiczenia

Lookup compound/isolation z `exerciseLibrary.ts`. Fallback: `'compound'`.

### Bodyweight Exercises (v6.7.0)

Ćwiczenia bez obciążenia (Dead Bug, Plank, Pompki, Reverse Crunch, Glute Bridge, Skręty rosyjskie, Unoszenie nóg w zwisie).

**Flag:** `isBodyweight?: boolean` w `LibraryExercise` (`exerciseLibrary.ts`)

**Lookup:** `isBodyweightExercise(name: string): boolean` (`exercise-utils.ts`)

**UI:** ExerciseCard ukrywa kolumnę "Ciężar (kg)" gdy `isBodyweight=true`. Grid zmienia się z 4-kolumnowego na 3-kolumnowy. Weight auto-ustawiony na 0.

**Progresja:** `getProgressionAdvice()` z `isBodyweight=true` → sugeruje "↑ +powt." zamiast "+2.5kg". `createPrefilledSets()` zawsze `weight: 0`.

**PR Detection:** `getExerciseBestReps()` + `detectNewPRs()` z `bodyweightExerciseIds` → PR na podstawie max reps (typ `'reps'`).

**Analytics:** `getExerciseHistory(workouts, id, isBodyweight)` — nie filtruje `weight > 0`, oś Y = reps. `ExerciseProgressionDialog` z `isBodyweight` prop.

**Progresja per-exercise (Analytics):** Grid osobnych wykresów per ćwiczenie (v6.7.0). Każde ćwiczenie ma własną skalę Y — rozwiązuje problem nakładania się 30kg obok 150kg.

### Exercise Timeline (v6.1.0)

**Plik:** `src/lib/exercise-progression.ts`

| Funkcja | Input | Output |
|---------|-------|--------|
| `getExerciseHistory(workouts, exerciseId)` | `WorkoutSession[], string` | `ExerciseHistoryPoint[]` (date, maxWeight, bestReps, estimated1RM, totalVolume) |
| `detectPlateau(history, minSessions?)` | `ExerciseHistoryPoint[], number=4` | `{isPlateau, sessionsSinceProgress, lastProgressDate}` |
| `getProgressionSummary(history)` | `ExerciseHistoryPoint[]` | `{startWeight, currentWeight, change, changePercent, totalSessions}` |

**UI:** `ExerciseProgressionDialog.tsx` — LineChart (est. 1RM + max weight), stats row, plateau alert, recent sessions table. Dostępny z Achievements.tsx (przycisk 📈).

### Training Heatmap (v6.1.0)

**Plik:** `src/lib/heatmap-utils.ts`

| Funkcja | Input | Output |
|---------|-------|--------|
| `generateHeatmapData(workouts, stravaActivities, year)` | arrays + number | `HeatmapDay[]` (365/366 dni) |
| `getIntensityLevel(day, avgTonnage)` | `HeatmapDay, number` | `0\|1\|2\|3\|4` |

**Poziomy:** 0=brak, 1=cardio only, 2=workout only, 3=oba, 4=intensywny (>1.5× avg tonnage)

**UI:** `TrainingHeatmap.tsx` — grid 53×7 (emerald colors), month labels, year selector. W Analytics SummaryTab.

### Race Predictor (v6.1.0)

**Plik:** `src/lib/race-predictor.ts`

**Riegel formula:** `T2 = T1 × (D2/D1)^1.06`

| Funkcja | Input | Output |
|---------|-------|--------|
| `predictRaceTime(knownDist, knownTime, targetDist)` | `number×3` | `number` (seconds) |
| `findBestEffort(activities, minDist, maxDist)` | `StravaActivity[], number, number` | `StravaActivity \| null` |
| `getRacePredictions(activities)` | `StravaActivity[]` | `RacePrediction[]` (5K, 10K, HM, Marathon) |

**UI:** `RacePredictor.tsx` — Card z grid 2×2. W StravaTab po CardioPersonalBests.

### Training Load / TRIMP (v6.1.0)

**Plik:** `src/lib/training-load.ts`

**TRIMP (Banister):** `duration_min × HRr × 0.64 × e^(1.92 × HRr)` where `HRr = (avgHR - restHR) / (maxHR - restHR)`

| Funkcja | Input | Output |
|---------|-------|--------|
| `calculateTRIMP(avgHR, duration, restHR, maxHR)` | `number×4` | `number` |
| `computeDailyLoad(activities, restHR, maxHR)` | `StravaActivity[], number, number` | `DailyLoad[]` |
| `computeFitnessFatigue(dailyLoad, days?)` | `DailyLoad[], number=90` | `FitnessFatiguePoint[]` (CTL/ATL/TSB) |

- **CTL (Fitness):** 42-day exponential weighted moving average
- **ATL (Fatigue):** 7-day EWMA
- **TSB (Form):** CTL - ATL (positive = fresh, negative = tired)

**UI:** `TrainingLoadChart.tsx` — AreaChart: CTL (blue), ATL (red), TSB (green dashed). W StravaTab po CaloriesChart. Return null jeśli <7 HR activities.

### Share Workout (v6.1.0)

**Plik:** `src/lib/share-utils.ts`

```typescript
interface ShareData {
  dayName: string; date: string;
  exercises: {name: string; sets: string}[];
  tonnage: number; duration: string;
  prs: string[]; streak: number;
}
export async function generateWorkoutImage(data: ShareData): Promise<Blob>
```

Renderuje hidden div → `html2canvas-pro` → canvas → PNG blob (540×960, scale: 2). Ciemny gradient, stats grid, lista ćwiczeń. Dane escapowane via `escapeHtml()`.

**UI:** `ShareWorkoutDialog.tsx` — preview + Download (`<a download>`) + Share (`navigator.share`). Przycisk w WorkoutDay po ukończeniu treningu.

### Weekly Digest Email (v6.1.0 → v6.3.0)

**Plik:** `functions/src/weekly-digest.ts`

- Cloud Function `onSchedule("every monday 08:00", timeZone: "Europe/Warsaw")`
- Secret: `RESEND_API_KEY` (GCP Secret Manager)
- Auto-detect emaili z Firebase Auth (`listUsers()`)
- Per-user query: workouts + strava_activities z last Monday-Sunday
- HTML email: stats grid (treningi, tonaż, km, biegi), highlights (najszybszy/najdłuższy bieg), link do app
- From: `Strength Save <onboarding@resend.dev>` (zmienić po dodaniu domeny w Resend)

### PR Detection — `pr-utils.ts`

- `calculate1RM(weight, reps)` — wzór Epley: `weight × (1 + reps/30)`
- `getExerciseBest1RM(workouts, exerciseId)` — najlepszy ciężar + najlepszy estimated 1RM
- `detectNewPRs(current, previous, exerciseNames)` → `PRComparison[]` z typami: Weight PR, 1RM PR, lub oba

---

## Strava Integration

### Architektura
```
Frontend                    Cloud Functions              Strava API
   │                            │                           │
   │ connectStrava()            │                           │
   │──── stravaAuthUrl ────────>│                           │
   │<─── auth URL ──────────────│                           │
   │                            │                           │
   │ [redirect do Strava]       │                           │
   │                            │                           │
   │ strava-callback.html       │                           │
   │──── stravaCallback ───────>│──── exchange code ───────>│
   │<─── ok (tokens saved) ─────│<─── tokens ──────────────│
   │                            │                           │
   │ syncActivities()           │                           │
   │──── stravaSync ───────────>│──── GET /activities ─────>│
   │<─── { synced: N } ────────│<─── activities[] ─────────│
```

### Cloud Functions (`functions/src/index.ts`)
- `stravaAuthUrl` — generuje URL autoryzacji Strava
- `stravaCallback` — wymienia code na tokeny, zapisuje do Firestore
- `stravaSync` — pobiera aktywności, zapisuje do `strava_activities`
  - Pierwszy sync: 365 dni lookback
  - Kolejne synce: od `stravaLastSync`
  - Automatyczny token refresh (jeśli wygasł)
  - Logi: `logger.info()` dla debugowania
- `streamOpenAI` — SSE streaming OpenAI proxy (`onRequest`, manual auth via Bearer token)
  - `ai-usage.ts`: `checkUsageLimit()`, `recordUsage()`, pricing map per model
  - Cost tracking: `ai_usage/{userId_YYYY-MM}` w Firestore
  - Limit: $5/user/month → HTTP 429 gdy przekroczony

### OAuth Bridge
`public/strava-callback.html` — workaround dla HashRouter:
- Strava redirectuje na `https://...github.io/strength-save/strava-callback.html?code=...`
- Bridge przekierowuje na `/#/strava/callback?code=...`

---

## Onboarding i Plan Management

### Onboarding nowych użytkowników
1. `UserContext.ensureUserDoc()` sprawdza:
   - Czy user ma workouty → `isExistingUser = true` → auto `onboardingCompleted: true`
   - Czy user NIE miał `onboardingCompleted` a jest existing → przywróć domyślny plan (fix bug v5.0)
2. `isNewUser` = `!onboardingCompleted` → `<Onboarding/>`
3. Wizard 5 kroków → AI generuje plan → review z ExerciseSwapDialog → zatwierdzenie

### Plan expiration i nowy plan
1. `useTrainingPlan` oblicza `currentWeek` z `planStartDate`
2. `isPlanExpired = currentWeek > planDurationWeeks`
3. Dashboard wyświetla banner → link do `/new-plan`
4. NewPlan: podsumowanie starego planu + konfiguracja + AI generate + review + save

### Dynamiczny weekday
- `Weekday` type: 7 dni (monday-sunday)
- `getTrainingSchedule()` akceptuje `weeks` i `days` parametry
- Mapowanie weekday → offset (monday=0, tuesday=1, ...)
- Plany 2-5 dni/tydzień z automatycznym mapowaniem

---

## Offline Support

### Architektura

Projekt ma wbudowaną infrastrukturę offline, choć nie jest jeszcze w pełni zintegrowana z UI:

**1. PWA Service Worker (Workbox)**
- Konfiguracja w `vite.config.ts` via `vite-plugin-pwa`
- Strategia: **network-first** dla Firestore API (tryb online preferowany, offline z cache)
- Cache: Globalne assety (`**/*.{js,css,html,ico,png,svg,woff,woff2}`)
- Czas życia cache: 24h
- Navigation fallback denylist: `/strava-callback.html` (OAuth musi iść online)

**2. Offline Queue (`src/lib/offline-queue.ts`)**

```typescript
interface QueuedOperation {
  id: string;
  type: 'updateExercise' | 'completeWorkout' | 'createWorkout';
  payload: Record<string, unknown>;
  timestamp: number;
}
```

API:
- `offlineQueue.add(op)` — dodaje operację do localStorage queue
- `offlineQueue.getAll()` — pobiera wszystkie oczekujące operacje
- `offlineQueue.remove(id)` — usuwa operację po wykonaniu
- `offlineQueue.clear()` — czyści kolejkę
- `offlineQueue.size()` — liczba oczekujących operacji

Storage: `localStorage` → klucz `fittracker_offline_queue`

**3. useOnlineStatus() hook**
- Nasłuchuje `online`/`offline` eventów przeglądarki
- Polluje `offlineQueue.size()` co 2 sekundy
- Zwraca `{ isOnline, pendingOps, refreshPendingOps }`

**Status:** Infrastruktura gotowa, brak pełnej integracji w hookach CRUD (operacje nie są automatycznie queue'owane gdy offline).

---

## Funkcjonalności

### 1. Plan treningowy
- 2-5 dni w tygodniu (dynamiczne weekdays)
- Każdy dzień ma 5-8 ćwiczeń
- Superserie (A+B) oznaczone `isSuperset` + `supersetGroup`
- `getTrainingSchedule()` generuje harmonogram na N tygodni
- Czas trwania planu: 8-16 tygodni (z AI lub domyślnie 12)

### 2. Serie treningowe
- Seria rozgrzewkowa (warmup) — pomarańczowa, ikona płomienia
- Serie robocze — zliczane w statystykach
- Każda seria: powtórzenia, ciężar, status ukończenia
- Podpowiedź poprzedniego ciężaru

### 3. Notatki
- Opcjonalne notatki do każdego ćwiczenia
- Przycisk "Dodaj notatkę" rozwija Textarea
- Zapisywane razem z seriami do Firebase

### 4. Tryb edycji
- Po ukończeniu treningu
- Bez auto-save (lokalny state)
- Przycisk "Zapisz zmiany" zapisuje wszystko

### 5. Smart Rest Timer (v6.1.0)
- Circular progress ring
- Czas oparty na typie ćwiczenia (compound/isolation) i intensywności (%1RM)
- Compound: 90s base, Isolation: 60s base
- +30s >80% 1RM, +60s >90% 1RM
- Superset: 15s (pierwszy) / 60s (drugi)
- Pauza, reset, wibracja po zakończeniu

### 6. Pomiary ciała
- 10 pól pomiarowych
- Historia pomiarów
- Wykresy trendu (recharts)

### 7. Statystyki i Analytics
- 4 taby: Podsumowanie, Wykresy, Pomiary, Rekordy
- Klikalne ukończone treningi → WorkoutDay
- Tonaż (kg × powtórzenia)
- Seria treningowa (streak)
- Progresja ciężarów (wykresy liniowe)
- Rekordy osobiste (PR detection)

### 8. AI Coach
- Insights: plateau, progress, consistency, suggestion, warning
- Cache 24h (invalidacja przy nowym treningu)
- Wyświetlane na Dashboard (collapsible)
- Chat w AIChat.tsx

### 9. AI-generated plans
- Onboarding: wizard → AI plan → review → save
- New Plan: cel + dni → AI plan → review → save
- ExerciseSwapDialog: zamiana ćwiczenia na alternatywę

### 10. Strava & Cardio Analytics
- OAuth via Cloud Functions
- Sync aktywności (365 dni lookback)
- Wyświetlanie na Dashboard, TrainingPlan, Analytics, AI Chat
- 9 dedykowanych komponentów (Calories, Elevation, HR Zones, Pace, Monthly, etc.)
- Race Predictor (5K/10K/HM/Marathon — Riegel formula)
- Training Load (TRIMP/CTL/ATL/TSB — Banister model)

### 11. Exercise Timeline (v6.1.0)
- Wykres progresji per ćwiczenie (est. 1RM + max weight)
- Plateau detection (brak progresu w N sesjach)
- Progression summary (start → current, zmiana %)
- Dostępny z Achievements (przycisk 📈)

### 12. Training Heatmap (v6.1.0)
- GitHub-style grid 53×7 (workouts + Strava)
- 5 poziomów intensywności (emerald colors)
- Month labels, year selector, legend
- W Analytics SummaryTab

### 13. Share Workout (v6.1.0)
- Generowanie PNG obrazu treningu (540×960 IG story)
- html2canvas-pro, ciemny gradient design
- Download + Share (navigator.share)
- Przycisk po ukończeniu treningu

### 14. Warmup Routine (v6.1.0)
- Checklist rozgrzewki (5 items) + stretching (6 items, focus-based)
- Progress bar + 30s countdown timer
- Przycisk w WorkoutDay header

### 15. Weekly Digest Email (v6.3.0)
- Cloud Function co poniedziałek o 8:00 (Europe/Warsaw)
- Per-user email z auto-detect z Firebase Auth
- Stats: treningi, tonaż, km, biegi + Strava highlights
- Resend API

### 16. Multi-User
- Multi-email whitelist
- Per-user data isolation
- Admin panel (zarządzanie planami)

### 17. Dark Mode
- ThemeProvider (next-themes)
- Toggle Sun/Moon w AppHeader
- CSS variables w index.css

### 18. PWA
- vite-plugin-pwa
- Service worker
- Manifest z ikonami
- PWAUpdatePrompt

---

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/deploy.yml`)

**Trigger:** Push na branch `main` lub manual `workflow_dispatch`

**Pipeline:**
```
Push to main
  ↓
GitHub Actions (ubuntu-latest)
  ↓
1. actions/checkout@v4
  ↓
2. actions/setup-node@v4 (Node 20 + npm cache)
  ↓
3. npm ci
  ↓
4. npm run build
   └── Env vars z GitHub Secrets:
       VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN,
       VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET,
       VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID,
       VITE_ALLOWED_EMAIL (legacy), VITE_ALLOWED_EMAILS,
       VITE_OPENAI_API_KEY
  ↓
5. actions/configure-pages@v4
  ↓
6. actions/upload-pages-artifact@v3 (path: dist)
  ↓
7. actions/deploy-pages@v4 → GitHub Pages
```

**Permissions:** `contents: read`, `pages: write`, `id-token: write`

**Concurrency:** Grupa `pages`, cancel-in-progress: `true`

**Environment:** `production`

### Cloud Functions deploy (ręczny)

Cloud Functions nie mają CI/CD pipeline — deploy jest ręczny:

```bash
cd functions
npm run build         # TypeScript → lib/
firebase deploy --only functions
```

### Firestore deploy (ręczny)

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Deployment

### GitHub Pages
```bash
# Build i deploy (jedno polecenie)
npm run deploy

# Skrypt w package.json
"predeploy": "npm run build"
"deploy": "gh-pages -d dist"
```

### Vite config (`vite.config.ts`)
```typescript
export default defineConfig({
  base: '/strength-save/',  // Ścieżka bazowa dla GitHub Pages
  plugins: [react(), VitePWA(...)],
});
```

### HashRouter
```
https://grzegorzee.github.io/strength-save/#/workout/day-1?date=2026-01-26
```

### Environment Variables
```bash
# .env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=fittracker-workouts.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fittracker-workouts
VITE_FIREBASE_STORAGE_BUCKET=fittracker-workouts.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_ALLOWED_EMAILS=g.jasionowicz@gmail.com,other@gmail.com
VITE_OPENAI_API_KEY=...
```

---

## Zależności (package.json)

### Runtime
```
react, react-dom              — Frontend framework
react-router-dom              — Routing (HashRouter)
firebase                      — Backend (Firestore + Auth)
@tanstack/react-query         — Query cache
@radix-ui/react-*             — shadcn/ui primitives (~20 packages)
tailwind-merge, clsx, cva     — Tailwind utilities
lucide-react                  — Ikony
recharts                      — Wykresy
date-fns                      — Daty
zod                           — Validation
react-hook-form               — Formularze
@hookform/resolvers           — Zod resolver
next-themes                   — Dark mode
sonner                        — Toast notifications
cmdk                          — Command palette
vaul                          — Drawer component
embla-carousel-react          — Carousel
react-day-picker              — Calendar picker
react-resizable-panels        — Resizable panels
input-otp                     — OTP input
```

### Dev
```
typescript                    — Typowanie
vite                          — Bundler
@vitejs/plugin-react-swc      — React SWC plugin
tailwindcss, autoprefixer, postcss — Styling pipeline
vitest, @testing-library/*    — Testy
eslint, typescript-eslint     — Linting
gh-pages                      — Deploy
vite-plugin-pwa               — PWA support
jsdom                         — Test environment
```

---

## Known Issues / Gotchas

### 1. `chat_conversations` — brak per-user isolation
Kolekcja `chat_conversations` jest **legacy** — nie ma pola `userId` na dokumentach. Security rules pozwalają każdemu zalogowanemu userowi czytać/pisać wszystkie rozmowy. **Do naprawy:** dodać `userId` i zaktualizować rules.

### 2. OpenAI API key client-side
`VITE_OPENAI_API_KEY` jest eksponowany w bundlu frontendowym (Vite). Każdy kto zna URL aplikacji może wyciągnąć key z kodu. **Mitigation:** Email whitelist ogranicza dostęp do aplikacji. **Docelowo:** Przenieść wywołania AI na Cloud Functions.

### 3. Firebase `undefined` values
Firebase Firestore nie akceptuje `undefined`. Wszystkie dane muszą być sanityzowane przed zapisem. Funkcja `sanitizeSets()` w `exercise-utils.ts` zajmuje się tym dla serii treningowych. Nowe pola muszą używać `?? defaultValue`.

### 4. HashRouter a deep links
HashRouter (wymagany dla GitHub Pages) powoduje, że URL-e mają `#` — np. `.../#/workout/day-1`. To uniemożliwia standardowe deep linking i SEO. OAuth redirect Strava wymaga workaround via `strava-callback.html` (bridge).

### 5. Plan duration — brak auto-reset
Gdy plan wygaśnie (`isPlanExpired = true`), użytkownik widzi banner na Dashboard, ale stary plan nadal jest wyświetlany. Nie ma automatycznego reset — user musi sam wejść na `/new-plan` i wygenerować nowy plan.

### 6. Offline queue — brak pełnej integracji
`offline-queue.ts` i `useOnlineStatus` są zaimplementowane, ale hooki CRUD (`useFirebaseWorkouts`, `useTrainingPlan`) nie korzystają z queue. Operacje offline po prostu failują z Firebase error.

### 7. AI Coach — minimum 6 treningów
`analyzeWithAI()` wymaga minimum 6 ukończonych treningów (2-3 tygodnie), żeby dać sensowne insights. Nowi użytkownicy widzą pusty AI Coach na Dashboard.

### 8. Exercise library — 84 ćwiczeń (hardcoded)
Biblioteka ćwiczeń jest w `exerciseLibrary.ts` — nie w bazie danych. Dodanie nowego ćwiczenia wymaga zmiany kodu i deploy. AI onboarding próbuje użyć nazw z biblioteki, ale może wymyślić własne jeśli nie znajdzie dopasowania.

### 9. GitHub Actions Node 20 vs Functions Node 22
CI/CD pipeline używa Node 20 (wystarczające dla Vite build). Cloud Functions wymagają Node 22 — ale są deployowane ręcznie, nie przez CI.

---

## E2E Testing (v6.7.0)

**Framework:** Playwright (`@playwright/test`)

**Konfiguracja:** `playwright.config.ts`
- Browser: Chromium (headless)
- Base URL: `http://localhost:8080/strength-save/`
- Viewport: 390x844 (mobile)
- webServer: auto-start `npm run dev` z `VITE_E2E_MODE=true`

**E2E Mode:** `VITE_E2E_MODE=true` (Vite env variable)
- `useAuth.ts` → bypass Firebase Auth, mock user `{uid: 'e2e-test-user'}`
- `UserContext.tsx` → skip Firestore, mock profile `{role: 'admin', onboardingCompleted: true}`
- Firebase requests blokowane w testach przez `page.route()`

**Testy:** `e2e/`
- `batch-save.spec.ts` — localStorage draft roundtrip, persistence po reload, corrupt data, bodyweight weight=0
- `ui-improvements.spec.ts` — nawigacja 6 elementów, Dashboard karta treningu/wolnego/ukończonego

**Komendy:**
```bash
npm run e2e          # run all E2E tests
npm run e2e:ui       # interactive mode
npx playwright test --reporter=list  # verbose output
```

---

## Changelog

### 2026-04-03 — Workout draft hardening + offline finish

- Aktywny draft treningu przeniesiony z `localStorage` do `IndexedDB`
- `WorkoutDay` działa w modelu local-first, Firebase tylko na checkpointach i finish
- Dodany recovery flow z migracją starego draftu
- Dodany stan `final-sync-pending` dla zakończonego treningu bez internetu
- UI pokazuje rozróżnienie: lokalnie zapisane / czeka na synchronizację / zsynchronizowano
- Testy unit i E2E zaktualizowane pod `IndexedDB`

### v6.7.0 (2026-04-02) — Bodyweight, Batch Save, Dashboard Start, Analytics Split

**Bodyweight Exercises:**
- `isBodyweight` flag w `exerciseLibrary.ts` — 8 ćwiczeń (Dead Bug, Plank, Pompki, Glute Bridge, itd.)
- ExerciseCard ukrywa pole kg, grid 3-kolumnowy
- PR detection na reps (`getExerciseBestReps`), progresja "+powt." zamiast "+kg"
- Analytics/wykresy z osią Y = reps dla bodyweight

**Batch Save:**
- Dane treningu zapisywane do Firebase TYLKO przy "Zakończ trening" (nie per-keystroke)
- localStorage draft jako backup (`workout-draft.ts`)
- `batchSaveWorkout()` z Firestore `writeBatch` (atomiczny zapis)
- Draft recovery po reload/crash, `beforeunload` warning

**Dashboard "Rozpocznij trening":**
- Karta na górze Dashboard z 3 stanami: training/completed/rest
- Szybki start: klik → WorkoutDay z autostart
- Link "Szczegóły" → /day (Plan dnia)

**Nawigacja:**
- Usunięto "Plan dnia" i "AI Coach" z sidebar (8→6 zakładek)
- Trasy `/day` i `/ai` dostępne przez URL

**Analytics — per-exercise charts:**
- Progresja: grid osobnych wykresów per ćwiczenie (zamiast jednego overlapping)
- Każde ćwiczenie ma własną skalę Y
- Bodyweight: oś Y = reps, label "powt."

**Achievements — daty PR:**
- `bestDate` w `ExerciseBest` interface
- Wyświetlenie daty obok każdego PR (np. "80kg × 5 rep · 15 mar")

**Cycles — aktualny plan:**
- Karta "Aktualny plan" na górze Cycles page
- Progress bar, tydzień X z Y, lista dni treningowych

**E2E Testing:**
- Playwright setup z `VITE_E2E_MODE`
- 60 testów: smoke (14 stron), nav, features, responsive, error handling, edge cases (XSS, injection, corrupt data, viewport extremes)
- Shared helpers: `e2e/helpers.ts` (blockFirebase, navigateAndWait, expectPageRendered)

**Security Audit (5 agentów):**
- CRITICAL fixed: Strava Cloud Functions auth (`request.auth.uid` zamiast `request.data.userId`)
- CRITICAL fixed: Role escalation blocked (`role: "admin"` na create)
- HIGH fixed: useAIChat userId filter + chat_conversations rules
- MEDIUM fixed: Input validation (clampSet 0-999), OpenAI model allowlist, importData schema validation
- Usunięto `functions/.env` z Strava secret (sekrety z Secret Manager)

**AI Chat/Coach removed:**
- Usunięto: useAIChat, useAICoach, useChatMessages, AIChat.tsx, ai-chat.ts (-815 linii)
- Zachowano: ai-coach.ts (callOpenAI, getSwapSuggestions — używane przez AI onboarding i swap)

**Cleanup (/simplify audit):**
- `formatLocalDate` wyciągnięty do utils.ts (4 duplikaty usunięte)
- Callback refs w WorkoutDay (handleSetsChange stabilny, memo() działa)
- saveDraftSnapshot z debounce 300ms (4 inline calls → 1 helper)
- latestPR skan limitowany do 10 treningów (O(W²) → O(10·W))
- OpenAI: sanitizeOpenAIParams na module scope (deduplikacja)
- batchSaveWorkout uproszczony (updateDoc zamiast writeBatch)
- ProgressionSummary: startWeight/currentWeight → startValue/currentValue

### v6.6.0 (2026-04-01) — Workout UX: One-Click Start, Pre-fill, Skip, Dynamic Sets

**One-Click Start:**
- Dashboard/DayPlan → `?autostart=true` w URL nawigacji
- WorkoutDay auto-startuje sesję i scrolluje do pierwszego ćwiczenia
- `autostartDone` ref zapobiega podwójnemu odpaleniu, działa z istniejącą sesją (only scroll)

**Pre-fill z Progresją:**
- Nowa funkcja `createPrefilledSets()` w `exercise-utils.ts`
- Przy tworzeniu nowej sesji: kopiuje reps/weight z poprzedniego treningu + increment z `getProgressionAdvice()`
- +2.5kg compound, +1kg isolation (gdy system radzi "Zwiększ"), zaokrąglenie do 0.5kg
- `completed: false` — user potwierdza każdy set kliknięciem ✓

**Pomiń Ćwiczenie:**
- `skippedExercises?: string[]` w `WorkoutSession` (optional, backward compatible)
- `updateSkippedExercises()` w `useFirebaseWorkouts` hook
- Przycisk "Pomiń" (SkipForward icon) obok "Zamień" w aktywnym treningu
- Ćwiczenie filtrowane z widoku, badge "Pominięte" w podsumowaniu completed

**Dodaj/Usuń Serie:**
- `handleAddSet()` / `handleRemoveSet()` w ExerciseCard
- Przycisk "+" dodaje serię (kopiuje dane z ostatniej), max 10 working sets
- Ikona kosza (Trash2) na każdym working set, min 1 (nie kasuj ostatniego)
- Warmup set nie może być usunięty
- Oba triggery auto-save (500ms debounce)

**Zmienione pliki:**
- `src/types/index.ts` — +skippedExercises
- `src/lib/exercise-utils.ts` — +createPrefilledSets()
- `src/hooks/useFirebaseWorkouts.ts` — +updateSkippedExercises()
- `src/components/ExerciseCard.tsx` — +/- set buttons
- `src/pages/WorkoutDay.tsx` — autostart, skip, prefill
- `src/pages/Dashboard.tsx` — &autostart=true
- `src/pages/DayPlan.tsx` — &autostart=true

### v6.5.0 (2026-03-24) — Plan Cycles + Reminders + Share with Photo

**Cykle treningowe:**
- Nowa kolekcja `plan_cycles` w Firestore — archiwizacja planów z pełnymi statystykami
- Hook `usePlanCycles` — CRUD cykli, archiwizacja, real-time onSnapshot
- Automatyczna archiwizacja starego planu przy tworzeniu nowego (NewPlan + Onboarding)
- Strona `/cycles` — lista cykli (CycleCard) + szczegóły (CycleDetail: PRy, plan, stats)
- Generowanie nowego planu na bazie starego cyklu (`?fromCycle={id}` → AI z kontekstem progresji)
- `generatePlanFromCycle()` w `ai-onboarding.ts` — prompt z poprzednim planem + statystykami
- Pole `cycleId?: string` w `WorkoutSession`

**Przypomnienia:**
- Żółty banner na Dashboard gdy plan kończy się za ≤ 2 tygodnie (`weeksRemaining`)
- `weeksRemaining` w `useTrainingPlan` hook

**Share z photo:**
- Przycisk "Dodaj zdjęcie" w ShareWorkoutDialog (file input + camera capture)
- Zdjęcie jako przyciemnione tło z glassmorphism overlay i logo SS
- `buildShareHtmlWithPhoto()` w `share-utils.ts`

**Nawigacja:**
- Nowa pozycja "Cykle" w sidebarze (ikona History)
- Route `/cycles` w App.tsx

**Pliki:** `src/types/cycles.ts`, `src/hooks/usePlanCycles.ts`, `src/pages/Cycles.tsx`, `src/components/CycleCard.tsx`, `src/components/CycleDetail.tsx`

### v6.4.1 (2026-03-17) — Fix: Week counter reset bug

- Fix: `savePlan` zachowuje `startDate` i `durationWeeks` przy każdym zapisie (wcześniej `setDoc` nadpisywał cały dokument i kasował te pola)
- Auto-repair: jeśli custom plan nie ma `startDate`, hook odtwarza go z najstarszego treningu użytkownika (query `workouts` → Monday of earliest week → `updateDoc`)
- Root cause: operacje edycji ćwiczeń (swap, add, remove, move) wywoływały `savePlan` bez options, co kasowało metadata planu

### v6.4.0 (2026-03-13) — Streaming AI Chat + Cost Tracking + Per-User Chat

- Streaming AI Chat — SSE via Cloud Function `streamOpenAI`, token-by-token display z cursor animation
- Per-user chat persistence — Firestore `chat_messages` collection (zastępuje localStorage)
- AI cost tracking — `ai_usage/{userId_YYYY-MM}`, $5/user/month limit z error banner
- Admin panel: AI usage per user (promptTokens, completionTokens, estimatedCostUsd, callCount)
- `useChatMessages` hook — Firestore `onSnapshot`, real-time per-user messages
- `callOpenAIStream()` w `ai-coach.ts` — SSE streaming client
- `ai-usage.ts` w Cloud Functions — `checkUsageLimit()`, `recordUsage()`, pricing map
- One-time migration z localStorage do Firestore `chat_messages`
- `chat_conversations` collection **deprecated** (zastapione przez `chat_messages`)

### v6.3.0 (2026-03-12) — Weekly Digest (Resend) + Bug Fixes

- Migracja Weekly Digest z SendGrid na Resend API
- Auto-detect emaili z Firebase Auth (per-user digest)
- Fix: brakujący import StravaActivityCard w Analytics
- Fix: kompaktowe karty Strava w TrainingPlan (mobile)
- Bump wersji, aktualizacja dokumentacji

### v6.1.0 (2026-03-11) — 8 Feature Pack

**Treningowe:**
- Exercise Timeline — wykres progresji per ćwiczenie + plateau detection
- Smart Rest Timer — czas odpoczynku oparty na typie ćwiczenia i intensywności %1RM
- Warmup Routine UI — checklist rozgrzewki + stretching z 30s timerem

**Wizualne:**
- Training Heatmap — GitHub-style grid aktywności (53×7, 5 poziomów)
- Share Workout Summary — generowanie PNG obrazu treningu (html2canvas-pro)

**Strava/Cardio:**
- Race Predictor — predykcje 5K/10K/HM/Marathon (Riegel formula)
- Training Load — TRIMP/CTL/ATL/TSB (Banister model, Fitness/Fatigue/Form chart)

**Infrastruktura:**
- Weekly Digest Email — Cloud Function, co poniedziałek o 8:00

**Testy:** 145 total (38+ nowych)

### v5.2.0 (2026-03-09) — Strava Deep Integration

- 9 dedykowanych komponentów Strava (Calories, Elevation, HR Zones, Pace, Monthly, Weekly Km, etc.)
- SeasonFilter, StravaSummaryStats, CardioPersonalBests
- StravaTab jako osobny tab w Analytics
- chart-config.ts, strava-utils.ts (shared helpers)

### v5.1.0 (2026-03-08) — AI Onboarding + Plan Management + Strava Views

**AI Onboarding:**
- Wizard 5 kroków (cel, doświadczenie, dni, sprzęt, kontuzje)
- AI generowanie planu treningowego (OpenAI)
- Review planu z ExerciseSwapDialog
- Auto-detect istniejących użytkowników (skip onboarding)
- Przywracanie domyślnego planu (fix bug v5.0)

**Plan Management:**
- Rozszerzony `Weekday` type (7 dni zamiast 3)
- Dynamiczny `getTrainingSchedule()` (akceptuje weeks + days)
- `planDurationWeeks`, `planStartDate`, `currentWeek`, `isPlanExpired`
- Banner "Plan się skończył" na Dashboard
- Strona NewPlan do generowania nowego planu

**Strava Views:**
- Aktywności Strava w planie tygodnia (Dashboard)
- Aktywności Strava pod kalendarzem (TrainingPlan)
- Aktywności Strava w podsumowaniu (Analytics)
- AI podsumowanie tygodnia z Strava (AIChat)
- Strava sync: 365 dni lookback + logi

**Inne:**
- Klikalne ukończone treningi w Analytics → WorkoutDay
- `GeneratedPlan` interface (days + planDurationWeeks)
- `ExerciseReplacement` type
- `OnboardingAnswers` interface

### v5.0.0 (2026-03-08) — AI Onboarding + Strava Sync

- AI-powered onboarding flow
- Strava integration (Cloud Functions + OAuth)
- Exercise library (60+ ćwiczeń)
- ExerciseSwapDialog
- AI Coach insights na Dashboard

### v4.0.0 (2026-03-08) — Multi-User + Admin + Strava

**Multi-User:**
- Multi-email whitelist (`VITE_ALLOWED_EMAILS`)
- UserContext z profilami (`users/{uid}`)
- userId na wszystkich danych
- Per-user plany treningowe
- Firestore composite indexes + security rules

**Admin Panel:**
- AdminRoute guard
- AdminDashboard (lista użytkowników)
- UserPlanEditor (edycja planu per-user)

**Strava Integration:**
- Cloud Functions (stravaAuthUrl, stravaCallback, stravaSync)
- OAuth bridge (`strava-callback.html`)
- useStrava hook
- StravaActivityCard

### v3.1.0 (2026-02-23) — Quick Wins + Stabilność

- Firebase config do .env
- Strict TypeScript
- 25 testów Vitest
- React.memo na ExerciseCard
- Debounce 500ms
- Error Boundary
- Dark mode
- Timer odpoczynku
- Wykresy recharts
- Podpowiedź poprzedniego ciężaru

### v3.0.0 (2026-01-28) — Warmup + Notatki + Edycja

- Seria rozgrzewkowa (warmup)
- Notatki do ćwiczeń
- Tryb edycji bez auto-save
- Nawigacja historyczna z ?date=
- Suma powtórzeń w podsumowaniu

---

## Diagram zależności

```
App.tsx
│
├── useAuth() ────────────────────────────────────────────┐
│                                                         │
├─ NIE auth → Login.tsx                                   │
│                                                         │
└─ TAK auth → UserProvider                                │
             │                                            │
             ├─ isNewUser → Onboarding.tsx                │
             │              └── useTrainingPlan()          │
             │              └── generateTrainingPlan()     │
             │              └── ExerciseSwapDialog         │
             │                                            │
             └─ !isNewUser → HashRouter → Layout          │
                             │                            │
                             ├── Dashboard.tsx             │
                             │   ├── useFirebaseWorkouts() │
                             │   ├── useTrainingPlan()     │
                             │   ├── useStrava()           │
                             │   ├── useAICoach()          │
                             │   ├── StatsCard.tsx         │
                             │   ├── TrainingDayCard.tsx   │
                             │   └── StravaActivityCard    │
                             │                            │
                             ├── WorkoutDay.tsx            │
                             │   ├── useFirebaseWorkouts()─┘
                             │   ├── ExerciseCard.tsx
                             │   └── RestTimer.tsx
                             │
                             ├── Analytics.tsx
                             │   ├── useFirebaseWorkouts()
                             │   ├── useStrava()
                             │   └── recharts
                             │
                             ├── AIChat.tsx
                             │   ├── useFirebaseWorkouts()
                             │   ├── useStrava()
                             │   └── callOpenAI()
                             │
                             ├── TrainingPlan.tsx
                             │   ├── useTrainingPlan()
                             │   ├── useStrava()
                             │   └── StravaActivityCard
                             │
                             ├── NewPlan.tsx
                             │   ├── useTrainingPlan()
                             │   ├── generateTrainingPlan()
                             │   └── ExerciseSwapDialog
                             │
                             ├── Settings.tsx
                             │   └── useStrava()
                             │
                             └── admin/
                                 ├── AdminDashboard.tsx
                                 └── UserPlanEditor.tsx
                                     └── useTrainingPlan()
```
