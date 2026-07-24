import { describe, expect, it, beforeEach } from 'vitest';
import {
  computePlates,
  formatPlateNominal,
  suggestAchievable,
  loadPlateInventory,
  savePlateInventory,
  DEFAULT_PLATE_INVENTORY,
  DEFAULT_PLATE_INVENTORY_LB,
  PLATE_INVENTORY_STORAGE_KEY,
  type PlateInventoryItem,
} from '@/lib/plate-calculator';
import { lbsToKg } from '@/lib/units';

const inv = (...items: Array<[number, number]>): PlateInventoryItem[] =>
  items.map(([weightKg, count]) => ({ weightKg, count }));

describe('computePlates (Z107)', () => {
  it('rozkłada cel na talerze na stronę, greedy od najcięższych', () => {
    // 100 kg na gryfie 20: 40 kg na stronę = 25 + 15
    const result = computePlates(100, 20, inv([25, 4], [20, 4], [15, 4], [10, 4], [5, 4], [2.5, 4]));
    expect(result.perSide).toEqual([
      { weightKg: 25, count: 1 },
      { weightKg: 15, count: 1 },
    ]);
    expect(result.achievedKg).toBe(100);
    expect(result.exact).toBe(true);
    expect(result.belowBar).toBe(false);
  });

  it('cel < gryf => belowBar, bez talerzy', () => {
    const result = computePlates(15, 20, DEFAULT_PLATE_INVENTORY);
    expect(result.belowBar).toBe(true);
    expect(result.perSide).toEqual([]);
    expect(result.achievedKg).toBe(20);
  });

  it('niedokładność: najbliższy osiągalny ciężar w dół + exact=false', () => {
    // 101 kg na gryfie 20 przy talerzach >= 2.5: osiągalne 100.
    const result = computePlates(101, 20, inv([25, 4], [15, 4], [2.5, 4]));
    expect(result.achievedKg).toBe(100);
    expect(result.exact).toBe(false);
  });

  it('respektuje ilości: count to ŁĄCZNA liczba talerzy (pary na obie strony)', () => {
    // 60 kg na gryfie 20 = 20 kg/strona; tylko 2 sztuki 10 kg => 1 na stronę, reszta z 5.
    const result = computePlates(60, 20, inv([10, 2], [5, 8]));
    expect(result.perSide).toEqual([
      { weightKg: 10, count: 1 },
      { weightKg: 5, count: 2 },
    ]);
    expect(result.exact).toBe(true);
  });

  it('cel dokładnie równy gryfowi => pusty gryf, exact', () => {
    const result = computePlates(20, 20, DEFAULT_PLATE_INVENTORY);
    expect(result.perSide).toEqual([]);
    expect(result.achievedKg).toBe(20);
    expect(result.exact).toBe(true);
  });

  it('default inventory składa typowe ciężary co 2.5 kg', () => {
    for (const target of [40, 62.5, 85, 107.5, 140]) {
      const result = computePlates(target, 20, DEFAULT_PLATE_INVENTORY);
      expect(result.exact).toBe(true);
      expect(result.achievedKg).toBe(target);
    }
  });
});

// ── X17B Z132.1: rozszerzony inwentarz ──

describe('computePlates — własne rozmiary i tryb bez gryfu (Z132.1)', () => {
  it('obsługuje rozmiary talerzy spoza domyślnej siódemki', () => {
    // Siłownia z talerzami 12.5 i 1 kg: 20 + 2*(12.5+1) = 47
    const result = computePlates(47, 20, inv([12.5, 4], [1, 4]));
    expect(result.perSide).toEqual([
      { weightKg: 12.5, count: 1 },
      { weightKg: 1, count: 1 },
    ]);
    expect(result.exact).toBe(true);
  });

  it('tryb bez gryfu: cała waga na JEDNĄ stronę, bez parowania sztuk', () => {
    // Maszyna ładowana talerzami: cel 30 kg to 30 kg talerzy, nie 15 na stronę.
    const result = computePlates(30, 0, inv([20, 1], [10, 1]), { noBar: true });
    expect(result.perSide).toEqual([
      { weightKg: 20, count: 1 },
      { weightKg: 10, count: 1 },
    ]);
    expect(result.achievedKg).toBe(30);
    expect(result.exact).toBe(true);
    expect(result.belowBar).toBe(false);
  });

  it('tryb bez gryfu wykorzystuje pojedyncze sztuki (nie floor(count/2))', () => {
    // 3 sztuki 5 kg => w trybie bez gryfu dostępne wszystkie trzy.
    const result = computePlates(15, 0, inv([5, 3]), { noBar: true });
    expect(result.perSide).toEqual([{ weightKg: 5, count: 3 }]);
    expect(result.exact).toBe(true);
  });

  it('tryb z gryfem pozostaje nietknięty (parowanie sztuk)', () => {
    const result = computePlates(15, 0, inv([5, 3]));
    // Bez flagi noBar: stara semantyka, para na obie strony => 1 na stronę.
    expect(result.perSide).toEqual([{ weightKg: 5, count: 1 }]);
    expect(result.achievedKg).toBe(10);
  });

  it('preset imperialny trzyma kg kanonicznie (45 lb = 20.412 kg)', () => {
    expect(DEFAULT_PLATE_INVENTORY_LB[0].weightKg).toBeCloseTo(lbsToKg(45), 3);
    expect(DEFAULT_PLATE_INVENTORY_LB.map((p) => p.weightKg)).toHaveLength(6);
    // 45 lb gryf + 2×45 lb = 135 lb
    const barKg = lbsToKg(45);
    const result = computePlates(lbsToKg(135), barKg, DEFAULT_PLATE_INVENTORY_LB);
    expect(result.exact).toBe(true);
  });
});

