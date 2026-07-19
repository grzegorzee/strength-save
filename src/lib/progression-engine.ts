// Progresja programowa v1 (Z119-Z121): silnik REGUŁOWY (nie LLM — decyzja v6.10.0).
// Silnik NIGDY nie zapisuje — liczy i proponuje; zmiany za tapnięciem usera.
// Kandydat premium: funkcje za flagą progressionEngine (gating = decyzja przy launchu).

import type { TrainingDay } from '@/data/trainingPlan';
import type { WorkoutSession } from '@/types';
import {
  getExerciseHistory,
  getTrackedExerciseHistory,
  detectPlateau,
} from '@/lib/exercise-progression';
import {
  parseRepRange,
  parseSetCount,
  isBodyweightExercise,
  lookupExerciseType,
  type RepRange,
} from '@/lib/exercise-utils';
import { getTrackingType, type TrackingType } from '@/lib/set-tracking';

export type DeloadDecision = 'applied' | 'skipped';

export interface ProgressionConfig {
  enabled: boolean;
  /** Co ile tygodni programowany deload (2-12, default 5). */
  deloadEveryWeeks: number;
  /** Decyzje usera per tydzień (klucz = numer tygodnia 1-based jako string). */
  deloadDecisions?: Record<string, DeloadDecision>;
}

export const DEFAULT_PROGRESSION: ProgressionConfig = { enabled: true, deloadEveryWeeks: 5 };

const DELOAD_MIN_WEEKS = 2;
const DELOAD_MAX_WEEKS = 12;

/** Sanityzacja pola `progression` z dokumentu planu. Brak/śmieci = null (silnik wyłączony). */
export const sanitizeProgressionConfig = (raw: unknown): ProgressionConfig | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.enabled !== 'boolean') return null;

  const weeksRaw = Number(record.deloadEveryWeeks);
  const deloadEveryWeeks = Number.isFinite(weeksRaw)
    ? Math.min(DELOAD_MAX_WEEKS, Math.max(DELOAD_MIN_WEEKS, Math.round(weeksRaw)))
    : DEFAULT_PROGRESSION.deloadEveryWeeks;

  let deloadDecisions: Record<string, DeloadDecision> | undefined;
  if (typeof record.deloadDecisions === 'object' && record.deloadDecisions !== null) {
    const entries = Object.entries(record.deloadDecisions as Record<string, unknown>)
      .filter(([, value]) => value === 'applied' || value === 'skipped') as Array<[string, DeloadDecision]>;
    if (entries.length > 0) deloadDecisions = Object.fromEntries(entries);
  }

  return {
    enabled: record.enabled,
    deloadEveryWeeks,
    ...(deloadDecisions && { deloadDecisions }),
  };
};

/** Czy tydzień (1-based) jest programowanym tygodniem deload. */
export const isDeloadWeek = (weekIndex: number, config: ProgressionConfig): boolean => {
  if (!config.enabled || weekIndex <= 0) return false;
  return weekIndex % config.deloadEveryWeeks === 0;
};

// ===== Z120: wspólna decyzja double progression (używana przez next-set-advice i cele tygodniowe) =====

export type NextSetReasonKey =
  | 'deload.bw' | 'deload.weight'
  | 'bw.progress' | 'bw.hold'
  | 'progress' | 'hold.below' | 'hold.inrange';

export interface NextSetDecision {
  kind: 'progress' | 'hold' | 'deload';
  targetWeight: number;
  targetReps: number;
  reasonKey: NextSetReasonKey;
}

/**
 * Czysta decyzja "co dalej z tym ćwiczeniem" (double progression + deload przy plateau).
 * Logika 1:1 z historycznym next-set-advice — pilnują jej testy charakteryzujące.
 */
