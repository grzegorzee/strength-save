import type { WorkoutSession } from '@/types';
import type { StravaActivity } from '@/types/strava';
import { computeDailyLoad } from '@/lib/training-load';
import { formatLocalDate, parseLocalDate } from '@/lib/utils';

// Adaptive Coach (Z63): autoregulacja progresji na bazie RPE/bólu/jakości
// + gotowość łącząca tonaż siłowy z obciążeniem biegowym (Strava).
// Czyste heurystyki na kliencie — zero Functions, zero kosztów, 100% offline.
// Coach mówi TYLKO przy jasnym sygnale; strefa środkowa => null i UI spada
// na istniejące nextAdvice (next-set-advice.ts).

// Zawężona unia kluczy — t() wymaga literalnych kluczy (wzorzec workoutSyncErrorMessageKey).
export type CoachReasonKey =
  | 'coachx.reason.pain'
  | 'coachx.reason.hardSession'
  | 'coachx.reason.readyToProgress';

export interface ExerciseRecommendation {
  action: 'progress' | 'hold' | 'deload';
  weightDeltaKg: number;
  reasonKey: CoachReasonKey;
  metrics: { avgRpe?: number; maxPain?: number; completionRate: number };
}

// Progi reguł (strojenie: DECYZJE.md checkpoint FAZY 6).
const PAIN_DELOAD_THRESHOLD = 3;
const RPE_HARD_THRESHOLD = 9;
const RPE_PROGRESS_THRESHOLD = 7.5;
const COMPLETION_HARD_THRESHOLD = 0.8;
const DELOAD_FRACTION = 0.1;

// Heurystyka przyrostu po nazwie ćwiczenia (jak next-set-advice): duże boje
// dolnej połowy ciała znoszą większy skok niż izolacje i górne partie.
const BIG_LIFT_KEYWORDS = ['przysiad', 'martwy', 'prasa noż', 'hip thrust', 'hack squat', 'squat', 'deadlift', 'leg press'];

const progressIncrementKg = (exerciseName?: string): number => {
  const name = (exerciseName ?? '').toLowerCase();
  return BIG_LIFT_KEYWORDS.some(keyword => name.includes(keyword)) ? 5 : 2.5;
};

const roundToHalf = (value: number): number => Math.round(value * 2) / 2;

