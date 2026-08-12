import { describe, expect, it } from 'vitest';
import { pruneSkippedDates, sanitizeSkippedDates, toggleSkippedDate } from '@/lib/skipped-days';

// Runna pakiet 1, krok 12 (spec C1): jawne "Pomiń trening" — stan per data
// (model jak scheduleOverrides: te same reguły pruningu 28 dni), odwracalny.

describe('sanitizeSkippedDates', () => {
  it('zostawia tylko poprawne daty, deduplikuje i sortuje', () => {
    expect(sanitizeSkippedDates(['2026-08-12', 'zle', '2026-08-10', '2026-08-12', 42]))
      .toEqual(['2026-08-10', '2026-08-12']);
  });

  it('nie-tablica = pusto', () => {
    expect(sanitizeSkippedDates(null)).toEqual([]);
    expect(sanitizeSkippedDates({ '2026-08-12': true })).toEqual([]);
  });
});

describe('pruneSkippedDates', () => {
  it('wpisy starsze niż 28 dni wylatują', () => {
    expect(pruneSkippedDates(['2026-07-01', '2026-08-01', '2026-08-12'], '2026-08-12'))
      .toEqual(['2026-08-01', '2026-08-12']);
  });
});

describe('toggleSkippedDate', () => {
  it('dodaje datę (posortowane, z pruningiem) i zdejmuje przy odwróceniu', () => {
    const added = toggleSkippedDate(['2026-08-14', '2026-07-01'], '2026-08-12', '2026-08-12');
    expect(added).toEqual(['2026-08-12', '2026-08-14']);
    const removed = toggleSkippedDate(added, '2026-08-12', '2026-08-12');
    expect(removed).toEqual(['2026-08-14']);
  });
});
