// E-T5 (zgłoszenie z buildu 107: "Historia się długo ładuje"): pierwsza strona
// historii maluje się z lokalnego cache Firestore natychmiast, serwer nadpisuje
// po dojściu; błąd serwera po udanym cache nie zamazuje widoku.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

interface FakeDoc { id: string; data: () => Record<string, unknown> }

const doc = (id: string, date: string): FakeDoc => ({
  id,
  data: () => ({ userId: 'u1', dayId: 'day-1', date, exercises: [], completed: true }),
});

const getDocsMock = vi.hoisted(() => vi.fn());
const getDocsFromCacheMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn(async () => undefined) }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'collection'),
  documentId: vi.fn(() => '__name__'),
  getDocs: getDocsMock,
  getDocsFromCache: getDocsFromCacheMock,
  limit: vi.fn(() => 'limit'),
  onSnapshot: vi.fn(() => () => undefined),
  orderBy: vi.fn(() => 'orderBy'),
  query: vi.fn(() => 'query'),
  startAfter: vi.fn(() => 'startAfter'),
  where: vi.fn(() => 'where'),
}));

import { fetchWorkoutHistoryPage } from '@/lib/workout-read-store';
import { useWorkoutHistoryPage } from '@/hooks/useWorkoutHistoryPage';

beforeEach(() => {
  getDocsMock.mockReset();
  getDocsFromCacheMock.mockReset();
});

describe('fetchWorkoutHistoryPage source:cache (E-T5)', () => {
  it('czyta z getDocsFromCache, nie dotyka serwera', async () => {
    getDocsFromCacheMock.mockResolvedValue({ docs: [doc('w1', '2026-08-19')] });
    const page = await fetchWorkoutHistoryPage('u1', { source: 'cache' });
    expect(page.workouts.map(w => w.id)).toEqual(['w1']);
    expect(page.cacheMiss).toBeUndefined();
    expect(getDocsMock).not.toHaveBeenCalled();
  });

  it('pusty cache = cacheMiss (nie "brak treningów")', async () => {
    getDocsFromCacheMock.mockResolvedValue({ docs: [] });
    const page = await fetchWorkoutHistoryPage('u1', { source: 'cache' });
    expect(page.cacheMiss).toBe(true);
    expect(page.workouts).toEqual([]);
  });

  it('wyjątek cache (klient bez persistence) = cacheMiss, bez rzucania', async () => {
    getDocsFromCacheMock.mockRejectedValue(new Error('no cache'));
    const page = await fetchWorkoutHistoryPage('u1', { source: 'cache' });
    expect(page.cacheMiss).toBe(true);
  });

  it('default: serwer jak dotąd, bez getDocsFromCache', async () => {
    getDocsMock.mockResolvedValue({ docs: [doc('w2', '2026-08-18')] });
    const page = await fetchWorkoutHistoryPage('u1', {});
    expect(page.workouts.map(w => w.id)).toEqual(['w2']);
    expect(getDocsFromCacheMock).not.toHaveBeenCalled();
  });
});

describe('useWorkoutHistoryPage cache-first (E-T5)', () => {
  it('cache maluje pierwszy, serwer nadpisuje po dojściu', async () => {
    getDocsFromCacheMock.mockResolvedValue({ docs: [doc('cached', '2026-08-10')] });
    let resolveServer: (v: { docs: FakeDoc[] }) => void = () => {};
    getDocsMock.mockReturnValue(new Promise((res) => { resolveServer = res; }));

    const { result } = renderHook(() => useWorkoutHistoryPage('u1', {}));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.workouts.map(w => w.id)).toEqual(['cached']);

    resolveServer({ docs: [doc('fresh', '2026-08-19'), doc('cached', '2026-08-10')] });
    await waitFor(() => expect(result.current.workouts.length).toBe(2));
    expect(result.current.workouts[0].id).toBe('fresh');
  });

  it('błąd serwera po udanym cache nie zamazuje widoku błędem', async () => {
    getDocsFromCacheMock.mockResolvedValue({ docs: [doc('cached', '2026-08-10')] });
    getDocsMock.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useWorkoutHistoryPage('u1', {}));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    await waitFor(() => expect(getDocsMock).toHaveBeenCalled());
    expect(result.current.workouts.map(w => w.id)).toEqual(['cached']);
    expect(result.current.error).toBeNull();
  });

  it('cacheMiss: czeka na serwer (bez pustego błysku), błąd serwera = error', async () => {
    getDocsFromCacheMock.mockResolvedValue({ docs: [] });
    getDocsMock.mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => useWorkoutHistoryPage('u1', {}));

    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
