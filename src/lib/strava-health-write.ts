type HealthGrant = { healthEpoch: number };

export type MaxHRWrite = {
  estimatedMaxHR: number;
  maxHRManualOverride: true;
  estimatedMaxHREpoch: number;
};

/** Buduje zapis Max HR wyłącznie w ramach bieżącej generacji zgody zdrowotnej. */
export const buildMaxHRWrite = (
  value: number,
  grant: HealthGrant | null,
): MaxHRWrite | null => {
  const estimatedMaxHR = Math.round(value);
  if (
    !Number.isFinite(value)
    || estimatedMaxHR < 100
    || estimatedMaxHR > 230
    || !grant
    || !Number.isSafeInteger(grant.healthEpoch)
    || grant.healthEpoch <= 0
  ) {
    return null;
  }

  return {
    estimatedMaxHR,
    maxHRManualOverride: true,
    estimatedMaxHREpoch: grant.healthEpoch,
  };
};
