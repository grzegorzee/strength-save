import { foldPolish } from '@/lib/pr-backfill';

// Tipy dnia regeneracji (Runna pakiet 1, spec B2): dzień wolny to karta
// z treścią, nie pusty ekran. Statyczna pula (zero mechaniki), wybór
// deterministyczny: jeden tip ogólny + jeden pod partię z WCZORAJSZEJ sesji.
// Klucze i18n — UI tłumaczy.

export type RecoveryTipKey =
  | 'dash.recovery.tipSleep'
  | 'dash.recovery.tipStretchPush'
  | 'dash.recovery.tipStretchPull'
  | 'dash.recovery.tipStretchLegs'
  | 'dash.recovery.tipStretchGeneric';

const LEGS_KEYWORDS = ['nogi', 'nog', 'udo', 'posladk', 'legs', 'squat', 'przysiad', 'martwy', 'deadlift', 'glute'];
const PULL_KEYWORDS = ['plec', 'pull', 'ciagn', 'biceps', 'back', 'row'];
const PUSH_KEYWORDS = ['push', 'klat', 'bark', 'wycisk', 'chest', 'shoulder', 'triceps'];

const matches = (focus: string, keywords: string[]): boolean =>
  keywords.some((keyword) => focus.includes(keyword));

export const recoveryTipKeys = (yesterdayFocus: string | null | undefined): RecoveryTipKey[] => {
  const focus = yesterdayFocus ? foldPolish(yesterdayFocus) : '';
  // Nogi przed pull: "martwy ciąg i plecy" to dzień nóg, nie pleców.
  const stretch: RecoveryTipKey = focus && matches(focus, LEGS_KEYWORDS)
    ? 'dash.recovery.tipStretchLegs'
    : focus && matches(focus, PULL_KEYWORDS)
      ? 'dash.recovery.tipStretchPull'
      : focus && matches(focus, PUSH_KEYWORDS)
        ? 'dash.recovery.tipStretchPush'
        : 'dash.recovery.tipStretchGeneric';
  return ['dash.recovery.tipSleep', stretch];
};
