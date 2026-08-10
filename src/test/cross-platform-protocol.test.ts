import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/cross-platform/workout-contract-v1.json';
import {
  WORKOUT_PROTOCOL_LIMITS,
  WORKOUT_PROTOCOL_VERSION,
  canonicalSetToSetData,
  isProtocolPayloadWithinLimit,
  normalizeLegacyWatchEvent,
  parseCanonicalWorkoutEvent,
  reduceCanonicalWorkoutEvents,
  toLegacyWatchEvent,
} from '@/lib/workout-protocol';

const legacyContext = {
  uid: fixture.identity.uid,
  deviceId: fixture.identity.watchDeviceId,
  sessionId: fixture.plannedSession.sessionId,
};

describe('X25 workout protocol v1', () => {
  it('parses the frozen envelope and rejects unsupported versions', () => {
    for (const raw of fixture.plannedSession.events) {
      expect(parseCanonicalWorkoutEvent(raw)).not.toBeNull();
    }
    expect(WORKOUT_PROTOCOL_VERSION).toBe(fixture.protocolVersion);
    expect(parseCanonicalWorkoutEvent({
      ...fixture.plannedSession.events[0],
      protocolVersion: WORKOUT_PROTOCOL_VERSION + 1,
    })).toBeNull();
  });

  it('replays idempotently and resolves one set by the newest at timestamp', () => {
    const events = fixture.plannedSession.events
      .map(parseCanonicalWorkoutEvent)
      .filter((event): event is NonNullable<typeof event> => event !== null);
    const reduced = reduceCanonicalWorkoutEvents([...events, ...events]);

    expect(reduced.status).toBe(fixture.plannedSession.expected.status);
    expect(reduced.completedSetCount).toBe(fixture.plannedSession.expected.completedSetCount);
    expect(reduced.tonnageKg).toBe(fixture.plannedSession.expected.tonnageKg);
    expect(reduced.sets['fixture-back-squat#1']?.eventId)
      .toBe(fixture.plannedSession.expected.winningEventBySet['fixture-back-squat#1']);
  });

  it('keeps discard terminal and does not expose a workout to persist', () => {
    const events = fixture.quickSession.events
      .map(parseCanonicalWorkoutEvent)
      .filter((event): event is NonNullable<typeof event> => event !== null);
    const reduced = reduceCanonicalWorkoutEvents(events);

    expect(reduced.status).toBe('discarded');
    expect(reduced.shouldPersistWorkout).toBe(false);
  });

  it('accepts an old Watch event and emits a shape understood by the old phone parser', () => {
    const canonical = normalizeLegacyWatchEvent(fixture.compatibility.legacyWatchEvent, legacyContext);
    expect(canonical).toMatchObject({
      protocolVersion: 1,
      uid: fixture.identity.uid,
      deviceId: fixture.identity.watchDeviceId,
      sessionId: fixture.plannedSession.sessionId,
      eventId: fixture.compatibility.legacyWatchEvent.id,
      type: 'set_logged',
    });
    expect(canonical && toLegacyWatchEvent(canonical, fixture.plan.date)).toMatchObject({
      id: fixture.compatibility.legacyWatchEvent.id,
      type: 'setLogged',
      weight: 100,
      completed: true,
    });
  });

  it('preserves kg and every set-specific field without lossy conversion', () => {
    const event = parseCanonicalWorkoutEvent(fixture.plannedSession.events.find(
      candidate => candidate.eventId === 'fixture-event-farmer-0',
    ));
    if (!event || !event.set) throw new Error('fixture event missing');

    expect(canonicalSetToSetData(event.set)).toEqual({
      reps: 0,
      weight: 24,
      completed: true,
      durationSec: 60,
      distanceM: 40,
    });
  });

  it('enforces transport budgets before sending', () => {
    expect(WORKOUT_PROTOCOL_LIMITS.watchContextBytes).toBe(256 * 1024);
    expect(WORKOUT_PROTOCOL_LIMITS.garminResponseBytes).toBe(8 * 1024);
    expect(isProtocolPayloadWithinLimit(fixture.compatibility.legacyGarminDay, 'garminResponseBytes')).toBe(true);
    expect(isProtocolPayloadWithinLimit({ payload: 'x'.repeat(300_000) }, 'watchContextBytes')).toBe(false);
  });
});
