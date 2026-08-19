import { beforeEach, describe, expect, it, vi } from 'vitest';
import { doc, setDoc, writeBatch } from 'firebase/firestore';
import {
  badgeEventKey,
  countUnreadUserEvents,
  emitUserEvent,
  markAllUserEventsRead,
  planEventKey,
  prEventKey,
  userEventDocId,
  weekEventKey,
  type UserEvent,
} from '@/lib/user-events';

vi.mock('@/lib/firebase', () => ({ db: {} }));

const batchUpdate = vi.fn();
const batchCommit = vi.fn(async () => undefined);

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'user-events-collection'),
  doc: vi.fn((_db: unknown, _col: string, id: string) => `doc:${id}`),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  setDoc: vi.fn(async () => undefined),
  where: vi.fn(),
  writeBatch: vi.fn(() => ({ update: batchUpdate, commit: batchCommit })),
}));

const event = (over: Partial<UserEvent> = {}): UserEvent => ({
  v: 1,
  userId: 'u1',
  type: 'pr',
  key: 'pr-day-1-2026-08-19-bench-weight',
  payload: {},
  deepLink: null,
  createdAt: 1000,
  readAt: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('B-T6: user_events — idempotencja i kontrakt', () => {
  it('Watch, Garmin, drugi telefon, późny sync i edycja historii dają JEDEN klucz', () => {
    // Wszystkie źródła znają dayId+date+exerciseId — sessionId celowo nie
    // wchodzi do klucza (promocja provisional->remote by go zmieniła).
    const fromPhone = prEventKey('day-1', '2026-08-19', 'bench', 'weight');
    const fromWatchIngest = prEventKey('day-1', '2026-08-19', 'bench', 'weight');
    const fromLateSync = prEventKey('day-1', '2026-08-19', 'bench', 'weight');
    expect(new Set([fromPhone, fromWatchIngest, fromLateSync]).size).toBe(1);
    expect(userEventDocId('u1', fromPhone)).toBe('u1-pr-day-1-2026-08-19-bench-weight');
  });

  it('klucze pozostałych producentów są deterministyczne', () => {
    expect(badgeEventKey('tonnage', 10000)).toBe('badge-tonnage-10000');
    expect(weekEventKey('2026-08-10')).toBe('week-2026-08-10');
    expect(planEventKey('started', 'cycle-9')).toBe('plan-started-cycle-9');
  });

  it('emit zapisuje pełny dokument v1 pod deterministycznym id', async () => {
    await emitUserEvent('u1', {
      type: 'pr',
      key: prEventKey('day-1', '2026-08-19', 'bench', 'weight'),
      payload: { name: 'Wyciskanie', prType: 'weight', newValue: 105 },
      deepLink: '#/progress',
      createdAt: 1234,
    });
    expect(doc).toHaveBeenCalledWith({}, 'user_events', 'u1-pr-day-1-2026-08-19-bench-weight');
    expect(setDoc).toHaveBeenCalledWith('doc:u1-pr-day-1-2026-08-19-bench-weight', {
      v: 1,
      userId: 'u1',
      type: 'pr',
      key: 'pr-day-1-2026-08-19-bench-weight',
      payload: { name: 'Wyciskanie', prType: 'weight', newValue: 105 },
      deepLink: '#/progress',
      createdAt: 1234,
      readAt: null,
    });
  });

  it('odrzucona powtórna emisja (rules) nie rzuca — producer jest best-effort', async () => {
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('PERMISSION_DENIED'));
    await expect(emitUserEvent('u1', { type: 'pr', key: 'k', payload: {} })).resolves.toBeUndefined();
  });

  it('markAllRead aktualizuje TYLKO nieprzeczytane, jednym batchem, tylko readAt', async () => {
    const events = [
      event({ key: 'a', readAt: null }),
      event({ key: 'b', readAt: 500 }),
      event({ key: 'c', readAt: null }),
    ];
    await markAllUserEventsRead('u1', events);
    expect(writeBatch).toHaveBeenCalledTimes(1);
    expect(batchUpdate).toHaveBeenCalledTimes(2);
    expect(batchUpdate).toHaveBeenCalledWith('doc:u1-a', { readAt: expect.any(Number) });
    expect(batchUpdate).toHaveBeenCalledWith('doc:u1-c', { readAt: expect.any(Number) });
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it('markAllRead bez nieprzeczytanych nie tworzy batcha', async () => {
    await markAllUserEventsRead('u1', [event({ readAt: 500 })]);
    expect(writeBatch).not.toHaveBeenCalled();
  });

  it('countUnread liczy readAt === null', () => {
    expect(countUnreadUserEvents([
      event({ readAt: null }),
      event({ readAt: 1 }),
      event({ readAt: null }),
    ])).toBe(2);
  });
});
