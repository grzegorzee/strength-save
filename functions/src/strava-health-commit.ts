import { hasActiveHealthConsent } from './security';

/** Snapshot captured before the network fetch cannot authorize a later grant. */
export function stravaHealthGrantStillCurrent(snapshot: Record<string, unknown>, current: Record<string, unknown>): boolean {
  if (!hasActiveHealthConsent(snapshot) || !hasActiveHealthConsent(current)) return false;
  const before = snapshot.consents as Record<string, unknown>;
  const after = current.consents as Record<string, unknown>;
  return before.healthEpoch === after.healthEpoch && before.healthGrantId === after.healthGrantId;
}
