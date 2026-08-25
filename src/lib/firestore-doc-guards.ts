import type { TrainingDay, Exercise, Weekday } from '@/data/trainingPlan';
import type { PlanObjective } from '@/data/planTemplates';
import type { BodyMeasurement, WorkoutSession, SetData, ExerciseProgress } from '@/types';
import type {
  PlanCycle,
  PlanCycleChoice,
  PlanCycleChoiceEntry,
  PlanCycleChoiceLevel,
  PlanCycleChoiceSource,
} from '@/types/cycles';
import { sanitizeSessionRatingReasons } from '@/lib/workout-session-rating';

// P0: walidacja dokumentów przy hydracji z Firestore. Uszkodzony DOKUMENT jest
// odrzucany (caller raportuje do client_errors), uszkodzony FRAGMENT (seria,
// ćwiczenie) jest odfiltrowywany — jedna zepsuta seria nie kasuje treningu z UI.
// Zasada: lepiej nie pokazać śmieci, niż wyrenderować NaN w seriach.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const asDateString = (value: unknown): string | null =>
  typeof value === 'string' && DATE_RE.test(value) ? value : null;

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const optionalFinite = (target: Record<string, unknown>, key: string, value: unknown): void => {
  const parsed = asFiniteNumber(value);
  if (parsed !== null) target[key] = parsed;
};

const optionalString = (target: Record<string, unknown>, key: string, value: unknown): void => {
  const parsed = asString(value);
  if (parsed !== null) target[key] = parsed;
};

const sanitizeSet = (raw: unknown): SetData | null => {
  if (!isRecord(raw)) return null;
  const reps = asFiniteNumber(raw.reps);
  const weight = asFiniteNumber(raw.weight);
  if (reps === null || weight === null) return null;
  const set: SetData = { reps, weight, completed: Boolean(raw.completed) };
  if (raw.isWarmup === true) set.isWarmup = true;
  // Bug 5 (X30): pelny ksztalt serii Z105 musi przezyc hydracje — clampSet
  // (workout-sanitizers) zapisuje te pola, a ich obciecie tutaj zabijalo PR-y
  // duration/wdd, progresje asysty i tonaz wdd po kazdym snapshotcie.
  // Widelki 1:1 z clampSet.
  const durationSec = asFiniteNumber(raw.durationSec);
  if (durationSec !== null) set.durationSec = Math.max(0, Math.min(86400, Math.round(durationSec)));
  const distanceM = asFiniteNumber(raw.distanceM);
  if (distanceM !== null) set.distanceM = Math.max(0, Math.min(1000000, distanceM));
  const assistWeight = asFiniteNumber(raw.assistWeight);
  if (assistWeight !== null) set.assistWeight = Math.max(0, Math.min(999, assistWeight));
  const updatedAt = asFiniteNumber(raw.updatedAt);
  if (updatedAt !== null && updatedAt > 0) set.updatedAt = Math.floor(updatedAt);
  const updatedEventId = asString(raw.updatedEventId);
  if (updatedEventId !== null && updatedEventId.length > 0) set.updatedEventId = updatedEventId.slice(0, 120);
  return set;
};

const sanitizeExerciseProgress = (raw: unknown): ExerciseProgress | null => {
  if (!isRecord(raw)) return null;
  const exerciseId = asString(raw.exerciseId);
  if (exerciseId === null || !Array.isArray(raw.sets)) return null;
  const sets = raw.sets.map(sanitizeSet).filter((set): set is SetData => set !== null);
  const exercise: ExerciseProgress = { exerciseId, sets };
  optionalString(exercise as unknown as Record<string, unknown>, 'name', raw.name);
  optionalString(exercise as unknown as Record<string, unknown>, 'notes', raw.notes);
  optionalFinite(exercise as unknown as Record<string, unknown>, 'rpe', raw.rpe);
  optionalFinite(exercise as unknown as Record<string, unknown>, 'pain', raw.pain);
  optionalFinite(exercise as unknown as Record<string, unknown>, 'quality', raw.quality);
  return exercise;
};

