// Z125: kompaktowy kontekst dnia dla zegarka Garmin (garminDay).
// Limit praktyczny makeWebRequest to ~8KB odpowiedzi (BLE) — stąd skrócone klucze
// i serie jako pary [reps, weightKg]. Cel serii liczony UPROSZCZONĄ double progression
// (parytet reguł progress/hold z decideNextSet klienta pilnowany testami; plateau/ból/
// deload zostają na telefonie — v2 po wydzieleniu silnika do wspólnego pakietu).

export interface GarminPlanExercise {
  id: string;
  name: string;
  sets: string;
}

export interface GarminPlanDay {
  id: string;
  dayName: string;
  weekday: string;
  focus?: string;
  exercises: GarminPlanExercise[];
}

export interface GarminWorkout {
  date: string;
  completed: boolean;
  exercises: Array<{
    exerciseId: string;
    sets: Array<{ reps: number; weight: number; completed: boolean; isWarmup?: boolean }>;
  }>;
}

export interface GarminDayContext {
  v: 1;
  /** Data YYYY-MM-DD. */
  d: string;
  /** dayId planu. */
  y: string;
  /** Nazwa dnia. */
  n: string;
  /** Focus. */
  f?: string;
  e: Array<{
    /** exerciseId. */
    i: string;
    /** Nazwa (snapshot — sesja z zegarka nie potrzebuje planu). */
    n: string;
    /** Cel serii, gotowy label np. "62.5 kg × 6". */
    t?: string;
    /** Przypięta notatka (X14A), przycięta. */
    p?: string;
    /** Working sets jako [reps, weightKg] — pre-fill do odhaczania. */
    s: Array<[number, number]>;
  }>;
}

const NOTE_MAX = 140;
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

const weekdayOf = (date: string): string => {
  const [y, m, d] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
};

const parseRepRange = (setsStr: string): { min: number; max: number } => {
  const range = setsStr.match(/(\d+)\s*-\s*(\d+)/);
  if (range) return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  const single = setsStr.match(/x\s*(\d+)/i);
  const n = single ? parseInt(single[1], 10) : 8;
  return { min: n, max: n };
};

const parseSetCount = (setsStr: string): number => {
  const match = setsStr.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 3;
};

const formatKg = (kg: number): string =>
  Number.isInteger(kg) ? String(kg) : String(Math.round(kg * 10) / 10);

/** Ostatnie wykonanie ćwiczenia: max ciężar i najlepsze powtórzenia z ostatniego dnia. */
const lastExecution = (workouts: GarminWorkout[], exerciseId: string): { weight: number; reps: number } | null => {
  let bestDate = "";
  let result: { weight: number; reps: number } | null = null;
  for (const w of workouts) {
    if (!w.completed || w.date < bestDate) continue;
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      const working = ex.sets.filter((s) => s.completed && !s.isWarmup && s.weight > 0);
      if (working.length === 0) continue;
      const weight = Math.max(...working.map((s) => s.weight));
      const reps = Math.max(...working.map((s) => s.reps));
      if (w.date > bestDate || result === null) {
        bestDate = w.date;
        result = { weight, reps };
      }
    }
  }
  return result;
};

export function buildGarminDayContext(
  planDays: GarminPlanDay[],
  workouts: GarminWorkout[],
  date: string,
  pinnedNotesByName: Record<string, string>,
): GarminDayContext | null {
  const weekday = weekdayOf(date);
  const day = planDays.find((d) => d.weekday === weekday);
  if (!day) return null;

  return {
    v: 1,
    d: date,
    y: day.id,
    n: day.dayName,
    ...(day.focus ? { f: day.focus } : {}),
    e: day.exercises.map((exercise) => {
      const count = parseSetCount(exercise.sets);
      const range = parseRepRange(exercise.sets);
      const last = lastExecution(workouts, exercise.id);

      let target: { reps: number; weight: number } | null = null;
      if (last) {
        if (last.reps >= range.max) {
          // Parytet z decideNextSet: góra zakresu => +2.5 kg, reps do dołu.
          target = { reps: range.min, weight: last.weight + 2.5 };
        } else if (last.reps < range.min) {
          target = { reps: range.min, weight: last.weight };
        } else {
          target = { reps: Math.min(last.reps + 1, range.max), weight: last.weight };
        }
      }

      const note = pinnedNotesByName[exercise.name];
      const sets: Array<[number, number]> = Array.from({ length: count }, () =>
        target ? [target.reps, target.weight] : [0, 0]);

      return {
        i: exercise.id,
        n: exercise.name,
        ...(target ? { t: `${formatKg(target.weight)} kg × ${target.reps}` } : {}),
        ...(note ? { p: note.slice(0, NOTE_MAX) } : {}),
        s: sets,
      };
    }),
  };
}
