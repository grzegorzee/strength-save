import { describe, expect, it } from 'vitest';
import { buildCycleComparison, buildCycleRecommendation, computeCycleStats } from '@/lib/cycle-insights';
import { translate } from '@/i18n';
import type { PlanCycle } from '@/types/cycles';
import type { WorkoutSession } from '@/types';
import type { TrainingDay } from '@/data/trainingPlan';

const planDays: TrainingDay[] = [
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
  // Historia sprzed cyklu — baseline dla rekordów (ex-1 robiony na 50 kg).
  {
    id: 'w0',
    userId: 'user-1',
    dayId: 'day-1',
    date: '2026-03-20',
    completed: true,
    exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 6, weight: 50, completed: true }] }],
  },
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

  it('świeży aktywny cykl (przed planowanym końcem) NIE wyzwala closeout — choć endDate=dziś jak w preview', () => {
    // Regression #9: buildActiveCyclePreview ustawia endDate=dziś, co fałszywie dawało closeout.
    const cycle: PlanCycle = {
      id: 'fresh', userId: 'u1', days: planDays, durationWeeks: 12,
      startDate: '2026-05-25', endDate: '2026-06-08', // endDate=dziś (preview), ale plan kończy się dopiero ~08-17
      status: 'active', createdAt: '2026-05-25T00:00:00.000Z',
      stats: { totalWorkouts: 5, totalTonnage: 5000, prs: [], completionRate: 63 },
    };
    const rec = buildCycleRecommendation(cycle, null, new Date('2026-06-08'));
    expect(rec.title).toBe(translate('pl', 'cyclerec.monitor.title'));
    expect(rec.title).not.toBe(translate('pl', 'cyclerec.closeout.title'));
    // W trakcie cyklu NIE pokazujemy akcji zamknięcia/powtórzenia.
    expect(rec.canCloseout).toBe(false);
  });

  it('wygasły aktywny cykl wyzwala closeout + canCloseout=true', () => {
    const cycle: PlanCycle = {
      id: 'expired', userId: 'u1', days: planDays, durationWeeks: 12,
      startDate: '2026-01-01', endDate: '', // aktywny (preview ustawi endDate=dziś)
      status: 'active', createdAt: '2026-01-01T00:00:00.000Z',
      stats: { totalWorkouts: 30, totalTonnage: 50000, prs: [], completionRate: 70 },
    };
    // now daleko po planowanym końcu (2026-01-01 + 12 tyg = ~2026-03-26)
    const rec = buildCycleRecommendation(cycle, null, new Date('2026-06-08'));
    expect(rec.canCloseout).toBe(true);
    expect(rec.title).toBe(translate('pl', 'cyclerec.closeout.title'));
  });

  it('świeży cykl tuż po onboardingu (0 treningów, start dziś) → kickoff, NIE ostrzeżenie', () => {
    const cycle: PlanCycle = {
      id: 'fresh', userId: 'u1', days: planDays, durationWeeks: 8,
      startDate: '2026-06-08', endDate: '2026-06-08',
      status: 'active', createdAt: '2026-06-08T00:00:00.000Z',
      stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
    };
    const rec = buildCycleRecommendation(cycle, null, new Date('2026-06-08'));
    expect(rec.isKickoff).toBe(true);
    expect(rec.tone).toBe('success');
    expect(rec.title).toBe(translate('pl', 'cyclerec.kickoff.title'));
    expect(rec.title).not.toBe(translate('pl', 'cyclerec.stabilize.title'));
    expect(rec.canCloseout).toBe(false);
  });

  it('niska frekwencja PO pierwszym tygodniu → ostrzeżenie stabilize', () => {
    const cycle: PlanCycle = {
      id: 'behind', userId: 'u1', days: planDays, durationWeeks: 8,
      startDate: '2026-05-25', endDate: '', // 14 dni temu (po karencji)
      status: 'active', createdAt: '2026-05-25T00:00:00.000Z',
      stats: { totalWorkouts: 1, totalTonnage: 1000, prs: [], completionRate: 20 },
    };
    const rec = buildCycleRecommendation(cycle, null, new Date('2026-06-08'));
    expect(rec.tone).toBe('warning');
    expect(rec.title).toBe(translate('pl', 'cyclerec.stabilize.title'));
  });
});

