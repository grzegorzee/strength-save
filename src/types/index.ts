// Centralne typy danych aplikacji FitTracker

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
}

export interface WorkoutSession {
  id: string;
  userId: string;
  dayId: string;
  date: string;
  exercises: ExerciseProgress[];
  completed: boolean;
  notes?: string;
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
