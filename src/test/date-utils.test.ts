import { describe, expect, it } from 'vitest';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';

describe('date-only parsing', () => {
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
});
