import type { BodyMeasurement, ExerciseMetrics, WorkoutSession } from '@/types';
import type { WorkoutHistoryCursor, WorkoutHistoryPage } from '@/lib/workout-read-store';
import type { ActiveHealthGrant } from '@/lib/legal-versions';

export interface WorkoutBackupHealthEntry {
  workoutId: string;
  metrics: Array<{ exerciseId: string } & ExerciseMetrics>;
}

export interface WorkoutBackupV3 {
  schemaVersion: 3;
  workouts: WorkoutSession[];
  workoutHealth: WorkoutBackupHealthEntry[];
  measurements: BodyMeasurement[];
  trainingPlan?: unknown;
  planCycles?: unknown[];
  exportedAt: string;
}

type FetchPage = (cursor: WorkoutHistoryCursor | null) => Promise<WorkoutHistoryPage>;

export interface WorkoutBackupV3RestoreItem {
  workout: WorkoutSession;
  health?: WorkoutBackupHealthEntry;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

export function planWorkoutBackupV3Restore(
  raw: unknown,
  activeHealthGrant: ActiveHealthGrant | null,
): { backup: WorkoutBackupV3; items: WorkoutBackupV3RestoreItem[] } {
  if (!isRecord(raw)
    || raw.schemaVersion !== 3
    || !Array.isArray(raw.workouts)
    || !Array.isArray(raw.workoutHealth)
    || !Array.isArray(raw.measurements)) {
    throw new Error('WORKOUT_BACKUP_V3_INVALID');
  }

  const workouts = raw.workouts as unknown[];
  const workoutIds = new Set<string>();
  workouts.forEach((entry) => {
    if (!isRecord(entry)
      || typeof entry.id !== 'string'
      || entry.id.length === 0
      || !Array.isArray(entry.exercises)) {
      throw new Error('WORKOUT_BACKUP_V3_INVALID');
    }
    if (workoutIds.has(entry.id)) throw new Error('WORKOUT_BACKUP_DUPLICATE_WORKOUT');
    workoutIds.add(entry.id);
    entry.exercises.forEach((exercise) => {
      if (!isRecord(exercise) || typeof exercise.exerciseId !== 'string' || !Array.isArray(exercise.sets)) {
        throw new Error('WORKOUT_BACKUP_V3_INVALID');
      }
      if ('rpe' in exercise || 'pain' in exercise || 'quality' in exercise) {
        throw new Error('WORKOUT_BACKUP_EMBEDDED_HEALTH');
      }
    });
  });

  const healthByWorkout = new Map<string, WorkoutBackupHealthEntry>();
  (raw.workoutHealth as unknown[]).forEach((entry) => {
    if (!isRecord(entry)
      || typeof entry.workoutId !== 'string'
      || !Array.isArray(entry.metrics)) {
      throw new Error('WORKOUT_BACKUP_V3_INVALID');
    }
    if (!workoutIds.has(entry.workoutId)) throw new Error('WORKOUT_BACKUP_HEALTH_ORPHAN');
    if (healthByWorkout.has(entry.workoutId)) throw new Error('WORKOUT_BACKUP_DUPLICATE_HEALTH');
    entry.metrics.forEach((metric) => {
      if (!isRecord(metric) || typeof metric.exerciseId !== 'string') {
        throw new Error('WORKOUT_BACKUP_V3_INVALID');
      }
    });
    healthByWorkout.set(entry.workoutId, entry as unknown as WorkoutBackupHealthEntry);
  });

  const containsHealth = healthByWorkout.size > 0 || raw.measurements.length > 0;
  if (containsHealth && !activeHealthGrant) {
    throw new Error('WORKOUT_BACKUP_HEALTH_CONSENT_REQUIRED');
  }

  const backup = raw as unknown as WorkoutBackupV3;
  return {
    backup,
    items: (workouts as WorkoutSession[]).map((workout) => ({
      workout,
      ...(healthByWorkout.has(workout.id) ? { health: healthByWorkout.get(workout.id)! } : {}),
    })),
  };
}

export async function collectAllWorkoutBackupPages(fetchPage: FetchPage): Promise<WorkoutSession[]> {
  const workouts: WorkoutSession[] = [];
  const seenCursors = new Set<string>();
  let cursor: WorkoutHistoryCursor | null = null;
  do {
    const page = await fetchPage(cursor);
    if (page.healthDataIncomplete) throw new Error('WORKOUT_HEALTH_BACKUP_INCOMPLETE');
    workouts.push(...page.workouts);
    cursor = page.nextCursor;
    if (cursor) {
      const key = `${cursor.date}::${cursor.id}`;
      if (seenCursors.has(key)) throw new Error('WORKOUT_BACKUP_CURSOR_LOOP');
      seenCursors.add(key);
    }
  } while (cursor);
  return workouts;
}

export function buildWorkoutBackupV3(input: {
  workouts: WorkoutSession[];
  measurements: BodyMeasurement[];
  trainingPlan?: unknown;
  planCycles?: unknown[];
  exportedAt?: string;
}): WorkoutBackupV3 {
  const workoutHealth: WorkoutBackupHealthEntry[] = [];
  const workouts = input.workouts.map((workout) => {
    const metrics: WorkoutBackupHealthEntry['metrics'] = [];
    const exercises = workout.exercises.map(({ rpe, pain, quality, ...exercise }) => {
      const health = {
        exerciseId: exercise.exerciseId,
        ...(rpe !== undefined && { rpe }),
        ...(pain !== undefined && { pain }),
        ...(quality !== undefined && { quality }),
      };
      if (Object.keys(health).length > 1) metrics.push(health);
      return exercise;
    });
    if (metrics.length > 0) workoutHealth.push({ workoutId: workout.id, metrics });
    return { ...workout, exercises };
  });

  return {
    schemaVersion: 3,
    workouts,
    workoutHealth,
    measurements: input.measurements,
    ...(input.trainingPlan !== undefined && { trainingPlan: input.trainingPlan }),
    ...(input.planCycles && input.planCycles.length > 0 && { planCycles: input.planCycles }),
    exportedAt: input.exportedAt ?? new Date().toISOString(),
  };
}
