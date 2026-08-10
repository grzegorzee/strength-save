import type { SetData } from '@/types';

export const WORKOUT_PROTOCOL_VERSION = 1 as const;

export const WORKOUT_PROTOCOL_LIMITS = {
  idLength: 120,
  eventCount: 500,
  watchContextBytes: 256 * 1024,
  garminResponseBytes: 8 * 1024,
  garminIngestBytes: 256 * 1024,
  maxReps: 999,
  maxWeightKg: 1000,
  maxDurationSec: 24 * 60 * 60,
  maxDistanceM: 1_000_000,
} as const;

export type WorkoutTrackingType =
  | 'weight_reps'
  | 'duration'
  | 'weight_distance_duration'
  | 'assisted_bodyweight';

export type WorkoutProtocolEventType =
  | 'session_started'
  | 'set_logged'
  | 'set_updated'
  | 'session_finished'
  | 'session_discarded';

export interface CanonicalWorkoutSet {
  tracking: WorkoutTrackingType;
  completed: boolean;
  isWarmup?: boolean;
  reps?: number;
  weightKg?: number;
  durationSec?: number;
  distanceM?: number;
  assistWeightKg?: number;
}

export interface CanonicalWorkoutEvent {
  protocolVersion: typeof WORKOUT_PROTOCOL_VERSION;
  uid: string;
  deviceId: string;
  dayId: string;
  sessionId: string;
  exerciseId: string | null;
  setIndex: number | null;
  eventId: string;
  at: number;
  type: WorkoutProtocolEventType;
  set?: CanonicalWorkoutSet;
}

export interface LegacyWatchContext {
  uid: string;
  deviceId: string;
  sessionId: string;
}

const TRACKING_TYPES = new Set<WorkoutTrackingType>([
  'weight_reps',
  'duration',
  'weight_distance_duration',
  'assisted_bodyweight',
]);

