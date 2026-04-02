import { describe, it, expect } from 'vitest';
import { getExerciseHistory, detectPlateau, getProgressionSummary } from '@/lib/exercise-progression';
import type { WorkoutSession } from '@/types';

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
