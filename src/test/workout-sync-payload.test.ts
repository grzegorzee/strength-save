import { describe, expect, it } from 'vitest';
import { buildDraftExercisesPayload } from '@/lib/workout-sync-engine';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const draft: ActiveWorkoutDraft = {
  sessionId: 's1',
  userId: 'u1',
  dayId: 'd1',
  date: '2026-07-03',
  cycleId: null,
  sessionOrigin: 'remote',
  remoteSessionId: 's1',
  exerciseSets: {
    'ex-1': [{ reps: 8, weight: 100, completed: true }],
    'ex-2': [{ reps: 12, weight: 40, completed: false }],
  },
  exerciseNotes: { 'ex-1': 'mocna seria' },
  exerciseNames: { 'ex-1': 'Przysiad' },
  exerciseMetrics: { 'ex-2': { rpe: 8 } },
  dayNotes: '',
  skippedExercises: [],
  startedAt: 1000,
  updatedAt: 2000,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: false,
  finalSyncPending: false,
  version: 1,
};

describe('buildDraftExercisesPayload', () => {
  it('buduje payload z draftu: notatki, nazwy i metryki tylko gdy obecne', () => {
    expect(buildDraftExercisesPayload(draft)).toEqual([
      { exerciseId: 'ex-1', sets: draft.exerciseSets['ex-1'], notes: 'mocna seria', name: 'Przysiad' },
      { exerciseId: 'ex-2', sets: draft.exerciseSets['ex-2'], rpe: 8 },
    ]);
  });
});
