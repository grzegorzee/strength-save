import { describe, expect, it } from 'vitest';
import type { TrainingDay } from '@/data/trainingPlan';
import type { SetData, WorkoutSession } from '@/types';
import { DEFAULT_PROGRESSION } from '@/lib/progression-engine';
import { getNextSetAdvice } from '@/lib/next-set-advice';
import { vacationToAdviceWindow, type VacationMode } from '@/lib/vacation-mode';
import { buildPrefillForExercise, resolveSessionTargets } from '@/lib/session-targets';
import { buildBodyWeightTimeline, normalizeBodyweightLoadedWorkouts } from '@/lib/bodyweight-load';
import { isBodyweightLoadedExercise } from '@/data/exerciseLibrary';
import { applySessionExerciseSwap } from '@/lib/exercise-swap';
import { createEmptySets } from '@/lib/exercise-utils';

// Przecięcie F3 (rampa po urlopie w prefillu), F4 (zamiana w trakcie) i F6
// (bodyweight_loaded + normalizacja legacy). Dane jak u właściciela: urlop
// 22-27.09, podciąganie zapisane legacy jako 74 kg przy masie ciała 74.

const PULL = { id: 'pull-1', name: 'Podciąganie na drążku', sets: '3 x 6-8', instructions: [] };
const ASSIST = { id: 'assist-1', name: 'Dipy na maszynie (Assisted Dip Machine)', sets: '3 x 8', instructions: [] };
const DAY: TrainingDay = { id: 'd1', dayName: 'Poniedziałek', weekday: 'monday', focus: 'Plecy', exercises: [PULL, ASSIST] };
const VACATION: VacationMode = { startDate: '2026-09-22', endDate: '2026-09-27', activity: 'none', extendedWeeks: 1 };
const WINDOW = vacationToAdviceWindow(VACATION);
const TRACKING = { [PULL.name]: 'bodyweight_loaded' as const, [ASSIST.name]: 'assisted_bodyweight' as const };

const workout = (date: string, exercises: Array<{ ex: { id: string; name: string }; sets: SetData[] }>): WorkoutSession => ({
  id: `w-${date}`, userId: 'u1', dayId: 'd1', date, completed: true,
  exercises: exercises.map(({ ex, sets }) => ({ exerciseId: ex.id, name: ex.name, sets })),
});
const done = (reps: number, weight: number, extra: Partial<SetData> = {}): SetData => ({ reps, weight, completed: true, ...extra });

const normalized = (workouts: WorkoutSession[]) => normalizeBodyweightLoadedWorkouts(
  workouts, buildBodyWeightTimeline([{ date: '2026-06-10', weight: 74 }]), isBodyweightLoadedExercise,
);

const targets = (workouts: WorkoutSession[], progression = true) => resolveSessionTargets({
  day: DAY, workouts, progression: progression ? DEFAULT_PROGRESSION : null, week: 4, deloadApplied: false,
  isAdhocDay: false, reducedMode: WINDOW, sessionDateISO: '2026-09-28', trackingByName: TRACKING,
})!;

