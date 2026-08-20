// E-T4 (bug z buildu 107): kafel "Pozostało" w Planie pokazywał pozostałe
// TYGODNIE (12-12=0) obok kafla "Ukończone" liczącego TRENINGI — w ostatnim
// tygodniu zawsze 0, mimo że piątkowy trening czekał. Nowa definicja:
// pozostałe TRENINGI = zaplanowane dni od dziś do końca planu bez ukończonego
// treningu; skip i urlop nie są "pozostałe".
import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import { parseLocalDate } from '@/lib/utils';
import { countRemainingWorkouts } from '@/lib/plan-schedule';

const day = (id: string, weekday: TrainingDay['weekday']): TrainingDay => ({
  id,
  dayName: id,
  weekday,
  focus: '',
  exercises: [],
});

// Plan 4x/tydz.: pn, wt, czw, pt (jak plan właściciela).
const planDays = [
  day('day-1', 'monday'), day('day-2', 'tuesday'),
  day('day-3', 'thursday'), day('day-4', 'friday'),
];

// Plan 12 tygodni od pn 2026-06-01; ostatni tydzień: 2026-08-17..2026-08-23.
const base = {
  planDays,
  planStartDate: parseLocalDate('2026-06-01'),
  durationWeeks: 12,
};

describe('countRemainingWorkouts (E-T4)', () => {
  it('scenariusz zgłoszenia: czwartek ostatniego tygodnia ukończony, piątek czeka = 1', () => {
    expect(countRemainingWorkouts({
      ...base,
      today: parseLocalDate('2026-08-20'),
      completedDates: new Set(['2026-08-17', '2026-08-18', '2026-08-20']),
    })).toBe(1);
  });

  it('wszystko w tym tygodniu zrobione = 0', () => {
    expect(countRemainingWorkouts({
      ...base,
      today: parseLocalDate('2026-08-21'),
      completedDates: new Set(['2026-08-17', '2026-08-18', '2026-08-20', '2026-08-21']),
    })).toBe(0);
  });

  it('dzisiejszy nieukończony trening liczy się jako pozostały', () => {
    expect(countRemainingWorkouts({
      ...base,
      today: parseLocalDate('2026-08-20'),
      completedDates: new Set(['2026-08-17', '2026-08-18']),
    })).toBe(2);
  });

  it('dzień pominięty (skip) nie jest pozostały', () => {
    expect(countRemainingWorkouts({
      ...base,
      today: parseLocalDate('2026-08-20'),
      completedDates: new Set(['2026-08-17', '2026-08-18', '2026-08-20']),
      skippedDates: ['2026-08-21'],
    })).toBe(0);
  });

  it('dzień zablokowany (urlop) nie jest pozostały', () => {
    expect(countRemainingWorkouts({
      ...base,
      today: parseLocalDate('2026-08-20'),
      completedDates: new Set(['2026-08-17', '2026-08-18', '2026-08-20']),
      isDateBlocked: (key) => key === '2026-08-21',
    })).toBe(0);
  });

  it('środek planu: liczy wszystkie zaplanowane dni do końca', () => {
    // Od czw 2026-08-13 (tydz. 11): czw+pt tego tygodnia + 4 w ostatnim = 6.
    expect(countRemainingWorkouts({
      ...base,
      today: parseLocalDate('2026-08-13'),
      completedDates: new Set(),
    })).toBe(6);
  });

  it('plan wygasły = 0; pusty plan = 0', () => {
    expect(countRemainingWorkouts({
      ...base,
      today: parseLocalDate('2026-09-01'),
      completedDates: new Set(),
    })).toBe(0);
    expect(countRemainingWorkouts({
      ...base,
      planDays: [],
      today: parseLocalDate('2026-08-20'),
      completedDates: new Set(),
    })).toBe(0);
  });

  it('przełożenie dnia (override) honorowane', () => {
    // Piątek 2026-08-21 przełożony na sobotę 2026-08-22: nadal 1 pozostały.
    expect(countRemainingWorkouts({
      ...base,
      today: parseLocalDate('2026-08-20'),
      completedDates: new Set(['2026-08-17', '2026-08-18', '2026-08-20']),
      overrides: { '2026-08-21': null, '2026-08-22': 'day-4' },
    })).toBe(1);
  });
});
