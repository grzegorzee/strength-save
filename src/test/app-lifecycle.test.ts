import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Web fallback: bez natywnej platformy listener podpina się pod visibilitychange.
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => false,
  },
}));

import { addAppStateListener } from '@/lib/app-lifecycle';

const setDocumentHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', {
    configurable: true,
    get: () => hidden,
  });
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  });
};

describe('addAppStateListener (web fallback)', () => {
  beforeEach(() => {
    setDocumentHidden(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('woła callback z isActive=false gdy dokument staje się ukryty', () => {
    const onChange = vi.fn();
    const unsubscribe = addAppStateListener(onChange);

    setDocumentHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onChange).toHaveBeenCalledWith(false);
    unsubscribe();
  });

  it('woła callback z isActive=true gdy dokument wraca do widoczności', () => {
    const onChange = vi.fn();
    const unsubscribe = addAppStateListener(onChange);

    setDocumentHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));
    setDocumentHidden(false);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onChange).toHaveBeenLastCalledWith(true);
    unsubscribe();
  });

  it('unsubscribe odpina listener', () => {
    const onChange = vi.fn();
    const unsubscribe = addAppStateListener(onChange);
    unsubscribe();

    setDocumentHidden(true);
    document.dispatchEvent(new Event('visibilitychange'));

    expect(onChange).not.toHaveBeenCalled();
  });
});
