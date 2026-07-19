import type { WorkoutSession } from '@/types';
import type { UnifiedActivity } from '@/types/strava';
import { calculateTRIMP } from '@/lib/training-load';
import { exerciseLibrary } from '@/data/exerciseLibrary';

// Obciążenie hybrydowe (Z114): siła i cardio na wspólnej osi "jednostek obciążenia".
// Load siłowy = sTRIMP (Foster session-RPE): minuty x RPE sesji. Etykieta w UI:
// "obciążenie szacunkowe" — nie udajemy nauki, kalibracja jest jawna i przybita testem.

/**
 * Kalibracja sTRIMP -> jednostki TRIMP: godzinna sesja siłowa RPE 6 (sTRIMP 360)
 * ma być porównywalna z godzinnym biegiem moderate (~75% HRmax, TRIMP ~83 przy
 * rest 60 / max 190). 83/360 ≈ 0.23.
 */
export const STRENGTH_TO_TRIMP_CALIBRATION = 0.23;

const FALLBACK_SESSION_RPE = 6.0;
const FALLBACK_MINUTES_PER_SET = 3;

// Reprezentatywne HR dla intensywności (spójne z training-load).
const DEFAULT_REST_HR = 60;
const DEFAULT_MAX_HR = 190;

export interface DailyHybridLoad {
  date: string;
  /** j.o. (po kalibracji do skali TRIMP) */
  strengthLoad: number;
  /** TRIMP */
  cardioLoad: number;
  totalLoad: number;
}

export interface WeeklyBalance {
  weekStart: string;
  strengthLoad: number;
  cardioLoad: number;
  strengthPct: number;
  cardioPct: number;
}

export interface InterferenceHit {
  strengthDate: string;
  cardioDate: string;
  cardioType: string;
  kind: 'legs-cardio';
}

/** sTRIMP sesji siłowej (SUROWY, bez kalibracji): minuty x RPE sesji. */
export const computeStrengthLoad = (workout: WorkoutSession): number => {
  if (!workout.completed) return 0;

  const completedSets = workout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed && !s.isWarmup).length, 0);
  if (completedSets === 0 && !workout.durationSec) return 0;

  const minutes = workout.durationSec && workout.durationSec > 0
    ? workout.durationSec / 60
    : completedSets * FALLBACK_MINUTES_PER_SET;

  // RPE sesji: średnia ważona liczbą ukończonych serii roboczych ćwiczenia.
  let rpeWeight = 0;
  let rpeSum = 0;
  workout.exercises.forEach((ex) => {
    if (ex.rpe === undefined) return;
    const sets = ex.sets.filter((s) => s.completed && !s.isWarmup).length;
    if (sets === 0) return;
    rpeWeight += sets;
    rpeSum += ex.rpe * sets;
  });
  const sessionRpe = rpeWeight > 0 ? rpeSum / rpeWeight : FALLBACK_SESSION_RPE;

  return minutes * sessionRpe;
};

const INTENSITY_HR: Record<string, number> = { easy: 0.6, moderate: 0.75, hard: 0.88 };

const cardioTrimp = (activity: UnifiedActivity, restHR: number, maxHR: number): number => {
  if (!activity.movingTime || activity.movingTime <= 0) return 0;
  const hr = activity.averageHeartrate && activity.averageHeartrate > 0
    ? activity.averageHeartrate
    : activity.perceivedIntensity
      ? maxHR * INTENSITY_HR[activity.perceivedIntensity]
      : null;
  if (hr === null) return 0;
  return calculateTRIMP(hr, activity.movingTime, restHR, maxHR);
};