export const sanitizeWorkoutDoc = (id: string, data: unknown): WorkoutSession | null => {
  if (!isRecord(data)) return null;
  const userId = asString(data.userId);
  const dayId = asString(data.dayId);
  const date = asDateString(data.date);
  if (userId === null || dayId === null || date === null || !Array.isArray(data.exercises)) return null;

  const exercises = data.exercises
    .map(sanitizeExerciseProgress)
    .filter((exercise): exercise is ExerciseProgress => exercise !== null);

  const workout: WorkoutSession = {
    id,
    userId,
    dayId,
    date,
    completed: Boolean(data.completed),
    exercises,
  };
  const target = workout as unknown as Record<string, unknown>;
  optionalString(target, 'notes', data.notes);
  optionalString(target, 'cycleId', data.cycleId);
  optionalString(target, 'dayName', data.dayName);
  optionalString(target, 'dayFocus', data.dayFocus);
  optionalFinite(target, 'durationSec', data.durationSec);
  optionalFinite(target, 'startedAt', data.startedAt);
  optionalFinite(target, 'completedAt', data.completedAt);
  optionalFinite(target, 'updatedAt', data.updatedAt);
  optionalFinite(target, 'revision', data.revision);
  optionalString(target, 'lastWriteId', data.lastWriteId);
  if (Array.isArray(data.skippedExercises)) {
    workout.skippedExercises = data.skippedExercises.filter((item): item is string => typeof item === 'string');
  }
  // Ocena sesji (Runna pakiet 1): bez wpisu tutaj pole znika przy hydracji
  // (mapper pole-po-polu, lekcja builda 88) — silnik i UI by go nie widzialy.
  if (data.sessionRating === 'up' || data.sessionRating === 'down') {
    workout.sessionRating = data.sessionRating;
  }
  const ratingReasons = sanitizeSessionRatingReasons(data.sessionRatingReasons);
  if (ratingReasons.length > 0) workout.sessionRatingReasons = ratingReasons;
  return workout;
};

export const sanitizeMeasurementDoc = (id: string, data: unknown): BodyMeasurement | null => {
  if (!isRecord(data)) return null;
  const userId = asString(data.userId);
  const date = asDateString(data.date);
  if (userId === null || date === null) return null;

  const measurement: BodyMeasurement = { id, userId, date };
  const target = measurement as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id' || key === 'userId' || key === 'date') continue;
    if (typeof value === 'number' || typeof value === 'string') {
      if (typeof value === 'number') optionalFinite(target, key, value);
      else optionalString(target, key, value);
    }
  }
  return measurement;
};

const sanitizePlanExercise = (raw: unknown): Exercise | null => {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  const name = asString(raw.name);
  const sets = asString(raw.sets);
  if (id === null || name === null || sets === null) return null;
  const exercise: Exercise = {
    id,
    name,
    sets,
    instructions: Array.isArray(raw.instructions)
      ? raw.instructions.filter((item): item is { title: string; content: string } =>
        isRecord(item) && typeof item.title === 'string' && typeof item.content === 'string')
      : [],
  };
  const target = exercise as unknown as Record<string, unknown>;
  optionalString(target, 'videoUrl', raw.videoUrl);
  if (raw.isSuperset === true) target.isSuperset = true;
  return exercise;
};

// Dni planu: uszkodzony DZIEŃ unieważnia całą listę (null) — plan bez jednego dnia
// jest groźniejszy niż zatrzymanie hydracji (poprzedni dobry stan zostaje w UI).
export const sanitizeTrainingPlanDays = (data: unknown): TrainingDay[] | null => {
  if (!Array.isArray(data)) return null;
  const days: TrainingDay[] = [];
  for (const raw of data) {
    if (!isRecord(raw)) return null;
    const id = asString(raw.id);
    const dayName = asString(raw.dayName);
    if (id === null || dayName === null || !Array.isArray(raw.exercises)) return null;
    const exercises = raw.exercises
      .map(sanitizePlanExercise)
      .filter((exercise): exercise is Exercise => exercise !== null);
    const day: TrainingDay = {
      id,
      dayName,
      weekday: (typeof raw.weekday === 'string' ? raw.weekday : 'monday') as TrainingDay['weekday'],
      focus: typeof raw.focus === 'string' ? raw.focus : '',
      exercises,
    };
    days.push(day);
  }
  return days;
};

// WP-PLANS-1 (X27): cykl życia planu na training_plans/{uid}. Brak pola /
// śmieci = 'active' (kompatybilność wsteczna — stare dokumenty bez pola).
export type TrainingPlanStatus = 'active' | 'ended';

export const sanitizeTrainingPlanStatus = (value: unknown): TrainingPlanStatus =>
  value === 'ended' ? 'ended' : 'active';

// WP-PLANS-2 (X27): nazwa planu na training_plans/{uid} — string trim + max 60,
// wszystko inne (śmieci, pusty) = null (UI pokazuje wtedy fallback).
export const sanitizeTrainingPlanName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, 60);
  return trimmed.length > 0 ? trimmed : null;
};

const CYCLE_STATUSES = new Set(['active', 'completed']);

