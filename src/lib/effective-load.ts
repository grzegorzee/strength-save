import type { SetData } from '@/types';
import type { TrackingType } from '@/lib/set-tracking';

/**
 * Obciążenie efektywne serii (Z106) — wspólna waluta porównań PR/progresji per typ:
 * - weight_reps / weight_distance_duration: ciężar zewnętrzny,
 * - bodyweight_reps: masa ciała (null gdy nieznana),
 * - assisted_bodyweight: masa ciała MINUS asysta (mniejsza asysta = większe obciążenie;
 *   null gdy brak pomiaru wagi — wtedy PR tylko po powtórzeniach),
 * - duration: null (czas nie jest obciążeniem).
 */
export const computeEffectiveLoad = (
  set: SetData,
  tracking: TrackingType,
  bodyWeightKg: number | null,
): number | null => {
  switch (tracking) {
    case 'weight_reps':
    case 'weight_distance_duration':
      return set.weight;
    case 'bodyweight_reps':
      return bodyWeightKg ?? null;
    case 'assisted_bodyweight':
      if (bodyWeightKg === null) return null;
      return Math.max(0, bodyWeightKg - (set.assistWeight ?? 0));
    case 'duration':
      return null;
  }
};
