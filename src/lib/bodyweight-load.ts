// F6 (2026-09-29): ćwiczenia z masą ciała i opcjonalnym dociążeniem (bodyweight_loaded).
// Kontrakt danych: SetData.weight = WYŁĄCZNIE dociążenie (0 = sama masa ciała).
//
// Legacy: przed F6 podciąganie było weight_reps i właściciel wpisywał masę ciała
// (74/72 kg) jako ciężar. Nie przepisujemy Firestore; normalizujemy PRZY ODCZYCIE:
// ciężar w ±3 kg od masy ciała z dnia treningu = sama MC (dociążenie 0), inaczej
// ciężar to dociążenie. Ta sama reguła żyje w functions/src/bodyweight-loaded.ts
// (agregat all-time, Garmin); parytet pilnuje test kontraktu.
import type { BodyMeasurement, WorkoutSession } from '@/types';

export const BODYWEIGHT_MATCH_TOLERANCE_KG = 3;

/**
 * F6: masa ciała z najnowszego pomiaru, który ją ZAWIERA (lista desc po dacie).
 * selectLatestMeasurement zwraca najnowszy wpis z jakąkolwiek wartością, więc
 * pomiar samych obwodów zasłaniał starszą masę (getLatestMeasurement()?.weight).
 */
export const selectLatestBodyWeightKg = (measurements: BodyMeasurement[] | undefined): number | null => {
  const found = (measurements ?? []).find((m) => typeof m.weight === 'number' && Number.isFinite(m.weight) && m.weight > 0);
  return found?.weight ?? null;
};

export interface BodyWeightPoint {
  date: string;
  weightKg: number;
}

/** Oś masy ciała rosnąco po dacie; pomiary bez (dodatniej) wagi pomijamy. */
export const buildBodyWeightTimeline = (
  measurements: ReadonlyArray<Pick<BodyMeasurement, 'date' | 'weight'>>,
): BodyWeightPoint[] => measurements
  .filter((m) => typeof m.date === 'string' && typeof m.weight === 'number' && Number.isFinite(m.weight) && m.weight > 0)
  .map((m) => ({ date: m.date, weightKg: m.weight as number }))
  .sort((a, b) => a.date.localeCompare(b.date));

/**
 * Masa ciała dla dnia treningu: ostatni pomiar z tego samego albo wcześniejszego
 * dnia; brak takiego = aktualna (najnowsza) masa; pusta oś = null.
 */
export const bodyWeightForDate = (timeline: ReadonlyArray<BodyWeightPoint>, date: string): number | null => {
  if (timeline.length === 0) return null;
  let found: number | null = null;
  for (const point of timeline) {
    if (point.date > date) break;
    found = point.weightKg;
  }
  return found ?? timeline[timeline.length - 1].weightKg;
};

/** Legacy ciężar serii → dociążenie. Brak masy ciała = nie przeliczamy. */
export const normalizeBodyweightLoad = (weight: number, bodyWeightKg: number | null): number => {
  if (!(weight > 0)) return 0;
  if (bodyWeightKg === null) return weight;
  return Math.abs(weight - bodyWeightKg) <= BODYWEIGHT_MATCH_TOLERANCE_KG ? 0 : weight;
};

/** "MC" / "MC +10 kg" (EN "BW" / "BW +10 kg"); etykieta i format kg wstrzykiwane. */
export const formatBodyweightLoadLabel = (
  loadKg: number,
  fmtWeight: (kg: number) => string,
  bodyweightLabel: string,
): string => (loadKg > 0 ? `${bodyweightLabel} +${fmtWeight(loadKg)}` : bodyweightLabel);

/**
 * Znormalizowana kopia listy treningów: przeliczone są wyłącznie serie ćwiczeń
 * bodyweight_loaded (po snapshocie nazwy). Niezmienione treningi zachowują
 * referencję; bez zmian w ogóle zwracamy wejściową tablicę (stabilne memo).
 */
export const normalizeBodyweightLoadedWorkouts = (
  workouts: WorkoutSession[],
  timeline: ReadonlyArray<BodyWeightPoint>,
  isBodyweightLoaded: (exerciseName: string) => boolean,
): WorkoutSession[] => {
  if (timeline.length === 0) return workouts;
  let changedAny = false;
  const result = workouts.map((workout) => {
    if (!Array.isArray(workout?.exercises)) return workout;
    let bodyWeightKg: number | undefined;
    let changedWorkout = false;
    const exercises = workout.exercises.map((exercise) => {
      if (!exercise || typeof exercise.name !== 'string' || !Array.isArray(exercise.sets)) return exercise;
      if (!isBodyweightLoaded(exercise.name)) return exercise;
      if (bodyWeightKg === undefined) bodyWeightKg = bodyWeightForDate(timeline, workout.date) ?? 0;
      let changedExercise = false;
      const sets = exercise.sets.map((set) => {
        if (!set || !(set.weight > 0)) return set;
        const load = normalizeBodyweightLoad(set.weight, bodyWeightKg || null);
        if (load === set.weight) return set;
        changedExercise = true;
        return { ...set, weight: load };
      });
      if (!changedExercise) return exercise;
      changedWorkout = true;
      return { ...exercise, sets };
    });
    if (!changedWorkout) return workout;
    changedAny = true;
    return { ...workout, exercises };
  });
  return changedAny ? result : workouts;
};
