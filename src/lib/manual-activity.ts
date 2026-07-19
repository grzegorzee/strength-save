import type { StravaActivity, UnifiedActivity } from '@/types/strava';

// Ręczne wpisy cardio (Z111): kolekcja manual_activities o kształcie PODZBIORU
// StravaActivity + source='manual'. Osobna kolekcja — sync Stravy nadpisuje swoją,
// mieszanie źródeł w jednej = konflikt z syncem. Jednostki kanoniczne: metry, sekundy.

export const MANUAL_ACTIVITY_TYPES = [
  'Run', 'Ride', 'Walk', 'Hike', 'Swim',
  'Treadmill', 'IndoorRide', 'JumpRope', 'HIIT', 'Other',
] as const;

export type ManualActivityType = (typeof MANUAL_ACTIVITY_TYPES)[number];

export type PerceivedIntensity = 'easy' | 'moderate' | 'hard';

export interface ManualActivityInput {
  type: string;
  /** YYYY-MM-DD */
  date: string;
  /** sekundy */
  movingTime: number;
  name?: string;
  /** metry */
  distance?: number;
  averageHeartrate?: number;
  calories?: number;
  perceivedIntensity?: PerceivedIntensity;
  description?: string;
}

export interface ManualActivity extends ManualActivityInput {
  id: string;
  userId: string;
  type: ManualActivityType;
  createdAt: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INTENSITIES: PerceivedIntensity[] = ['easy', 'moderate', 'hard'];

const numberInRange = (value: unknown, min: number, max: number): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;
  return parsed;
};

/**
 * Sanityzacja wpisu manualnego: typ z zamkniętej listy + czas > 0 obowiązkowe,
 * reszta opcjonalna (śmieciowe wartości POMIJANE, nie unieważniają wpisu),
 * zero undefined w wyniku (Firestore).
 */
export const sanitizeManualActivity = (input: ManualActivityInput): ManualActivityInput | null => {
  if (!(MANUAL_ACTIVITY_TYPES as readonly string[]).includes(input.type)) return null;
  if (!DATE_RE.test(input.date)) return null;
  const movingTime = numberInRange(input.movingTime, 1, 24 * 3600);
  if (movingTime === null) return null;

  const name = (input.name ?? '').trim().slice(0, 120);
  const description = (input.description ?? '').trim().slice(0, 2000);
  const distance = numberInRange(input.distance, 1, 1_000_000);
  const averageHeartrate = numberInRange(input.averageHeartrate, 30, 250);
  const calories = numberInRange(input.calories, 1, 20_000);
  const perceivedIntensity = INTENSITIES.includes(input.perceivedIntensity as PerceivedIntensity)
    ? input.perceivedIntensity
    : null;

  return {
    type: input.type,
    date: input.date,
    movingTime: Math.round(movingTime),
    ...(name && { name }),
    ...(description && { description }),
    ...(distance !== null && { distance }),
    ...(averageHeartrate !== null && { averageHeartrate }),
    ...(calories !== null && { calories }),
    ...(perceivedIntensity && { perceivedIntensity }),
  };
};

/** Wpis manualny w kształcie zunifikowanym (renderowalny przez komponenty Strava). */
export const manualActivityToUnified = (activity: ManualActivity): UnifiedActivity => ({
  id: activity.id,
  userId: activity.userId,
  stravaId: 0,
  name: activity.name ?? '',
  type: activity.type,
  date: activity.date,
  movingTime: activity.movingTime,
  ...(activity.distance !== undefined && { distance: activity.distance }),
  ...(activity.averageHeartrate !== undefined && { averageHeartrate: activity.averageHeartrate }),
  ...(activity.calories !== undefined && { calories: activity.calories }),
  ...(activity.description !== undefined && { description: activity.description }),
  stravaUrl: '',
  syncedAt: '',
  source: 'manual',
  ...(activity.perceivedIntensity && { perceivedIntensity: activity.perceivedIntensity }),
});

export const stravaToUnified = (activity: StravaActivity): UnifiedActivity => ({
  ...activity,
  source: 'strava',
});

/** Odzyskanie ManualActivity ze strumienia zunifikowanego (edycja wpisu z listy). */
export const unifiedToManual = (activity: UnifiedActivity): ManualActivity => ({
  id: activity.id,
  userId: activity.userId,
  type: activity.type as ManualActivityType,
  date: activity.date,
  movingTime: activity.movingTime ?? 0,
  ...(activity.name && { name: activity.name }),
  ...(activity.distance !== undefined && { distance: activity.distance }),
  ...(activity.averageHeartrate !== undefined && { averageHeartrate: activity.averageHeartrate }),
  ...(activity.calories !== undefined && { calories: activity.calories }),
  ...(activity.perceivedIntensity && { perceivedIntensity: activity.perceivedIntensity }),
  ...(activity.description && { description: activity.description }),
  createdAt: 0,
});

/** Scalony strumień aktywności: Strava + manual, malejąco po dacie (stabilnie po id). */
export const mergeActivities = (
  strava: StravaActivity[],
  manual: ManualActivity[],
): UnifiedActivity[] =>
  [...strava.map(stravaToUnified), ...manual.map(manualActivityToUnified)]
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
