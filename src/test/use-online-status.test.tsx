// R2-28: badge pending nie odpytuje IndexedDB co 2 s non-stop (konkurencja z zapisami
// draftu w trakcie treningu) — odświeżenie sterowane zdarzeniem zmiany stanu syncu.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { WORKOUT_SYNC_STATE_CHANGED_EVENT } from '@/lib/workout-sync-entries';

const loadActiveDraft = vi.fn(async (_userId: string) => null as unknown);
const pendingCount = vi.fn((_userId: string) => 0);

vi.mock('@/lib/workout-draft-db', () => ({
  workoutDraftDb: { loadActiveDraft: (userId: string) => loadActiveDraft(userId) },
}));
vi.mock('@/lib/workout-sync-queue', () => ({
  workoutSyncQueue: { pendingCount: (userId: string) => pendingCount(userId) },
}));
vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { uid: 'user-1' } },
}));

import { useOnlineStatus } from '@/hooks/useOnlineStatus';

describe('useOnlineStatus (R2-28)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('NIE polluje IndexedDB w petli: brak odczytow po uplywie czasu bez zdarzen', async () => {
    vi.useFakeTimers();
    try {
      renderHook(() => useOnlineStatus());
      // Initial load jest OK.
      const initialCalls = loadActiveDraft.mock.calls.length;

      await act(async () => {
        await vi.advanceTimersByTimeAsync(10_000);
      });

      expect(loadActiveDraft.mock.calls.length).toBe(initialCalls);
    } finally {
      vi.useRealTimers();
    }
  });

  it('zdarzenie zmiany stanu syncu odswieza licznik pending', async () => {
    pendingCount.mockReturnValue(0);
    const { result } = renderHook(() => useOnlineStatus());
    await waitFor(() => expect(loadActiveDraft).toHaveBeenCalled());

    pendingCount.mockReturnValue(2);
    act(() => {
      window.dispatchEvent(new Event(WORKOUT_SYNC_STATE_CHANGED_EVENT));
    });

    await waitFor(() => expect(result.current.pendingOps).toBe(2));
  });
});
