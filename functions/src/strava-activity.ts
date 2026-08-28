/**
 * Pure mapping/diff helpers for Strava activities. Kept free of firebase-admin
 * imports so they can be unit-tested without the emulator.
 */

export interface StravaApiActivityInput {
  id: number;
  name: string;
  /** Strava deprecuje `type` na rzecz `sport_type` — mapper ma fallback (T6). */
  type?: string | null;
  start_date: string;
  start_date_local?: string;
  distance?: number | null;
  moving_time?: number | null;
  elapsed_time?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  total_elevation_gain?: number | null;
  average_speed?: number | null;
  calories?: number | null;
  description?: string | null;
  sport_type?: string | null;
  average_cadence?: number | null;
  trainer?: boolean | null;
  kudos_count?: number | null;
}

export interface StravaActivityDoc {
  userId: string;
  stravaId: number;
  name: string | null;
  type: string | null;
  date: string;
  distance: number | null;
  movingTime: number | null;
  elapsedTime: number | null;
  averageHeartrate?: number | null;
  maxHeartrate?: number | null;
  totalElevationGain: number | null;
  averageSpeed: number | null;
  calories?: number | null;
  description: string | null;
  sportType: string | null;
  averageCadence: number | null;
  startDateLocal: string | null;
  trainer: boolean | null;
  kudosCount: number | null;
  stravaUrl: string;
  syncedAt: string;
}

/**
 * Fields Strava can backfill or change after the first import (e.g. description
 * typed later, calories computed by their pipeline, kudos accumulating, an HR
 * stream uploaded from a watch). Used to decide whether a known activity needs
 * a refresh write. `date`, `startDateLocal`, `stravaUrl` and `syncedAt` are
 * intentionally excluded from the comparison.
 */
export const REFRESHABLE_ACTIVITY_FIELDS = [
  "name",
  "type",
  "distance",
  "movingTime",
  "elapsedTime",
  "averageHeartrate",
  "maxHeartrate",
  "totalElevationGain",
  "averageSpeed",
  "calories",
  "description",
  "sportType",
  "averageCadence",
  "trainer",
  "kudosCount",
] as const;

export type RefreshableField = (typeof REFRESHABLE_ACTIVITY_FIELDS)[number];

const STRAVA_HEALTH_ACTIVITY_FIELDS = new Set<RefreshableField>([
  "averageHeartrate",
  "maxHeartrate",
  "calories",
]);

/** T7: minimalny odstęp między RĘCZNYMI syncami (scheduled/callback bez limitu).
 *  X27/WP-C: podniesiony z 5 min do 24 h — manual to maks. drugi sync dziennie
 *  obok crona; łączny koszt API Stravy pozostaje ograniczony. */
export const MANUAL_SYNC_MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * T7: serwerowy rate-limit ręcznego syncu po users/{uid}.stravaLastSync.
 * Zwraca liczbę sekund do odczekania albo null, gdy sync może iść.
 * Pierwszy sync (brak/nieparsowalny lastSync) ZAWSZE przechodzi (zasada 6:
 * stan odmowy mija z czasem, komunikat mówi ile czekać).
 */
export function manualSyncRetryAfterSeconds(
  lastSyncIso: string | null | undefined,
  nowMs: number,
  minIntervalMs: number = MANUAL_SYNC_MIN_INTERVAL_MS,
): number | null {
  if (!lastSyncIso) return null;
  const lastMs = new Date(lastSyncIso).getTime();
  if (!Number.isFinite(lastMs)) return null;
  const elapsedMs = nowMs - lastMs;
  if (elapsedMs >= minIntervalMs) return null;
  return Math.ceil((minIntervalMs - elapsedMs) / 1000);
}

export function activityDateStr(activity: Pick<StravaApiActivityInput, "start_date_local" | "start_date">): string {
  return activity.start_date_local
    ? activity.start_date_local.split("T")[0]
    : new Date(activity.start_date).toISOString().split("T")[0];
}

