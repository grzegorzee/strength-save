import type { SetData } from '@/types';
import type { TrackingType } from '@/lib/set-tracking';
import { computePlates, type PlateInventoryItem } from '@/lib/plate-calculator';
import { rampSchemeFor, type WarmupEquipment } from '@/lib/prestart-warmup';

// Generator serii rozgrzewkowych od ciężaru ROBOCZEGO (Z108, praktyka siłowni).
// X37 WP-B: procenty wg researchu (Nippard, RP, Barbell Logic), jeden schemat
// z dialogiem rozgrzewki (rampSchemeFor): sztanga gryf x8, 50% x5, 70% x3,
// 85% x1 (roboczy <60 kg: gryf x8, 60% x4, 85% x1; >150 kg dodatkowo 40% x5);
// hantle/maszyna 50% x8, 75% x3 bez pustego gryfu. Czysta funkcja, zero backendu.
// Serie nie cięższe niż gryf pomijane (pusty gryf już jest w schemacie).
//
// X17B Z134.2: zaokrąglanie do REALNIE dostępnych talerzy, gdy znamy inwentarz.
// Wcześniej schodziło do abstrakcyjnych 2,5 kg. Na siłowni z samymi dwudziestkami
// apka proponowała 84 kg, których nie da się złożyć. Wzorzec Hevy.

// W DÓŁ do 2.5 kg. Lżejsza rozgrzewka jest bezpieczniejsza niż cięższa.
const roundTo2p5 = (kg: number): number => Math.floor(kg / 2.5) * 2.5;

export const generateWarmupSets = (
  workingWeightKg: number,
  tracking: TrackingType,
  barKg: number,
  inventory?: PlateInventoryItem[],
  /** Sprzęt pierwszego ćwiczenia; domyślnie sztanga (dotychczasowe zachowanie karty). */
  equipment: WarmupEquipment = 'barbell',
): SetData[] | null => {
  if (tracking !== 'weight_reps' && tracking !== 'weight_distance_duration') return null;
  if (workingWeightKg <= 0) return null;

  const barbell = equipment === 'barbell';
  // Znany inwentarz => schodzimy do najbliższego SKŁADALNEGO ciężaru (computePlates
  // i tak schodzi w dół). Brak inwentarza albo hantle/maszyna => 2,5 kg.
  const roundDown = barbell && inventory && inventory.length > 0
    ? (kg: number) => computePlates(kg, barKg, inventory).achievedKg
    : roundTo2p5;
  // Próg "nie lżej niż": gryf dla sztangi, zero dla hantli/maszyn.
  const floorKg = barbell ? barKg : 0;

  const sets: SetData[] = [];
  const used = new Set<number>();
  for (const { pct, reps } of rampSchemeFor(equipment, workingWeightKg)) {
    const weight = pct === 0 ? barKg : roundDown((workingWeightKg * pct) / 100);
    if (pct !== 0 && weight <= floorKg) continue;
    if (pct !== 0 && weight >= workingWeightKg) continue;
    // Ubogi inwentarz potrafi zbić kilka procentów do tego samego ciężaru:
    // powtórzony wiersz rozgrzewki nie niesie informacji.
    if (used.has(weight)) continue;
    used.add(weight);
    sets.push({ reps, weight, completed: false, isWarmup: true });
  }

  return sets;
};
