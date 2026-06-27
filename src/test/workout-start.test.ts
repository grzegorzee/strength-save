import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';
import {
  areWorkoutStartSourcesReady,
  buildWorkoutStartSnapshot,
  findUniqueCycleForDate,
} from '@/lib/workout-start';

const day: TrainingDay = {
  id: 'day-1',
  dayName: 'Monday',
  weekday: 'monday',
  focus: 'Upper',
  exercises: [{
    id: 'custom-exercise',
    name: 'Custom exercise',
    sets: '3 x 8',
    instructions: [],
  }],
};

const cycle = (overrides: Partial<PlanCycle> = {}): PlanCycle => ({
  id: 'active-cycle',
  userId: 'user-1',
  days: [day],
  durationWeeks: 12,
  startDate: '2026-06-01',
  endDate: '',
  status: 'active',
  createdAt: '2026-06-01T00:00:00.000Z',
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
  ...overrides,
});

describe('workout start readiness', () => {
  it.each([
    ['workouts → plan → cycles → draft', ['workoutsLoaded', 'planLoaded', 'cyclesLoaded', 'draftLoaded']],
    ['workouts → cycles → plan → draft', ['workoutsLoaded', 'cyclesLoaded', 'planLoaded', 'draftLoaded']],
    ['plan → workouts → cycles → draft', ['planLoaded', 'workoutsLoaded', 'cyclesLoaded', 'draftLoaded']],
    ['plan → cycles → workouts → draft', ['planLoaded', 'cyclesLoaded', 'workoutsLoaded', 'draftLoaded']],
    ['cycles → workouts → plan → draft', ['cyclesLoaded', 'workoutsLoaded', 'planLoaded', 'draftLoaded']],
    ['cycles → plan → workouts → draft', ['cyclesLoaded', 'planLoaded', 'workoutsLoaded', 'draftLoaded']],
  ] as const)('blocks every partial load order: %s', (_label, order) => {
    const state = {
      workoutsLoaded: false,
      planLoaded: false,
      cyclesLoaded: false,
      draftLoaded: false,
    };
    order.forEach((key, index) => {
      state[key] = true;
      expect(areWorkoutStartSourcesReady(state)).toBe(index === order.length - 1);
    });
  });

  it('captures custom exercises and active cycle without retaining mutable references', () => {
    const sourceCycle = cycle();
    const snapshot = buildWorkoutStartSnapshot(day, '2026-06-27', [sourceCycle]);

    day.exercises[0].name = 'Changed after start';
    sourceCycle.id = 'changed-cycle';

    expect(snapshot.activeCycleId).toBe('active-cycle');
    expect(snapshot.day.exercises.map((exercise) => exercise.name)).toEqual(['Custom exercise']);
  });

  it('does not silently choose between overlapping cycles', () => {
    expect(findUniqueCycleForDate([
      cycle(),
      cycle({ id: 'overlap', status: 'completed', endDate: '2026-06-30' }),
    ], '2026-06-20')).toBeNull();
  });

  it('finds the only cycle containing an orphan workout date', () => {
    expect(findUniqueCycleForDate([cycle()], '2026-06-20')?.id).toBe('active-cycle');
  });
});
