import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'u1' } as { uid: string } | null },
  getDocsFromServer: vi.fn(),
  fetchWorkoutHistoryPage: vi.fn(),
}));
vi.mock('@/lib/firebase', () => ({ auth: fixtures.auth, db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, path: string) => path,
  where: (...args: unknown[]) => ({ kind: 'where', args }),
  orderBy: (...args: unknown[]) => ({ kind: 'orderBy', args }),
  startAfter: (cursor: unknown) => ({ kind: 'cursor', cursor }),
  limit: (size: number) => ({ kind: 'limit', size }),
  query: (path: string, ...constraints: unknown[]) => ({ path, constraints }),
  getDocsFromServer: fixtures.getDocsFromServer,
}));
vi.mock('@/lib/workout-read-store', () => ({ fetchWorkoutHistoryPage: fixtures.fetchWorkoutHistoryPage }));
import { fetchAllTimeActivityHistory, fetchWeekActivityHistory } from '@/lib/activity-read-store';
import { buildAllTimeActivityStats } from '@/lib/all-time-stats';

const raw = (id: string, extra: Record<string, unknown> = {}) => ({
  id, data: () => ({ userId: 'u1', type: 'Swim', movingTime: 2400, date: '2026-09-01', ...extra }),
});

describe('complete activity history read', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_E2E_MODE', 'false');
    fixtures.auth.currentUser = { uid: 'u1' };
    fixtures.fetchWorkoutHistoryPage.mockReset().mockResolvedValue({ workouts: [], nextCursor: null });
    fixtures.getDocsFromServer.mockReset().mockResolvedValue({ docs: [] });
  });

  it('reads 601 manual activities across three pages, including equal-date rows', async () => {
    const docs = Array.from({ length: 601 }, (_, i) => raw(`swim-${i}`));
    fixtures.getDocsFromServer.mockResolvedValueOnce({ docs: docs.slice(0, 250) })
      .mockResolvedValueOnce({ docs: docs.slice(250, 500) })
      .mockResolvedValueOnce({ docs: docs.slice(500) });
    const history = await fetchAllTimeActivityHistory('u1', { includeStrava: false });
    expect(history.activities).toHaveLength(601);
    expect(buildAllTimeActivityStats([], history.activities).cardioDurationSec).toBe(601 * 2400);
    expect(fixtures.getDocsFromServer).toHaveBeenCalledTimes(3);
    expect(fixtures.getDocsFromServer.mock.calls[1][0].constraints).toContainEqual({ kind: 'cursor', cursor: docs[249] });
    expect(fixtures.getDocsFromServer.mock.calls[2][0].constraints).toContainEqual({ kind: 'cursor', cursor: docs[499] });
    expect(fixtures.getDocsFromServer.mock.calls[0][0]).toEqual({ path: 'manual_activities', constraints: [
      { kind: 'where', args: ['userId', '==', 'u1'] },
      { kind: 'orderBy', args: ['date', 'desc'] }, { kind: 'limit', size: 250 },
    ] });
  });

  it('bounds both strength and cardio queries to the selected week, preserving bounds on every page', async () => {
    fixtures.fetchWorkoutHistoryPage.mockResolvedValueOnce({ workouts: [], nextCursor: { date: '2025-01-06', id: 'tail' } })
      .mockResolvedValueOnce({ workouts: [], nextCursor: null });
    fixtures.getDocsFromServer.mockResolvedValueOnce({ docs: Array.from({ length: 250 }, (_, i) => raw(`old-${i}`, { date: '2025-01-06' })) })
      .mockResolvedValueOnce({ docs: [raw('last-old', { date: '2025-01-06' })] });
    const history = await fetchWeekActivityHistory('u1', { includeStrava: false, fromDate: '2025-01-06', toDate: '2025-01-12' });
    expect(history.activities).toHaveLength(251);
    for (const [, options] of fixtures.fetchWorkoutHistoryPage.mock.calls) {
      expect(options).toMatchObject({ fromDate: '2025-01-06', toDate: '2025-01-12', source: 'server' });
    }
    for (const [request] of fixtures.getDocsFromServer.mock.calls) {
      expect(request.constraints).toContainEqual({ kind: 'where', args: ['date', '>=', '2025-01-06'] });
      expect(request.constraints).toContainEqual({ kind: 'where', args: ['date', '<=', '2025-01-12'] });
    }
  });

  it('advances from the raw tail of a wholly malformed page and excludes foreign documents', async () => {
    const malformed = Array.from({ length: 250 }, (_, i) => raw(`broken-${i}`, { type: null }));
    fixtures.getDocsFromServer.mockResolvedValueOnce({ docs: malformed })
      .mockResolvedValueOnce({ docs: [raw('owner'), raw('foreign', { userId: 'u2' })] });
    const history = await fetchAllTimeActivityHistory('u1', { includeStrava: false });
    expect(history.activities.map((activity) => activity.id)).toEqual(['owner']);
    expect(fixtures.getDocsFromServer.mock.calls[1][0].constraints).toContainEqual({ kind: 'cursor', cursor: malformed[249] });
  });

  it('uses the complete existing strength cursor read, with a server-only source', async () => {
    const cursor = { date: '2026-01-01', id: 'tail' };
    fixtures.fetchWorkoutHistoryPage.mockResolvedValueOnce({ workouts: [], nextCursor: cursor })
      .mockResolvedValueOnce({ workouts: [], nextCursor: null });
    await fetchAllTimeActivityHistory('u1', { includeStrava: false });
    expect(fixtures.fetchWorkoutHistoryPage).toHaveBeenNthCalledWith(1, 'u1', { pageSize: 250, cursor: null, source: 'server' });
    expect(fixtures.fetchWorkoutHistoryPage).toHaveBeenNthCalledWith(2, 'u1', { pageSize: 250, cursor, source: 'server' });
  });

  it('queries Strava only when included and retains only aggregate input fields', async () => {
    fixtures.getDocsFromServer.mockImplementation(async ({ path }: { path: string }) => ({ docs: [raw(path, { averageHeartrate: 170, stravaId: 42 })] }));
    const history = await fetchAllTimeActivityHistory('u1', { includeStrava: true });
    expect(history.activities.map((activity) => activity.source)).toEqual(['manual', 'strava']);
    expect(history.activities.every((activity) => !('averageHeartrate' in activity))).toBe(true);
    expect(fixtures.getDocsFromServer.mock.calls.map(([q]) => q.path)).toEqual(['manual_activities', 'strava_activities']);
  });

  it.each([null, { uid: 'u2' }])('rejects logout/account change before IO: %s', async (owner) => {
    fixtures.auth.currentUser = owner;
    await expect(fetchAllTimeActivityHistory('u1', { includeStrava: true })).rejects.toThrow('history-owner-changed');
    expect(fixtures.getDocsFromServer).not.toHaveBeenCalled();
    expect(fixtures.fetchWorkoutHistoryPage).not.toHaveBeenCalled();
  });

  it.each([null, { uid: 'u2' }])('discards a delayed page after logout/account change: %s', async (owner) => {
    let resolve!: (value: unknown) => void;
    fixtures.getDocsFromServer.mockReturnValue(new Promise((done) => { resolve = done; }));
    const pending = fetchAllTimeActivityHistory('u1', { includeStrava: false });
    const rejected = expect(pending).rejects.toThrow('history-owner-changed');
    fixtures.auth.currentUser = owner;
    resolve({ docs: Array.from({ length: 250 }, (_, i) => raw(`${i}`)) });
    await rejected;
    expect(fixtures.getDocsFromServer).toHaveBeenCalledTimes(1);
  });

  it('stops paging when the sheet closes and surfaces server/offline failure instead of partial totals', async () => {
    const controller = new AbortController();
    fixtures.getDocsFromServer.mockImplementationOnce(async () => {
      controller.abort();
      return { docs: Array.from({ length: 250 }, (_, i) => raw(`${i}`)) };
    });
    await expect(fetchAllTimeActivityHistory('u1', { includeStrava: false, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fixtures.getDocsFromServer).toHaveBeenCalledTimes(1);
    fixtures.getDocsFromServer.mockRejectedValueOnce(new Error('offline'));
    await expect(fetchAllTimeActivityHistory('u1', { includeStrava: false })).rejects.toThrow('offline');
  });

  it('has deployed query indexes for userId and descending date on both collections', () => {
    const indexes = JSON.parse(readFileSync('firestore.indexes.json', 'utf8')).indexes;
    for (const collectionGroup of ['manual_activities', 'strava_activities']) {
      expect(indexes).toContainEqual({ collectionGroup, queryScope: 'COLLECTION', fields: [
        { fieldPath: 'userId', order: 'ASCENDING' }, { fieldPath: 'date', order: 'DESCENDING' },
      ] });
    }
  });
});
