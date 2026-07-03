import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkPermissions = vi.fn();
const requestPermissions = vi.fn();
const schedule = vi.fn(async () => undefined);
const cancel = vi.fn(async () => undefined);

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: (...args: unknown[]) => checkPermissions(...args),
    requestPermissions: (...args: unknown[]) => requestPermissions(...args),
    schedule: (...args: unknown[]) => schedule(...args),
    cancel: (...args: unknown[]) => cancel(...args),
  },
}));

describe('rest-notification: uprawnienia (R2-24)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('odmowa uprawnien NIE jest cache-owana na zawsze: kolejna proba pyta ponownie', async () => {
    const { scheduleRestEndNotification } = await import('@/lib/rest-notification');

    // 1. proba: user nie zgodzil sie na notyfikacje.
    checkPermissions.mockResolvedValueOnce({ display: 'denied' });
    await scheduleRestEndNotification(90, 'Koniec przerwy', 'Wracaj do serii');
    expect(schedule).not.toHaveBeenCalled();

    // User wlacza uprawnienia w Ustawieniach systemu i wraca do apki.
    checkPermissions.mockResolvedValueOnce({ display: 'granted' });
    await scheduleRestEndNotification(90, 'Koniec przerwy', 'Wracaj do serii');

    expect(checkPermissions).toHaveBeenCalledTimes(2);
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it('wynik pozytywny jest cache-owany (bez odpytywania przy kazdej serii)', async () => {
    const { scheduleRestEndNotification } = await import('@/lib/rest-notification');

    checkPermissions.mockResolvedValue({ display: 'granted' });
    await scheduleRestEndNotification(90, 'a', 'b');
    await scheduleRestEndNotification(90, 'a', 'b');

    expect(checkPermissions).toHaveBeenCalledTimes(1);
    expect(schedule).toHaveBeenCalledTimes(2);
  });
});
