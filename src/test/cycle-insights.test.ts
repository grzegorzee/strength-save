import { describe, expect, it } from 'vitest';
import { buildCycleComparison, buildCycleRecommendation, computeCycleStats } from '@/lib/cycle-insights';
import type { PlanCycle } from '@/types/cycles';
import type { WorkoutSession } from '@/types';

const planDays = [
  {
    id: 'day-1',
    dayName: 'Poniedziałek',
    weekday: 'monday',
    focus: 'Push',
    exercises: [{ id: 'ex-1', name: 'Bench Press', sets: '3x6', instructions: [] }],
  },
  {
    id: 'day-2',
    dayName: 'Środa',
    weekday: 'wednesday',
    focus: 'Pull',
    exercises: [{ id: 'ex-2', name: 'Row', sets: '3x6', instructions: [] }],
  },
];

const workouts: WorkoutSession[] = [
  {
    id: 'w1',
    userId: 'user-1',
    dayId: 'day-1',
    date: '2026-04-01',
    completed: true,
    cycleId: 'cycle-current',
    exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 6, weight: 60, completed: true }] }],
  },
  {
    id: 'w2',
    userId: 'user-1',
    dayId: 'day-2',
    date: '2026-04-03',
    completed: true,
    cycleId: 'cycle-current',
    exercises: [{ exerciseId: 'ex-2', sets: [{ reps: 6, weight: 70, completed: true }] }],
  },
];

describe('cycle-insights', () => {
  it('computes richer cycle stats', () => {
    const stats = computeCycleStats(workouts, planDays, '2026-03-30', '2026-04-13', 2, 'cycle-current');
    expect(stats.totalWorkouts).toBe(2);
    expect(stats.expectedWorkouts).toBe(4);
    expect(stats.missedWorkouts).toBe(2);
    expect(stats.averageTonnagePerWorkout).toBeGreaterThan(0);
    expect(stats.prs.length).toBeGreaterThan(0);
  });

  it('builds recommendation based on current and previous cycle', () => {
    const currentCycle: PlanCycle = {
      id: 'cycle-current',
      userId: 'user-1',
      days: planDays,
      durationWeeks: 2,
      startDate: '2026-03-30',
      endDate: '2026-04-13',
      status: 'active',
      createdAt: '2026-03-30T10:00:00.000Z',
      stats: computeCycleStats(workouts, planDays, '2026-03-30', '2026-04-13', 2, 'cycle-current'),
    };

    const previousCycle: PlanCycle = {
      ...currentCycle,
      id: 'cycle-prev',
      status: 'completed',
      stats: {
        totalWorkouts: 1,
        totalTonnage: 300,
        prs: [],
        completionRate: 20,
      },
    };

    const comparison = buildCycleComparison(currentCycle, previousCycle);
    expect(comparison?.completionRateDelta).toBeGreaterThan(0);

    const recommendation = buildCycleRecommendation(currentCycle, previousCycle, new Date('2026-04-05'));
    expect(recommendation.title.length).toBeGreaterThan(0);
  });
});
