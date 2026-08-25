import { describe, expect, it, vi } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import { completeOnboardingPlan, endPlan, repeatPlanSource, runCycleAutoRepair, shouldAutoEndPlan, startCycleWithPlan } from '@/lib/cycle-actions';
import { buildPlanCycleChoice } from '@/lib/plan-cycle-choice';

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
    // H1 bug B (X31): swiezo utworzony cykl jest wykluczony z archiwizacji.
    expect(archiveCurrentPlan).toHaveBeenCalledWith(oldPlan, 6, '2026-05-04', [], { excludeCycleId: 'new-cycle-id' });
    // Historia treningów dotagowana snapshotem zarchiwizowanego cyklu.
    expect(backfillHistoricalWorkouts).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'archived-cycle-id', days: oldPlan, status: 'completed' }),
    ]);
    // WP-PLANS-1 (X27): start nowego planu reaktywuje dokument po 'ended'.
    expect(savePlan).toHaveBeenNthCalledWith(1, expect.any(Array), expect.objectContaining({ status: 'active' }));
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
    ]), { durationWeeks: 8, startDate: '2026-06-08', syncActiveCycle: false, status: 'active' });
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

// WP-6 (X33): odpowiedzi z kreatora ida do createActiveCycle jako opts.choice.
describe('WP-6 (X33): choice przekazywane do createActiveCycle', () => {
  const choice = buildPlanCycleChoice(
    { level: 'beginner', objective: 'build_muscle', daysPerWeek: 3, trainingDays: ['monday', 'wednesday', 'friday'], templateId: 'tpl-x' },
    'replan',
    new Date('2026-08-25T10:30:00.000Z'),
  );

  it('startCycleWithPlan: deps.choice -> createActiveCycle(days, weeks, start, { choice })', async () => {
    const createActiveCycle = vi.fn().mockResolvedValue('new-cycle-id');
    const result = await startCycleWithPlan(days, 8, {
      uid: 'u1',
      currentPlan: [],
      planStartDate: null,
      planDurationWeeks: 8,
      workouts: [],
      startDate: '2026-06-10',
      choice,
      archiveCurrentPlan: vi.fn(),
      savePlan: vi.fn().mockResolvedValue({ success: true }),
      createActiveCycle,
      backfillHistoricalWorkouts: vi.fn(),
    });

    expect(result.success).toBe(true);
    expect(createActiveCycle).toHaveBeenCalledWith(expect.any(Array), 8, '2026-06-08', { choice });
  });

  it('NIEZMIENNIK: startCycleWithPlan bez choice (Powtorz plan, przedluzenie) wola createActiveCycle bez opts', async () => {
    const createActiveCycle = vi.fn().mockResolvedValue('new-cycle-id');
    await startCycleWithPlan(days, 8, {
      uid: 'u1',
      currentPlan: [],
      planStartDate: null,
      planDurationWeeks: 8,
      workouts: [],
      startDate: '2026-06-10',
      archiveCurrentPlan: vi.fn(),
      savePlan: vi.fn().mockResolvedValue({ success: true }),
      createActiveCycle,
      backfillHistoricalWorkouts: vi.fn(),
    });

    expect(createActiveCycle).toHaveBeenCalledWith(expect.any(Array), 8, '2026-06-08');
    expect(createActiveCycle.mock.calls[0]).toHaveLength(3);
  });

  it('completeOnboardingPlan: deps.choice -> createActiveCycle(days, weeks, start, { choice })', async () => {
    const createActiveCycle = vi.fn().mockResolvedValue('cycle-u1-2026-06-08');
    const onboardingChoice = { ...choice, entry: 'onboarding' as const };
    const result = await completeOnboardingPlan(
      { days, durationWeeks: 8, startDate: '2026-06-10', level: 'beginner', objective: 'build_muscle', daysPerWeek: 3 },
      {
        savePlan: vi.fn().mockResolvedValue({ success: true }),
        createActiveCycle,
        markOnboardingComplete: vi.fn().mockResolvedValue(undefined),
        choice: onboardingChoice,
      },
    );

    expect(result.success).toBe(true);
    expect(createActiveCycle).toHaveBeenCalledWith(expect.any(Array), 8, '2026-06-08', { choice: onboardingChoice });
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

// WP-PLANS-2 (X27, Task O1): jawna data startu (poniedziałek) + nazwa planu.
describe('startCycleWithPlan: startDateISO + planName (WP-PLANS-2)', () => {
  const isoDaysFromMonday = (offsetDays: number) => {
    const d = new Date();
    const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const currentMonday = () => isoDaysFromMonday(0);
  const futureMonday = (weeksAhead: number) => isoDaysFromMonday(weeksAhead * 7);

  const makeDeps = () => ({
    uid: 'u1',
    currentPlan: [] as TrainingDay[],
    planStartDate: null,
    planDurationWeeks: 12,
    workouts: [],
    archiveCurrentPlan: vi.fn(),
    savePlan: vi.fn().mockResolvedValue({ success: true }),
    createActiveCycle: vi.fn().mockResolvedValue('cycle-1'),
    backfillHistoricalWorkouts: vi.fn(),
  });

  it('startDateISO (przyszły poniedziałek) trafia 1:1 do planu, cyklu i id dni', async () => {
    const deps = makeDeps();
    const monday = futureMonday(2);

    const result = await startCycleWithPlan(days, 12, { ...deps, startDateISO: monday });

    expect(result.success).toBe(true);
    expect(deps.savePlan).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: `${monday}-d1` })]),
      expect.objectContaining({ startDate: monday }),
    );
    expect(deps.createActiveCycle).toHaveBeenCalledWith(expect.any(Array), 12, monday);
  });

  it('planName jest sanityzowany (trim, max 60) i zapisywany na training_plans', async () => {
    const deps = makeDeps();

    await startCycleWithPlan(days, 12, { ...deps, planName: `  ${'x'.repeat(70)}  ` });

    expect(deps.savePlan).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ name: 'x'.repeat(60) }),
    );
  });

  it('pusty planName nie zapisuje pola name', async () => {
    const deps = makeDeps();

    await startCycleWithPlan(days, 12, { ...deps, planName: '   ' });

    const options = deps.savePlan.mock.calls[0][1] as Record<string, unknown>;
    expect('name' in options).toBe(false);
  });

  it('nieprawidłowy startDateISO (nie-poniedziałek / przeszłość / >8 tyg.) spada do dotychczasowego zachowania', async () => {
    for (const bad of [isoDaysFromMonday(1), isoDaysFromMonday(-7), futureMonday(9)]) {
      const deps = makeDeps();
      await startCycleWithPlan(days, 12, { ...deps, startDateISO: bad });
      expect(deps.savePlan).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ startDate: currentMonday() }),
      );
    }
  });

  it('bez nowych opts zachowanie jak dotąd (niezmiennik: snap startDate do poniedziałku)', async () => {
    const deps = makeDeps();

    await startCycleWithPlan(days, 8, { ...deps, startDate: '2026-06-10' });

    expect(deps.savePlan).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ startDate: '2026-06-08' }),
    );
    const options = deps.savePlan.mock.calls[0][1] as Record<string, unknown>;
    expect('name' in options).toBe(false);
  });

  it('completeOnboardingPlan przekazuje planName do zapisu planu', async () => {
    const savePlan = vi.fn().mockResolvedValue({ success: true });

    const result = await completeOnboardingPlan({
      days,
      durationWeeks: 8,
      startDate: '2026-06-10',
      level: 'beginner',
      objective: 'build_muscle',
      daysPerWeek: 3,
      planName: '  Mój blok FBW  ',
    }, {
      savePlan,
      createActiveCycle: vi.fn().mockResolvedValue('cycle-1'),
      markOnboardingComplete: vi.fn().mockResolvedValue(undefined),
    });

    expect(result.success).toBe(true);
    expect(savePlan).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ name: 'Mój blok FBW' }),
    );
  });
});

