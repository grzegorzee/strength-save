// F6 (2026-09-29): ćwiczenia z masą ciała i opcjonalnym dociążeniem
// (bodyweight_loaded). SetData.weight = WYŁĄCZNIE dociążenie (0 = sama MC).
//
// Legacy: przed F6 podciąganie było weight_reps, a właściciel wpisywał masę
// ciała (74/72 kg) jako ciężar. Nie przepisujemy Firestore; normalizujemy
// przy odczycie tą samą regułą co klient (src/lib/bodyweight-load.ts):
// ciężar w ±3 kg od masy ciała z dnia treningu (wcześniejszy lub ten sam dzień,
// brak = najnowsza masa, brak masy = bez zmian) → dociążenie 0.
// Parytet listy nazw i reguły pilnuje src/test/bodyweight-loaded-parity.test.ts.

export const BODYWEIGHT_MATCH_TOLERANCE_KG = 3;

/** Nazwy kanoniczne biblioteki z tracking 'bodyweight_loaded' + aliasy z planów. */
export const BODYWEIGHT_LOADED_EXERCISE_NAMES: readonly string[] = [
  "Podciąganie na drążku",
  "Dips (pompki na poręczach)",
  "Dipy z obciążeniem (na klatkę)",
  "Podciąganie na drążku podchwytem",
  "Dipy na poręczach (na klatkę)",
  "Pompki",
  "Pompki na podwyższeniu (nogi w górze)",
  "Pompki diamentowe",
  "Pompki diamentowe (Diamond Push-up)",
  "Australijskie podciąganie (Inverted Row)",
  "Pompki w pozycji szczytowej (Pike Push-up)",
  "Dipy na ławce (Bench Dips)",
  "Prostowniki grzbietu (Hyperextensions)",
  "Glute Bridge",
  "Mostek pośladkowy na jednej nodze",
  "Frog Pump (mostek z rozłożonymi kolanami)",
  "Glute-Ham Raise (GHR)",
  "Nordic Hamstring Curl",
  "Przysiad pistolet (jednonóż)",
  "Sissy Squat",
  "Cossack Squat",
  "Zakroki sprinterskie",
  "Wejścia bokiem na skrzynię",
  "Wspięcia na palce jednonóż na podwyższeniu (masa ciała)",
  "Reverse Crunch na ławce",
  "Ab Rollout",
  "Unoszenie nóg w zwisie",
  "Unoszenie kolan w zwisie",
  "Nogi do drążka (Toes to Bar)",
  "Spięcia brzucha na ławce skośnej (Decline Sit-up)",
  "Skręty rosyjskie",
  "Brzuszki klasyczne (Crunch)",
  "Pełne spięcie brzucha (Sit-up)",
  "Podciąganie szerokim chwytem",
  "Podciąganie chwytem neutralnym",
  "Wykrok boczny (Lateral Lunge)",
  "Przysiad jednonóż do ławki (Box Pistol)",
  "Unoszenie kolan na poręczach (Captain's Chair)",
  "Brzuszki na piłce (Stability Ball Crunch)",
  "Hip Thrust jednonóż",
  // Aliasy nazw z szablonów planów (src/data/exerciseLibrary.ts LIBRARY_NAME_ALIASES).
  "Pompki na poręczach",
  "Podciaganie nachwytem",
];

const LOADED_NAMES = new Set(BODYWEIGHT_LOADED_EXERCISE_NAMES);

export const isBodyweightLoadedName = (name: unknown): boolean =>
  typeof name === "string" && LOADED_NAMES.has(name);

export interface BodyWeightPoint {
  date: string;
  weightKg: number;
}

/** Oś masy ciała rosnąco po dacie; wpisy bez dodatniej wagi pomijamy. */
export const buildBodyWeightTimeline = (
  measurements: ReadonlyArray<{ date?: unknown; weight?: unknown }>,
): BodyWeightPoint[] => measurements
  .filter((m) => typeof m.date === "string" && typeof m.weight === "number" && Number.isFinite(m.weight) && m.weight > 0)
  .map((m) => ({ date: m.date as string, weightKg: m.weight as number }))
  .sort((a, b) => a.date.localeCompare(b.date));

export const bodyWeightForDate = (timeline: ReadonlyArray<BodyWeightPoint>, date: string): number | null => {
  if (timeline.length === 0) return null;
  let found: number | null = null;
  for (const point of timeline) {
    if (point.date > date) break;
    found = point.weightKg;
  }
  return found ?? timeline[timeline.length - 1].weightKg;
};

export const normalizeBodyweightLoad = (weight: number, bodyWeightKg: number | null): number => {
  if (!(weight > 0)) return 0;
  if (bodyWeightKg === null) return weight;
  return Math.abs(weight - bodyWeightKg) <= BODYWEIGHT_MATCH_TOLERANCE_KG ? 0 : weight;
};

interface NormalizableWorkout {
  date: string;
  exercises?: Array<{ name?: unknown; sets?: Array<{ weight?: unknown } | null> } | null>;
}

/** Kopia treningów z przeliczonym dociążeniem ćwiczeń bodyweight_loaded (wejście nietknięte). */
export const normalizeBodyweightLoadedWorkouts = <T extends NormalizableWorkout>(
  workouts: T[],
  timeline: ReadonlyArray<BodyWeightPoint>,
): T[] => {
  if (timeline.length === 0) return workouts;
  return workouts.map((workout) => {
    if (!Array.isArray(workout.exercises)) return workout;
    const bodyWeightKg = bodyWeightForDate(timeline, workout.date);
    let changed = false;
    const exercises = workout.exercises.map((exercise) => {
      if (!exercise || !isBodyweightLoadedName(exercise.name) || !Array.isArray(exercise.sets)) return exercise;
      const sets = exercise.sets.map((set) => {
        const weight = typeof set?.weight === "number" ? set.weight : Number(set?.weight);
        if (!set || !(weight > 0)) return set;
        const load = normalizeBodyweightLoad(weight, bodyWeightKg);
        if (load === weight) return set;
        changed = true;
        return { ...set, weight: load };
      });
      return { ...exercise, sets };
    });
    return changed ? { ...workout, exercises } : workout;
  });
};

/** Czy trening ma serię bodyweight_loaded z ciężarem > 0 (tylko wtedy potrzebna masa ciała). */
export const hasBodyweightLoadedWeight = (workout: NormalizableWorkout): boolean => (
  Array.isArray(workout.exercises) && workout.exercises.some((exercise) => (
    !!exercise && isBodyweightLoadedName(exercise.name) && Array.isArray(exercise.sets)
    && exercise.sets.some((set) => Number(set?.weight) > 0)
  ))
);
