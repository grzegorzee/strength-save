import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWorkoutReadSnapshot, subscribeWorkoutReads } from '@/lib/workout-read-store';

type SnapshotHandler = (snapshot: {
  docs: { id: string; data: () => Record<string, unknown> }[];
  metadata: { fromCache: boolean };
}) => void;

const snapshotHandlers: SnapshotHandler[] = [];

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'collection'),
  documentId: vi.fn(() => '__name__'),
  getDocs: vi.fn(async () => ({ docs: [] })),
  limit: vi.fn(() => 'limit'),
  onSnapshot: vi.fn((query: unknown, onNext: SnapshotHandler) => {
    snapshotHandlers.push(onNext);
    return () => undefined;
  }),
  orderBy: vi.fn(() => 'orderBy'),
  query: vi.fn(() => 'query'),
  startAfter: vi.fn(() => 'startAfter'),
  where: vi.fn(() => 'where'),
}));

const emitWorkoutsSnapshot = (fromCache: boolean) => {
  // Pierwszy zarejestrowany handler to listener kolekcji workouts.
  snapshotHandlers[0]({
    docs: [{ id: 'w-1', data: () => ({ userId: 'user-1', date: '2026-07-03', revision: 5 }) }],
    metadata: { fromCache },
  });
};

describe('workout read store cache provenance', () => {
  beforeEach(() => {
    snapshotHandlers.length = 0;
    vi.clearAllMocks();
  });

  it('snapshot z cache jest oznaczony workoutsFromCache=true (nie seeduje baseline)', () => {
    const unsubscribe = subscribeWorkoutReads('user-1', () => undefined);
    emitWorkoutsSnapshot(true);

    const snapshot = getWorkoutReadSnapshot('user-1');
    expect(snapshot.workouts).toHaveLength(1);
    expect(snapshot.workoutsFromCache).toBe(true);
    unsubscribe();
  });

  it('snapshot z serwera zdejmuje flagę workoutsFromCache', () => {
    const unsubscribe = subscribeWorkoutReads('user-1', () => undefined);
    emitWorkoutsSnapshot(true);
    emitWorkoutsSnapshot(false);

    expect(getWorkoutReadSnapshot('user-1').workoutsFromCache).toBe(false);
    unsubscribe();
  });

  it('przed pierwszym snapshotem traktuje dane jako cache', () => {
    const unsubscribe = subscribeWorkoutReads('user-1', () => undefined);
    expect(getWorkoutReadSnapshot('user-1').workoutsFromCache).toBe(true);
    unsubscribe();
  });
});
