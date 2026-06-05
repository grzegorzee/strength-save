import { translate, type LanguageCode, type TranslationKey, DEFAULT_LANGUAGE } from '@/i18n';

export interface TierInfo {
  label: string;
  level: number;
  /** Postęp 0-1 do następnego progu (do paska/UI). */
  progress: number;
  next: string | null;
}

interface TierThreshold {
  labelKey: TranslationKey;
  min: number;
}

// Poziom liczony ze "score" = ukończone treningi + 2×PR-y (nagradza realny progres).
const THRESHOLDS: TierThreshold[] = [
  { labelKey: 'tier.newcomer', min: 0 },
  { labelKey: 'tier.rookie', min: 5 },
  { labelKey: 'tier.advanced', min: 20 },
  { labelKey: 'tier.proTier', min: 40 },
  { labelKey: 'tier.eliteTier', min: 80 },
];

export const computeTier = (
  totalWorkouts: number,
  totalPRs = 0,
  lang: LanguageCode = DEFAULT_LANGUAGE,
): TierInfo => {
  const score = totalWorkouts + totalPRs * 2;
  let idx = 0;
  for (let i = 0; i < THRESHOLDS.length; i += 1) {
    if (score >= THRESHOLDS[i].min) idx = i;
  }
  const current = THRESHOLDS[idx];
  const next = THRESHOLDS[idx + 1] ?? null;
  const progress = next
    ? Math.min(1, (score - current.min) / (next.min - current.min))
    : 1;
  return {
    label: translate(lang, current.labelKey),
    level: idx,
    progress,
    next: next ? translate(lang, next.labelKey) : null,
  };
};
