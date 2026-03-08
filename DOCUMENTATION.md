# FitTracker - Dokumentacja Systemu v5.1.0

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
10. [Strava Integration](#strava-integration)
11. [Onboarding i Plan Management](#onboarding-i-plan-management)
12. [Funkcjonalności](#funkcjonalności)
13. [Deployment](#deployment)
14. [Changelog](#changelog)

---

## Architektura

```
┌──────────────────────────────────────────────────────────────┐
│                           App.tsx                              │
│  ErrorBoundary → ThemeProvider → QueryClient → TooltipProvider │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐   │
│  │              AuthenticatedApp                          │   │
│  │         useAuth() — Google OAuth + whitelist            │   │
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
| Auth | Firebase Authentication | 12.x | Google OAuth + multi-email whitelist |
| Functions | Firebase Cloud Functions | - | Strava OAuth (Node.js) |
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
│   └── ui/                    # Komponenty shadcn/ui (~30 komponentów)
│
├── pages/
│   ├── Dashboard.tsx          # Strona główna: greeting, stats, AI insights, plan tygodnia, Strava, PR
│   ├── DayPlan.tsx            # Plan na dzisiaj
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
│   ├── Login.tsx              # Ekran logowania (Google OAuth)
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
│   ├── useAuth.ts             # Google OAuth + multi-email whitelist
│   └── use-toast.ts           # Toast hook (shadcn)
│
├── types/
│   ├── index.ts               # SetData, ExerciseProgress, WorkoutSession, BodyMeasurement, ExerciseReplacement
│   └── strava.ts              # StravaActivity, StravaConnection
│
├── data/
│   ├── trainingPlan.ts        # Domyślny plan 3x/tyg + typy + getTrainingSchedule()
│   └── exerciseLibrary.ts     # 60+ ćwiczeń z kategoriami i video URL
│
└── lib/
    ├── firebase.ts            # Konfiguracja Firebase (env variables)
    ├── ai-onboarding.ts       # generateTrainingPlan() — OpenAI
    ├── ai-coach.ts            # callOpenAI(), prepareCoachData(), analyzeWithAI()
    ├── pr-utils.ts            # detectNewPRs() — detekcja rekordów osobistych
    ├── summary-utils.ts       # calculateStreak(), getWeekBounds()
    ├── exercise-utils.ts      # parseSetCount(), createEmptySets(), sanitizeSets()
    └── utils.ts               # cn() (clsx + tailwind-merge)

functions/                     # Firebase Cloud Functions (Strava OAuth)
├── package.json
├── tsconfig.json
└── src/index.ts               # stravaAuthUrl, stravaCallback, stravaSync

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
├── /plan/edit           → PlanEditor.tsx
├── /analytics           → Analytics.tsx
│   └── ?tab=summary|charts|measurements|records
├── /ai                  → AIChat.tsx
├── /exercises           → ExerciseLibrary.tsx
├── /settings            → Settings.tsx
├── /new-plan            → NewPlan.tsx
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

### NewPlan.tsx — po wygaśnięciu planu

1. Podsumowanie starego planu (dni, focus)
2. Wybór nowego celu (strength/muscle/fat_loss/health)
3. Wybór dni w tygodniu (2-5)
4. Opcjonalne notatki/zmiany
5. "Wygeneruj nowy plan" → AI → review z swap → zatwierdzenie

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
  createWorkoutSession(dayId, date?)
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

  savePlan(newPlan, options?: { durationWeeks?, startDate? })
  swapExercise(dayId, exerciseId, newName, newSets?)
  updateExerciseSets(dayId, exerciseId, newSets)
  removeExercise(dayId, exerciseId)
  addExercise(dayId, exercise)
  moveExercise(dayId, exerciseId, direction: 'up' | 'down')
  resetToDefault()
}
```

### useAuth()
Autentykacja z Google OAuth i multi-email whitelistą.

```typescript
// .env: VITE_ALLOWED_EMAILS=email1@gmail.com,email2@gmail.com
{
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signInWithGoogle()
  signOut()
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

### Auto-save (aktywny trening)
```
1. User zmienia reps/weight/completed w ExerciseCard
   │
2. onSetsChange(sets, notes)
   │
3. handleSetsChange():
   ├── Natychmiastowy update lokalnego state
   └── Debounce 500ms → updateExerciseProgress(sessionId, exerciseId, sets, notes)
       │
       └── Firebase updateDoc()
```

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
│   ├── onboardingCompleted: boolean
│   ├── lastLogin: string (ISO)
│   ├── stravaConnected: boolean
│   ├── stravaTokens?: { accessToken, refreshToken, expiresAt }
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
└── strava_activities/{auto-id}  # Aktywności Strava
    ├── userId, stravaId, name, type, date
    ├── distance?, movingTime?, elapsedTime?
    ├── averageHeartrate?, maxHeartrate?
    ├── totalElevationGain?, averageSpeed?
    └── stravaUrl, syncedAt
```

### Composite Indexes (wymagane)
- `workouts`: userId ASC + date DESC
- `measurements`: userId ASC + date DESC
- `strava_activities`: userId ASC + date DESC

### Security Rules
- Użytkownicy czytają/piszą tylko swoje dane (`request.auth.uid == resource.data.userId`)
- Admin ma read all
- Training plans: owner może read/write swój plan

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

### 5. Timer odpoczynku
- Circular progress ring
- Presety: 60s, 90s, 120s, 180s
- Pauza, reset
- Wibracja po zakończeniu
- Dostępny w dolnym pasku aktywnego treningu

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

### 10. Strava
- OAuth via Cloud Functions
- Sync aktywności (365 dni lookback)
- Wyświetlanie na Dashboard, TrainingPlan, Analytics, AI Chat

### 11. Multi-User
- Multi-email whitelist
- Per-user data isolation
- Admin panel (zarządzanie planami)

### 12. Dark Mode
- ThemeProvider (next-themes)
- Toggle Sun/Moon w AppHeader
- CSS variables w index.css

### 13. PWA
- vite-plugin-pwa
- Service worker
- Manifest z ikonami
- PWAUpdatePrompt

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

## Changelog

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
