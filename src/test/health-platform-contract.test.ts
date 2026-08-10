import { beforeEach, describe, expect, it, vi } from 'vitest';

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
});
