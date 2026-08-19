import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  currentUser: {
    profile: null as null | { subscription?: { tier: 'monthly'; status: 'active'; expiresAt: string } },
    isAdmin: false,
    profileLoaded: true,
  },
  getCustomerInfo: vi.fn(),
  addListener: vi.fn(() => Promise.resolve('listener-1')),
  removeListener: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => mocks.currentUser }));
vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    getCustomerInfo: mocks.getCustomerInfo,
    addCustomerInfoUpdateListener: mocks.addListener,
    removeCustomerInfoUpdateListener: mocks.removeListener,
  },
}));

import { useSubscription } from '@/hooks/useSubscription';

describe('useSubscription startup', () => {
  beforeEach(() => {
    mocks.currentUser.profile = null;
    mocks.currentUser.isAdmin = false;
    mocks.currentUser.profileLoaded = true;
    mocks.getCustomerInfo.mockReset();
    mocks.addListener.mockClear();
    mocks.removeListener.mockClear();
  });

  it('cached, serwerowo potwierdzone PRO nie czeka na wiszący RevenueCat', () => {
    mocks.currentUser.profile = {
      subscription: {
        tier: 'monthly',
        status: 'active',
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
    };
    mocks.getCustomerInfo.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useSubscription());

    expect(result.current.isPro).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it('brak cache po timeout RevenueCat kończy pending, ale nie dostaje PRO', async () => {
    vi.useFakeTimers();
    mocks.getCustomerInfo.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useSubscription());

    expect(result.current.loading).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });

    expect(result.current.loading).toBe(false);
    expect(result.current.isPro).toBe(false);
    expect(result.current.tier).toBe('none');
    vi.useRealTimers();
  });
});
