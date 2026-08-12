import { describe, expect, it } from 'vitest';
import { Bike, Dumbbell, Medal } from 'lucide-react';
import { getActivityIcon } from '@/lib/activity-icons';

describe('getActivityIcon', () => {
  it('mapuje znane typy na ikony lucide', () => {
    expect(getActivityIcon('Ride')).toBe(Bike);
    expect(getActivityIcon('WeightTraining')).toBe(Dumbbell);
  });
  it('nieznany typ dostaje Medal (fallback jak dawne 🏅)', () => {
    expect(getActivityIcon('SomethingNew')).toBe(Medal);
  });
});
