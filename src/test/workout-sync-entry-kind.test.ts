import { describe, expect, it } from 'vitest';
import { syncKindForEntry } from '@/lib/workout-sync-entries';

describe('Sync Center workout sync kind', () => {
  it('reports a pending finalization as final, not checkpoint', () => {
    expect(syncKindForEntry({ finalSyncPending: true })).toBe('final');
  });

  it('keeps an active dirty workout on the checkpoint path', () => {
    expect(syncKindForEntry({ finalSyncPending: false })).toBe('checkpoint');
  });
});
