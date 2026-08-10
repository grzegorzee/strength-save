import { describe, expect, it } from 'vitest';
import { parseWatchQuickExerciseParams } from '@/lib/adhoc-workout';

describe('Watch quick workout route (X25/Z225)', () => {
  it('odtwarza jedno ćwiczenie i kanoniczne kg z parametrów routera', () => {
    const params = new URLSearchParams({
      quickExerciseId: 'bench-1', quickExerciseName: 'Wyciskanie',
      quickSetCount: '3', quickReps: '8', quickWeight: '72.5',
    });
    expect(parseWatchQuickExerciseParams(params)).toEqual({
      id: 'bench-1', name: 'Wyciskanie', setCount: 3, reps: 8, weight: 72.5,
    });
  });

  it('odrzuca zakresy i tekst spoza kontraktu zamiast tworzyć wadliwy trening', () => {
    expect(parseWatchQuickExerciseParams(new URLSearchParams({
      quickExerciseId: '../x', quickExerciseName: 'x',
      quickSetCount: '30', quickReps: '8', quickWeight: '70',
    }))).toBeNull();
    expect(parseWatchQuickExerciseParams(new URLSearchParams({
      quickExerciseId: 'x', quickExerciseName: 'x'.repeat(121),
      quickSetCount: '3', quickReps: '8', quickWeight: '70',
    }))).toBeNull();
  });
});
