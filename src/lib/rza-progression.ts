import type { WorkoutSession } from '@/types';
import { calculate1RM } from '@/lib/pr-utils';

// Silnik rekomendacji w stylu RZA (autoregulacja przez RPE/ból/jakość).
// Reguła (arkusz REKOMENDACJE/INSTRUKCJA):
//   Status OK + RPE <=8.5 + ból <=2 + jakość >=3  → dodaj inkrement (progress)
//   RPE >=9.5 lub ból >=4                         → odciąż (deload)
//   pozostałe                                     → powtórz (repeat)
// Metryki opcjonalne: bez RPE nie liczymy rekomendacji (zwracamy null → fallback do
// istniejących porad z zakresów powtórzeń). Brak bólu traktujemy jako 0, brak jakości jako OK.

export type RzaDecision = 'progress' | 'deload' | 'repeat';

export interface RzaAdvice {
  decision: RzaDecision;
  increment: number;
  /** Sugerowany ciężar na następny trening (kg). */
  nextKg: number;
  /** Ciężar bazowy (best z ostatniej sesji), na którym oparto decyzję. */
  lastKg: number;
}

// Inkrementy z arkusza CWICZENIA (kolumna "Inkrement kg"), kluczowane nazwą RZA.
// 0 = brak progresji ciężarem (finisher/core/kondycja).
export const RZA_INCREMENTS: Record<string, number> = {
  'Przysiad tylny': 5,
  'Podciaganie nachwytem': 2.5,
  'Wioslowanie chest-supported': 2.5,
  'Unoszenie bokiem linka/hantle': 1,
  'Reverse pec deck / rear delt fly': 1,
  'Core: dead bug / plank RKC': 0,
  'Air bike / farmer walk': 0,
  'Wyciskanie sztangi lezac': 2.5,
  'RDL - martwy rumunski': 5,
  'Wyciskanie hantli siedzac / landmine': 2,
  'Sciaganie drazka neutralnie': 2.5,
  'Face pull z rotacja': 1,
  'AMRAP: swing/pompki/bike': 0,
  'Trap bar deadlift / Front squat': 5,
  'Cable pullover / straight-arm pulldown': 2,
  'Machine/cable lateral raise': 1,
  'Cable curl / modlitewnik': 1,
  'Ski erg / sled / farmer': 0,
};

// Domyślny inkrement dla ćwiczeń spoza RZA (każdy plan może mieć autoregulację).
const DEFAULT_INCREMENT = 2.5;

export const getRzaIncrement = (exerciseName: string): number => {
  const v = RZA_INCREMENTS[exerciseName];
  return v === undefined ? DEFAULT_INCREMENT : v;
};

export interface LastSessionMetrics {
  date: string;
  bestKg: number;
  estimated1RM: number;
  rpe?: number;
  pain?: number;
  quality?: number;
}

// Najświeższa ukończona sesja zawierająca dane ćwiczenie: najlepszy ciężar serii roboczej
// + metryki autoregulacji zapisane dla tego ćwiczenia.
export const getLastSessionMetrics = (
  workouts: WorkoutSession[],
  exerciseId: string,
): LastSessionMetrics | null => {
  const sessions = workouts
    .filter(w => w.completed)
    .filter(w => w.exercises.some(e => e.exerciseId === exerciseId))
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const w of sessions) {
    const ex = w.exercises.find(e => e.exerciseId === exerciseId);
    if (!ex) continue;
    const working = ex.sets.filter(s => s.completed && !s.isWarmup && s.weight > 0);
    if (working.length === 0) continue;
    const bestKg = Math.max(...working.map(s => s.weight));
    const estimated1RM = Math.max(...working.map(s => calculate1RM(s.weight, s.reps)));
    return {
      date: w.date,
      bestKg,
      estimated1RM,
      ...(ex.rpe !== undefined && { rpe: ex.rpe }),
      ...(ex.pain !== undefined && { pain: ex.pain }),
      ...(ex.quality !== undefined && { quality: ex.quality }),
    };
  }
  return null;
};

export interface RzaProgressionInput {
  exerciseName: string;
  bestKg: number;
  rpe?: number;
  pain?: number;
  quality?: number;
}

// Decyzja progresji na podstawie metryk ostatniej sesji. null gdy nie da się doradzić
// (brak RPE albo ćwiczenie bez progresji ciężarem).
export const getRzaProgression = (input: RzaProgressionInput): RzaAdvice | null => {
  const increment = getRzaIncrement(input.exerciseName);
  if (increment === 0) return null;               // finisher/core — bez progresji ciężarem
  if (input.rpe === undefined) return null;        // bez RPE brak autoregulacji
  if (!(input.bestKg > 0)) return null;            // brak ciężaru bazowego

  const pain = input.pain ?? 0;       // brak wpisu = brak bólu
  const quality = input.quality ?? 5; // brak wpisu = technika OK

  let decision: RzaDecision;
  if (input.rpe >= 9.5 || pain >= 4) {
    decision = 'deload';
  } else if (input.rpe <= 8.5 && pain <= 2 && quality >= 3) {
    decision = 'progress';
  } else {
    decision = 'repeat';
  }

  const round = (v: number) => Math.max(0, Math.round(v * 2) / 2); // do 0.5 kg
  const nextKg =
    decision === 'progress' ? round(input.bestKg + increment)
    : decision === 'deload' ? round(input.bestKg - increment)
    : round(input.bestKg);

  return { decision, increment, nextKg, lastKg: round(input.bestKg) };
};

// Wygodne połączenie: policz rekomendację wprost z historii treningów.
export const getRzaAdvice = (
  workouts: WorkoutSession[],
  exerciseId: string,
  exerciseName: string,
): RzaAdvice | null => {
  const last = getLastSessionMetrics(workouts, exerciseId);
  if (!last) return null;
  return getRzaProgression({
    exerciseName,
    bestKg: last.bestKg,
    rpe: last.rpe,
    pain: last.pain,
    quality: last.quality,
  });
};
