// Trening próbny przewodnika: dane przykładowe (kanoniczne nazwy z biblioteki,
// lokalizowane w UI przez localizeExerciseName). Ciężar okrągły w jednostce
// usera: kg albo lb; w stanie zawsze kanonicznie kg.
import type { Exercise } from '@/data/trainingPlan';

export interface PracticeExercise {
  exercise: Exercise;
  kg: number;
  lbs: number;
  reps: number;
}

export const PRACTICE_EXERCISES: PracticeExercise[] = [
  {
    exercise: { id: 'practice-1', name: 'Wyciskanie hantli na ławce płaskiej', sets: '3 x 8', instructions: [] },
    kg: 20,
    lbs: 45,
    reps: 8,
  },
  {
    exercise: { id: 'practice-2', name: 'Wiosłowanie hantlem jednorącz (Laty)', sets: '3 x 10', instructions: [] },
    kg: 14,
    lbs: 30,
    reps: 10,
  },
];

/** Zamiana w próbie: stała lista z biblioteki, bez pickera (ten czyta chmurę). */
export const PRACTICE_SWAP_OPTIONS = [
  'Wyciskanie sztangi na ławce płaskiej',
  'Rozpiętki hantlami',
  'Wiosłowanie hantlami na ławce (przodem)',
];
