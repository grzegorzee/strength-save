import { describe, expect, it } from 'vitest';
import { getAnalyticsPeriodWindow } from '@/lib/analytics-period';
import { formatLocalDate } from '@/lib/utils';

describe('okna Wyników: porównanie to-date i pager', () => {
  it('w środę porównuje pon-śr z poprzednim pon-śr, nie z pełnym tygodniem', () => {
    const window = getAnalyticsPeriodWindow('week', 0, new Date(2026, 7, 26, 12));
    expect(formatLocalDate(window.bounds.start)).toBe('2026-08-24');
    expect(formatLocalDate(window.comparisonCurrent.end)).toBe('2026-08-26');
    expect(formatLocalDate(window.comparisonPrevious.start)).toBe('2026-08-17');
    expect(formatLocalDate(window.comparisonPrevious.end)).toBe('2026-08-19');
    expect(window.canGoNext).toBe(false);
  });

  it('dla poprzedniego miesiąca porównuje pełne zamknięte okresy i pozwala wrócić do bieżącego', () => {
    const window = getAnalyticsPeriodWindow('month', -1, new Date(2026, 7, 26, 12));
    expect(formatLocalDate(window.bounds.start)).toBe('2026-07-01');
    expect(formatLocalDate(window.comparisonCurrent.end)).toBe('2026-07-31');
    expect(formatLocalDate(window.comparisonPrevious.start)).toBe('2026-06-01');
    expect(formatLocalDate(window.comparisonPrevious.end)).toBe('2026-06-30');
    expect(window.canGoNext).toBe(true);
  });

  it('w niedzielę porównuje pełny tydzień z pełnym poprzednim tygodniem', () => {
    const window = getAnalyticsPeriodWindow('week', 0, new Date(2026, 7, 30, 12));
    expect(formatLocalDate(window.comparisonCurrent.end)).toBe('2026-08-30');
    expect(formatLocalDate(window.comparisonPrevious.end)).toBe('2026-08-23');
  });

  it('trzeciego dnia miesiąca ucina poprzedni miesiąc do trzeciego dnia', () => {
    const window = getAnalyticsPeriodWindow('month', 0, new Date(2026, 7, 3, 12));
    expect(formatLocalDate(window.comparisonCurrent.end)).toBe('2026-08-03');
    expect(formatLocalDate(window.comparisonPrevious.end)).toBe('2026-07-03');
  });
});
