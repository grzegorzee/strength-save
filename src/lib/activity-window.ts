import type { StravaActivity, UnifiedActivity } from '@/types/strava';

// Z214: karty Dashboardu liczą wyłącznie bieżący tydzień planu (Mon-Sun).
// Logika wyciągnięta 1:1 z Dashboardu, żeby test fixture >500 rekordów mógł
// zamrozić równość wyników: pełna historia vs ograniczone okno listenera.

/** Tygodniowy licznik km ze Stravy (bez treningów siłowych/crossfit). */
export const weeklyStravaKm = (
  stravaActivities: StravaActivity[],
  stravaConnected: boolean,
  weekStartStr: string,
  weekEndStr: string,
): number => {
  if (!stravaConnected) return 0;
  return stravaActivities
    .filter(a => a.date >= weekStartStr && a.date <= weekEndStr && a.type !== 'WeightTraining' && a.type !== 'Crossfit')
    .reduce((sum, a) => sum + (a.distance || 0), 0) / 1000;
};

/** Cardio bieżącego tygodnia do osi czasu: wpisy manualne ZAWSZE, Strava gdy połączona. */
export const currentWeekCardio = (
  activities: UnifiedActivity[],
  stravaConnected: boolean,
  weekStartStr: string,
  weekEndStr: string,
): UnifiedActivity[] => activities
  .filter(a => a.source === 'manual' || stravaConnected)
  .filter(a => a.date >= weekStartStr && a.date <= weekEndStr && a.type !== 'WeightTraining' && a.type !== 'Crossfit');
