export type UnitSystem = 'kg' | 'lbs';

const KG_TO_LBS = 2.2046226218;
const CM_TO_IN = 0.3937007874;

export const kgToLbs = (kg: number): number => kg * KG_TO_LBS;
export const lbsToKg = (lbs: number): number => lbs / KG_TO_LBS;
export const cmToInches = (cm: number): number => cm * CM_TO_IN;
export const inchesToCm = (inches: number): number => inches / CM_TO_IN;

/** Ciężar zapisany w kg → wartość w wybranej jednostce (do wyświetlenia/edycji). */
export const toDisplayWeight = (kg: number, unit: UnitSystem): number =>
  unit === 'lbs' ? kgToLbs(kg) : kg;

/** Wartość wpisana przez użytkownika (w wybranej jednostce) → kg (do zapisu). */
export const fromInputWeight = (value: number, unit: UnitSystem): number =>
  unit === 'lbs' ? lbsToKg(value) : value;

/** Obwod zapisany w cm → wartość w wybranej jednostce (do wyświetlenia/edycji). */
export const toDisplayLength = (cm: number, unit: UnitSystem): number =>
  unit === 'lbs' ? cmToInches(cm) : cm;

/** Obwod wpisany przez użytkownika → cm (do zapisu). */
export const fromInputLength = (value: number, unit: UnitSystem): number =>
  unit === 'lbs' ? inchesToCm(value) : value;

interface FormatOpts {
  decimals?: number;
  withUnit?: boolean;
}

/** Formatuje ciężar (zapisany w kg) w wybranej jednostce, np. "92.5 kg" / "204 lbs". */
export const formatWeight = (kg: number, unit: UnitSystem, opts: FormatOpts = {}): string => {
  const v = toDisplayWeight(kg, unit);
  const decimals = opts.decimals ?? (Number.isInteger(v) ? 0 : 1);
  const str = v.toFixed(decimals);
  return opts.withUnit === false ? str : `${str} ${unit}`;
};

/** Etykieta jednostki wagi: "kg" / "lbs". */
export const weightUnitLabel = (unit: UnitSystem): string => unit;
export const lengthUnitLabel = (unit: UnitSystem): string => unit === 'lbs' ? 'in' : 'cm';

export const formatLength = (cm: number, unit: UnitSystem, opts: FormatOpts = {}): string => {
  const v = toDisplayLength(cm, unit);
  const decimals = opts.decimals ?? (Number.isInteger(v) ? 0 : 1);
  const str = v.toFixed(decimals);
  return opts.withUnit === false ? str : `${str} ${lengthUnitLabel(unit)}`;
};

/**
 * Zwięzły tonaż (suma kg) w wybranej jednostce.
 * kg → "12.3 t", lbs → "27.1 k lbs" (tysiące funtów).
 */
export const formatTonnage = (kg: number, unit: UnitSystem): string => {
  if (unit === 'lbs') {
    return `${(kgToLbs(kg) / 1000).toFixed(1)} k lbs`;
  }
  return `${(kg / 1000).toFixed(1)} t`;
};
