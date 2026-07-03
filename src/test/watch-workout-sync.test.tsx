// R2-26: seria z zegarka nie może zniknąć po cichu — klucz w dedupie appliedRef
// jest trwały dopiero PO udanym zapisie; błąd zapisu = event zostaje do retry.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { WatchEvent } from '@/lib/watch-bridge';

const listeners: Array<(e: WatchEvent) => void> = [];
let peekedEvents: WatchEvent[] = [];
const ackWatchEvents = vi.fn(async (_keys: string[]) => undefined);

vi.mock('@/lib/watch-bridge', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/watch-bridge')>();
  return {
    ...original,
    isWatchBridgeSupported: () => true,
    addWatchEventListener: vi.fn(async (cb: (e: WatchEvent) => void) => {
      listeners.push(cb);
      return { remove: async () => {} };
    }),
    peekWatchEvents: vi.fn(async () => peekedEvents),
    ackWatchEvents: (keys: string[]) => ackWatchEvents(keys),
    sendWorkoutToWatch: vi.fn(async () => undefined),
  };
});

import { useWatchWorkoutSync } from '@/hooks/useWatchWorkoutSync';

const setLoggedEvent: WatchEvent = {
  type: 'setLogged',
  date: '2026-07-03',
  dayId: 'day-1',
  exerciseId: 'ex-1',
  setIndex: 0,
  reps: 8,
  weight: 100,
  completed: true,
  at: 111,
} as WatchEvent;

describe('useWatchWorkoutSync (R2-26)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.length = 0;
    peekedEvents = [];
  });

  const renderSync = (onSetLogged: (event: unknown) => Promise<void>) => renderHook(() => useWatchWorkoutSync({
    enabled: true,
    date: '2026-07-03',
    dayId: 'day-1',
    exercises: [],
    exerciseSets: {},
    onSetLogged,
    onWorkoutFinished: async () => undefined,
  }));

  it('bledny zapis draftu NIE zjada eventu: retry wywoluje handler ponownie, ack po sukcesie', async () => {
    const onSetLogged = vi.fn()
      .mockRejectedValueOnce(new Error('WATCH_DRAFT_PERSIST_FAILED'))
      .mockResolvedValueOnce(undefined);
    renderSync(onSetLogged);
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));

    // 1. dostarczenie: zapis draftu pada (np. IDB po powrocie z tla).
    listeners[0](setLoggedEvent);
    await waitFor(() => expect(onSetLogged).toHaveBeenCalledTimes(1));
    expect(ackWatchEvents).not.toHaveBeenCalled();

    // 2. dostarczenie (drain po powrocie do foreground): event NIE moze byc zdedupowany.
    listeners[0](setLoggedEvent);
    await waitFor(() => expect(onSetLogged).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(ackWatchEvents).toHaveBeenCalledTimes(1));
  });

  it('udany zapis dedupuje kolejne dostarczenia tego samego eventu', async () => {
    const onSetLogged = vi.fn(async () => undefined);
    renderSync(onSetLogged);
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));

    listeners[0](setLoggedEvent);
    await waitFor(() => expect(onSetLogged).toHaveBeenCalledTimes(1));
    listeners[0](setLoggedEvent);
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(onSetLogged).toHaveBeenCalledTimes(1);
  });
});