export const buildExerciseRecommendation = (input: {
  history: WorkoutSession[];
  exerciseId: string;
  exerciseName?: string;
  isBodyweight: boolean;
}): ExerciseRecommendation | null => {
  const { history, exerciseId, exerciseName, isBodyweight } = input;

  // Ostatnia ukończona sesja z tym ćwiczeniem.
  const lastSession = [...history]
    .filter(w => w.completed && w.exercises.some(ex => ex.exerciseId === exerciseId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .pop();
  if (!lastSession) return null;

  const exercise = lastSession.exercises.find(ex => ex.exerciseId === exerciseId);
  if (!exercise) return null;

  // Brak metryk autoregulacji => coach milczy (UI używa nextAdvice).
  if (exercise.rpe === undefined && exercise.pain === undefined) return null;

  const workingSets = exercise.sets.filter(set => !set.isWarmup);
  const completionRate = workingSets.length > 0
    ? workingSets.filter(set => set.completed).length / workingSets.length
    : 0;
  const maxWorkingWeight = Math.max(0, ...workingSets.filter(set => set.completed).map(set => set.weight));

  const metrics = {
    ...(exercise.rpe !== undefined && { avgRpe: exercise.rpe }),
    ...(exercise.pain !== undefined && { maxPain: exercise.pain }),
    completionRate,
  };

  // Priorytet reguł: ból > ciężka sesja > gotowość do progresu.
  if (exercise.pain !== undefined && exercise.pain >= PAIN_DELOAD_THRESHOLD) {
    return {
      action: 'deload',
      weightDeltaKg: isBodyweight ? 0 : -roundToHalf(maxWorkingWeight * DELOAD_FRACTION),
      reasonKey: 'coachx.reason.pain',
      metrics,
    };
  }

  if ((exercise.rpe !== undefined && exercise.rpe >= RPE_HARD_THRESHOLD)
    || completionRate < COMPLETION_HARD_THRESHOLD) {
    return {
      action: 'hold',
      weightDeltaKg: 0,
      reasonKey: 'coachx.reason.hardSession',
      metrics,
    };
  }

  if (exercise.rpe !== undefined && exercise.rpe <= RPE_PROGRESS_THRESHOLD && completionRate === 1) {
    return {
      action: 'progress',
      weightDeltaKg: isBodyweight ? 0 : progressIncrementKg(exerciseName),
      reasonKey: 'coachx.reason.readyToProgress',
      metrics,
    };
  }

  return null;
};

// === Gotowość (readiness): tonaż siłowy + obciążenie biegowe ===

export type ReadinessLevel = 'fresh' | 'ok' | 'loaded' | 'overreached';

export type ReadinessReasonKey =
  | 'coachx.readiness.fresh'
  | 'coachx.readiness.ok'
  | 'coachx.readiness.loaded'
  | 'coachx.readiness.overreached';

export interface Readiness {
  score: number; // 0-100 (wyżej = świeższy)
  level: ReadinessLevel;
  reasonKey: ReadinessReasonKey;
}

const RATIO_FRESH_MAX = 0.8;
const RATIO_OK_MAX = 1.2;
const RATIO_LOADED_MAX = 1.5;

const workoutTonnage = (workout: WorkoutSession): number =>
  workout.exercises.reduce((sum, exercise) => sum + exercise.sets.reduce(
    (setSum, set) => setSum + (set.completed && !set.isWarmup ? (set.weight || 0) * (set.reps || 0) : 0),
    0,
  ), 0);

/** Ratio: suma z ostatnich 7 dni vs tygodniowa średnia z 28 dni. null gdy brak danych. */
const loadRatio = (byDate: Map<string, number>, now: Date): number | null => {
  let last7 = 0;
  let last28 = 0;
  for (const [date, value] of byDate) {
    const ageDays = (now.getTime() - parseLocalDate(date).getTime()) / (24 * 60 * 60 * 1000);
    if (ageDays < 0 || ageDays >= 28) continue;
    last28 += value;
    if (ageDays < 7) last7 += value;
  }
  if (last28 <= 0) return null;
  return last7 / (last28 / 4);
};

export const buildReadiness = (input: {
  workouts: WorkoutSession[];
  stravaActivities: StravaActivity[];
  now: Date;
}): Readiness => {
  const { workouts, stravaActivities, now } = input;

  const strengthByDate = new Map<string, number>();
  workouts.filter(w => w.completed).forEach(w => {
    strengthByDate.set(w.date, (strengthByDate.get(w.date) ?? 0) + workoutTonnage(w));
  });

  const cardioByDate = new Map<string, number>();
  computeDailyLoad(stravaActivities).forEach(({ date, trimp }) => {
    cardioByDate.set(date, trimp);
  });

  const ratios = [loadRatio(strengthByDate, now), loadRatio(cardioByDate, now)]
    .filter((ratio): ratio is number => ratio !== null);
  // Brak danych => neutralne "ok"/50 (nie zgadujemy formy bez treningów).
  const ratio = ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;

  // Monotoniczna skala: ratio 0 => 100, ratio 1 => 50, ratio 2+ => 0.
  const score = Math.max(0, Math.min(100, Math.round(100 - ratio * 50)));
  const level: ReadinessLevel = ratio < RATIO_FRESH_MAX
    ? 'fresh'
    : ratio <= RATIO_OK_MAX
      ? 'ok'
      : ratio <= RATIO_LOADED_MAX
        ? 'loaded'
        : 'overreached';

  return { score, level, reasonKey: `coachx.readiness.${level}` };
};

// Data pomocnicza dla konsumentów (Dashboard): dzisiejszy klucz daty.
export const readinessDateKey = (now: Date): string => formatLocalDate(now);
