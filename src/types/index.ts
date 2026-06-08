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

export interface ExerciseProgress {
  exerciseId: string;
  sets: SetData[];
  notes?: string;
  // Snapshot nazwy ćwiczenia z momentu treningu. Dzięki temu historia wyświetla się
  // poprawnie nawet po zmianie/nadpisaniu planu (exerciseId jest niestabilne między planami).
  name?: string;
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
