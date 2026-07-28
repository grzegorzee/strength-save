import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false },
}));

import { initKeyboardInset, __resetKeyboardInsetForTests } from '@/lib/keyboard-inset';

class FakeVisualViewport extends EventTarget {
  height = 800;
}

describe('keyboard-inset web fallback (Z159)', () => {
  let viewport: FakeVisualViewport;

  beforeEach(() => {
    __resetKeyboardInsetForTests();
    document.documentElement.style.removeProperty('--keyboard-inset');
    viewport = new FakeVisualViewport();
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });

  it('resize visualViewport ustawia --keyboard-inset na roznice wysokosci', () => {
    initKeyboardInset();

    viewport.height = 500;
    viewport.dispatchEvent(new Event('resize'));

    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('300px');
  });

  it('powrot do pelnej wysokosci zeruje inset (nigdy ujemny)', () => {
    initKeyboardInset();

    viewport.height = 500;
    viewport.dispatchEvent(new Event('resize'));
    viewport.height = 900;
    viewport.dispatchEvent(new Event('resize'));

    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe('0px');
  });

  it('init jest idempotentny (jeden listener mimo dwoch wywolan)', () => {
    const addListener = vi.spyOn(viewport, 'addEventListener');

    initKeyboardInset();
    initKeyboardInset();

    expect(addListener).toHaveBeenCalledTimes(1);
  });
});
