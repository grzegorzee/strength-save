import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), 'utf8');

describe('Swift Apple Watch contract (X25/Z225)', () => {
  it('trzyma własną kolejkę do ACK po trwałym zapisie i oferuje retry', () => {
    const watch = read('ios/App/WatchApp/WorkoutStore.swift');
    const phone = read('ios/App/App/WatchBridge/PhoneWatchSessionManager.swift');
    expect(watch).toContain('watch.pendingEvents.v1');
    expect(watch).toContain('func retryPendingEvents()');
    expect(watch).toContain('ackedEventIds');
    expect(phone).toContain('context["ackedEventIds"] = Array((previous + ids)');
    expect(phone).toContain('pending.contains(where: { eventId(from: $0) == incomingId })');
  });

  it('rozróżnia HealthKit finish od discard i nie zapisuje HKWorkout po odrzuceniu', () => {
    const health = read('ios/App/WatchApp/WorkoutSessionManager.swift');
    const discardBody = health.split('func discard()')[1]?.split('\n    }')[0] ?? '';
    expect(health).toContain('builder.finishWorkout');
    expect(discardBody).toContain('builder.discardWorkout()');
    expect(discardBody).not.toContain('finishWorkout');
  });

  it('ma 90/150, LWW per seria, quick workout, czas/serie/tonaż i jawny discard', () => {
    const store = read('ios/App/WatchApp/WorkoutStore.swift');
    const view = read('ios/App/WatchApp/ContentView.swift');
    expect(store).toContain('payload?.restBetweenSetsSeconds ?? payload?.restSeconds ?? 90');
    expect(store).toContain('payload?.restBetweenExercisesSeconds ?? 150');
    expect(store).toContain('localAt > remoteAt');
    expect(store).toContain('func startQuickWorkout');
    expect(store).toContain('func discardWorkout()');
    expect(view).toContain('SessionStatsRow');
    expect(view).toContain('QuickWorkoutListView');
    expect(view).toContain('L10n.discardConfirm');
  });

  it('nie degraduje czterech typów serii do samego reps/kg', () => {
    const models = read('ios/App/WatchApp/WorkoutModels.swift');
    const editor = read('ios/App/WatchApp/ExerciseDetailView.swift');
    for (const field of ['trackingType', 'durationSec', 'distanceM', 'assistWeight']) {
      expect(models).toContain(field);
      expect(editor).toContain(field);
    }
  });

  it('dziedziczy capability PRO z iPhone i raportuje pending/Health bez danych treningu', () => {
    const models = read('ios/App/WatchApp/WorkoutModels.swift');
    const store = read('ios/App/WatchApp/WorkoutStore.swift');
    const phone = read('ios/App/App/WatchBridge/PhoneWatchSessionManager.swift');
    const view = read('ios/App/WatchApp/ContentView.swift');
    expect(models).toContain('var capability: WatchCapabilitySnapshot?');
    expect(store).toContain('payload?.capability?.active != false');
    expect(store).toContain('"pendingEvents": pendingEventCount');
    expect(store).toContain('"healthStatus": WorkoutSessionManager.shared.healthStatus');
    expect(phone).toContain('applicationContext["deviceStatus"]');
    expect(view).toContain('payload.capability?.active == false');
  });

  it('po expiry pozwala domknąć tylko rozpoczętą sesję, a revoke nadal odcina akcje', () => {
    const models = read('ios/App/WatchApp/WorkoutModels.swift');
    const store = read('ios/App/WatchApp/WorkoutStore.swift');
    const view = read('ios/App/WatchApp/ContentView.swift');
    expect(models).toContain('var inactiveReason: String?');
    expect(store).toContain('var canContinueCurrentWorkout: Bool');
    expect(store).toContain('payload?.capability?.inactiveReason == "expired" && isActive');
    expect(store).toContain('guard canContinueCurrentWorkout else { return }');
    expect(view).toContain('payload.capability?.active == false && !store.canContinueCurrentWorkout');
  });

  it('utrzymuje tie-break eventId w lokalnym snapshocie i evencie Watch', () => {
    const models = read('ios/App/WatchApp/WorkoutModels.swift');
    const store = read('ios/App/WatchApp/WorkoutStore.swift');
    expect(models).toContain('var updatedEventId: String?');
    expect(models).toContain('eventId: String = UUID().uuidString');
    expect(store).toContain('localEventId >= remoteEventId');
    expect(store).toContain('updatedEventId = eventId');
    expect(store).toContain('eventId: eventId');
  });

  it('uruchamia i odzyskuje HealthKit wyłącznie po jawnej aktywnej zgodzie z telefonu', () => {
    const models = read('ios/App/WatchApp/WorkoutModels.swift');
    const store = read('ios/App/WatchApp/WorkoutStore.swift');
    const delegate = read('ios/App/WatchApp/WatchExtensionDelegate.swift');
    expect(models).toContain('var healthFeaturesEnabled: Bool?');
    expect(models).toContain('static var isEnabled: Bool');
    expect(models).toContain('enabled == true');
    expect(store).toContain('var healthFeaturesEnabled: Bool');
    expect(store).toContain('payload?.healthFeaturesEnabled == true');
    expect(store).toContain('guard healthFeaturesEnabled else');
    expect(store).toContain('WorkoutSessionManager.shared.discard()');
    expect(delegate).toContain('guard WatchHealthFeatureGate.isEnabled else { return }');
  });
});
