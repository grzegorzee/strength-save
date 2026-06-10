import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearPendingGuardedReload,
  hasPendingGuardedReload,
  isPwaUpdateBlocked,
  requestGuardedReload,
  setPwaUpdateBlocked,
} from '@/lib/pwa-update-guard';

describe('pwa update guard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('blocks chunk reloads while an active workout guards updates', () => {
    setPwaUpdateBlocked(true);

    expect(requestGuardedReload('chunk')).toBe(false);
    expect(isPwaUpdateBlocked()).toBe(true);
    expect(hasPendingGuardedReload()).toBe(true);
  });

  it('clears pending guarded reloads after the user applies them', () => {
    setPwaUpdateBlocked(true);
    requestGuardedReload('chunk');

    clearPendingGuardedReload();

    expect(hasPendingGuardedReload()).toBe(false);
  });
});