describe('Pierwsza sesja po urlopie z podciąganiem (legacy 74 kg przy MC 74)', () => {
  const history = normalized([workout('2026-09-21', [
    { ex: PULL, sets: [done(8, 74), done(8, 74), done(7, 74)] },
    { ex: ASSIST, sets: [done(8, 0, { assistWeight: 30 }), done(8, 0, { assistWeight: 30 })] },
  ])]);

  it.each([true, false])('rampa na powtórzeniach, bez kg w celu (silnik progresji: %s)', (progression) => {
    const t = targets(history, progression)[PULL.id];
    expect(t).toMatchObject({ kind: 'deload', targetWeight: null, targetReps: 7, reasonKey: 'progression.reason.modeRampReps' });
  });

  it('prefill: +kg puste (nie 74), powtórzenia z rampy (85% z 8 = 7)', () => {
    const t = targets(history)[PULL.id];
    const prefill = buildPrefillForExercise(PULL, t, history[0].exercises[0].sets, false);
    expect(prefill.map((s) => [s.reps, s.weight])).toEqual([[7, 0], [7, 0], [7, 0]]);
  });

  it('porada na karcie mówi to samo co prefill (7 powt. na MC)', () => {
    const advice = getNextSetAdvice(history, PULL.id, PULL.sets, 0, {
      bodyweightLoaded: true, todayISO: '2026-09-28', reducedMode: WINDOW, exerciseName: PULL.name,
    }, 'pl', 'kg')!;
    expect(advice).toMatchObject({ kind: 'deload', targetWeight: 0, targetReps: 7, isBodyweightLoaded: true });
    expect(advice.reason).toContain('7 powt.');
  });

  it('z dociążeniem przed urlopem rampa obniża DOCIĄŻENIE (10 kg -> 8.5), powtórzenia z góry zakresu', () => {
    const loaded = normalized([workout('2026-09-21', [{ ex: PULL, sets: [done(6, 10), done(6, 10)] }])]);
    const t = targets(loaded)[PULL.id];
    expect(t).toMatchObject({ kind: 'deload', targetWeight: 8.5, targetReps: 8, reasonKey: 'progression.reason.modeRamp' });
    const advice = getNextSetAdvice(loaded, PULL.id, PULL.sets, 0, {
      bodyweightLoaded: true, todayISO: '2026-09-28', reducedMode: WINDOW, exerciseName: PULL.name,
    }, 'pl', 'kg')!;
    expect(advice.targetWeight).toBe(8.5);
  });

  it('asysta: rampa na powtórzeniach (asysta nie jest celem sesji)', () => {
    expect(targets(history)[ASSIST.id]).toMatchObject({ kind: 'deload', targetWeight: null, targetReps: 7, reasonKey: 'progression.reason.modeRampReps' });
  });

  it('druga sesja po urlopie: 92% z bazy sprzed urlopu (8 -> 7), trzecia: zwykła progresja', () => {
    const second = [...history, ...normalized([workout('2026-09-28', [{ ex: PULL, sets: [done(7, 0), done(7, 0)] }])])];
    expect(targets(second)[PULL.id]).toMatchObject({ kind: 'deload', targetReps: 7 });
    const third = [...second, workout('2026-10-01', [{ ex: PULL, sets: [done(8, 0), done(8, 0)] }])];
    expect(targets(third)[PULL.id]).toMatchObject({ kind: 'progress', targetWeight: 2.5, targetReps: 6 });
  });
});

describe('Zamiana w trakcie: weight_reps -> bodyweight_loaded (F4 × F6)', () => {
  const state = (sets: SetData[]) => ({
    exerciseSets: { 'row-1': sets, 'other-1': [done(5, 100)] },
    exerciseNotes: {}, exerciseMetrics: {}, exerciseMetricGrants: {}, skippedExercises: [], sessionSwaps: {},
  });
  const swap = {
    fromId: 'row-1', toId: 'row-1__swap-podciaganie', fromName: 'Wiosłowanie sztangą', toName: PULL.name,
    sets: '3 x 6-8', createSets: () => createEmptySets(3),
  };

  it('prefill 60 kg wiosłowania NIE przechodzi do +kg podciągania (na tej samej pozycji)', () => {
    const next = applySessionExerciseSwap(state([{ reps: 8, weight: 60, completed: false }, { reps: 8, weight: 60, completed: false }]), swap);
    expect(Object.keys(next.exerciseSets)).toEqual(['row-1__swap-podciaganie', 'other-1']);
    expect(next.exerciseSets['row-1__swap-podciaganie'].every((s) => s.weight === 0 && !s.completed)).toBe(true);
    expect(next.exerciseSets['other-1']).toEqual([done(5, 100)]);
  });

  it('odhaczone serie starego ćwiczenia zostają nietknięte, nowe dostaje puste serie obok', () => {
    const next = applySessionExerciseSwap(state([done(8, 60), { reps: 8, weight: 60, completed: false }]), swap);
    expect(next.exerciseSets['row-1']).toEqual([done(8, 60), { reps: 8, weight: 60, completed: false }]);
    expect(Object.keys(next.exerciseSets)).toEqual(['row-1', 'row-1__swap-podciaganie', 'other-1']);
    expect(next.exerciseSets['row-1__swap-podciaganie'].every((s) => s.weight === 0 && s.reps === 0)).toBe(true);
  });

  it('bodyweight_loaded -> bodyweight_loaded (Pompki -> Dips): dociążenie zostaje (ta sama semantyka)', () => {
    const next = applySessionExerciseSwap({
      ...state([]), exerciseSets: { 'push-1': [{ reps: 10, weight: 5, completed: false }] },
    }, { ...swap, fromId: 'push-1', toId: 'push-1__swap-dips', fromName: 'Pompki', toName: 'Dips (pompki na poręczach)' });
    expect(next.exerciseSets['push-1__swap-dips']).toEqual([{ reps: 10, weight: 5, completed: false }]);
  });
});
