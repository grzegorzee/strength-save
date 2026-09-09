import { describe, expect, it } from 'vitest';
import { buildDayFromDraft, type DraftDaySnapshot } from '@/lib/workout-day-view';
import { computeWeeklyTargets } from '@/lib/progression-engine';
import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';

const plan: TrainingDay = {
  id: 'plan-day', dayName: 'Środa', weekday: 'wednesday', focus: 'Full Body',
  exercises: [
    { id: 'rdl', name: 'Martwy Ciąg Rumuński (RDL)', sets: '3 x 8-10', instructions: [] },
    { id: 'plank', name: 'Plank', sets: '3 x 45s', instructions: [] },
  ],
};
const history: WorkoutSession[] = [{
  id: 'last-week', userId: 'synthetic-owner', dayId: plan.id, date: '2026-09-02', completed: true,
  exercises: [{ exerciseId: 'rdl', name: plan.exercises[0].name,
    sets: Array.from({ length: 3 }, () => ({ weight: 60, reps: 10, completed: true })),
  }],
}];
const target = (day: TrainingDay) => computeWeeklyTargets([day], history, 2, { enabled: true, deloadEveryWeeks: 5 })[day.id].rdl;

describe('planned prescription survives workout draft restoration', () => {
  it('keeps the 62.5×8 target through start → another quick session → cold resume, preserving the complete plan', () => {
    const expected = target(plan);
    expect(expected).toMatchObject({ targetWeight: 62.5, targetReps: 8, kind: 'progress' });
    const draft: DraftDaySnapshot = { dayId: plan.id, exerciseSets: {
      rdl: Array.from({ length: 3 }, () => ({ weight: 62.5, reps: 8, completed: false })),
    } };
    const started = buildDayFromDraft(plan, draft);
    expect(target(started)).toEqual(expected);
    const quick = buildDayFromDraft(undefined, { dayId: 'adhoc-other', exerciseSets: {
      'quick-rdl': [{ weight: 80, reps: 5, completed: true }],
    }, exerciseNames: { 'quick-rdl': plan.exercises[0].name } });
    expect(quick.exercises).toHaveLength(1);
    expect(quick.exercises[0].sets).toBe('1 serii');
    const resumed = buildDayFromDraft(plan, JSON.parse(JSON.stringify(draft)));
    expect(target(resumed)).toEqual(expected);
    expect(resumed.exercises.map((exercise) => exercise.id)).toEqual(['rdl', 'plank']);
    expect(draft.exerciseSets.rdl).toHaveLength(3);
    expect(draft.exerciseSets.rdl.every((set) => !set.completed)).toBe(true);
  });

  it('does not replace rep/time prescriptions with actual draft set counts or modify logged sets', () => {
    const draft: DraftDaySnapshot = { dayId: plan.id, exerciseSets: {
      rdl: [{ weight: 20, reps: 10, completed: true, isWarmup: true }, { weight: 62.5, reps: 8, completed: false }],
      plank: [{ weight: 0, reps: 0, durationSec: 60, completed: true }],
    } };
    const before = JSON.stringify(draft);
    const restored = buildDayFromDraft(plan, draft);
    expect(restored.exercises.map((exercise) => exercise.sets)).toEqual(['3 x 8-10', '3 x 45s']);
    expect(JSON.stringify(draft)).toBe(before);
    expect(draft.exerciseSets.rdl.filter((set) => !set.isWarmup)).toHaveLength(1);
  });
});
