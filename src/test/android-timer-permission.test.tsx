import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AndroidTimerPermission } from '@/components/AndroidTimerPermission';
const native = vi.hoisted(() => ({
  platform: 'android',
  check: vi.fn(), change: vi.fn(),
  active: null as ((active: boolean) => void) | null,
}));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => native.platform !== 'web', getPlatform: () => native.platform } }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: { checkExactNotificationSetting: native.check, changeExactNotificationSetting: native.change } }));
vi.mock('@/contexts/LanguageContext', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/lib/app-lifecycle', () => ({ addAppStateListener: (cb: (active: boolean) => void) => { native.active = cb; return () => { native.active = null; }; } }));
beforeEach(() => { vi.clearAllMocks(); native.platform = 'android'; native.active = null; native.check.mockResolvedValue({ exact_alarm: 'denied' }); native.change.mockResolvedValue({ exact_alarm: 'denied' }); });

describe('Android timer permission recovery', () => {
  it('never opens settings by itself, keeps retry after denial and rechecks on resume', async () => {
    render(<AndroidTimerPermission />);
    const button = await screen.findByRole('button', { name: 'rest.exactAlarm.openSettings' });
    expect(native.change).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(native.change).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: 'rest.exactAlarm.openSettings' })).toBeEnabled();
    native.check.mockResolvedValue({ exact_alarm: 'granted' });
    await act(async () => { native.active?.(true); });
    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());
  });
  it('offers retry if the OS setting could not be read', async () => {
    native.check.mockRejectedValue(new Error('bridge unavailable'));
    render(<AndroidTimerPermission />);
    expect(await screen.findByRole('button', { name: 'rest.exactAlarm.openSettings' })).toBeEnabled();
  });
  for (const platform of ['web', 'ios']) {
    it(`does not show Android settings or touch its API on ${platform}`, async () => {
      native.platform = platform;
      const { container } = render(<AndroidTimerPermission />);
      await act(async () => {});
      expect(container).toBeEmptyDOMElement();
      expect(native.check).not.toHaveBeenCalled();
    });
  }
});
