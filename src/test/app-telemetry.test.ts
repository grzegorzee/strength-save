import { beforeEach, describe, expect, it, vi } from 'vitest';
import { doc, increment, setDoc } from 'firebase/firestore';
import { flushTelemetryEvents, trackTelemetryEvent } from '@/lib/app-telemetry';

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'telemetry-document'),
  increment: vi.fn((value: number) => ({ increment: value })),
  setDoc: vi.fn(async () => undefined),
  Timestamp: { fromMillis: (ms: number) => ({ toMillis: () => ms }) },
}));

describe('app telemetry Firestore shape', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('writes a real counters map rather than literal dotted field names', async () => {
    trackTelemetryEvent('user-1', 'sync_failure', 2);
    await flushTelemetryEvents('user-1');

    expect(doc).toHaveBeenCalled();
    expect(increment).toHaveBeenCalledWith(2);
    expect(setDoc).toHaveBeenCalledWith(
      'telemetry-document',
      expect.objectContaining({
        userId: 'user-1',
        counters: {
          sync_failure: { increment: 2 },
        },
      }),
      { merge: true },
    );
    const written = vi.mocked(setDoc).mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(written)).not.toContain('counters.sync_failure');
  });
});
