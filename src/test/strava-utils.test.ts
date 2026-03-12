import { describe, it, expect } from 'vitest';
import type { StravaActivity } from '@/types/strava';
import {
  filterByYear,
  getAvailableYears,
  isPaceActivity,
  formatPaceFromSeconds,
  formatDurationShort,
  computeSummaryStats,
  computePaceTrendData,
  computeMonthlySummaries,
  computeWeeklyElevation,
  computeWeeklyCalories,
  detectCardioPRs,
} from '@/lib/strava-utils';

const makeActivity = (overrides: Partial<StravaActivity> = {}): StravaActivity => ({
  id: 'act-1',
  userId: 'user-1',
  stravaId: 12345,
  name: 'Morning Run',
  type: 'Run',
  date: '2026-03-10',
  distance: 5000,
  movingTime: 1500,
  averageSpeed: 3.33,
  averageHeartrate: 150,
  totalElevationGain: 50,
  calories: 400,
  stravaUrl: 'https://strava.com/1',
  syncedAt: '2026-03-10T10:00:00Z',
  ...overrides,
});

// ========================
// filterByYear
// ========================

describe('filterByYear', () => {
  const acts = [
    makeActivity({ id: '1', date: '2025-12-31' }),
    makeActivity({ id: '2', date: '2026-01-01' }),
    makeActivity({ id: '3', date: '2026-06-15' }),
  ];

  it('filters activities by year', () => {
    expect(filterByYear(acts, 2026)).toHaveLength(2);
    expect(filterByYear(acts, 2025)).toHaveLength(1);
  });

  it('returns all for "all"', () => {
    expect(filterByYear(acts, 'all')).toHaveLength(3);
  });

  it('handles boundary: Dec 31 vs Jan 1', () => {
    const result2025 = filterByYear(acts, 2025);
    expect(result2025[0].date).toBe('2025-12-31');
    const result2026 = filterByYear(acts, 2026);
    expect(result2026[0].date).toBe('2026-01-01');
  });

  it('returns empty for year with no activities', () => {
    expect(filterByYear(acts, 2020)).toHaveLength(0);
  });
});

// ========================
// getAvailableYears
// ========================

describe('getAvailableYears', () => {
  it('returns unique years sorted desc', () => {
    const acts = [
      makeActivity({ date: '2024-01-01' }),
      makeActivity({ date: '2025-06-01' }),
      makeActivity({ date: '2026-01-01' }),
      makeActivity({ date: '2025-12-01' }),
    ];
    expect(getAvailableYears(acts)).toEqual([2026, 2025, 2024]);
  });

  it('returns empty array for no activities', () => {
    expect(getAvailableYears([])).toEqual([]);
  });
});

// ========================
// formatPaceFromSeconds
// ========================

describe('formatPaceFromSeconds', () => {
  it('formats 323 as 5:23', () => {
    expect(formatPaceFromSeconds(323)).toBe('5:23');
  });

  it('formats 360 as 6:00', () => {
    expect(formatPaceFromSeconds(360)).toBe('6:00');
  });

  it('formats 301 as 5:01', () => {
    expect(formatPaceFromSeconds(301)).toBe('5:01');
  });
});

// ========================
// formatDurationShort
// ========================

describe('formatDurationShort', () => {
  it('formats without hours', () => {
    expect(formatDurationShort(1845)).toBe('30:45');
  });

  it('formats with hours', () => {
    expect(formatDurationShort(5445)).toBe('1:30:45');
  });

  it('pads seconds', () => {
    expect(formatDurationShort(62)).toBe('1:02');
  });
});

// ========================
// isPaceActivity
// ========================

describe('isPaceActivity', () => {
  it('returns true for Run, Walk, Hike', () => {
    expect(isPaceActivity(makeActivity({ type: 'Run' }))).toBe(true);
    expect(isPaceActivity(makeActivity({ type: 'Walk' }))).toBe(true);
    expect(isPaceActivity(makeActivity({ type: 'Hike' }))).toBe(true);
  });

  it('returns false for Ride, Swim', () => {
    expect(isPaceActivity(makeActivity({ type: 'Ride' }))).toBe(false);
    expect(isPaceActivity(makeActivity({ type: 'Swim' }))).toBe(false);
  });
});

// ========================
// computeSummaryStats
// ========================

