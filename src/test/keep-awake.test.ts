import { beforeEach, describe, expect, it, vi } from 'vitest';

// Z177: keepScreenAwake było wołane raz per sesja, a iOS potrafi zdjąć blokadę
// (powrót z tła). Samonaprawa: moduł pamięta, że blokada powinna trzymać
// (held) i ponawia ją po appStateChange(isActive=true). Błędy pluginu przestają
// być połykane w ciszy.

const plugin = vi.hoisted(() => ({
  keepAwake: vi.fn(async () => undefined),
  allowSleep: vi.fn(async () => undefined),
  isKeptAwake: vi.fn(async () => ({ isKeptAwake: true })),
}));
const appListeners = vi.hoisted(() => ({
  callbacks: [] as Array<(state: { isActive: boolean }) => void>,
}));
const telemetry = vi.hoisted(() => ({ report: vi.fn() }));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor-community/keep-awake', () => ({ KeepAwake: plugin }));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(async (_event: string, cb: (s: { isActive: boolean }) => void) => {
      appListeners.callbacks.push(cb);
      return { remove: async () => {} };
    }),
  },
}));
vi.mock('@/lib/global-error-telemetry', () => ({ reportClientErrorWithCurrentUid: telemetry.report }));

const importKeepAwake = async () => import('@/lib/keep-awake');

const flushAsync = async () => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
};

beforeEach(() => {
  vi.resetModules();
  plugin.keepAwake.mockClear().mockImplementation(async () => undefined);
  plugin.allowSleep.mockClear().mockImplementation(async () => undefined);
  plugin.isKeptAwake.mockClear().mockImplementation(async () => ({ isKeptAwake: true }));
  telemetry.report.mockClear();
  appListeners.callbacks.length = 0;
  localStorage.clear();
});

describe('keep-awake self-healing (Z177)', () => {
  it('ustawienie ON: po powrocie na pierwszy plan blokada jest PONAWIANA', async () => {
    const { keepScreenAwake } = await importKeepAwake();

    await keepScreenAwake();
    expect(plugin.keepAwake).toHaveBeenCalledTimes(1);
    await flushAsync(); // dynamiczny import @capacitor/app w addAppStateListener
    expect(appListeners.callbacks.length).toBeGreaterThan(0);

    appListeners.callbacks.forEach((cb) => cb({ isActive: true }));
    await flushAsync();
    expect(plugin.keepAwake).toHaveBeenCalledTimes(2);
  });

  it('błąd pluginu → telemetria, nie cisza', async () => {
    plugin.keepAwake.mockImplementation(async () => {
      throw new Error('plugin dead');
    });
    const { keepScreenAwake } = await importKeepAwake();

    await keepScreenAwake();
    expect(telemetry.report).toHaveBeenCalled();
  });

  it('plugin raportuje, że blokada NIE weszła → telemetria', async () => {
    plugin.isKeptAwake.mockImplementation(async () => ({ isKeptAwake: false }));
    const { keepScreenAwake } = await importKeepAwake();

    await keepScreenAwake();
    await flushAsync();
    expect(telemetry.report).toHaveBeenCalled();
  });

  it('ustawienie OFF → zero wywołań pluginu', async () => {
    const mod = await importKeepAwake();
    mod.setKeepAwakeEnabled(false);

    await mod.keepScreenAwake();
    expect(plugin.keepAwake).not.toHaveBeenCalled();
  });

  it('allowScreenSleep wyłącza samonaprawę (powrót z tła nie wskrzesza blokady)', async () => {
    const mod = await importKeepAwake();
    await mod.keepScreenAwake();
    await flushAsync();
    await mod.allowScreenSleep();

    plugin.keepAwake.mockClear();
    appListeners.callbacks.forEach((cb) => cb({ isActive: true }));
    await flushAsync();
    expect(plugin.keepAwake).not.toHaveBeenCalled();
  });
});
