import { describe, expect, it } from 'vitest';
import {
  CANONICAL_STATE_IDS,
  CANONICAL_UID,
  buildCanonicalState,
  buildTypedSetsWorkout,
} from '@/test/canonical-states';
import {
  sanitizeMeasurementDoc,
  sanitizePlanCycleDoc,
  sanitizeTrainingPlanDays,
  sanitizeTrainingPlanName,
  sanitizeTrainingPlanStatus,
  sanitizeWorkoutDoc,
} from '@/lib/firestore-doc-guards';

// WP-G Task G1: kotwica "ksztalt = produkcja". Kazdy dokument kanonicznego
// stanu MUSI przejsc przez sanitizery hydracji bez modyfikacji (roundtrip
// equal). Jesli ten test pada po zmianie sanitizera lub stanu, fixture
// przestal odpowiadac produkcyjnemu ksztaltowi dokumentu.

const TODAY = '2026-08-21';

const stripId = <T extends { id: string }>(doc: T): Omit<T, 'id'> => {
  const { id: _id, ...rest } = doc;
  return rest;
};

describe('WP-G — canonical states: roundtrip przez sanitizery hydracji', () => {
  it.each(CANONICAL_STATE_IDS)('%s: dokumenty przechodza sanitizery bez zmian', (stateId) => {
    const state = buildCanonicalState(stateId, TODAY);

    for (const cycle of state.cycles) {
      expect(sanitizePlanCycleDoc(cycle.id, stripId(cycle))).toEqual(cycle);
    }
    for (const workout of state.workouts) {
      expect(sanitizeWorkoutDoc(workout.id, stripId(workout))).toEqual(workout);
    }
    for (const measurement of state.measurements) {
      expect(sanitizeMeasurementDoc(measurement.id, stripId(measurement))).toEqual(measurement);
    }
    if (state.plan) {
      expect(sanitizeTrainingPlanDays(state.plan.days)).toEqual(state.plan.days);
      expect(sanitizeTrainingPlanStatus(state.plan.status)).toBe(state.plan.status);
      expect(sanitizeTrainingPlanName(state.plan.name)).toBe(state.plan.name);
    }
  });

  it('active-plan: aktywny cykl ma produkcyjne endDate "" i id operacyjne startu', () => {
    const state = buildCanonicalState('active-plan', TODAY);
    const active = state.cycles.find((cycle) => cycle.status === 'active');
    expect(active).toBeDefined();
    expect(active!.endDate).toBe('');
    expect(active!.id).toBe(`cycle-${CANONICAL_UID}-${active!.startDate}`);
  });

  it('plan-ended: training_plans.status jest "ended" (WP-PLANS-1)', () => {
    const state = buildCanonicalState('plan-ended', TODAY);
    expect(state.plan?.status).toBe('ended');
    expect(state.cycles.every((cycle) => cycle.status === 'completed')).toBe(true);
  });

  it('active-plan: pomiary zawieraja wpis tylko-zdjecie (WP-D)', () => {
    const state = buildCanonicalState('active-plan', TODAY);
    const photoOnly = state.measurements.find((m) => 'photoUrl' in m);
    expect(photoOnly).toBeDefined();
    const numericFields = Object.entries(photoOnly!).filter(([, value]) => typeof value === 'number');
    expect(numericFields).toHaveLength(0);
  });

  it('history-outside-cycles: istnieja sesje bez cycleId poza zakresem cykli', () => {
    const state = buildCanonicalState('history-outside-cycles', TODAY);
    const outside = state.workouts.filter((w) => !w.cycleId);
    expect(outside.length).toBeGreaterThan(0);
  });

  it('typed-sets: serie duration/assisted/wdd przechodza sanitizer bez obciecia pol Z105 (bug 5)', () => {
    // clampSet (produkcyjny zapis) → sanitizeWorkoutDoc (hydracja) na poziomie
    // SERII: durationSec/distanceM/assistWeight/updatedAt/updatedEventId musza
    // przezyc roundtrip, inaczej PR-y i progresja typow Z105 sa martwe.
    const workout = buildTypedSetsWorkout(TODAY);
    expect(sanitizeWorkoutDoc(workout.id, stripId(workout))).toEqual(workout);
  });

  it('draft-open: draft wskazuje dzisiejsza sesje z planu', () => {
    const state = buildCanonicalState('draft-open', TODAY);
    expect(state.draft).not.toBeNull();
    expect(state.draft!.date).toBe(TODAY);
    expect(state.plan?.days.some((day) => day.id === state.draft!.dayId)).toBe(true);
  });
});
