import { translate, type LanguageCode, type TranslationKey } from '@/i18n';

export interface WarmupExercise {
  /** Klucz i18n nazwy cwiczenia (kanoniczny identyfikator). */
  nameKey: TranslationKey;
  /** Klucz i18n czasu trwania. */
  durationKey: TranslationKey;
}

export const warmupExercises: WarmupExercise[] = [
  { nameKey: 'warmup.jumpingJacks', durationKey: 'warmup.dur.30sec' },
  { nameKey: 'warmup.hipCircles', durationKey: 'warmup.dur.10eachSide' },
  { nameKey: 'warmup.armCircles', durationKey: 'warmup.dur.10eachSide' },
  { nameKey: 'warmup.bodyweightSquats', durationKey: 'warmup.dur.15reps' },
  { nameKey: 'warmup.lightJog', durationKey: 'warmup.dur.1min' },
];

export interface StretchExercise {
  nameKey: TranslationKey;
  durationKey: TranslationKey;
}

// Stretching per day focus
export const stretchingByFocus: Record<string, StretchExercise[]> = {
  default: [
    { nameKey: 'stretch.chestDoorway', durationKey: 'stretch.dur.30secSide' },
    { nameKey: 'stretch.quadStanding', durationKey: 'stretch.dur.30secLeg' },
    { nameKey: 'stretch.hamstringSeated', durationKey: 'stretch.dur.30sec' },
    { nameKey: 'stretch.toeTouch', durationKey: 'stretch.dur.30sec' },
    { nameKey: 'stretch.catCow', durationKey: 'stretch.dur.10reps' },
    { nameKey: 'stretch.childsPose', durationKey: 'stretch.dur.30sec' },
  ],
  chest: [
    { nameKey: 'stretch.chestDoorway', durationKey: 'stretch.dur.30secSide' },
    { nameKey: 'stretch.triceps', durationKey: 'stretch.dur.30secArm' },
    { nameKey: 'stretch.quadStanding', durationKey: 'stretch.dur.30secLeg' },
    { nameKey: 'stretch.spinalTwist', durationKey: 'stretch.dur.30secSide' },
    { nameKey: 'stretch.catCow', durationKey: 'stretch.dur.10reps' },
    { nameKey: 'stretch.childsPose', durationKey: 'stretch.dur.30sec' },
  ],
  back: [
    { nameKey: 'stretch.latSideBend', durationKey: 'stretch.dur.30secSide' },
    { nameKey: 'stretch.hamstringSeated', durationKey: 'stretch.dur.30sec' },
    { nameKey: 'stretch.lowerBack', durationKey: 'stretch.dur.30sec' },
    { nameKey: 'stretch.catCow', durationKey: 'stretch.dur.10reps' },
    { nameKey: 'stretch.pigeonPose', durationKey: 'stretch.dur.30secSide' },
    { nameKey: 'stretch.childsPose', durationKey: 'stretch.dur.30sec' },
  ],
  shoulders: [
    { nameKey: 'stretch.shoulderCross', durationKey: 'stretch.dur.30secSide' },
    { nameKey: 'stretch.chestDoorway', durationKey: 'stretch.dur.30secSide' },
    { nameKey: 'stretch.quadStanding', durationKey: 'stretch.dur.30secLeg' },
    { nameKey: 'stretch.bicepWall', durationKey: 'stretch.dur.30secArm' },
    { nameKey: 'stretch.catCow', durationKey: 'stretch.dur.10reps' },
    { nameKey: 'stretch.childsPose', durationKey: 'stretch.dur.30sec' },
  ],
};

// Try to match day focus to stretching category
export function getStretchingForFocus(focus: string): StretchExercise[] {
  const lowerFocus = focus.toLowerCase();
  if (lowerFocus.includes('klat') || lowerFocus.includes('chest')) return stretchingByFocus.chest;
  if (lowerFocus.includes('plec') || lowerFocus.includes('back')) return stretchingByFocus.back;
  if (lowerFocus.includes('bark') || lowerFocus.includes('shoulder')) return stretchingByFocus.shoulders;
  return stretchingByFocus.default;
}

/** Zwraca nazwe + czas cwiczenia w jezyku UI. */
export const localizeWarmup = (ex: WarmupExercise | StretchExercise, lang: LanguageCode) => ({
  name: translate(lang, ex.nameKey),
  duration: translate(lang, ex.durationKey),
});
