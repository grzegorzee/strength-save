import { describe, expect, it, vi } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import { completeOnboardingPlan, startCycleWithPlan } from '@/lib/cycle-actions';

const days: TrainingDay[] = [{
  id: 'day-1',
  dayName: 'Poniedziałek',
  weekday: 'monday',
  focus: 'Push',
  exercises: [{ id: 'ex-1-1', name: 'Bench', sets: '3 x 5', instructions: [] }],
}];

describe('cycle lifecycle actions', () => {
  it('archives the previous plan as a completed cycle when starting a new one', async () => {
    const savePlan = vi.fn().mockResolvedValue({ success: true });
    const createActiveCycle = vi.fn().mockResolvedValue('new-cycle-id');
    const archiveCurrentPlan = vi.fn().mockResolvedValue('archived-cycle-id');
    const backfillHistoricalWorkouts = vi.fn().mockResolvedValue(undefined);

    const oldPlan: TrainingDay[] = [{
      id: 'old-day-1',
      dayName: 'Wtorek',
      weekday: 'tuesday',
      focus: 'Pull',
      exercises: [{ id: 'old-ex-1', name: 'Row', sets: '3 x 8', instructions: [] }],
    }];

    const result = await startCycleWithPlan(days, 8, {
      uid: 'u1',
      currentPlan: oldPlan,
      planStartDate: '2026-05-04',
      planDurationWeeks: 6,
      workouts: [],
      startDate: '2026-06-10',
      archiveCurrentPlan,
      savePlan,
      createActiveCycle,
      backfillHistoricalWorkouts,
    });

    expect(result.success).toBe(true);
    // Stary plan trafia do archiwum (cykl completed), nie jest kasowany w ciszy.
    expect(archiveCurrentPlan).toHaveBeenCalledWith(oldPlan, 6, '2026-05-04', []);
    // Historia treningów dotagowana snapshotem zarchiwizowanego cyklu.
    expect(backfillHistoricalWorkouts).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'archived-cycle-id', days: oldPlan, status: 'completed' }),
    ]);
  });

  it('rolls back NewPlan plan save when active cycle creation fails', async () => {
    const savePlan = vi.fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: true });
    const createActiveCycle = vi.fn().mockResolvedValue(null);
    const archiveCurrentPlan = vi.fn();

    const result = await startCycleWithPlan(days, 8, {
      uid: 'u1',
      currentPlan: days,
      planStartDate: '2026-05-04',
      planDurationWeeks: 6,
      workouts: [],
      startDate: '2026-06-10',
      archiveCurrentPlan,
      savePlan,
      createActiveCycle,
      backfillHistoricalWorkouts: vi.fn(),
    });

    expect(result.success).toBe(false);
    expect(createActiveCycle).toHaveBeenCalledTimes(1);
    expect(archiveCurrentPlan).not.toHaveBeenCalled();
    expect(savePlan).toHaveBeenNthCalledWith(1, expect.arrayContaining([
      expect.objectContaining({ id: '2026-06-08-d1' }),
    ]), { durationWeeks: 8, startDate: '2026-06-08', syncActiveCycle: false });
    expect(savePlan).toHaveBeenNthCalledWith(2, days, {
      durationWeeks: 6,
      startDate: '2026-05-04',
      syncActiveCycle: false,
    });
  });

  it('does not mark onboarding complete when active cycle creation fails', async () => {
    const markOnboardingComplete = vi.fn();

    const result = await completeOnboardingPlan({
      days,
      durationWeeks: 8,
      startDate: '2026-06-10',
      level: 'beginner',
      objective: 'build_muscle',
      daysPerWeek: 3,
    }, {
      savePlan: vi.fn().mockResolvedValue({ success: true }),
      createActiveCycle: vi.fn().mockResolvedValue(null),
      markOnboardingComplete,
    });

    expect(result.success).toBe(false);
    expect(markOnboardingComplete).not.toHaveBeenCalled();
  });
});
