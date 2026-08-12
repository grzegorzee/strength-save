import { describe, expect, it } from 'vitest';
import { buildWeekCardModel } from '@/lib/week-card';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';

// Runna pakiet 1, krok 7 (spec B1): karta tygodnia — checkmarki dni, pasek
// sesji, tonaż tygodnia. Dzień przełożony przez scheduleOverrides pokazuje
// się w NOWEJ dacie; stan skipped strukturalnie gotowy (podłączy go krok 12).

const planDays: TrainingDay[] = [
  { id: 'day-1', dayName: 'Push', weekday: 'monday', focus: 'Push', exercises: [] },
  { id: 'day-2', dayName: 'Pull', weekday: 'thursday', focus: 'Pull', exercises: [] },
];

const workout = (date: string, weight: number, overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: `w-${date}`,
  userId: 'u1',
  dayId: 'day-1',
  date,
  completed: true,
  exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 5, weight, completed: true }] }],
  ...overrides,
});

// Środa 2026-08-12; tydzień planu = pon 2026-08-10 do nd 2026-08-16.
const TODAY = new Date(2026, 7, 12);

const build = (args: Partial<Parameters<typeof buildWeekCardModel>[0]> = {}) =>
  buildWeekCardModel({
    planDays,
    today: TODAY,
    workouts: [],
    currentWeek: 6,
    planDurationWeeks: 12,
    planStarted: true,
    ...args,
  });

describe('buildWeekCardModel', () => {
  it('7 dni pon-nd: ukończone done, zaplanowane planned, reszta rest, dziś oznaczone', () => {
    const model = build({ workouts: [workout('2026-08-10', 100)] });
    expect(model.days).toHaveLength(7);
    expect(model.days[0]).toMatchObject({ date: '2026-08-10', status: 'done' });
    expect(model.days[3]).toMatchObject({ date: '2026-08-13', status: 'planned' });
    expect(model.days[2]).toMatchObject({ date: '2026-08-12', status: 'rest', isToday: true });
    expect(model.week).toEqual({ current: 6, total: 12 });
  });

  it('pasek sesji: done liczy tylko dni ZAPLANOWANE, tonaż liczy wszystko (ad-hoc dokłada)', () => {
    const model = build({
      workouts: [
        workout('2026-08-10', 100),
        workout('2026-08-11', 40, { dayId: 'adhoc' }),
      ],
    });
    expect(model.sessionsPlanned).toBe(2);
    expect(model.sessionsDone).toBe(1);
    expect(model.tonnageKg).toBe(700);
    expect(model.days[1].status).toBe('done');
  });

  it('dzień przełożony przez scheduleOverrides pojawia się w NOWEJ dacie', () => {
    const model = build({
      scheduleOverrides: { '2026-08-13': null, '2026-08-15': 'day-2' },
    });
    expect(model.days[3].status).toBe('rest');
    expect(model.days[5].status).toBe('planned');
    expect(model.sessionsPlanned).toBe(2);
  });

  it('skippedDates wygasza zaplanowany dzień (struktura pod krok 12)', () => {
    const model = build({ skippedDates: ['2026-08-13'] });
    expect(model.days[3].status).toBe('skipped');
    expect(model.sessionsPlanned).toBe(2);
    expect(model.sessionsDone).toBe(0);
  });

  it('plan bez startu: week null (Dashboard nie pokazuje karty, bez regresu)', () => {
    const model = build({ planStarted: false });
    expect(model.week).toBeNull();
  });

  it('sesje spoza tygodnia nie liczą się do tonażu', () => {
    const model = build({ workouts: [workout('2026-08-03', 100)] });
    expect(model.tonnageKg).toBe(0);
  });
});
