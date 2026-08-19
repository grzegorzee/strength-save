import { describe, expect, it } from 'vitest';
import type { WorkoutSession } from '@/types';
import {
  calculateTonnage,
  calculateStreakDetails,
  countWorkoutCompletedWorkingSets,
  hasCompletedWorkingSet,
  getWeekBounds,
} from '@/lib/summary-utils';
import { formatLocalDate } from '@/lib/utils';
import { getExerciseBest1RM, calculate1RM } from '@/lib/pr-utils';
import { getMonthlyTonnage, buildExerciseRecords } from '@/lib/achievements-utils';
import { buildAllTimeStats } from '@/lib/all-time-stats';
import { buildWeekCardModel } from '@/lib/week-card';
import { buildWorkoutContribution } from '../../functions/src/workout-aggregate';

// B-T1: JEDNA fixture kontraktowa dla wszystkich konsumentów metryk.
// warmup 40×10 done + working 100×5 done + working 120×5 incomplete
// => tonaż 500 kg, 1 seria robocza, max 100 kg, zero PR z rozgrzewki.
const FIXTURE_SETS = [
  { reps: 10, weight: 40, completed: true, isWarmup: true },
  { reps: 5, weight: 100, completed: true },
  { reps: 5, weight: 120, completed: false },
];

const fixtureWorkout = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'w-contract',
  userId: 'u1',
  dayId: 'day-1',
  date: '2026-08-10',
  completed: true,
  exercises: [
    {
      exerciseId: 'bench',
      name: 'Wyciskanie sztangi na ławce płaskiej',
      sets: FIXTURE_SETS.map((s) => ({ ...s })),
    },
  ],
  ...over,
});

// Trening, w którym ukończono WYŁĄCZNIE rozgrzewkę.
const warmupOnlyWorkout = (id: string, date: string): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed: true,
  exercises: [
    {
      exerciseId: 'bench',
      sets: [
        { reps: 10, weight: 40, completed: true, isWarmup: true },
        { reps: 5, weight: 100, completed: false },
      ],
    },
  ],
});

describe('B-T1: kontrakt serii roboczych — jedna fixture, wszyscy konsumenci', () => {
  it('kanoniczny tonaż: 500 kg (bez rozgrzewki i serii nieukończonej)', () => {
    expect(calculateTonnage([fixtureWorkout()])).toBe(500);
  });

  it('liczba serii roboczych treningu: 1; warmup-only ma 0 i nie jest treningiem roboczym', () => {
    expect(countWorkoutCompletedWorkingSets(fixtureWorkout())).toBe(1);
    expect(hasCompletedWorkingSet(fixtureWorkout())).toBe(true);
    expect(countWorkoutCompletedWorkingSets(warmupOnlyWorkout('wo', '2026-08-10'))).toBe(0);
    expect(hasCompletedWorkingSet(warmupOnlyWorkout('wo', '2026-08-10'))).toBe(false);
  });

  it('rekordy: max z serii roboczej 100 kg, rozgrzewka 40×10 nie daje PR', () => {
    const w = fixtureWorkout();
    const best = getExerciseBest1RM([w], 'bench');
    expect(best.maxWeight).toBe(100);
    expect(best.best1RMWeight).toBe(100);
    expect(calculate1RM(100, 5)).toBeGreaterThan(calculate1RM(40, 10));
    // Rozgrzewka nie może być bazą rekordu nawet bez serii roboczych.
    const warmupBest = getExerciseBest1RM([warmupOnlyWorkout('wo', '2026-08-10')], 'bench');
    expect(warmupBest.maxWeight).toBe(0);
  });

  it('all-time stats: 1 seria, 500 kg, 5 powtórzeń', () => {
    const stats = buildAllTimeStats([fixtureWorkout()]);
    expect(stats.totalSets).toBe(1);
    expect(stats.totalReps).toBe(5);
    expect(stats.totalTonnageKg).toBe(500);
  });

  it('tonaż miesięczny (Postępy): 500 kg, drafty i rozgrzewki nie wliczają się', () => {
    const ref = new Date(2026, 7, 15);
    const draft = fixtureWorkout({ id: 'w-draft', date: '2026-08-11', completed: false });
    const rows = getMonthlyTonnage([fixtureWorkout(), draft], 1, ref);
    expect(rows).toHaveLength(1);
    expect(rows[0].tonnage).toBe(500);
  });

  it('rekordy ćwiczeń (Postępy): max 100 kg, bez rozgrzewek i bez draftów', () => {
    const draft = fixtureWorkout({ id: 'w-draft', date: '2026-08-11', completed: false });
    const records = buildExerciseRecords([fixtureWorkout(), draft], () => 'Wyciskanie');
    expect(records).toHaveLength(1);
    expect(records[0].maxWeight).toBe(100);
    expect(records[0].maxReps).toBe(5);
    // Historia rekordu nie zawiera wpisu z rozgrzewki ani z draftu.
    expect(records[0].history).toHaveLength(1);
    expect(records[0].history[0]).toMatchObject({ weight: 100, reps: 5 });
  });

  it('streak: tydzień z samymi warmup-only treningami nie liczy się', () => {
    const { start } = getWeekBounds(new Date());
    const day = (offset: number) => {
      const d = new Date(start);
      d.setDate(d.getDate() + offset);
      return formatLocalDate(d);
    };
    const working = [
      fixtureWorkout({ id: 'a', date: day(0) }),
      fixtureWorkout({ id: 'b', date: day(1) }),
    ];
    expect(calculateStreakDetails(working).streak).toBe(1);
    const warmups = [warmupOnlyWorkout('c', day(0)), warmupOnlyWorkout('d', day(1))];
    expect(calculateStreakDetails(warmups).streak).toBe(0);
  });

  it('ukończenie tygodnia planu: warmup-only nie odhacza sesji', () => {
    const today = new Date(2026, 7, 10);
    const dateKey = formatLocalDate(today);
    const weekday = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const planDays = [
      { id: 'day-1', dayName: 'A', weekday, exercises: [] },
    ] as never;
    const base = {
      planDays,
      today,
      scheduleOverrides: {},
      currentWeek: 1,
      planDurationWeeks: 12,
      planStarted: true,
    };
    const done = buildWeekCardModel({
      ...base,
      workouts: [fixtureWorkout({ date: dateKey })],
    } as never);
    expect(done.sessionsDone).toBe(1);
    const warmupOnly = buildWeekCardModel({
      ...base,
      workouts: [warmupOnlyWorkout('wo', dateKey)],
    } as never);
    expect(warmupOnly.sessionsDone).toBe(0);
  });

  it('backend aggregate: wkład treningu = 1 seria, 500 kg', () => {
    const contribution = buildWorkoutContribution(fixtureWorkout() as never);
    expect(contribution?.t).toBe(500);
    expect(contribution?.s).toBe(1);
    expect(contribution?.r).toBe(5);
  });
});
