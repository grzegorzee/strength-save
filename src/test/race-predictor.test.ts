import { describe, it, expect } from 'vitest';
import { predictRaceTime, findBestEffort, getRacePredictions } from '@/lib/race-predictor';
import type { StravaActivity } from '@/types/strava';

const makeRun = (name: string, distanceM: number, movingTimeSec: number): StravaActivity => ({
  id: `s-${name}`, userId: 'u1', stravaId: 1, name, type: 'Run',
  date: '2026-01-01', distance: distanceM, movingTime: movingTimeSec,
  averageSpeed: distanceM / movingTimeSec, stravaUrl: '', syncedAt: '',
});

describe('predictRaceTime', () => {
  it('5K 25min → 10K ≈ 52min', () => {
    const result = predictRaceTime(5000, 25 * 60, 10000);
    // Riegel: 1500 * 2^1.06 = 1500 * 2.0849 ≈ 3127s ≈ 52:07
    expect(result).toBeGreaterThan(51 * 60);
    expect(result).toBeLessThan(53 * 60);
  });

  it('10K 50min → HM ≈ 1:49:xx', () => {
    const result = predictRaceTime(10000, 50 * 60, 21097);
    // ~6563s = ~109min = ~1:49
    expect(result).toBeGreaterThan(105 * 60);
    expect(result).toBeLessThan(115 * 60);
  });

  it('marathon from 5K input → sensible result 3-5h', () => {
    const result = predictRaceTime(5000, 25 * 60, 42195);
    expect(result).toBeGreaterThan(3 * 3600);
    expect(result).toBeLessThan(5 * 3600);
  });
});

describe('findBestEffort', () => {
  it('finds fastest in range', () => {
    const activities = [
      makeRun('Slow 5K', 5100, 30 * 60),
      makeRun('Fast 5K', 5000, 22 * 60),
    ];
    const best = findBestEffort(activities, 4500, 5500);
    expect(best?.name).toBe('Fast 5K');
  });

  it('returns null when no activities in range', () => {
    const activities = [makeRun('Long run', 15000, 90 * 60)];
    const best = findBestEffort(activities, 4500, 5500);
    expect(best).toBeNull();
  });
});

describe('getRacePredictions', () => {
  it('generates predictions from 5K effort', () => {
    const activities = [makeRun('Parkrun', 5000, 25 * 60)];
    const predictions = getRacePredictions(activities);
    expect(predictions).toHaveLength(4);
    expect(predictions[0].distanceLabel).toBe('5K');
    expect(predictions[3].distanceLabel).toBe('Maraton');
  });

  it('returns empty for no runs', () => {
    expect(getRacePredictions([])).toEqual([]);
  });
});
