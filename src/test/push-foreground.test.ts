import { describe, expect, it } from 'vitest';
import { shouldShowForegroundPushToast } from '@/lib/push-foreground';

// Z146 (X18C): koniec podwójnego banera — poranny reminder nie pokazuje toastu,
// gdy user właśnie trenuje (jest na ekranie treningu).

describe('shouldShowForegroundPushToast (Z146)', () => {
  it('daily-reminder na ekranie treningu → BEZ toastu', () => {
    expect(shouldShowForegroundPushToast({ type: 'daily-reminder', onWorkoutRoute: true })).toBe(false);
  });

  it('daily-reminder poza treningiem → toast (przypomnienie ma sens)', () => {
    expect(shouldShowForegroundPushToast({ type: 'daily-reminder', onWorkoutRoute: false })).toBe(true);
  });

  it('push innego typu → toast zawsze (bez regresji, np. push od admina)', () => {
    expect(shouldShowForegroundPushToast({ type: 'admin-message', onWorkoutRoute: true })).toBe(true);
    expect(shouldShowForegroundPushToast({ type: undefined, onWorkoutRoute: true })).toBe(true);
  });
});
