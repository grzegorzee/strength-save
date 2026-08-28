import type { ActiveHealthGrant } from '@/lib/legal-versions';
import type { ExerciseMetrics, WorkoutSession } from '@/types';

export interface WorkoutHealthDocument {
  userId: string;
  workoutId: string;
  healthEpoch: number;
  healthGrantId: string;
  sourceWriteId: string;
  baseRevision: number;
  metrics: Array<{ exerciseId: string } & ExerciseMetrics>;
  date?: string;
  updatedAt: number;
}

export type WorkoutHealthReadMode = 'base' | 'active' | 'owner';
export type WorkoutHealthJoinState = 'base' | 'legacy' | 'joined' | 'hidden' | 'partial' | 'cleared';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const validMetric = (key: keyof ExerciseMetrics, value: unknown): value is number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (key === 'rpe') return value >= 0 && value <= 10 && Number.isInteger(value * 2);
  if (key === 'pain') return value >= 0 && value <= 10 && Number.isInteger(value);
  return value >= 0 && value <= 5 && Number.isInteger(value);
};

export function sanitizeWorkoutHealthDoc(
  documentId: string,
  raw: unknown,
  expectedUserId: string,
): WorkoutHealthDocument | null {
  if (!isRecord(raw)
    || raw.workoutId !== documentId
    || raw.userId !== expectedUserId
    || !Number.isSafeInteger(raw.healthEpoch)
    || Number(raw.healthEpoch) <= 0
    || typeof raw.healthGrantId !== 'string'
    || raw.healthGrantId.length === 0
    || typeof raw.sourceWriteId !== 'string'
    || raw.sourceWriteId.length === 0
    || !Number.isSafeInteger(raw.baseRevision)
    || Number(raw.baseRevision) < 0
    || typeof raw.updatedAt !== 'number'
    || !Number.isFinite(raw.updatedAt)
    || !Array.isArray(raw.metrics)) return null;

  const seen = new Set<string>();
  const metrics: WorkoutHealthDocument['metrics'] = [];
  for (const item of raw.metrics) {
    if (!isRecord(item) || typeof item.exerciseId !== 'string' || item.exerciseId.length === 0
      || seen.has(item.exerciseId)) return null;
    seen.add(item.exerciseId);
    const clean: { exerciseId: string } & ExerciseMetrics = { exerciseId: item.exerciseId };
    for (const key of ['rpe', 'pain', 'quality'] as const) {
      if (item[key] === undefined) continue;
      if (!validMetric(key, item[key])) return null;
      clean[key] = item[key];
    }
    if (Object.keys(clean).length > 1) metrics.push(clean);
  }

  return {
    userId: raw.userId,
    workoutId: raw.workoutId,
    healthEpoch: Number(raw.healthEpoch),
    healthGrantId: raw.healthGrantId,
    sourceWriteId: raw.sourceWriteId,
    baseRevision: Number(raw.baseRevision),
    metrics,
    ...(typeof raw.date === 'string' && { date: raw.date }),
    updatedAt: raw.updatedAt,
  };
}

const stripEmbeddedHealth = (workout: WorkoutSession): WorkoutSession => ({
  ...workout,
  exercises: workout.exercises.map(({ rpe: _rpe, pain: _pain, quality: _quality, ...exercise }) => exercise),
});

const sameGrant = (sidecar: WorkoutHealthDocument, grant: ActiveHealthGrant): boolean => (
  sidecar.healthEpoch === grant.healthEpoch && sidecar.healthGrantId === grant.healthGrantId
);

export function joinWorkoutHealth(
  workout: WorkoutSession,
  sidecar: WorkoutHealthDocument | Record<string, unknown> | null,
  options: { mode: WorkoutHealthReadMode; activeGrant?: ActiveHealthGrant | null },
): { workout: WorkoutSession; state: WorkoutHealthJoinState } {
  const base = stripEmbeddedHealth(workout);
  if (options.mode === 'base') return { workout: base, state: 'base' };

  const markerRevision = workout.healthSidecarRevision;
  const markerIsCurrent = markerRevision !== undefined && markerRevision === workout.revision;
  if (!markerIsCurrent) {
    if (markerRevision !== undefined) return { workout: base, state: 'partial' };
    if (options.mode === 'owner') return { workout, state: 'legacy' };
    return { workout: base, state: 'hidden' };
  }
  if (workout.healthSidecarPresent === false) return { workout: base, state: 'cleared' };
  if (workout.healthSidecarPresent !== true || !sidecar) return { workout: base, state: 'partial' };

  const cleanSidecar = sanitizeWorkoutHealthDoc(workout.id, sidecar, workout.userId);
  if (!cleanSidecar || cleanSidecar.baseRevision !== workout.revision) {
    return { workout: base, state: 'partial' };
  }
  if (options.mode === 'active' && (!options.activeGrant || !sameGrant(cleanSidecar, options.activeGrant))) {
    return { workout: base, state: 'hidden' };
  }

  const metricsByExercise = new Map(cleanSidecar.metrics.map(metric => [metric.exerciseId, metric]));
  return {
    workout: {
      ...base,
      exercises: base.exercises.map(exercise => ({
        ...exercise,
        ...(metricsByExercise.get(exercise.exerciseId) ?? {}),
        exerciseId: exercise.exerciseId,
      })),
    },
    state: 'joined',
  };
}
