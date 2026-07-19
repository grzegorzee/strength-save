import { describe, expect, it } from 'vitest';
import { computeEffectiveLoad } from '@/lib/effective-load';

const set = (over: Record<string, unknown> = {}) => ({
  reps: 8, weight: 0, completed: true, ...over,
});

describe('computeEffectiveLoad (Z106)', () => {
  it('weight_reps: obciążenie = weight (waga ciała nieistotna)', () => {
    expect(computeEffectiveLoad(set({ weight: 100 }), 'weight_reps', 80)).toBe(100);
    expect(computeEffectiveLoad(set({ weight: 100 }), 'weight_reps', null)).toBe(100);
  });

  it('bodyweight_reps: obciążenie = masa ciała (null gdy nieznana)', () => {
    expect(computeEffectiveLoad(set(), 'bodyweight_reps', 82.5)).toBe(82.5);
    expect(computeEffectiveLoad(set(), 'bodyweight_reps', null)).toBeNull();
  });

  it('assisted_bodyweight: masa ciała minus asysta — mniejsza asysta = większe obciążenie', () => {
    expect(computeEffectiveLoad(set({ assistWeight: 25 }), 'assisted_bodyweight', 80)).toBe(55);
    expect(computeEffectiveLoad(set({ assistWeight: 20 }), 'assisted_bodyweight', 80)).toBe(60);
  });

  it('assisted_bodyweight: brak wagi ciała => null (PR tylko po powtórzeniach)', () => {
    expect(computeEffectiveLoad(set({ assistWeight: 25 }), 'assisted_bodyweight', null)).toBeNull();
  });

  it('assisted_bodyweight: asysta większa niż waga ciała => clamp 0', () => {
    expect(computeEffectiveLoad(set({ assistWeight: 100 }), 'assisted_bodyweight', 80)).toBe(0);
  });

  it('duration: null (brak obciążenia porównywalnego)', () => {
    expect(computeEffectiveLoad(set({ durationSec: 90 }), 'duration', 80)).toBeNull();
  });

  it('weight_distance_duration: obciążenie = weight', () => {
    expect(computeEffectiveLoad(set({ weight: 24, distanceM: 40 }), 'weight_distance_duration', 80)).toBe(24);
  });
});
