// Z125: kompaktowy kontekst dnia dla zegarka Garmin (garminDay).
// Limit praktyczny makeWebRequest to ~8KB odpowiedzi (BLE) — stąd skrócone klucze
// i serie jako pary [reps, weightKg]. Cel serii liczony UPROSZCZONĄ double progression
// (parytet reguł progress/hold z decideNextSet klienta pilnowany testami; plateau/ból/
// deload zostają na telefonie — v2 po wydzieleniu silnika do wspólnego pakietu).

import type { GarminTrackingType } from "./garmin-ingest";

export interface GarminPlanExercise {
  id: string;
  name: string;
  sets: string;
  /** Additive X25 field; old plan docs omit it and resolve by name/history. */
  tracking?: GarminTrackingType;
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
    /** Snapshot nazwy (architektura snapshot+resolver). */
    name?: string;
    sets: Array<{
      reps: number;
      weight: number;
      completed: boolean;
      isWarmup?: boolean;
      durationSec?: number;
      distanceM?: number;
      assistWeight?: number;
    }>;
  }>;
}

/** Practical Connect IQ makeWebRequest response budget over the phone bridge. */
export const GARMIN_RESPONSE_MAX_BYTES = 8 * 1024;

export const isGarminResponseWithinLimit = (payload: unknown): boolean => {
  try {
    return Buffer.byteLength(JSON.stringify(payload), "utf8") <= GARMIN_RESPONSE_MAX_BYTES;
  } catch {
    return false;
  }
};

export interface GarminRecentExercise {
  /** exerciseId. */
  i: string;
  /** Nazwa (snapshot). */
  n: string;
  /** Ostatni ciężar kg (0 przy bodyweight). */
  w: number;
  /** Powtórzenia z najcięższej serii ostatniego wykonania. */
  p: number;
  /** Non-default tracking; omitted for legacy weight_reps. */
  k?: GarminTrackingType;
  /** duration seconds / distance metres / assistance kg. */
  d?: number;
  m?: number;
  a?: number;
}

type GarminCompactSet = [number, number, number?, number?, number?, (0 | 1)?];

const trackingFromSet = (set: GarminWorkout["exercises"][number]["sets"][number]): GarminTrackingType => {
  if ((set.assistWeight ?? 0) > 0) return "assisted_bodyweight";
  if ((set.distanceM ?? 0) > 0 || ((set.durationSec ?? 0) > 0 && set.weight > 0)) {
    return "weight_distance_duration";
  }
  if ((set.durationSec ?? 0) > 0) return "duration";
  return "weight_reps";
};

/** Ostatnio wykonywane ćwiczenia (dedup po exerciseId, najnowsze najpierw) —
 *  źródło wyboru dla szybkiego treningu na zegarku. */
