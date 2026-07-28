import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/pwa-update-guard', () => ({
  requestGuardedReload: vi.fn(() => false),
}));

import { loadChunkWithRetry } from '@/lib/lazy-with-retry';
import { requestGuardedReload } from '@/lib/pwa-update-guard';

const mockedReload = vi.mocked(requestGuardedReload);

describe('loadChunkWithRetry', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockedReload.mockClear();
    mockedReload.mockReturnValue(false);
  });

  it('retries once in place and resolves without reload when the second import succeeds', async () => {
    const component = () => null;
    const importer = vi
      .fn()
      .mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module: /assets/x.js'))
      .mockResolvedValueOnce({ default: component });

    const mod = await loadChunkWithRetry(importer, 'lazy-retry:test', { retryDelayMs: 0 });

    expect(mod.default).toBe(component);
    expect(importer).toHaveBeenCalledTimes(2);
    expect(mockedReload).not.toHaveBeenCalled();
  });

  it('treats a module without default export as a chunk error instead of resolving', async () => {
    const importer = vi.fn().mockResolvedValue(undefined);

    await expect(
      loadChunkWithRetry(importer, 'lazy-retry:empty', { retryDelayMs: 0 }),
    ).rejects.toThrow(/chunk-empty/);
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('treats a module object without default as a chunk error too', async () => {
    const importer = vi.fn().mockResolvedValue({});

    await expect(
      loadChunkWithRetry(importer, 'lazy-retry:no-default', { retryDelayMs: 0 }),
    ).rejects.toThrow(/chunk-empty/);
  });

  it('requests a guarded reload once, then the session guard blocks and rethrows', async () => {
    const importer = vi.fn().mockRejectedValue(new Error('Importing a module script failed.'));

    await expect(
      loadChunkWithRetry(importer, 'lazy-retry:dead', { retryDelayMs: 0 }),
    ).rejects.toThrow();
    expect(mockedReload).toHaveBeenCalledTimes(1);

    await expect(
      loadChunkWithRetry(importer, 'lazy-retry:dead', { retryDelayMs: 0 }),
    ).rejects.toThrow();
    expect(mockedReload).toHaveBeenCalledTimes(1);
  });

  it('clears the session guard after a successful load so future failures may reload again', async () => {
    const component = () => null;
    sessionStorage.setItem('lazy-retry:recovered', '1');
    const importer = vi.fn().mockResolvedValue({ default: component });

    await loadChunkWithRetry(importer, 'lazy-retry:recovered', { retryDelayMs: 0 });

    expect(sessionStorage.getItem('lazy-retry:recovered')).toBeNull();
  });
});
