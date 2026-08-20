// T17 (feedback 2026-08-20): screenshot właściciela pokazywał "100% done" przy
// tygodniu 12/12, mimo że piątkowy trening jeszcze czekał — procent liczył się
// z numeru tygodnia. Nowa definicja: ukończone / (ukończone + pozostałe).
import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import { parseLocalDate } from '@/lib/utils';
import { computePlanProgressPercent, countRemainingWorkouts } from '@/lib/plan-schedule';

const day = (id: string, weekday: TrainingDay['weekday']): TrainingDay => ({
  id,
  dayName: id,
  weekday,
  focus: '',
  exercises: [],
});

// Ten sam fixture co count-remaining-workouts.test.ts: plan 4x/tydz.
// (pn, wt, czw, pt), 12 tygodni od pn 2026-06-01; ostatni tydzień 2026-08-17..23.
const planDays = [
  day('day-1', 'monday'), day('day-2', 'tuesday'),
  day('day-3', 'thursday'), day('day-4', 'friday'),
];

const base = {
  planDays,
  planStartDate: parseLocalDate('2026-06-01'),
  durationWeeks: 12,
};

// Wszystkie 48 zaplanowanych dat planu (12 tyg. x pn/wt/czw/pt).
const allPlannedDates = (): string[] => {
  const dates: string[] = [];
  const weekdays = [1, 2, 4, 5]; // pn, wt, czw, pt (getDay)
  const start = parseLocalDate('2026-06-01');
  for (let offset = 0; offset < 12 * 7; offset += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + offset);
    if (weekdays.includes(d.getDay())) {
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push(`${d.getFullYear()}-${mm}-${dd}`);
    }
  }
  return dates;
};

describe('computePlanProgressPercent (T17)', () => {
  it('scenariusz zgłoszenia: 47 z 48 zrobionych, piątek czeka = 98% (nie 100%)', () => {
    const completed = allPlannedDates().slice(0, 47); // wszystko poza 2026-08-21 (pt)
    const remaining = countRemainingWorkouts({
      ...base,
      today: parseLocalDate('2026-08-20'),
      completedDates: new Set(completed),
    });
    expect(remaining).toBe(1);
    expect(computePlanProgressPercent({
      completedCount: completed.length,
      remainingCount: remaining,
      planStarted: true,
    })).toBe(98);
  });

  it('wszystko zrobione = 100%', () => {
    const completed = allPlannedDates();
    const remaining = countRemainingWorkouts({
      ...base,
      today: parseLocalDate('2026-08-21'),
      completedDates: new Set(completed),
    });
    expect(remaining).toBe(0);
    expect(computePlanProgressPercent({
      completedCount: completed.length,
      remainingCount: remaining,
      planStarted: true,
    })).toBe(100);
  });

  it('plan przed startem (planStarted=false) = 0%', () => {
    expect(computePlanProgressPercent({
      completedCount: 5,
      remainingCount: 43,
      planStarted: false,
    })).toBe(0);
  });

  it('dzień skipnięty zmniejsza mianownik (nie liczy się jako pozostały)', () => {
    const completed = allPlannedDates().slice(0, 46); // czekają 2026-08-20 i 2026-08-21
    const remainingBezSkipa = countRemainingWorkouts({
      ...base,
      today: parseLocalDate('2026-08-20'),
      completedDates: new Set(completed),
    });
    const remainingZeSkipem = countRemainingWorkouts({
      ...base,
      today: parseLocalDate('2026-08-20'),
      completedDates: new Set(completed),
      skippedDates: ['2026-08-21'],
    });
    expect(remainingBezSkipa).toBe(2);
    expect(remainingZeSkipem).toBe(1);
    expect(computePlanProgressPercent({
      completedCount: 46, remainingCount: remainingZeSkipem, planStarted: true,
    })).toBeGreaterThan(computePlanProgressPercent({
      completedCount: 46, remainingCount: remainingBezSkipa, planStarted: true,
    }));
  });

  it('pusty plan (0 ukończonych, 0 pozostałych) = 0%', () => {
    expect(computePlanProgressPercent({
      completedCount: 0,
      remainingCount: 0,
      planStarted: true,
    })).toBe(0);
  });

  it('nigdy nie przekracza 100 (ad-hoc w oknie planu rośnie w liczniku i mianowniku)', () => {
    expect(computePlanProgressPercent({
      completedCount: 60,
      remainingCount: 0,
      planStarted: true,
    })).toBe(100);
  });
});
