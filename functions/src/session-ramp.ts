// F3 x F6 (2026-09-29): cel sesji w oknie trybu / urlopu, na rampie po nim
// i po długiej przerwie od ćwiczenia — lustro reguł telefonu:
//  - okno: reducedMode (dowolny poziom) ?? urlop (src WorkoutDay: reducedMode ?? vacationToAdviceWindow),
//  - czynnik: 0.8 w oknie, po końcu 0.85 / 0.92 wg liczby UKOŃCZONYCH sesji ćwiczenia
//    po endDate (src/lib/reduced-mode.ts reducedModeAdviceFactor),
//  - baza: ostatnia sesja sprzed startu okna (reducedModeTargetWeight),
//  - weight_reps: baza x czynnik, krok 0.5 kg, powtórzenia = góra zakresu,
//  - bodyweight_loaded: z dociążeniem jak weight_reps (na dociążeniu), na samej MC
//    powtórzenia z bazy x czynnik (min. 1), bez kg (reducedModeBodyweightTarget),
//  - comeback >= 14 dni: -10% (weight_reps Math.round do 0.5; dociążenie w dół do 0.5),
//    sama MC bez comebacku (decideNextSet / decideBodyweightLoaded).
// Parytet: fixtures/cross-platform/session-ramp-v1.json (src/test/session-ramp-parity.test.ts).

export const REDUCED_MODE_ACTIVE_FACTOR = 0.8;
export const REDUCED_MODE_RAMP_FACTORS = [0.85, 0.92] as const;
export const COMEBACK_BREAK_DAYS = 14;

export interface RampWindow {
  startDate: string;
  endDate: string;
}

export interface RampSet {
  reps: number;
  weight: number;
  completed: boolean;
  isWarmup?: boolean;
}

export interface RampWorkout {
  date: string;
  completed: boolean;
  exercises: Array<{ exerciseId: string; name?: string; sets: RampSet[] }>;
}

interface HistoryPoint {
  date: string;
  maxWeight: number;
  bestReps: number;
}

/** Okno propozycji z kontekstu planu: tryb wygrywa z urlopem (jak telefon). */
export const rampWindowFromContext = (
  context: { reducedMode?: RampWindow | null; vacation?: RampWindow | null } | null | undefined,
): RampWindow | null => context?.reducedMode ?? context?.vacation ?? null;

const matches = (exercise: { exerciseId: string; name?: string }, exerciseId: string, name?: string): boolean =>
  exercise.exerciseId === exerciseId || (!!name && exercise.name === name);

/** Historia dzienna jak getExerciseHistory (weight_reps: kg > 0; loaded: reps > 0, max dociążenie). */
const exerciseHistory = (
  workouts: RampWorkout[],
  exerciseId: string,
  name: string | undefined,
  bodyweightLoaded: boolean,
): HistoryPoint[] => {
  const byDate = new Map<string, HistoryPoint>();
  const value = (p: HistoryPoint) => (bodyweightLoaded ? p.maxWeight * 10_000 + p.bestReps : p.maxWeight);
  for (const workout of workouts) {
    if (!workout.completed) continue;
    for (const exercise of workout.exercises ?? []) {
      if (!matches(exercise, exerciseId, name)) continue;
      const sets = (exercise.sets ?? []).filter((s) => s.completed && !s.isWarmup
        && (bodyweightLoaded ? s.reps > 0 : s.weight > 0));
      if (sets.length === 0) continue;
      const maxWeight = Math.max(...sets.map((s) => Math.max(0, s.weight)));
      const bestReps = bodyweightLoaded
        ? Math.max(...sets.filter((s) => Math.max(0, s.weight) === maxWeight).map((s) => s.reps))
        : Math.max(...sets.map((s) => s.reps));
      const point = { date: workout.date, maxWeight, bestReps };
      const existing = byDate.get(workout.date);
      if (!existing || value(point) > value(existing)) byDate.set(workout.date, point);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
};

const rampFactor = (
  window: RampWindow,
  dateISO: string,
  workouts: RampWorkout[],
  exerciseId: string,
  name: string | undefined,
): number | null => {
  if (dateISO < window.startDate) return null;
  if (dateISO <= window.endDate) return REDUCED_MODE_ACTIVE_FACTOR;
  const sessionsAfter = workouts.filter((w) => w.completed && w.date > window.endDate
    && (w.exercises ?? []).some((ex) => matches(ex, exerciseId, name)
      && (ex.sets ?? []).some((s) => s.completed && !s.isWarmup))).length;
  return REDUCED_MODE_RAMP_FACTORS[sessionsAfter] ?? null;
};

const dayDiff = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * Cel sesji z okna trybu / rampy / comebacku albo null (= zwykła progresja).
 * weight = kg do prefillu (dla bodyweight_loaded dociążenie, 0 = sama MC).
 */
export const sessionRampTarget = (params: {
  workouts: RampWorkout[];
  exerciseId: string;
  exerciseName?: string;
  dateISO: string;
  range: { min: number; max: number; isMax?: boolean };
  bodyweightLoaded: boolean;
  window: RampWindow | null;
}): { weight: number; reps: number } | null => {
  const { workouts, exerciseId, exerciseName, dateISO, range, bodyweightLoaded, window } = params;
  if (range.isMax) return null;
  const history = exerciseHistory(workouts, exerciseId, exerciseName, bodyweightLoaded);
  if (history.length === 0) return null;
  const last = history[history.length - 1];

  const factor = window ? rampFactor(window, dateISO, workouts, exerciseId, exerciseName) : null;
  if (window && factor !== null) {
    const baseline = [...history].reverse().find((p) => p.date < window.startDate) ?? last;
    if (bodyweightLoaded && baseline.maxWeight <= 0) {
      return { weight: 0, reps: Math.max(1, Math.round(baseline.bestReps * factor)) };
    }
    return { weight: Math.max(0, Math.round(baseline.maxWeight * factor * 2) / 2), reps: range.max };
  }

  if (dayDiff(last.date, dateISO) >= COMEBACK_BREAK_DAYS && last.maxWeight > 0) {
    const weight = bodyweightLoaded
      ? Math.max(0, Math.floor(last.maxWeight * 0.9 * 2) / 2)
      : Math.max(0, Math.round(last.maxWeight * 0.9 * 2) / 2);
    return { weight, reps: range.max };
  }
  return null;
};
