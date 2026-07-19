// Parser CSV Strong/Hevy (Z109) — w 100% po stronie klienta, plik nie opuszcza
// urządzenia. Formaty zweryfikowane na realnych eksportach (2026-07-19):
// Strong:  Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
//          data "YYYY-MM-DD HH:MM:SS"; warmup = Set Order "W" (dropset "D", failure "F");
//          jednostka wagi NIE jest zapisana w pliku (opcja strongWeightUnit).
// Hevy:    title,start_time,...,exercise_title,...,set_index,set_type,weight_kg,reps,distance_km,duration_seconds,rpe
//          daty ISO albo "30 Jun 2025, 19:56"; set_type normal/warmup/dropset/failure albo 1/2/3/4;
//          starszy wariant ma weight_lbs/distance_miles zamiast _kg/_km.

export type ImportFormat = 'strong' | 'hevy';

export interface ImportedSet {
  reps: number;
  weight: number;
  durationSec?: number;
  distanceM?: number;
  isWarmup?: boolean;
  rpe?: number;
}

export interface ImportedExercise {
  name: string;
  notes?: string;
  sets: ImportedSet[];
}

export interface ImportedWorkout {
  /** YYYY-MM-DD */
  date: string;
  dayName: string;
  notes?: string;
  exercises: ImportedExercise[];
}

export interface ParseResult {
  workouts: ImportedWorkout[];
  skippedRows: number;
  format: ImportFormat | null;
}

export interface ParseOptions {
  /** Strong nie zapisuje jednostki wagi w pliku — user wybiera w wizardzie (default kg). */
  strongWeightUnit?: 'kg' | 'lbs';
}

const LBS_TO_KG = 0.45359237;

// Splitter linii CSV z obsługą pól w cudzysłowach ("" = escapowany cudzysłów).
export const splitCsvLine = (line: string): string[] => {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else current += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
};

const normalizeHeader = (value: string): string => value.trim().replace(/^"|"$/g, '').toLowerCase();

export const detectFormat = (headerLine: string): ImportFormat | null => {
  const cols = splitCsvLine(headerLine).map(normalizeHeader);
  if (cols.includes('exercise name') && cols.includes('set order') && cols.includes('workout name')) return 'strong';
  if (cols.includes('exercise_title') && cols.includes('set_index')) return 'hevy';
  return null;
};

// "102,5" (PL) i "102.5" -> 102.5; śmieci -> NaN.
const parseNumber = (raw: string | undefined): number => {
  if (raw === undefined) return NaN;
  const trimmed = raw.trim();
  if (!trimmed) return NaN;
  return Number(trimmed.replace(',', '.'));
};

const numberOr = (raw: string | undefined, fallback: number): number => {
  const parsed = parseNumber(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Miesiące skrótów Hevy ("30 Jun 2025, 19:56").
const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/** Data YYYY-MM-DD z formatów Strong/Hevy; null gdy nieparsowalna. */
export const parseImportDate = (raw: string): string | null => {
  const trimmed = raw.trim();
  // "2026-05-04 17:31:12" / ISO "2026-05-06T18:02:44Z"
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T ]/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  // "4 May 2026, 17:31"
  const humanMatch = trimmed.match(/^(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})/);
  if (humanMatch) {
    const month = MONTHS[humanMatch[2].toLowerCase()];
    if (!month) return null;
    return `${humanMatch[3]}-${month}-${humanMatch[1].padStart(2, '0')}`;
  }
  return null;
};

const isHevyWarmup = (setType: string): boolean => {
  const normalized = setType.trim().toLowerCase();
  return normalized === 'warmup' || normalized === 'warm up' || normalized === '2';
};

interface RowHandlerResult {
  sessionKey: string;
  date: string;
  dayName: string;
  workoutNotes?: string;
  exerciseName: string;
  exerciseNotes?: string;
  set: ImportedSet;
}