export function buildRecentExercises(workouts: GarminWorkout[], limit = 10): GarminRecentExercise[] {
  const byId = new Map<string, {
    n: string;
    w: number;
    p: number;
    date: string;
    k?: GarminTrackingType;
    d?: number;
    m?: number;
    a?: number;
  }>();
  for (const w of workouts) {
    if (!w.completed || !Array.isArray(w.exercises)) continue;
    for (const ex of w.exercises) {
      if (!Array.isArray(ex.sets)) continue;
      const working = ex.sets.filter((s) => s.completed && !s.isWarmup);
      if (working.length === 0) continue;
      const existing = byId.get(ex.exerciseId);
      if (existing && existing.date >= w.date) continue;
      const lastSet = working.at(-1)!;
      const weight = Math.max(...working.map((s) => s.weight));
      const reps = Math.max(...working.filter((s) => s.weight === weight).map((s) => s.reps));
      const tracking = trackingFromSet(lastSet);
      byId.set(ex.exerciseId, {
        n: ex.name ?? ex.exerciseId,
        w: weight,
        p: reps,
        date: w.date,
        ...(tracking !== "weight_reps" ? { k: tracking } : {}),
        ...(lastSet.durationSec !== undefined ? { d: lastSet.durationSec } : {}),
        ...(lastSet.distanceM !== undefined ? { m: lastSet.distanceM } : {}),
        ...(lastSet.assistWeight !== undefined ? { a: lastSet.assistWeight } : {}),
      });
    }
  }
  return [...byId.entries()]
    .sort((a, b) => (a[1].date < b[1].date ? 1 : a[1].date > b[1].date ? -1 : 0))
    .slice(0, limit)
    .map(([i, e]) => ({
      i, n: e.n, w: e.w, p: e.p,
      ...(e.k ? { k: e.k } : {}),
      ...(e.d !== undefined ? { d: e.d } : {}),
      ...(e.m !== undefined ? { m: e.m } : {}),
      ...(e.a !== undefined ? { a: e.a } : {}),
    }));
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
    /** Tracking type; legacy client ignores it and defaults to reps/weight. */
    k: GarminTrackingType;
    /** [reps, kg, durationSec?, distanceM?, assistKg?, warmup?]. */
    s: GarminCompactSet[];
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

const BUILTIN_TRACKING_BY_NAME: Record<string, GarminTrackingType> = {
  "plank": "duration",
  "plank boczny (side plank)": "duration",
  "plank z dotykaniem barków": "duration",
  "izometryczny chwyt farmera (farmer's hold)": "weight_distance_duration",
  "spacer farmera (farmer's walk)": "weight_distance_duration",
  "podciąganie wspomagane na maszynie": "assisted_bodyweight",
  "dipy wspomagane na maszynie": "assisted_bodyweight",
};

const latestCompletedSet = (
  workouts: GarminWorkout[],
  exerciseId: string,
): GarminWorkout["exercises"][number]["sets"][number] | null => {
  let bestDate = "";
  let result: GarminWorkout["exercises"][number]["sets"][number] | null = null;
  for (const workout of workouts) {
    if (!workout.completed || workout.date < bestDate) continue;
    const exercise = workout.exercises.find((candidate) => candidate.exerciseId === exerciseId);
    const completed = exercise?.sets.filter((set) => set.completed) ?? [];
    if (completed.length > 0 && (workout.date > bestDate || result === null)) {
      bestDate = workout.date;
      result = completed.at(-1)!;
    }
  }
  return result;
};

const resolveTracking = (
  exercise: GarminPlanExercise,
  workouts: GarminWorkout[],
  trackingByName: Record<string, GarminTrackingType>,
): GarminTrackingType => {
  if (exercise.tracking) return exercise.tracking;
  const override = trackingByName[exercise.name.toLocaleLowerCase("pl")];
  if (override) return override;
  const builtin = BUILTIN_TRACKING_BY_NAME[exercise.name.toLocaleLowerCase("pl")];
  if (builtin) return builtin;
  const historical = latestCompletedSet(workouts, exercise.id);
  return historical ? trackingFromSet(historical) : "weight_reps";
};

const compactSet = (
  tracking: GarminTrackingType,
  target: { reps: number; weight: number } | null,
  previous: GarminWorkout["exercises"][number]["sets"][number] | null,
): GarminCompactSet => {
  const reps = tracking === "assisted_bodyweight"
    ? previous?.reps ?? target?.reps ?? 0
    : target?.reps ?? (tracking === "weight_reps" ? 0 : previous?.reps ?? 0);
  const weight = tracking === "weight_reps"
    ? target?.weight ?? 0
    : previous?.weight ?? 0;
  if (tracking === "weight_reps") return [reps, weight];
  if (tracking === "duration") return [0, 0, previous?.durationSec ?? 0];
  if (tracking === "weight_distance_duration") {
    return previous?.isWarmup
      ? [reps, weight, previous?.durationSec ?? 0, previous?.distanceM ?? 0, previous?.assistWeight ?? 0, 1]
      : [reps, weight, previous?.durationSec ?? 0, previous?.distanceM ?? 0];
  }
  return previous?.isWarmup
    ? [reps, 0, 0, 0, previous?.assistWeight ?? 0, 1]
    : [reps, 0, 0, 0, previous?.assistWeight ?? 0];
};

export function buildGarminDayContext(
  planDays: GarminPlanDay[],
  workouts: GarminWorkout[],
  date: string,
  pinnedNotesByName: Record<string, string>,
  trackingByName: Record<string, GarminTrackingType> = {},
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
      const previous = latestCompletedSet(workouts, exercise.id);
      const tracking = resolveTracking(exercise, workouts, trackingByName);

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
      const sets = Array.from({ length: count }, () => compactSet(tracking, target, previous));

      return {
        i: exercise.id,
        n: exercise.name,
        k: tracking,
        ...(target ? { t: `${formatKg(target.weight)} kg × ${target.reps}` } : {}),
        ...(note ? { p: note.slice(0, NOTE_MAX) } : {}),
        s: sets,
      };
    }),
  };
}
