import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MEASUREMENT_LISTENER_LIMIT,
  LATEST_MEASUREMENTS_PROBE,
  WORKOUT_LISTENER_LIMIT,
  RECENT_WORKOUTS_LIMIT,
  effectiveMeasurementTier,
  measurementLimitForTier,
  effectiveWorkoutTier,
  workoutLimitForTier,
  selectLatestMeasurement,
  subscribeWorkoutReads,
  getWorkoutReadSnapshot,
} from '@/lib/workout-read-store';
import type { BodyMeasurement } from '@/types';

// Z213: pomiary per ekran. Dashboard/WorkoutDay potrzebują tylko najnowszego
// pomiaru (sonda limit 25 zamiast 365), globalne komponenty sync żadnego,
// a pełna lista zostaje na ekranach Pomiary/Analityka. Wyniki UI bez zmian:
// selekcja najnowszego pomiaru z wartościami działa identycznie na sondzie.

type SnapshotHandler = (snapshot: {
  docs: { id: string; data: () => Record<string, unknown> }[];
  metadata: { fromCache: boolean };
}) => void;

const snapshotHandlers: SnapshotHandler[] = [];
const unsubscribeSpies: Array<ReturnType<typeof vi.fn>> = [];
const limitCalls: number[] = [];

vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => 'collection'),
  documentId: vi.fn(() => '__name__'),
  getDocs: vi.fn(async () => ({ docs: [] })),
  limit: vi.fn((value: number) => {
    limitCalls.push(value);
    return 'limit';
  }),
  onSnapshot: vi.fn((query: unknown, onNext: SnapshotHandler) => {
    snapshotHandlers.push(onNext);
    const unsubscribe = vi.fn();
    unsubscribeSpies.push(unsubscribe);
    return unsubscribe;
  }),
  orderBy: vi.fn(() => 'orderBy'),
  query: vi.fn(() => 'query'),
  startAfter: vi.fn(() => 'startAfter'),
  where: vi.fn(() => 'where'),
}));

const measurementDoc = (id: string, date: string, weight?: number) => ({
  id,
  data: () => ({ id, userId: 'user-1', date, ...(weight !== undefined ? { weight } : {}) }),
});

describe('Z213 — tiery listenera pomiarów', () => {
  beforeEach(() => {
    snapshotHandlers.length = 0;
    unsubscribeSpies.length = 0;
    limitCalls.length = 0;
    vi.clearAllMocks();
  });

  it('effectiveMeasurementTier to maksimum aktywnych subskrybentów', () => {
    expect(effectiveMeasurementTier([])).toBe('none');
    expect(effectiveMeasurementTier(['none', 'none'])).toBe('none');
    expect(effectiveMeasurementTier(['none', 'latest'])).toBe('latest');
    expect(effectiveMeasurementTier(['latest', 'full', 'none'])).toBe('full');
  });

  it('limity per tier: none=0, latest=sonda, full=365', () => {
    expect(measurementLimitForTier('none')).toBe(0);
    expect(measurementLimitForTier('latest')).toBe(LATEST_MEASUREMENTS_PROBE);
    expect(measurementLimitForTier('full')).toBe(MEASUREMENT_LISTENER_LIMIT);
  });

  it('subskrybent none nie uruchamia listenera pomiarów w ogóle', () => {
    const unsubscribe = subscribeWorkoutReads('user-1', () => undefined, 'none');
    // tylko workouts listener
    expect(snapshotHandlers).toHaveLength(1);
    expect(limitCalls).not.toContain(MEASUREMENT_LISTENER_LIMIT);
    expect(limitCalls).not.toContain(LATEST_MEASUREMENTS_PROBE);
    unsubscribe();
  });

  it('subskrybent latest dostaje sondę, dołączenie full restartuje listener na 365', () => {
    const first = subscribeWorkoutReads('user-1', () => undefined, 'latest');
    expect(snapshotHandlers).toHaveLength(2); // workouts + measurements(sonda)
    expect(limitCalls).toContain(LATEST_MEASUREMENTS_PROBE);

    const second = subscribeWorkoutReads('user-1', () => undefined, 'full');
    expect(snapshotHandlers).toHaveLength(3); // restart z pełnym limitem
    expect(unsubscribeSpies[1]).toHaveBeenCalled(); // stary listener pomiarów zamknięty
    expect(limitCalls).toContain(MEASUREMENT_LISTENER_LIMIT);

    second();
    first();
  });

  it('snapshot pomiarów z sondy trafia do store jak dotychczas', () => {
    const unsubscribe = subscribeWorkoutReads('user-1', () => undefined, 'latest');
    snapshotHandlers[1]({
      docs: [measurementDoc('m-2', '2026-08-09', 82), measurementDoc('m-1', '2026-08-01', 83)],
      metadata: { fromCache: false },
    });
    expect(getWorkoutReadSnapshot('user-1').measurements.map(m => m.id)).toEqual(['m-2', 'm-1']);
    unsubscribe();
  });
});

