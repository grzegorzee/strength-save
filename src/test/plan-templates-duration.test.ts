import { describe, expect, it } from 'vitest';
import { exerciseLibrary } from '@/data/exerciseLibrary';
import { planTemplates } from '@/data/planTemplates';
import { getTrackingType } from '@/lib/set-tracking';
import { parseDurationRange, parseRepRange, parseSetCount } from '@/lib/exercise-utils';
import { SET_COUNTDOWN_DEFAULT_SEC } from '@/lib/set-countdown';

// WP-C (X37): cwiczenia czasowe w szablonach maja zapis w SEKUNDACH wg poziomu
// szablonu (poczatkujacy 30 s, sredni 45 s, zaawansowany 60 s), nie "3 x MAX"
// ani zakres, ktory parseRepRange bralo za powtorzenia.

const timedTemplateExercises = () => planTemplates
  .filter((tpl) => tpl.source !== 'imported')
  .flatMap((tpl) => tpl.days.flatMap((day) => day.exercises
    .map((exercise) => ({ tpl, exercise, lib: exerciseLibrary.find((e) => e.name === exercise.name) }))
    .filter(({ lib }) => lib && getTrackingType(lib) === 'duration')));

describe('szablony planow: serie na czas (WP-C X37)', () => {
  it('Hollow Hold jest cwiczeniem czasowym; Hollow Rock zostaje na powtorzenia', () => {
    const hold = exerciseLibrary.find((e) => e.name === 'Hollow Hold');
    const rock = exerciseLibrary.find((e) => e.name.startsWith('Hollow Rock'));
    expect(hold && getTrackingType(hold)).toBe('duration');
    expect(rock && getTrackingType(rock)).toBe('bodyweight_reps');
  });

  it('kazde cwiczenie czasowe w szablonie ma sekundy wg poziomu szablonu', () => {
    const rows = timedTemplateExercises();
    expect(rows.length).toBeGreaterThan(0);
    for (const { tpl, exercise } of rows) {
      const range = parseDurationRange(exercise.sets);
      expect(range, `${tpl.id}: ${exercise.name} "${exercise.sets}"`).not.toBeNull();
      expect(range!.min, `${tpl.id}: ${exercise.name}`).toBe(SET_COUNTDOWN_DEFAULT_SEC[tpl.level]);
      expect(range!.max).toBe(range!.min);
      // Liczba serii bez zmian wzgledem dotychczasowego parsera.
      expect(range!.sets).toBe(parseSetCount(exercise.sets));
      // Sekundy NIE trafiaja do powtorzen.
      expect(parseRepRange(exercise.sets)).toEqual({ min: 0, max: 0, isMax: true });
    }
  });
});
