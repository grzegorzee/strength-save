import { describe, expect, it, vi } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import { completeOnboardingPlan, repeatPlanSource, runCycleAutoRepair, startCycleWithPlan } from '@/lib/cycle-actions';

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

  it('retries onboarding after a plan-write failure without creating a second active cycle', async () => {
    const createActiveCycle = vi.fn().mockResolvedValue('cycle-u1-2026-06-08');
    const savePlan = vi.fn()
      .mockResolvedValueOnce({ success: false, error: 'offline' })
      .mockResolvedValueOnce({ success: true });
    const markOnboardingComplete = vi.fn().mockResolvedValue(undefined);
    const choice = {
      days,
      durationWeeks: 8,
      startDate: '2026-06-10',
      level: 'beginner',
      objective: 'build_muscle',
      daysPerWeek: 3,
    };

    expect((await completeOnboardingPlan(choice, { savePlan, createActiveCycle, markOnboardingComplete })).success).toBe(false);
    expect((await completeOnboardingPlan(choice, { savePlan, createActiveCycle, markOnboardingComplete })).success).toBe(true);
    expect(createActiveCycle).toHaveBeenCalledTimes(2);
    expect(createActiveCycle).toHaveBeenNthCalledWith(1, expect.any(Array), 8, '2026-06-08');
    expect(markOnboardingComplete).toHaveBeenCalledTimes(1);
  });
});

describe('Z86: wskrzeszenie starego planu', () => {
  const currentPlan: TrainingDay[] = ['A', 'B', 'C', 'D'].map((name, i) => ({
    id: `day-${i + 1}`,
    dayName: name,
    weekday: 'monday' as const,
    focus: 'Push',
    exercises: [{ id: `ex-${i + 1}`, name: `Ćwiczenie ${name}`, sets: '3 x 5', instructions: [] }],
  }));
  const staleCycleDays: TrainingDay[] = ['stary1', 'stary2', 'stary3'].map((name, i) => ({
    id: `old-day-${i + 1}`,
    dayName: name,
    weekday: 'monday' as const,
    focus: 'Pull',
    exercises: [{ id: `old-ex-${i + 1}`, name, sets: '3 x 8', instructions: [] }],
  }));

  it('źródłem powtórzenia planu jest BIEŻĄCY plan, nie snapshot przeterminowanego cyklu', () => {
    const source = repeatPlanSource(currentPlan, 12, { days: staleCycleDays, durationWeeks: 8 });
    expect(source.days).toBe(currentPlan);
    expect(source.durationWeeks).toBe(12);
  });

  it('snapshot cyklu jest fallbackiem wyłącznie przy pustym planie', () => {
    const source = repeatPlanSource([], 12, { days: staleCycleDays, durationWeeks: 8 });
    expect(source.days).toBe(staleCycleDays);
    expect(source.durationWeeks).toBe(8);

    expect(repeatPlanSource([], 12, null).days).toEqual([]);
  });

  it('auto-przedłużenie zapisuje dni BIEŻĄCEGO planu, nie dni przeterminowanego cyklu', async () => {
    const savePlan = vi.fn().mockResolvedValue({ success: true });
    const source = repeatPlanSource(currentPlan, 12, { days: staleCycleDays, durationWeeks: 8 });

    await startCycleWithPlan(source.days, source.durationWeeks, {
      uid: 'u1',
      currentPlan,
      planStartDate: '2026-01-26',
      planDurationWeeks: 12,
      workouts: [],
      startDate: '2026-07-06',
      archiveCurrentPlan: vi.fn().mockResolvedValue('archived-id'),
      savePlan,
      createActiveCycle: vi.fn().mockResolvedValue('new-cycle-id'),
      backfillHistoricalWorkouts: vi.fn(),
    });

    const savedDays = savePlan.mock.calls[0][0] as TrainingDay[];
    expect(savedDays.map(day => day.dayName)).toEqual(['A', 'B', 'C', 'D']);
    expect(savedDays.map(day => day.dayName)).not.toContain('stary1');
  });

  it('drugi równoległy start cyklu nie nadpisuje planu po PLAN_CONFLICT', async () => {
    const savePlan = vi.fn()
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false, error: 'PLAN_CONFLICT' });
    const createActiveCycle = vi.fn().mockResolvedValue('new-cycle-id');
    const deps = {
      uid: 'u1',
      currentPlan,
      planStartDate: '2026-06-01',
      planDurationWeeks: 12,
      workouts: [],
      archiveCurrentPlan: vi.fn().mockResolvedValue(null),
      savePlan,
      createActiveCycle,
      backfillHistoricalWorkouts: vi.fn(),
    };

    const first = await startCycleWithPlan(currentPlan, 12, deps);
    const second = await startCycleWithPlan(currentPlan, 12, deps);

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.error).toBe('PLAN_CONFLICT');
    // Przegrany wyścig NIE tworzy drugiego aktywnego cyklu.
    expect(createActiveCycle).toHaveBeenCalledTimes(1);
  });
});

describe('runCycleAutoRepair (R2-27)', () => {
  const makeGuard = () => {
    let value = false;
    return {
      get: vi.fn(() => value),
      set: vi.fn(() => { value = true; }),
      clear: vi.fn(() => { value = false; }),
    };
  };

  it('porazka create (np. offline) czysci guard - auto-naprawa ponowi sie po powrocie', async () => {
    const guard = makeGuard();
    const create = vi.fn(async () => null);

    await runCycleAutoRepair({ guard, create });
    expect(guard.clear).toHaveBeenCalledTimes(1);

    // Powrot online: druga proba NIE jest zablokowana wypalonym guardem.
    await runCycleAutoRepair({ guard, create });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('sukces create zostawia guard (remount nie tworzy duplikatu)', async () => {
    const guard = makeGuard();
    const create = vi.fn(async () => 'cycle-1');

    await runCycleAutoRepair({ guard, create });
    await runCycleAutoRepair({ guard, create });

    expect(create).toHaveBeenCalledTimes(1);
    expect(guard.clear).not.toHaveBeenCalled();
  });

  it('guard ustawiany PRZED create (okno async chronione przed remountem)', async () => {
    const guard = makeGuard();
    let guardAtCreate = false;
    const create = vi.fn(async () => {
      guardAtCreate = guard.get();
      return 'cycle-1';
    });

    await runCycleAutoRepair({ guard, create });

    expect(guardAtCreate).toBe(true);
  });
});
