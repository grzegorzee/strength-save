import { describe, it, expect } from 'vitest';
import { getTrackedExerciseHistory } from '@/lib/exercise-progression';
import type { WorkoutSession } from '@/types';

const trackedW = (id: string, date: string, exerciseId: string, sets: WorkoutSession['exercises'][number]['sets']): WorkoutSession => ({
  id, userId: 'u1', dayId: 'd1', date, completed: true,
  exercises: [{ exerciseId, sets }],
});

describe('getTrackedExerciseHistory (Z106)', () => {
  it('duration: wartość = najlepszy czas serii w dniu', () => {
    const ws = [
      trackedW('w1', '2026-07-01', 'plank', [{ reps: 0, weight: 0, completed: true, durationSec: 60 }]),
      trackedW('w2', '2026-07-05', 'plank', [
        { reps: 0, weight: 0, completed: true, durationSec: 75 },
        { reps: 0, weight: 0, completed: true, durationSec: 90 },
      ]),
    ];
    expect(getTrackedExerciseHistory(ws, 'plank', 'duration', null)).toEqual([
      { date: '2026-07-01', value: 60 },
      { date: '2026-07-05', value: 90 },
    ]);
  });

  it('assisted: wartość = obciążenie efektywne — malejąca asysta daje ROSNĄCĄ linię', () => {
    const ws = [
      trackedW('w1', '2026-07-01', 'apu', [{ reps: 8, weight: 0, completed: true, assistWeight: 30 }]),
      trackedW('w2', '2026-07-08', 'apu', [{ reps: 8, weight: 0, completed: true, assistWeight: 25 }]),
    ];
    const points = getTrackedExerciseHistory(ws, 'apu', 'assisted_bodyweight', 80);
    expect(points).toEqual([
      { date: '2026-07-01', value: 50 },
      { date: '2026-07-08', value: 55 },
    ]);
    expect(points[1].value).toBeGreaterThan(points[0].value);
  });

  it('assisted bez wagi ciała: fallback do powtórzeń', () => {
    const ws = [trackedW('w1', '2026-07-01', 'apu', [{ reps: 8, weight: 0, completed: true, assistWeight: 30 }])];
    expect(getTrackedExerciseHistory(ws, 'apu', 'assisted_bodyweight', null)).toEqual([
      { date: '2026-07-01', value: 8 },
    ]);
  });

  it('weight_distance_duration: wartość = najlepszy iloczyn kg x m', () => {
    const ws = [trackedW('w1', '2026-07-01', 'farmer', [{ reps: 0, weight: 24, completed: true, distanceM: 40 }])];
    expect(getTrackedExerciseHistory(ws, 'farmer', 'weight_distance_duration', null)).toEqual([
      { date: '2026-07-01', value: 960 },
    ]);
  });
});
import { getExerciseHistory, detectPlateau, getProgressionSummary } from '@/lib/exercise-progression';

const makeWorkout = (date: string, exerciseId: string, sets: { weight: number; reps: number }[]): WorkoutSession => ({
  id: `w-${date}`,
  userId: 'u1',
  dayId: 'day1',
  date,
  completed: true,
  exercises: [{
    exerciseId,
    sets: [
      { reps: 5, weight: 20, completed: true, isWarmup: true },
      ...sets.map(s => ({ reps: s.reps, weight: s.weight, completed: true })),
    ],
  }],
});