// WP-PLANS-1 (X27, Task P2): zakończenie planu bez wybierania nowego.
describe('endPlan (WP-PLANS-1)', () => {
  const makeDeps = () => ({
    uid: 'u1',
    currentPlan: days,
    planStartDate: '2026-05-04',
    planDurationWeeks: 8,
    workouts: [],
    archiveCurrentPlan: vi.fn().mockResolvedValue('archived-cycle-id'),
    backfillHistoricalWorkouts: vi.fn().mockResolvedValue(undefined),
    setPlanStatus: vi.fn().mockResolvedValue({ success: true }),
    emitPlanEvent: vi.fn(),
  });

  it('archiwizuje cykl, robi backfill, ustawia status ended i emituje event — bez nowego cyklu', async () => {
    const deps = makeDeps();

    const result = await endPlan({ chooseNew: false }, deps);

    expect(result.success).toBe(true);
    expect(result.archivedCycleId).toBe('archived-cycle-id');
    expect(deps.archiveCurrentPlan).toHaveBeenCalledWith(days, 8, '2026-05-04', []);
    expect(deps.backfillHistoricalWorkouts).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'archived-cycle-id', days, status: 'completed' }),
    ]);
    // H1 (X31): status 'ended' z precondycja startDate konczonego planu.
    expect(deps.setPlanStatus).toHaveBeenCalledWith('ended', { expectedStartDate: '2026-05-04' });
    expect(deps.emitPlanEvent).toHaveBeenCalledWith('ended', { days: 1, weeks: 8, startDate: '2026-05-04' });
  });

  it('H1 (X31): stale precondycja statusu (dokument to juz inny plan) -> brak eventu, reason stale', async () => {
    const deps = makeDeps();
    deps.setPlanStatus.mockResolvedValue({ success: false, reason: 'stale' });

    const result = await endPlan({ chooseNew: false }, deps);

    expect(result.success).toBe(false);
    expect(result.reason).toBe('stale');
    // Archiwizacja starego cyklu byla poprawna (cykl wygasl), ale plan
    // usera (nowy startDate) nie dostaje 'ended' ani eventu 'ended'.
    expect(deps.archiveCurrentPlan).toHaveBeenCalledTimes(1);
    expect(deps.emitPlanEvent).not.toHaveBeenCalled();
  });

  it('kolejność: archive + backfill PRZED mutacją planu (bezpieczeństwo historii)', async () => {
    const deps = makeDeps();

    await endPlan({ chooseNew: false }, deps);

    const archiveOrder = deps.archiveCurrentPlan.mock.invocationCallOrder[0];
    const backfillOrder = deps.backfillHistoricalWorkouts.mock.invocationCallOrder[0];
    const statusOrder = deps.setPlanStatus.mock.invocationCallOrder[0];
    expect(archiveOrder).toBeLessThan(backfillOrder);
    expect(backfillOrder).toBeLessThan(statusOrder);
  });

  it('porażka archiwizacji NIE mutuje planu (status nietknięty, brak eventu)', async () => {
    const deps = makeDeps();
    deps.archiveCurrentPlan.mockResolvedValue(null);

    const result = await endPlan({ chooseNew: false }, deps);

    expect(result.success).toBe(false);
    expect(deps.setPlanStatus).not.toHaveBeenCalled();
    expect(deps.emitPlanEvent).not.toHaveBeenCalled();
  });

  it('brak planu (pusty / bez startDate) → odmowa bez wywołań', async () => {
    const deps = makeDeps();
    deps.planStartDate = null as unknown as string;

    const result = await endPlan({ chooseNew: false }, deps);

    expect(result.success).toBe(false);
    expect(deps.archiveCurrentPlan).not.toHaveBeenCalled();
  });
});

