import type { LibraryExercise } from '@/data/exerciseLibrary';
import { EXERCISE_NAME_EN } from '@/data/exercise-i18n';
import type { WorkoutSession } from '@/types';
import { clampSet } from '@/lib/workout-sanitizers';
import type { ImportedWorkout } from '@/lib/workout-import/parser';

// Mapowanie nazw ćwiczeń z importu (Z109): auto-match do kanonicznych nazw PL.
// Kolejność prób: własne ćwiczenia usera -> dokładna nazwa PL -> alias Strong/Hevy ->
// odwrócona mapa EN->PL -> transformacja "X (Equipment)" -> "Equipment X".
// Nieznane nazwy NIE są zgadywane — trafiają do unmapped (ręczny mapper w UI).

const normalize = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

// Słownik aliasów najpopularniejszych nazw Strong/Hevy -> kanoniczna nazwa PL biblioteki.
// Klucze znormalizowane (lowercase).
const STRONG_HEVY_ALIASES: Record<string, string> = {
  // Klatka
  'bench press (barbell)': 'Wyciskanie sztangi na ławce płaskiej',
  'bench press (dumbbell)': 'Wyciskanie hantli na ławce płaskiej',
  'incline bench press (dumbbell)': 'Wyciskanie hantli (Lekki skos)',
  'push up': 'Pompki',
  'push-up': 'Pompki',
  'chest dip': 'Dipy na poręczach (na klatkę)',
  // Plecy
  'deadlift (barbell)': 'Martwy ciąg klasyczny',
  'romanian deadlift (barbell)': 'Martwy Ciąg Rumuński (RDL)',
  'bent over row (barbell)': 'Wiosłowanie sztangą',
  'pull up': 'Podciąganie na drążku',
  'pull-up': 'Podciąganie na drążku',
  'pull up (assisted)': 'Podciąganie wspomagane na maszynie',
  'assisted pull up': 'Podciąganie wspomagane na maszynie',
  'chin up': 'Podciąganie na drążku podchwytem',
  'chin-up': 'Podciąganie na drążku podchwytem',
  'lat pulldown (cable)': 'Ściąganie drążka (Szeroki nachwyt)',
  'lat pulldown (machine)': 'Ściąganie drążka (Szeroki nachwyt)',
  'seated row (cable)': 'Wiosłowanie na lince siedząc',
  'seated cable row': 'Wiosłowanie na lince siedząc',
  // Barki
  'overhead press (barbell)': 'Wyciskanie sztangi nad głowę (OHP)',
  'shoulder press (barbell)': 'Wyciskanie sztangi nad głowę (OHP)',
  'lateral raise (dumbbell)': 'Wznosy bokiem (Lateral Raise)',
  'face pull (cable)': 'Face Pull',
  'shrug (barbell)': 'Szrugi ze sztangą',
  'shrug (dumbbell)': 'Szrugi z hantlami',
  // Nogi
  'squat (barbell)': 'Przysiad ze sztangą (High Bar)',
  'front squat (barbell)': 'Przysiad przedni ze sztangą',
  'goblet squat': 'Przysiad goblet',
  'goblet squat (dumbbell)': 'Przysiad goblet',
  'leg press': 'Prasa nożna',
  'leg press (machine)': 'Prasa nożna',
  'leg extension (machine)': 'Wyprosty nóg na maszynie',
  'seated leg curl (machine)': 'Uginanie nóg na maszynie (Siedząc)',
  'lying leg curl (machine)': 'Uginanie nóg na maszynie (Leżąc)',
  'walking lunge': 'Wykroki chodzone',
  'lunge (dumbbell)': 'Wykroki chodzone',
  'hip thrust (barbell)': 'Hip Thrust ze sztangą',
  'hip thrust': 'Hip Thrust (Wypychanie bioder)',
  'standing calf raise': 'Wspięcia na palce stojąc',
  'seated calf raise': 'Wspięcia na palce siedząc',
  // Ramiona
  'bicep curl (barbell)': 'Uginanie sztangi stojąc',
  'bicep curl (dumbbell)': 'Uginanie hantli stojąc',
  'hammer curl (dumbbell)': 'Uginanie hantli hammer',
  'triceps extension (cable)': 'Prostowanie ramion na wyciągu',
  'triceps pushdown (cable)': 'Prostowanie ramion na wyciągu',
  'dips': 'Dips (pompki na poręczach)',
  'dip': 'Dips (pompki na poręczach)',
  'triceps dip': 'Dips (pompki na poręczach)',
  // Core / inne
  'plank': 'Plank',
  'side plank': 'Plank boczny (Side Plank)',
  "farmer's walk": "Spacer farmera (Farmer's Walk)",
  'farmers walk': "Spacer farmera (Farmer's Walk)",
  'russian twist': 'Rosyjskie skręty (Russian Twist)',
  'crunch': 'Brzuszki (Crunch)',
  'burpee': 'Burpees',
};