describe('getExerciseHistory', () => {
  it('sorts ascending, ignores warmup, takes max weight', () => {
    const workouts = [
      makeWorkout('2026-01-10', 'ex1', [{ weight: 60, reps: 8 }, { weight: 50, reps: 10 }]),
      makeWorkout('2026-01-03', 'ex1', [{ weight: 40, reps: 8 }]),
    ];
    const history = getExerciseHistory(workouts, 'ex1');
    expect(history).toHaveLength(2);
    expect(history[0].date).toBe('2026-01-03');
    expect(history[1].date).toBe('2026-01-10');
    expect(history[1].maxWeight).toBe(60);
  });

  it('returns empty array for empty workouts', () => {
    expect(getExerciseHistory([], 'ex1')).toEqual([]);
  });

  it('filters by exerciseId', () => {
    const workouts = [
      makeWorkout('2026-01-03', 'ex1', [{ weight: 40, reps: 8 }]),
      makeWorkout('2026-01-10', 'ex2', [{ weight: 60, reps: 8 }]),
    ];
    const history = getExerciseHistory(workouts, 'ex1');
    expect(history).toHaveLength(1);
    expect(history[0].maxWeight).toBe(40);
  });

  it('does not merge progression from the pre-swap exercise identity', () => {
    const workouts = [
      makeWorkout('2026-01-03', 'ex1', [{ weight: 80, reps: 8 }]),
      makeWorkout('2026-01-10', 'ex1__swap-pompki', [{ weight: 0, reps: 15 }]),
    ];

    const history = getExerciseHistory(workouts, 'ex1__swap-pompki', true);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ date: '2026-01-10', bestReps: 15, maxWeight: 0 });
  });
});

describe('detectPlateau', () => {
  it('returns isPlateau=true when no progress for 4+ sessions', () => {
    const history = [
      { date: '2026-01-01', maxWeight: 50, bestReps: 8, estimated1RM: 60, totalVolume: 400 },
      { date: '2026-01-08', maxWeight: 60, bestReps: 8, estimated1RM: 72, totalVolume: 480 },
      { date: '2026-01-15', maxWeight: 60, bestReps: 8, estimated1RM: 72, totalVolume: 480 },
      { date: '2026-01-22', maxWeight: 60, bestReps: 8, estimated1RM: 72, totalVolume: 480 },
      { date: '2026-01-29', maxWeight: 60, bestReps: 8, estimated1RM: 72, totalVolume: 480 },
    ];
    const result = detectPlateau(history);
    expect(result.isPlateau).toBe(true);
  });

  it('returns isPlateau=false when progress in last 4', () => {
    const history = [
      { date: '2026-01-01', maxWeight: 50, bestReps: 8, estimated1RM: 60, totalVolume: 400 },
      { date: '2026-01-08', maxWeight: 55, bestReps: 8, estimated1RM: 66, totalVolume: 440 },
      { date: '2026-01-15', maxWeight: 57.5, bestReps: 8, estimated1RM: 69, totalVolume: 460 },
      { date: '2026-01-22', maxWeight: 60, bestReps: 8, estimated1RM: 72, totalVolume: 480 },
    ];
    const result = detectPlateau(history);
    expect(result.isPlateau).toBe(false);
  });

  it('returns isPlateau=false when fewer than 4 sessions', () => {
    const history = [
      { date: '2026-01-01', maxWeight: 50, bestReps: 8, estimated1RM: 60, totalVolume: 400 },
      { date: '2026-01-08', maxWeight: 50, bestReps: 8, estimated1RM: 60, totalVolume: 400 },
    ];
    const result = detectPlateau(history);
    expect(result.isPlateau).toBe(false);
  });
});

describe('getProgressionSummary', () => {
  it('calculates change percent', () => {
    const history = [
      { date: '2026-01-01', maxWeight: 40, bestReps: 8, estimated1RM: 48, totalVolume: 320 },
      { date: '2026-01-08', maxWeight: 50, bestReps: 8, estimated1RM: 60, totalVolume: 400 },
    ];
    const summary = getProgressionSummary(history);
    expect(summary.startValue).toBe(40);
    expect(summary.currentValue).toBe(50);
    expect(summary.change).toBe(10);
    expect(summary.changePercent).toBe(25);
    expect(summary.totalSessions).toBe(2);
  });

  it('returns change=0 for single session', () => {
    const history = [
      { date: '2026-01-01', maxWeight: 40, bestReps: 8, estimated1RM: 48, totalVolume: 320 },
    ];
    const summary = getProgressionSummary(history);
    expect(summary.change).toBe(0);
    expect(summary.changePercent).toBe(0);
    expect(summary.totalSessions).toBe(1);
  });
});
