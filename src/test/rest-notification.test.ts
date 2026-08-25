import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkPermissions = vi.fn();
const requestPermissions = vi.fn();
const schedule = vi.fn(async (_options: unknown) => undefined);
const cancel = vi.fn(async (_options: unknown) => undefined);
const removeDelivered = vi.fn(async (_options: unknown) => undefined);

// Bug 8 (X30): moduł słucha appStateChange przez app-lifecycle — test steruje
// przejściami tło/foreground przez przechwycony callback.
const appState = vi.hoisted(() => ({
  callback: null as ((isActive: boolean) => void) | null,
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: () => checkPermissions(),
    requestPermissions: () => requestPermissions(),
    schedule: (options: unknown) => schedule(options),
    cancel: (options: unknown) => cancel(options),
    removeDeliveredNotifications: (options: unknown) => removeDelivered(options),
  },
}));
vi.mock('@/lib/app-lifecycle', () => ({
  addAppStateListener: (cb: (isActive: boolean) => void) => {
    appState.callback = cb;
    return () => { appState.callback = null; };
  },
}));

// Chain operacji w module jest asynchroniczny — po sygnale tła trzeba
// odczekać mikrotaski, zanim schedule/cancel dojadą do pluginu.
const flushChain = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

describe('rest-notification: uzbrajanie i planowanie w tle (bug 8, X30)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    appState.callback = null;
    checkPermissions.mockResolvedValue({ display: 'granted' });
  });

  it('arm w foregroundzie NIE planuje notyfikacji (koniec przy włączonym ekranie = tylko sygnał apki)', async () => {
    const { armRestEndNotification } = await import('@/lib/rest-notification');

    armRestEndNotification(Date.now() + 90_000, 'Koniec przerwy', 'Przysiad');
    await flushChain();

    expect(schedule).not.toHaveBeenCalled();
  });

  it('przejście w tło planuje notyfikację na pozostały czas (id 90001)', async () => {
    const { armRestEndNotification } = await import('@/lib/rest-notification');

    armRestEndNotification(Date.now() + 90_000, 'Koniec przerwy', 'Przysiad');
    await flushChain();
    appState.callback?.(false);
    await flushChain();

    expect(schedule).toHaveBeenCalledTimes(1);
    const payload = schedule.mock.calls[0][0] as { notifications: Array<{ id: number; title: string; schedule: { at: Date } }> };
    expect(payload.notifications[0].id).toBe(90001);
    expect(payload.notifications[0].title).toBe('Koniec przerwy');
    expect(payload.notifications[0].schedule.at.getTime()).toBeGreaterThan(Date.now() + 80_000);
  });

  it('powrót na pierwszy plan anuluje pending i sprząta dostarczone, ale przerwa ZOSTAJE uzbrojona', async () => {
    const { armRestEndNotification } = await import('@/lib/rest-notification');

    armRestEndNotification(Date.now() + 90_000, 'Koniec przerwy', 'Przysiad');
    appState.callback?.(false);
    await flushChain();
    expect(schedule).toHaveBeenCalledTimes(1);

    appState.callback?.(true);
    await flushChain();
    expect(cancel).toHaveBeenCalledWith({ notifications: [{ id: 90001 }] });
    expect(removeDelivered).toHaveBeenCalled();

    // Kolejne zejście w tło planuje od nowa (przerwa wciąż biegnie).
    appState.callback?.(false);
    await flushChain();
    expect(schedule).toHaveBeenCalledTimes(2);
  });

  it('cancel (skip/koniec/unmount) ROZBRAJA: późniejsze tło nie planuje niczego', async () => {
    const { armRestEndNotification, cancelRestEndNotification } = await import('@/lib/rest-notification');

    armRestEndNotification(Date.now() + 90_000, 'Koniec przerwy', 'Przysiad');
    await cancelRestEndNotification();
    appState.callback?.(false);
    await flushChain();

    expect(schedule).not.toHaveBeenCalled();
  });

  it('deadline w przeszłości: tło nie planuje (przerwa już zasygnalizowana)', async () => {
    const { armRestEndNotification } = await import('@/lib/rest-notification');

    armRestEndNotification(Date.now() - 5_000, 'Koniec przerwy', 'Przysiad');
    appState.callback?.(false);
    await flushChain();

    expect(schedule).not.toHaveBeenCalled();
  });

  it('ułamek sekundy przed deadline: tło planuje (zaokrąglenie w górę, sygnał nie ginie)', async () => {
    const { armRestEndNotification } = await import('@/lib/rest-notification');

    armRestEndNotification(Date.now() + 400, 'Koniec przerwy', 'Przysiad');
    appState.callback?.(false);
    await flushChain();

    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it('cancel czyści też DOSTARCZONE wpisy z Centrum Powiadomień (kumulacja per przerwa)', async () => {
    const { cancelRestEndNotification } = await import('@/lib/rest-notification');

    await cancelRestEndNotification();

    expect(cancel).toHaveBeenCalledWith({ notifications: [{ id: 90001 }] });
    const payload = removeDelivered.mock.calls[0][0] as { notifications: Array<{ id: number }> };
    expect(payload.notifications[0].id).toBe(90001);
  });
});

describe('rest-notification: uprawnienia (R2-24)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    appState.callback = null;
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

  it('cancel w trakcie trwajacego schedule wygrywa: notyfikacja NIE odpala mimo pauzy (R2-25)', async () => {
    const { scheduleRestEndNotification, cancelRestEndNotification } = await import('@/lib/rest-notification');

    let releasePermissions!: (value: { display: string }) => void;
    checkPermissions.mockReturnValueOnce(new Promise((resolve) => {
      releasePermissions = resolve;
    }));

    const scheduling = scheduleRestEndNotification(90, 'Koniec przerwy', 'Wracaj');
    // Pauza timera, zanim schedule przeszedl przez swoje awaity.
    const cancelling = cancelRestEndNotification();
    releasePermissions({ display: 'granted' });
    await Promise.all([scheduling, cancelling]);

    expect(schedule).not.toHaveBeenCalled();
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