export const decideNextSet = (input: {
  lastWeight: number;
  lastReps: number;
  repRange: RepRange;
  isBodyweight: boolean;
  increment: number;
  isPlateau: boolean;
}): NextSetDecision => {
  const { lastWeight, lastReps, repRange, isBodyweight, increment, isPlateau } = input;

  // Deload ma priorytet: jeśli wynik stoi od kilku sesji, odpuść i wróć z impetem.
  if (isPlateau) {
    if (isBodyweight) {
      return { kind: 'deload', targetWeight: 0, targetReps: Math.max(repRange.min, lastReps), reasonKey: 'deload.bw' };
    }
    const deloadWeight = Math.max(0, Math.round(lastWeight * 0.9 * 2) / 2); // -10%, do 0.5 kg
    return { kind: 'deload', targetWeight: deloadWeight, targetReps: repRange.max, reasonKey: 'deload.weight' };
  }

  // Bodyweight: progresja przez powtórzenia.
  if (isBodyweight) {
    if (lastReps >= repRange.max) {
      return { kind: 'progress', targetWeight: 0, targetReps: lastReps + 1, reasonKey: 'bw.progress' };
    }
    return { kind: 'hold', targetWeight: 0, targetReps: Math.min(lastReps + 1, repRange.max), reasonKey: 'bw.hold' };
  }

  if (lastReps >= repRange.max) {
    // Dowiozłeś górę zakresu → dołóż ciężar, zresetuj powtórzenia do dołu zakresu.
    return { kind: 'progress', targetWeight: lastWeight + increment, targetReps: repRange.min, reasonKey: 'progress' };
  }

  if (lastReps < repRange.min) {
    // Poniżej zakresu → utrzymaj ciężar, wejdź w zakres.
    return { kind: 'hold', targetWeight: lastWeight, targetReps: repRange.min, reasonKey: 'hold.below' };
  }

  // W zakresie → dobij powtórzenia przy tym samym ciężarze.
  return { kind: 'hold', targetWeight: lastWeight, targetReps: Math.min(lastReps + 1, repRange.max), reasonKey: 'hold.inrange' };
};

// ===== Z120: cele tygodniowe per dzień / per ćwiczenie =====

export type WeeklyTargetKind = 'start' | 'progress' | 'hold' | 'deload' | 'pain' | 'deload-week';

export interface WeeklyTarget {
  exerciseId: string;
  exerciseName: string;
  kind: WeeklyTargetKind;
  /** Cel ciężaru w kg (null = bez celu liczbowego, np. start albo bodyweight). */
  targetWeight: number | null;
  targetReps: number | null;
  /** Tylko przy deload-week (redukcja liczby serii). */
  targetSets: number | null;
  /** Tylko dla ćwiczeń na czas. */
  targetDurationSec: number | null;
  /** Klucz i18n `progression.reason.*` (UI tłumaczy). */
  reasonKey: string;
}

export interface WeeklyTargetsOptions {
  /** Decyzja usera dla programowanego deloadu tego tygodnia (Z121: banner Zastosuj/Pomiń). */
  deloadApplied?: boolean;
  /** Typ śledzenia per nazwa ćwiczenia (custom + biblioteka); brak = heurystyka nazwy. */
  trackingByName?: Record<string, TrackingType>;
}

const PLATEAU_MIN_SESSIONS = 4;
const PAIN_THRESHOLD = 4;

const roundTo = (value: number, step: number): number => Math.round(value / step) * step;

/** Ból >= progu w NAJŚWIEŻSZEJ ukończonej sesji tego ćwiczenia. */
const lastSessionPain = (workouts: WorkoutSession[], exerciseId: string): number | null => {
  let bestDate = '';
  let pain: number | null = null;
  for (const w of workouts) {
    if (!w.completed) continue;
    for (const ex of w.exercises) {
      if (ex.exerciseId !== exerciseId) continue;
      if (w.date >= bestDate) {
        bestDate = w.date;
        pain = typeof ex.pain === 'number' ? ex.pain : null;
      }
    }
  }
  return pain;
};

// ===== Z121: propozycja wcześniejszego deloadu (plateau / powtarzalny ból) =====

export interface EarlyDeloadSuggestion {
  suggest: boolean;
  reason: 'plateau' | 'pain' | null;
  /** Nazwy ćwiczeń, które wywołały propozycję. */
  exercises: string[];
}

const EARLY_DELOAD_COOLDOWN_WEEKS = 3;

/**
 * Propozycja WCZEŚNIEJSZEGO deloadu: >=2 ćwiczenia planu w plateau albo ból >=4
 * w dwóch ostatnich sesjach tego samego ćwiczenia. Nie sugeruje w tygodniu
 * programowego deloadu ani przez 3 tygodnie od ostatniego zastosowanego.
 */
