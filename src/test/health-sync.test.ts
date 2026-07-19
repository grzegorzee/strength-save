import { describe, expect, it } from 'vitest';
import {
  mapCardioToHealth,
  mapWorkoutToHealth,
  newerHealthWeight,
  shouldSyncWorkout,
  type HealthSyncState,
} from '@/lib/health-sync';
import type { WorkoutSession, BodyMeasurement } from '@/types';
import type { ManualActivity } from '@/lib/manual-activity';

const workout = (over: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id: 'w1', userId: 'u1', dayId: 'd1', date: '2026-07-13', completed: true,
  startedAt: 1780000000000, completedAt: 1780003600000, durationSec: 3600,
  exercises: [{ exerciseId: 'e1', sets: [{ reps: 5, weight: 100, completed: true }] }],
  ...over,
});

describe('mapWorkoutToHealth (Z116)', () => {
  it('trening siłowy: typ strength, start/koniec ze znaczników', () => {
    const mapped = mapWorkoutToHealth(workout())!;
    expect(mapped.activityType).toBe('strength');
    expect(mapped.startMs).toBe(1780000000000);
    expect(mapped.endMs).toBe(1780003600000);
    expect(mapped.calories).toBeUndefined();
  });

  it('fallback bez znaczników: date 12:00 + durationSec', () => {
    const mapped = mapWorkoutToHealth(workout({ startedAt: undefined, completedAt: undefined }))!;
    const start = new Date(mapped.startMs);
    expect(start.getHours()).toBe(12);
    expect(mapped.endMs - mapped.startMs).toBe(3600 * 1000);
  });

  it('brak czasu (ani znaczników, ani durationSec) => null', () => {
    expect(mapWorkoutToHealth(workout({ startedAt: undefined, completedAt: undefined, durationSec: undefined }))).toBeNull();
  });

  it('nieukończony => null', () => {
    expect(mapWorkoutToHealth(workout({ completed: false }))).toBeNull();
  });
});

describe('mapCardioToHealth (Z116)', () => {
  const cardio = (type: ManualActivity['type'], over: Partial<ManualActivity> = {}): ManualActivity => ({
    id: 'm1', userId: 'u1', type, date: '2026-07-14', movingTime: 1800, createdAt: 1, ...over,
  });

  it('mapuje typy X15A na typy Health', () => {
    expect(mapCardioToHealth(cardio('Run'))!.activityType).toBe('running');
    expect(mapCardioToHealth(cardio('Treadmill'))!.activityType).toBe('running');
    expect(mapCardioToHealth(cardio('Ride'))!.activityType).toBe('cycling');
    expect(mapCardioToHealth(cardio('IndoorRide'))!.activityType).toBe('cycling');
    expect(mapCardioToHealth(cardio('Walk'))!.activityType).toBe('walking');
    expect(mapCardioToHealth(cardio('Hike'))!.activityType).toBe('hiking');
    expect(mapCardioToHealth(cardio('Swim'))!.activityType).toBe('swimming');
    expect(mapCardioToHealth(cardio('JumpRope'))!.activityType).toBe('jumpRope');
    expect(mapCardioToHealth(cardio('HIIT'))!.activityType).toBe('hiit');
    expect(mapCardioToHealth(cardio('Other'))!.activityType).toBe('other');
  });

  it('czas: date 12:00 + movingTime; kalorie tylko gdy znane', () => {
    const mapped = mapCardioToHealth(cardio('Run', { calories: 400 }))!;
    expect(mapped.endMs - mapped.startMs).toBe(1800 * 1000);
    expect(mapped.calories).toBe(400);
  });
});

describe('shouldSyncWorkout (Z116) — idempotencja', () => {
  const state: HealthSyncState = { w1: { syncedAt: 100, endMs: 1780003600000 } };

  it('brak wpisu w stanie => sync', () => {
    expect(shouldSyncWorkout('w2', 1780003600000, state)).toBe(true);
  });

  it('zsynchronizowany z tym samym endMs => NIE syncuj (edycja bez zmiany czasu)', () => {
    expect(shouldSyncWorkout('w1', 1780003600000, state)).toBe(false);
  });

  it('endMs się zmienił => sync ponowny', () => {
    expect(shouldSyncWorkout('w1', 1780007200000, state)).toBe(true);
  });
});

describe('newerHealthWeight (Z116) — propozycja wagi', () => {
  const measurements: BodyMeasurement[] = [
    { id: 'm1', userId: 'u1', date: '2026-07-10', weight: 74.0 },
    { id: 'm2', userId: 'u1', date: '2026-07-01', weight: 74.5 },
  ];

  it('nowsza i różna waga z Health => propozycja', () => {
    expect(newerHealthWeight({ kg: 73.2, date: '2026-07-15' }, measurements))
      .toEqual({ kg: 73.2, date: '2026-07-15' });
  });

  it('starsza niż nasz pomiar => brak', () => {
    expect(newerHealthWeight({ kg: 73.2, date: '2026-07-09' }, measurements)).toBeNull();
  });

  it('nowsza ale praktycznie ta sama wartość (<0.1 kg różnicy) => brak', () => {
    expect(newerHealthWeight({ kg: 74.04, date: '2026-07-15' }, measurements)).toBeNull();
  });

  it('brak naszych pomiarów => propozycja', () => {
    expect(newerHealthWeight({ kg: 80, date: '2026-07-15' }, [])).toEqual({ kg: 80, date: '2026-07-15' });
  });

  it('brak próbki Health => null', () => {
    expect(newerHealthWeight(null, measurements)).toBeNull();
  });
});
