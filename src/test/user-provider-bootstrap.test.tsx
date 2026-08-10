import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppUserProfile } from '@/lib/registration-api';

const mocks = vi.hoisted(() => ({
  snapshotNext: null as null | ((snapshot: {
    exists: () => boolean;
    data: () => AppUserProfile;
    metadata?: { fromCache: boolean };
  }) => void),
  syncUserProfile: vi.fn(),
  redeemInvite: vi.fn(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: '',
    },
  }),
}));

vi.mock('@/lib/firebase', () => ({ db: {} }));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ path: 'users/user-1' })),
  onSnapshot: vi.fn((_ref, next) => {
    mocks.snapshotNext = next;
    return vi.fn();
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

const profile: AppUserProfile = {
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'User',
  photoURL: '',
  role: 'user',
  access: { enabled: false },
  status: 'pending_verification',
  auth: { primaryProvider: 'password' },
  onboardingCompleted: false,
};

const Probe = () => {
  const current = useCurrentUser();
  return (
    <div>
      <span data-testid="loaded">{String(current.profileLoaded)}</span>
      <span data-testid="status">{current.profile?.status ?? 'none'}</span>
      <span data-testid="error">{current.profileLoadError ?? 'none'}</span>
    </div>
  );
};

describe('UserProvider profile bootstrap', () => {
  beforeEach(() => {
    mocks.snapshotNext = null;
    mocks.syncUserProfile.mockReset();
    mocks.redeemInvite.mockReset();
  });

  it('does not expose a fabricated pending profile before sync creates the user document', async () => {
    let resolveSync: (value: AppUserProfile) => void = () => undefined;
    mocks.syncUserProfile.mockReturnValue(new Promise<AppUserProfile>((resolve) => {
      resolveSync = resolve;
    }));

    render(<UserProvider><Probe /></UserProvider>);

    expect(screen.getByTestId('loaded')).toHaveTextContent('false');
    expect(screen.getByTestId('status')).toHaveTextContent('none');

    // The old implementation subscribed immediately. Firestore reported a missing
    // document before syncUserProfile finished and mounted EmailVerificationGate.
    expect(mocks.snapshotNext).toBeNull();

    await act(async () => resolveSync(profile));

    await waitFor(() => {
      expect(screen.getByTestId('loaded')).toHaveTextContent('true');
      expect(screen.getByTestId('status')).toHaveTextContent('pending_verification');
      expect(mocks.snapshotNext).not.toBeNull();
    });

    await act(async () => {
      mocks.snapshotNext?.({
        exists: () => false,
        data: () => profile,
        metadata: { fromCache: true },
      });
    });

    expect(screen.getByTestId('status')).toHaveTextContent('pending_verification');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('returns a load error with no pending profile when profile creation fails', async () => {
    mocks.syncUserProfile.mockRejectedValue(new Error('Registration requires attestation'));

    render(<UserProvider><Probe /></UserProvider>);

    await waitFor(() => {
      expect(screen.getByTestId('loaded')).toHaveTextContent('true');
      expect(screen.getByTestId('status')).toHaveTextContent('none');
      expect(screen.getByTestId('error')).toHaveTextContent('Registration requires attestation');
    });
  });
});
