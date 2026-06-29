import { describe, expect, it } from 'vitest';
import { isCycleVisible, isCycleVisibleWithData } from '@/lib/cycle-visibility';
import type { PlanCycle } from '@/types/cycles';

const mkCycle = (over: Partial<PlanCycle> & { status: PlanCycle['status'] }): PlanCycle => ({
  id: 'c1',
  userId: 'u1',
  days: [],
  durationWeeks: 12,
  startDate: '2026-01-01',
  endDate: '2026-03-25',
  createdAt: '2026-01-01T00:00:00.000Z',
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
  ...over,
});

describe('isCycleVisibleWithData — ujednolicone ukrywanie pustych cykli (Dashboard/Cycles/Achievements)', () => {
  it('pusty completed cykl (totalWorkouts=0) → ukryty', () => {
    const cycle = mkCycle({ status: 'completed', stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 } });
    expect(isCycleVisibleWithData(cycle)).toBe(false);
  });

  it('aktywny pusty cykl → widoczny (świeży plan po onboardingu)', () => {
    const cycle = mkCycle({ status: 'active', stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 } });
    expect(isCycleVisibleWithData(cycle)).toBe(true);
  });

  it('completed cykl z treningami → widoczny', () => {
    const cycle = mkCycle({ status: 'completed', stats: { totalWorkouts: 5, totalTonnage: 5000, prs: [], completionRate: 70 } });
    expect(isCycleVisibleWithData(cycle)).toBe(true);
  });

  it('cykl techniczny/ukryty → ukryty niezależnie od treningów', () => {
    const technical = mkCycle({ status: 'completed', technical: true, stats: { totalWorkouts: 5, totalTonnage: 5000, prs: [], completionRate: 70 } });
    expect(isCycleVisibleWithData(technical)).toBe(false);
    // spójność z bazowym helperem
    expect(isCycleVisible(technical)).toBe(false);
  });
});
