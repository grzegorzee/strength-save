// Kalkulator talerzy (Z107): czysta funkcja, zero backendu.
// Inwentarz w localStorage per urządzenie (v1 bez syncu — prostota).
//
// X17B Z132: dochodzi tryb bez gryfu (maszyna/hantle), preset imperialny i
// suggestAchievable (najbliższa waga w dół I w górę). Rdzeń greedy w GRAMACH
// jako integer zostaje — to on chroni przed błędami float przy 1,25 kg.

import { kgToLbs, lbsToKg } from '@/lib/units';

export interface PlateInventoryItem {
  weightKg: number;
  /** ŁĄCZNA liczba talerzy tego rozmiaru (na stronę wchodzi floor(count/2)). */
  count: number;
}

export interface PlateCalcOptions {
  /**
   * Tryb bez gryfu (maszyna ładowana talerzami, hantle składane): cała waga idzie
   * na JEDNĄ stronę i sztuki NIE są parowane — 3 talerze 5 kg to realne 15 kg.
   */
  noBar?: boolean;
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

/** Jednostka, w której siłownia opisuje talerze — niezależna od jednostki wyświetlania usera. */
export type PlateInventoryUnit = 'kg' | 'lbs';

/**
 * Nominał z talerza (to, co na nim napisane): 20.412 kg w inwentarzu lbs to talerz "45".
 * Model zostaje w kg — konwersja wyłącznie do prezentacji.
 */
export const formatPlateNominal = (weightKg: number, unit: PlateInventoryUnit): number =>
  Math.round((unit === 'lbs' ? kgToLbs(weightKg) : weightKg) * 1000) / 1000;

/**
 * Preset imperialny (45/35/25/10/5/2.5 lb) trzymany w KG — kg jest kanoniczne
 * w całym modelu, przeliczenie na lbs robi dopiero UI (`useUnit`).
 */
export const DEFAULT_PLATE_INVENTORY_LB: PlateInventoryItem[] = [45, 35, 25, 10, 5, 2.5]
  .map((lb) => ({ weightKg: lbsToKg(lb), count: lb >= 25 ? 8 : 4 }));

export const computePlates = (
  targetKg: number,
  barKg: number,
  inventory: PlateInventoryItem[],
  options: PlateCalcOptions = {},
): PlateCalcResult => {
  const noBar = options.noBar === true;
  const effectiveBarKg = noBar ? 0 : barKg;

  if (targetKg < effectiveBarKg) {
    return { perSide: [], achievedKg: effectiveBarKg, exact: false, belowBar: true };
  }

  // Greedy od najcięższych; liczymy w gramach (integer), żeby uniknąć błędów float przy 1.25.
  // Bez gryfu sztuki nie muszą być parowane, więc próg dostępności to 1, nie 2.
  const minCount = noBar ? 1 : 2;
  const sorted = [...inventory]
    .filter((item) => item.weightKg > 0 && item.count >= minCount)
    .sort((a, b) => b.weightKg - a.weightKg);

  // Z gryfem waga dzieli się na dwie strony; bez gryfu cała idzie na jedną.
  let remainingG = Math.round((noBar ? targetKg : (targetKg - effectiveBarKg) / 2) * 1000);
  const perSide: { weightKg: number; count: number }[] = [];

  for (const item of sorted) {
    const plateG = Math.round(item.weightKg * 1000);
    const available = noBar ? item.count : Math.floor(item.count / 2);
    const used = Math.min(Math.floor(remainingG / plateG), available);
    if (used > 0) {
      perSide.push({ weightKg: item.weightKg, count: used });
      remainingG -= used * plateG;
    }
  }

  const perSideKg = perSide.reduce((sum, p) => sum + p.weightKg * p.count, 0);
  const achievedKg = noBar ? perSideKg : effectiveBarKg + 2 * perSideKg;

  return {
    perSide,
    achievedKg: Math.round(achievedKg * 1000) / 1000,
    exact: remainingG === 0,
    belowBar: false,
  };
};

export interface AchievableSuggestion {
  /** Najbliższy osiągalny ciężar NIE WIĘKSZY niż cel (zawsze istnieje: w skrajności sam gryf). */
  down: PlateCalcResult;
  /** Najbliższy osiągalny ciężar WIĘKSZY niż cel; null gdy inwentarz się kończy. */
  up: PlateCalcResult | null;
  exact: boolean;
  /** Nominał, którego brak w inwentarzu blokuje trafienie w cel (gdy o to chodzi). */
  missingPlateKg?: number;
}

/**
 * Z132.2: `computePlates` schodzi wyłącznie w dół i mówi tylko „exact: false".
 * Na siłowni user potrzebuje decyzji: wziąć mniej czy więcej. Pokazujemy OBIE
 * strony (Stronger) i nominał, którego brakuje (Stronglifts).
 */
export const suggestAchievable = (
  targetKg: number,
  barKg: number,
  inventory: PlateInventoryItem[],
  options: PlateCalcOptions = {},
): AchievableSuggestion => {
  const down = computePlates(targetKg, barKg, inventory, options);
  if (down.exact) return { down, up: down, exact: true };

  // Krok siatki: najmniejszy nominał, który realnie da się dołożyć.
  const noBar = options.noBar === true;
  const minCount = noBar ? 1 : 2;
  const usable = inventory.filter((i) => i.weightKg > 0 && i.count >= minCount);
  if (usable.length === 0) return { down, up: null, exact: false };

  const stepKg = Math.min(...usable.map((i) => i.weightKg)) * (noBar ? 1 : 2);

  // Szukamy pierwszego osiągalnego ciężaru POWYŻEJ celu, idąc po siatce kroku.
  // Limit iteracji chroni przed pętlą, gdy inwentarz nie pozwala już dołożyć nic.
  const maxLoadKg = usable.reduce(
    (sum, i) => sum + i.weightKg * (noBar ? i.count : Math.floor(i.count / 2) * 2),
    0,
  );
  const ceilingKg = (noBar ? 0 : barKg) + maxLoadKg;

  let up: PlateCalcResult | null = null;
  for (let probe = down.achievedKg + stepKg; probe <= ceilingKg + 1e-6; probe += stepKg) {
    const candidate = computePlates(probe, barKg, inventory, options);
    if (candidate.exact && candidate.achievedKg > targetKg) {
      up = candidate;
      break;
    }
  }

  // Brakujący nominał: różnica do celu na JEDNĄ stronę, gdy jest sensownym półnominałem.
  const gapPerSideKg = noBar ? targetKg - down.achievedKg : (targetKg - down.achievedKg) / 2;
  const rounded = Math.round(gapPerSideKg * 1000) / 1000;
  const owned = new Set(inventory.map((i) => Math.round(i.weightKg * 1000)));
  const missingPlateKg = rounded > 0 && !owned.has(Math.round(rounded * 1000)) ? rounded : undefined;

  return { down, up, exact: false, ...(missingPlateKg !== undefined && { missingPlateKg }) };
};

/** Inwentarz z localStorage albo default (uszkodzony zapis => default). */
export const loadPlateInventory = (): { barKg: number; plates: PlateInventoryItem[]; unit: PlateInventoryUnit } => {
  try {
    const raw = window.localStorage.getItem(PLATE_INVENTORY_STORAGE_KEY);
    if (!raw) return { barKg: DEFAULT_BAR_KG, plates: DEFAULT_PLATE_INVENTORY, unit: 'kg' };
    const parsed = JSON.parse(raw) as { barKg?: number; plates?: PlateInventoryItem[]; unit?: string };
    // Z132.1: gryf spoza presetów jest legalny (techniczny 7,5 kg, trap bar, 0 = brak
    // gryfu). Odrzucamy tylko wartości bez sensu fizycznego. BAR_OPTIONS_KG zostaje
    // listą skrótów w UI, nie walidatorem.
    const bar = parsed.barKg;
    const barValid = typeof bar === 'number' && Number.isFinite(bar) && bar >= 0 && bar <= 100;
    return {
      barKg: barValid ? bar : DEFAULT_BAR_KG,
      plates: Array.isArray(parsed.plates) && parsed.plates.length > 0
        ? parsed.plates.filter((p) => typeof p.weightKg === 'number' && typeof p.count === 'number')
        : DEFAULT_PLATE_INVENTORY,
      // Zapisy legacy nie mają pola unit → kg (dotychczasowe zachowanie).
      unit: parsed.unit === 'lbs' ? 'lbs' : 'kg',
    };
  } catch {
    return { barKg: DEFAULT_BAR_KG, plates: DEFAULT_PLATE_INVENTORY, unit: 'kg' };
  }
};

export const savePlateInventory = (barKg: number, plates: PlateInventoryItem[], unit: PlateInventoryUnit = 'kg'): void => {
  try {
    window.localStorage.setItem(PLATE_INVENTORY_STORAGE_KEY, JSON.stringify({ barKg, plates, unit }));
  } catch { /* localStorage niedostępne — ignoruj */ }
};
