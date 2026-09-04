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

export const validateMeasurement = (
  input: MeasurementValidationInput,
  // WP-D D2: formularz zna zdjęcie tylko jako File (upload PO walidacji),
  // więc deklaruje je flagą; zapisany wpis niesie photoUrl w danych.
  // maxDate (opt-in, ISO): formularz dodawania odrzuca datę z przyszłości.
  // Hook i edycja istniejącego wpisu nie podają maxDate (kontrakt bez zmian).
  options?: { hasPhoto?: boolean; maxDate?: string },
): { valid: true } | { valid: false; field: string; reason?: 'future' } => {
  try {
    parseLocalDate(input.date);
  } catch {
    return { valid: false, field: 'date' };
  }
  // ISO YYYY-MM-DD porównuje się leksykograficznie (jak filtry Historii).
  if (options?.maxDate && input.date > options.maxDate) {
    return { valid: false, field: 'date', reason: 'future' };
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
  // WP-D D2: wpis tylko-zdjęcie jest pełnoprawny — zdjęcie liczy się jak pole.
  const hasPhoto = options?.hasPhoto === true
    || (typeof input.photoUrl === 'string' && input.photoUrl.length > 0);
  return values > 0 || hasPhoto ? { valid: true } : { valid: false, field: 'measurement' };
};