const EVENT_TYPES = new Set<WorkoutProtocolEventType>([
  'session_started',
  'set_logged',
  'set_updated',
  'session_finished',
  'session_discarded',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isBoundedNumber = (value: unknown, min: number, max: number): value is number => (
  isFiniteNumber(value) && value >= min && value <= max
);

const isId = (value: unknown): value is string => (
  typeof value === 'string'
  && value.length > 0
  && value.length <= WORKOUT_PROTOCOL_LIMITS.idLength
);

const optionalBounded = (value: unknown, min: number, max: number): value is number | undefined => (
  value === undefined || isBoundedNumber(value, min, max)
);

function parseCanonicalSet(raw: unknown): CanonicalWorkoutSet | null {
  if (!isRecord(raw) || !TRACKING_TYPES.has(raw.tracking as WorkoutTrackingType)) return null;
  if (typeof raw.completed !== 'boolean') return null;
  if (raw.isWarmup !== undefined && typeof raw.isWarmup !== 'boolean') return null;
  if (!optionalBounded(raw.reps, 0, WORKOUT_PROTOCOL_LIMITS.maxReps)) return null;
  if (!optionalBounded(raw.weightKg, 0, WORKOUT_PROTOCOL_LIMITS.maxWeightKg)) return null;
  if (!optionalBounded(raw.durationSec, 0, WORKOUT_PROTOCOL_LIMITS.maxDurationSec)) return null;
  if (!optionalBounded(raw.distanceM, 0, WORKOUT_PROTOCOL_LIMITS.maxDistanceM)) return null;
  if (!optionalBounded(raw.assistWeightKg, 0, WORKOUT_PROTOCOL_LIMITS.maxWeightKg)) return null;

  const tracking = raw.tracking as WorkoutTrackingType;
  if (tracking === 'weight_reps' && (!isFiniteNumber(raw.reps) || !isFiniteNumber(raw.weightKg))) return null;
  if (tracking === 'duration' && !isFiniteNumber(raw.durationSec)) return null;
  if (tracking === 'weight_distance_duration'
    && (!isFiniteNumber(raw.weightKg) || !isFiniteNumber(raw.distanceM))) return null;
  if (tracking === 'assisted_bodyweight'
    && (!isFiniteNumber(raw.reps) || !isFiniteNumber(raw.assistWeightKg))) return null;

  return {
    tracking,
    completed: raw.completed,
    ...(raw.isWarmup === true ? { isWarmup: true } : {}),
    ...(isFiniteNumber(raw.reps) ? { reps: raw.reps } : {}),
    ...(isFiniteNumber(raw.weightKg) ? { weightKg: raw.weightKg } : {}),
    ...(isFiniteNumber(raw.durationSec) ? { durationSec: raw.durationSec } : {}),
    ...(isFiniteNumber(raw.distanceM) ? { distanceM: raw.distanceM } : {}),
    ...(isFiniteNumber(raw.assistWeightKg) ? { assistWeightKg: raw.assistWeightKg } : {}),
  };
}

/** Strict parser for the versioned, trusted-after-validation event envelope. */
export function parseCanonicalWorkoutEvent(raw: unknown): CanonicalWorkoutEvent | null {
  if (!isRecord(raw) || raw.protocolVersion !== WORKOUT_PROTOCOL_VERSION) return null;
  if (!isId(raw.uid) || !isId(raw.deviceId) || !isId(raw.dayId) || !isId(raw.sessionId) || !isId(raw.eventId)) {
    return null;
  }
  if (!EVENT_TYPES.has(raw.type as WorkoutProtocolEventType) || !isFiniteNumber(raw.at) || raw.at < 0) return null;

  const type = raw.type as WorkoutProtocolEventType;
  const isSetEvent = type === 'set_logged' || type === 'set_updated';
  const exerciseId = raw.exerciseId === null ? null : (isId(raw.exerciseId) ? raw.exerciseId : null);
  const setIndex = raw.setIndex === null
    ? null
    : (Number.isInteger(raw.setIndex) && isBoundedNumber(raw.setIndex, 0, 99) ? raw.setIndex : null);
  if (isSetEvent && (exerciseId === null || setIndex === null)) return null;
  if (!isSetEvent && (raw.exerciseId !== null || raw.setIndex !== null)) return null;

  const set = isSetEvent ? parseCanonicalSet(raw.set) : null;
  if (isSetEvent && !set) return null;

  return {
    protocolVersion: WORKOUT_PROTOCOL_VERSION,
    uid: raw.uid,
    deviceId: raw.deviceId,
    dayId: raw.dayId,
    sessionId: raw.sessionId,
    exerciseId,
    setIndex,
    eventId: raw.eventId,
    at: raw.at,
    type,
    ...(set ? { set } : {}),
  };
}

/** Maps the pre-X25 Watch event to the canonical envelope using trusted phone context. */
export function normalizeLegacyWatchEvent(
  raw: unknown,
  context: LegacyWatchContext,
): CanonicalWorkoutEvent | null {
  const canonical = parseCanonicalWorkoutEvent(raw);
  if (canonical) return canonical;
  if (!isRecord(raw) || !isId(raw.dayId) || !isFiniteNumber(raw.at)) return null;

  const eventId = isId(raw.id) ? raw.id : `legacy-${String(raw.type)}-${raw.at}`;
  const base = {
    protocolVersion: WORKOUT_PROTOCOL_VERSION,
    uid: context.uid,
    deviceId: context.deviceId,
    dayId: raw.dayId,
    sessionId: context.sessionId,
    eventId,
    at: raw.at,
  } as const;

  if (raw.type === 'setLogged') {
    if (!isId(raw.exerciseId) || !Number.isInteger(raw.setIndex)
      || !isBoundedNumber(raw.setIndex, 0, 99)
      || !isBoundedNumber(raw.reps, 0, WORKOUT_PROTOCOL_LIMITS.maxReps)
      || !isBoundedNumber(raw.weight, 0, WORKOUT_PROTOCOL_LIMITS.maxWeightKg)) return null;
    return {
      ...base,
      exerciseId: raw.exerciseId,
      setIndex: raw.setIndex,
      type: 'set_logged',
      set: {
        tracking: 'weight_reps',
        reps: Math.floor(raw.reps),
        weightKg: raw.weight,
        completed: raw.completed !== false,
      },
    };
  }

  if (raw.type === 'startWorkout' || raw.type === 'workoutFinished') {
    return {
      ...base,
      exerciseId: null,
      setIndex: null,
      type: raw.type === 'startWorkout' ? 'session_started' : 'session_finished',
    };
  }

  return null;
}

/**
 * Hybrid legacy shape: an old phone understands `type/id/weight`, while a new
 * parser can use the additive versioned fields. Unknown keys are intentionally safe.
 */
export function toLegacyWatchEvent(
  event: CanonicalWorkoutEvent,
  date: string,
): Record<string, unknown> | null {
  const common = {
    id: event.eventId,
    eventId: event.eventId,
    protocolVersion: event.protocolVersion,
    canonicalType: event.type,
    date,
    dayId: event.dayId,
    sessionId: event.sessionId,
    deviceId: event.deviceId,
    at: event.at,
  };

  if ((event.type === 'set_logged' || event.type === 'set_updated')
    && event.exerciseId !== null && event.setIndex !== null && event.set) {
    return {
      ...common,
      type: 'setLogged',
      exerciseId: event.exerciseId,
      setIndex: event.setIndex,
      reps: event.set.reps ?? 0,
      weight: event.set.weightKg ?? 0,
      completed: event.set.completed,
      set: event.set,
    };
  }
  if (event.type === 'session_started') return { ...common, type: 'startWorkout' };
  if (event.type === 'session_finished') return { ...common, type: 'workoutFinished' };
  // Legacy phone has no safe discard equivalent; never translate it to finish.
  return null;
}

export function canonicalSetToSetData(set: CanonicalWorkoutSet): SetData {
  return {
    reps: set.reps ?? 0,
    weight: set.weightKg ?? 0,
    completed: set.completed,
    ...(set.isWarmup ? { isWarmup: true } : {}),
    ...(set.durationSec !== undefined ? { durationSec: set.durationSec } : {}),
    ...(set.distanceM !== undefined ? { distanceM: set.distanceM } : {}),
    ...(set.assistWeightKg !== undefined ? { assistWeight: set.assistWeightKg } : {}),
  };
}

export interface ReducedWorkoutEvents {
  status: 'idle' | 'active' | 'finished' | 'discarded';
  shouldPersistWorkout: boolean;
  completedSetCount: number;
  tonnageKg: number;
  sets: Record<string, CanonicalWorkoutEvent>;
}

/** Pure event reducer shared by compatibility and cross-device tests. */
export function reduceCanonicalWorkoutEvents(events: CanonicalWorkoutEvent[]): ReducedWorkoutEvents {
  const unique = new Map<string, CanonicalWorkoutEvent>();
  for (const event of events) {
    if (!unique.has(event.eventId)) unique.set(event.eventId, event);
  }
  const ordered = [...unique.values()].sort((a, b) => a.at - b.at || a.eventId.localeCompare(b.eventId));
  const sets = new Map<string, CanonicalWorkoutEvent>();
  let status: ReducedWorkoutEvents['status'] = 'idle';

  for (const event of ordered) {
    if (event.type === 'session_started') status = 'active';
    if (event.type === 'session_finished') status = 'finished';
    if (event.type === 'session_discarded') status = 'discarded';
    if ((event.type !== 'set_logged' && event.type !== 'set_updated')
      || event.exerciseId === null || event.setIndex === null || !event.set) continue;

    const key = `${event.exerciseId}#${event.setIndex}`;
    const current = sets.get(key);
    if (!current || event.at > current.at || (event.at === current.at && event.eventId > current.eventId)) {
      sets.set(key, event);
    }
  }

  const setRecord = Object.fromEntries(sets);
  const completed = [...sets.values()].filter(event => event.set?.completed);
  const tonnageKg = completed.reduce((total, event) => {
    const set = event.set!;
    if (set.tracking !== 'weight_reps' || set.isWarmup) return total;
    return total + (set.reps ?? 0) * (set.weightKg ?? 0);
  }, 0);

  return {
    status,
    shouldPersistWorkout: status === 'finished',
    completedSetCount: completed.length,
    tonnageKg,
    sets: setRecord,
  };
}

export function protocolPayloadBytes(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).byteLength;
}

export function isProtocolPayloadWithinLimit(
  payload: unknown,
  limit: 'watchContextBytes' | 'garminResponseBytes' | 'garminIngestBytes',
): boolean {
  return protocolPayloadBytes(payload) <= WORKOUT_PROTOCOL_LIMITS[limit];
}