describe('computeSummaryStats', () => {
  it('returns null for empty array', () => {
    expect(computeSummaryStats([])).toBeNull();
  });

  it('computes all stats correctly', () => {
    const acts = [
      makeActivity({ distance: 10000, movingTime: 3000, calories: 600, totalElevationGain: 100, averageSpeed: 3.33, averageHeartrate: 150 }),
      makeActivity({ distance: 5000, movingTime: 1500, calories: 300, totalElevationGain: 50, averageSpeed: 3.33, averageHeartrate: 160 }),
    ];
    const stats = computeSummaryStats(acts)!;
    expect(stats.totalDistance).toBe(15); // 15000m = 15km
    expect(stats.totalTime).toBe(4500);
    expect(stats.totalCalories).toBe(900);
    expect(stats.totalElevation).toBe(150);
    expect(stats.avgHR).toBe(155);
    expect(stats.avgPace).not.toBeNull();
  });

  it('handles activities without calories/elevation', () => {
    const acts = [
      makeActivity({ calories: undefined, totalElevationGain: undefined }),
    ];
    const stats = computeSummaryStats(acts)!;
    expect(stats.totalCalories).toBe(0);
    expect(stats.totalElevation).toBe(0);
  });
});

// ========================
// computePaceTrendData
// ========================

describe('computePaceTrendData', () => {
  it('returns correct number of weeks', () => {
    const result = computePaceTrendData([], 8);
    expect(result).toHaveLength(8);
  });

  it('has null pace when no runs in a week', () => {
    const result = computePaceTrendData([], 4);
    expect(result.every((p) => p.paceSeconds === null)).toBe(true);
  });

  it('computes average pace from multiple activities in a week', () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const acts = [
      makeActivity({ date: today, averageSpeed: 3.33, type: 'Run' }), // ~300s/km
      makeActivity({ date: today, averageSpeed: 4.0, type: 'Run' }),  // 250s/km
    ];
    const result = computePaceTrendData(acts, 1);
    expect(result[0].paceSeconds).not.toBeNull();
    // avg of 300.3 and 250 ≈ 275
    expect(result[0].paceSeconds!).toBeGreaterThan(250);
    expect(result[0].paceSeconds!).toBeLessThan(310);
  });

  it('ignores non-pace activities', () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const acts = [
      makeActivity({ date: today, averageSpeed: 8.0, type: 'Ride' }),
    ];
    const result = computePaceTrendData(acts, 1);
    expect(result[0].paceSeconds).toBeNull();
  });
});

// ========================
// computeMonthlySummaries
// ========================

describe('computeMonthlySummaries', () => {
  it('groups by month and sorts desc', () => {
    const acts = [
      makeActivity({ id: '1', date: '2026-01-15', distance: 5000 }),
      makeActivity({ id: '2', date: '2026-01-20', distance: 3000 }),
      makeActivity({ id: '3', date: '2026-02-10', distance: 8000 }),
    ];
    const summaries = computeMonthlySummaries(acts);
    expect(summaries).toHaveLength(2);
    expect(summaries[0].key).toBe('2026-02');
    expect(summaries[1].key).toBe('2026-01');
  });

  it('computes correct km per month', () => {
    const acts = [
      makeActivity({ id: '1', date: '2026-03-01', distance: 10000 }),
      makeActivity({ id: '2', date: '2026-03-15', distance: 5000 }),
    ];
    const summaries = computeMonthlySummaries(acts);
    expect(summaries[0].totalKm).toBe(15);
    expect(summaries[0].activityCount).toBe(2);
  });

  it('computes avg pace only from pace activities', () => {
    const acts = [
      makeActivity({ id: '1', date: '2026-03-01', type: 'Run', averageSpeed: 3.33 }),
      makeActivity({ id: '2', date: '2026-03-01', type: 'Ride', averageSpeed: 8.0 }),
    ];
    const summaries = computeMonthlySummaries(acts);
    // Only one pace activity, so avgPace should be ~300
    expect(summaries[0].avgPace).not.toBeNull();
    expect(summaries[0].avgPace!).toBeGreaterThan(290);
    expect(summaries[0].avgPace!).toBeLessThan(310);
  });

  it('returns empty for no activities', () => {
    expect(computeMonthlySummaries([])).toEqual([]);
  });

  it('has capitalized Polish month label', () => {
    const acts = [makeActivity({ date: '2026-01-15' })];
    const summaries = computeMonthlySummaries(acts);
    expect(summaries[0].label).toMatch(/^[A-ZĄĆĘŁŃÓŚŹŻ]/); // starts uppercase
    expect(summaries[0].label).toContain('2026');
  });
});

// ========================
// computeWeeklyElevation
// ========================

