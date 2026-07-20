import type { SetData } from '@/types';
import type { TrackingType } from '@/lib/set-tracking';
import { computePlates, type PlateInventoryItem } from '@/lib/plate-calculator';

// Generator serii rozgrzewkowych z %1RM (Z108): pusty gryf x10, 50% x8, 70% x5, 90% x2.
// Czysta funkcja, zero backendu. Procenty liczone od ciężaru ROBOCZEGO (praktyka siłowni),
// serie nie cięższe niż gryf pomijane (pusty gryf już jest w schemacie).
//
// X17B Z134.2: zaokrąglanie do REALNIE dostępnych talerzy, gdy znamy inwentarz.
// Wcześniej schodziło do abstrakcyjnych 2,5 kg — na siłowni z samymi dwudziestkami
// apka proponowała 84 kg, których nie da się złożyć. Wzorzec Hevy.

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
  inventory?: PlateInventoryItem[],
): SetData[] | null => {
  if (tracking !== 'weight_reps' && tracking !== 'weight_distance_duration') return null;
  if (workingWeightKg <= 0) return null;

  // Znany inwentarz => schodzimy do najbliższego SKŁADALNEGO ciężaru (computePlates
  // i tak schodzi w dół). Brak inwentarza => dotychczasowe 2,5 kg.
  const roundDown = inventory && inventory.length > 0
    ? (kg: number) => computePlates(kg, barKg, inventory).achievedKg
    : roundTo2p5;

  const sets: SetData[] = [
    { reps: 10, weight: barKg, completed: false, isWarmup: true },
  ];

  const used = new Set<number>([barKg]);
  for (const { percent, reps } of WARMUP_SCHEME) {
    const weight = roundDown(workingWeightKg * percent);
    if (weight <= barKg) continue;
    if (weight >= workingWeightKg) continue;
    // Ubogi inwentarz potrafi zbić kilka procentów do tego samego ciężaru —
    // powtórzony wiersz rozgrzewki nie niesie informacji.
    if (used.has(weight)) continue;
    used.add(weight);
    sets.push({ reps, weight, completed: false, isWarmup: true });
  }

  return sets;
};
