import { describe, expect, it } from 'vitest';
import { getTrackingType, visibleSetFields, type TrackingType } from '@/lib/set-tracking';

describe('getTrackingType (Z105)', () => {
  it('default: weight_reps', () => {
    expect(getTrackingType({})).toBe('weight_reps');
    expect(getTrackingType({ isBodyweight: false })).toBe('weight_reps');
  });

  it('isBodyweight => bodyweight_reps', () => {
    expect(getTrackingType({ isBodyweight: true })).toBe('bodyweight_reps');
  });

  it('jawne pole tracking wygrywa nad isBodyweight', () => {
    expect(getTrackingType({ isBodyweight: true, tracking: 'duration' })).toBe('duration');
    expect(getTrackingType({ isBodyweight: false, tracking: 'assisted_bodyweight' })).toBe('assisted_bodyweight');
    expect(getTrackingType({ tracking: 'weight_distance_duration' })).toBe('weight_distance_duration');
  });
});

describe('visibleSetFields (Z105)', () => {
  const cases: Array<[TrackingType, string[]]> = [
    ['weight_reps', ['weight', 'reps']],
    ['bodyweight_reps', ['reps']],
    ['duration', ['duration']],
    ['weight_distance_duration', ['weight', 'distance', 'duration']],
    ['assisted_bodyweight', ['assist', 'reps']],
  ];

  it.each(cases)('%s => %j', (tracking, fields) => {
    expect(visibleSetFields(tracking)).toEqual(fields);
  });
});
