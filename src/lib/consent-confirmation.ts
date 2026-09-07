import type { ConsentMirror } from '@/lib/legal-versions';

/** Retain unobserved confirmations without masking a newer health decision. */
export function reconcileConsentConfirmation(
  pending: ConsentMirror,
  observed: ConsentMirror | undefined,
): ConsentMirror | null {
  const remaining = { ...pending };
  if (Number.isSafeInteger(observed?.healthEpoch)
    && (observed?.healthEpoch ?? 0) > (pending.healthEpoch ?? 0)) {
    delete remaining.healthGranted;
    delete remaining.healthVersion;
    delete remaining.healthEpoch;
    delete remaining.healthGrantId;
  }
  return Object.entries(remaining).every(([key, value]) => observed?.[key as keyof ConsentMirror] === value)
    ? null
    : remaining;
}
