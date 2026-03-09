# FitTracker - Dokumentacja Systemu v5.2.0

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
│   ├── DataManagement.tsx     # Export/import JSON (Settings)
│   ├── TypingIndicator.tsx    # Animacja "pisze..." w AI Chat
│   ├── NavLink.tsx            # Link nawigacji z aktywnym stanem
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
│   ├── useAIChat.ts           # Chat z AI trenerem (Firestore conversations)
│   ├── useAISwap.ts           # Zamiana ćwiczeń przez AI (3 alternatywy)
│   ├── useOnlineStatus.ts     # Online/offline detection + pending ops queue
│   ├── useAuth.ts             # Google OAuth + multi-email whitelist
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
│   └── warmupStretching.ts    # Rozgrzewka i stretching (nie zintegrowane w UI)
│
└── lib/
    ├── firebase.ts            # Konfiguracja Firebase (env variables)
    ├── ai-onboarding.ts       # generateTrainingPlan() — OpenAI
    ├── ai-coach.ts            # callOpenAI(), prepareCoachData(), analyzeWithAI(), getSwapSuggestions()
    ├── ai-chat.ts             # sendChatMessage() — chat z kontekstem treningowym
    ├── pr-utils.ts            # detectNewPRs(), calculate1RM() (Epley formula)
    ├── summary-utils.ts       # calculateStreak(), calculateTonnage(), getWeekBounds()
    ├── exercise-utils.ts      # parseRepRange(), getProgressionAdvice(), getRestDuration(), sanitizeSets()
    ├── offline-queue.ts       # Kolejka operacji offline (localStorage)
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

### useAIChat(userId)
Chat z AI trenerem — rozmowy przechowywane w Firestore `chat_conversations`.

```typescript
{
  conversations: ChatConversation[];
  activeConversation: ChatConversation | null;
  activeConversationId: string | null;
  isTyping: boolean;                     // AI generuje odpowiedź
  error: string | null;

  createConversation()                   // Nowy wątek
  deleteConversation(id)                 // Usuń wątek
  sendMessage(text)                      // Wyślij (auto-creates conv if none)
  setActiveConversation(id)              // Przełącz aktywną rozmowę
}
```

**Przepływ:**
1. User pisze wiadomość → `sendMessage(text)`
2. Jeśli brak aktywnej rozmowy → auto `createConversation()`
3. User message zapisany do Firestore natychmiast
4. `sendChatMessage()` → `callOpenAI()` z pełnym kontekstem treningowym
5. Assistant message dołączony i zapisany do Firestore
6. Tytuł rozmowy = pierwsze 50 znaków pierwszej wiadomości

**Uwaga:** Kolekcja `chat_conversations` jest **legacy** — brak `userId` na dokumentach, brak per-user isolation w security rules. Każdy zalogowany user widzi wszystkie rozmowy.

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
├── strava_activities/{auto-id}  # Aktywności Strava
│   ├── userId, stravaId, name, type, date
│   ├── distance?, movingTime?, elapsedTime?
│   ├── averageHeartrate?, maxHeartrate?
│   ├── totalElevationGain?, averageSpeed?
│   └── stravaUrl, syncedAt
│
└── chat_conversations/{convId}  # Rozmowy AI Chat (legacy)
    ├── id, title
    ├── createdAt, updatedAt (ISO)
    └── messages: [{ role, content, timestamp }]
```

**⚠️ `chat_conversations`:** Legacy collection — brak pola `userId`, brak per-user isolation. Dostęp: dowolny zalogowany user (read/write).

### Composite Indexes (wymagane)
- `workouts`: userId ASC + date DESC
- `measurements`: userId ASC + date DESC
- `strava_activities`: userId ASC + date DESC

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

    match /chat_conversations/{convId} {
      allow read, write: if request.auth != null;  // Legacy: brak per-user isolation
    }
  }
}
```

**Kluczowe zasady:**
- Per-user isolation: `userId == request.auth.uid` na workouts, measurements, strava_activities
- Admin: `role == 'admin'` → read/write all (z wyjątkiem strava_activities write)
- Users nie mogą zmieniać swojego `role` (zabezpieczenie przed eskalacją)
- Strava activities: write disabled (tylko Cloud Functions mają dostęp via admin SDK)
- Chat conversations: **brak per-user isolation** (legacy — do naprawy)

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

### Architektura

```
AIChat.tsx (UI)
  ↓
useAIChat(userId) (hook)
  ↓ sendMessage()
ai-chat.ts → sendChatMessage()
  ↓
  ├── prepareCoachData() — kontekst treningowy
  ├── history[] — dotychczasowe wiadomości
  └── callOpenAI() — gpt-5-mini
  ↓
Firestore: chat_conversations/{convId}
```

### Typy

```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;           // ISO
}

interface ChatConversation {
  id: string;                  // "chat-{timestamp}"
  title: string;               // Pierwsze 50 znaków pierwszej wiadomości
  createdAt: string;           // ISO
  updatedAt: string;           // ISO
  messages: ChatMessage[];
}
```

### Przepływ sendMessage()

1. User wpisuje tekst → `sendMessage(text)`
2. Jeśli brak aktywnej rozmowy → `createConversation()` (auto)
3. User message zapisany do Firestore natychmiast (optimistic update)
4. `sendChatMessage(history, workouts, measurements, plan)`:
   - Buduje system prompt z `CHAT_SYSTEM_PROMPT` + dane treningowe (JSON)
   - Dodaje pełną historię rozmowy
   - `callOpenAI()` → odpowiedź w plain text
5. Assistant message dołączony → zapis do Firestore
6. Real-time `onSnapshot()` → UI aktualizuje się automatycznie

### Quick Actions

`AIChat.tsx` oferuje szybkie akcje:
- **"Podsumuj tydzień"** — `buildWeekSummaryPrompt()` zbiera treningi + Strava z bieżącego tygodnia

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

### getRestDuration() — czas odpoczynku

| Kontekst | Czas |
|----------|------|
| Superset (pierwszy w parze) | **15 sekund** |
| Superset (drugi w parze) | **90 sekund** |
| Compound (index < 3) | **150 sekund** (2.5 min) |
| Isolation (index ≥ 3) | **75 sekund** (1.25 min) |

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
