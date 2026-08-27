import { describe, expect, it } from 'vitest';
import { computeLegacyTimestampDurationSec } from '@/lib/workout-duration';

describe('legacy duration fallback (bug 36)', () => {
  it('stary przepływ: rozsądna różnica startedAt/completedAt nadal działa', () => {
    expect(computeLegacyTimestampDurationSec({ startedAt: 1_000, completedAt: 5_401_000 })).toBe(5_400);
  });

  it('wielogodzinna luka legacy nie jest prezentowana jako czas treningu', () => {
    expect(computeLegacyTimestampDurationSec({ startedAt: 1_000, completedAt: 48 * 60 * 60 * 1_000 + 1_000 })).toBeUndefined();
  });

  it('uszkodzona kolejność znaczników nie daje ujemnego czasu', () => {
    expect(computeLegacyTimestampDurationSec({ startedAt: 2_000, completedAt: 1_000 })).toBe(0);
  });
});
