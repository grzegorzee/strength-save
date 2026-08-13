import { beforeEach, describe, expect, it, vi } from 'vitest';

const hideMock = vi.fn(async () => {});
vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: { hide: hideMock },
}));

const nativeMock = vi.hoisted(() => ({ isNative: false }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => nativeMock.isNative },
}));

import { hideNativeSplashWhenReady } from '@/lib/native-splash';

const flushFrames = async () => {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await Promise.resolve();
};

describe('native-splash', () => {
  beforeEach(() => {
    hideMock.mockClear();
  });

  it('na webie nic nie robi', async () => {
    nativeMock.isNative = false;
    hideNativeSplashWhenReady();
    await flushFrames();
    expect(hideMock).not.toHaveBeenCalled();
  });

  it('na native chowa splash po dwóch klatkach od gotowości', async () => {
    nativeMock.isNative = true;
    hideNativeSplashWhenReady();
    await flushFrames();
    await flushFrames();
    expect(hideMock).toHaveBeenCalledTimes(1);
  });
});
