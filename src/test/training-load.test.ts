import { describe, it, expect } from 'vitest';
import { calculateTRIMP, computeDailyLoad, computeFitnessFatigue } from '@/lib/training-load';
import type { StravaActivity } from '@/types/strava';

describe('calculateTRIMP', () => {
  it('calculates known values (60min, avgHR 150, rest 60, max 190)', () => {
    const trimp = calculateTRIMP(150, 3600, 60, 190);
    // HRr = (150-60)/(190-60) = 90/130 ≈ 0.692
    // TRIMP = 60 × 0.692 × 0.64 × e^(1.92×0.692) ≈ 60 × 0.692 × 0.64 × 3.78 ≈ 100
    expect(trimp).toBeGreaterThan(80);
    expect(trimp).toBeLessThan(120);
  });

  it('avgHR <= restHR → 0', () => {
    expect(calculateTRIMP(50, 3600, 60, 190)).toBe(0);
    expect(calculateTRIMP(60, 3600, 60, 190)).toBe(0);
  });

  it('no duration → 0', () => {
    expect(calculateTRIMP(150, 0, 60, 190)).toBe(0);
  });

  it('clamps heart rate above max and rejects non-finite input', () => {
    expect(calculateTRIMP(250, 3600, 60, 190)).toBe(calculateTRIMP(190, 3600, 60, 190));
    expect(calculateTRIMP(Number.NaN, 3600, 60, 190)).toBe(0);
  });
});

describe('computeDailyLoad', () => {
  it('sums TRIMP per day', () => {
    const activities: StravaActivity[] = [
      {
        id: 's1', userId: 'u1', stravaId: 1, name: 'Morning Run', type: 'Run',
        date: '2026-01-01', averageHeartrate: 150, movingTime: 3600,
        stravaUrl: '', syncedAt: '',
      },
      {
        id: 's2', userId: 'u1', stravaId: 2, name: 'Evening Run', type: 'Run',
        date: '2026-01-01', averageHeartrate: 140, movingTime: 1800,
        stravaUrl: '', syncedAt: '',
      },
    ];
    const daily = computeDailyLoad(activities, 60, 190);
    expect(daily).toHaveLength(1);
    expect(daily[0].trimp).toBeGreaterThan(0);
  });
});

describe('computeFitnessFatigue', () => {
  it('CTL rises slower than ATL', () => {
    const daily = [
      { date: '2026-01-01', trimp: 100 },
      { date: '2026-01-02', trimp: 100 },
      { date: '2026-01-03', trimp: 100 },
      { date: '2026-01-04', trimp: 100 },
      { date: '2026-01-05', trimp: 100 },
      { date: '2026-01-06', trimp: 100 },
      { date: '2026-01-07', trimp: 100 },
    ];
    const result = computeFitnessFatigue(daily, 7);
    const last = result[result.length - 1];
    expect(last.atl).toBeGreaterThan(last.ctl);
  });

  it('TSB = CTL - ATL', () => {
    const daily = [
      { date: '2026-01-01', trimp: 100 },
      { date: '2026-01-02', trimp: 50 },
    ];
    const result = computeFitnessFatigue(daily, 2);
    result.forEach(point => {
      expect(point.tsb).toBeCloseTo(point.ctl - point.atl, 1);
    });
  });

  it('empty → []', () => {
    expect(computeFitnessFatigue([])).toEqual([]);
  });
});

describe('computeDailyLoad — perceivedIntensity bez HR (Z113)', () => {
  const base = {
    id: 'm1', userId: 'u1', stravaId: 0, name: '', stravaUrl: '', syncedAt: '',
  };

  it('wpis bez HR z intensywnością dostaje reprezentatywny %HRmax (easy/moderate/hard = 60/75/88)', () => {
    const activities = [
      { ...base, id: 'm-easy', type: 'Treadmill', date: '2026-07-10', movingTime: 3600, perceivedIntensity: 'easy' },
      { ...base, id: 'm-hard', type: 'HIIT', date: '2026-07-11', movingTime: 3600, perceivedIntensity: 'hard' },
    ] as never[];
    const load = computeDailyLoad(activities, 60, 190);
    expect(load).toHaveLength(2);
    const easy = load.find((d) => d.date === '2026-07-10')!.trimp;
    const hard = load.find((d) => d.date === '2026-07-11')!.trimp;
    // easy: avgHR=114 (60% z 190); hard: avgHR=167.2 (88%) — hard >> easy.
    expect(easy).toBeGreaterThan(0);
    expect(hard).toBeGreaterThan(easy * 2);
  });

  it('realny HR wygrywa z intensywnością; bez HR i bez intensywności => pominięte', () => {
    const activities = [
      { ...base, id: 'a1', type: 'Run', date: '2026-07-12', movingTime: 3600, averageHeartrate: 150, perceivedIntensity: 'easy' },
      { ...base, id: 'a2', type: 'Walk', date: '2026-07-13', movingTime: 3600 },
    ] as never[];
    const load = computeDailyLoad(activities, 60, 190);
    expect(load).toHaveLength(1);
    const withHr = load.find((d) => d.date === '2026-07-12')!.trimp;
    expect(withHr).toBe(calculateTRIMP(150, 3600, 60, 190));
  });
});
