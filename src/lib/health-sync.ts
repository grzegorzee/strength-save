import type { WorkoutSession, BodyMeasurement } from '@/types';
import type { ManualActivity } from '@/lib/manual-activity';

// Integracja Apple Health / Health Connect (Z116): warstwa abstrakcji.
// Cała logika apki mówi TYLKO do interfejsu HealthBridge — natywa za mostkiem,
// web dostaje no-op. Dane zdrowotne nie opuszczają urządzenia (twarda zasada).

export type HealthActivityType =
  | 'strength' | 'running' | 'cycling' | 'walking' | 'hiking'
  | 'swimming' | 'jumpRope' | 'hiit' | 'other';

export interface HealthWorkoutPayload {
  activityType: HealthActivityType;
  startMs: number;
  endMs: number;
  calories?: number;
}

export interface HealthWeightSample {
  kg: number;
  /** YYYY-MM-DD */
  date: string;
}

export interface HealthBridge {
  isAvailable: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  writeWorkout: (payload: HealthWorkoutPayload) => Promise<{ ok: boolean; error?: string }>;
  readLatestWeight: () => Promise<HealthWeightSample | null>;
}

/** Web / platforma bez Health: wszystko niedostępne, zero side-effectów. */
export const noopHealthBridge: HealthBridge = {
  isAvailable: async () => false,
  requestPermissions: async () => false,
  writeWorkout: async () => ({ ok: false, error: 'unavailable' }),
  readLatestWeight: async () => null,
};

/** Stan idempotencji syncu per dokument (localStorage per urządzenie). */
export type HealthSyncState = Record<string, { syncedAt: number; endMs: number }>;

const noonMs = (date: string): number => new Date(`${date}T12:00:00`).getTime();

/** Trening siłowy -> payload Health; null gdy nie da się ustalić czasu. */
export const mapWorkoutToHealth = (workout: WorkoutSession): HealthWorkoutPayload | null => {
  if (!workout.completed) return null;

  let startMs: number | null = null;
  let endMs: number | null = null;
  if (workout.startedAt && workout.completedAt && workout.completedAt > workout.startedAt) {
    startMs = workout.startedAt;
    endMs = workout.completedAt;
  } else if (workout.durationSec && workout.durationSec > 0) {
    startMs = noonMs(workout.date);
    endMs = startMs + workout.durationSec * 1000;
  }
  if (startMs === null || endMs === null) return null;

  return { activityType: 'strength', startMs, endMs };
};

const CARDIO_TO_HEALTH: Record<ManualActivity['type'], HealthActivityType> = {
  Run: 'running',
  Treadmill: 'running',
  Ride: 'cycling',
  IndoorRide: 'cycling',
  Walk: 'walking',
  Hike: 'hiking',
  Swim: 'swimming',
  JumpRope: 'jumpRope',
  HIIT: 'hiit',
  Other: 'other',
};

/** Wpis cardio (X15A) -> payload Health. */
export const mapCardioToHealth = (activity: ManualActivity): HealthWorkoutPayload | null => {
  if (!activity.movingTime || activity.movingTime <= 0) return null;
  const startMs = noonMs(activity.date);
  return {
    activityType: CARDIO_TO_HEALTH[activity.type] ?? 'other',
    startMs,
    endMs: startMs + activity.movingTime * 1000,
    ...(activity.calories && { calories: activity.calories }),
  };
};

/** Idempotencja: sync tylko gdy dokument nowy albo zmienił się czas końca. */
export const shouldSyncWorkout = (
  docId: string,
  endMs: number,
  state: HealthSyncState,
): boolean => {
  const entry = state[docId];
  if (!entry) return true;
  return entry.endMs !== endMs;
};

const WEIGHT_EPSILON_KG = 0.1;

/**
 * Propozycja wagi z Health: tylko gdy próbka NOWSZA niż nasz najnowszy pomiar
 * z wagą i różni się o >= 0.1 kg. Nigdy auto-zapis — user zatwierdza tapnięciem.
 */
export const newerHealthWeight = (
  sample: HealthWeightSample | null,
  measurements: BodyMeasurement[],
): HealthWeightSample | null => {
  if (!sample || !Number.isFinite(sample.kg) || sample.kg <= 0) return null;
  const latest = measurements
    .filter((m) => typeof m.weight === 'number' && m.weight > 0)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latest) return sample;
  if (sample.date <= latest.date) return null;
  if (Math.abs(sample.kg - latest.weight!) < WEIGHT_EPSILON_KG) return null;
  return sample;
};
