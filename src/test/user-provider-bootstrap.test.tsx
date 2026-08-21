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

vi.mock('@/lib/pending-invite', () => ({
  consumePendingInviteCode: () => null,
  readInviteCodeFromLocation: () => null,
  setPendingInviteCode: vi.fn(),
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

    window.dispatchEvent(new Event('online'));
    await waitFor(() => expect(mocks.syncUserProfile).toHaveBeenCalledTimes(2));

    await emit('user-1', profile('user-1', 'suspended'), false);
    expect(screen.getByTestId('status')).toHaveTextContent('suspended');
    expect(screen.getByTestId('access')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });
});
