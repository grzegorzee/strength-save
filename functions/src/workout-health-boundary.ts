import { LEGAL_VERSIONS } from "./legal-versions";

export interface WorkoutHealthConsentState {
  healthGranted?: unknown;
  healthVersion?: unknown;
  healthEpoch?: unknown;
  healthGrantId?: unknown;
}

export interface WorkoutHealthGrant {
  healthEpoch: number;
  healthGrantId: string;
}

export interface WorkoutHealthBoundaryResult {
  exercises: Record<string, unknown>[];
  healthGrant: WorkoutHealthGrant | null;
  strippedHealthFieldCount: number;
}

const HEALTH_FIELDS = ["rpe", "pain", "quality"] as const;

const activeHealthGrant = (
  consent: WorkoutHealthConsentState | null | undefined,
): WorkoutHealthGrant | null => {
  if (
    consent?.healthGranted !== true
    || consent.healthVersion !== LEGAL_VERSIONS.health
    || !Number.isSafeInteger(consent.healthEpoch)
    || (consent.healthEpoch as number) <= 0
    || typeof consent.healthGrantId !== "string"
    || consent.healthGrantId.trim().length === 0
  ) {
    return null;
  }

  return {
    healthEpoch: consent.healthEpoch as number,
    healthGrantId: consent.healthGrantId,
  };
};

const isAlignedNumber = (value: unknown, min: number, max: number, step: number): value is number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    return false;
  }
  const units = (value - min) / step;
  return Math.abs(units - Math.round(units)) < Number.EPSILON * 8;
};

const isValidMetric = (field: typeof HEALTH_FIELDS[number], value: unknown): value is number => {
  if (field === "rpe") return isAlignedNumber(value, 0, 10, 0.5);
  if (field === "pain") return isAlignedNumber(value, 0, 10, 1);
  return isAlignedNumber(value, 0, 5, 1);
};

/**
 * Fail-closed boundary for health fields embedded in workout exercises.
 *
 * This helper deliberately does not validate or reshape the base workout. The
 * caller's workout schema validator remains responsible for exercise IDs, sets,
 * notes and other non-health fields. Here we only guarantee that RPE, pain and
 * quality leave the boundary when an explicit current grant authorizes them.
 */
export function applyWorkoutHealthConsentBoundary(
  exercises: ReadonlyArray<Record<string, unknown>>,
  consent: WorkoutHealthConsentState | null | undefined,
): WorkoutHealthBoundaryResult {
  const healthGrant = activeHealthGrant(consent);
  let strippedHealthFieldCount = 0;

  const sanitized = exercises.map((exercise) => {
    const next: Record<string, unknown> = { ...exercise };
    for (const field of HEALTH_FIELDS) {
      if (!(field in next)) continue;
      if (!healthGrant || !isValidMetric(field, next[field])) {
        delete next[field];
        strippedHealthFieldCount += 1;
      }
    }
    return next;
  });

  return {
    exercises: sanitized,
    healthGrant,
    strippedHealthFieldCount,
  };
}