/** Dzienne obciążenie hybrydowe: siła (skalibrowana) + cardio (TRIMP), sort rosnąco po dacie. */
export const computeDailyLoads = (
  workouts: WorkoutSession[],
  activities: UnifiedActivity[],
  restHR: number = DEFAULT_REST_HR,
  maxHR: number = DEFAULT_MAX_HR,
): DailyHybridLoad[] => {
  const byDate = new Map<string, { strength: number; cardio: number }>();
  const bump = (date: string, strength: number, cardio: number) => {
    const entry = byDate.get(date) ?? { strength: 0, cardio: 0 };
    entry.strength += strength;
    entry.cardio += cardio;
    byDate.set(date, entry);
  };

  workouts.forEach((w) => {
    const load = computeStrengthLoad(w) * STRENGTH_TO_TRIMP_CALIBRATION;
    if (load > 0) bump(w.date, load, 0);
  });
  activities
    .filter((a) => a.type !== 'WeightTraining' && a.type !== 'Crossfit')
    .forEach((a) => {
      const trimp = cardioTrimp(a, restHR, maxHR);
      if (trimp > 0) bump(a.date, 0, trimp);
    });

  return Array.from(byDate.entries())
    .map(([date, { strength, cardio }]) => ({
      date,
      strengthLoad: Math.round(strength * 10) / 10,
      cardioLoad: Math.round(cardio * 10) / 10,
      totalLoad: Math.round((strength + cardio) * 10) / 10,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// Poniedziałek tygodnia daty YYYY-MM-DD (czysto stringowo-datowo, lokalnie).
const mondayOf = (date: string): string => {
  const d = new Date(`${date}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

/** Udział siła/cardio per tydzień (poniedziałek start), chronologicznie. */
export const computeWeeklyBalance = (dailyLoads: DailyHybridLoad[]): WeeklyBalance[] => {
  const byWeek = new Map<string, { strength: number; cardio: number }>();
  dailyLoads.forEach((d) => {
    const week = mondayOf(d.date);
    const entry = byWeek.get(week) ?? { strength: 0, cardio: 0 };
    entry.strength += d.strengthLoad;
    entry.cardio += d.cardioLoad;
    byWeek.set(week, entry);
  });

  return Array.from(byWeek.entries())
    .map(([weekStart, { strength, cardio }]) => {
      const total = strength + cardio;
      return {
        weekStart,
        strengthLoad: Math.round(strength),
        cardioLoad: Math.round(cardio),
        strengthPct: total > 0 ? Math.round((strength / total) * 100) : 0,
        cardioPct: total > 0 ? Math.round((cardio / total) * 100) : 0,
      };
    })
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
};

// ===== Interferencja (Z114): ciężkie nogi + intensywne cardio < 24h =====

const LEG_CATEGORIES = new Set(['legs', 'glutes', 'calves']);
const LEG_TONNAGE_THRESHOLD_KG = 1500;
const INTENSE_CARDIO_TYPES = new Set(['Run', 'HIIT', 'Treadmill']);
const INTENSE_HR_THRESHOLD = 140;

const legCategoryByName = new Map(
  exerciseLibrary
    .filter((e) => LEG_CATEGORIES.has(e.category))
    .map((e) => [e.name, e.category]),
);

const legTonnage = (workout: WorkoutSession): number =>
  workout.exercises.reduce((sum, ex) => {
    if (!ex.name || !legCategoryByName.has(ex.name)) return sum;
    return sum + ex.sets
      .filter((s) => s.completed && !s.isWarmup)
      .reduce((t, s) => t + s.reps * s.weight, 0);
  }, 0);

const isIntenseCardio = (activity: UnifiedActivity): boolean => {
  if (!INTENSE_CARDIO_TYPES.has(activity.type)) return false;
  if (activity.perceivedIntensity) return activity.perceivedIntensity !== 'easy';
  if (activity.averageHeartrate) return activity.averageHeartrate >= INTENSE_HR_THRESHOLD;
  // Brak HR i intensywności: bieg/HIIT domyślnie traktujemy jako wymagający.
  return activity.type === 'HIIT' || activity.type === 'Run';
};

const nextDay = (date: string): string => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

/**
 * Wskazówka interferencji: sesja z ciężkim tonażem nóg dnia D + intensywne cardio
 * (Run/HIIT/Treadmill, nie-easy) w D lub D+1. Informacja, nigdy blokada.
 */
export const detectInterference = (
  workouts: WorkoutSession[],
  activities: UnifiedActivity[],
): InterferenceHit[] => {
  const hits: InterferenceHit[] = [];
  const heavyLegDays = workouts
    .filter((w) => w.completed && legTonnage(w) >= LEG_TONNAGE_THRESHOLD_KG)
    .map((w) => w.date);

  const intense = activities.filter(isIntenseCardio);

  heavyLegDays.forEach((strengthDate) => {
    const dayAfter = nextDay(strengthDate);
    intense
      .filter((a) => a.date === strengthDate || a.date === dayAfter)
      .forEach((a) => {
        hits.push({ strengthDate, cardioDate: a.date, cardioType: a.type, kind: 'legs-cardio' });
      });
  });

  return hits;
};
