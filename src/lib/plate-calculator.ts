// Kalkulator talerzy (Z107): czysta funkcja, zero backendu.
// Inwentarz w localStorage per urządzenie (v1 bez syncu — prostota).

export interface PlateInventoryItem {
  weightKg: number;
  /** ŁĄCZNA liczba talerzy tego rozmiaru (na stronę wchodzi floor(count/2)). */
  count: number;
}

export interface PlateCalcResult {
  /** Talerze na JEDNĄ stronę gryfu, od najcięższych. */
  perSide: { weightKg: number; count: number }[];
  /** Faktycznie osiągalny ciężar (gryf + 2 x strona). */
  achievedKg: number;
  exact: boolean;
  /** Cel mniejszy niż sam gryf. */
  belowBar: boolean;
}

export const DEFAULT_BAR_KG = 20;
export const BAR_OPTIONS_KG = [20, 15, 10];

export const DEFAULT_PLATE_INVENTORY: PlateInventoryItem[] = [
  { weightKg: 25, count: 8 },
  { weightKg: 20, count: 8 },
  { weightKg: 15, count: 4 },
  { weightKg: 10, count: 4 },
  { weightKg: 5, count: 4 },
  { weightKg: 2.5, count: 4 },
  { weightKg: 1.25, count: 4 },
];

export const PLATE_INVENTORY_STORAGE_KEY = 'fittracker_plate_inventory_v1';

export const computePlates = (
  targetKg: number,
  barKg: number,
  inventory: PlateInventoryItem[],
): PlateCalcResult => {
  if (targetKg < barKg) {
    return { perSide: [], achievedKg: barKg, exact: false, belowBar: true };
  }

  // Greedy od najcięższych; liczymy w gramach (integer), żeby uniknąć błędów float przy 1.25.
  const sorted = [...inventory]
    .filter((item) => item.weightKg > 0 && item.count >= 2)
    .sort((a, b) => b.weightKg - a.weightKg);

  let remainingG = Math.round(((targetKg - barKg) / 2) * 1000);
  const perSide: { weightKg: number; count: number }[] = [];

  for (const item of sorted) {
    const plateG = Math.round(item.weightKg * 1000);
    const available = Math.floor(item.count / 2);
    const used = Math.min(Math.floor(remainingG / plateG), available);
    if (used > 0) {
      perSide.push({ weightKg: item.weightKg, count: used });
      remainingG -= used * plateG;
    }
  }

  const perSideKg = perSide.reduce((sum, p) => sum + p.weightKg * p.count, 0);
  const achievedKg = barKg + 2 * perSideKg;

  return {
    perSide,
    achievedKg: Math.round(achievedKg * 1000) / 1000,
    exact: remainingG === 0,
    belowBar: false,
  };
};

/** Inwentarz z localStorage albo default (uszkodzony zapis => default). */
export const loadPlateInventory = (): { barKg: number; plates: PlateInventoryItem[] } => {
  try {
    const raw = window.localStorage.getItem(PLATE_INVENTORY_STORAGE_KEY);
    if (!raw) return { barKg: DEFAULT_BAR_KG, plates: DEFAULT_PLATE_INVENTORY };
    const parsed = JSON.parse(raw) as { barKg?: number; plates?: PlateInventoryItem[] };
    return {
      barKg: BAR_OPTIONS_KG.includes(parsed.barKg ?? 0) ? parsed.barKg! : DEFAULT_BAR_KG,
      plates: Array.isArray(parsed.plates) && parsed.plates.length > 0
        ? parsed.plates.filter((p) => typeof p.weightKg === 'number' && typeof p.count === 'number')
        : DEFAULT_PLATE_INVENTORY,
    };
  } catch {
    return { barKg: DEFAULT_BAR_KG, plates: DEFAULT_PLATE_INVENTORY };
  }
};

export const savePlateInventory = (barKg: number, plates: PlateInventoryItem[]): void => {
  try {
    window.localStorage.setItem(PLATE_INVENTORY_STORAGE_KEY, JSON.stringify({ barKg, plates }));
  } catch { /* localStorage niedostępne — ignoruj */ }
};
