import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUserProfile } from '@/lib/registration-api';

type Snapshot = {
  exists: () => boolean;
  data: () => AppUserProfile;
  metadata: { fromCache: boolean };
};

type Listener = {
  next: (snapshot: Snapshot) => void;
  error: (error: Error) => void;
  unsubscribe: ReturnType<typeof vi.fn>;
};

const mocks = vi.hoisted(() => ({
  user: {
    uid: 'user-1',
    email: 'user-1@example.com',
    displayName: 'User 1',
    photoURL: '',
  } as { uid: string; email: string; displayName: string; photoURL: string } | null,
  listeners: new Map<string, Listener>(),
  syncUserProfile: vi.fn(),
  redeemInvite: vi.fn(),
  pendingInviteCode: null as string | null,
  setPendingInviteCode: vi.fn(),
  reportClientError: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mocks.user }),
  FUNNEL_REGISTERED_KEY: 'strength-save:funnel-registered',
}));

vi.mock('@/lib/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, collection: string, uid: string) => ({ path: `${collection}/${uid}` })),
  onSnapshot: vi.fn((ref: { path: string }, ...args: unknown[]) => {
    const nextIndex = typeof args[0] === 'function' ? 0 : 1;
    const unsubscribe = vi.fn();
    mocks.listeners.set(ref.path, {
      next: args[nextIndex] as Listener['next'],
      error: args[nextIndex + 1] as Listener['error'],
      unsubscribe,
    });
    return unsubscribe;
  }),
}));

vi.mock('@/lib/registration-api', () => ({
  syncUserProfile: mocks.syncUserProfile,
  redeemInvite: mocks.redeemInvite,
}));

vi.mock('@/lib/pending-invite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/pending-invite')>();
  return {
    ...actual,
    getPendingInviteCode: () => mocks.pendingInviteCode,
    readInviteCodeFromLocation: () => null,
    setPendingInviteCode: mocks.setPendingInviteCode,
  };
});

vi.mock('@/lib/error-telemetry', () => ({
  reportClientError: mocks.reportClientError,
}));

import { UserProvider, useCurrentUser } from '@/contexts/UserContext';

const profile = (
  uid: string,
  status: AppUserProfile['status'] = 'active',
): AppUserProfile => ({
  uid,
  email: `${uid}@example.com`,
  displayName: uid,
  photoURL: '',
  role: 'user',
  access: { enabled: status === 'active' },
  status,
  auth: { primaryProvider: 'google' },
  onboardingCompleted: true,
});

const snapshot = (data: AppUserProfile | null, fromCache: boolean): Snapshot => ({
  exists: () => data !== null,
  data: () => data as AppUserProfile,
  metadata: { fromCache },
});

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const emit = async (uid: string, data: AppUserProfile | null, fromCache: boolean) => {
  await act(async () => {
    mocks.listeners.get(`users/${uid}`)?.next(snapshot(data, fromCache));
  });
};

const Probe = () => {
  const current = useCurrentUser();
  return (
    <div>
      <span data-testid="uid">{current.uid}</span>
      <span data-testid="loaded">{String(current.profileLoaded)}</span>
      <span data-testid="status">{current.profile?.status ?? 'none'}</span>
      <span data-testid="access">{String(current.hasAppAccess)}</span>
      <span data-testid="photos">{String(current.canUseBodyPhotos)}</span>
      <span data-testid="error">{current.profileLoadError ?? 'none'}</span>
      <span data-testid="block-reason">{current.profileSyncBlockReason ?? 'none'}</span>
      <span data-testid="sync-pending">{String(current.profileSyncPending)}</span>
      <button type="button" onClick={() => void current.retryProfileSync()}>retry</button>
    </div>
  );
};

