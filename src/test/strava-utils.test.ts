import { describe, it, expect } from 'vitest';
import type { StravaActivity } from '@/types/strava';
import { formatLocalDate } from '@/lib/utils';
import {
  filterByYear,
  getAvailableYears,
  isPaceActivity,
  isRunActivity,
  isRunLike,
  isWalkLike,
  formatPaceFromSeconds,
  formatDurationShort,
  computeSummaryStats,
  computePaceTrendData,
  computeMonthlySummaries,
  computeWeeklyElevation,
  computeWeeklyCalories,
  computeWeeklyKm,
  computeWeeklyRunKm,
  computeNextSyncAvailableAt,
  formatNextSyncTime,
  matchesActivityTypeFilter,
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
// isRunActivity (T6)
// ========================

describe('isRunActivity', () => {
  it('łapie bieg po type oraz warianty sportType (TrailRun/VirtualRun)', () => {
    expect(isRunActivity(makeActivity({ type: 'Run' }))).toBe(true);
    expect(isRunActivity(makeActivity({ type: 'Run', sportType: 'TrailRun' }))).toBe(true);
    expect(isRunActivity(makeActivity({ type: 'Workout', sportType: 'VirtualRun' }))).toBe(true);
  });

  it('spacer i wędrówka NIE są biegiem', () => {
    expect(isRunActivity(makeActivity({ type: 'Walk', sportType: 'Walk' }))).toBe(false);
    expect(isRunActivity(makeActivity({ type: 'Hike', sportType: 'Hike' }))).toBe(false);
    expect(isRunActivity(makeActivity({ type: 'Ride' }))).toBe(false);
  });
});

// ========================
// isRunLike / isWalkLike (X27/WP-C)
// ========================

describe('isRunLike / isWalkLike (X27/WP-C)', () => {
  it('isRunLike: Run oraz sportType z "Run" (TrailRun/VirtualRun) tak; Walk/Hike/Ride nie', () => {
    expect(isRunLike(makeActivity({ type: 'Run' }))).toBe(true);
    expect(isRunLike(makeActivity({ type: 'TrailRun', sportType: 'TrailRun' }))).toBe(true);
    expect(isRunLike(makeActivity({ type: 'Workout', sportType: 'VirtualRun' }))).toBe(true);
    expect(isRunLike(makeActivity({ type: 'Walk', sportType: 'Walk' }))).toBe(false);
    expect(isRunLike(makeActivity({ type: 'Hike', sportType: 'Hike' }))).toBe(false);
    expect(isRunLike(makeActivity({ type: 'Ride' }))).toBe(false);
  });

  it('isWalkLike: Walk/Hike tak (po type lub sportType); Run/Ride nie', () => {
    expect(isWalkLike(makeActivity({ type: 'Walk' }))).toBe(true);
    expect(isWalkLike(makeActivity({ type: 'Hike' }))).toBe(true);
    expect(isWalkLike(makeActivity({ type: 'Workout', sportType: 'Walk' }))).toBe(true);
    expect(isWalkLike(makeActivity({ type: 'Workout', sportType: 'Hike' }))).toBe(true);
    expect(isWalkLike(makeActivity({ type: 'Run' }))).toBe(false);
    expect(isWalkLike(makeActivity({ type: 'Ride' }))).toBe(false);
  });

  it('brak type i sportType → ani bieg, ani spacer (traktuj jak Other)', () => {
    const bare = makeActivity({ type: undefined as unknown as string, sportType: undefined });
    expect(isRunLike(bare)).toBe(false);
    expect(isWalkLike(bare)).toBe(false);
  });
});

// ========================
// computeNextSyncAvailableAt / formatNextSyncTime (X27: cooldown 24 h w UI)
// ========================

describe('computeNextSyncAvailableAt (X27: cooldown 24 h w UI)', () => {
  const NOW = Date.parse('2026-08-20T12:00:00.000Z');

  it('brak lastSync / nieparsowalny → null (sync dostępny)', () => {
    expect(computeNextSyncAvailableAt(undefined, NOW)).toBeNull();
    expect(computeNextSyncAvailableAt(null, NOW)).toBeNull();
    expect(computeNextSyncAvailableAt('not-a-date', NOW)).toBeNull();
  });

  it('lastSync 2 h temu → odblokowanie dokładnie 24 h po lastSync', () => {
    const last = new Date(NOW - 2 * 3600_000).toISOString();
    const next = computeNextSyncAvailableAt(last, NOW);
    expect(next?.getTime()).toBe(NOW + 22 * 3600_000);
  });

  it('lastSync 25 h temu → null (cooldown minął)', () => {
    const last = new Date(NOW - 25 * 3600_000).toISOString();
    expect(computeNextSyncAvailableAt(last, NOW)).toBeNull();
  });
});

describe('formatNextSyncTime (X27)', () => {
  it('ten sam dzień → sama godzina', () => {
    const now = new Date(2026, 7, 20, 10, 0);
    const date = new Date(2026, 7, 20, 18, 30);
    expect(formatNextSyncTime(date, 'pl', now)).toMatch(/^\d{2}:\d{2}$/);
  });

  it('jutro → dzień + godzina', () => {
    const now = new Date(2026, 7, 20, 23, 0);
    const date = new Date(2026, 7, 21, 9, 15);
    const label = formatNextSyncTime(date, 'en', now);
    expect(label).toMatch(/9:15/);
    expect(label).toMatch(/21/);
  });
});

// ========================
// matchesActivityTypeFilter (X27: chipsy filtra typu)
// ========================

describe('matchesActivityTypeFilter (X27: chipsy filtra typu)', () => {
  const run = makeActivity({ type: 'Run' });
  const trail = makeActivity({ type: 'TrailRun', sportType: 'TrailRun' });
  const walk = makeActivity({ type: 'Walk' });
  const hike = makeActivity({ type: 'Hike', sportType: 'Hike' });
  const ride = makeActivity({ type: 'Ride' });
  const gravel = makeActivity({ type: 'Ride', sportType: 'GravelRide' });
  const swim = makeActivity({ type: 'Swim' });

  it('all przepuszcza wszystko', () => {
    expect(matchesActivityTypeFilter(run, 'all')).toBe(true);
    expect(matchesActivityTypeFilter(swim, 'all')).toBe(true);
  });

  it('runs = run-like (z TrailRun), bez spacerów', () => {
    expect(matchesActivityTypeFilter(run, 'runs')).toBe(true);
    expect(matchesActivityTypeFilter(trail, 'runs')).toBe(true);
    expect(matchesActivityTypeFilter(walk, 'runs')).toBe(false);
  });

  it('walks = Walk/Hike', () => {
    expect(matchesActivityTypeFilter(walk, 'walks')).toBe(true);
    expect(matchesActivityTypeFilter(hike, 'walks')).toBe(true);
    expect(matchesActivityTypeFilter(run, 'walks')).toBe(false);
  });

  it('rides = Ride z wariantami sportType', () => {
    expect(matchesActivityTypeFilter(ride, 'rides')).toBe(true);
    expect(matchesActivityTypeFilter(gravel, 'rides')).toBe(true);
    expect(matchesActivityTypeFilter(swim, 'rides')).toBe(false);
  });

  it('other = reszta (nie bieg, nie spacer, nie rower)', () => {
    expect(matchesActivityTypeFilter(swim, 'other')).toBe(true);
    expect(matchesActivityTypeFilter(run, 'other')).toBe(false);
    expect(matchesActivityTypeFilter(walk, 'other')).toBe(false);
    expect(matchesActivityTypeFilter(ride, 'other')).toBe(false);
  });
});

// ========================
// computeWeeklyKm / computeWeeklyRunKm (X27)
// ========================

describe('computeWeeklyRunKm (X27)', () => {
  it('pomija spacery; computeWeeklyKm dalej liczy całość (niezmiennik konsumentów)', () => {
    const today = formatLocalDate(new Date());
    const acts = [
      makeActivity({ id: 'r', type: 'Run', date: today, distance: 10000 }),
      makeActivity({ id: 'w', type: 'Walk', date: today, distance: 4000 }),
    ];
    expect(computeWeeklyRunKm(acts, 1)[0].km).toBe(10);
    expect(computeWeeklyKm(acts, 1)[0].km).toBe(14);
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

  // T8: avgPace ważone dystansem. 5 km w 25 min + 10 km w 40 min →
  // 65 min / 15 km = 260 s/km (4:20). Stara średnia arytmetyczna dałaby
  // (300+240)/2 = 270 s/km (4:30) — asercja odróżnia implementacje.
  it('avgPace is distance-weighted, not arithmetic mean of paces', () => {
    const acts = [
      makeActivity({ id: '1', type: 'Run', distance: 5000, movingTime: 1500 }),
      makeActivity({ id: '2', type: 'Run', distance: 10000, movingTime: 2400 }),
    ];
    const stats = computeSummaryStats(acts)!;
    expect(Math.round(stats.avgPace!)).toBe(260);
  });

  // X27/WP-C: spacer nie wchodzi do średniego tempa — bieg 5:00/km + spacer
  // 12:00/km ma dawać 5:00/km, nie mieszankę. Dystans/czas/kalorie dalej z całości.
  it('X27: avg pace liczone TYLKO z biegów (spacer 12:00/km nie psuje 5:00/km)', () => {
    const acts = [
      makeActivity({ id: 'r', type: 'Run', distance: 5000, movingTime: 1500 }),
      makeActivity({ id: 'w', type: 'Walk', distance: 5000, movingTime: 3600 }),
    ];
    const stats = computeSummaryStats(acts)!;
    expect(stats.avgPace).toBe(300);
    expect(stats.totalDistance).toBe(10);
    expect(stats.totalTime).toBe(5100);
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

  // T8: oczekiwanie zmienione ze średniej arytmetycznej pace'ów na ważoną
  // dystansem — jedna długa i jedna krótka aktywność w tygodniu.
  it('computes distance-weighted pace from multiple activities in a week', () => {
    const now = new Date();
    const today = formatLocalDate(now);
    const acts = [
      makeActivity({ date: today, distance: 5000, movingTime: 1500, type: 'Run' }),  // 300 s/km
      makeActivity({ date: today, distance: 10000, movingTime: 2400, type: 'Run' }), // 240 s/km
    ];
    const result = computePaceTrendData(acts, 1);
    // 3900 s / 15 km = 260 s/km (arytmetyczna dałaby 270)
    expect(result[0].paceSeconds).toBe(260);
  });

  it('ignores non-pace activities', () => {
    const now = new Date();
    const today = formatLocalDate(now);
    const acts = [
      makeActivity({ date: today, averageSpeed: 8.0, type: 'Ride' }),
    ];
    const result = computePaceTrendData(acts, 1);
    expect(result[0].paceSeconds).toBeNull();
  });

  // X27/WP-C: spacer z wózkiem nie psuje trendu tempa — tydzień z biegiem
  // 5:00/km i spacerem 12:00/km pokazuje 5:00/km.
  it('X27: trend tempa liczy tylko run-like, spacer pomijany', () => {
    const today = formatLocalDate(new Date());
    const acts = [
      makeActivity({ id: 'r', date: today, type: 'Run', distance: 5000, movingTime: 1500 }),
      makeActivity({ id: 'w', date: today, type: 'Walk', distance: 5000, movingTime: 3600 }),
    ];
    const result = computePaceTrendData(acts, 1);
    expect(result[0].paceSeconds).toBe(300);
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
      makeActivity({ id: '1', date: '2026-03-01', type: 'Run', distance: 5000, movingTime: 1500 }),
      makeActivity({ id: '2', date: '2026-03-01', type: 'Ride', distance: 20000, movingTime: 2500 }),
    ];
    const summaries = computeMonthlySummaries(acts);
    // Only one pace activity (Run 5 km / 25 min), so avgPace = 300
    expect(summaries[0].avgPace).toBe(300);
  });

  // T8: avgPace miesiąca spójne z computeSummaryStats na tym samym fixture.
  it('monthly avgPace matches summary stats on the same fixture (weighted)', () => {
    const acts = [
      makeActivity({ id: '1', date: '2026-03-01', type: 'Run', distance: 5000, movingTime: 1500 }),
      makeActivity({ id: '2', date: '2026-03-15', type: 'Run', distance: 10000, movingTime: 2400 }),
    ];
    const summaries = computeMonthlySummaries(acts);
    const stats = computeSummaryStats(acts)!;
    expect(summaries[0].avgPace).toBe(Math.round(stats.avgPace!));
    expect(summaries[0].avgPace).toBe(260);
  });

  it('returns empty for no activities', () => {
    expect(computeMonthlySummaries([])).toEqual([]);
  });

  // X27/WP-C: rozbicie dystansu bieg/spacer obok totalKm; avgPace tylko biegowe.
  it('X27: runKm/walkKm obok totalKm, avgPace tylko z biegów', () => {
    const acts = [
      makeActivity({ id: 'r', date: '2026-03-01', type: 'Run', distance: 5000, movingTime: 1500 }),
      makeActivity({ id: 'w', date: '2026-03-02', type: 'Walk', distance: 4000, movingTime: 2880 }),
      makeActivity({ id: 'b', date: '2026-03-03', type: 'Ride', distance: 20000, movingTime: 2400 }),
    ];
    const [month] = computeMonthlySummaries(acts);
    expect(month.totalKm).toBe(29);
    expect(month.runKm).toBe(5);
    expect(month.walkKm).toBe(4);
    expect(month.avgPace).toBe(300);
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
    const today = formatLocalDate(now);
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
        date: formatLocalDate(d),
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
    const today = formatLocalDate(now);
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
    const today = formatLocalDate(now);
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

  // T6: spacer 5 km NIE generuje rekordów biegowych; bieg tak.
  it('walk does not produce fastest_pace/best_5k, run does', () => {
    const walkOnly = [
      makeActivity({ id: 'w1', type: 'Walk', sportType: 'Walk', distance: 5000, movingTime: 3600, averageSpeed: 1.39 }),
    ];
    const walkPrs = detectCardioPRs(walkOnly);
    expect(walkPrs.find((p) => p.category === 'fastest_pace')).toBeUndefined();
    expect(walkPrs.find((p) => p.category === 'best_5k')).toBeUndefined();
    expect(walkPrs.find((p) => p.category === 'best_10k')).toBeUndefined();

    const withRun = [
      ...walkOnly,
      makeActivity({ id: 'r1', type: 'Run', sportType: 'Run', distance: 5000, movingTime: 1500, averageSpeed: 3.33 }),
    ];
    const runPrs = detectCardioPRs(withRun);
    expect(runPrs.find((p) => p.category === 'fastest_pace')).toBeDefined();
    expect(runPrs.find((p) => p.category === 'best_5k')?.value).toBe('25:00');
  });

  // X27/WP-C: "longest run" tylko z biegów — długi spacer nie wygrywa rekordu.
  it('X27: spacer 20 km NIE wygrywa "longest run" z biegiem 10 km', () => {
    const acts = [
      makeActivity({ id: 'w', type: 'Walk', sportType: 'Walk', distance: 20000 }),
      makeActivity({ id: 'r', type: 'Run', distance: 10000 }),
    ];
    const prs = detectCardioPRs(acts);
    const longest = prs.find((p) => p.category === 'longest_run');
    expect(longest?.value).toBe('10.0 km');
  });

  it('T6: sportType TrailRun liczy się do rekordów biegowych', () => {
    const acts = [
      makeActivity({ id: 't1', type: 'Run', sportType: 'TrailRun', distance: 5000, movingTime: 1600, averageSpeed: 3.13 }),
    ];
    const prs = detectCardioPRs(acts);
    expect(prs.find((p) => p.category === 'fastest_pace')).toBeDefined();
  });
});