export function mapStravaActivityToDoc(
  userId: string,
  activity: StravaApiActivityInput,
  syncedAt: string,
  includeHealthData: boolean,
): StravaActivityDoc {
  return {
    userId,
    stravaId: activity.id,
    name: activity.name,
    type: activity.type || activity.sport_type || null,
    date: activityDateStr(activity),
    distance: activity.distance || null,
    movingTime: activity.moving_time || null,
    elapsedTime: activity.elapsed_time || null,
    ...(includeHealthData ? {
      averageHeartrate: activity.average_heartrate || null,
      maxHeartrate: activity.max_heartrate || null,
      calories: activity.calories || null,
    } : {}),
    totalElevationGain: activity.total_elevation_gain || null,
    averageSpeed: activity.average_speed || null,
    description: activity.description || null,
    sportType: activity.sport_type || null,
    averageCadence: activity.average_cadence || null,
    startDateLocal: activity.start_date_local || null,
    trainer: activity.trainer ?? null,
    kudosCount: activity.kudos_count || null,
    stravaUrl: `https://www.strava.com/activities/${activity.id}`,
    syncedAt,
  };
}

/**
 * Returns the higher Strava-derived max HR that may be persisted, or null when
 * health processing is not allowed / not needed. The consent flag is required
 * explicitly so callers cannot accidentally derive health data by default.
 */
export function nextEstimatedMaxHr(
  activities: StravaApiActivityInput[],
  currentEstimatedMaxHr: unknown,
  manualOverride: boolean,
  includeHealthData: boolean,
): number | null {
  if (!includeHealthData || manualOverride) return null;

  const current = Number(currentEstimatedMaxHr || 0);
  const fetched = activities.reduce((max, activity) => (
    activity.max_heartrate && activity.max_heartrate > max ? activity.max_heartrate : max
  ), current);
  return fetched > current ? fetched : null;
}

/**
 * Source of already-stored activities. `getByIds` reads only the documents with
 * deterministic IDs for the activities fetched in THIS run (O(fetched) reads);
 * `queryAllForUser` is the legacy full-collection scan, kept for the one-off
 * initial sync (R2-08: incremental nightly sync must not bill the whole history).
 */
export interface ExistingActivitiesSource {
  queryAllForUser: () => Promise<Array<Partial<StravaActivityDoc>>>;
  getByIds: (activityIds: number[]) => Promise<Array<Partial<StravaActivityDoc> | null>>;
}

export async function loadExistingActivities(
  source: ExistingActivitiesSource,
  fetchedActivityIds: number[],
  useFullScan: boolean,
): Promise<Map<number, Partial<StravaActivityDoc>>> {
  const existing = new Map<number, Partial<StravaActivityDoc>>();

  if (useFullScan) {
    const docs = await source.queryAllForUser();
    docs.forEach((data) => {
      if (typeof data.stravaId === "number") existing.set(data.stravaId, data);
    });
    return existing;
  }

  if (fetchedActivityIds.length === 0) return existing;

  const docs = await source.getByIds(fetchedActivityIds);
  docs.forEach((data) => {
    if (data && typeof data.stravaId === "number") existing.set(data.stravaId, data);
  });
  return existing;
}

/**
 * Compare the refreshable fields of an incoming activity doc against the data
 * already stored. Returns a partial doc with only the changed fields (plus a
 * fresh `syncedAt`) for a merge write, or `null` when nothing changed.
 */
export function diffRefreshableFields(
  existing: Partial<StravaActivityDoc> | undefined,
  incoming: StravaActivityDoc,
  includeHealthData: boolean,
): Partial<StravaActivityDoc> | null {
  if (!existing) return null;
  const changes: Partial<StravaActivityDoc> = {};
  for (const field of REFRESHABLE_ACTIVITY_FIELDS) {
    if (!includeHealthData && STRAVA_HEALTH_ACTIVITY_FIELDS.has(field)) continue;
    const next = incoming[field] ?? null;
    const prev = existing[field] ?? null;
    if (next !== prev) {
      (changes as Record<string, unknown>)[field] = incoming[field];
    }
  }
  if (Object.keys(changes).length === 0) return null;
  changes.syncedAt = incoming.syncedAt;
  return changes;
}