describe('UserProvider cache-first profile bootstrap', () => {
  beforeEach(() => {
    mocks.user = {
      uid: 'user-1', email: 'user-1@example.com', displayName: 'User 1', photoURL: '',
    };
    mocks.listeners.clear();
    mocks.syncUserProfile.mockReset();
    mocks.redeemInvite.mockReset();
    mocks.pendingInviteCode = null;
    mocks.setPendingInviteCode.mockReset();
    mocks.reportClientError.mockReset();
  });

  it('wpuszcza cached active bez czekania na wiszący sync', async () => {
    mocks.syncUserProfile.mockReturnValue(new Promise(() => undefined));
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.listeners.has('users/user-1')).toBe(true));
    await emit('user-1', profile('user-1'), true);

    expect(screen.getByTestId('loaded')).toHaveTextContent('true');
    expect(screen.getByTestId('status')).toHaveTextContent('active');
    expect(screen.getByTestId('access')).toHaveTextContent('true');
  });

  it('zachowuje cached active i dostęp po błędzie sync', async () => {
    const sync = deferred<AppUserProfile>();
    mocks.syncUserProfile.mockReturnValue(sync.promise);
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.listeners.has('users/user-1')).toBe(true));
    await emit('user-1', profile('user-1'), true);
    await act(async () => sync.reject(new Error('offline')));

    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('offline'));
    expect(screen.getByTestId('status')).toHaveTextContent('active');
    expect(screen.getByTestId('access')).toHaveTextContent('true');
  });

  it('bug 35: zachowuje cached active przy odrzuconej atestacji i klasyfikuje przyczynę', async () => {
    mocks.syncUserProfile.mockRejectedValue(Object.assign(new Error('permission denied'), {
      code: 'functions/permission-denied',
      details: { reason: 'app-verification-required' },
    }));
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.listeners.has('users/user-1')).toBe(true));
    await emit('user-1', profile('user-1'), true);

    await waitFor(() => expect(screen.getByTestId('block-reason')).toHaveTextContent('app-verification-required'));
    expect(screen.getByTestId('access')).toHaveTextContent('true');
    expect(screen.getByTestId('status')).toHaveTextContent('active');
  });

  it('bug 35: retry bez reloadu jest single-flight i po sukcesie czyści blokadę', async () => {
    const retry = deferred<AppUserProfile>();
    mocks.syncUserProfile
      .mockRejectedValueOnce(Object.assign(new Error('permission denied'), {
        code: 'permission-denied',
        details: { reason: 'app-verification-required' },
      }))
      .mockReturnValueOnce(retry.promise);
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(screen.getByTestId('block-reason')).toHaveTextContent('app-verification-required'));
    expect(screen.getByTestId('sync-pending')).toHaveTextContent('false');

    await act(async () => {
      screen.getByText('retry').click();
      screen.getByText('retry').click();
    });
    expect(mocks.syncUserProfile).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('sync-pending')).toHaveTextContent('true');

    await act(async () => retry.resolve(profile('user-1')));
    await waitFor(() => expect(screen.getByTestId('block-reason')).toHaveTextContent('none'));
    expect(screen.getByTestId('sync-pending')).toHaveTextContent('false');
    expect(screen.getByTestId('access')).toHaveTextContent('true');
  });

  it('bug 35: rozróżnia zamkniętą rejestrację od braku atestacji', async () => {
    mocks.syncUserProfile.mockRejectedValue(Object.assign(new Error('registration closed'), {
      code: 'functions/permission-denied',
      details: { reason: 'registration-closed' },
    }));
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(screen.getByTestId('block-reason')).toHaveTextContent('registration-closed'));
    expect(screen.getByTestId('access')).toHaveTextContent('false');
  });

  it('cached suspended blokuje dostęp offline', async () => {
    mocks.syncUserProfile.mockReturnValue(new Promise(() => undefined));
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.listeners.has('users/user-1')).toBe(true));
    await emit('user-1', profile('user-1', 'suspended'), true);

    expect(screen.getByTestId('loaded')).toHaveTextContent('true');
    expect(screen.getByTestId('status')).toHaveTextContent('suspended');
    expect(screen.getByTestId('access')).toHaveTextContent('false');
  });

  it('brak cache nowego usera nie fabrykuje profilu ani dostępu', async () => {
    mocks.syncUserProfile.mockReturnValue(new Promise(() => undefined));
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.listeners.has('users/user-1')).toBe(true));
    await emit('user-1', null, true);

    expect(screen.getByTestId('loaded')).toHaveTextContent('false');
    expect(screen.getByTestId('status')).toHaveTextContent('none');
    expect(screen.getByTestId('access')).toHaveTextContent('false');
  });

  it('niezmiennik starego flow: brak cache + udany sync tworzy profil pending', async () => {
    const sync = deferred<AppUserProfile>();
    mocks.syncUserProfile.mockReturnValue(sync.promise);
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.listeners.has('users/user-1')).toBe(true));
    await emit('user-1', null, true);
    expect(screen.getByTestId('loaded')).toHaveTextContent('false');

    await act(async () => sync.resolve(profile('user-1', 'pending_verification')));
    await waitFor(() => {
      expect(screen.getByTestId('loaded')).toHaveTextContent('true');
      expect(screen.getByTestId('status')).toHaveTextContent('pending_verification');
      expect(screen.getByTestId('access')).toHaveTextContent('false');
    });
  });

  it('zmiana uid czyści stary cache i ignoruje spóźniony wynik starego sync', async () => {
    const firstSync = deferred<AppUserProfile>();
    const secondSync = deferred<AppUserProfile>();
    mocks.syncUserProfile
      .mockReturnValueOnce(firstSync.promise)
      .mockReturnValueOnce(secondSync.promise);
    const view = render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.listeners.has('users/user-1')).toBe(true));
    await emit('user-1', profile('user-1'), true);
    expect(screen.getByTestId('access')).toHaveTextContent('true');

    mocks.user = {
      uid: 'user-2', email: 'user-2@example.com', displayName: 'User 2', photoURL: '',
    };
    view.rerender(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.listeners.has('users/user-2')).toBe(true));
    expect(screen.getByTestId('uid')).toHaveTextContent('user-2');
    expect(screen.getByTestId('loaded')).toHaveTextContent('false');
    expect(screen.getByTestId('status')).toHaveTextContent('none');
    expect(mocks.listeners.get('users/user-1')?.unsubscribe).toHaveBeenCalledOnce();

    await act(async () => firstSync.resolve(profile('user-1')));
    expect(screen.getByTestId('status')).toHaveTextContent('none');

    await emit('user-2', profile('user-2', 'suspended'), true);
    expect(screen.getByTestId('status')).toHaveTextContent('suspended');
    expect(screen.getByTestId('access')).toHaveTextContent('false');
  });

  // WP-D D1: zdjęcia sylwetki dla KAŻDEGO usera z dostępem (flaga domyślnie ON).
  it('canUseBodyPhotos: zwykły active user bez features.bodyPhotos ma dostęp do zdjęć', async () => {
    mocks.syncUserProfile.mockReturnValue(new Promise(() => undefined));
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.listeners.has('users/user-1')).toBe(true));
    await emit('user-1', profile('user-1'), true);

    expect(screen.getByTestId('access')).toHaveTextContent('true');
    expect(screen.getByTestId('photos')).toHaveTextContent('true');
  });

  it('canUseBodyPhotos: jawne features.bodyPhotos === false wyłącza zdjęcia (admin toggle)', async () => {
    mocks.syncUserProfile.mockReturnValue(new Promise(() => undefined));
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.listeners.has('users/user-1')).toBe(true));
    await emit('user-1', { ...profile('user-1'), features: { bodyPhotos: false } }, true);

    expect(screen.getByTestId('access')).toHaveTextContent('true');
    expect(screen.getByTestId('photos')).toHaveTextContent('false');
  });

  // Bug 33 (X30): kod zaproszenia był kasowany z localStorage PRZED
  // redeemInvite; przejściowa porażka (timeout 10 s na słabym zasięgu) gubiła
  // go cicho — bez telemetrii, a retry 'online' nie miał już czego ponowić.
  it('bug 33: udany redeem czyści kod dopiero po sukcesie i odświeża profil drugim syncem', async () => {
    mocks.pendingInviteCode = 'INVITE42';
    mocks.redeemInvite.mockResolvedValue({ success: true, inviteId: 'i1' });
    mocks.syncUserProfile
      .mockResolvedValueOnce(profile('user-1'))
      .mockResolvedValueOnce({ ...profile('user-1'), cohorts: ['beta'] });
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.redeemInvite).toHaveBeenCalledWith('INVITE42'));
    await waitFor(() => expect(mocks.syncUserProfile).toHaveBeenCalledTimes(2));
    expect(mocks.setPendingInviteCode).toHaveBeenCalledWith(null);
    expect(mocks.reportClientError).not.toHaveBeenCalled();
  });

  it('bug 33: przejściowa porażka redeem zostawia kod do retry i raportuje client_errors', async () => {
    mocks.pendingInviteCode = 'INVITE42';
    mocks.redeemInvite.mockRejectedValue(
      Object.assign(new Error('Native callable timed out'), { code: 'deadline-exceeded' }),
    );
    mocks.syncUserProfile.mockResolvedValue(profile('user-1'));
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.redeemInvite).toHaveBeenCalledWith('INVITE42'));
    await waitFor(() => expect(mocks.reportClientError).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ code: 'invite-redeem-failed', phase: 'other' }),
    ));
    expect(mocks.setPendingInviteCode).not.toHaveBeenCalledWith(null);
    // Niezmiennik: porażka redeemu nie blokuje wejścia do apki.
    await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('true'));
    expect(screen.getByTestId('status')).toHaveTextContent('active');
  });

  it('bug 33: permanentna porażka redeem (not-found) czyści kod, bez pętli retry', async () => {
    mocks.pendingInviteCode = 'BADCODE1';
    mocks.redeemInvite.mockRejectedValue(
      Object.assign(new Error('Nie znaleziono zaproszenia.'), { code: 'functions/not-found' }),
    );
    mocks.syncUserProfile.mockResolvedValue(profile('user-1'));
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.setPendingInviteCode).toHaveBeenCalledWith(null));
    expect(mocks.reportClientError).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ code: 'invite-redeem-failed' }),
    );
  });

  it('po reconnect ponawia sync, a serwerowa revokacja zastępuje cached active', async () => {
    const firstSync = deferred<AppUserProfile>();
    mocks.syncUserProfile
      .mockReturnValueOnce(firstSync.promise)
      .mockReturnValueOnce(new Promise(() => undefined));
    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => expect(mocks.listeners.has('users/user-1')).toBe(true));
    await emit('user-1', profile('user-1'), true);
    await act(async () => firstSync.reject(new Error('offline')));
    await waitFor(() => expect(screen.getByTestId('error')).toHaveTextContent('offline'));

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });
    await waitFor(() => expect(mocks.syncUserProfile).toHaveBeenCalledTimes(2));

    await emit('user-1', profile('user-1', 'suspended'), false);
    expect(screen.getByTestId('status')).toHaveTextContent('suspended');
    expect(screen.getByTestId('access')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });
});
