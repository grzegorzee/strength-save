import { describe, expect, it } from 'vitest';
import { exerciseLibrary, findLibraryExercise, isBodyweightLoadedExercise } from '@/data/exerciseLibrary';
import { getTrackingType } from '@/lib/set-tracking';
import { isBodyweightExercise } from '@/lib/exercise-utils';

// F6: tabela właściciela (2026-09-29) — typy logowania ćwiczeń z masą ciała.
const trackingOf = (name: string) => {
  const entry = findLibraryExercise(name);
  expect(entry, name).toBeDefined();
  return getTrackingType(entry!);
};

const LOADED = [
  'Podciąganie na drążku', 'Dips (pompki na poręczach)', 'Dipy z obciążeniem (na klatkę)',
  'Podciąganie na drążku podchwytem', 'Dipy na poręczach (na klatkę)', 'Pompki',
  'Pompki na podwyższeniu (nogi w górze)', 'Pompki diamentowe', 'Pompki diamentowe (Diamond Push-up)',
  'Australijskie podciąganie (Inverted Row)', 'Pompki w pozycji szczytowej (Pike Push-up)',
  'Dipy na ławce (Bench Dips)', 'Prostowniki grzbietu (Hyperextensions)', 'Glute Bridge',
  'Mostek pośladkowy na jednej nodze', 'Frog Pump (mostek z rozłożonymi kolanami)',
  'Glute-Ham Raise (GHR)', 'Nordic Hamstring Curl', 'Przysiad pistolet (jednonóż)', 'Sissy Squat',
  'Cossack Squat', 'Zakroki sprinterskie', 'Wejścia bokiem na skrzynię',
  'Wspięcia na palce jednonóż na podwyższeniu (masa ciała)', 'Reverse Crunch na ławce', 'Ab Rollout',
  'Unoszenie nóg w zwisie', 'Unoszenie kolan w zwisie', 'Nogi do drążka (Toes to Bar)',
  'Spięcia brzucha na ławce skośnej (Decline Sit-up)', 'Skręty rosyjskie', 'Brzuszki klasyczne (Crunch)',
  'Pełne spięcie brzucha (Sit-up)',
];

describe('F6 — biblioteka: typy logowania z tabeli właściciela', () => {
  it.each(LOADED)('%s = bodyweight_loaded (i nadal ćwiczenie z masą ciała)', (name) => {
    expect(trackingOf(name)).toBe('bodyweight_loaded');
    expect(isBodyweightLoadedExercise(name)).toBe(true);
    expect(isBodyweightExercise(name)).toBe(true);
  });

  it('dokładnie 33 ćwiczenia bodyweight_loaded (nic poza tabelą)', () => {
    expect(exerciseLibrary.filter((e) => e.tracking === 'bodyweight_loaded').map((e) => e.name).sort())
      .toEqual([...LOADED].sort());
  });

  it('Dipy na maszynie = asysta, L-sit i skakanka = czas', () => {
    expect(trackingOf('Dipy na maszynie (Assisted Dip Machine)')).toBe('assisted_bodyweight');
    expect(trackingOf('L-sit (Podpór kątowy)')).toBe('duration');
    expect(trackingOf('Skakanka jako trening łydek')).toBe('duration');
  });

  it.each([
    ['Dead Bug (Robak - Brzuch)', 'bodyweight_reps'],
    ['Burpees', 'bodyweight_reps'],
    ['Mountain Climbers', 'bodyweight_reps'],
    ['Superman (Unoszenie tułowia leżąc na brzuchu)', 'bodyweight_reps'],
    ['Hollow Rock (Bujanie w łódce)', 'bodyweight_reps'],
    ['V-up (Scyzoryk)', 'bodyweight_reps'],
    ['Dragon Flag (Flaga Smoka)', 'bodyweight_reps'],
    ['Rotacje ramienia z gumą frontem', 'bodyweight_reps'],
    ['Wykroki chodzone', 'weight_reps'],
    ['Wykroki bułgarskie', 'weight_reps'],
    ['Podciąganie wspomagane na maszynie', 'assisted_bodyweight'],
    ['Dipy wspomagane na maszynie', 'assisted_bodyweight'],
    ['Plank', 'duration'],
    ['Wyciskanie sztangi na ławce płaskiej', 'weight_reps'],
  ])('bez zmian: %s = %s', (name, tracking) => {
    expect(trackingOf(name)).toBe(tracking);
  });

  it('nazwy z planów spoza biblioteki mapują się na istniejące wpisy (alias)', () => {
    expect(findLibraryExercise('Pompki na poręczach')?.name).toBe('Dips (pompki na poręczach)');
    expect(findLibraryExercise('Podciaganie nachwytem')?.name).toBe('Podciąganie na drążku');
    expect(isBodyweightLoadedExercise('Pompki na poręczach')).toBe(true);
    expect(isBodyweightLoadedExercise('Nieznane ćwiczenie')).toBe(false);
  });
});
