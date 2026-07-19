import { describe, expect, it } from 'vitest';
import { computePlates, DEFAULT_PLATE_INVENTORY, type PlateInventoryItem } from '@/lib/plate-calculator';

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
