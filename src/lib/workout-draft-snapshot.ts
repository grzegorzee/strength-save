import type { SetData, ExerciseMetrics } from '@/types';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { isProvisionalWorkoutSessionId } from '@/lib/workout-session';

// Czysta funkcja budująca snapshot draftu (ekstrakcja z WorkoutDay, wzorzec Z17/Z26).
// Kontrakt R2-01: pendingWriteId/pendingWriteVersion PRZEŻYWAJĄ flush (kasuje je dopiero
// silnik po acku), a version rośnie wyłącznie przy realnej zmianie treści — inaczej
// retry checkpointu po lost-ack idzie z nowym writeId i kończy się fałszywym konfliktem.

export interface DraftSnapshotContext {
  userId: string | null | undefined;
  sessionId: string | null | undefined;
  dayId: string | null | undefined;
  date: string;
  previousDraft: ActiveWorkoutDraft | null;
  exerciseSets: Record<string, SetData[]>;
  exerciseNotes: Record<string, string>;
  exerciseMetrics: Record<string, ExerciseMetrics>;
  dayNotes: string;
  skippedExercises: string[];
  dayNames: Record<string, string>;
  dayName?: string;
  dayFocus?: string;
  cloudMeta: { sessionId: string; updatedAt?: number; revision?: number } | null;
  now?: number;
}

const sameSets = (a: Record<string, SetData[]>, b: Record<string, SetData[]>): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(key => {
    const aSets = a[key];
    const bSets = b[key];
    if (!bSets || aSets.length !== bSets.length) return false;
    return aSets.every((set, i) => (
      set.reps === bSets[i].reps
      && set.weight === bSets[i].weight
      && set.completed === bSets[i].completed
      && !!set.isWarmup === !!bSets[i].isWarmup
    ));
  });
};

const sameStringMap = (a: Record<string, string>, b: Record<string, string>): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(key => a[key] === b[key]);
};

const sameMetrics = (
  a: Record<string, ExerciseMetrics>,
  b: Record<string, ExerciseMetrics>,
): boolean => {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every(key => {
    const aM = a[key];
    const bM = b[key];
    if (!bM) return false;
    return aM.rpe === bM.rpe && aM.pain === bM.pain && aM.quality === bM.quality;
  });
};

const sameStringArray = (a: string[], b: string[]): boolean => (
  a.length === b.length && a.every((item, i) => item === b[i])
);

const sameDraftContent = (
  previous: ActiveWorkoutDraft,
  next: Pick<ActiveWorkoutDraft, 'exerciseSets' | 'exerciseNotes' | 'exerciseMetrics' | 'dayNotes' | 'skippedExercises'>,
): boolean => (
  sameSets(previous.exerciseSets, next.exerciseSets)
  && sameStringMap(previous.exerciseNotes, next.exerciseNotes)
  && sameMetrics(previous.exerciseMetrics, next.exerciseMetrics)
  && previous.dayNotes === next.dayNotes
  && sameStringArray(previous.skippedExercises, next.skippedExercises)
);

export const buildWorkoutDraftSnapshot = (
  context: DraftSnapshotContext,
  overrides: Partial<ActiveWorkoutDraft> = {},
): ActiveWorkoutDraft | null => {
  const draftUserId = overrides.userId ?? context.userId;
  const draftSessionId = overrides.sessionId ?? context.sessionId;
  const draftDayId = overrides.dayId ?? context.dayId;
  const draftDate = overrides.date ?? context.date;
  if (!draftUserId || !draftSessionId || !draftDayId) return null;

  const now = context.now ?? Date.now();
  const previousDraft = context.previousDraft?.sessionId === draftSessionId
    ? context.previousDraft
    : null;

  const content = {
    exerciseSets: overrides.exerciseSets ?? context.exerciseSets,
    exerciseNotes: overrides.exerciseNotes ?? context.exerciseNotes,
    exerciseMetrics: overrides.exerciseMetrics ?? context.exerciseMetrics,
    dayNotes: overrides.dayNotes ?? context.dayNotes,
    skippedExercises: overrides.skippedExercises ?? context.skippedExercises,
  };

  const contentUnchanged = previousDraft !== null && sameDraftContent(previousDraft, content);
  const nextVersion = previousDraft
    ? (contentUnchanged ? previousDraft.version : previousDraft.version + 1)
    : 1;

  return {
    sessionId: draftSessionId,
    userId: draftUserId,
    dayId: draftDayId,
    date: draftDate,
    cycleId: overrides.cycleId ?? previousDraft?.cycleId ?? null,
    sessionOrigin: overrides.sessionOrigin ?? previousDraft?.sessionOrigin ?? (isProvisionalWorkoutSessionId(draftSessionId) ? 'provisional' : 'remote'),
    remoteSessionId: overrides.remoteSessionId ?? previousDraft?.remoteSessionId ?? null,
    ...content,
    exerciseNames: overrides.exerciseNames ?? previousDraft?.exerciseNames ?? context.dayNames,
    dayName: overrides.dayName ?? previousDraft?.dayName ?? context.dayName,
    dayFocus: overrides.dayFocus ?? previousDraft?.dayFocus ?? context.dayFocus,
    startedAt: overrides.startedAt ?? previousDraft?.startedAt ?? now,
    finalizedAt: overrides.finalizedAt ?? previousDraft?.finalizedAt,
    updatedAt: overrides.updatedAt ?? now,
    cloudUpdatedAt: overrides.cloudUpdatedAt
      ?? previousDraft?.cloudUpdatedAt
      ?? (context.cloudMeta?.sessionId === draftSessionId ? context.cloudMeta.updatedAt : undefined),
    cloudRevision: overrides.cloudRevision
      ?? previousDraft?.cloudRevision
      ?? (context.cloudMeta?.sessionId === draftSessionId ? context.cloudMeta.revision : undefined),
    lastFirebaseSyncAt: overrides.lastFirebaseSyncAt ?? previousDraft?.lastFirebaseSyncAt ?? null,
    dirty: overrides.dirty ?? true,
    completedLocally: overrides.completedLocally ?? previousDraft?.completedLocally ?? false,
    finalSyncPending: overrides.finalSyncPending ?? previousDraft?.finalSyncPending ?? false,
    version: overrides.version ?? nextVersion,
    ...(overrides.pendingWriteId !== undefined
      ? { pendingWriteId: overrides.pendingWriteId }
      : previousDraft?.pendingWriteId !== undefined
        ? { pendingWriteId: previousDraft.pendingWriteId }
        : {}),
    ...(overrides.pendingWriteVersion !== undefined
      ? { pendingWriteVersion: overrides.pendingWriteVersion }
      : previousDraft?.pendingWriteVersion !== undefined
        ? { pendingWriteVersion: previousDraft.pendingWriteVersion }
        : {}),
  };
};
