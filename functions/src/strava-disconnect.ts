/**
 * Pure orchestration of the Strava disconnect policy, extracted from the
 * callable so the ordering and cleanup guarantees are unit-testable.
 *
 * Policy: disconnect removes the imported strava_activities (no orphans),
 * then drops the connection doc and clears the Strava fields on the profile.
 * Activities go first: if their paginated delete fails, the user still looks
 * connected and can simply retry the disconnect.
 */
export interface StravaDisconnectDeps {
  deleteActivities: (userId: string) => Promise<number>;
  deleteConnection: (userId: string) => Promise<unknown>;
  clearProfile: (userId: string) => Promise<unknown>;
}

export interface StravaDisconnectResult {
  deletedActivities: number;
}

export async function disconnectStravaForUser(
  userId: string,
  deps: StravaDisconnectDeps,
): Promise<StravaDisconnectResult> {
  const deletedActivities = await deps.deleteActivities(userId);

  // A missing connection doc must not block clearing the profile flags.
  await deps.deleteConnection(userId).catch(() => undefined);

  await deps.clearProfile(userId);

  return { deletedActivities };
}
