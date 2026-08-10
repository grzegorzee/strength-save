import { WORKOUT_PROTOCOL_VERSION } from '@/lib/workout-protocol';
import type {
  WatchEvent,
  WatchSetLoggedEvent,
  WatchStartQuickWorkoutEvent,
  WatchStartWorkoutEvent,
  WatchWorkoutFinishedEvent,
} from '@/lib/watch-bridge';

export function parseWatchEvent(json: string): WatchEvent | null {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.protocolVersion !== undefined && parsed.protocolVersion !== WORKOUT_PROTOCOL_VERSION) return null;
    if (typeof parsed.date !== 'string' || typeof parsed.dayId !== 'string'
      || typeof parsed.at !== 'number' || !Number.isFinite(parsed.at)) return null;

    if (parsed.type === 'setLogged') {
      if (typeof parsed.exerciseId !== 'string'
        || !Number.isInteger(parsed.setIndex) || (parsed.setIndex as number) < 0
        || typeof parsed.reps !== 'number' || !Number.isFinite(parsed.reps)
        || typeof parsed.weight !== 'number' || !Number.isFinite(parsed.weight)
        || typeof parsed.completed !== 'boolean') return null;
      const trackingTypes = new Set([
        'weight_reps', 'bodyweight_reps', 'duration',
        'weight_distance_duration', 'assisted_bodyweight',
      ]);
      if (parsed.trackingType !== undefined
        && (typeof parsed.trackingType !== 'string' || !trackingTypes.has(parsed.trackingType))) return null;
      const optionalNumber = (value: unknown, max: number) => value === undefined
        || (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max);
      if (!optionalNumber(parsed.durationSec, 86_400)
        || !optionalNumber(parsed.distanceM, 1_000_000)
        || !optionalNumber(parsed.assistWeight, 2_000)) return null;
      if (parsed.trackingType === 'duration' && parsed.durationSec === undefined) return null;
      if (parsed.trackingType === 'weight_distance_duration'
        && (parsed.durationSec === undefined || parsed.distanceM === undefined)) return null;
      if (parsed.trackingType === 'assisted_bodyweight' && parsed.assistWeight === undefined) return null;
      return parsed as unknown as WatchSetLoggedEvent;
    }
    if (parsed.type === 'startQuickWorkout') {
      const matchesDay = new RegExp(`^adhoc-${parsed.date}-\\d+$`).test(parsed.dayId);
      if (!matchesDay
        || typeof parsed.exerciseId !== 'string'
        || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/.test(parsed.exerciseId)
        || typeof parsed.exerciseName !== 'string'
        || parsed.exerciseName.trim().length === 0 || parsed.exerciseName.length > 120
        || !Number.isInteger(parsed.setCount) || (parsed.setCount as number) < 1 || (parsed.setCount as number) > 6
        || !Number.isFinite(parsed.reps) || (parsed.reps as number) < 1 || (parsed.reps as number) > 1000
        || !Number.isFinite(parsed.weight) || (parsed.weight as number) < 0 || (parsed.weight as number) > 2000) return null;
      return parsed as unknown as WatchStartQuickWorkoutEvent;
    }
    if (parsed.type === 'workoutFinished' || parsed.type === 'startWorkout'
      || parsed.type === 'workoutDiscarded') {
      return parsed as unknown as WatchWorkoutFinishedEvent | WatchStartWorkoutEvent;
    }
  } catch {
    // Uszkodzone eventy pozostają bez ACK do diagnostyki/recovery.
  }
  return null;
}
