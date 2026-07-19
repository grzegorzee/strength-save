import type { SetData } from '@/types';
import type { TrackingType } from '@/lib/set-tracking';

// Generator serii rozgrzewkowych z %1RM (Z108): pusty gryf x10, 50% x8, 70% x5, 90% x2.
// Czysta funkcja, zero backendu. Procenty liczone od ciężaru ROBOCZEGO (praktyka siłowni),
// zaokrąglanie do 2.5 kg, serie nie cięższe niż gryf pomijane (pusty gryf już jest w schemacie).

const WARMUP_SCHEME: Array<{ percent: number; reps: number }> = [
  { percent: 0.5, reps: 8 },
  { percent: 0.7, reps: 5 },
  { percent: 0.9, reps: 2 },
];

// W DÓŁ do 2.5 kg — lżejsza rozgrzewka jest bezpieczniejsza niż cięższa.
const roundTo2p5 = (kg: number): number => Math.floor(kg / 2.5) * 2.5;

export const generateWarmupSets = (
  workingWeightKg: number,
  tracking: TrackingType,
  barKg: number,
): SetData[] | null => {
  if (tracking !== 'weight_reps' && tracking !== 'weight_distance_duration') return null;
  if (workingWeightKg <= 0) return null;

  const sets: SetData[] = [
    { reps: 10, weight: barKg, completed: false, isWarmup: true },
  ];

  for (const { percent, reps } of WARMUP_SCHEME) {
    const weight = roundTo2p5(workingWeightKg * percent);
    if (weight <= barKg) continue;
    if (weight >= workingWeightKg) continue;
    sets.push({ reps, weight, completed: false, isWarmup: true });
  }

  return sets;
};
