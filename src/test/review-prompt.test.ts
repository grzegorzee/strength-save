import { describe, expect, it } from 'vitest';
import { shouldRequestReview } from '@/lib/review-prompt';

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_760_000_000_000;

describe('shouldRequestReview (Z83)', () => {
  it('5. ukończony trening prosi o ocenę', () => {
    expect(shouldRequestReview(5, null, NOW)).toBe(true);
  });

  it('4. trening nie prosi', () => {
    expect(shouldRequestReview(4, null, NOW)).toBe(false);
  });

  it('liczby spoza kamieni nie proszą', () => {
    expect(shouldRequestReview(6, null, NOW)).toBe(false);
    expect(shouldRequestReview(20, null, NOW)).toBe(false);
  });

  it('ponowna prośba przed upływem 60 dni zablokowana', () => {
    expect(shouldRequestReview(15, NOW - 30 * DAY, NOW)).toBe(false);
  });

  it('po 60 dniach przy kolejnym kamieniu (15., 30.) prosi', () => {
    expect(shouldRequestReview(15, NOW - 61 * DAY, NOW)).toBe(true);
    expect(shouldRequestReview(30, NOW - 61 * DAY, NOW)).toBe(true);
  });
});