describe('computeCycleStats — cycle attribution (regression: new cycle stealing workouts)', () => {
  const planDays2: TrainingDay[] = [
    { id: 'd1', dayName: 'Poniedziałek', weekday: 'monday', focus: 'A', exercises: [{ id: 'e1', name: 'X', sets: '3x8', instructions: [] }] },
  ];
  const mk = (id: string, date: string, cycleId?: string): WorkoutSession => ({
    id, userId: 'u1', dayId: 'd1', date, completed: true,
    ...(cycleId ? { cycleId } : {}),
    exercises: [{ exerciseId: 'e1', sets: [{ reps: 8, weight: 50, completed: true }] }],
  });

  it('a real cycleId counts ONLY workouts tagged with it (no date-range theft)', () => {
    const ws = [
      mk('w-old1', '2026-05-04', 'OLD'),
      mk('w-old2', '2026-05-06', 'OLD'),
      mk('w-orphan', '2026-05-27'), // untagged, inside the NEW cycle's date window
    ];
    // Fresh cycle must not retroactively claim the untagged workout in its range.
    expect(computeCycleStats(ws, planDays2, '2026-05-25', '2026-05-29', 12, 'NEW').totalWorkouts).toBe(0);
    // Old cycle still owns its tagged workouts.
    expect(computeCycleStats(ws, planDays2, '2026-05-01', '2026-05-29', 12, 'OLD').totalWorkouts).toBe(2);
  });

  it('null cycleId attributes only untagged workouts by date range', () => {
    const ws = [mk('w1', '2026-05-27'), mk('w2', '2026-05-28', 'OTHER')];
    expect(computeCycleStats(ws, planDays2, '2026-05-25', '2026-05-29', 12, null).totalWorkouts).toBe(1);
  });

  it('empty endDate does not break elapsed math (no NaN)', () => {
    const stats = computeCycleStats([], planDays2, '2026-05-25', '', 12, 'NEW');
    expect(Number.isFinite(stats.expectedWorkouts)).toBe(true);
    expect(Number.isFinite(stats.completionRate)).toBe(true);
  });

  it('plan startujący w przyszłości: 0% i 0 oczekiwanych (nie NaN, nie "missed")', () => {
    // startDate daleko w przyszłości względem dzisiaj — niezależnie od daty uruchomienia testu.
    const future = '2999-01-01';
    const stats = computeCycleStats([], planDays2, future, '', 12, 'NEW');
    expect(stats.expectedWorkouts).toBe(0);
    expect(stats.completionRate).toBe(0);
    expect(stats.missedWorkouts).toBe(0);
  });

  it('nie liczy przyszłych sesji z bieżącego tygodnia jako opuszczonych', () => {
    const days: TrainingDay[] = [
      { id: 'mon', dayName: 'Poniedziałek', weekday: 'monday', focus: 'A', exercises: [] },
      { id: 'wed', dayName: 'Środa', weekday: 'wednesday', focus: 'B', exercises: [] },
      { id: 'sun', dayName: 'Niedziela', weekday: 'sunday', focus: 'C', exercises: [] },
    ];
    const completed: WorkoutSession[] = [
      mk('w-mon', '2026-06-01', 'NEW'),
      mk('w-wed', '2026-06-03', 'NEW'),
    ];

    const stats = computeCycleStats(completed, days, '2026-06-01', '2026-06-05', 12, 'NEW');
    expect(stats.expectedWorkouts).toBe(2);
    expect(stats.missedWorkouts).toBe(0);
    expect(stats.completionRate).toBe(100);
  });

  it('nie liczy dni planu sprzed startDate w pierwszym tygodniu cyklu', () => {
    const days: TrainingDay[] = [
      { id: 'mon', dayName: 'Poniedziałek', weekday: 'monday', focus: 'A', exercises: [] },
      { id: 'fri', dayName: 'Piątek', weekday: 'friday', focus: 'B', exercises: [] },
    ];
    const completed = [mk('w-fri', '2026-06-19', 'NEW')];

    const stats = computeCycleStats(completed, days, '2026-06-19', '2026-06-19', 12, 'NEW');
    expect(stats.expectedWorkouts).toBe(1);
    expect(stats.missedWorkouts).toBe(0);
  });
});

describe('buildCycleComparison — świeży cykl nie pokazuje ujemnych delt', () => {
  const mkCycle = (id: string, totalWorkouts: number, totalTonnage: number, completionRate: number): PlanCycle => ({
    id, userId: 'u1', days: [], durationWeeks: 12, startDate: '2026-01-01', endDate: '2026-03-25',
    status: 'completed', createdAt: '2026-01-01T00:00:00.000Z',
    stats: {
      totalWorkouts, totalTonnage, prs: [], completionRate,
      averageTonnagePerWorkout: totalWorkouts > 0 ? Math.round(totalTonnage / totalWorkouts) : 0,
    },
  });

  it('zwraca null gdy nowy cykl ma 0 treningów (brak regresu -50000 kg)', () => {
    const fresh = mkCycle('new', 0, 0, 0);
    const prev = mkCycle('old', 30, 50000, 80);
    expect(buildCycleComparison(fresh, prev)).toBeNull();
  });

  it('porównuje tonaż NA TRENING (nie sumę) — świeży cykl bez absurdalnego minusa', () => {
    const current = mkCycle('new', 5, 8000, 40);   // 1600 kg/trening
    const prev = mkCycle('old', 30, 50000, 80);    // 1667 kg/trening
    const cmp = buildCycleComparison(current, prev);
    expect(cmp).not.toBeNull();
    // 1600 - 1667 = -67 (sensowne), NIE 8000 - 50000 = -42000
    expect(cmp?.tonnageDelta).toBe(1600 - 1667);
    expect(Math.abs(cmp!.tonnageDelta)).toBeLessThan(1000);
  });
});
