import { parseLocalDate } from '@/lib/utils';

export const MEASUREMENT_LIMITS = {
  weight: [20, 500],
  armLeft: [10, 100], armRight: [10, 100],
  chest: [30, 250], waist: [30, 250], hips: [30, 250],
  thighLeft: [15, 150], thighRight: [15, 150], calfLeft: [10, 100], calfRight: [10, 100],
} as const;

export type MeasurementField = keyof typeof MEASUREMENT_LIMITS;

export interface MeasurementValidationInput {
  date: string;
  [field: string]: unknown;
}

export const validateMeasurement = (input: MeasurementValidationInput): { valid: true } | { valid: false; field: string } => {
  try {
    parseLocalDate(input.date);
  } catch {
    return { valid: false, field: 'date' };
  }

  let values = 0;
  for (const [field, [min, max]] of Object.entries(MEASUREMENT_LIMITS)) {
    const value = input[field];
    if (value === undefined) continue;
    values += 1;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      return { valid: false, field };
    }
  }
  return values > 0 ? { valid: true } : { valid: false, field: 'measurement' };
};
