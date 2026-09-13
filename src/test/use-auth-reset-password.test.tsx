import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';

// 2026-09-13: reset hasła idzie przez callable requestPasswordReset (SES,
// noreply@strengthsave.app), nie przez sendPasswordResetEmail z mailera
// Firebase. Test pilnuje kontraktu hooka: wywołanie, wynik i mapowanie błędów.

const resetApi = vi.hoisted(() => ({ requestPasswordReset: vi.fn() }));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: vi.fn() },
  OAuthProvider: class OAuthProvider {
    credential = vi.fn();
  },
  browserLocalPersistence: {},
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, listener: (user: User | null) => void) => {
    listener(null);
    return vi.fn();
  }),
  setPersistence: vi.fn(),
  signInWithCredential: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('@capacitor-firebase/authentication', () => ({ FirebaseAuthentication: {} }));
vi.mock('@/lib/firebase', () => ({ auth: { currentUser: null }, googleProvider: {}, appleProvider: {} }));
vi.mock('@/lib/purchases', () => ({
  logInPurchases: vi.fn(async () => undefined),
  logOutPurchases: vi.fn(async () => undefined),
}));
vi.mock('@/lib/push-notifications', () => ({ unregisterPushForUser: vi.fn(async () => undefined) }));
vi.mock('@/lib/garmin-api', () => ({ revokeAllGarminDevices: vi.fn(async () => undefined) }));
vi.mock('@/lib/watch-bridge', () => ({ disableAppleWatchAccess: vi.fn(async () => undefined) }));
vi.mock('@/lib/e2e-auth', () => ({ readE2EAuthState: vi.fn() }));
vi.mock('@/lib/auth-errors', () => ({ mapAuthErrorMessage: vi.fn(() => 'error') }));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/startup-performance', () => ({ markStartup: vi.fn() }));
vi.mock('@/lib/registration-api', () => resetApi);

import { useAuth } from '@/hooks/useAuth';

describe('useAuth.resetPassword: własny kanał resetu (callable + SES)', () => {
  beforeEach(() => {
    resetApi.requestPasswordReset.mockReset();
  });

  it('woła requestPasswordReset z adresem i zwraca true bez błędu', async () => {
    resetApi.requestPasswordReset.mockResolvedValue({ sent: true });
    const { result } = renderHook(() => useAuth());

    let ok = false;
    await act(async () => { ok = await result.current.resetPassword('  Ktos@Example.com '); });

    expect(ok).toBe(true);
    expect(resetApi.requestPasswordReset).toHaveBeenCalledWith('  Ktos@Example.com ');
    expect(result.current.error).toBeNull();
  });

  it('resource-exhausted z backendu = komunikat o odczekaniu, nie surowy tekst', async () => {
    resetApi.requestPasswordReset.mockRejectedValue(
      Object.assign(new Error('Odczekaj chwilę'), { code: 'functions/resource-exhausted' }),
    );
    const { result } = renderHook(() => useAuth());

    let ok = true;
    await act(async () => { ok = await result.current.resetPassword('ktos@example.com'); });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('auth.err.resetCooldown');
  });

  it('inna awaria = generyczny komunikat resetu', async () => {
    resetApi.requestPasswordReset.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useAuth());

    let ok = true;
    await act(async () => { ok = await result.current.resetPassword('ktos@example.com'); });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('auth.err.reset');
  });
});
