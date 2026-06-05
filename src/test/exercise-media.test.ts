import { describe, expect, it } from 'vitest';
import { slugifyExercise, getExerciseAnimationUrl } from '@/lib/exercise-media';

describe('exercise media helpers', () => {
  it('slugifies exercise names without Polish characters', () => {
    expect(slugifyExercise('Przysiad ze sztangą (Low Bar)')).toBe('przysiad-ze-sztanga-low-bar');
    expect(slugifyExercise('Wykroki bułgarskie')).toBe('wykroki-bulgarskie');
    expect(slugifyExercise('Hip Thrust ze sztangą')).toBe('hip-thrust-ze-sztanga');
  });

  it('returns null animation URL when no file is mapped yet', () => {
    expect(getExerciseAnimationUrl('Przysiad ze sztangą')).toBeNull();
    expect(getExerciseAnimationUrl()).toBeNull();
    expect(getExerciseAnimationUrl('')).toBeNull();
  });
});
