import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';
import {
  applyWeekdaysToPlanDays,
  buildActiveCyclePlanPatch,
  chunkForFirestoreWrite,
  getCycleStartPreview,
  hasExactWeekdaySelection,
  nextExerciseIdForDay,
  planDaysMismatch,
  planExerciseOverlap,
  shouldMergeContinuousCycles,
} from '@/lib/plan-cycle-utils';

const day = (id: string, exerciseIds: string[] = ['ex-1-1', 'ex-1-2']): TrainingDay => ({
  id,
  dayName: 'Poniedziałek',
  weekday: 'monday',
  focus: 'Push',
  exercises: exerciseIds.map((exerciseId, index) => ({
    id: exerciseId,
    name: `Exercise ${index + 1}`,
    sets: '3 x 8',
    instructions: [],
  })),
});

const cycle = (id: string, startDate: string, endDate: string, days: TrainingDay[]): PlanCycle => ({
  id,
  userId: 'u1',
  startDate,
  endDate,
  days,
  durationWeeks: 4,
  status: 'completed',
  createdAt: '2026-01-01T00:00:00.000Z',
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
});

describe('plan cycle utilities', () => {
  it('marks PlanWizard weekdays invalid until the unique selected count matches daysPerWeek', () => {
    expect(hasExactWeekdaySelection(['monday', 'wednesday'], 3)).toBe(false);
    expect(hasExactWeekdaySelection(['monday', 'wednesday', 'wednesday', 'friday'], 3)).toBe(true);
  });

  it('applies exactly the selected weekdays in calendar order without duplicates', () => {
    const days = [day('d1'), day('d2'), day('d3'), day('d4')];
    const result = applyWeekdaysToPlanDays(days, ['friday', 'monday', 'monday', 'wednesday']);

    expect(result).toHaveLength(3);
    expect(result.map(d => d.weekday)).toEqual(['monday', 'wednesday', 'friday']);
    expect(new Set(result.map(d => d.weekday)).size).toBe(3);
  });

  it('planDaysMismatch wykrywa rozjazd liczby dni planu i wyboru usera (Z72)', () => {
    const plan = { days: [day('d1'), day('d2'), day('d3'), day('d4'), day('d5')] };
    expect(planDaysMismatch(plan, 6)).toEqual({ planDays: 5, selectedDays: 6 });
    expect(planDaysMismatch(plan, 5)).toBeNull();
  });

  it('generates a non-duplicate exercise id after removing a middle exercise', () => {
    const trainingDay = day('day-1', ['ex-1-1', 'ex-1-3']);

    expect(nextExerciseIdForDay(trainingDay)).toBe('ex-1-4');
  });

  it('builds the active cycle snapshot patch from the edited plan', () => {
    const edited = [day('day-1', ['ex-1-1'])];

    expect(buildActiveCyclePlanPatch(edited, 8, '2026-05-04')).toEqual({
      days: edited,
      durationWeeks: 8,
      startDate: '2026-05-04',
    });
  });

  it('only merges nearby cycles when plan identity overlaps', () => {
    const first = cycle('c1', '2026-01-05', '2026-02-01', [
      { ...day('day-1'), exercises: [
        { id: 'a', name: 'Squat', sets: '3 x 5', instructions: [] },
        { id: 'b', name: 'Bench', sets: '3 x 5', instructions: [] },
      ] },
    ]);
    const samePlan = cycle('c2', '2026-02-08', '2026-03-01', [
      { ...day('day-1'), exercises: [
        { id: 'x', name: 'Squat', sets: '4 x 5', instructions: [] },
        { id: 'y', name: 'Bench', sets: '4 x 5', instructions: [] },
      ] },
    ]);
    const differentPlan = cycle('c3', '2026-02-08', '2026-03-01', [
      { ...day('day-1'), exercises: [
        { id: 'x', name: 'Run', sets: '20 min', instructions: [] },
        { id: 'y', name: 'Pull-up', sets: '3 x 8', instructions: [] },
      ] },
    ]);

    expect(planExerciseOverlap(first.days, samePlan.days)).toBe(1);
    expect(shouldMergeContinuousCycles(first, samePlan)).toBe(true);
    expect(shouldMergeContinuousCycles(first, differentPlan)).toBe(false);
  });

  it('treats the 2026-03-29 DST boundary as consecutive calendar days', () => {
    const first = cycle('c1', '2026-03-02', '2026-03-28', [day('day-1')]);
    const next = cycle('c2', '2026-03-30', '2026-04-26', [day('day-1')]);

    expect(shouldMergeContinuousCycles(first, next)).toBe(true);
  });

  it('anchors a Wednesday start to that calendar week’s Monday', () => {
    expect(getCycleStartPreview('2026-03-25')).toEqual({
      selectedDate: '2026-03-25',
      cycleStartDate: '2026-03-23',
    });
  });

  it('splits a 501-workout remap into resumable Firestore-sized batches', () => {
    const chunks = chunkForFirestoreWrite(Array.from({ length: 501 }, (_, index) => index));
    expect(chunks.map(chunk => chunk.length)).toEqual([450, 51]);
    expect(chunks.flat()).toHaveLength(501);
  });
});
