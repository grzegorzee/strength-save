import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { GarminSettings } from '@/components/GarminSettings';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/device-management';

const listLinkedDevices = vi.fn();
const unlinkLinkedDevice = vi.fn();

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}));

vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    isPro: true, tier: 'yearly', expiresAt: '2027-08-10T00:00:00.000Z',
    subscription: null, loading: false, refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/watch-bridge', () => ({ getWatchAvailability: vi.fn(async () => null) }));

vi.mock('@/lib/garmin-api', () => ({
  listLinkedDevices: (...args: unknown[]) => listLinkedDevices(...args),
  unlinkLinkedDevice: (...args: unknown[]) => unlinkLinkedDevice(...args),
  reportAppleWatchStatus: vi.fn(async () => ({ linked: true })),
  startGarminPairing: vi.fn(async () => ({ code: '123456', expiresAt: Date.now() + 60_000 })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  unlinkLinkedDevice.mockResolvedValue(undefined);
  listLinkedDevices.mockResolvedValue([
    {
      deviceId: 'watch-12345678', platform: 'apple_watch', label: 'Apple Watch Ultra',
      pairedAt: 1, lastSeenAt: 2, lastSyncAt: 3, pendingEvents: 2,
      integration: 'healthkit', integrationStatus: 'ready', syncStatus: 'pending',
    },
    {
      deviceId: 'abcdef123456', platform: 'garmin', label: 'Fenix 8',
      pairedAt: 1, lastSeenAt: 2, lastSyncAt: 3, pendingEvents: 0,
      integration: 'fit', integrationStatus: 'saved', syncStatus: 'synced',
    },
  ]);
});

const renderSettings = () => render(<LanguageProvider><GarminSettings /></LanguageProvider>);

describe('shared device settings (Z227)', () => {
  it('web shows the same Watch/Garmin status and routes to both mobile stores without trial copy', async () => {
    renderSettings();
    expect(await screen.findByText('Apple Watch Ultra')).toBeInTheDocument();
    expect(screen.getByText('Fenix 8')).toBeInTheDocument();
    expect(screen.getByText(/Oczekujące: 2/)).toBeInTheDocument();
    expect(screen.getByText(/HealthKit: gotowe/)).toBeInTheDocument();
    expect(screen.getByText(/FIT: zapisano/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Aplikacja iOS/ })).toHaveAttribute('href', APP_STORE_URL);
    expect(screen.getByRole('link', { name: /Aplikacja Android/ })).toHaveAttribute('href', PLAY_STORE_URL);
    expect(screen.queryByText(/trial|okres próbny/i)).toBeNull();
  });

  it('unlink revokes the selected server device and refreshes the shared list', async () => {
    renderSettings();
    const buttons = await screen.findAllByTestId('linked-device-unlink');
    fireEvent.click(buttons[1]);
    await waitFor(() => expect(unlinkLinkedDevice).toHaveBeenCalledWith('garmin', 'abcdef123456'));
    await waitFor(() => expect(listLinkedDevices).toHaveBeenCalledTimes(2));
  });
});
