import { describe, expect, it } from 'vitest';
import { buildSwappedExerciseId, resetSetsForExerciseSwap, swapExerciseIdentity } from '@/lib/exercise-swap';
import type { Exercise } from '@/data/trainingPlan';

const exercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 'ex-1-1',
  name: 'Wyciskanie sztangi na ławce płaskiej',
  sets: '3 x 6-8',
  instructions: [{ title: 'Tip', content: 'Old tip' }],
  ...overrides,
});

describe('exercise swap identity', () => {
  it('assigns a new stable identity when replacing an exercise', () => {
    const swapped = swapExerciseIdentity(
      exercise(),
      { name: 'Pompki', sets: '3 x MAX' },
      ['ex-1-1', 'ex-1-2'],
    );

    expect(swapped.id).not.toBe('ex-1-1');
    expect(swapped.id).toContain('swap-pompki');
    expect(swapped.name).toBe('Pompki');
    expect(swapped.instructions).toEqual([]);
  });

  it('keeps generated swap ids unique among sibling exercises', () => {
    expect(buildSwappedExerciseId('ex-1-1', 'Pompki', ['ex-1-1', 'ex-1-1__swap-pompki']))
      .toBe('ex-1-1__swap-pompki-2');
  });

  it('clears stale set data when switching weighted and bodyweight exercises', () => {
    const sets = [
      { reps: 5, weight: 40, completed: true, isWarmup: true },
      { reps: 8, weight: 80, completed: true },
    ];

    expect(resetSetsForExerciseSwap(sets, 'Wyciskanie sztangi na ławce płaskiej', 'Pompki')).toEqual([
      { reps: 0, weight: 0, completed: false, isWarmup: true },
      { reps: 0, weight: 0, completed: false },
    ]);
  });
});