export const parseWorkoutCsv = (text: string, options: ParseOptions = {}): ParseResult => {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { workouts: [], skippedRows: 0, format: null };

  const format = detectFormat(lines[0]);
  if (!format) return { workouts: [], skippedRows: 0, format: null };

  const header = splitCsvLine(lines[0]).map(normalizeHeader);
  const col = (name: string): number => header.indexOf(name);

  let skippedRows = 0;
  const rows: RowHandlerResult[] = [];

  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    try {
      if (format === 'strong') {
        const date = parseImportDate(fields[col('date')] ?? '');
        const dayName = (fields[col('workout name')] ?? '').trim();
        const exerciseName = (fields[col('exercise name')] ?? '').trim();
        if (!date || !dayName || !exerciseName) { skippedRows++; continue; }

        const setOrderRaw = (fields[col('set order')] ?? '').trim().toUpperCase();
        const weightRaw = numberOr(fields[col('weight')], 0);
        const weight = options.strongWeightUnit === 'lbs'
          ? Math.round(weightRaw * LBS_TO_KG * 1000) / 1000
          : weightRaw;
        const rpe = parseNumber(fields[col('rpe')]);
        const distance = numberOr(fields[col('distance')], 0);
        const seconds = numberOr(fields[col('seconds')], 0);

        rows.push({
          sessionKey: `${fields[col('date')]}|${dayName}`,
          date,
          dayName,
          workoutNotes: (fields[col('workout notes')] ?? '').trim() || undefined,
          exerciseName,
          exerciseNotes: (fields[col('notes')] ?? '').trim() || undefined,
          set: {
            reps: Math.max(0, Math.round(numberOr(fields[col('reps')], 0))),
            weight: Math.max(0, weight),
            ...(seconds > 0 && { durationSec: Math.round(seconds) }),
            ...(distance > 0 && { distanceM: distance }),
            ...(setOrderRaw === 'W' && { isWarmup: true }),
            ...(Number.isFinite(rpe) && { rpe }),
          },
        });
      } else {
        const date = parseImportDate(fields[col('start_time')] ?? '');
        const dayName = (fields[col('title')] ?? '').trim();
        const exerciseName = (fields[col('exercise_title')] ?? '').trim();
        if (!date || !dayName || !exerciseName) { skippedRows++; continue; }

        const weightKgIdx = col('weight_kg');
        const weightLbsIdx = col('weight_lbs');
        const weightKg = weightKgIdx >= 0 ? numberOr(fields[weightKgIdx], 0) : 0;
        const weightLbs = weightLbsIdx >= 0 ? numberOr(fields[weightLbsIdx], 0) : 0;
        const weight = weightKg > 0 ? weightKg : weightLbs > 0 ? Math.round(weightLbs * LBS_TO_KG * 1000) / 1000 : 0;

        const distanceKmIdx = col('distance_km');
        const distanceMilesIdx = col('distance_miles');
        const distanceKm = distanceKmIdx >= 0 ? numberOr(fields[distanceKmIdx], 0) : 0;
        const distanceMiles = distanceMilesIdx >= 0 ? numberOr(fields[distanceMilesIdx], 0) : 0;
        const distanceM = distanceKm > 0 ? distanceKm * 1000 : distanceMiles > 0 ? distanceMiles * 1609.344 : 0;

        const seconds = numberOr(fields[col('duration_seconds')], 0);
        const rpe = parseNumber(fields[col('rpe')]);

        rows.push({
          sessionKey: `${fields[col('start_time')]}|${dayName}`,
          date,
          dayName,
          workoutNotes: (fields[col('description')] ?? '').trim() || undefined,
          exerciseName,
          exerciseNotes: col('exercise_notes') >= 0 ? (fields[col('exercise_notes')] ?? '').trim() || undefined : undefined,
          set: {
            reps: Math.max(0, Math.round(numberOr(fields[col('reps')], 0))),
            weight: Math.max(0, weight),
            ...(seconds > 0 && { durationSec: Math.round(seconds) }),
            ...(distanceM > 0 && { distanceM: Math.round(distanceM * 100) / 100 }),
            ...(isHevyWarmup(fields[col('set_type')] ?? '') && { isWarmup: true }),
            ...(Number.isFinite(rpe) && { rpe }),
          },
        });
      }
    } catch {
      skippedRows++;
    }
  }

  // Grupowanie: sesja po sessionKey, w sesji ćwiczenia po nazwie (kolejność pierwszego wystąpienia).
  const sessions = new Map<string, ImportedWorkout & { exerciseOrder: Map<string, ImportedExercise> }>();
  for (const row of rows) {
    let session = sessions.get(row.sessionKey);
    if (!session) {
      session = {
        date: row.date,
        dayName: row.dayName,
        ...(row.workoutNotes && { notes: row.workoutNotes }),
        exercises: [],
        exerciseOrder: new Map(),
      };
      sessions.set(row.sessionKey, session);
    }
    if (!session.notes && row.workoutNotes) session.notes = row.workoutNotes;

    let exercise = session.exerciseOrder.get(row.exerciseName);
    if (!exercise) {
      exercise = { name: row.exerciseName, sets: [] };
      session.exerciseOrder.set(row.exerciseName, exercise);
      session.exercises.push(exercise);
    }
    if (!exercise.notes && row.exerciseNotes) exercise.notes = row.exerciseNotes;
    exercise.sets.push(row.set);
  }

  const workouts = Array.from(sessions.values())
    .map(({ exerciseOrder: _order, ...workout }) => workout)
    .sort((a, b) => a.date.localeCompare(b.date));

  return { workouts, skippedRows, format };
};
