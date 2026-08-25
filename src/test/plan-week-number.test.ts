import { afterEach, describe, expect, it } from 'vitest';
import { planWeekNumberForDate } from '@/lib/plan-schedule';
import { weekNoFor } from '@/lib/history-cycles';
import { parseLocalDate } from '@/lib/utils';

// Bug 12 (X30): currentWeek/selectedWeekNumber liczone dzieleniem roznicy
// milisekund lokalnych polnocy. Po wiosennej zmianie czasu (tydzien ma 23h)
// floor zanizal numer tygodnia o 1 az do jesiennej zmiany: badge "Tydzien N z M",
// weeksRemaining, isPlanExpired i deload schodzily o tydzien, a zakladka Plan
// pokazywala inny numer niz Cykle (weekNoFor liczy kalendarzowo).
describe('planWeekNumberForDate (bug 12, X30): rachunek kalendarzowy odporny na DST', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('TZ=Europe/Warsaw: start pn 2026-02-02, pn 2026-04-06 (po zmianie 29.03) = tydzien 10, nie 9', () => {
    process.env.TZ = 'Europe/Warsaw';
    const week = planWeekNumberForDate(parseLocalDate('2026-02-02'), parseLocalDate('2026-04-06'));
    expect(week).toBe(10);
  });

  it('zgodnosc z numeracja Cykli (weekNoFor z history-cycles) przez cala granice DST', () => {
    process.env.TZ = 'Europe/Warsaw';
    const cycle = { startDate: '2026-02-02', durationWeeks: 52 };
    for (const date of ['2026-03-23', '2026-03-29', '2026-03-30', '2026-04-06', '2026-10-26']) {
      expect(planWeekNumberForDate(parseLocalDate('2026-02-02'), parseLocalDate(date)))
        .toBe(weekNoFor(date, cycle));
    }
  });

  it('dzien w srodku tygodnia nalezy do tygodnia swojego poniedzialku', () => {
    expect(planWeekNumberForDate(parseLocalDate('2026-02-02'), parseLocalDate('2026-02-04'))).toBe(1);
    expect(planWeekNumberForDate(parseLocalDate('2026-02-02'), parseLocalDate('2026-02-08'))).toBe(1);
    expect(planWeekNumberForDate(parseLocalDate('2026-02-02'), parseLocalDate('2026-02-09'))).toBe(2);
  });

  it('start planu w srodku tygodnia kotwiczy numeracje na poniedzialku tygodnia startu', () => {
    // Start sroda 2026-02-04: tydzien 1 = pn 02-02..nd 02-08.
    expect(planWeekNumberForDate(parseLocalDate('2026-02-04'), parseLocalDate('2026-02-06'))).toBe(1);
    expect(planWeekNumberForDate(parseLocalDate('2026-02-04'), parseLocalDate('2026-02-10'))).toBe(2);
  });

  it('data sprzed tygodnia startu daje wartosc < 1 (guard tygodnia 0 zostaje u wolajacego)', () => {
    expect(planWeekNumberForDate(parseLocalDate('2026-02-02'), parseLocalDate('2026-02-01'))).toBeLessThan(1);
    expect(planWeekNumberForDate(parseLocalDate('2026-02-02'), parseLocalDate('2026-01-20'))).toBeLessThan(1);
  });
});
