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

  // Mapa ANIMATION_FILES jest uzupełniana ręcznie, więc literówka w slugu nie
  // wywoła błędu, tylko po cichu wyłączy animację. Ten test to wyłapuje.
  it('returns a CDN URL for exercises that have an animation', () => {
    expect(getExerciseAnimationUrl('Przysiad ze sztangą (High Bar)')).toBe(
      'https://media.gjasionowicz.pl/exercises/przysiad-ze-sztanga-high-bar.mp4',
    );
    expect(getExerciseAnimationUrl('Wyciskanie sztangi na ławce płaskiej')).toBe(
      'https://media.gjasionowicz.pl/exercises/wyciskanie-sztangi-na-lawce-plaskiej.mp4',
    );
    expect(getExerciseAnimationUrl('Podciąganie na drążku')).toBe(
      'https://media.gjasionowicz.pl/exercises/podciaganie-na-drazku.mp4',
    );
  });
});
