import type { BodyMeasurement } from '@/types';
import type { TranslationKey } from '@/i18n';

// Serie i delty pomiarów ciała (Z77) — obwody przestają być zbierane na darmo.

export const MEASUREMENT_FIELDS = [
  'weight', 'chest', 'waist', 'hips',
  'armLeft', 'armRight', 'thighLeft', 'thighRight', 'calfLeft', 'calfRight',
] as const;

export type MeasurementField = typeof MEASUREMENT_FIELDS[number];

// Cel pola: w którą stronę zmiana jest "dobra" (kolor delty w UI).
// Talia/biodra: spadek = zielony (redukcja obwodu pasa). Mięśnie (ramię/udo/łydka/klatka):
// wzrost = zielony. Waga: neutralna — kierunek zależy od celu usera, nie wartościujemy.
export const MEASUREMENT_FIELD_GOALS: Record<MeasurementField, 'up' | 'down' | 'neutral'> = {
  weight: 'neutral',
  chest: 'up',
  waist: 'down',
  hips: 'down',
  armLeft: 'up',
  armRight: 'up',
  thighLeft: 'up',
  thighRight: 'up',
  calfLeft: 'up',
  calfRight: 'up',
};

/** Krótkie etykiety pól (chipy wykresu i lista pomiarów). */
export const MEASUREMENT_FIELD_LABEL_KEYS: Record<MeasurementField, TranslationKey> = {
  weight: 'measurements.short.weight',
  chest: 'measurements.short.chest',
  waist: 'measurements.short.waist',
  hips: 'measurements.short.hips',
  armLeft: 'measurements.short.armLeft',
  armRight: 'measurements.short.armRight',
  thighLeft: 'measurements.short.thighLeft',
  thighRight: 'measurements.short.thighRight',
  calfLeft: 'measurements.short.calfLeft',
  calfRight: 'measurements.short.calfRight',
};

export interface MeasurementSeriesPoint {
  date: string;
  value: number;
  /** Zmiana vs poprzedni pomiar tego pola; null dla pierwszego punktu. */
  delta: number | null;
}

export const buildMeasurementSeries = (
  measurements: BodyMeasurement[],
  field: MeasurementField,
): MeasurementSeriesPoint[] => {
  const points = measurements
    .filter((m) => typeof m[field] === 'number')
    .sort((a, b) => a.date.localeCompare(b.date));

  return points.map((m, index) => {
    const value = m[field] as number;
    const prev = index > 0 ? (points[index - 1][field] as number) : null;
    return {
      date: m.date,
      value,
      delta: prev === null ? null : Math.round((value - prev) * 10) / 10,
    };
  });
};
