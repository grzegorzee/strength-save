import type { StravaActivity } from '@/types/strava';
import { isPaceActivity, formatDurationShort } from '@/lib/strava-utils';
import { translate, type LanguageCode } from '@/i18n';

export interface RacePrediction {
  distance: number;
  distanceLabel: string;     // klucz lookup (stały, np. 'Półmaraton') — NIE tłumaczony
  displayLabel: string;      // etykieta do wyświetlenia (tłumaczona)
  predictedTime: number; // seconds
  predictedTimeFormatted: string;
  basedOn: string; // activity name
}

const RACE_DISTANCES = [
  { distance: 5000, label: '5K', i18nKey: 'racepredictor.5k' },
  { distance: 10000, label: '10K', i18nKey: 'racepredictor.10k' },
  { distance: 21097, label: 'Półmaraton', i18nKey: 'racepredictor.halfMarathon' },
  { distance: 42195, label: 'Maraton', i18nKey: 'racepredictor.marathon' },
] as const;

/**
 * Riegel formula: T2 = T1 × (D2/D1)^1.06
 */
export const predictRaceTime = (
  knownDist: number,
  knownTime: number,
  targetDist: number,
): number => {
  if (knownDist <= 0 || knownTime <= 0 || targetDist <= 0) return 0;
  return knownTime * Math.pow(targetDist / knownDist, 1.06);
};

/**
 * Find best effort: fastest pace activity within ±10% of target distance
 */
export const findBestEffort = (
  activities: StravaActivity[],
  minDist: number,
  maxDist: number,
): StravaActivity | null => {
  const candidates = activities.filter(
    a => isPaceActivity(a) &&
         a.distance && a.distance >= minDist && a.distance <= maxDist &&
         a.movingTime && a.movingTime > 0 &&
         a.averageSpeed && a.averageSpeed > 0,
  );

  if (candidates.length === 0) return null;

  return candidates.reduce((best, a) =>
    a.averageSpeed! > best.averageSpeed! ? a : best,
  );
};

/**
 * Get race predictions from best available effort
 */
export const getRacePredictions = (
  activities: StravaActivity[],
  lang: LanguageCode = 'pl',
): RacePrediction[] => {
  // Try to find best effort: prefer 10K > 5K > any run > 3km
  const searchOrder = [
    { minDist: 9000, maxDist: 11000 },  // ~10K
    { minDist: 4500, maxDist: 5500 },   // ~5K
    { minDist: 3000, maxDist: 50000 },  // any run > 3km
  ];

  let bestEffort: StravaActivity | null = null;
  for (const range of searchOrder) {
    bestEffort = findBestEffort(activities, range.minDist, range.maxDist);
    if (bestEffort) break;
  }

  if (!bestEffort || !bestEffort.distance || !bestEffort.movingTime) return [];

  return RACE_DISTANCES.map(({ distance, label, i18nKey }) => {
    const predicted = predictRaceTime(bestEffort!.distance!, bestEffort!.movingTime!, distance);
    return {
      distance,
      distanceLabel: label,
      displayLabel: translate(lang, i18nKey),
      predictedTime: Math.round(predicted),
      predictedTimeFormatted: formatDurationShort(Math.round(predicted)),
      basedOn: bestEffort!.name,
    };
  });
};
