import { describe, expect, it } from 'vitest';
import {
  computeVolumeSplit,
  primaryMuscleToCategory,
  VOLUME_SPLIT_OTHER,
} from '@/lib/volume-split';

// Fala 2 (plan/summary.md par. 2.4): split tonażu po kategoriach — agregacja
// deterministyczna, nierozpoznane nazwy NIE dostają zmyślonej grupy (idą w "Inne").

const CATEGORIES: Record<string, string> = {
  'Wyciskanie sztangi': 'chest',
  'Wiosłowanie': 'back',
  'Przysiad': 'legs',
  'Uginanie ramion': 'arms',
  'Wznosy bokiem': 'shoulders',
  'Brzuszki': 'core',
  'Hip thrust': 'glutes',
};

const resolve = (name: string) => CATEGORIES[name] ?? null;

describe('computeVolumeSplit', () => {
  it('grupuje tonaż po kategoriach i sortuje malejąco', () => {
    const buckets = computeVolumeSplit([
      { name: 'Wyciskanie sztangi', tonnageKg: 300 },
      { name: 'Wiosłowanie', tonnageKg: 500 },
      { name: 'Przysiad', tonnageKg: 200 },
    ], resolve);
    expect(buckets.map((b) => b.key)).toEqual(['back', 'chest', 'legs']);
    expect(buckets[0].tonnageKg).toBe(500);
    expect(buckets[0].pct).toBeCloseTo(50);
  });

  it('sumuje wiele ćwiczeń tej samej kategorii', () => {
    const buckets = computeVolumeSplit([
      { name: 'Wyciskanie sztangi', tonnageKg: 300 },
      { name: 'Wyciskanie sztangi', tonnageKg: 200 },
    ], resolve);
    expect(buckets).toHaveLength(1);
    expect(buckets[0]).toMatchObject({ key: 'chest', tonnageKg: 500, pct: 100 });
  });

  it('nierozpoznana nazwa trafia do "Inne", nie do zmyślonej grupy', () => {
    const buckets = computeVolumeSplit([
      { name: 'Wiosłowanie', tonnageKg: 600 },
      { name: 'Moje własne bez kategorii', tonnageKg: 400 },
    ], resolve);
    expect(buckets.map((b) => b.key)).toEqual(['back', VOLUME_SPLIT_OTHER]);
    expect(buckets[1].pct).toBeCloseTo(40);
  });

  it('udział <5% spada do "Inne" (zero mikrosegmentów)', () => {
    const buckets = computeVolumeSplit([
      { name: 'Wiosłowanie', tonnageKg: 960 },
      { name: 'Brzuszki', tonnageKg: 40 },
    ], resolve);
    expect(buckets.map((b) => b.key)).toEqual(['back', VOLUME_SPLIT_OTHER]);
    expect(buckets[1].tonnageKg).toBe(40);
  });

  it('powyżej 5 kategorii ogon agreguje się do "Inne"', () => {
    const buckets = computeVolumeSplit([
      { name: 'Wiosłowanie', tonnageKg: 700 },
      { name: 'Wyciskanie sztangi', tonnageKg: 600 },
      { name: 'Przysiad', tonnageKg: 500 },
      { name: 'Uginanie ramion', tonnageKg: 400 },
      { name: 'Wznosy bokiem', tonnageKg: 300 },
      { name: 'Brzuszki', tonnageKg: 200 },
      { name: 'Hip thrust', tonnageKg: 190 },
    ], resolve);
    expect(buckets).toHaveLength(6);
    expect(buckets[5].key).toBe(VOLUME_SPLIT_OTHER);
    expect(buckets[5].tonnageKg).toBe(390);
    expect(buckets.slice(0, 5).map((b) => b.key))
      .toEqual(['back', 'chest', 'legs', 'arms', 'shoulders']);
  });

  it('suma pct wszystkich kubełków = 100', () => {
    const buckets = computeVolumeSplit([
      { name: 'Wiosłowanie', tonnageKg: 333 },
      { name: 'Przysiad', tonnageKg: 333 },
      { name: 'Nieznane', tonnageKg: 334 },
    ], resolve);
    const sum = buckets.reduce((acc, b) => acc + b.pct, 0);
    expect(sum).toBeCloseTo(100);
  });

  it('tonaż 0 i pominięte ćwiczenia = pusta lista (sekcja się nie renderuje)', () => {
    expect(computeVolumeSplit([], resolve)).toEqual([]);
    expect(computeVolumeSplit([{ name: 'Przysiad', tonnageKg: 0 }], resolve)).toEqual([]);
  });

  it('fallback primaryMuscle→kategoria: biceps→arms, quads→legs, fullbody→other', () => {
    expect(primaryMuscleToCategory.biceps).toBe('arms');
    expect(primaryMuscleToCategory.triceps).toBe('arms');
    expect(primaryMuscleToCategory.quads).toBe('legs');
    expect(primaryMuscleToCategory.hamstrings).toBe('legs');
    expect(primaryMuscleToCategory.core).toBe('core');
    expect(primaryMuscleToCategory.fullbody).toBe(VOLUME_SPLIT_OTHER);
  });
});
