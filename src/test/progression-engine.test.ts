import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROGRESSION,
  isDeloadWeek,
  sanitizeProgressionConfig,
} from '@/lib/progression-engine';

describe('sanitizeProgressionConfig (Z119)', () => {
  it('poprawny config przechodzi', () => {
    expect(sanitizeProgressionConfig({ enabled: true, deloadEveryWeeks: 4 }))
      .toEqual({ enabled: true, deloadEveryWeeks: 4 });
  });

  it('brak/śmieci => null (stare plany bez pola = silnik wyłączony)', () => {
    expect(sanitizeProgressionConfig(undefined)).toBeNull();
    expect(sanitizeProgressionConfig(null)).toBeNull();
    expect(sanitizeProgressionConfig('tak')).toBeNull();
    expect(sanitizeProgressionConfig({ enabled: 'yes' })).toBeNull();
  });

  it('deloadEveryWeeks clamp 2-12, default 5', () => {
    expect(sanitizeProgressionConfig({ enabled: true })!.deloadEveryWeeks).toBe(5);
    expect(sanitizeProgressionConfig({ enabled: true, deloadEveryWeeks: 1 })!.deloadEveryWeeks).toBe(2);
    expect(sanitizeProgressionConfig({ enabled: true, deloadEveryWeeks: 99 })!.deloadEveryWeeks).toBe(12);
  });

  it('deloadDecisions przenoszone tylko z poprawnymi wartościami', () => {
    const out = sanitizeProgressionConfig({
      enabled: true,
      deloadDecisions: { '5': 'applied', '10': 'skipped', '3': 'meh' },
    })!;
    expect(out.deloadDecisions).toEqual({ '5': 'applied', '10': 'skipped' });
  });
});

describe('isDeloadWeek (Z119)', () => {
  it('co N tygodni (1-based): tydzień 5 i 10 przy default 5', () => {
    expect(isDeloadWeek(5, DEFAULT_PROGRESSION)).toBe(true);
    expect(isDeloadWeek(10, DEFAULT_PROGRESSION)).toBe(true);
    expect(isDeloadWeek(4, DEFAULT_PROGRESSION)).toBe(false);
    expect(isDeloadWeek(1, DEFAULT_PROGRESSION)).toBe(false);
  });

  it('wyłączony silnik => nigdy', () => {
    expect(isDeloadWeek(5, { ...DEFAULT_PROGRESSION, enabled: false })).toBe(false);
  });
});
