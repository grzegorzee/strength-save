import { describe, it, expect } from 'vitest';
import { applySyncMarkers } from '@/lib/workout-sync-markers';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const baseDraft = (over: Partial<ActiveWorkoutDraft>): ActiveWorkoutDraft => ({
  userId: 'u1',
  sessionId: 's1',
  dayId: 'd1',
  date: '2026-07-03',
  cycleId: null,
  sessionOrigin: 'remote',
  remoteSessionId: null,
  exerciseSets: {},
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: 1,
  updatedAt: 1,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: false,
  finalSyncPending: false,
  version: 3,
  ...over,
});

describe('applySyncMarkers', () => {
  it('czyści dirty gdy wersja bazowa równa zsynchronizowanej', () => {
    const out = applySyncMarkers(baseDraft({ version: 3 }), 3, 999, { updatedAt: 111, revision: 7 });
    expect(out.dirty).toBe(false);
    expect(out.cloudRevision).toBe(7);
    expect(out.cloudUpdatedAt).toBe(111);
    expect(out.lastFirebaseSyncAt).toBe(999);
    expect(out.version).toBe(3);
  });

  it('NIE czyści dirty i NIE cofa wersji gdy draft poszedł do przodu w trakcie syncu', () => {
    const out = applySyncMarkers(baseDraft({ version: 5, dirty: true }), 3, 999, { revision: 7 });
    expect(out.dirty).toBe(true);
    expect(out.version).toBe(5);
    expect(out.cloudRevision).toBe(7);
  });
});
