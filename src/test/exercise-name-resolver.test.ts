import { describe, expect, it } from 'vitest';
import { buildWorkoutResolver } from '@/lib/exercise-name-resolver';
import type { TrainingDay } from '@/data/trainingPlan';
import type { PlanCycle } from '@/types/cycles';
import type { WorkoutSession } from '@/types';

// Nowy plan (push/pull) — celowo reużywa id 'tpl-ex-1', który w starym planie znaczył co innego.
const newPlan: TrainingDay[] = [
  {
    id: '2026-06-01-d1', dayName: 'Push', weekday: 'monday', focus: 'Klata/Barki',
    exercises: [{ id: 'tpl-ex-1', name: 'Wyciskanie sztangi', sets: '4x6', instructions: [] }],
  },
];

// Stary zarchiwizowany cykl (FBW) — tu 'tpl-ex-1' to przysiad.
const archivedCycle: PlanCycle = {
  id: 'cycle-fbw',
  userId: 'u1',
  days: [
    {
      id: 'fbw-d1', dayName: 'FBW A', weekday: 'friday', focus: 'Całe ciało',
      exercises: [{ id: 'tpl-ex-1', name: 'Przysiad ze sztangą', sets: '5x5', instructions: [] }],
    },
  ],
  durationWeeks: 12,
  startDate: '2026-03-01',
  endDate: '2026-05-28',
  status: 'completed',
  createdAt: '2026-03-01T00:00:00.000Z',
  stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
};

const mkWorkout = (over: Partial<WorkoutSession>): WorkoutSession => ({
  id: 'w', userId: 'u1', dayId: 'fbw-d1', date: '2026-05-24', completed: true,
  exercises: [{ exerciseId: 'tpl-ex-1', sets: [{ reps: 5, weight: 100, completed: true }] }],
  ...over,
});

describe('exercise-name-resolver', () => {
  it('preferuje snapshot z treningu nad jakimkolwiek planem', () => {
    const r = buildWorkoutResolver(newPlan, [archivedCycle]);
    const w = mkWorkout({ exercises: [{ exerciseId: 'tpl-ex-1', name: 'Martwy ciąg', sets: [{ reps: 5, weight: 100, completed: true }] }] });
    expect(r.resolveExerciseName(w, 'tpl-ex-1')).toBe('Martwy ciąg');
  });

  it('bez snapshotu używa cyklu po cycleId (nie myli z aktualnym planem mimo kolizji id)', () => {
    const r = buildWorkoutResolver(newPlan, [archivedCycle]);
    const w = mkWorkout({ cycleId: 'cycle-fbw' });
    expect(r.resolveExerciseName(w, 'tpl-ex-1')).toBe('Przysiad ze sztangą');
  });

  it('bez cycleId dopasowuje cykl po zakresie dat', () => {
    const r = buildWorkoutResolver(newPlan, [archivedCycle]);
    const w = mkWorkout({ date: '2026-05-24' }); // mieści się w 2026-03-01..2026-05-28
    expect(r.resolveExerciseName(w, 'tpl-ex-1')).toBe('Przysiad ze sztangą');
  });

  it('fallback do aktualnego planu gdy brak snapshotu i cyklu', () => {
    const r = buildWorkoutResolver(newPlan, []);
    const w = mkWorkout({ dayId: '2026-06-01-d1', date: '2026-06-02' });
    expect(r.resolveExerciseName(w, 'tpl-ex-1')).toBe('Wyciskanie sztangi');
  });

  it('kompletny sierota: zwraca surowy id', () => {
    const r = buildWorkoutResolver(newPlan, []);
    const w = mkWorkout({ date: '2026-05-24' });
    expect(r.resolveExerciseName(w, 'nieznane-id')).toBe('nieznane-id');
  });

  it('resolveDayLabel: snapshot dnia ma priorytet', () => {
    const r = buildWorkoutResolver(newPlan, [archivedCycle]);
    const w = mkWorkout({ dayName: 'FBW Piątek', dayFocus: 'Siła' });
    expect(r.resolveDayLabel(w)).toEqual({ dayName: 'FBW Piątek', focus: 'Siła' });
  });

  it('resolveDayLabel: z cyklu gdy brak snapshotu', () => {
    const r = buildWorkoutResolver(newPlan, [archivedCycle]);
    const w = mkWorkout({ cycleId: 'cycle-fbw' });
    expect(r.resolveDayLabel(w)).toEqual({ dayName: 'FBW A', focus: 'Całe ciało' });
  });
});
