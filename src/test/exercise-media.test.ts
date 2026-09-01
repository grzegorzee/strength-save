import { describe, expect, it } from 'vitest';
import { slugifyExercise, getExerciseAnimationUrl, getExercisePosterUrl } from '@/lib/exercise-media';

describe('exercise media helpers', () => {
  const configuredBase = 'https://media.example.test/exercises';

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
  it('używa publicznego CDN aplikacji także bez zmiennej środowiskowej', () => {
    expect(getExerciseAnimationUrl('Przysiad ze sztangą (High Bar)')).toBe(
      'https://media.gjasionowicz.pl/exercises/przysiad-ze-sztanga-high-bar.mp4',
    );
    expect(getExercisePosterUrl('Przysiad ze sztangą (High Bar)')).toBe(
      'https://media.gjasionowicz.pl/exercises/przysiad-ze-sztanga-high-bar.jpg',
    );
  });

  it('returns a configured CDN URL for exercises that have an animation', () => {
    expect(getExerciseAnimationUrl('Przysiad ze sztangą (High Bar)', configuredBase)).toBe(
      'https://media.example.test/exercises/przysiad-ze-sztanga-high-bar.mp4',
    );
    expect(getExerciseAnimationUrl('Wyciskanie sztangi na ławce płaskiej', configuredBase)).toBe(
      'https://media.example.test/exercises/wyciskanie-sztangi-na-lawce-plaskiej.mp4',
    );
    expect(getExerciseAnimationUrl('Podciąganie na drążku', configuredBase)).toBe(
      'https://media.example.test/exercises/podciaganie-na-drazku.mp4',
    );
  });

  // Z195: WebKit przy preload=metadata NIE maluje żadnej klatki wideo — miniatura
  // renderuje poster JPEG z CDN (ta sama nazwa co mp4, rozszerzenie .jpg).
  it('Z195: getExercisePosterUrl zwraca URL jpg dla ćwiczenia z animacją, null bez niej', () => {
    expect(getExercisePosterUrl('Burpees', configuredBase)).toBe(
      'https://media.example.test/exercises/burpees.jpg',
    );
    expect(getExercisePosterUrl('Przysiad ze sztangą (High Bar)', configuredBase)).toBe(
      'https://media.example.test/exercises/przysiad-ze-sztanga-high-bar.jpg',
    );
    expect(getExercisePosterUrl('Ćwiczenie bez animacji')).toBeNull();
    expect(getExercisePosterUrl()).toBeNull();
  });
});
