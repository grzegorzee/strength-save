import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from 'firebase/auth';

const authHarness = vi.hoisted(() => ({
  listener: null as ((user: User | null) => void) | null,
  currentUser: null as User | null,
}));

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: { credential: vi.fn() },
  OAuthProvider: class OAuthProvider {
    credential = vi.fn();
  },
  browserLocalPersistence: {},
  createUserWithEmailAndPassword: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, listener: (user: User | null) => void) => {
    authHarness.listener = listener;
    return vi.fn();
  }),
  sendPasswordResetEmail: vi.fn(),
  setPersistence: vi.fn(),
  signInWithCredential: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('@capacitor-firebase/authentication', () => ({ FirebaseAuthentication: {} }));
vi.mock('@/lib/firebase', () => ({
  auth: {
    get currentUser() { return authHarness.currentUser; },
  },
  googleProvider: {},
  appleProvider: {},
}));
vi.mock('@/lib/purchases', () => ({
  configurePurchases: vi.fn(),
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

import { useAuth } from '@/hooks/useAuth';

describe('useAuth: izolacja motywu przed pierwszym renderem konta', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    authHarness.listener = null;
    authHarness.currentUser = null;
  });

  it('czyści cache motywu konta A synchronicznie przed udostępnieniem konta B', () => {
    localStorage.setItem('ss-theme-owner-v1', 'user-a');
    localStorage.setItem('ss-accent-color', 'indigo');
    localStorage.setItem('ss-palette-theme-v2', JSON.stringify({
      version: 2,
      id: 'glacier',
      source: 'preset',
      primary: '#38bdf8',
      supportA: '#818cf8',
      supportB: '#2dd4bf',
    }));

    const { result } = renderHook(() => useAuth());
    const nextUser = { uid: 'user-b' } as User;
    expect(authHarness.listener).not.toBeNull();

    act(() => authHarness.listener?.(nextUser));

    expect(result.current.user).toBe(nextUser);
    expect(localStorage.getItem('ss-theme-owner-v1')).toBe('user-b');
    expect(localStorage.getItem('ss-accent-color')).toBeNull();
    expect(localStorage.getItem('ss-palette-theme-v2')).toBeNull();
    expect(document.documentElement.dataset.palette).toBeUndefined();
  });

  it('po 3 s wpuszcza wyłącznie użytkownika zachowanego przez Firebase i dalej godzi stan w tle', () => {
    vi.useFakeTimers();
    const cachedUser = { uid: 'cached-user' } as User;
    authHarness.currentUser = cachedUser;

    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.loading).toBe(false);
    expect(result.current.user).toBe(cachedUser);

    act(() => authHarness.listener?.(null));
    expect(result.current.user).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('bez użytkownika Firebase po 3 s pokazuje stan słabej sieci, ale nie omija auth', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAuth());

    act(() => vi.advanceTimersByTime(3000));

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.slow).toBe(true);
  });
});
