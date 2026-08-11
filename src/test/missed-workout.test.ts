// Krok 4 przełożenia treningu: logika banera niezrobionego treningu.
import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import { findMissedWorkout } from '@/lib/missed-workout';

const day = (id: string, weekday: TrainingDay['weekday']): TrainingDay => ({
  id,
  dayName: id,
  weekday,
  focus: '',
  exercises: [],
});

// 2026-08-10 pn, 2026-08-12 śr, 2026-08-14 pt; "dziś" = piątek 2026-08-14.
const planDays = [day('day-1', 'monday'), day('day-2', 'wednesday'), day('day-3', 'friday')];
const TODAY = '2026-08-14';
const base = { planDays, overrides: {}, workouts: [], todayISO: TODAY };

describe('findMissedWorkout', () => {
  it('zwraca NAJŚWIEŻSZY pominięty dzień przed dziś', () => {
    expect(findMissedWorkout(base)).toEqual({ day: planDays[1], dateISO: '2026-08-12' });
  });

  it('ukończona sesja w dacie zdejmuje ją z radaru', () => {
    const found = findMissedWorkout({
      ...base,
      workouts: [{ date: '2026-08-12', completed: true }],
    });
    expect(found).toEqual({ day: planDays[0], dateISO: '2026-08-10' });
  });

  it('sesja nieukończona NIE liczy się jako zrobiona', () => {
    const found = findMissedWorkout({
      ...base,
      workouts: [{ date: '2026-08-12', completed: false }],
    });
    expect(found?.dateISO).toBe('2026-08-12');
  });

  it('przełożenie daty źródłowej zwalnia ją: baner wskazuje starszy dzień', () => {
    const found = findMissedWorkout({
      ...base,
      overrides: { '2026-08-12': null, '2026-08-15': 'day-2' },
    });
    expect(found).toEqual({ day: planDays[0], dateISO: '2026-08-10' });
  });

  it('odrzucona data pomijana, wszystko zrobione lub odrzucone daje null', () => {
    expect(findMissedWorkout({ ...base, dismissed: ['2026-08-12'] })?.dateISO).toBe('2026-08-10');
    // Okno 7 dni od piątku obejmuje też poprzedni piątek 2026-08-07 (day-3).
    expect(findMissedWorkout({
      ...base,
      dismissed: ['2026-08-12', '2026-08-10', '2026-08-07'],
    })).toBeNull();
  });

  it('nie sięga przed start planu ani dalej niż 7 dni wstecz', () => {
    expect(findMissedWorkout({ ...base, planStartDate: '2026-08-13' })).toBeNull();
    // Pominięta środa 2026-08-05 jest 9 dni wstecz od 2026-08-14: poza oknem.
    expect(findMissedWorkout({
      ...base,
      workouts: [
        { date: '2026-08-07', completed: true },
        { date: '2026-08-10', completed: true },
        { date: '2026-08-12', completed: true },
      ],
    })).toBeNull();
  });
});
