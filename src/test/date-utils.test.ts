import { describe, expect, it } from 'vitest';
import { addCalendarDays, calendarDayDiff, formatLocalDate, parseLocalDate } from '@/lib/utils';

describe('date-only parsing', () => {
  it('rejects invalid calendar dates', () => {
    expect(() => parseLocalDate('2026-02-31')).toThrow(RangeError);
    expect(() => parseLocalDate('2026-01-1')).toThrow(RangeError);
    expect(formatLocalDate(parseLocalDate('2024-02-29'))).toBe('2024-02-29');
  });
  it('keeps YYYY-MM-DD on the same local day in a non-PL timezone', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';
    try {
      expect(formatLocalDate(parseLocalDate('2026-01-01'))).toBe('2026-01-01');
      expect(formatLocalDate(new Date('2026-01-01'))).toBe('2025-12-31');
    } finally {
      process.env.TZ = originalTz;
    }
  });

  it('uses calendar days across the 2026 spring DST transition', () => {
    expect(calendarDayDiff('2026-03-28', '2026-03-30')).toBe(2);
    expect(addCalendarDays('2026-03-28', 2)).toBe('2026-03-30');
  });
});
