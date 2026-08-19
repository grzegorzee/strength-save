import { describe, expect, it, vi } from 'vitest';

const nativeMocks = vi.hoisted(() => ({
  platform: 'web',
  auth: { currentUser: null as null | { getIdToken: () => Promise<string> } },
  initialize: vi.fn(),
  getToken: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: nativeMocks.auth,
  firebaseConfig: { projectId: 'fittracker-workouts' },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => nativeMocks.platform },
  registerPlugin: () => ({
    initialize: nativeMocks.initialize,
    getToken: nativeMocks.getToken,
  }),
}));

import {
  callNativeAttestedFunction,
  invokeCallableProtocol,
  supportsNativeAttestation,
} from '@/lib/native-callable';

describe('native attested callable protocol', () => {
  it('is available only for the two native store applications', () => {
    expect(supportsNativeAttestation('ios')).toBe(true);
    expect(supportsNativeAttestation('android')).toBe(true);
    expect(supportsNativeAttestation('web')).toBe(false);
  });

  it('sends only the callable data envelope with Auth and App Check headers', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { profile: { uid: 'u1' } } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const result = await invokeCallableProtocol<{ language: string }, { profile: { uid: string } }>({
      functionName: 'syncUserProfile',
      data: { language: 'pl' },
      projectId: 'fittracker-workouts',
      region: 'us-central1',
      authToken: 'auth-token',
      appCheckToken: 'app-check-token',
      fetchImpl,
    });

    expect(result).toEqual({ profile: { uid: 'u1' } });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://us-central1-fittracker-workouts.cloudfunctions.net/syncUserProfile',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer auth-token',
          'Content-Type': 'application/json',
          'X-Firebase-AppCheck': 'app-check-token',
        },
        body: JSON.stringify({ data: { language: 'pl' } }),
      }),
    );
  });

  it('preserves a callable error message for the verification UI', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { status: 'FAILED_PRECONDITION', message: 'User profile missing' },
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(invokeCallableProtocol({
      functionName: 'requestEmailVerificationCode',
      data: { language: 'pl' },
      projectId: 'fittracker-workouts',
      region: 'us-central1',
      authToken: 'auth-token',
      appCheckToken: 'app-check-token',
      fetchImpl,
    })).rejects.toMatchObject({
      message: 'User profile missing',
      code: 'failed-precondition',
    });
  });

  it('rejects malformed success responses instead of returning undefined', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await expect(invokeCallableProtocol({
      functionName: 'syncUserProfile',
      data: {},
      projectId: 'fittracker-workouts',
      region: 'us-central1',
      authToken: 'auth-token',
      appCheckToken: 'app-check-token',
      fetchImpl,
    })).rejects.toThrow('Invalid callable response');
  });

  it('initializes App Check and combines its token with the current JS Auth token', async () => {
    nativeMocks.platform = 'android';
    nativeMocks.auth.currentUser = { getIdToken: vi.fn().mockResolvedValue('auth-token') };
    nativeMocks.initialize.mockResolvedValue(undefined);
    nativeMocks.getToken.mockResolvedValue({ token: 'app-check-token', expireTimeMillis: Date.now() + 60_000 });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { sent: true } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callNativeAttestedFunction('requestEmailVerificationCode', { language: 'pl' }))
      .resolves.toEqual({ sent: true });

    expect(nativeMocks.initialize).toHaveBeenCalledWith({ isTokenAutoRefreshEnabled: true });
    expect(nativeMocks.auth.currentUser.getIdToken).toHaveBeenCalledOnce();
    expect(nativeMocks.getToken).toHaveBeenCalledWith({ forceRefresh: false });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://us-central1-fittracker-workouts.cloudfunctions.net/requestEmailVerificationCode',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
          'X-Firebase-AppCheck': 'app-check-token',
        }),
      }),
    );

    vi.unstubAllGlobals();
  });

  // Incydent 2026-08-11: attestacja padała na urządzeniu (DeviceCheck zamiast
  // App Attest → FAILED_PRECONDITION) i blokowała logowanie na KAŻDYM koncie.
  // Backend nie wymusza App Check, więc brak tokenu nie może odcinać sesji.
  it('falls back to a request without App Check header when attestation fails', async () => {
    nativeMocks.platform = 'ios';
    nativeMocks.auth.currentUser = { getIdToken: vi.fn().mockResolvedValue('auth-token') };
    nativeMocks.initialize.mockResolvedValue(undefined);
    nativeMocks.getToken.mockRejectedValue(new Error('The operation couldn’t be completed. (com.firebase.appCheck error 0.)'));
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { profile: { uid: 'u1' } } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(callNativeAttestedFunction('syncUserProfile', { language: 'pl' }))
      .resolves.toEqual({ profile: { uid: 'u1' } });

    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit.headers).toEqual({
      Authorization: 'Bearer auth-token',
      'Content-Type': 'application/json',
    });

    vi.unstubAllGlobals();
  });

  it('still fails when App Check init itself rejects but auth token is unavailable', async () => {
    nativeMocks.platform = 'ios';
    nativeMocks.auth.currentUser = null;

    await expect(callNativeAttestedFunction('syncUserProfile', {}))
      .rejects.toMatchObject({ code: 'unauthenticated' });
  });

  it('aborts a native callable at the hard deadline instead of hanging bootstrap', async () => {
    vi.useFakeTimers();
    nativeMocks.platform = 'ios';
    nativeMocks.auth.currentUser = { getIdToken: vi.fn().mockResolvedValue('auth-token') };
    nativeMocks.initialize.mockResolvedValue(undefined);
    nativeMocks.getToken.mockResolvedValue({ token: 'app-check-token', expireTimeMillis: Date.now() + 60_000 });
    const request = { signal: null as AbortSignal | null };
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      request.signal = init?.signal ?? null;
      return new Promise<Response>(() => undefined);
    });
    vi.stubGlobal('fetch', fetchMock);

    const outcome = Promise.race([
      callNativeAttestedFunction('syncUserProfile', {}).then(
        () => 'resolved',
        (error: { code?: string }) => error.code ?? 'rejected',
      ),
      new Promise<string>((resolve) => setTimeout(() => resolve('still-pending'), 10_001)),
    ]);

    await vi.advanceTimersByTimeAsync(10_001);
    expect(await outcome).toBe('deadline-exceeded');
    expect(request.signal?.aborted).toBe(true);

    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
});
