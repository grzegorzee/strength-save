// Z160: czyste funkcje statystyk digestu — port sprawdzonej logiki klienta
// (src/lib/summary-utils.ts setTonnage, src/lib/pr-utils.ts detectNewPRs).
// Metoda tonażu MUSI zgadzać się z apką, inaczej mail pokazuje inne liczby niż
// dashboard. Guardy na kształt dokumentu: crash 2026-07-20 (rekord bez exercises)
// nie może cicho wykluczać usera z wysyłki.

export interface DigestSet {
  reps?: number;
  weight?: number;
  completed?: boolean;
  isWarmup?: boolean;
  durationSec?: number;
  distanceM?: number;
}

export interface DigestExercise {
  exerciseId?: string;
  name?: string;
  sets?: DigestSet[];
}

export interface DigestWorkout {
  userId?: string;
  completed?: boolean;
  date?: string;
  durationSec?: number;
  startedAt?: number;
  completedAt?: number;
  exercises?: DigestExercise[];
}

export const workoutExercises = (w: DigestWorkout | null | undefined): DigestExercise[] =>
  Array.isArray(w?.exercises) ? w!.exercises! : [];

export const exerciseSets = (ex: DigestExercise | null | undefined): DigestSet[] =>
  Array.isArray(ex?.sets) ? ex!.sets! : [];

// Port setTonnage (src/lib/summary-utils.ts:29-36): zwykłe serie reps x weight;
// serie czasowe/dystansowe z ciężarem wchodzą jako ciężar x 1; rozgrzewki nie liczą się.
export const setTonnage = (set: DigestSet | null | undefined): number => {
  if (!set?.completed || set.isWarmup) return 0;
  const reps = Number(set.reps) || 0;
  const weight = Number(set.weight) || 0;
  if (reps > 0) return reps * weight;
  if (((set.durationSec ?? 0) > 0 || (set.distanceM ?? 0) > 0) && weight > 0) return weight;
  return 0;
};

// Port calculate1RM (Epley, src/lib/pr-utils.ts:6-10).
export const calculate1RM = (weight: number, reps: number): number => {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

export interface WeekStats {
  sessions: number;
  workingSets: number;
  reps: number;
  tonnageKg: number;
  /** Suma czasu; durationSec ?? (completedAt - startedAt); brak danych = 0 za sesję. */
  durationSec: number;
  /** Top 3 ćwiczenia wg tonażu, nazwy ze snapshotów (kanoniczne PL). */
  topExercises: Array<{ name: string; tonnageKg: number }>;
}

export const computeWeekStats = (workouts: DigestWorkout[]): WeekStats => {
  let workingSets = 0;
  let reps = 0;
  let tonnageKg = 0;
  let durationSec = 0;
  const byExercise = new Map<string, number>();

  workouts.forEach((w) => {
    const sessionDuration = typeof w.durationSec === "number" && w.durationSec > 0
      ? w.durationSec
      : (typeof w.completedAt === "number" && typeof w.startedAt === "number" && w.completedAt > w.startedAt
        ? Math.round((w.completedAt - w.startedAt) / 1000)
        : 0);
    durationSec += sessionDuration;

    workoutExercises(w).forEach((ex) => {
      let exTonnage = 0;
      exerciseSets(ex).forEach((set) => {
        if (!set?.completed || set.isWarmup) return;
        workingSets += 1;
        reps += Number(set.reps) || 0;
        exTonnage += setTonnage(set);
      });
      tonnageKg += exTonnage;
      if (exTonnage > 0) {
        const name = ex.name || ex.exerciseId || "?";
        byExercise.set(name, (byExercise.get(name) ?? 0) + exTonnage);
      }
    });
  });

  const topExercises = [...byExercise.entries()]
    .map(([name, t]) => ({ name, tonnageKg: Math.round(t) }))
    .sort((a, b) => b.tonnageKg - a.tonnageKg)
    .slice(0, 3);

  return {
    sessions: workouts.length,
    workingSets,
    reps,
    tonnageKg: Math.round(tonnageKg),
    durationSec,
    topExercises,
  };
};

export interface DigestPR {
  exerciseName: string;
  type: "weight" | "1rm" | "both" | "reps";
  newValue: number;
  oldValue: number;
}

interface ExerciseBest {
  maxWeight: number;
  best1RM: number;
  maxReps: number;
}

const collectBests = (workouts: DigestWorkout[]): Map<string, ExerciseBest> => {
  const bests = new Map<string, ExerciseBest>();
  workouts.forEach((w) => {
    if (w.completed === false) return;
    workoutExercises(w).forEach((ex) => {
      const key = ex.name || ex.exerciseId;
      if (!key) return;
      const entry = bests.get(key) ?? { maxWeight: 0, best1RM: 0, maxReps: 0 };
      exerciseSets(ex).forEach((set) => {
        if (!set?.completed || set.isWarmup) return;
        const weight = Number(set.weight) || 0;
        const setReps = Number(set.reps) || 0;
        if (weight > 0) {
          if (weight > entry.maxWeight) entry.maxWeight = weight;
          const est = calculate1RM(weight, setReps);
          if (est > entry.best1RM) entry.best1RM = est;
        } else if (setReps > entry.maxReps) {
          entry.maxReps = setReps;
        }
      });
      bests.set(key, entry);
    });
  });
  return bests;
};

// Port logiki detectNewPRs (src/lib/pr-utils.ts:156): PR-y tygodnia względem
// historii SPRZED tygodnia. Uproszczenie backendu: bez typów śledzenia (duration/
// asysta) — ciężarowe po weight/1RM, serie bez ciężaru po powtórzeniach. PR liczy
// się tylko, gdy istnieje wcześniejsza baza (historical > 0) — jak w apce.
export const detectWeekPRs = (
  weekWorkouts: DigestWorkout[],
  historyWorkouts: DigestWorkout[],
): DigestPR[] => {
  const history = collectBests(historyWorkouts);
  const week = collectBests(weekWorkouts);
  const prs: DigestPR[] = [];

  week.forEach((current, name) => {
    const past = history.get(name);
    if (!past) return;
    const isWeightPR = current.maxWeight > past.maxWeight && past.maxWeight > 0;
    const is1RMPR = current.best1RM > past.best1RM && past.best1RM > 0;
    if (isWeightPR && is1RMPR) {
      prs.push({ exerciseName: name, type: "both", newValue: current.maxWeight, oldValue: past.maxWeight });
    } else if (isWeightPR) {
      prs.push({ exerciseName: name, type: "weight", newValue: current.maxWeight, oldValue: past.maxWeight });
    } else if (is1RMPR) {
      prs.push({ exerciseName: name, type: "1rm", newValue: current.best1RM, oldValue: past.best1RM });
    } else if (current.maxReps > past.maxReps && past.maxReps > 0) {
      prs.push({ exerciseName: name, type: "reps", newValue: current.maxReps, oldValue: past.maxReps });
    }
  });

  return prs.sort((a, b) => b.newValue - a.newValue);
};

export interface WeekComparison {
  sessionsDelta: number;
  tonnageDeltaKg: number;
}

export const compareWeeks = (current: WeekStats, previous: WeekStats): WeekComparison => ({
  sessionsDelta: current.sessions - previous.sessions,
  tonnageDeltaKg: current.tonnageKg - previous.tonnageKg,
});
