import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Bug 34 (X30): recordConsent szedł gołym httpsCallable (70 s domyślnego
// timeoutu SDK, zero natywnej atestacji), mimo że chroniona ścieżka
// syncUserProfile/verifyEmailCode istniała. Wspólny helper callProtectedFunction
// (wydzielony z registration-api) daje 10 s timeout na webie i App Attest
// best-effort na natywie.

const mocks = vi.hoisted(() => ({
  platform: 'web',
  httpsCallable: vi.fn(),
  callNativeAttestedFunction: vi.fn(),
  appCheckReady: Promise.resolve(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => mocks.platform,
    isNativePlatform: () => mocks.platform !== 'web',
  },
}));

vi.mock('@/lib/firebase', () => ({
  functions: { __tag: 'functions-instance' },
  get appCheckReady() { return mocks.appCheckReady; },
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => mocks.httpsCallable(...args as []),
}));

vi.mock('@/lib/native-callable', () => ({
  callNativeAttestedFunction: (...args: unknown[]) => mocks.callNativeAttestedFunction(...args as []),
}));

import {
  callProtectedFunction,
  getProtectedCallableRejectionReason,
  PROTECTED_CALLABLE_WEB_TIMEOUT_MS,
} from '@/lib/protected-callable';

describe('callProtectedFunction', () => {
  beforeEach(() => {
    mocks.platform = 'web';
    mocks.httpsCallable.mockReset();
    mocks.callNativeAttestedFunction.mockReset();
    mocks.appCheckReady = Promise.resolve();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('web: wywołuje httpsCallable i zwraca data', async () => {
    const fn = vi.fn(async () => ({ data: { ok: true } }));
    mocks.httpsCallable.mockReturnValue(fn);

    const result = await callProtectedFunction<{ x: number }, { ok: boolean }>('recordConsent', { x: 1 });

    expect(mocks.httpsCallable).toHaveBeenCalledWith(expect.anything(), 'recordConsent');
    expect(fn).toHaveBeenCalledWith({ x: 1 });
    expect(result).toEqual({ ok: true });
  });

  it('web: wiszące żądanie pada po 10 s zamiast 70 s SDK', async () => {
    vi.useFakeTimers();
    mocks.httpsCallable.mockReturnValue(() => new Promise(() => undefined));

    const call = callProtectedFunction('recordConsent', {});
    const assertion = expect(call).rejects.toThrow(
      `Protected function recordConsent timed out after ${PROTECTED_CALLABLE_WEB_TIMEOUT_MS} ms`,
    );
    await vi.advanceTimersByTimeAsync(PROTECTED_CALLABLE_WEB_TIMEOUT_MS + 1);
    await assertion;
  });

  // Bug 35 (X30): pierwsze syncUserProfile na webie wyścigało się z
  // asynchronicznym initem App Check (chunk firebase/app-check) — żądanie bez
  // tokenu = permission-denied przy tworzeniu profilu. Chroniona ścieżka czeka
  // na appCheckReady (promise z własnym limitem czasu w firebase.ts).
  it('web: czeka na appCheckReady zanim wyśle żądanie', async () => {
    let resolveReady: () => void = () => undefined;
    mocks.appCheckReady = new Promise<void>((resolve) => { resolveReady = resolve; });
    const fn = vi.fn(async () => ({ data: { ok: true } }));
    mocks.httpsCallable.mockReturnValue(fn);

    const call = callProtectedFunction('syncUserProfile', {});
    await Promise.resolve();
    await Promise.resolve();
    expect(fn).not.toHaveBeenCalled();

    resolveReady();
    await expect(call).resolves.toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('native (ios): deleguje do callNativeAttestedFunction, bez httpsCallable', async () => {
    mocks.platform = 'ios';
    mocks.callNativeAttestedFunction.mockResolvedValue({ ok: true });

    const result = await callProtectedFunction('recordConsent', { x: 2 });

    expect(mocks.callNativeAttestedFunction).toHaveBeenCalledWith('recordConsent', { x: 2 });
    expect(mocks.httpsCallable).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });
});

describe('getProtectedCallableRejectionReason', () => {
  it.each([
    ['app-verification-required', 'app-verification-required'],
    ['registration-closed', 'registration-closed'],
  ] as const)('rozpoznaje permission-denied details.reason=%s', (reason, expected) => {
    expect(getProtectedCallableRejectionReason({
      code: 'functions/permission-denied',
      details: { reason },
    })).toBe(expected);
  });

  it('nie klasyfikuje obcego błędu ani nieznanego reason', () => {
    expect(getProtectedCallableRejectionReason({
      code: 'functions/unavailable',
      details: { reason: 'app-verification-required' },
    })).toBeNull();
    expect(getProtectedCallableRejectionReason({
      code: 'functions/permission-denied',
      details: { reason: 'other' },
    })).toBeNull();
  });
});
