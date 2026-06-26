import { describe, expect, it } from 'vitest';
import { validateMeasurement } from '@/lib/measurement-validation';

describe('measurement validation', () => {
  it('accepts canonical kg/cm values in the supported ranges', () => {
    expect(validateMeasurement({ date: '2026-06-24', weight: 80, waist: 82, calfLeft: 38 })).toEqual({ valid: true });
  });

  it('rejects invalid dates, NaN and out-of-range canonical values', () => {
    expect(validateMeasurement({ date: '2026-02-31', weight: 80 }).valid).toBe(false);
    expect(validateMeasurement({ date: '2026-06-24', weight: Number.NaN }).valid).toBe(false);
    expect(validateMeasurement({ date: '2026-06-24', waist: 2 }).valid).toBe(false);
    expect(validateMeasurement({ date: '2026-06-24', weight: 80, chest: Number.POSITIVE_INFINITY }).valid).toBe(false);
  });
});