export const suggestEarlyDeload = (
  planDays: TrainingDay[],
  workouts: WorkoutSession[],
  currentWeek: number,
  config: ProgressionConfig,
): EarlyDeloadSuggestion => {
  const none: EarlyDeloadSuggestion = { suggest: false, reason: null, exercises: [] };
  if (!config.enabled) return none;
  if (isDeloadWeek(currentWeek, config)) return none;

  const lastApplied = Object.entries(config.deloadDecisions ?? {})
    .filter(([, decision]) => decision === 'applied')
    .map(([week]) => Number(week))
    .filter((week) => Number.isFinite(week) && week < currentWeek)
    .sort((a, b) => b - a)[0];
  if (lastApplied !== undefined && currentWeek - lastApplied < EARLY_DELOAD_COOLDOWN_WEEKS) return none;

  const painExercises: string[] = [];
  const plateauExercises: string[] = [];
  for (const day of planDays) {
    for (const exercise of day.exercises) {
      // Powtarzalny ból: >=4 w DWÓCH ostatnich sesjach tego ćwiczenia.
      const pains = workouts
        .filter((w) => w.completed && w.exercises.some((ex) => ex.exerciseId === exercise.id))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-2)
        .map((w) => w.exercises.find((ex) => ex.exerciseId === exercise.id)?.pain ?? 0);
      if (pains.length === 2 && pains.every((p) => p >= PAIN_THRESHOLD)) {
        painExercises.push(exercise.name);
      }

      const isBodyweight = isBodyweightExercise(exercise.name);
      const history = getExerciseHistory(workouts, exercise.id, isBodyweight);
      if (detectPlateau(history, PLATEAU_MIN_SESSIONS, isBodyweight).isPlateau) {
        plateauExercises.push(exercise.name);
      }
    }
  }

  if (painExercises.length > 0) return { suggest: true, reason: 'pain', exercises: painExercises };
  if (plateauExercises.length >= 2) return { suggest: true, reason: 'plateau', exercises: plateauExercises };
  return none;
};

// ===== Z121: raport target vs actual =====

export interface WeekReportEntry {
  dayId: string;
  exerciseId: string;
  exerciseName: string;
  targetWeight: number | null;
  targetReps: number | null;
  targetDurationSec: number | null;
  achieved: boolean;
  actualWeight: number | null;
  actualReps: number | null;
  actualDurationSec: number | null;
}

export interface WeekReport {
  total: number;
  achieved: number;
  percent: number;
  misses: WeekReportEntry[];
}

/**
 * Realizacja celów tygodnia: dla każdego celu z liczbami sprawdza, czy w zakresie dat
 * [weekStart, weekEnd] (włącznie) padł working set spełniający cel. 'start' nie liczy się.
 */
export const computeWeekReport = (
  targets: Record<string, Record<string, WeeklyTarget>>,
  workouts: WorkoutSession[],
  weekStart: string,
  weekEnd: string,
): WeekReport => {
  const inRange = workouts.filter((w) => w.completed && w.date >= weekStart && w.date <= weekEnd);
  let total = 0;
  let achievedCount = 0;
  const misses: WeekReportEntry[] = [];

  for (const [dayId, dayTargets] of Object.entries(targets)) {
    for (const target of Object.values(dayTargets)) {
      const hasNumericTarget = target.kind !== 'start'
        && (target.targetDurationSec != null || target.targetReps != null || target.targetWeight != null);
      if (!hasNumericTarget) continue;
      total++;

      let best: { weight: number; reps: number; durationSec: number } | null = null;
      let achieved = false;
      for (const w of inRange) {
        for (const ex of w.exercises) {
          if (ex.exerciseId !== target.exerciseId) continue;
          for (const set of ex.sets) {
            if (!set.completed || set.isWarmup) continue;
            const duration = set.durationSec ?? 0;
            if (!best || set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps) || duration > best.durationSec) {
              best = { weight: set.weight, reps: set.reps, durationSec: duration };
            }
            const weightOk = target.targetWeight == null || set.weight >= target.targetWeight;
            const repsOk = target.targetReps == null || set.reps >= target.targetReps;
            const durationOk = target.targetDurationSec == null || duration >= target.targetDurationSec;
            if (weightOk && repsOk && durationOk) achieved = true;
          }
        }
      }

      if (achieved) {
        achievedCount++;
      } else {
        misses.push({
          dayId,
          exerciseId: target.exerciseId,
          exerciseName: target.exerciseName,
          targetWeight: target.targetWeight,
          targetReps: target.targetReps,
          targetDurationSec: target.targetDurationSec,
          achieved: false,
          actualWeight: best ? best.weight : null,
          actualReps: best ? best.reps : null,
          actualDurationSec: best ? best.durationSec : null,
        });
      }
    }
  }

  return {
    total,
    achieved: achievedCount,
    percent: total > 0 ? Math.round((achievedCount / total) * 100) : 0,
    misses,
  };
};