// WP-PLANS-1 (X27, Task P4): warunki auto-końca planu po upływie durationWeeks.
describe('shouldAutoEndPlan (WP-PLANS-1)', () => {
  const base = {
    planLoaded: true,
    cyclesLoaded: true,
    planFromServer: true,
    cyclesFromServer: true,
    planStatus: 'active' as const,
    isPlanExpired: true,
    hasActiveCycle: true,
    hasBlockingDraft: false,
  };

  it('elapsed >= duration + cykl active + brak draftu → auto-end', () => {
    expect(shouldAutoEndPlan(base)).toBe(true);
  });

  it('H1 (X31): snapshot wylacznie z cache (plan lub cykle) → nic; offline = brak auto-endu', () => {
    expect(shouldAutoEndPlan({ ...base, planFromServer: false })).toBe(false);
    expect(shouldAutoEndPlan({ ...base, cyclesFromServer: false })).toBe(false);
  });

  it('idempotencja: plan już ended → nic (drugi load nie robi nic)', () => {
    expect(shouldAutoEndPlan({ ...base, planStatus: 'ended' })).toBe(false);
    expect(shouldAutoEndPlan({ ...base, planStatus: 'none' })).toBe(false);
  });

  it('draft continuable (aktywna sesja) → poczekaj do następnego wejścia', () => {
    expect(shouldAutoEndPlan({ ...base, hasBlockingDraft: true })).toBe(false);
  });

  it('plan w terminie / brak aktywnego cyklu / niedoładowane dane → nic', () => {
    expect(shouldAutoEndPlan({ ...base, isPlanExpired: false })).toBe(false);
    expect(shouldAutoEndPlan({ ...base, hasActiveCycle: false })).toBe(false);
    expect(shouldAutoEndPlan({ ...base, planLoaded: false })).toBe(false);
    expect(shouldAutoEndPlan({ ...base, cyclesLoaded: false })).toBe(false);
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

// X34b: data pierwszego treningu -> skippedDates zapisywane RAZEM z planem
// (savePlan options), nie osobnym zapisem; bez pola zachowanie jak dotad.
describe('skippedDates z kreatora (X34b)', () => {
  const isoDaysFromMonday = (offsetDays: number) => {
    const d = new Date();
    const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1) + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const makeDeps = () => ({
    uid: 'u1',
    currentPlan: [] as TrainingDay[],
    planStartDate: null,
    planDurationWeeks: 12,
    workouts: [],
    archiveCurrentPlan: vi.fn(),
    savePlan: vi.fn().mockResolvedValue({ success: true }),
    createActiveCycle: vi.fn().mockResolvedValue('cycle-1'),
    backfillHistoricalWorkouts: vi.fn(),
  });

  it('startCycleWithPlan: deps.skippedDates trafia do savePlan razem ze startDate (jeden zapis planu)', async () => {
    const deps = makeDeps();
    const monday = isoDaysFromMonday(7);
    const skipped = [monday, isoDaysFromMonday(9)];

    await startCycleWithPlan(days, 12, { ...deps, startDateISO: monday, skippedDates: skipped });

    expect(deps.savePlan).toHaveBeenCalledTimes(1);
    expect(deps.savePlan).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ startDate: monday, skippedDates: skipped }),
    );
  });

  it('startCycleWithPlan: smieci w skippedDates sa sanityzowane (tylko YYYY-MM-DD, bez duplikatow, posortowane)', async () => {
    const deps = makeDeps();
    await startCycleWithPlan(days, 12, { ...deps, skippedDates: ['2026-08-26', 'zle', '2026-08-24', '2026-08-26'] });
    const options = deps.savePlan.mock.calls[0][1] as Record<string, unknown>;
    expect(options.skippedDates).toEqual(['2026-08-24', '2026-08-26']);
  });

  it('NIEZMIENNIK: bez skippedDates (Powtorz plan, przedluzenie) savePlan nie dostaje pola', async () => {
    const deps = makeDeps();
    await startCycleWithPlan(days, 12, deps);
    const options = deps.savePlan.mock.calls[0][1] as Record<string, unknown>;
    expect('skippedDates' in options).toBe(false);
  });

  it('completeOnboardingPlan: choice.skippedDates trafia do savePlan; bez pola savePlan bez skippedDates', async () => {
    const base = {
      days, durationWeeks: 8, startDate: '2026-08-24', level: 'beginner', objective: 'build_muscle', daysPerWeek: 3,
    };
    const withSkipped = vi.fn().mockResolvedValue({ success: true });
    await completeOnboardingPlan({ ...base, skippedDates: ['2026-08-24'] }, {
      savePlan: withSkipped,
      createActiveCycle: vi.fn().mockResolvedValue('cycle-1'),
      markOnboardingComplete: vi.fn().mockResolvedValue(undefined),
    });
    expect(withSkipped).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ startDate: '2026-08-24', skippedDates: ['2026-08-24'] }));

    const without = vi.fn().mockResolvedValue({ success: true });
    await completeOnboardingPlan(base, {
      savePlan: without,
      createActiveCycle: vi.fn().mockResolvedValue('cycle-1'),
      markOnboardingComplete: vi.fn().mockResolvedValue(undefined),
    });
    expect('skippedDates' in (without.mock.calls[0][1] as Record<string, unknown>)).toBe(false);
  });
});
