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

// 2026-10-24: plan "Plecy i Pośladki" ma animację przy każdym ćwiczeniu. Pięć
// klipów wygenerowanych ponownie (v1 zdjęte w przeglądzie 2026-08-11 jako błędne
// albo nigdy niewpięte) idzie pod nazwą -v2, żeby cache CDN/WebView nie podał
// starego, błędnego pliku.
describe('animacje planu tpl-back-glutes-3', () => {
  it('każde ćwiczenie planu ma animację i poster', async () => {
    const { getPlanTemplateById } = await import('@/data/planTemplates');
    const tpl = getPlanTemplateById('tpl-back-glutes-3')!;
    for (const exercise of tpl.days.flatMap((d) => d.exercises)) {
      expect(getExerciseAnimationUrl(exercise.name), exercise.name).not.toBeNull();
      expect(getExercisePosterUrl(exercise.name), exercise.name).not.toBeNull();
    }
  });

  it('ponownie wygenerowane klipy wskazują pliki -v2', () => {
    expect(getExerciseAnimationUrl('Wykroki bułgarskie')).toBe('https://media.gjasionowicz.pl/exercises/wykroki-bulgarskie-v2.mp4');
    expect(getExercisePosterUrl('Pull Through')).toBe('https://media.gjasionowicz.pl/exercises/pull-through-v2.jpg');
    expect(getExerciseAnimationUrl('Odwodziciele na maszynie')).toMatch(/odwodziciele-na-maszynie-v2\.mp4$/);
    expect(getExerciseAnimationUrl('Glute Kickback na wyciągu')).toMatch(/glute-kickback-na-wyciagu-v2\.mp4$/);
    expect(getExerciseAnimationUrl('Ściąganie linki prostymi ramionami')).toMatch(/sciaganie-linki-prostymi-ramionami-v2\.mp4$/);
  });
});