describe('suggestAchievable — najbliższa w dół I w górę (Z132.2)', () => {
  it('cel osiągalny dokładnie: down i up są tym samym ciężarem', () => {
    const s = suggestAchievable(100, 20, DEFAULT_PLATE_INVENTORY);
    expect(s.down.achievedKg).toBe(100);
    expect(s.up?.achievedKg).toBe(100);
    expect(s.exact).toBe(true);
  });

  it('cel nieosiągalny: podaje wariant niższy I wyższy', () => {
    // Talerze >= 2.5 kg => krok 5 kg na sztangę. Cel 101 leży między 100 a 105.
    const s = suggestAchievable(101, 20, inv([25, 8], [15, 8], [2.5, 8]));
    expect(s.exact).toBe(false);
    expect(s.down.achievedKg).toBe(100);
    expect(s.up?.achievedKg).toBe(105);
  });

  it('wskazuje brakujący nominał, gdy to on blokuje dokładność', () => {
    // Cel 102.5 przy braku 1.25 kg: różnica na stronę to 1.25 kg.
    const s = suggestAchievable(102.5, 20, inv([25, 8], [15, 8], [10, 8], [5, 8], [2.5, 8]));
    expect(s.exact).toBe(false);
    expect(s.missingPlateKg).toBe(1.25);
  });

  it('brak wariantu w górę, gdy zabrakło talerzy w inwentarzu', () => {
    // Tylko jedna para 25 => max 70 kg. Cel 200 nieosiągalny w górę.
    const s = suggestAchievable(200, 20, inv([25, 2]));
    expect(s.down.achievedKg).toBe(70);
    expect(s.up).toBeNull();
  });

  it('cel poniżej gryfu: down to sam gryf, up to najlżejszy możliwy załadunek', () => {
    const s = suggestAchievable(15, 20, inv([2.5, 4]));
    expect(s.down.belowBar).toBe(true);
    expect(s.down.achievedKg).toBe(20);
    expect(s.up?.achievedKg).toBe(25);
  });
});

describe('loadPlateInventory — nietypowy gryf (Z132.1)', () => {
  beforeEach(() => window.localStorage.clear());

  it('akceptuje gryf spoza presetów (np. 7.5 kg gryf techniczny)', () => {
    savePlateInventory(7.5, DEFAULT_PLATE_INVENTORY);
    expect(loadPlateInventory().barKg).toBe(7.5);
  });

  it('akceptuje gryf 0 (tryb bez gryfu)', () => {
    savePlateInventory(0, DEFAULT_PLATE_INVENTORY);
    expect(loadPlateInventory().barKg).toBe(0);
  });

  it('odrzuca wartości bezsensowne i wraca do domyślnej', () => {
    window.localStorage.setItem(PLATE_INVENTORY_STORAGE_KEY, JSON.stringify({ barKg: -5, plates: [] }));
    const loaded = loadPlateInventory();
    expect(loaded.barKg).toBe(20);
    expect(loaded.plates).toEqual(DEFAULT_PLATE_INVENTORY);
  });
});

// Zgłoszenie 2026-07-24 (build 77): przełącznik jednostki inwentarza "nie działa" —
// preset się aplikował, ale wybrana jednostka nie była persystowana ani pokazywana.
describe('jednostka inwentarza — persist + nominały', () => {
  beforeEach(() => window.localStorage.clear());

  it('zapisuje i odczytuje wybraną jednostkę inwentarza', () => {
    savePlateInventory(20, DEFAULT_PLATE_INVENTORY_LB, 'lbs');
    expect(loadPlateInventory().unit).toBe('lbs');
  });

  it('domyślnie i dla zapisów legacy (bez pola unit) zwraca kg', () => {
    expect(loadPlateInventory().unit).toBe('kg');
    window.localStorage.setItem(PLATE_INVENTORY_STORAGE_KEY, JSON.stringify({ barKg: 20, plates: DEFAULT_PLATE_INVENTORY }));
    expect(loadPlateInventory().unit).toBe('kg');
    savePlateInventory(20, DEFAULT_PLATE_INVENTORY);
    expect(loadPlateInventory().unit).toBe('kg');
  });

  it('formatPlateNominal pokazuje nominał z talerza, nie przeliczenie', () => {
    expect(formatPlateNominal(lbsToKg(45), 'lbs')).toBe(45);
    expect(formatPlateNominal(lbsToKg(2.5), 'lbs')).toBe(2.5);
    expect(formatPlateNominal(1.25, 'kg')).toBe(1.25);
  });
});
