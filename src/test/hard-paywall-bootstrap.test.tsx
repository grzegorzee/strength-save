import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getDocsFromCache: vi.fn(),
  getDocs: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => ({ uid: 'user-1' }) }));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({ isPro: false, loading: false }),
  isPaywallPlatform: () => true,
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'workouts'),
  where: vi.fn(() => 'where'),
  limit: vi.fn(() => 'limit'),
  query: vi.fn(() => 'query'),
  getDocsFromCache: mocks.getDocsFromCache,
  getDocs: mocks.getDocs,
}));

import { useHardPaywall } from '@/hooks/useHardPaywall';

describe('useHardPaywall startup', () => {
  beforeEach(() => {
    mocks.getDocsFromCache.mockReset();
    mocks.getDocs.mockReset();
  });

  it('cached treningi zachowują stary dostęp read-only bez sieci', async () => {
    mocks.getDocsFromCache.mockResolvedValue({ empty: false });

    const { result } = renderHook(() => useHardPaywall());

    await waitFor(() => expect(result.current).toBe('off'));
    expect(mocks.getDocs).not.toHaveBeenCalled();
  });

  it('wiszący serwer ma deadline i jawny fail-open, bez nadania PRO', async () => {
    vi.useFakeTimers();
    mocks.getDocsFromCache.mockResolvedValue({ empty: true });
    mocks.getDocs.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useHardPaywall());

    await act(async () => { await Promise.resolve(); });
    expect(result.current).toBe('pending');
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(result.current).toBe('off');
    vi.useRealTimers();
  });

  it('niezmiennik świeżego usera: pusty cache i pusty serwer wymuszają paywall', async () => {
    mocks.getDocsFromCache.mockResolvedValue({ empty: true });
    mocks.getDocs.mockResolvedValue({ empty: true });

    const { result } = renderHook(() => useHardPaywall());

    await waitFor(() => expect(result.current).toBe('enforced'));
  });
});
