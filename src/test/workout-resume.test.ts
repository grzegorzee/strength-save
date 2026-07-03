import { describe, expect, it } from 'vitest';
import { shouldResumeWorkoutDraft } from '@/lib/workout-resume';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

const TODAY = '2026-07-03';
const NOW = new Date('2026-07-03T18:00:00Z').getTime();

const makeDraft = (over: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
  sessionId: 'workout-u1-day-1-2026-07-03',
  userId: 'u1',
  dayId: 'day-1',
  date: TODAY,
  cycleId: null,
  sessionOrigin: 'remote',
  remoteSessionId: 'workout-u1-day-1-2026-07-03',
  exerciseSets: { 'ex-1': [{ reps: 8, weight: 100, completed: true }] },
  exerciseNotes: {},
  exerciseMetrics: {},
  dayNotes: '',
  skippedExercises: [],
  startedAt: NOW - 30 * 60 * 1000,
  updatedAt: NOW - 5 * 60 * 1000,
  lastFirebaseSyncAt: null,
  dirty: true,
  completedLocally: false,
  finalSyncPending: false,
  version: 3,
  ...over,
});

describe('shouldResumeWorkoutDraft (Z49)', () => {
  it('świeży dirty draft dzisiejszy wraca do treningu z poprawną ścieżką', () => {
    const decision = shouldResumeWorkoutDraft(makeDraft(), TODAY, NOW);

    expect(decision.resume).toBe(true);
    expect(decision.target).toBe(
      `/workout/day-1?date=${TODAY}&session=workout-u1-day-1-2026-07-03`,
    );
  });

  it('brak draftu nie wznawia', () => {
    expect(shouldResumeWorkoutDraft(null, TODAY, NOW).resume).toBe(false);
  });

  it('draft finalSyncPending nie wznawia (trening zakończony, czeka na sync)', () => {
    const decision = shouldResumeWorkoutDraft(
      makeDraft({ finalSyncPending: true, completedLocally: true }),
      TODAY,
      NOW,
    );

    expect(decision.resume).toBe(false);
  });

  it('draft ukończony lokalnie nie wznawia', () => {
    expect(shouldResumeWorkoutDraft(makeDraft({ completedLocally: true }), TODAY, NOW).resume).toBe(false);
  });

  it('draft sprzed 3 dni nie wznawia', () => {
    const threeDaysAgo = NOW - 3 * 24 * 60 * 60 * 1000;
    const decision = shouldResumeWorkoutDraft(
      makeDraft({ date: '2026-06-30', updatedAt: threeDaysAgo }),
      TODAY,
      NOW,
    );

    expect(decision.resume).toBe(false);
  });

  it('wczorajszy draft dotykany < 12h temu wznawia (trening przez północ)', () => {
    const decision = shouldResumeWorkoutDraft(
      makeDraft({ date: '2026-07-02', updatedAt: NOW - 2 * 60 * 60 * 1000 }),
      TODAY,
      NOW,
    );

    expect(decision.resume).toBe(true);
  });

  it('provisional offline (nie-dirty) wznawia', () => {
    const decision = shouldResumeWorkoutDraft(
      makeDraft({
        sessionId: 'provisional-abc',
        sessionOrigin: 'provisional',
        remoteSessionId: null,
        dirty: false,
      }),
      TODAY,
      NOW,
    );

    expect(decision.resume).toBe(true);
    expect(decision.target).toBe(`/workout/day-1?date=${TODAY}&session=provisional-abc`);
  });

  it('czysty (nie-dirty) draft remote nie wznawia', () => {
    const decision = shouldResumeWorkoutDraft(
      makeDraft({ dirty: false, lastFirebaseSyncAt: NOW - 60 * 1000 }),
      TODAY,
      NOW,
    );

    expect(decision.resume).toBe(false);
  });
});
