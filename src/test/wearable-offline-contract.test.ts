import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSessionFromEvents, validateIngestPayload } from '../../functions/src/garmin-ingest';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

describe('A-T5: trwały kontrakt offline urządzeń ubieralnych', () => {
  it('Apple Watch zapisuje event przed transmisją i usuwa go dopiero po ACK telefonu', () => {
    const store = read('ios/App/WatchApp/WorkoutStore.swift');
    const sendBody = store.split('private func sendEvent')[1]?.split('private func transmit')[0] ?? '';
    const acknowledgeBody = store.split('private func acknowledge')[1]?.split('\n    }\n}')[0] ?? '';

    expect(store).toContain('watch.pendingEvents.v1');
    expect(sendBody.indexOf('defaults.set(pending, forKey: pendingEventsKey)')).toBeGreaterThan(-1);
    expect(sendBody.indexOf('transmit(json)')).toBeGreaterThan(
      sendBody.indexOf('defaults.set(pending, forKey: pendingEventsKey)'),
    );
    expect(store).toContain('pendingEvents.forEach(transmit)');
    expect(acknowledgeBody).toContain('defaults.set(remaining, forKey: pendingEventsKey)');
  });

  it('Garmin zachowuje kolejkę w Storage po błędzie i czyści ją tylko po udanym ingest', () => {
    const queue = read('garmin/source/EventQueue.mc');
    const state = read('garmin/source/WorkoutState.mc');
    const responseBody = state.split('function onFinishResponse')[1]?.split('function discard')[0] ?? '';

    expect(queue).toContain('Application.Storage.getValue("events")');
    expect(queue).toContain('Application.Storage.setValue("events", events)');
    expect(state).toContain('"events" => EventQueue.all()');
    expect(responseBody).toContain('if (ok)');
    expect(responseBody).toContain('EventQueue.clear()');
    expect(responseBody.indexOf('EventQueue.clear()')).toBeGreaterThan(responseBody.indexOf('if (ok)'));
  });

  it('powtórzona dostawa tego samego eventId tworzy jedną serię w kanonicznej sesji', () => {
    const event = {
      id: 'offline-event-1',
      eventId: 'offline-event-1',
      exerciseId: 'squat',
      exerciseName: 'Przysiad',
      setIndex: 0,
      reps: 5,
      weight: 80,
      at: 1_775_000_000_000,
    };
    const payload = validateIngestPayload({
      protocolVersion: 1,
      workoutId: 'offline-workout-1',
      sessionId: 'offline-workout-1',
      date: '2026-08-19',
      dayId: 'day-1',
      dayName: 'Nogi',
      finishedAt: 1_775_000_001_000,
      events: [event, { ...event }],
    });

    expect(payload).not.toBeNull();
    const session = buildSessionFromEvents(payload!, 'synthetic-user', 'garmin-test', { adhoc: false });
    expect(session.exercises).toHaveLength(1);
    expect(session.exercises[0].sets).toHaveLength(1);
    expect(session.exercises[0].sets[0]).toMatchObject({ completed: true, reps: 5, weight: 80 });
  });
});
