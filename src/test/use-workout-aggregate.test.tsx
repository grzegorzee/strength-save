import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Feedback 2026-09-03 (87 w nagłówku vs 86 w szczegółach): agregat v1 liczył
// każdy dokument completed, także bez serii roboczej. Klient nie ufa staremu
// schematowi: v1 = lokalny fallback + jednorazowe, idempotentne
// rebuildWorkoutAggregate (Admin SDK po stronie backendu). Zero ręcznej
// mutacji produkcji, zero pętli wywołań (guard dzienny per uid).

type SnapshotLike = {
  exists: () => boolean;
  data: () => Record<string, unknown> | undefined;
  metadata: { fromCache: boolean };
};

const mocks = vi.hoisted(() => ({
  handlers: [] as Array<(snapshot: unknown) => void>,
  unsubscribe: vi.fn(),
  rebuild: vi.fn(async () => ({ data: { workoutCount: 0 } })),
  httpsCallable: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({ db: { __tag: 'db' }, functions: { __tag: 'functions' } }));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((...segments: unknown[]) => segments.slice(1).join('/')),
  onSnapshot: vi.fn((_ref: unknown, onNext: (snapshot: unknown) => void) => {
    mocks.handlers.push(onNext);
    return mocks.unsubscribe;
  }),
}));
vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => {
    mocks.httpsCallable(...args);
    return mocks.rebuild;
  },
}));

import { useWorkoutAggregate } from '@/hooks/useWorkoutAggregate';
import { doc } from 'firebase/firestore';

const v2Doc = {
  schemaVersion: 2,
  totals: {
    workoutCount: 86, totalTonnageKg: 1000, totalSets: 10, totalReps: 50,
    totalDurationSec: 0, workoutsWithDuration: 0, firstWorkoutDate: '2026-01-05',
  },
  contributions: { 'workout-u1-day-1-2026-01-05': { d: '2026-01-05', t: 1000, s: 10, r: 50, dur: null } },
};
const v1Doc = { ...v2Doc, schemaVersion: 1, totals: { ...v2Doc.totals, workoutCount: 87 } };

const emit = (snapshot: { exists: boolean; data?: Record<string, unknown>; fromCache?: boolean }) => {
  const handler = mocks.handlers[mocks.handlers.length - 1];
  const payload: SnapshotLike = {
    exists: () => snapshot.exists,
    data: () => snapshot.data,
    metadata: { fromCache: snapshot.fromCache ?? false },
  };
  act(() => { handler(payload); });
};

beforeEach(() => {
  mocks.handlers.length = 0;
  mocks.httpsCallable.mockClear();
  mocks.rebuild.mockClear();
  mocks.unsubscribe.mockClear();
  window.localStorage.clear();
});

describe('useWorkoutAggregate: schemat v2 i automatyczna odbudowa v1', () => {
  it('subskrybuje users/{uid}/aggregates/allTime i zdejmuje listener przy odmontowaniu', () => {
    const { unmount } = renderHook(() => useWorkoutAggregate('u1'));
    expect(vi.mocked(doc)).toHaveBeenCalledWith({ __tag: 'db' }, 'users', 'u1', 'aggregates', 'allTime');
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('dokument v2 z serwera daje agregat i nie wywołuje rebuildu', () => {
    const { result } = renderHook(() => useWorkoutAggregate('u1'));
    emit({ exists: true, data: v2Doc });
    expect(result.current?.totals.workoutCount).toBe(86);
    expect(result.current?.completedDates).toEqual(['2026-01-05']);
    expect(mocks.httpsCallable).not.toHaveBeenCalled();
  });

  it('dokument v1 z serwera = fallback lokalny + jednorazowy rebuildWorkoutAggregate', () => {
    const { result } = renderHook(() => useWorkoutAggregate('u1'));
    emit({ exists: true, data: v1Doc });
    expect(result.current).toBeNull();
    expect(mocks.httpsCallable).toHaveBeenCalledTimes(1);
    expect(mocks.httpsCallable).toHaveBeenCalledWith({ __tag: 'functions' }, 'rebuildWorkoutAggregate');
    expect(mocks.rebuild).toHaveBeenCalledTimes(1);

    // Backend zapisał v2, snapshot przychodzi sam: agregat bez kolejnego wywołania.
    emit({ exists: true, data: v2Doc });
    expect(result.current?.totals.workoutCount).toBe(86);
    expect(mocks.rebuild).toHaveBeenCalledTimes(1);
  });

  it('v1 z cache nie wywołuje rebuildu (czeka na odpowiedź serwera)', () => {
    const { result } = renderHook(() => useWorkoutAggregate('u1'));
    emit({ exists: true, data: v1Doc, fromCache: true });
    expect(result.current).toBeNull();
    expect(mocks.rebuild).not.toHaveBeenCalled();
  });

  it('guard dzienny: drugi ekran z tym samym v1 tego dnia nie spamuje backendu', () => {
    const first = renderHook(() => useWorkoutAggregate('u1'));
    emit({ exists: true, data: v1Doc });
    const second = renderHook(() => useWorkoutAggregate('u1'));
    emit({ exists: true, data: v1Doc });
    expect(mocks.rebuild).toHaveBeenCalledTimes(1);
    first.unmount();
    second.unmount();
  });

  it('brak dokumentu z serwera nadal uruchamia backfill (Z216)', () => {
    const { result } = renderHook(() => useWorkoutAggregate('u1'));
    emit({ exists: false });
    expect(result.current).toBeNull();
    expect(mocks.rebuild).toHaveBeenCalledTimes(1);
  });

  it('błąd rebuildu nie wywraca hooka i nie blokuje kolejnej próby', async () => {
    mocks.rebuild.mockRejectedValueOnce(new Error('unavailable'));
    const { result } = renderHook(() => useWorkoutAggregate('u1'));
    emit({ exists: true, data: v1Doc });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(result.current).toBeNull();
    expect(mocks.rebuild).toHaveBeenCalledTimes(1);

    emit({ exists: true, data: v1Doc });
    await act(async () => { await Promise.resolve(); });
    expect(mocks.rebuild).toHaveBeenCalledTimes(2);
  });
});