export interface AutoMapResult {
  mapped: Map<string, string>;
  unmapped: string[];
}

export const autoMapExercises = (
  importedNames: string[],
  library: LibraryExercise[],
  customExercises: { name: string }[],
): AutoMapResult => {
  const libByNorm = new Map(library.map((e) => [normalize(e.name), e.name]));
  const customByNorm = new Map(customExercises.map((e) => [normalize(e.name), e.name]));
  // Odwrócona mapa EN->PL, ograniczona do nazw obecnych w bibliotece.
  const enToPl = new Map<string, string>();
  for (const [pl, en] of Object.entries(EXERCISE_NAME_EN)) {
    if (libByNorm.has(normalize(pl))) enToPl.set(normalize(en), pl);
  }

  const mapped = new Map<string, string>();
  const unmapped: string[] = [];

  for (const original of importedNames) {
    const norm = normalize(original);

    const custom = customByNorm.get(norm);
    if (custom) { mapped.set(original, custom); continue; }

    const exactPl = libByNorm.get(norm);
    if (exactPl) { mapped.set(original, exactPl); continue; }

    const alias = STRONG_HEVY_ALIASES[norm];
    if (alias && libByNorm.has(normalize(alias))) { mapped.set(original, alias); continue; }

    const fromEn = enToPl.get(norm);
    if (fromEn) { mapped.set(original, fromEn); continue; }

    // "Bench Press (Barbell)" -> "barbell bench press" (format naszej mapy EN).
    const equipMatch = norm.match(/^(.+?) \(([^)]+)\)$/);
    if (equipMatch) {
      const flipped = `${equipMatch[2]} ${equipMatch[1]}`;
      const fromFlipped = enToPl.get(flipped);
      if (fromFlipped) { mapped.set(original, fromFlipped); continue; }
      // Sam rdzeń bez sprzętu (np. "Plank (Bodyweight)").
      const fromBase = enToPl.get(equipMatch[1]) ?? libByNorm.get(equipMatch[1]);
      if (fromBase) { mapped.set(original, fromBase); continue; }
      const aliasBase = STRONG_HEVY_ALIASES[equipMatch[1]];
      if (aliasBase && libByNorm.has(normalize(aliasBase))) { mapped.set(original, aliasBase); continue; }
    }

    unmapped.push(original);
  }

  return { mapped, unmapped };
};

/**
 * Buduje WorkoutSession[] z zaparsowanych treningów (Z109): id/dayId = imported-<batchId>-<n>,
 * snapshot nazw (mapping albo oryginał), completed, tag importBatchId, zero undefined.
 */
export const buildImportedSessions = (
  parsed: ImportedWorkout[],
  mapping: Map<string, string>,
  userId: string,
  batchId: string,
): WorkoutSession[] => {
  const sorted = [...parsed].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((workout, index) => {
    const id = `imported-${batchId}-${index + 1}`;
    return {
      id,
      userId,
      dayId: id,
      date: workout.date,
      completed: true,
      dayName: workout.dayName,
      ...(workout.notes && { notes: workout.notes }),
      importBatchId: batchId,
      exercises: workout.exercises.map((exercise, exIndex) => {
        const name = mapping.get(exercise.name) ?? exercise.name;
        const rpeValues = exercise.sets
          .map((s) => s.rpe)
          .filter((r): r is number => typeof r === 'number' && Number.isFinite(r));
        return {
          exerciseId: `imported-ex-${exIndex + 1}`,
          name,
          ...(exercise.notes && { notes: exercise.notes }),
          // RPE ćwiczenia = najcięższa seria (model trzyma RPE per ćwiczenie).
          ...(rpeValues.length > 0 && { rpe: Math.max(...rpeValues) }),
          sets: exercise.sets.map((set) => clampSet({ ...set, completed: true })),
        };
      }),
    };
  });
};
