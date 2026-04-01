import { startOfWeek, format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { StravaActivity } from '@/types/strava';

// ========================
// Types
// ========================

export type SeasonYear = number | 'all';

export interface MonthlySummary {
  key: string;        // "2026-03"
  label: string;      // "Marzec 2026"
  totalKm: number;
  activityCount: number;
  totalTime: number;  // seconds
  avgPace: number | null; // seconds per km (only pace activities)
  totalElevation: number;
  totalCalories: number;
  activities: StravaActivity[];
}

export interface CardioPR {
  category: 'fastest_pace' | 'longest_run' | 'most_elevation' | 'best_5k' | 'best_10k';
  label: string;
  emoji: string;
  value: string;
  date: string;
  activityName: string;
}

export interface WeeklyDataPoint {
  label: string;
  weekStart: string;
  km: number;
}

export interface PaceTrendPoint {
  label: string;
  weekStart: string;
  paceSeconds: number | null;
  paceFormatted: string;
}

export interface ElevationDataPoint {
  label: string;
  weekStart: string;
  elevation: number;
}

export interface CaloriesDataPoint {
  label: string;
  weekStart: string;
  calories: number;
}

export interface SummaryStats {
  totalDistance: number;
  totalTime: number;
  avgPace: number | null;
  avgHR: number | null;
  totalCalories: number;
  totalElevation: number;
}

// ========================
// Helpers
// ========================

const getWeekLabel = (weekIndex: number, totalWeeks: number): string => {
  if (weekIndex === totalWeeks - 1) return 'Ten tydz.';
  if (weekIndex === totalWeeks - 2) return 'Ost. tydz.';
  return `${totalWeeks - weekIndex} tyg. temu`;
};

const getMonWeekStart = (date: Date): Date =>
  startOfWeek(date, { weekStartsOn: 1 });

const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

// ========================
// Feature 1: Year filter
// ========================

export const filterByYear = (
  activities: StravaActivity[],
  year: SeasonYear,
): StravaActivity[] => {
  if (year === 'all') return activities;
  return activities.filter((a) => {
    const y = parseInt(a.date.substring(0, 4), 10);
    return y === year;
  });
};

export const filterByMonthYear = (
  activities: StravaActivity[],
  year: number,
  month: number | 'all',
): StravaActivity[] => {
  if (month === 'all') {
    return activities.filter((a) => parseInt(a.date.substring(0, 4), 10) === year);
  }
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return activities.filter((a) => a.date.startsWith(prefix));
};

export const getAvailableYears = (activities: StravaActivity[]): number[] => {
  const years = new Set<number>();
  for (const a of activities) {
    years.add(parseInt(a.date.substring(0, 4), 10));
  }
  return Array.from(years).sort((a, b) => b - a);
};

// ========================
// Shared pace utilities
// ========================

export const isPaceActivity = (activity: StravaActivity): boolean =>
  activity.type === 'Run' || activity.type === 'Walk' || activity.type === 'Hike';

export const formatPaceFromSeconds = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatDurationShort = (totalSeconds: number): string => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ========================
// Summary stats
// ========================

export const computeSummaryStats = (
  activities: StravaActivity[],
): SummaryStats | null => {
  if (activities.length === 0) return null;

  const totalDistance = activities.reduce((sum, a) => sum + (a.distance || 0), 0) / 1000;
  const totalTime = activities.reduce((sum, a) => sum + (a.movingTime || 0), 0);
  const totalCalories = activities.reduce((sum, a) => sum + (a.calories || 0), 0);
  const totalElevation = activities.reduce((sum, a) => sum + (a.totalElevationGain || 0), 0);

  const paceActivities = activities.filter(
    (a) => a.averageSpeed && isPaceActivity(a),
  );
  const avgPace =
    paceActivities.length > 0
      ? paceActivities.reduce((sum, a) => sum + 1000 / a.averageSpeed!, 0) /
        paceActivities.length
      : null;

  const hrActivities = activities.filter((a) => a.averageHeartrate);
  const avgHR =
    hrActivities.length > 0
      ? Math.round(
          hrActivities.reduce((sum, a) => sum + a.averageHeartrate!, 0) /
            hrActivities.length,
        )
      : null;

  return { totalDistance, totalTime, avgPace, avgHR, totalCalories, totalElevation };
};

// ========================
// Weekly km (existing logic, extracted)
// ========================

export const computeWeeklyKm = (
  activities: StravaActivity[],
  numWeeks: number = 12,
  referenceDate?: Date,
): WeeklyDataPoint[] => {
  const now = referenceDate ?? new Date();
  const weeks: WeeklyDataPoint[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(now.getDate() - i * 7);
    const weekStart = getMonWeekStart(weekDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    const km =
      activities
        .filter((a) => a.date >= startStr && a.date <= endStr)
        .reduce((sum, a) => sum + (a.distance || 0), 0) / 1000;

    weeks.push({
      label: getWeekLabel(numWeeks - 1 - i, numWeeks),
      weekStart: startStr,
      km: Math.round(km * 10) / 10,
    });
  }

  return weeks;
};

// ========================
// Feature 2: Pace trend
// ========================

export const computePaceTrendData = (
  activities: StravaActivity[],
  numWeeks: number = 12,
  referenceDate?: Date,
): PaceTrendPoint[] => {
  const now = referenceDate ?? new Date();
  const weeks: PaceTrendPoint[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(now.getDate() - i * 7);
    const weekStart = getMonWeekStart(weekDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    const paceActivities = activities.filter(
      (a) =>
        a.date >= startStr &&
        a.date <= endStr &&
        isPaceActivity(a) &&
        a.averageSpeed &&
        a.averageSpeed > 0,
    );

    let paceSeconds: number | null = null;
    if (paceActivities.length > 0) {
      const totalPace = paceActivities.reduce(
        (sum, a) => sum + 1000 / a.averageSpeed!,
        0,
      );
      paceSeconds = Math.round(totalPace / paceActivities.length);
    }

    weeks.push({
      label: getWeekLabel(numWeeks - 1 - i, numWeeks),
      weekStart: startStr,
      paceSeconds,
      paceFormatted: paceSeconds ? formatPaceFromSeconds(paceSeconds) : '',
    });
  }

  return weeks;
};

// ========================
// Feature 3: Monthly summaries
// ========================

export const computeMonthlySummaries = (
  activities: StravaActivity[],
): MonthlySummary[] => {
  const groups = new Map<string, StravaActivity[]>();

  for (const a of activities) {
    const key = a.date.substring(0, 7); // "2026-03"
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(a);
  }

  const summaries: MonthlySummary[] = [];

  for (const [key, acts] of groups) {
    const date = parseISO(`${key}-01`);
    const label = capitalize(format(date, 'LLLL yyyy', { locale: pl }));

    const totalKm =
      Math.round(
        (acts.reduce((s, a) => s + (a.distance || 0), 0) / 1000) * 10,
      ) / 10;
    const totalTime = acts.reduce((s, a) => s + (a.movingTime || 0), 0);
    const totalElevation = acts.reduce(
      (s, a) => s + (a.totalElevationGain || 0),
      0,
    );
    const totalCalories = acts.reduce((s, a) => s + (a.calories || 0), 0);

    const paceActs = acts.filter(
      (a) => isPaceActivity(a) && a.averageSpeed && a.averageSpeed > 0,
    );
    const avgPace =
      paceActs.length > 0
        ? Math.round(
            paceActs.reduce((s, a) => s + 1000 / a.averageSpeed!, 0) /
              paceActs.length,
          )
        : null;

    summaries.push({
      key,
      label,
      totalKm,
      activityCount: acts.length,
      totalTime,
      avgPace,
      totalElevation,
      totalCalories,
      activities: acts.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    });
  }

  return summaries.sort((a, b) => b.key.localeCompare(a.key));
};

// ========================
// Feature 4: Elevation
// ========================

export const computeWeeklyElevation = (
  activities: StravaActivity[],
  numWeeks: number = 12,
  referenceDate?: Date,
): { data: ElevationDataPoint[]; totalSeason: number; trend: number | null } => {
  const now = referenceDate ?? new Date();
  const data: ElevationDataPoint[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(now.getDate() - i * 7);
    const weekStart = getMonWeekStart(weekDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    const elevation = activities
      .filter((a) => a.date >= startStr && a.date <= endStr)
      .reduce((sum, a) => sum + (a.totalElevationGain || 0), 0);

    data.push({
      label: getWeekLabel(numWeeks - 1 - i, numWeeks),
      weekStart: startStr,
      elevation: Math.round(elevation),
    });
  }

  const totalSeason = data.reduce((s, d) => s + d.elevation, 0);

  // Trend: compare last 4 weeks to previous 4 weeks
  let trend: number | null = null;
  if (data.length >= 8) {
    const recent = data.slice(-4).reduce((s, d) => s + d.elevation, 0);
    const previous = data.slice(-8, -4).reduce((s, d) => s + d.elevation, 0);
    if (previous > 0) {
      trend = Math.round(((recent - previous) / previous) * 100);
    }
  }

  return { data, totalSeason, trend };
};

// ========================
// Feature 5: Calories
// ========================

export const computeWeeklyCalories = (
  activities: StravaActivity[],
  numWeeks: number = 12,
  referenceDate?: Date,
): { data: CaloriesDataPoint[]; totalSeason: number } => {
  const now = referenceDate ?? new Date();
  const data: CaloriesDataPoint[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(now.getDate() - i * 7);
    const weekStart = getMonWeekStart(weekDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = weekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    const calories = activities
      .filter((a) => a.date >= startStr && a.date <= endStr)
      .reduce((sum, a) => sum + (a.calories || 0), 0);

    data.push({
      label: getWeekLabel(numWeeks - 1 - i, numWeeks),
      weekStart: startStr,
      calories: Math.round(calories),
    });
  }

  const totalSeason = data.reduce((s, d) => s + d.calories, 0);

  return { data, totalSeason };
};

// ========================
// Feature 6: Cardio PRs
// ========================

export const detectCardioPRs = (
  activities: StravaActivity[],
): CardioPR[] => {
  const prs: CardioPR[] = [];

  // Fastest pace
  const paceActivities = activities.filter(
    (a) => isPaceActivity(a) && a.averageSpeed && a.averageSpeed > 0,
  );

  if (paceActivities.length > 0) {
    const fastest = paceActivities.reduce((best, a) =>
      a.averageSpeed! > best.averageSpeed! ? a : best,
    );
    const paceSeconds = 1000 / fastest.averageSpeed!;
    prs.push({
      category: 'fastest_pace',
      label: 'Najszybsze tempo',
      emoji: '🏃',
      value: `${formatPaceFromSeconds(paceSeconds)} /km`,
      date: fastest.date,
      activityName: fastest.name,
    });
  }

  // Longest run
  const distanceActivities = activities.filter((a) => a.distance && a.distance > 0);
  if (distanceActivities.length > 0) {
    const longest = distanceActivities.reduce((best, a) =>
      a.distance! > best.distance! ? a : best,
    );
    prs.push({
      category: 'longest_run',
      label: 'Najdłuższy dystans',
      emoji: '📏',
      value: `${(longest.distance! / 1000).toFixed(1)} km`,
      date: longest.date,
      activityName: longest.name,
    });
  }

  // Most elevation
  const elevActivities = activities.filter(
    (a) => a.totalElevationGain && a.totalElevationGain > 0,
  );
  if (elevActivities.length > 0) {
    const mostElev = elevActivities.reduce((best, a) =>
      a.totalElevationGain! > best.totalElevationGain! ? a : best,
    );
    prs.push({
      category: 'most_elevation',
      label: 'Najwięcej przewyższenia',
      emoji: '⛰️',
      value: `${Math.round(mostElev.totalElevationGain!)} m`,
      date: mostElev.date,
      activityName: mostElev.name,
    });
  }

  // Best 5K (4500-5500m)
  const fiveKCandidates = paceActivities.filter(
    (a) => a.distance && a.distance >= 4500 && a.distance <= 5500 && a.movingTime,
  );
  if (fiveKCandidates.length > 0) {
    const best5k = fiveKCandidates.reduce((best, a) =>
      a.averageSpeed! > best.averageSpeed! ? a : best,
    );
    prs.push({
      category: 'best_5k',
      label: 'Najlepsze 5K',
      emoji: '🏅',
      value: formatDurationShort(best5k.movingTime!),
      date: best5k.date,
      activityName: best5k.name,
    });
  }

  // Best 10K (9500-10500m)
  const tenKCandidates = paceActivities.filter(
    (a) => a.distance && a.distance >= 9500 && a.distance <= 10500 && a.movingTime,
  );
  if (tenKCandidates.length > 0) {
    const best10k = tenKCandidates.reduce((best, a) =>
      a.averageSpeed! > best.averageSpeed! ? a : best,
    );
    prs.push({
      category: 'best_10k',
      label: 'Najlepsze 10K',
      emoji: '🏅',
      value: formatDurationShort(best10k.movingTime!),
      date: best10k.date,
      activityName: best10k.name,
    });
  }

  return prs;
};
