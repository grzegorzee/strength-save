import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import type { SetData, WorkoutSession } from '@/types';

const versionAt = (set: SetData | undefined, fallback: number): number => {
  const value = Number(set?.updatedAt);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const versionId = (set: SetData | undefined): string => set?.updatedEventId ?? '';

/** True when `incoming` is strictly newer under protocol-v1 (at, eventId). */
export const isIncomingSetNewer = (
  current: SetData | undefined,
  incoming: SetData,
  currentFallbackAt = 0,
  incomingFallbackAt = 0,
): boolean => {
  if (!current) return true;
  const currentAt = versionAt(current, currentFallbackAt);
  const incomingAt = versionAt(incoming, incomingFallbackAt);
  if (incomingAt !== currentAt) return incomingAt > currentAt;
  return versionId(incoming).localeCompare(versionId(current)) > 0;
};

export const mergeCrossDeviceSets = (
  local: SetData[],
  cloud: SetData[],
  localFallbackAt = 0,
  cloudFallbackAt = 0,
): SetData[] => {
  const length = Math.max(local.length, cloud.length);
  const merged: SetData[] = [];
  for (let index = 0; index < length; index += 1) {
    const localSet = local[index];
    const cloudSet = cloud[index];
    if (!localSet && cloudSet) merged[index] = { ...cloudSet };
    else if (localSet && !cloudSet) merged[index] = { ...localSet };
    else if (localSet && cloudSet) {
      merged[index] = isIncomingSetNewer(localSet, cloudSet, localFallbackAt, cloudFallbackAt)
        ? { ...cloudSet }
        : { ...localSet };
    }
  }
  return merged;
};

/**
 * Rebase a local-first draft after a revision conflict. Only the conflicting
 * per-set values are LWW-merged; the logical session id never changes.
 */
export const mergeDraftWithCloudWorkout = (
  draft: ActiveWorkoutDraft,
  cloud: WorkoutSession,
): ActiveWorkoutDraft => {
  if (cloud.id !== draft.sessionId) return draft;
  const cloudByExercise = new Map(cloud.exercises.map((exercise) => [exercise.exerciseId, exercise]));
  const exerciseIds = new Set([...Object.keys(draft.exerciseSets), ...cloudByExercise.keys()]);
  const exerciseSets: Record<string, SetData[]> = {};
  const exerciseNotes = { ...draft.exerciseNotes };
  const exerciseNames = { ...(draft.exerciseNames ?? {}) };
  const exerciseMetrics = { ...draft.exerciseMetrics };

  for (const exerciseId of exerciseIds) {
    const remote = cloudByExercise.get(exerciseId);
    exerciseSets[exerciseId] = mergeCrossDeviceSets(
      draft.exerciseSets[exerciseId] ?? [],
      remote?.sets ?? [],
      draft.updatedAt,
      cloud.updatedAt ?? 0,
    );
    if (!exerciseNotes[exerciseId] && remote?.notes) exerciseNotes[exerciseId] = remote.notes;
    if (!exerciseNames[exerciseId] && remote?.name) exerciseNames[exerciseId] = remote.name;
    if (!exerciseMetrics[exerciseId] && remote) {
      const metrics = {
        ...(remote.rpe !== undefined && { rpe: remote.rpe }),
        ...(remote.pain !== undefined && { pain: remote.pain }),
        ...(remote.quality !== undefined && { quality: remote.quality }),
      };
      if (Object.keys(metrics).length > 0) exerciseMetrics[exerciseId] = metrics;
    }
  }

  return {
    ...draft,
    exerciseSets,
    exerciseNotes,
    exerciseNames,
    exerciseMetrics,
    ...(cloud.updatedAt !== undefined && { cloudUpdatedAt: cloud.updatedAt }),
    cloudRevision: Math.max(0, Math.floor(cloud.revision ?? 0)),
  };
};

export const workoutSetTotals = (
  exerciseSets: Record<string, SetData[]>,
): { completedSets: number; volumeKg: number } => {
  const completed = Object.values(exerciseSets)
    .flat()
    .filter((set) => set.completed && !set.isWarmup);
  return {
    completedSets: completed.length,
    volumeKg: completed.reduce((total, set) => total + set.reps * set.weight, 0),
  };
};
