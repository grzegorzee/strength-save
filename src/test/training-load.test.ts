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
