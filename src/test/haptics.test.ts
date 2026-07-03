import { beforeEach, describe, expect, it, vi } from 'vitest';

const impactMock = vi.fn(async (_options: unknown) => undefined);
const notificationMock = vi.fn(async (_options: unknown) => undefined);
let native = false;

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => native,
  },
}));
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: (options: unknown) => impactMock(options),
    notification: (options: unknown) => notificationMock(options),
  },
  ImpactStyle: { Light: 'LIGHT' },
  NotificationType: { Success: 'SUCCESS' },
}));

import { hapticImpactLight, hapticSuccess } from '@/lib/haptics';

describe('haptics (Z82)', () => {
  beforeEach(() => {
    impactMock.mockClear();
    notificationMock.mockClear();
  });

  it('na webie NIE woła pluginu (no-op)', async () => {
    native = false;
    await hapticImpactLight();
    await hapticSuccess();
    expect(impactMock).not.toHaveBeenCalled();
    expect(notificationMock).not.toHaveBeenCalled();
  });

  it('natywnie woła impact Light i notification Success', async () => {
    native = true;
    await hapticImpactLight();
    await hapticSuccess();
    expect(impactMock).toHaveBeenCalledWith({ style: 'LIGHT' });
    expect(notificationMock).toHaveBeenCalledWith({ type: 'SUCCESS' });
  });

  it('błąd pluginu nie wybucha (catch)', async () => {
    native = true;
    impactMock.mockRejectedValueOnce(new Error('no haptics'));
    await expect(hapticImpactLight()).resolves.toBeUndefined();
  });
});
