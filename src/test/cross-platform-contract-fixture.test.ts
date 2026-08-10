import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/cross-platform/workout-contract-v1.json';

const REQUIRED_EVENT_FIELDS = [
  'protocolVersion',
  'uid',
  'deviceId',
  'dayId',
  'sessionId',
  'eventId',
  'at',
] as const;

describe('X25 cross-platform contract fixture', () => {
  it('freezes canonical units, rest defaults and all supported set semantics', () => {
    expect(fixture.protocol).toBe('strength-save-workout');
    expect(fixture.protocolVersion).toBe(1);
    expect(fixture.canonicalUnit).toBe('kg');
    expect(fixture.restDefaults).toEqual({ betweenSetsSec: 90, betweenExercisesSec: 150 });

    const trackingTypes = fixture.plan.exercises.map((exercise) => exercise.tracking);
    expect(trackingTypes).toEqual([
      'weight_reps',
      'duration',
      'weight_distance_duration',
      'assisted_bodyweight',
    ]);
  });

  it('uses the same stable identifiers and unique idempotency key on every event', () => {
    const events = [...fixture.plannedSession.events, ...fixture.quickSession.events];
    const eventIds = new Set<string>();

    for (const event of events) {
      for (const field of REQUIRED_EVENT_FIELDS) {
        expect(event).toHaveProperty(field);
      }
      expect(event.protocolVersion).toBe(fixture.protocolVersion);
      expect(event.uid).toBe(fixture.identity.uid);
      expect(event.eventId).not.toBe('');
      eventIds.add(event.eventId);
    }

    expect(eventIds.size).toBe(events.length);
  });

  it('freezes a planned finish and an explicit quick-session discard', () => {
    expect(fixture.plannedSession.events.at(-1)?.type).toBe('session_finished');
    expect(fixture.plannedSession.expected.status).toBe('finished');
    expect(fixture.plannedSession.expected.tonnageKg).toBe(1500);
    expect(fixture.quickSession.events.at(-1)?.type).toBe('session_discarded');
    expect(fixture.quickSession.expected).toEqual({ status: 'discarded', persistedWorkout: false });
  });

  it('keeps legacy Watch and Garmin examples for both compatibility directions', () => {
    expect(fixture.compatibility.legacyWatchEvent).not.toHaveProperty('protocolVersion');
    expect(fixture.compatibility.legacyGarminDay.v).toBe(1);
    expect(fixture.compatibility.legacyGarminIngest.events[0]).toHaveProperty('id');
  });
});