describe('Z216 — tiery listenera treningów', () => {
  beforeEach(() => {
    snapshotHandlers.length = 0;
    unsubscribeSpies.length = 0;
    limitCalls.length = 0;
    vi.clearAllMocks();
  });

  it('effectiveWorkoutTier to maksimum aktywnych subskrybentów', () => {
    expect(effectiveWorkoutTier([])).toBe('recent');
    expect(effectiveWorkoutTier(['recent', 'recent'])).toBe('recent');
    expect(effectiveWorkoutTier(['recent', 'full'])).toBe('full');
  });

  it('limity per tier: recent=120, full=500', () => {
    expect(workoutLimitForTier('recent')).toBe(RECENT_WORKOUTS_LIMIT);
    expect(workoutLimitForTier('full')).toBe(WORKOUT_LISTENER_LIMIT);
    expect(RECENT_WORKOUTS_LIMIT).toBe(120);
  });

  it('subskrybent recent dostaje okno 120; dołączenie full restartuje listener na 500', () => {
    const first = subscribeWorkoutReads('user-1', () => undefined, 'none', 'recent');
    expect(limitCalls).toContain(RECENT_WORKOUTS_LIMIT);
    expect(limitCalls).not.toContain(WORKOUT_LISTENER_LIMIT);

    const second = subscribeWorkoutReads('user-1', () => undefined, 'none', 'full');
    expect(limitCalls).toContain(WORKOUT_LISTENER_LIMIT);
    expect(unsubscribeSpies[0]).toHaveBeenCalled(); // stary listener workouts zamknięty

    second();
    first();
  });

  it('domyślny tier bez argumentu pozostaje full (bez regresji dla nietkniętych)', () => {
    const unsubscribe = subscribeWorkoutReads('user-1', () => undefined);
    expect(limitCalls).toContain(WORKOUT_LISTENER_LIMIT);
    unsubscribe();
  });
});

describe('Z213 — selectLatestMeasurement (wyniki UI bez zmian)', () => {
  const empty = (id: string, date: string): BodyMeasurement => ({ id, userId: 'u', date } as BodyMeasurement);
  const withWeight = (id: string, date: string): BodyMeasurement => ({ id, userId: 'u', date, weight: 82 } as BodyMeasurement);

  it('pomija puste najnowsze wpisy i wybiera pierwszy z wartościami', () => {
    const list = [empty('m-3', '2026-08-10'), empty('m-2', '2026-08-09'), withWeight('m-1', '2026-08-01')];
    expect(selectLatestMeasurement(list)?.id).toBe('m-1');
  });

  it('sonda 25 daje ten sam wynik co pełna lista (wartościowy wpis w zasięgu sondy)', () => {
    const emptyHead = Array.from({ length: 5 }, (_, i) => empty(`e-${i}`, `2026-08-0${9 - i}`));
    const full = [...emptyHead, withWeight('m-hit', '2026-07-30'), ...Array.from({ length: 300 }, (_, i) => withWeight(`old-${i}`, '2026-01-01'))];
    const probe = full.slice(0, LATEST_MEASUREMENTS_PROBE);
    expect(selectLatestMeasurement(probe)?.id).toBe(selectLatestMeasurement(full)?.id);
  });

  it('same puste wpisy: fallback na najnowszy (jak dotychczas)', () => {
    const list = [empty('m-2', '2026-08-10'), empty('m-1', '2026-08-01')];
    expect(selectLatestMeasurement(list)?.id).toBe('m-2');
    expect(selectLatestMeasurement([])).toBeUndefined();
  });
});
