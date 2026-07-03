/**
 * Pure mapping/diff helpers for Strava activities. Kept free of firebase-admin
 * imports so they can be unit-tested without the emulator.
 */

export interface StravaApiActivityInput {
  id: number;
  name: string;
  type: string;
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
  averageHeartrate: number | null;
  maxHeartrate: number | null;
  totalElevationGain: number | null;
  averageSpeed: number | null;
  calories: number | null;
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

export function activityDateStr(activity: Pick<StravaApiActivityInput, "start_date_local" | "start_date">): string {
  return activity.start_date_local
    ? activity.start_date_local.split("T")[0]
    : new Date(activity.start_date).toISOString().split("T")[0];
}

export function mapStravaActivityToDoc(
  userId: string,
  activity: StravaApiActivityInput,
  syncedAt: string,
): StravaActivityDoc {
  return {
    userId,
    stravaId: activity.id,
    name: activity.name,
    type: activity.type,
    date: activityDateStr(activity),
    distance: activity.distance || null,
    movingTime: activity.moving_time || null,
    elapsedTime: activity.elapsed_time || null,
    averageHeartrate: activity.average_heartrate || null,
    maxHeartrate: activity.max_heartrate || null,
    totalElevationGain: activity.total_elevation_gain || null,
    averageSpeed: activity.average_speed || null,
    calories: activity.calories || null,
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
): Partial<StravaActivityDoc> | null {
  if (!existing) return null;
  const changes: Partial<StravaActivityDoc> = {};
  for (const field of REFRESHABLE_ACTIVITY_FIELDS) {
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
