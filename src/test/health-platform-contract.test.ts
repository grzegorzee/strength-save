import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

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
  });

  for (const platform of ['ios', 'android']) {
    it(`uses the native HealthSync plugin on ${platform}`, async () => {
      native.platform = platform;
      const { getHealthBridge } = await import('@/lib/health-bridge');
      const bridge = getHealthBridge();

      expect(await bridge.isAvailable()).toBe(true);
      expect(await bridge.requestPermissions()).toBe(true);
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
    }, false);
    await Promise.resolve();
    expect(native.plugin.writeWorkout).not.toHaveBeenCalled();
  });

  it('po wycofaniu wyłącza lokalne opcje i usuwa oczekujący stan synchronizacji', async () => {
    localStorage.setItem('fittracker_health_settings_v1', JSON.stringify({ syncWorkouts: true, suggestWeight: true, lastSyncAt: 1 }));
    localStorage.setItem('fittracker_health_sync_state_v1', JSON.stringify({ w1: { syncedAt: 1, endMs: 2 } }));
    const { disableHealthFeatures, loadHealthSettings } = await import('@/lib/health-bridge');
    disableHealthFeatures();
    expect(loadHealthSettings()).toEqual({ syncWorkouts: false, suggestWeight: false });
    expect(localStorage.getItem('fittracker_health_sync_state_v1')).toBeNull();
  });

  it('registers the local iOS HealthSync plugin in the Capacitor bridge', () => {
    const bridgeController = readFileSync(
      'ios/App/App/WatchBridge/BridgeViewController.swift',
      'utf8',
    );

    expect(bridgeController).toContain('bridge?.registerPluginInstance(HealthSyncPlugin())');
  });
});
