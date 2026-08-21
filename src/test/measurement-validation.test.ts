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

  // WP-D D2: wpis tylko-zdjęcie — zdjęcie jest pełnoprawną treścią pomiaru.
  it('accepts a photo-only entry (photoUrl + photoPath + date, zero numeric fields)', () => {
    expect(validateMeasurement({
      date: '2026-08-21',
      photoUrl: 'https://firebasestorage.example/body.jpg?token=x',
      photoPath: 'body-photos/u1/2026-08-21.jpg',
    })).toEqual({ valid: true });
  });

  it('accepts an empty numeric entry when the caller declares a pending photo (hasPhoto)', () => {
    expect(validateMeasurement({ date: '2026-08-21' }, { hasPhoto: true })).toEqual({ valid: true });
  });

  it('still rejects an entry with no numeric fields and no photo', () => {
    expect(validateMeasurement({ date: '2026-08-21' }).valid).toBe(false);
    expect(validateMeasurement({ date: '2026-08-21', photoUrl: '' }).valid).toBe(false);
  });

  it('photo does not bypass range validation of provided numeric fields', () => {
    expect(validateMeasurement({
      date: '2026-08-21',
      waist: 2,
      photoUrl: 'https://firebasestorage.example/body.jpg?token=x',
    }).valid).toBe(false);
  });
});