/**
 * Cele tygodnia (1-based weekIndex) dla całego planu: per dzień, per ćwiczenie.
 * Priorytety: deload-week (zastosowany) > ból > plateau > double progression.
 * Zwraca `Record<dayId, Record<exerciseId, WeeklyTarget>>`. Czysta funkcja, zero zapisów.
 */
export const computeWeeklyTargets = (
  planDays: TrainingDay[],
  workouts: WorkoutSession[],
  weekIndex: number,
  config: ProgressionConfig,
  options?: WeeklyTargetsOptions,
): Record<string, Record<string, WeeklyTarget>> => {
  const result: Record<string, Record<string, WeeklyTarget>> = {};
  if (!config.enabled) return result;

  // Decyzja 'applied' (banner: programowy tydzień ALBO propozycja wcześniejsza)
  // aktywuje wariant deloadowy — nie wymaga zgodności z harmonogramem.
  const deloadWeekActive = options?.deloadApplied === true;

  for (const day of planDays) {
    const dayTargets: Record<string, WeeklyTarget> = {};
    for (const exercise of day.exercises) {
      const base: WeeklyTarget = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        kind: 'start',
        targetWeight: null,
        targetReps: null,
        targetSets: null,
        targetDurationSec: null,
        reasonKey: 'progression.reason.start',
      };

      const tracking = options?.trackingByName?.[exercise.name]
        ?? getTrackingType({ isBodyweight: isBodyweightExercise(exercise.name) });

      if (tracking === 'duration') {
        const history = getTrackedExerciseHistory(workouts, exercise.id, 'duration', null);
        if (history.length > 0) {
          const best = Math.max(...history.map(h => h.value));
          base.kind = 'progress';
          base.targetDurationSec = Math.max(5, roundTo(best * 1.1, 5)); // +10%, do 5 s
          base.reasonKey = 'progression.reason.duration';
        }
        dayTargets[exercise.id] = base;
        continue;
      }

      const isBodyweight = tracking === 'bodyweight_reps';
      const history = getExerciseHistory(workouts, exercise.id, isBodyweight);
      if (history.length === 0) {
        dayTargets[exercise.id] = base;
        continue;
      }

      const last = history[history.length - 1];
      const repRange = parseRepRange(exercise.sets);

      if (deloadWeekActive) {
        base.kind = 'deload-week';
        base.targetWeight = isBodyweight ? null : Math.max(0, roundTo(last.maxWeight * 0.9, 2.5)); // -10%, do 2.5 kg
        base.targetReps = repRange.isMax ? null : repRange.max;
        base.targetSets = Math.max(1, Math.ceil(parseSetCount(exercise.sets) * 0.6)); // -40% serii
        base.reasonKey = 'progression.reason.deloadWeek';
        dayTargets[exercise.id] = base;
        continue;
      }

      const pain = lastSessionPain(workouts, exercise.id);
      if (pain !== null && pain >= PAIN_THRESHOLD) {
        base.kind = 'pain';
        base.targetWeight = isBodyweight ? null : Math.max(0, roundTo(last.maxWeight * 0.9, 2.5));
        base.targetReps = repRange.isMax ? null : repRange.min;
        base.reasonKey = 'progression.reason.pain';
        dayTargets[exercise.id] = base;
        continue;
      }

      if (repRange.isMax) {
        // "Do upadku" — brak sensownego celu liczbowego, ale utrzymanie to też informacja.
        base.kind = 'hold';
        base.targetWeight = isBodyweight ? null : last.maxWeight;
        base.reasonKey = 'progression.reason.hold';
        dayTargets[exercise.id] = base;
        continue;
      }

      const plateau = detectPlateau(history, PLATEAU_MIN_SESSIONS, isBodyweight);
      const increment = lookupExerciseType(exercise.name) === 'isolation' ? 1 : 2.5;
      const decision = decideNextSet({
        lastWeight: last.maxWeight,
        lastReps: last.bestReps,
        repRange,
        isBodyweight,
        increment,
        isPlateau: plateau.isPlateau,
      });

      base.kind = decision.kind;
      base.targetWeight = isBodyweight ? null : decision.targetWeight;
      base.targetReps = decision.targetReps;
      base.reasonKey = `progression.reason.${decision.kind}`;
      dayTargets[exercise.id] = base;
    }
    result[day.id] = dayTargets;
  }

  return result;
};
