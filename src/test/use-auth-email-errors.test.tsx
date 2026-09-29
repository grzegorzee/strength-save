import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';

// B2 (2026-09-29, audyt R1): logowanie i rejestracja emailem pokazywały surowy
// komunikat Firebase ("Firebase: Error (auth/email-already-in-use).") zamiast
// tekstu po polsku/angielsku. Hook mapuje kod auth/* na klucz i18n.

const authMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: vi.fn() },
  OAuthProvider: class OAuthProvider {
    credential = vi.fn();
  },
  browserLocalPersistence: {},
  createUserWithEmailAndPassword: authMocks.createUserWithEmailAndPassword,
  onAuthStateChanged: vi.fn((_auth, listener: (user: User | null) => void) => {
    listener(null);
    return vi.fn();
  }),
  setPersistence: vi.fn(),
  signInWithCredential: vi.fn(),
  signInWithEmailAndPassword: authMocks.signInWithEmailAndPassword,
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
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/startup-performance', () => ({ markStartup: vi.fn() }));
vi.mock('@/lib/registration-api', () => ({ requestPasswordReset: vi.fn() }));

import { useAuth } from '@/hooks/useAuth';

const firebaseError = (code: string) =>
  Object.assign(new Error(`Firebase: Error (${code}).`), { code });

describe('useAuth: błędy logowania/rejestracji emailem (B2)', () => {
  beforeEach(() => {
    authMocks.createUserWithEmailAndPassword.mockReset();
    authMocks.signInWithEmailAndPassword.mockReset();
  });

  it('rejestracja na zajęty email = przetłumaczony komunikat, nie surowy Firebase', async () => {
    authMocks.createUserWithEmailAndPassword.mockRejectedValue(firebaseError('auth/email-already-in-use'));
    const { result } = renderHook(() => useAuth());
    let ok = true;
    await act(async () => { ok = await result.current.registerWithEmail('a@b.pl', 'haslo123'); });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('auth.err.emailInUse');
  });

  it('słabe hasło przy rejestracji ma własny komunikat', async () => {
    authMocks.createUserWithEmailAndPassword.mockRejectedValue(firebaseError('auth/weak-password'));
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.registerWithEmail('a@b.pl', '123'); });
    expect(result.current.error).toBe('auth.err.weakPassword');
  });

  it('nieznany błąd rejestracji = generyczny auth.err.register', async () => {
    authMocks.createUserWithEmailAndPassword.mockRejectedValue(firebaseError('auth/internal-error'));
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.registerWithEmail('a@b.pl', 'haslo123'); });
    expect(result.current.error).toBe('auth.err.register');
  });

  it('złe dane logowania = komunikat o błędnym emailu lub haśle', async () => {
    authMocks.signInWithEmailAndPassword.mockRejectedValue(firebaseError('auth/invalid-credential'));
    const { result } = renderHook(() => useAuth());
    let ok = true;
    await act(async () => { ok = await result.current.loginWithEmail('a@b.pl', 'zle'); });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('auth.err.invalidCredentials');
  });

  it('zbyt wiele prób logowania = komunikat o odczekaniu', async () => {
    authMocks.signInWithEmailAndPassword.mockRejectedValue(firebaseError('auth/too-many-requests'));
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.loginWithEmail('a@b.pl', 'zle'); });
    expect(result.current.error).toBe('auth.err.tooManyRequests');
  });

  it('błąd bez kodu przy logowaniu nigdy nie pokazuje surowego tekstu', async () => {
    authMocks.signInWithEmailAndPassword.mockRejectedValue(new Error('Firebase: Error (auth/whatever).'));
    const { result } = renderHook(() => useAuth());
    await act(async () => { await result.current.loginWithEmail('a@b.pl', 'x'); });
    expect(result.current.error).toBe('auth.err.login');
  });
});
