import type { ExerciseBest } from '@/lib/pr-utils';

// B-T2: fakt i estymacja są rozdzielone (niezmiennik 6 planu audytu).
// Szacowany 1RM istnieje TYLKO z widocznym źródłem (seria, z której policzono
// Epleya); rekord faktycznie podniesionego ciężaru prezentujemy osobno.

export interface Est1RMBadge {
  valueKg: number;
  sourceWeightKg: number;
  sourceReps: number;
}

export interface MaxLiftBadge {
  weightKg: number;
}

export interface RecordBadges {
  est1RM: Est1RMBadge | null;
  maxLift: MaxLiftBadge | null;
}

export const buildRecordBadges = (best: ExerciseBest | null | undefined): RecordBadges => {
  if (!best) return { est1RM: null, maxLift: null };
  const est1RM =
    best.best1RM > 0 && best.best1RMWeight > 0 && best.best1RMReps > 0
      ? {
          valueKg: best.best1RM,
          sourceWeightKg: best.best1RMWeight,
          sourceReps: best.best1RMReps,
        }
      : null;
  const maxLift = best.maxWeight > 0 ? { weightKg: best.maxWeight } : null;
  return { est1RM, maxLift };
};

/** Tekst badge'a estymacji: "Szac. 1RM 72 kg · 60×6" (jednostki przez fmtWeight). */
export const formatEst1RMBadge = (
  badge: Est1RMBadge,
  label: string,
  fmtWeight: (kg: number) => string,
): string =>
  `${label} ${fmtWeight(badge.valueKg)} · ${fmtWeight(badge.sourceWeightKg)}×${badge.sourceReps}`;

/** Tekst badge'a faktu: "Max 100 kg". */
export const formatMaxLiftBadge = (
  badge: MaxLiftBadge,
  label: string,
  fmtWeight: (kg: number) => string,
): string => `${label} ${fmtWeight(badge.weightKg)}`;
