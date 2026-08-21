import { startOfWeek, format, parseISO } from 'date-fns';
import { pl as plDateFns, enUS } from 'date-fns/locale';
import type { StravaActivity } from '@/types/strava';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';
import { translate, dateLocale, type LanguageCode } from '@/i18n';
import { baseActivityType, displayActivityType } from '@/lib/activity-icons';

// ========================
// Types
// ========================

export type SeasonYear = number | 'all';

export interface MonthlySummary {
  key: string;        // "2026-03"
  label: string;      // "Marzec 2026"
  totalKm: number;
  /** X27/WP-C: rozbicie dystansu — biegi (run-like) osobno od spacerów. */
  runKm: number;
  walkKm: number;
  activityCount: number;
  totalTime: number;  // seconds
  avgPace: number | null; // seconds per km (X27: only run-like activities)
  totalElevation: number;
  totalCalories: number;
  activities: StravaActivity[];
}

export interface CardioPR {
  category: 'fastest_pace' | 'longest_run' | 'most_elevation' | 'best_5k' | 'best_10k';
  label: string;
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

// Z164: etykiety per język; domyślnie PL (wzorzec lib w tym projekcie).
const DF_LOCALES = { pl: plDateFns, en: enUS } as const;

const getWeekLabel = (weekIndex: number, totalWeeks: number, lang: LanguageCode = 'pl'): string => {
  if (weekIndex === totalWeeks - 1) return translate(lang, 'strava.weekThis');
  if (weekIndex === totalWeeks - 2) return translate(lang, 'strava.weekLast');
  return translate(lang, 'strava.weeksAgo', { n: totalWeeks - weekIndex });
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

/**
 * X27/WP-C: jawne predykaty klasyfikacji. isRunLike = bieg sensu stricto
 * (Run/TrailRun/VirtualRun) — pace avg/trend, rekordy i predykcje liczą TYLKO
 * z biegów; isWalkLike = Walk/Hike (po type lub sportType). Aktywność bez obu
 * pól nie jest ani biegiem, ani spacerem (traktowana jak "Other").
 * isPaceActivity zostaje do FORMATOWANIA tempa (min/km także dla marszu).
 */
export const isRunLike = (activity: StravaActivity): boolean =>
  activity.type === 'Run' || (activity.sportType?.includes('Run') ?? false);

export const isWalkLike = (activity: StravaActivity): boolean =>
  activity.type === 'Walk' || activity.type === 'Hike'
  || activity.sportType === 'Walk' || activity.sportType === 'Hike';

/** T6: alias historyczny — semantyka przeniesiona do isRunLike (X27/WP-C). */
export const isRunActivity = isRunLike;

/** X27/WP-C: filtr typu w widoku Strava (chipsy Wszystko/Biegi/Spacery/Rower/Inne). */
export type ActivityTypeFilter = 'all' | 'runs' | 'walks' | 'rides' | 'other';

const isRideLike = (activity: StravaActivity): boolean =>
  baseActivityType(displayActivityType(activity)) === 'Ride';

export const matchesActivityTypeFilter = (
  activity: StravaActivity,
  filter: ActivityTypeFilter,
): boolean => {
  switch (filter) {
    case 'all': return true;
    case 'runs': return isRunLike(activity);
    case 'walks': return isWalkLike(activity);
    case 'rides': return isRideLike(activity);
    case 'other': return !isRunLike(activity) && !isWalkLike(activity) && !isRideLike(activity);
  }
};

// ========================
// Manual sync cooldown (X27/WP-C: 24 h, lustro serwerowego limitu)
// ========================

/** Musi się zgadzać z MANUAL_SYNC_MIN_INTERVAL_MS w functions/src/strava-activity.ts
 *  (functions nie współdzielą kodu z src/). */
export const MANUAL_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** Kiedy ręczny sync będzie znów dostępny; null = dostępny teraz.
 *  Brak/nieparsowalny lastSync przepuszcza (ta sama semantyka co serwer). */
export const computeNextSyncAvailableAt = (
  lastSyncIso: string | null | undefined,
  nowMs: number,
): Date | null => {
  if (!lastSyncIso) return null;
  const lastMs = new Date(lastSyncIso).getTime();
  if (!Number.isFinite(lastMs)) return null;
  const nextMs = lastMs + MANUAL_SYNC_INTERVAL_MS;
  return nextMs > nowMs ? new Date(nextMs) : null;
};

/** Godzina odblokowania wg języka; inna doba niż dziś → także dzień. */
export const formatNextSyncTime = (
  date: Date,
  lang: LanguageCode,
  now: Date = new Date(),
): string => {
  const locale = dateLocale(lang);
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const sameDay = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  if (sameDay) return time;
  return `${date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}, ${time}`;
};

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

  // T8: średnie tempo WAŻONE dystansem (suma czasu / suma km), nie średnia
  // arytmetyczna pace'ów per aktywność. X27/WP-C: liczone TYLKO z run-like —
  // spacer (Walk/Hike) w ogóle nie wchodzi do średniego tempa biegowego.
  const paceActivities = activities.filter(
    (a) => isRunLike(a) && a.movingTime && a.distance,
  );
  const paceKm = paceActivities.reduce((sum, a) => sum + a.distance! / 1000, 0);
  const paceTime = paceActivities.reduce((sum, a) => sum + (a.movingTime || 0), 0);
  const avgPace = paceKm > 0 ? paceTime / paceKm : null;

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
  lang: LanguageCode = 'pl',
): WeeklyDataPoint[] => {
  const now = referenceDate ?? new Date();
  const weeks: WeeklyDataPoint[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(now.getDate() - i * 7);
    const weekStart = getMonWeekStart(weekDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = formatLocalDate(weekStart);
    const endStr = formatLocalDate(weekEnd);

    const km =
      activities
        .filter((a) => a.date >= startStr && a.date <= endStr)
        .reduce((sum, a) => sum + (a.distance || 0), 0) / 1000;

    weeks.push({
      label: getWeekLabel(numWeeks - 1 - i, numWeeks, lang),
      weekStart: startStr,
      km: Math.round(km * 10) / 10,
    });
  }

  return weeks;
};

/** X27/WP-C: kilometry TYLKO biegowe (run-like) per tydzień; computeWeeklyKm
 *  zostaje z łącznym dystansem (niezmiennik istniejących konsumentów). */
export const computeWeeklyRunKm = (
  activities: StravaActivity[],
  numWeeks: number = 12,
  referenceDate?: Date,
  lang: LanguageCode = 'pl',
): WeeklyDataPoint[] =>
  computeWeeklyKm(activities.filter(isRunLike), numWeeks, referenceDate, lang);

// ========================
// Feature 2: Pace trend
// ========================

export const computePaceTrendData = (
  activities: StravaActivity[],
  numWeeks: number = 12,
  referenceDate?: Date,
  lang: LanguageCode = 'pl',
): PaceTrendPoint[] => {
  const now = referenceDate ?? new Date();
  const weeks: PaceTrendPoint[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(now.getDate() - i * 7);
    const weekStart = getMonWeekStart(weekDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = formatLocalDate(weekStart);
    const endStr = formatLocalDate(weekEnd);

    const paceActivities = activities.filter(
      (a) =>
        a.date >= startStr &&
        a.date <= endStr &&
        // X27/WP-C: trend tempa tylko z biegów (spacer z wózkiem nie psuje trendu).
        isRunLike(a) &&
        a.movingTime &&
        a.distance,
    );

    // T8: tempo tygodnia ważone dystansem (suma czasu / suma km).
    let paceSeconds: number | null = null;
    const weekKm = paceActivities.reduce((sum, a) => sum + a.distance! / 1000, 0);
    if (weekKm > 0) {
      const weekTime = paceActivities.reduce((sum, a) => sum + (a.movingTime || 0), 0);
      paceSeconds = Math.round(weekTime / weekKm);
    }

    weeks.push({
      label: getWeekLabel(numWeeks - 1 - i, numWeeks, lang),
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
  lang: LanguageCode = 'pl',
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
    const label = capitalize(format(date, 'LLLL yyyy', { locale: DF_LOCALES[lang] ?? DF_LOCALES.pl }));

    const totalKm =
      Math.round(
        (acts.reduce((s, a) => s + (a.distance || 0), 0) / 1000) * 10,
      ) / 10;
    // X27/WP-C: rozbicie dystansu bieg/spacer obok totalKm.
    const runKm =
      Math.round(
        (acts.filter(isRunLike).reduce((s, a) => s + (a.distance || 0), 0) / 1000) * 10,
      ) / 10;
    const walkKm =
      Math.round(
        (acts.filter(isWalkLike).reduce((s, a) => s + (a.distance || 0), 0) / 1000) * 10,
      ) / 10;
    const totalTime = acts.reduce((s, a) => s + (a.movingTime || 0), 0);
    const totalElevation = acts.reduce(
      (s, a) => s + (a.totalElevationGain || 0),
      0,
    );
    const totalCalories = acts.reduce((s, a) => s + (a.calories || 0), 0);

    // T8: tempo miesiąca ważone dystansem (spójne z computeSummaryStats).
    // X27/WP-C: tylko run-like — spacer nie wchodzi do tempa miesiąca.
    const paceActs = acts.filter(
      (a) => isRunLike(a) && a.movingTime && a.distance,
    );
    const paceKm = paceActs.reduce((s, a) => s + a.distance! / 1000, 0);
    const avgPace = paceKm > 0
      ? Math.round(paceActs.reduce((s, a) => s + (a.movingTime || 0), 0) / paceKm)
      : null;

    summaries.push({
      key,
      label,
      totalKm,
      runKm,
      walkKm,
      activityCount: acts.length,
      totalTime,
      avgPace,
      totalElevation,
      totalCalories,
      activities: acts.sort(
        (a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime(),
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
  lang: LanguageCode = 'pl',
): { data: ElevationDataPoint[]; totalSeason: number; trend: number | null } => {
  const now = referenceDate ?? new Date();
  const data: ElevationDataPoint[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(now.getDate() - i * 7);
    const weekStart = getMonWeekStart(weekDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = formatLocalDate(weekStart);
    const endStr = formatLocalDate(weekEnd);

    const elevation = activities
      .filter((a) => a.date >= startStr && a.date <= endStr)
      .reduce((sum, a) => sum + (a.totalElevationGain || 0), 0);

    data.push({
      label: getWeekLabel(numWeeks - 1 - i, numWeeks, lang),
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
  lang: LanguageCode = 'pl',
): { data: CaloriesDataPoint[]; totalSeason: number } => {
  const now = referenceDate ?? new Date();
  const data: CaloriesDataPoint[] = [];

  for (let i = numWeeks - 1; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(now.getDate() - i * 7);
    const weekStart = getMonWeekStart(weekDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const startStr = formatLocalDate(weekStart);
    const endStr = formatLocalDate(weekEnd);

    const calories = activities
      .filter((a) => a.date >= startStr && a.date <= endStr)
      .reduce((sum, a) => sum + (a.calories || 0), 0);

    data.push({
      label: getWeekLabel(numWeeks - 1 - i, numWeeks, lang),
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
  lang: LanguageCode = 'pl',
): CardioPR[] => {
  const prs: CardioPR[] = [];

  // Fastest pace — T6: tylko biegi (spacer nie jest rekordem biegowym)
  const paceActivities = activities.filter(
    (a) => isRunActivity(a) && a.averageSpeed && a.averageSpeed > 0,
  );

  if (paceActivities.length > 0) {
    const fastest = paceActivities.reduce((best, a) =>
      a.averageSpeed! > best.averageSpeed! ? a : best,
    );
    const paceSeconds = 1000 / fastest.averageSpeed!;
    prs.push({
      category: 'fastest_pace',
      label: translate(lang, 'stravautil.fastestPace'),
      value: `${formatPaceFromSeconds(paceSeconds)} /km`,
      date: fastest.date,
      activityName: fastest.name,
    });
  }

  // Longest run — X27/WP-C: tylko biegi (długi spacer nie wygrywa "longest run")
  const distanceActivities = activities.filter(
    (a) => isRunLike(a) && a.distance && a.distance > 0,
  );
  if (distanceActivities.length > 0) {
    const longest = distanceActivities.reduce((best, a) =>
      a.distance! > best.distance! ? a : best,
    );
    prs.push({
      category: 'longest_run',
      label: translate(lang, 'stravautil.longestRun'),
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
      label: translate(lang, 'stravautil.mostElevation'),
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
      label: translate(lang, 'stravautil.best5k'),
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
      label: translate(lang, 'stravautil.best10k'),
      value: formatDurationShort(best10k.movingTime!),
      date: best10k.date,
      activityName: best10k.name,
    });
  }

  return prs;
};
