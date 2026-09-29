// F3 x F6: cel sesji po urlopie / trybie / długiej przerwie — telefon i Garmin
// liczą z JEDNEJ tabeli (fixtures/cross-platform/session-ramp-v1.json). Rozjazd =
// zegarek prefilluje inny ciężar niż telefon po tym samym komunikacie o rampie.
import { describe, expect, it } from 'vitest';
import fixture from '../../fixtures/cross-platform/session-ramp-v1.json';
import type { TrainingDay, Weekday } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import { computeWeeklyTargets, DEFAULT_PROGRESSION } from '@/lib/progression-engine';
import { sanitizeReducedMode } from '@/lib/reduced-mode';
import { vacationToAdviceWindow, type VacationMode } from '@/lib/vacation-mode';
import { parseLocalDate } from '@/lib/utils';
import { buildGarminDayContext, type GarminPlanDay, type GarminWorkout } from '../../functions/src/garmin-day';
import { blockContextFromPlanDoc } from '../../functions/src/plan-date-block';

const WEEKDAYS: Weekday[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
type Case = (typeof fixture.cases)[number];

const phoneTarget = (c: Case) => {
  const day: TrainingDay = {
    id: 'd1', dayName: 'Dzień', weekday: WEEKDAYS[parseLocalDate(c.date).getDay()], focus: '',
    exercises: [{ id: 'ex-1', name: c.exercise.name, sets: c.exercise.sets, instructions: [] }],
  };
  const workouts: WorkoutSession[] = c.history.map((h) => ({
    id: `w-${h.date}`, userId: 'u1', dayId: 'd1', date: h.date, completed: true,
    exercises: [{ exerciseId: 'ex-1', name: c.exercise.name, sets: h.sets.map(([reps, weight]) => ({ reps, weight, completed: true })) }],
  }));
  const planDoc = c.planDoc as { vacation?: VacationMode; reducedMode?: unknown };
  const window = sanitizeReducedMode(planDoc.reducedMode) ?? vacationToAdviceWindow(planDoc.vacation ?? null);
  const t = computeWeeklyTargets([day], workouts, 2, { ...DEFAULT_PROGRESSION, enabled: true }, {
    reducedMode: window, sessionDateISO: c.date,
  })[day.id]['ex-1'];
  return { weight: t.targetWeight ?? 0, reps: t.targetReps };
};

const garminTarget = (c: Case) => {
  const day: GarminPlanDay = {
    id: 'd1', dayName: 'Dzień', weekday: WEEKDAYS[parseLocalDate(c.date).getDay()],
    exercises: [{ id: 'ex-1', name: c.exercise.name, sets: c.exercise.sets }],
  };
  const workouts: GarminWorkout[] = c.history.map((h) => ({
    date: h.date, completed: true,
    exercises: [{ exerciseId: 'ex-1', name: c.exercise.name, sets: h.sets.map(([reps, weight]) => ({ reps, weight, completed: true })) }],
  }));
  const ctx = buildGarminDayContext([day], workouts, c.date, {}, {}, null, null, blockContextFromPlanDoc(c.planDoc));
  const [reps, weight] = ctx!.e[0].s[0];
  return { weight, reps };
};

describe('parity celu sesji (rampa / comeback) telefon <-> Garmin', () => {
  it.each(fixture.cases)('$name', (c) => {
    expect(phoneTarget(c)).toEqual(c.expected);
    expect(garminTarget(c)).toEqual(c.expected);
  });

  it('kontrakt fixture', () => {
    expect(fixture.contract).toBe('strength-save-session-ramp');
    expect(fixture.contractVersion).toBe(1);
  });
});
