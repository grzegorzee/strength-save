import type { ActiveHealthGrant } from '@/lib/legal-versions';
import type { ExerciseMetrics } from '@/types';

export const WORKOUT_HEALTH_METRIC_KEYS = ['rpe', 'pain', 'quality'] as const;
export type WorkoutHealthMetricKey = (typeof WORKOUT_HEALTH_METRIC_KEYS)[number];
export type ExerciseMetricGrants = Record<
  string,
  Partial<Record<WorkoutHealthMetricKey, ActiveHealthGrant>>
>;

const sameGrant = (a: ActiveHealthGrant | null | undefined, b: ActiveHealthGrant | null | undefined): boolean => (
  !!a && !!b && a.healthEpoch === b.healthEpoch && a.healthGrantId === b.healthGrantId
);

const hasMetric = (metrics: ExerciseMetrics, key: WorkoutHealthMetricKey): boolean => (
  typeof metrics[key] === 'number' && Number.isFinite(metrics[key])
);

export function applyHealthMetricChangeFence(input: {
  exerciseId: string;
  previousMetrics: ExerciseMetrics;
  nextMetrics: ExerciseMetrics;
  previousGrants: ExerciseMetricGrants;
  previousPendingHealthGrant?: ActiveHealthGrant | null;
  currentGrant: ActiveHealthGrant | null;
}): {
  exerciseMetricGrants: ExerciseMetricGrants;
  pendingHealthGrant: ActiveHealthGrant | null;
} {
  const currentExerciseGrants = input.previousGrants[input.exerciseId] ?? {};
  const nextExerciseGrants: Partial<Record<WorkoutHealthMetricKey, ActiveHealthGrant>> = {};
  let changed = false;

  WORKOUT_HEALTH_METRIC_KEYS.forEach((key) => {
    const previousHasMetric = hasMetric(input.previousMetrics, key);
    const nextHasMetric = hasMetric(input.nextMetrics, key);
    const valueChanged = previousHasMetric !== nextHasMetric
      || (previousHasMetric && nextHasMetric && input.previousMetrics[key] !== input.nextMetrics[key]);
    if (valueChanged) changed = true;
    if (!nextHasMetric) return;
    if (valueChanged) {
      if (input.currentGrant) nextExerciseGrants[key] = input.currentGrant;
      return;
    }
    const existing = currentExerciseGrants[key];
    if (existing) nextExerciseGrants[key] = existing;
  });

  const exerciseMetricGrants: ExerciseMetricGrants = { ...input.previousGrants };
  if (Object.keys(nextExerciseGrants).length > 0) {
    exerciseMetricGrants[input.exerciseId] = nextExerciseGrants;
  } else {
    delete exerciseMetricGrants[input.exerciseId];
  }

  return {
    exerciseMetricGrants,
    pendingHealthGrant: changed
      ? input.currentGrant
      : input.previousPendingHealthGrant ?? null,
  };
}

export function selectFencedHealthMetrics(input: {
  exerciseMetrics: Record<string, ExerciseMetrics>;
  exerciseMetricGrants: ExerciseMetricGrants;
  pendingHealthGrant: ActiveHealthGrant | null;
}): Record<string, ExerciseMetrics> {
  if (!input.pendingHealthGrant) return {};
  const selected: Record<string, ExerciseMetrics> = {};
  Object.entries(input.exerciseMetrics).forEach(([exerciseId, metrics]) => {
    const grants = input.exerciseMetricGrants[exerciseId];
    if (!grants) return;
    const fenced: ExerciseMetrics = {};
    WORKOUT_HEALTH_METRIC_KEYS.forEach((key) => {
      if (hasMetric(metrics, key) && sameGrant(grants[key], input.pendingHealthGrant)) {
        fenced[key] = metrics[key];
      }
    });
    if (Object.keys(fenced).length > 0) selected[exerciseId] = fenced;
  });
  return selected;
}

export const sameActiveHealthGrant = sameGrant;
