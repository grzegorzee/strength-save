import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchWorkoutHistoryPage, WORKOUT_HISTORY_PAGE_SIZE } from '@/lib/workout-read-store';

// Z218: paginacja historii bez duplikatów i luk. Kursor liczy się z SUROWEGO
// snapshotu (ostatni dokument strony), więc uszkodzony dokument w środku strony
// jest odfiltrowany z wyników, ale NIE przerywa paginacji (P0 z X10).

interface FakeDoc { id: string; data: () => Record<string, unknown> }

const validDoc = (id: string, date: string): FakeDoc => ({
  id,
  data: () => ({ userId: 'u1', dayId: 'day-1', date, exercises: [], completed: true }),
});
const brokenDoc = (id: string): FakeDoc => ({
  id,
  data: () => ({ userId: 'u1' }), // brak date/dayId — sanitizer odrzuca
});

const pages: FakeDoc[][] = [];
const getDocsMock = vi.hoisted(() => vi.fn());
const startAfterCalls: unknown[][] = [];

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn(async () => undefined) }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'collection'),
  documentId: vi.fn(() => '__name__'),
  getDocs: getDocsMock,
  limit: vi.fn((n: number) => ({ type: 'limit', n })),
  onSnapshot: vi.fn(() => () => undefined),
  orderBy: vi.fn(() => 'orderBy'),
  query: vi.fn(() => 'query'),
  startAfter: vi.fn((...args: unknown[]) => {
    startAfterCalls.push(args);
    return 'startAfter';
  }),
  where: vi.fn(() => 'where'),
}));

describe('Z218 — fetchWorkoutHistoryPage: kursor bez duplikatów i luk', () => {
  beforeEach(() => {
    pages.length = 0;
    startAfterCalls.length = 0;
    getDocsMock.mockReset();
    getDocsMock.mockImplementation(async () => ({ docs: pages.shift() ?? [] }));
  });

  it('uszkodzony dokument w środku strony odpada z wyników, ale nie przerywa paginacji', async () => {
    const fullPage = [
      validDoc('w-1', '2026-08-09'),
      brokenDoc('w-broken'),
      ...Array.from({ length: WORKOUT_HISTORY_PAGE_SIZE - 2 }, (_, i) =>
        validDoc(`w-${i + 2}`, '2026-08-01')),
    ];
    pages.push(fullPage);

    const page = await fetchWorkoutHistoryPage('u1', {});
    // Wyniki: bez uszkodzonego, ale strona liczona po surowym snapshocie.
    expect(page.workouts).toHaveLength(WORKOUT_HISTORY_PAGE_SIZE - 1);
    expect(page.workouts.some(w => w.id === 'w-broken')).toBe(false);
    // Kursor ISTNIEJE (pełna surowa strona) — paginacja idzie dalej mimo odrzutu.
    expect(page.nextCursor).not.toBeNull();
  });

  it('dwie strony: kursor przekazany do startAfter, zero duplikatów między stronami', async () => {
    pages.push(Array.from({ length: WORKOUT_HISTORY_PAGE_SIZE }, (_, i) =>
      validDoc(`a-${i}`, '2026-08-05')));
    pages.push([validDoc('b-1', '2026-07-01'), validDoc('b-2', '2026-06-30')]);

    const first = await fetchWorkoutHistoryPage('u1', {});
    expect(first.nextCursor).toEqual({ date: '2026-08-05', id: `a-${WORKOUT_HISTORY_PAGE_SIZE - 1}` });

    const second = await fetchWorkoutHistoryPage('u1', { cursor: first.nextCursor });
    expect(startAfterCalls.at(-1)).toEqual(['2026-08-05', `a-${WORKOUT_HISTORY_PAGE_SIZE - 1}`]);
    const ids = new Set([...first.workouts, ...second.workouts].map(w => w.id));
    expect(ids.size).toBe(first.workouts.length + second.workouts.length); // brak duplikatów
    expect(second.nextCursor).toBeNull(); // niepełna strona kończy paginację
  });

  it('pusta historia: brak kursora, brak wyników, brak wyjątku', async () => {
    pages.push([]);
    const page = await fetchWorkoutHistoryPage('u1', {});
    expect(page.workouts).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });
});
