import { describe, expect, it } from 'vitest';
import { buildAllTimeActivityStats, buildAllTimeStats, type StatsActivity } from '@/lib/all-time-stats';
import type { WorkoutSession } from '@/types';

const workout = (id: string, completed = true): WorkoutSession => ({
  id, userId: 'u1', dayId: 'day-1', date: '2026-09-01', completed, durationSec: 3600,
  exercises: [{ exerciseId: 'squat', sets: [{ reps: 5, weight: 100, completed: true }] }],
});
const activity = (id: string, extra: Partial<StatsActivity> = {}): StatsActivity => ({
  id, userId: 'u1', type: 'Swim', source: 'manual', movingTime: 2400, ...extra,
});

describe('all-time cardio alongside existing strength numbers', () => {
  it('counts manual swimming as a completed activity and leaves every strength statistic intact', () => {
    const strength = [workout('1'), workout('2'), workout('draft', false)];
    const result = buildAllTimeActivityStats(strength, [activity('swim')]);
    expect(result).toMatchObject({ activityCount: 3, cardioCount: 1, cardioDurationSec: 2400 });
    expect(result.strength).toEqual(buildAllTimeStats(strength));
  });

  it('excludes strength mirrors from Strava and deduplicates imported IDs without merging distinct manual/Strava activity', () => {
    const result = buildAllTimeActivityStats([workout('1')], [
      activity('manual'), activity('manual'),
      activity('run', { source: 'strava', stravaId: 42, type: 'Run', movingTime: 1800 }),
      activity('old-run-doc', { source: 'strava', stravaId: 42, type: 'Run', movingTime: 1800 }),
      activity('weights', { source: 'strava', type: 'WeightTraining' }),
      activity('crossfit', { source: 'strava', type: 'Crossfit' }),
    ]);
    expect(result).toMatchObject({ activityCount: 3, cardioCount: 2, cardioDurationSec: 4200 });
  });

  it('counts saved activities with missing duration without inventing time or propagating invalid numbers', () => {
    const result = buildAllTimeActivityStats([], [
      activity('elapsed', { movingTime: undefined, elapsedTime: 600 }),
      activity('unknown', { movingTime: undefined }),
      activity('bad', { movingTime: Number.NaN }),
      activity('zero', { movingTime: 0, elapsedTime: 1000 }),
      activity('negative', { movingTime: -50 }),
    ]);
    expect(result).toMatchObject({ activityCount: 5, cardioCount: 5, cardioDurationSec: 600 });
    expect(result.strength).toEqual(buildAllTimeStats([]));
  });
});
