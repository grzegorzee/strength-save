import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPendingGuardedReload,
  hasPendingGuardedReload,
  isPwaUpdateBlocked,
  requestGuardedReload,
  setPwaUpdateBlocked,
} from '@/lib/pwa-update-guard';

vi.mock('@/lib/firebase', () => ({ auth: { currentUser: null } }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));

describe('pwa update guard', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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

  it('blocks the reload when two reloads already happened within the 60s window', () => {
    sessionStorage.setItem(
      'strength-save:guarded-reload-history',
      JSON.stringify([Date.now() - 5_000, Date.now() - 1_000]),
    );

    expect(requestGuardedReload('chunk')).toBe(false);
  });

  it('ignores malformed reload history instead of blocking forever', () => {
    sessionStorage.setItem('strength-save:guarded-reload-history', 'not-json');
    setPwaUpdateBlocked(true);

    expect(requestGuardedReload('chunk')).toBe(false);
    expect(hasPendingGuardedReload()).toBe(true);
  });
});
