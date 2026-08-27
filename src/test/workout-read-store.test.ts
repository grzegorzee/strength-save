import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWorkoutReadSnapshot, retryMeasurementReads, subscribeWorkoutReads } from '@/lib/workout-read-store';
import { reportClientError } from '@/lib/error-telemetry';

type SnapshotHandler = (snapshot: {
  docs: { id: string; data: () => Record<string, unknown> }[];
  metadata: { fromCache: boolean };
}) => void;

type ErrorHandler = (err: Error) => void;

const snapshotHandlers: SnapshotHandler[] = [];
// Kolejność rejestracji jak w startStore: [0] = workouts, [1] = measurements.
const errorHandlers: ErrorHandler[] = [];

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn(async () => undefined) }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'collection'),
  documentId: vi.fn(() => '__name__'),
  getDocs: vi.fn(async () => ({ docs: [] })),
  limit: vi.fn(() => 'limit'),
  onSnapshot: vi.fn((query: unknown, onNext: SnapshotHandler, onError: ErrorHandler) => {
    snapshotHandlers.push(onNext);
    errorHandlers.push(onError);
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
    docs: [{ id: 'w-1', data: () => ({ userId: 'user-1', dayId: 'day-1', date: '2026-07-03', exercises: [], revision: 5 }) }],
    metadata: { fromCache },
  });
};

describe('workout read store cache provenance', () => {
  beforeEach(() => {
    snapshotHandlers.length = 0;
    errorHandlers.length = 0;
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

  it('uszkodzony dokument odpada z hydracji, poprawne zostają (P0)', () => {
    const unsubscribe = subscribeWorkoutReads('user-1', () => undefined);
    snapshotHandlers[0]({
      docs: [
        { id: 'w-ok', data: () => ({ userId: 'user-1', dayId: 'day-1', date: '2026-07-03', exercises: [], completed: true }) },
        { id: 'w-bad-date', data: () => ({ userId: 'user-1', dayId: 'day-1', date: 'wczoraj', exercises: [] }) },
        { id: 'w-bad-shape', data: () => ({ userId: 'user-1' }) },
      ],
      metadata: { fromCache: false },
    });

    const snapshot = getWorkoutReadSnapshot('user-1');
    expect(snapshot.workouts.map(w => w.id)).toEqual(['w-ok']);
    unsubscribe();
  });
});

// Bug 40: błąd listenera pomiarów kończył się na console.error — snapshot bez
// error (cicha degradacja: puste Pomiary/Analityka bez informacji), a żaden
// z listenerów nie zostawiał śladu w client_errors. Fix symetryczny: emit(error)
// dla pomiarów + reportClientError w OBU callbackach błędu.
describe('błędy listenerów: snapshot.error + telemetria (bug 40)', () => {
  beforeEach(() => {
    snapshotHandlers.length = 0;
    errorHandlers.length = 0;
    vi.clearAllMocks();
  });

  // Osobne userId per test: assertion throw przed unsubscribe zostawiłby store
  // 'user-1' z aktywnym listenerem i kolejny subscribe nic by nie rejestrował.
  it('błąd listenera pomiarów emituje error do snapshotu i raportuje telemetrię', () => {
    const unsubscribe = subscribeWorkoutReads('user-err-m', () => undefined);
    errorHandlers[1](new Error('permission-denied'));

    const snapshot = getWorkoutReadSnapshot('user-err-m');
    expect(snapshot.error).toBe('permission-denied');
    // isLoaded otwiera wyłącznie listener treningów (sukces LUB jego błąd) —
    // błąd pomiarów nie może udawać "dane gotowe".
    expect(snapshot.isLoaded).toBe(false);
    expect(reportClientError).toHaveBeenCalledWith('user-err-m', expect.objectContaining({
      code: 'listener-error',
      phase: 'other',
      detail: expect.stringContaining('measurements-listener'),
    }));
    unsubscribe();
  });

  it('retry ponownie otwiera listener i usuwa błąd dopiero po udanym snapshotcie', () => {
    const unsubscribe = subscribeWorkoutReads('user-retry-m', () => undefined);
    errorHandlers[1](new Error('offline'));

    retryMeasurementReads('user-retry-m');

    expect(snapshotHandlers).toHaveLength(3);
    expect(getWorkoutReadSnapshot('user-retry-m').measurementError).toBe('offline');

    snapshotHandlers[2]({
      docs: [{ id: 'm-1', data: () => ({ userId: 'user-retry-m', date: '2026-08-27', weight: 80 }) }],
      metadata: { fromCache: false },
    });

    const snapshot = getWorkoutReadSnapshot('user-retry-m');
    expect(snapshot.measurements.map(measurement => measurement.id)).toEqual(['m-1']);
    expect(snapshot.measurementError).toBeNull();
    unsubscribe();
  });

  it('błąd listenera treningów: isLoaded+error jak dotąd, dodatkowo telemetria', () => {
    const unsubscribe = subscribeWorkoutReads('user-err-w', () => undefined);
    errorHandlers[0](new Error('backend-down'));

    const snapshot = getWorkoutReadSnapshot('user-err-w');
    expect(snapshot.isLoaded).toBe(true);
    expect(snapshot.error).toBe('backend-down');
    expect(reportClientError).toHaveBeenCalledWith('user-err-w', expect.objectContaining({
      code: 'listener-error',
      phase: 'other',
      detail: expect.stringContaining('workouts-listener'),
    }));
    unsubscribe();
  });
});
