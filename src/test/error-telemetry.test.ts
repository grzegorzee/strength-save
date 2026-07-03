import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addDoc } from 'firebase/firestore';
import { __resetErrorTelemetryForTests, reportClientError } from '@/lib/error-telemetry';

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(async () => undefined),
  collection: vi.fn(() => 'client-errors-collection'),
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }) },
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => 'web' },
}));

describe('reportClientError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetErrorTelemetryForTests();
  });

  it('zapisuje wpis z wymaganymi polami i hashem sesji zamiast surowego id', async () => {
    await reportClientError('user-1', {
      code: 'revision-conflict',
      phase: 'checkpoint',
      detail: 'WORKOUT_CONFLICT',
      sessionId: 'workout-user-1-day-1-2026-07-03',
    });

    expect(addDoc).toHaveBeenCalledTimes(1);
    const written = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(written.userId).toBe('user-1');
    expect(written.code).toBe('revision-conflict');
    expect(written.phase).toBe('checkpoint');
    expect(written.detail).toBe('WORKOUT_CONFLICT');
    expect(written.platform).toBe('web');
    expect(typeof written.appVersion).toBe('string');
    expect(typeof written.createdAt).toBe('number');
    expect(String(written.sessionHash)).toHaveLength(8);
    expect(String(written.sessionHash)).not.toContain('workout-user-1');
  });

  it('przycina detail do 500 znaków', async () => {
    await reportClientError('user-1', {
      code: 'unknown',
      phase: 'other',
      detail: 'x'.repeat(2000),
    });
    const written = vi.mocked(addDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(String(written.detail)).toHaveLength(500);
  });

  it('nigdy nie rzuca przy błędzie zapisu', async () => {
    vi.mocked(addDoc).mockRejectedValueOnce(new Error('offline'));
    await expect(reportClientError('user-1', { code: 'offline', phase: 'final' })).resolves.toBeUndefined();
  });

  it('throttling: max 20 wpisów na sesję appki', async () => {
    for (let i = 0; i < 25; i += 1) {
      await reportClientError('user-1', { code: 'unknown', phase: 'other', detail: `err-${i}` });
    }
    expect(addDoc).toHaveBeenCalledTimes(20);
  });
});
