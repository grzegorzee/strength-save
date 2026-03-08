# FitTracker - Dokumentacja Systemu v4.0.0

## Spis treści
1. [Architektura](#architektura)
2. [Struktura plików](#struktura-plików)
3. [Modele danych](#modele-danych)
4. [Routing](#routing)
5. [Komponenty](#komponenty)
6. [Hooki](#hooki)
7. [Przepływ danych](#przepływ-danych)
8. [Firebase](#firebase)
9. [Funkcjonalności](#funkcjonalności)
10. [Deployment](#deployment)

---

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    useAuth()                              │   │
│  │         (sprawdza autentykację Google OAuth)             │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                           │                                      │
│            ┌──────────────┴──────────────┐                      │
│            │ isAuthenticated?            │                      │
│            │                             │                      │
│      ┌─────┴─────┐              ┌───────┴───────┐              │
│      │   NIE     │              │      TAK      │              │
│      │ <Login/>  │              │ <HashRouter>  │              │
│      └───────────┘              └───────┬───────┘              │
│                                         │                       │
│                              ┌──────────┴──────────┐           │
│                              │      <Layout/>      │           │
│                              │  ┌──────────────┐   │           │
│                              │  │AppNavigation │   │           │
│                              │  │  AppHeader   │   │           │
│                              │  │   <Outlet/>  │   │           │
│                              │  └──────────────┘   │           │
│                              └─────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Technologie
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Firebase Firestore (baza danych) + Cloud Functions (Strava OAuth)
- **Auth:** Firebase Authentication (Google OAuth) + multi-email whitelist
- **Routing:** React Router DOM v6 (HashRouter dla GitHub Pages)
- **Deployment:** GitHub Pages via `gh-pages`
- **Integracje:** Strava API (import aktywności)

---

## Struktura plików

```
src/
├── App.tsx                    # Główna aplikacja, routing, auth wrapper
├── main.tsx                   # Entry point
├── index.css                  # Style globalne (Tailwind)
│
├── contexts/
│   └── UserContext.tsx         # UserProvider + useCurrentUser hook (multi-user)
│
├── components/
│   ├── Layout.tsx             # Wrapper z nawigacją i headerem
│   ├── AppHeader.tsx          # Nagłówek z nazwą użytkownika
│   ├── AppNavigation.tsx      # Boczne menu nawigacyjne
│   ├── AdminRoute.tsx         # Guard: wymaga roli admin
│   ├── ExerciseCard.tsx       # Karta ćwiczenia (sety, notatki, warmup)
│   ├── StravaActivityCard.tsx # Karta aktywności Strava
│   ├── StatsCard.tsx          # Kafelek statystyk
│   ├── TrainingDayCard.tsx    # Karta dnia treningowego
│   ├── MeasurementsForm.tsx   # Formularz pomiarów ciała
│   ├── Login.tsx              # Ekran logowania
│   └── ui/                    # Komponenty shadcn/ui
│
├── pages/
│   ├── Dashboard.tsx          # Strona główna + aktywności Strava
│   ├── DayPlan.tsx            # Plan na dzisiaj
│   ├── TrainingPlan.tsx       # Plan tygodniowy + kalendarz Strava
│   ├── WorkoutDay.tsx         # Aktywny trening / widok ukończonego
│   ├── Measurements.tsx       # Lista pomiarów
│   ├── Achievements.tsx       # Osiągnięcia użytkownika
│   ├── Settings.tsx           # Ustawienia konta + Strava
│   ├── StravaCallback.tsx     # OAuth callback handler
│   └── admin/
│       ├── AdminDashboard.tsx # Lista użytkowników, zarządzanie
│       └── UserPlanEditor.tsx # Edycja planu dowolnego użytkownika
│
├── hooks/
│   ├── useFirebaseWorkouts.ts # Hook do operacji Firebase (per-user)
│   ├── useTrainingPlan.ts     # Hook planu treningowego (per-user)
│   ├── useStrava.ts           # Hook integracji Strava
│   ├── useAuth.ts             # Autentykacja (multi-email whitelist)
│   └── use-toast.ts           # Powiadomienia toast
│
├── types/
│   ├── index.ts               # Typy WorkoutSession, BodyMeasurement, etc.
│   └── strava.ts              # Typy StravaActivity, StravaConnection
│
├── data/
│   └── trainingPlan.ts        # Definicja planu treningowego
│
└── lib/
    ├── firebase.ts            # Konfiguracja Firebase
    └── utils.ts               # Funkcje pomocnicze (cn)

functions/                     # Firebase Cloud Functions (Strava OAuth)
├── package.json
├── tsconfig.json
└── src/index.ts               # stravaAuthUrl, stravaCallback, stravaSync

scripts/
└── migrate-to-multiuser.mjs   # Migracja istniejących danych (dodanie userId)
```

---

## Modele danych

### SetData (seria treningowa)
```typescript
interface SetData {
  reps: number;       // Liczba powtórzeń
  weight: number;     // Ciężar w kg
  completed: boolean; // Czy seria ukończona
  isWarmup?: boolean; // Czy to seria rozgrzewkowa (opcjonalne)
}
```

### ExerciseProgress (postęp ćwiczenia)
```typescript
interface ExerciseProgress {
  exerciseId: string;   // ID ćwiczenia z trainingPlan
  sets: SetData[];      // Tablica serii
  notes?: string;       // Notatki do ćwiczenia (opcjonalne)
}
```

### WorkoutSession (sesja treningowa)
```typescript
interface WorkoutSession {
  id: string;                    // Unikalny ID (workout-{timestamp})
  userId: string;                // ID użytkownika (multi-user)
  dayId: string;                 // ID dnia treningowego (day-1, day-2, day-3)
  date: string;                  // Data w formacie YYYY-MM-DD
  exercises: ExerciseProgress[]; // Tablica postępów ćwiczeń
  completed: boolean;            // Czy trening ukończony
}
```

### BodyMeasurement (pomiar ciała)
```typescript
interface BodyMeasurement {
  id: string;         // Unikalny ID (measurement-{timestamp})
  userId: string;     // ID użytkownika (multi-user)
  date: string;       // Data pomiaru YYYY-MM-DD
  weight?: number;    // Waga w kg
  armLeft?: number;   // Obwód ramienia lewego
  armRight?: number;  // Obwód ramienia prawego
  chest?: number;     // Obwód klatki piersiowej
  waist?: number;     // Obwód talii
  hips?: number;      // Obwód bioder
  thighLeft?: number; // Obwód uda lewego
  thighRight?: number;// Obwód uda prawego
  calfLeft?: number;  // Obwód łydki lewej
  calfRight?: number; // Obwód łydki prawej
}
```

### StravaActivity (aktywność Strava)
```typescript
interface StravaActivity {
  id: string;
  userId: string;
  stravaId: number;
  name: string;
  type: string;         // "Run", "Ride", "Swim", "Walk", "Hike"
  date: string;         // YYYY-MM-DD
  distance?: number;    // metry
  movingTime?: number;  // sekundy
  elapsedTime?: number; // sekundy
  averageHeartrate?: number;
  maxHeartrate?: number;
  totalElevationGain?: number; // metry
  averageSpeed?: number; // m/s
  stravaUrl: string;
  syncedAt: string;     // ISO timestamp
}
```

### UserProfile (profil użytkownika)
```typescript
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  stravaConnected: boolean;
}
```

### Exercise (ćwiczenie - definicja)
```typescript
interface Exercise {
  id: string;           // Unikalny ID (ex-1-1, ex-1-2, ...)
  name: string;         // Nazwa ćwiczenia
  sets: string;         // Opis serii (np. "3 x 6-8")
  instructions: {       // Instrukcje wykonania
    title: string;
    content: string;
  }[];
  isSuperset?: boolean;     // Czy część superserii
  supersetGroup?: string;   // Grupa superserii
}
```

### TrainingDay (dzień treningowy - definicja)
```typescript
interface TrainingDay {
  id: string;              // day-1, day-2, day-3
  dayName: string;         // "Poniedziałek", "Środa", "Piątek"
  weekday: 'monday' | 'wednesday' | 'friday';
  focus: string;           // Główny cel treningu
  exercises: Exercise[];   // Lista ćwiczeń
}
```

---

## Routing

```
HashRouter (dla GitHub Pages)
│
├── /                    → Dashboard.tsx
├── /day                 → DayPlan.tsx
├── /plan                → TrainingPlan.tsx
├── /workout/:dayId      → WorkoutDay.tsx
│   └── ?date=YYYY-MM-DD   (opcjonalny parametr daty)
├── /measurements        → Measurements.tsx
├── /achievements        → Achievements.tsx
├── /progress            → Progress.tsx
├── /summary             → Summary.tsx
├── /plan/edit           → PlanEditor.tsx
├── /stats               → StatsDetail.tsx
├── /ai                  → AIPage.tsx
├── /exercises           → ExerciseLibrary.tsx
├── /settings            → Settings.tsx
├── /strava/callback     → StravaCallback.tsx
├── /admin               → AdminDashboard.tsx (wymaga roli admin)
└── /admin/plans/:userId → UserPlanEditor.tsx (wymaga roli admin)
```

### Parametry URL

**WorkoutDay** używa parametru `date` w query string:
- `/workout/day-1?date=2026-01-26` - otwiera trening z poniedziałku 26.01
- `/workout/day-1` (bez date) - używa dzisiejszej daty

---

## Komponenty

### Layout.tsx
**Odpowiedzialność:** Wrapper dla wszystkich stron, zawiera nawigację i header.

**Zależności:**
- `AppNavigation` - boczne menu
- `AppHeader` - nagłówek z tytułem strony
- `Outlet` (React Router) - renderuje aktualną stronę

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
**Odpowiedzialność:** Wyświetla i edytuje pojedyncze ćwiczenie.

**Props:**
```typescript
interface ExerciseCardProps {
  exercise: Exercise;        // Definicja ćwiczenia
  index: number;             // Numer w kolejności
  savedSets?: SetData[];     // Zapisane serie (z Firebase)
  savedNotes?: string;       // Zapisane notatki
  onSetsChange?: (sets: SetData[], notes?: string) => void; // Callback zmian
  isEditable?: boolean;      // Czy można edytować
}
```

**Funkcjonalności:**
- Seria rozgrzewkowa (pomarańczowa, z ikoną płomienia 🔥)
- Serie robocze (zielone gdy ukończone)
- Notatki do ćwiczenia (rozwijane)
- Instrukcje wykonania (rozwijane)
- Oznaczanie superserii

### WorkoutDay.tsx
**Odpowiedzialność:** Główna strona treningu z 3 trybami:

1. **Widok aktywnego treningu:**
   - Edycja serii (auto-save z debounce 300ms)
   - Przycisk "Zakończ trening" (fixed na dole)

2. **Widok ukończonego treningu:**
   - Podsumowanie (ćwiczenia, serie, powtórzenia)
   - Przycisk "Edytuj"

3. **Tryb edycji:**
   - Edycja bez auto-save (tylko lokalny state)
   - Przycisk "Zapisz zmiany" (zapisuje wszystko na raz)

**Handlery:**
- `handleSetsChange` - aktywny trening, auto-save do Firebase
- `handleSetsChangeLocal` - tryb edycji, tylko lokalny state
- `handleFinishEditing` - zapis wszystkich zmian z trybu edycji

---

## Hooki

### useFirebaseWorkouts.ts
**Główny hook** do wszystkich operacji na danych.

**Zwraca:**
```typescript
{
  // Stan
  workouts: WorkoutSession[];        // Wszystkie treningi
  measurements: BodyMeasurement[];   // Wszystkie pomiary
  isLoaded: boolean;                 // Czy dane załadowane
  error: string | null;              // Błąd (jeśli jest)

  // Treningi
  createWorkoutSession(dayId, date?) // Tworzy nową sesję
  updateExerciseProgress(sessionId, exerciseId, sets, notes?) // Aktualizuje ćwiczenie
  completeWorkout(sessionId)         // Oznacza jako ukończony
  getWorkoutsByDay(dayId)            // Pobiera treningi dla dnia
  getTodaysWorkout(dayId)            // Pobiera dzisiejszy trening
  getLatestWorkout(dayId)            // Pobiera ostatni trening
  deleteWorkout(workoutId)           // Usuwa trening
  cleanupEmptyWorkouts()             // Czyści duplikaty

  // Pomiary
  addMeasurement(measurement)        // Dodaje pomiar
  getLatestMeasurement()             // Pobiera ostatni pomiar

  // Statystyki
  getTotalWeight()                   // Całkowity tonaż (kg)
  getCompletedWorkoutsCount()        // Liczba ukończonych treningów

  // Import/Export
  exportData()                       // Eksport do JSON
  importData(jsonString)             // Import z JSON
}
```

**Subskrypcje Firebase:**
- `onSnapshot` na kolekcji `workouts` (sortowane po dacie desc)
- `onSnapshot` na kolekcji `measurements` (sortowane po dacie desc)

### useAuth.ts
**Autentykacja** z Google OAuth i multi-email whitelistą.

```typescript
// .env: VITE_ALLOWED_EMAILS=email1@gmail.com,email2@gmail.com
{
  user: User | null;        // Użytkownik Firebase
  isAuthenticated: boolean; // Czy zalogowany i na liście
  loading: boolean;         // Czy sprawdzanie trwa
  signInWithGoogle()        // Logowanie przez Google
  signOut()                 // Wylogowanie
}
```

### useStrava.ts
**Integracja Strava** - connect, sync, disconnect.

```typescript
const { activities, connection, isSyncing, error, connectStrava, syncActivities, disconnectStrava } = useStrava(userId);
```

### useTrainingPlan.ts
**Plan treningowy** per-user (Firebase `training_plans/{userId}`).

```typescript
const { plan, savePlan, updatePlan, isLoaded } = useTrainingPlan(userId);
```

---

## Przepływ danych

### Rozpoczęcie treningu
```
1. User klika "Rozpocznij trening" na DayPlan lub Dashboard
   │
2. navigate(`/workout/${dayId}?date=${today}`)
   │
3. WorkoutDay pobiera dayId z URL params i date z query string
   │
4. useEffect sprawdza czy istnieje workout dla (dayId, targetDate)
   │
   ├── TAK → Ładuje istniejące dane do exerciseSets/exerciseNotes
   │
   └── NIE → Pokazuje przycisk "Rozpocznij trening"
              │
              ↓
5. handleStartWorkout() → createWorkoutSession(dayId, targetDate)
   │
6. Firebase tworzy dokument w kolekcji 'workouts'
   │
7. onSnapshot aktualizuje lokalny state workouts[]
   │
8. useEffect wykrywa nowy workout → ustawia sessionId
```

### Zapis postępu
```
1. User zmienia wartość w ExerciseCard (reps/weight/completed)
   │
2. ExerciseCard wywołuje onSetsChange(sets, notes)
   │
3. WorkoutDay: handleSetsChange() lub handleSetsChangeLocal()
   │
   ├── Aktywny trening: handleSetsChange()
   │   │
   │   ├── Natychmiastowy update lokalnego state
   │   │
   │   └── Debounce 300ms → updateExerciseProgress()
   │       │
   │       └── Firebase updateDoc()
   │
   └── Tryb edycji: handleSetsChangeLocal()
       │
       └── Tylko lokalny state (bez Firebase)
           │
           ↓
       handleFinishEditing() → updateExerciseProgress() dla każdego ćwiczenia
```

### Nawigacja do przeszłego treningu
```
1. User klika na trening z listy (Dashboard/TrainingPlan)
   │
2. navigate(`/workout/${dayId}?date=${workout.date}`)
   │
3. WorkoutDay:
   │
   ├── targetDate = searchParams.get('date') || today
   │
   ├── isViewingPastWorkout = (targetDate !== today)
   │
   └── Szuka workouts.find(w => w.dayId === dayId && w.date === targetDate)
       │
       ├── Znaleziono + completed → Widok podsumowania z "Edytuj"
       │
       ├── Znaleziono + !completed → Kontynuacja treningu
       │
       └── Nie znaleziono + isPast → "Brak zapisanego treningu"
```

---

## Firebase

### Konfiguracja (`src/lib/firebase.ts`)
```typescript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "fittracker-workouts.firebaseapp.com",
  projectId: "fittracker-workouts",
  storageBucket: "fittracker-workouts.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};

export const db = getFirestore(app);
export const auth = getAuth(app);
```

### Kolekcje Firestore
```
fittracker-workouts (project)
│
├── users/                       # Profile użytkowników
│   └── {uid}/
│       ├── email: string
│       ├── displayName: string
│       ├── role: "admin" | "user"
│       ├── stravaConnected: boolean
│       ├── stravaTokens?: { accessToken, refreshToken, expiresAt }
│       ├── stravaAthleteId?: number
│       ├── stravaAthleteName?: string
│       └── stravaLastSync?: string (ISO)
│
├── workouts/                    # Sesje treningowe (per-user)
│   └── workout-{timestamp}/
│       ├── id, userId, dayId, date, completed
│       └── exercises: [{ exerciseId, sets, notes? }]
│
├── measurements/                # Pomiary ciała (per-user)
│   └── measurement-{timestamp}/
│       ├── id, userId, date, weight?, ...
│
├── training_plans/              # Plany treningowe (per-user)
│   └── {userId}/
│       └── days: TrainingDay[]
│
└── strava_activities/           # Aktywności Strava (per-user)
    └── {auto-id}/
        ├── userId, stravaId, name, type, date
        ├── distance?, movingTime?, averageSpeed?
        └── stravaUrl, syncedAt
```

### Composite Indexes (wymagane)
- `workouts`: userId ASC + date DESC
- `measurements`: userId ASC + date DESC
- `strava_activities`: userId ASC + date DESC

### Sanityzacja danych
Firebase nie akceptuje wartości `undefined`. Hook sanityzuje dane:
```typescript
const sanitizedSets = sets.map(set => ({
  reps: set.reps ?? 0,
  weight: set.weight ?? 0,
  completed: set.completed ?? false,
  ...(set.isWarmup && { isWarmup: true }), // Tylko jeśli true
}));
```

---

## Funkcjonalności

### 1. Plan treningowy
- 3 dni w tygodniu: Poniedziałek, Środa, Piątek
- Każdy dzień ma 5-6 ćwiczeń
- Ostatnie 2 ćwiczenia to superserie (A+B)
- `getTrainingSchedule()` generuje harmonogram na 12 tygodni

### 2. Serie treningowe
- Seria rozgrzewkowa (warmup) - pomarańczowa, ikona płomienia
- Serie robocze - zliczane w statystykach
- Każda seria ma: powtórzenia, ciężar, status ukończenia

### 3. Notatki
- Opcjonalne notatki do każdego ćwiczenia
- Przycisk "Dodaj notatkę" rozwija Textarea
- Zapisywane razem z seriami do Firebase

### 4. Tryb edycji
- Dostępny po ukończeniu treningu
- Edycja bez auto-save (zapobiega "mryganiu")
- Przycisk "Zapisz zmiany" zapisuje wszystko na raz

### 5. Pomiary ciała
- Formularz z 10 polami pomiarowymi
- Wyświetla datę ostatniego pomiaru
- Historia pomiarów w osobnej zakładce

### 6. Statystyki
- Ukończone treningi (count)
- Całkowity tonaż (suma kg×powtórzenia)
- Aktualna waga (z ostatniego pomiaru)
- Postęp miesięczny (% ukończonych treningów)

### 7. Osiągnięcia
- Ukończone treningi
- Podniesiony ciężar
- Osobiste rekordy

---

## Deployment

### GitHub Pages
```bash
# Build i deploy
npm run deploy

# Skrypt w package.json
"deploy": "gh-pages -d dist"
"predeploy": "npm run build"
```

### Vite config (`vite.config.ts`)
```typescript
export default defineConfig({
  base: '/strength-save/', // Ścieżka bazowa dla GitHub Pages
  plugins: [react()],
});
```

### HashRouter
Używamy `HashRouter` zamiast `BrowserRouter` dla kompatybilności z GitHub Pages:
```typescript
// Przykład URL
https://username.github.io/strength-save/#/workout/day-1?date=2026-01-26
```

---

## Zależności główne

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "firebase": "^10.x",
    "@radix-ui/react-*": "shadcn/ui components",
    "tailwindcss": "^3.x",
    "lucide-react": "ikony"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "gh-pages": "^6.x"
  }
}
```

---

## Diagram zależności komponentów

```
App.tsx
│
├── useAuth() ─────────────────────────────────────────────┐
│                                                          │
├─ NIE auth → Login.tsx                                    │
│                                                          │
└─ TAK auth → HashRouter                                   │
             │                                             │
             └── Layout.tsx                                │
                 │                                         │
                 ├── AppNavigation.tsx                     │
                 │                                         │
                 ├── AppHeader.tsx                         │
                 │                                         │
                 └── <Outlet/> renders:                    │
                     │                                     │
                     ├── Dashboard.tsx ──────┐             │
                     │   └── useFirebaseWorkouts()         │
                     │   └── StatsCard.tsx                 │
                     │   └── TrainingDayCard.tsx           │
                     │                                     │
                     ├── DayPlan.tsx ────────┤             │
                     │   └── useFirebaseWorkouts()         │
                     │                                     │
                     ├── TrainingPlan.tsx ───┤             │
                     │   └── trainingPlan (data)           │
                     │                                     │
                     ├── WorkoutDay.tsx ─────┤             │
                     │   └── useFirebaseWorkouts() ────────┘
                     │   └── ExerciseCard.tsx
                     │       └── SetData interface
                     │
                     ├── Measurements.tsx ───┤
                     │   └── useFirebaseWorkouts()
                     │   └── MeasurementsForm.tsx
                     │
                     └── Achievements.tsx ───┘
                         └── useFirebaseWorkouts()
```

---

## Changelog v4.0.0 (Multi-User + Admin + Strava)

### Multi-User
- ✅ Multi-email whitelist (`VITE_ALLOWED_EMAILS` comma-separated)
- ✅ UserContext z profilami użytkowników (`users/{uid}` w Firestore)
- ✅ userId na wszystkich danych (workouts, measurements, training_plans)
- ✅ Per-user plany treningowe (`training_plans/{userId}`)
- ✅ Izolacja danych - każdy użytkownik widzi tylko swoje dane
- ✅ Firestore composite indexes i security rules

### Admin Panel
- ✅ AdminRoute guard (wymaga roli `admin`)
- ✅ AdminDashboard - lista użytkowników z linkami do edycji planów
- ✅ UserPlanEditor - edycja planu dowolnego użytkownika (admin)
- ✅ Sekcja Admin w nawigacji (widoczna tylko dla admina)

### Strava Integration
- ✅ Firebase Cloud Functions (stravaAuthUrl, stravaCallback, stravaSync)
- ✅ Strava OAuth flow z bridge HTML (`strava-callback.html`)
- ✅ useStrava hook (connect, sync, disconnect, real-time activities)
- ✅ Settings page z podłączeniem/odłączeniem Strava
- ✅ StravaActivityCard z ikonami typu, dystansem, tempem, tętnem
- ✅ Aktywności Strava na Dashboard (plan tygodnia)
- ✅ Kropki Strava w kalendarzu (TrainingPlan)
- ✅ Automatyczny token refresh

### UI/UX
- ✅ Nazwa użytkownika w headerze (dropdown)
- ✅ Link "Ustawienia" w nawigacji
- ✅ Migracja danych (skrypt `scripts/migrate-to-multiuser.mjs`)

## Changelog v3.0.0

### Nowe funkcjonalności
- ✅ Seria rozgrzewkowa (warmup) - pomarańczowa, ikona płomienia
- ✅ Notatki do ćwiczeń
- ✅ Tryb edycji bez auto-save
- ✅ Nawigacja do przeszłych treningów z poprawną datą
- ✅ Suma powtórzeń w podsumowaniu
- ✅ Data ostatniego pomiaru w formularzu

### Naprawione błędy
- ✅ Plan tygodniowy pokazywał przyszły tydzień zamiast bieżącego
- ✅ Przycisk "Zapisz zmiany" skakał na mobile (fixed → static)
- ✅ Kliknięcie na przeszły trening pokazywało "Rozpocznij" zamiast podsumowania
- ✅ Usunięto kafelek "Seria treningowa" z Osiągnięć
- ✅ Usunięto wersję z nagłówka (zostaje tylko w nawigacji)
