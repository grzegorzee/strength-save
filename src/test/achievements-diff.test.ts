import { describe, expect, it } from 'vitest';
import { diffMilestones, type Milestone } from '@/lib/achievements-utils';

const m = (threshold: number, achieved: boolean): Milestone =>
  ({ id: `workouts-${threshold}`, category: 'workouts', threshold, achieved, current: 0, progress: achieved ? 100 : 50 } as Milestone);

describe('diffMilestones', () => {
  it('zwraca tylko świeżo osiągnięte progi', () => {
    const before = [m(10, true), m(25, false)];
    const after = [m(10, true), m(25, true)];
    expect(diffMilestones(before, after).map((x) => x.threshold)).toEqual([25]);
  });
  it('bez zmian: pusta lista', () => {
    const same = [m(10, true), m(25, false)];
    expect(diffMilestones(same, same)).toEqual([]);
  });
});
