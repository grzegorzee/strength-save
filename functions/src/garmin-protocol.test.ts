import { describe, expect, it, vi } from 'vitest';
import fixture from '../../fixtures/cross-platform/workout-contract-v1.json';
import {
  buildCompatibleGarminIngestPayload,
  buildSessionFromEvents,
  runGarminIngest,
  validateIngestPayload,
  type GarminIngestDeps,
} from './garmin-ingest';

const canonicalSetEvents = fixture.plannedSession.events
  .filter(event => event.type === 'set_logged' || event.type === 'set_updated')
  .map(event => {
    const exercise = fixture.plan.exercises.find(candidate => candidate.exerciseId === event.exerciseId);
    return { ...event, exerciseName: exercise?.name.pl ?? String(event.exerciseId) };
  });

const compatiblePayload = () => buildCompatibleGarminIngestPayload({
  sessionId: fixture.plannedSession.sessionId,
  date: fixture.plan.date,
  dayId: fixture.plan.dayId,
  dayName: fixture.plan.dayName.pl,
  startedAt: fixture.plannedSession.events[0].at,
  finishedAt: fixture.plannedSession.events.at(-1)!.at,
  events: canonicalSetEvents,
});

describe('Garmin protocol compatibility (X25/Z224)', () => {
  it('old Garmin client -> new server remains accepted', () => {
    const parsed = validateIngestPayload(fixture.compatibility.legacyGarminIngest);
    expect(parsed).not.toBeNull();
    expect(parsed?.events[0]).toMatchObject({
      id: 'legacy-garmin-event-1',
      tracking: 'weight_reps',
      reps: 5,
      weight: 100,
    });
  });

  it('new Garmin client emits additive aliases understood by the old server', () => {
    const payload = compatiblePayload();
    expect(payload).toMatchObject({
      v: 1,
      protocolVersion: 1,
      workoutId: fixture.plannedSession.sessionId,
      sessionId: fixture.plannedSession.sessionId,
    });
    expect(payload.events[0]).toMatchObject({
      id: canonicalSetEvents[0].eventId,
      eventId: canonicalSetEvents[0].eventId,
      reps: 5,
      weight: 100,
      at: canonicalSetEvents[0].at,
    });
    expect(validateIngestPayload(payload)).not.toBeNull();
  });

  it('preserves four set semantics and newer-at conflict in the WorkoutSession', () => {
    const payload = validateIngestPayload(compatiblePayload());
    if (!payload) throw new Error('compatible fixture rejected');
    const session = buildSessionFromEvents(payload, 'trusted-server-uid', 'trusted-device', { adhoc: false });

    expect(session.userId).toBe('trusted-server-uid');
    expect(session.exercises.find(exercise => exercise.exerciseId === 'fixture-back-squat')?.sets[1])
      .toMatchObject({ reps: 5, weight: 100, completed: true });
    expect(session.exercises.find(exercise => exercise.exerciseId === 'fixture-plank')?.sets[0])
      .toMatchObject({ durationSec: 60 });
    expect(session.exercises.find(exercise => exercise.exerciseId === 'fixture-farmer-walk')?.sets[0])
      .toMatchObject({ weight: 24, distanceM: 40, durationSec: 60 });
    expect(session.exercises.find(exercise => exercise.exerciseId === 'fixture-assisted-pullup')?.sets[0])
      .toMatchObject({ reps: 8, assistWeight: 25 });
  });

  it('rejects future protocol versions and oversized ingest before any write', () => {
    expect(validateIngestPayload({ ...compatiblePayload(), protocolVersion: 999 })).toBeNull();
    const tooLarge = compatiblePayload();
    tooLarge.events[0].exerciseName = 'x'.repeat(300_000);
    expect(validateIngestPayload(tooLarge)).toBeNull();
  });

  it('does not resolve success/ACK before durable save completes', async () => {
    let releaseSave: (() => void) | null = null;
    const saveGate = new Promise<void>(resolve => { releaseSave = resolve; });
    const deps: GarminIngestDeps = {
      findCanonicalSession: vi.fn(async () => null),
      saveWorkout: vi.fn(async () => saveGate),
      now: () => fixture.plannedSession.events.at(-1)!.at,
    };
    let settled = false;
    const operation = runGarminIngest(deps, 'trusted-server-uid', 'trusted-device', compatiblePayload())
      .then(result => { settled = true; return result; });

    await Promise.resolve();
    expect(settled).toBe(false);
    releaseSave?.();
    await expect(operation).resolves.toMatchObject({ ok: true });
  });
});