// WP-6 (X33): dozwolone wartości pól `choice`. `satisfies Record<Union, true>`
// pilnuje, że rozszerzenie unii w typach nie zostawi sanitizera w tyle.
const CHOICE_LEVELS = { beginner: true, intermediate: true, advanced: true } satisfies Record<PlanCycleChoiceLevel, true>;
const CHOICE_OBJECTIVES = { build_muscle: true, peak_strength: true, fat_loss: true, athletic: true } satisfies Record<PlanObjective, true>;
const CHOICE_SOURCES = { recommended: true, browsed: true, custom: true } satisfies Record<PlanCycleChoiceSource, true>;
const CHOICE_ENTRIES = { onboarding: true, replan: true } satisfies Record<PlanCycleChoiceEntry, true>;
const WEEKDAYS = {
  monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true,
} satisfies Record<Weekday, true>;

const isKeyOf = <T extends Record<string, true>>(table: T, value: unknown): value is keyof T & string =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(table, value);

/** String trim + max `max`; pusty/nie-string = null (pole nie powstaje). */
const trimmedString = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * WP-6 (X33): odpowiedzi z kreatora na cyklu. Uszkodzona mapa = null (caller
 * pomija pole po cichu — cykl bez `choice` jest poprawny). Nieznane klucze są
 * wycinane (hasOnly w rules), nieznane dni tygodnia odfiltrowane, stringi obcięte.
 */
export const sanitizePlanCycleChoice = (raw: unknown): PlanCycleChoice | null => {
  if (!isRecord(raw)) return null;
  if (typeof raw.version !== 'number' || !Number.isInteger(raw.version)) return null;
  const chosenAt = trimmedString(raw.chosenAt, 40);
  const daysPerWeek = asFiniteNumber(raw.daysPerWeek);
  if (chosenAt === null || daysPerWeek === null || !Array.isArray(raw.trainingDays)) return null;
  if (!isKeyOf(CHOICE_LEVELS, raw.level) || !isKeyOf(CHOICE_OBJECTIVES, raw.objective)) return null;
  if (!isKeyOf(CHOICE_SOURCES, raw.planSource) || !isKeyOf(CHOICE_ENTRIES, raw.entry)) return null;

  const choice: PlanCycleChoice = {
    version: raw.version,
    chosenAt,
    level: raw.level,
    objective: raw.objective,
    daysPerWeek,
    trainingDays: raw.trainingDays.filter((day): day is Weekday => isKeyOf(WEEKDAYS, day)),
    planSource: raw.planSource,
    entry: raw.entry,
  };
  const templateId = trimmedString(raw.templateId, 100);
  if (templateId !== null) choice.templateId = templateId;
  const recommendedTemplateId = trimmedString(raw.recommendedTemplateId, 100);
  if (recommendedTemplateId !== null) choice.recommendedTemplateId = recommendedTemplateId;
  const planName = trimmedString(raw.planName, 60);
  if (planName !== null) choice.planName = planName;
  return choice;
};

export const sanitizePlanCycleDoc = (id: string, data: unknown): PlanCycle | null => {
  if (!isRecord(data)) return null;
  const userId = asString(data.userId);
  const startDate = asDateString(data.startDate);
  const status = asString(data.status);
  if (userId === null || startDate === null || status === null || !CYCLE_STATUSES.has(status)) return null;
  const days = sanitizeTrainingPlanDays(data.days);
  if (days === null) return null;

  const stats = isRecord(data.stats) ? data.stats : {};
  const cycle: PlanCycle = {
    id,
    userId,
    days,
    durationWeeks: asFiniteNumber(data.durationWeeks) ?? 12,
    startDate,
    endDate: asString(data.endDate) ?? '',
    status: status as PlanCycle['status'],
    createdAt: asString(data.createdAt) ?? '',
    stats: {
      totalWorkouts: asFiniteNumber(stats.totalWorkouts) ?? 0,
      totalTonnage: asFiniteNumber(stats.totalTonnage) ?? 0,
      prs: Array.isArray(stats.prs) ? (stats.prs as PlanCycle['stats']['prs']) : [],
      completionRate: asFiniteNumber(stats.completionRate) ?? 0,
      ...(asFiniteNumber(stats.missedWorkouts) !== null
        ? { missedWorkouts: asFiniteNumber(stats.missedWorkouts)! }
        : {}),
      ...(asFiniteNumber(stats.averageTonnagePerWorkout) !== null
        ? { averageTonnagePerWorkout: asFiniteNumber(stats.averageTonnagePerWorkout)! }
        : {}),
    },
  };
  // WP-6 (X33): choice przechodzi tylko jako poprawna mapa; uszkodzony = brak pola.
  const choice = sanitizePlanCycleChoice(data.choice);
  if (choice !== null) cycle.choice = choice;
  return cycle;
};
