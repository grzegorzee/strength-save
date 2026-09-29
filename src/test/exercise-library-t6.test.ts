import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exerciseLibrary, categoryLabels, type LibraryExercise } from '@/data/exerciseLibrary';
import { exerciseDetails, categoryToPrimaryMuscle } from '@/data/exercise-details';
import { exerciseDetailsEn } from '@/data/exercise-details-en';
import { EXERCISE_NAME_EN, EXERCISE_INSTRUCTION_EN, localizeCategory } from '@/data/exercise-i18n';
import { getExerciseAnimationUrl, getExercisePosterUrl, slugifyExercise } from '@/lib/exercise-media';
import { primaryMuscleToCategory } from '@/lib/volume-split';

// T6 (2026-09-29): rozbudowa bazy ćwiczeń 243 -> 379 i kategoria Kondycja.

const ALL_CATEGORIES: LibraryExercise['category'][] = [
  'chest', 'back', 'shoulders', 'legs', 'arms', 'core', 'glutes', 'calves', 'conditioning',
];

describe('T6: kategorie biblioteki', () => {
  it('każda kategoria ma etykietę PL i EN (nie klucz techniczny)', () => {
    expect(Object.keys(categoryLabels).sort()).toEqual([...ALL_CATEGORIES].sort());
    for (const category of ALL_CATEGORIES) {
      const pl = localizeCategory(category, 'pl');
      const en = localizeCategory(category, 'en');
      expect(pl, category).toBe(categoryLabels[category]);
      expect(pl, category).not.toBe(category);
      expect(en, category).not.toBe(category);
    }
    expect(localizeCategory('conditioning', 'pl')).toBe('Kondycja');
    expect(localizeCategory('conditioning', 'en')).toBe('Conditioning');
  });

  it('każde ćwiczenie biblioteki ma kategorię z taksonomii', () => {
    for (const ex of exerciseLibrary) expect(ALL_CATEGORIES, ex.name).toContain(ex.category);
  });

  it('Kondycja obejmuje cardio, sanie, Wall Ball i boje olimpijskie', () => {
    const conditioning = exerciseLibrary.filter((e) => e.category === 'conditioning').map((e) => e.name);
    expect(conditioning).toEqual(expect.arrayContaining([
      'Rower stacjonarny', 'Wioślarz (ergometr wioślarski)', 'Pchanie sań (Sled Push)', 'Ciągnięcie sań (Sled Drag)',
      'Rzut piłką lekarską o ścianę (Wall Ball)', 'Zarzut siłowy sztangi (Power Clean)', 'Rwanie hantla jednorącz (Dumbbell Snatch)',
    ]));
    expect(conditioning).toHaveLength(26);
  });

  it('mapy kategorii -> mięsień i mięsień -> kategoria znają Kondycję', () => {
    expect(categoryToPrimaryMuscle.conditioning).toBe('fullbody');
    for (const category of ALL_CATEGORIES) expect(categoryToPrimaryMuscle[category], category).toBeDefined();
    expect(primaryMuscleToCategory.fullbody).toBeDefined();
  });
});

describe('T6: import 136 ćwiczeń', () => {
  it('biblioteka ma 379 unikalnych nazw i slugów CDN', () => {
    expect(exerciseLibrary).toHaveLength(379);
    expect(new Set(exerciseLibrary.map((e) => e.name)).size).toBe(379);
    expect(new Set(exerciseLibrary.map((e) => slugifyExercise(e.name))).size).toBe(379);
  });

  it('każde ćwiczenie ma nazwę EN, a nowe wpisy mają wskazówkę EN i szczegóły PL/EN', () => {
    for (const ex of exerciseLibrary) expect(EXERCISE_NAME_EN[ex.name], ex.name).toBeTruthy();
    for (const name of ['Pchanie sań (Sled Push)', 'Pompki na kolanach', 'Rower stacjonarny', 'Wstawanie z ziemi z kettlebell (Turkish Get-up)']) {
      expect(EXERCISE_INSTRUCTION_EN[name], name).toBeTruthy();
      expect(exerciseDetails[name]?.steps.length, name).toBeGreaterThanOrEqual(3);
      expect(exerciseDetailsEn[name]?.steps.length, name).toBeGreaterThanOrEqual(3);
    }
  });

  it('ćwiczenie bez animacji ma fallback: brak URL wideo/postera i istniejąca ilustracja partii', () => {
    const withoutAnimation = exerciseLibrary.filter((e) => getExerciseAnimationUrl(e.name) === null);
    expect(withoutAnimation.length).toBeGreaterThanOrEqual(136);
    for (const ex of withoutAnimation) {
      expect(getExercisePosterUrl(ex.name), ex.name).toBeNull();
      const muscle = exerciseDetails[ex.name]?.primaryMuscle ?? categoryToPrimaryMuscle[ex.category];
      expect(muscle, ex.name).toBeTruthy();
      expect(existsSync(resolve(__dirname, '../../public/muscles', `${muscle}.webp`)), `${ex.name} -> ${muscle}`).toBe(true);
    }
  });
});

describe('T6 (F7): requiresBodyweightSupport w bibliotece', () => {
  const flagged = new Set(exerciseLibrary.filter((e) => e.requiresBodyweightSupport).map((e) => e.name));

  it.each([
    'Plank', 'Plank boczny (Side Plank)', 'Plank z dotykaniem barków', 'Pompki', 'Pompki diamentowe',
    'Pompki na kolanach', 'Pompki w pozycji szczytowej (Pike Push-up)', 'Podciąganie na drążku',
    'Podciąganie na drążku podchwytem', 'Dips (pompki na poręczach)', 'Dipy na ławce (Bench Dips)', 'Burpees',
    'Mountain Climbers', 'L-sit (Podpór kątowy)', 'Dragon Flag (Flaga Smoka)', 'Nogi do drążka (Toes to Bar)',
    'Unoszenie nóg w zwisie', 'Unoszenie kolan w zwisie', 'Zwis na drążku (Dead Hang)', 'Chód niedźwiedzia (Bear Crawl)',
  ])('%s wymaga podporu masą ciała', (name) => {
    expect(flagged.has(name)).toBe(true);
  });

  it.each([
    'Dead Bug (Robak - Brzuch)', 'Podciąganie wspomagane na maszynie', 'Ściąganie drążka neutralnym chwytem',
    'Glute Bridge', 'Modlitewnik (Cable Crunch)', 'Reverse Crunch na ławce', 'Przysiad goblet',
  ])('%s nie jest oznaczone', (name) => {
    expect(exerciseLibrary.some((e) => e.name === name)).toBe(true);
    expect(flagged.has(name)).toBe(false);
  });
});
