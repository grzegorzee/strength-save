import { describe, expect, it } from 'vitest';
import { Bike, Dumbbell, Footprints, Medal, PersonStanding } from 'lucide-react';
import { baseActivityType, displayActivityType, getActivityIcon } from '@/lib/activity-icons';

describe('getActivityIcon', () => {
  it('mapuje znane typy na ikony lucide', () => {
    expect(getActivityIcon('Ride')).toBe(Bike);
    expect(getActivityIcon('WeightTraining')).toBe(Dumbbell);
  });
  it('T6: spacer ma własną ikonę, nie biegową', () => {
    expect(getActivityIcon('Walk')).toBe(PersonStanding);
  });
  it('T6: wariant sport_type (TrailRun) dostaje ikonę bazowego typu (Run)', () => {
    expect(getActivityIcon('TrailRun')).toBe(Footprints);
    expect(getActivityIcon('VirtualRide')).toBe(Bike);
  });
  it('nieznany typ dostaje Medal (fallback jak dawne 🏅)', () => {
    expect(getActivityIcon('SomethingNew')).toBe(Medal);
  });
});

describe('displayActivityType / baseActivityType (T6)', () => {
  it('preferuje sportType nad type', () => {
    expect(displayActivityType({ type: 'Run', sportType: 'TrailRun' })).toBe('TrailRun');
    expect(displayActivityType({ type: 'Walk', sportType: 'Walk' })).toBe('Walk');
  });
  it('fallback na type gdy brak sportType, Other gdy brak obu', () => {
    expect(displayActivityType({ type: 'Run' })).toBe('Run');
    expect(displayActivityType({})).toBe('Other');
  });
  it('normalizuje warianty do bazowego klucza, resztę zostawia', () => {
    expect(baseActivityType('TrailRun')).toBe('Run');
    expect(baseActivityType('GravelRide')).toBe('Ride');
    expect(baseActivityType('Walk')).toBe('Walk');
    expect(baseActivityType('Rowing')).toBe('Rowing');
  });
});
