// Centralne typy danych aplikacji Strength Save

export interface ExerciseReplacement {
  name: string;
  sets: string;
  videoUrl?: string;
  category?: string;
}

export interface SetData {
  reps: number;
  weight: number;
  completed: boolean;
  isWarmup?: boolean;
}

// Metryki autoregulacji per ćwiczenie (Faza 2 — model RZA). Wszystkie opcjonalne:
// stare treningi bez nich działają bez zmian, a plany które ich nie używają po prostu ich nie wpisują.
export interface ExerciseMetrics {
  /** RPE najtrudniejszej serii (5-10, krok 0.5). 8 = ~2 powt. w zapasie. */
  rpe?: number;
  /** Ból stawowy 0-10. 0-2 OK, 3 obserwuj, 4+ odciąż. */
  pain?: number;
  /** Jakość techniki 1-5. 5 = pełny ROM i kontrola. */
  quality?: number;
}

export interface ExerciseProgress {
  exerciseId: string;
  sets: SetData[];
  notes?: string;
  // Snapshot nazwy ćwiczenia z momentu treningu. Dzięki temu historia wyświetla się
  // poprawnie nawet po zmianie/nadpisaniu planu (exerciseId jest niestabilne między planami).
  name?: string;
  // Metryki autoregulacji (opcjonalne, patrz ExerciseMetrics).
  rpe?: number;
  pain?: number;
  quality?: number;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  dayId: string;
  date: string;
  exercises: ExerciseProgress[];
  completed: boolean;
  notes?: string;
  cycleId?: string;
  skippedExercises?: string[];
  // Snapshot etykiety dnia z momentu treningu (jak wyżej — odporność na zmianę planu).
  dayName?: string;
  dayFocus?: string;
  // Czas trwania treningu w sekundach (od startu do zakończenia) — pokazywany w podsumowaniu.
  durationSec?: number;
  // Znaczniki czasu (ms) — backup do policzenia czasu trwania niezależnie od durationSec.
  startedAt?: number;
  completedAt?: number;
  // Optimistic concurrency fields used by offline draft sync.
  updatedAt?: number;
  revision?: number;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: string;
  weight?: number;
  armLeft?: number;
  armRight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  thighLeft?: number;
  thighRight?: number;
  calfLeft?: number;
  calfRight?: number;
}
