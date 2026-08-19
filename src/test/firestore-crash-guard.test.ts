import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isFirestoreInternalAssertion,
  shouldAutoReload,
  installFirestoreCrashGuard,
  registerFirestoreCrashDraftPreserver,
} from '@/lib/firestore-crash-guard';

// jsdom nie ma konstruktora PromiseRejectionEvent — budujemy event ręcznie.
const dispatchUnhandledRejection = (reason: unknown) => {
  const event = new Event('unhandledrejection') as PromiseRejectionEvent;
  Object.defineProperty(event, 'reason', { value: reason });
  window.dispatchEvent(event);
};

describe('firestore-crash-guard', () => {
  beforeEach(() => localStorage.clear());

  it('rozpoznaje asercję Firestore w message i w Error', () => {
    expect(isFirestoreInternalAssertion('FIRESTORE (12.8.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)')).toBe(true);
    expect(isFirestoreInternalAssertion(new Error('INTERNAL ASSERTION FAILED: Unexpected state'))).toBe(false);
    expect(isFirestoreInternalAssertion('zwykly blad sieci')).toBe(false);
    expect(isFirestoreInternalAssertion(undefined)).toBe(false);
    expect(isFirestoreInternalAssertion('INTERNAL ASSERTION FAILED: inny SDK')).toBe(false);
  });

  it('przed hard reloadem synchronicznie zabezpiecza aktywny draft', () => {
    const order: string[] = [];
    const unregister = registerFirestoreCrashDraftPreserver(() => order.push('draft-preserved'));
    const uninstall = installFirestoreCrashGuard(() => order.push('reload'));

    dispatchUnhandledRejection(new Error('FIRESTORE (12.8.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)'));

    expect(order).toEqual(['draft-preserved', 'reload']);
    uninstall();
    unregister();
  });

  it('anti-loop: reload najwyżej raz na 2 minuty', () => {
    const now = 1_000_000_000;
    expect(shouldAutoReload(now)).toBe(true); // pierwszy raz: tak + zapis znacznika
    expect(shouldAutoReload(now + 30_000)).toBe(false); // 30 s później: nie
    expect(shouldAutoReload(now + 121_000)).toBe(true); // po oknie: znowu tak
  });

  it('unhandledrejection z asercją woła reload; inne błędy nie', () => {
    const reload = vi.fn();
    const uninstall = installFirestoreCrashGuard(reload);
    dispatchUnhandledRejection(new Error('FIRESTORE (12.8.0) INTERNAL ASSERTION FAILED: Unexpected state (ID: b815)'));
    expect(reload).toHaveBeenCalledTimes(1);
    dispatchUnhandledRejection(new Error('network flake'));
    expect(reload).toHaveBeenCalledTimes(1);
    uninstall();
  });
});
