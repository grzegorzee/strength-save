import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const GRANT = { healthEpoch: 1, healthGrantId: 'grant-1' };

const native = vi.hoisted(() => ({
  platform: 'web',
  plugin: {
    isAvailable: vi.fn(async () => ({ available: true })),
    requestHealthPermissions: vi.fn(async () => ({ granted: true })),
    writeWorkout: vi.fn(async () => ({ ok: true })),
    readLatestWeight: vi.fn(async () => ({ sample: { kg: 82.5, date: '2026-08-10' } })),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => native.platform !== 'web',
    getPlatform: () => native.platform,
  },
  registerPlugin: () => native.plugin,
}));

vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));

describe('Z230/G12 — Health bridge matches platform copy', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    native.platform = 'web';
    native.plugin.writeWorkout.mockReset().mockResolvedValue({ ok: true });
  });
  afterEach(() => vi.useRealTimers());

  for (const platform of ['ios', 'android']) {
    it(`uses the native HealthSync plugin on ${platform}`, async () => {
      native.platform = platform;
      const { getHealthBridge } = await import('@/lib/health-bridge');
      const bridge = getHealthBridge();

      expect(await bridge.isAvailable()).toBe(true);
      expect(await bridge.requestPermissions()).toBe(true);
      expect(native.plugin.requestHealthPermissions).toHaveBeenLastCalledWith({ purpose: 'workout' });
      expect(await bridge.requestPermissions('weight')).toBe(true);
      expect(native.plugin.requestHealthPermissions).toHaveBeenLastCalledWith({ purpose: 'weight' });
      expect(await bridge.readLatestWeight()).toEqual({ kg: 82.5, date: '2026-08-10' });
      expect(native.plugin.isAvailable).toHaveBeenCalledOnce();
    });
  }

  it('keeps web as an explicit no-op', async () => {
    const { getHealthBridge } = await import('@/lib/health-bridge');
    expect(await getHealthBridge().isAvailable()).toBe(false);
    expect(native.plugin.isAvailable).not.toHaveBeenCalled();
  });

  it('nie wywołuje natywnego Health bez aktywnej zgody mimo starego ustawienia localStorage', async () => {
    native.platform = 'ios';
    localStorage.setItem('fittracker_health_settings_v1', JSON.stringify({ syncWorkouts: true, suggestWeight: true }));
    const { syncWorkoutToHealth } = await import('@/lib/health-bridge');
    syncWorkoutToHealth('u1', {
      id: 'w1', userId: 'u1', dayId: 'd1', date: '2026-08-28', completed: true,
      startedAt: 1_780_000_000_000, completedAt: 1_780_003_600_000,
      exercises: [],
    }, null);
    await Promise.resolve();
    expect(native.plugin.writeWorkout).not.toHaveBeenCalled();
  });

  it('po wycofaniu wyłącza opcje i zachowuje potwierdzenia eksportu przeciw duplikatom', async () => {
    localStorage.setItem('fittracker_health_settings_v1', JSON.stringify({ syncWorkouts: true, suggestWeight: true, lastSyncAt: 1 }));
    localStorage.setItem('fittracker_health_sync_state_v1', JSON.stringify({ w1: { syncedAt: 1, endMs: 2 } }));
    const { disableHealthFeatures, loadHealthSettings } = await import('@/lib/health-bridge');
    disableHealthFeatures();
    expect(loadHealthSettings()).toEqual({ syncWorkouts: false, suggestWeight: false });
    expect(JSON.parse(localStorage.getItem('fittracker_health_sync_state_v1')!)).toHaveProperty('w1');
  });

  it('late native ACK after withdrawal cannot enable health settings again', async () => {
    vi.useFakeTimers();
    native.platform = 'ios';
    let finish!: (value: { ok: boolean }) => void;
    native.plugin.writeWorkout.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const bridge = await import('@/lib/health-bridge');
    bridge.setHealthAccountOwner('u1');
    bridge.setHealthConsentScope('u1', GRANT.healthGrantId);
    bridge.saveHealthSettings({ syncWorkouts: true, suggestWeight: true });
    bridge.syncWorkoutToHealth('u1', {
      id: 'w1', userId: 'u1', dayId: 'd1', date: '2026-09-06', completed: true,
      startedAt: 1_780_000_000_000, completedAt: 1_780_003_600_000, exercises: [],
    }, GRANT);
    bridge.disableHealthFeatures();
    finish({ ok: true });
    await vi.advanceTimersByTimeAsync(0);
    expect(bridge.loadHealthSettings()).toEqual({ syncWorkouts: false, suggestWeight: false });
  });

  it('withdrawal during retry backoff prevents further native writes', async () => {
    vi.useFakeTimers();
    native.platform = 'android';
    native.plugin.writeWorkout.mockRejectedValue(new Error('temporarily unavailable'));
    const bridge = await import('@/lib/health-bridge');
    bridge.setHealthAccountOwner('u1');
    bridge.setHealthConsentScope('u1', GRANT.healthGrantId);
    bridge.saveHealthSettings({ syncWorkouts: true, suggestWeight: false });
    bridge.syncWorkoutToHealth('u1', {
      id: 'w1', userId: 'u1', dayId: 'd1', date: '2026-09-06', completed: true,
      startedAt: 1_780_000_000_000, completedAt: 1_780_003_600_000, exercises: [],
    }, GRANT);
    await vi.advanceTimersByTimeAsync(0);
    bridge.disableHealthFeatures();
    await vi.runAllTimersAsync();
    expect(native.plugin.writeWorkout).toHaveBeenCalledTimes(1);
  });

  it('native retry uses the same account-scoped record identity and version', async () => {
    vi.useFakeTimers();
    native.platform = 'ios';
    native.plugin.writeWorkout.mockRejectedValueOnce(new Error('response lost')).mockResolvedValue({ ok: true });
    const bridge = await import('@/lib/health-bridge');
    bridge.setHealthAccountOwner('u1');
    bridge.setHealthConsentScope('u1', GRANT.healthGrantId);
    bridge.saveHealthSettings({ syncWorkouts: true, suggestWeight: false });
    bridge.syncWorkoutToHealth('u1', {
      id: 'w1', userId: 'u1', dayId: 'd1', date: '2026-09-06', completed: true,
      startedAt: 1_780_000_000_000, completedAt: 1_780_003_600_000, exercises: [],
    }, GRANT);
    await vi.runAllTimersAsync();
    expect(native.plugin.writeWorkout).toHaveBeenCalledTimes(2);
    const calls = native.plugin.writeWorkout.mock.calls as unknown as Array<[Record<string, unknown>]>;
    expect(calls[0][0]).toMatchObject({ recordId: 'strengthsave:u1:workout:w1', recordVersion: expect.any(Number) });
    expect(calls[1][0]).toEqual(calls[0][0]);
  });

  it('late weight read after consent withdrawal returns no sample', async () => {
    native.platform = 'ios';
    let finish!: (value: { sample: { kg: number; date: string } }) => void;
    native.plugin.readLatestWeight.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const bridge = await import('@/lib/health-bridge');
    const pending = bridge.getHealthBridge().readLatestWeight();
    bridge.disableHealthFeatures();
    finish({ sample: { kg: 82, date: '2026-09-06' } });
    expect(await pending).toBeNull();
  });

  it('account A native result cannot appear for account B', async () => {
    native.platform = 'ios';
    let finish!: (value: { sample: { kg: number; date: string } }) => void;
    native.plugin.readLatestWeight.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const bridge = await import('@/lib/health-bridge');
    bridge.setHealthAccountOwner('account-a');
    const pending = bridge.getHealthBridge().readLatestWeight();
    bridge.setHealthAccountOwner('account-b');
    finish({ sample: { kg: 82, date: '2026-09-06' } });
    expect(await pending).toBeNull();
  });

  it('late completion from account A cannot start a new write under B or a later consent grant', async () => {
    native.platform = 'ios';
    const bridge = await import('@/lib/health-bridge');
    bridge.setHealthAccountOwner('u1');
    bridge.setHealthConsentScope('u1', GRANT.healthGrantId);
    bridge.saveHealthSettings({ syncWorkouts: true, suggestWeight: false });
    bridge.setHealthAccountOwner('u2');
    bridge.setHealthConsentScope('u2', 'grant-2');
    const workout = { id: 'w1', userId: 'u1', dayId: 'd1', date: '2026-09-06', completed: true, startedAt: 1_780_000_000_000, completedAt: 1_780_003_600_000, exercises: [] };
    bridge.syncWorkoutToHealth('u1', workout, GRANT);
    expect(native.plugin.writeWorkout).not.toHaveBeenCalled();
    bridge.setHealthAccountOwner('u1');
    bridge.setHealthConsentScope('u1', 'grant-new');
    bridge.syncWorkoutToHealth('u1', workout, GRANT);
    expect(native.plugin.writeWorkout).not.toHaveBeenCalled();
  });

  it('registers the local iOS HealthSync plugin in the Capacitor bridge', () => {
    const bridgeController = readFileSync(
      'ios/App/App/WatchBridge/BridgeViewController.swift',
      'utf8',
    );

    expect(bridgeController).toContain('bridge?.registerPluginInstance(HealthSyncPlugin())');
  });
});
