import { describe, expect, it } from 'vitest';
import { buildPlanNextStep } from '@/lib/plan-next-step';
import type { PlanCycle } from '@/types/cycles';

const activeCycle: PlanCycle = {
  id: 'cycle-1',
  userId: 'user-1',
  days: [],
  durationWeeks: 8,
  startDate: '2026-03-01',
  endDate: '2026-04-03',
  status: 'active',
  createdAt: '2026-03-01T00:00:00.000Z',
  stats: {
    totalWorkouts: 16,
    totalTonnage: 32000,
    prs: [
      { exerciseName: 'Przysiad', weight: 120, estimated1RM: 144 },
      { exerciseName: 'Martwy ciąg', weight: 160, estimated1RM: 192 },
      { exerciseName: 'Wyciskanie', weight: 90, estimated1RM: 108 },
    ],
    completionRate: 88,
    expectedWorkouts: 18,
    missedWorkouts: 2,
    averageWorkoutsPerWeek: 2,
    averageTonnagePerWorkout: 2000,
  },
};

describe('buildPlanNextStep', () => {
  it('suggests generating a new plan in the final week of an active cycle', () => {
    const result = buildPlanNextStep({
      hasPlan: true,
      isPlanExpired: false,
      weeksRemaining: 0,
      currentWeek: 8,
      planDurationWeeks: 8,
      activeCycle,
      previousCompletedCycle: null,
      today: new Date('2026-04-03T10:00:00.000Z'),
    });

    expect(result?.primaryPath).toBe('/new-plan?fromCycle=cycle-1');
    expect(result?.primaryLabel).toBe('Przygotuj kolejny plan');
    expect(result?.badges).toContain('88% frekwencji');
  });

  it('does not show a generic prompt in the middle of a plan', () => {
    const result = buildPlanNextStep({
      hasPlan: true,
      isPlanExpired: false,
      weeksRemaining: 4,
      currentWeek: 4,
      planDurationWeeks: 8,
      activeCycle: null,
      previousCompletedCycle: null,
      today: new Date('2026-04-03T10:00:00.000Z'),
    });

    expect(result).toBeNull();
  });
});
