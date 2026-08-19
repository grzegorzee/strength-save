import { describe, expect, it, vi } from 'vitest';
import { withTimeout } from '@/lib/promise-timeout';

describe('withTimeout', () => {
  it('kończy wiszącą sieć przewidywalnym błędem', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => undefined), 1500, 'RevenueCat');
    const assertion = expect(pending).rejects.toThrow('RevenueCat timed out after 1500 ms');
    await vi.advanceTimersByTimeAsync(1500);
    await assertion;
    vi.useRealTimers();
  });

  it('nie zmienia poprawnego wyniku starego flow', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1500, 'network')).resolves.toBe('ok');
  });
});