describe('computeWeeklyElevation', () => {
  it('returns correct number of data points', () => {
    const { data } = computeWeeklyElevation([], 8);
    expect(data).toHaveLength(8);
  });

  it('sums elevation per week', () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const acts = [
      makeActivity({ date: today, totalElevationGain: 100 }),
      makeActivity({ date: today, totalElevationGain: 50 }),
    ];
    const { data, totalSeason } = computeWeeklyElevation(acts, 1);
    expect(data[0].elevation).toBe(150);
    expect(totalSeason).toBe(150);
  });

  it('computes trend percentage', () => {
    // Create 8 weeks of data with increasing elevation
    const now = new Date();
    const acts: StravaActivity[] = [];
    for (let i = 0; i < 8; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i * 7);
      const elev = i < 4 ? 200 : 100; // recent 4 weeks: 200m, older 4 weeks: 100m
      acts.push(makeActivity({
        id: `act-${i}`,
        date: d.toISOString().split('T')[0],
        totalElevationGain: elev,
      }));
    }
    const { trend } = computeWeeklyElevation(acts, 8);
    expect(trend).not.toBeNull();
    expect(trend!).toBe(100); // 800 vs 400 = +100%
  });

  it('returns null trend with fewer than 8 weeks', () => {
    const { trend } = computeWeeklyElevation([], 4);
    expect(trend).toBeNull();
  });
});

// ========================
// computeWeeklyCalories
// ========================

describe('computeWeeklyCalories', () => {
  it('returns correct number of data points', () => {
    const { data } = computeWeeklyCalories([], 6);
    expect(data).toHaveLength(6);
  });

  it('sums calories per week', () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const acts = [
      makeActivity({ date: today, calories: 500 }),
      makeActivity({ date: today, calories: 300 }),
    ];
    const { data, totalSeason } = computeWeeklyCalories(acts, 1);
    expect(data[0].calories).toBe(800);
    expect(totalSeason).toBe(800);
  });

  it('returns 0 when no calories data', () => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const acts = [
      makeActivity({ date: today, calories: undefined }),
    ];
    const { totalSeason } = computeWeeklyCalories(acts, 1);
    expect(totalSeason).toBe(0);
  });
});

// ========================
// detectCardioPRs
// ========================

describe('detectCardioPRs', () => {
  it('returns empty for no activities', () => {
    expect(detectCardioPRs([])).toEqual([]);
  });

  it('detects fastest pace', () => {
    const acts = [
      makeActivity({ id: '1', averageSpeed: 3.0, type: 'Run' }),
      makeActivity({ id: '2', averageSpeed: 4.0, type: 'Run' }), // faster
    ];
    const prs = detectCardioPRs(acts);
    const fastestPace = prs.find((p) => p.category === 'fastest_pace');
    expect(fastestPace).toBeDefined();
    expect(fastestPace!.value).toContain('/km');
  });

  it('detects longest distance', () => {
    const acts = [
      makeActivity({ id: '1', distance: 5000 }),
      makeActivity({ id: '2', distance: 15000 }),
    ];
    const prs = detectCardioPRs(acts);
    const longestRun = prs.find((p) => p.category === 'longest_run');
    expect(longestRun).toBeDefined();
    expect(longestRun!.value).toBe('15.0 km');
  });

  it('detects most elevation', () => {
    const acts = [
      makeActivity({ id: '1', totalElevationGain: 100 }),
      makeActivity({ id: '2', totalElevationGain: 250 }),
    ];
    const prs = detectCardioPRs(acts);
    const mostElev = prs.find((p) => p.category === 'most_elevation');
    expect(mostElev).toBeDefined();
    expect(mostElev!.value).toBe('250 m');
  });

  it('detects best 5K (4500-5500m range)', () => {
    const acts = [
      makeActivity({ id: '1', distance: 5000, averageSpeed: 3.33, movingTime: 1500, type: 'Run' }),
      makeActivity({ id: '2', distance: 5100, averageSpeed: 4.0, movingTime: 1275, type: 'Run' }), // faster
      makeActivity({ id: '3', distance: 3000, averageSpeed: 5.0, movingTime: 600, type: 'Run' }), // too short
    ];
    const prs = detectCardioPRs(acts);
    const best5k = prs.find((p) => p.category === 'best_5k');
    expect(best5k).toBeDefined();
    expect(best5k!.value).toBe('21:15');
  });

  it('detects best 10K (9500-10500m range)', () => {
    const acts = [
      makeActivity({ id: '1', distance: 10000, averageSpeed: 3.33, movingTime: 3000, type: 'Run' }),
      makeActivity({ id: '2', distance: 10200, averageSpeed: 3.5, movingTime: 2914, type: 'Run' }), // faster
    ];
    const prs = detectCardioPRs(acts);
    const best10k = prs.find((p) => p.category === 'best_10k');
    expect(best10k).toBeDefined();
    expect(best10k!.value).toBe('48:34');
  });

  it('excludes non-pace activities from pace PRs', () => {
    const acts = [
      makeActivity({ id: '1', averageSpeed: 10.0, type: 'Ride' }),
    ];
    const prs = detectCardioPRs(acts);
    expect(prs.find((p) => p.category === 'fastest_pace')).toBeUndefined();
  });
});
