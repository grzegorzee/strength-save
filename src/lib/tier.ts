export interface TierInfo {
  label: string;
  level: number;
  /** Postęp 0-1 do następnego progu (do paska/UI). */
  progress: number;
  next: string | null;
}

interface TierThreshold {
  label: string;
  min: number;
}

// Poziom liczony ze "score" = ukończone treningi + 2×PR-y (nagradza realny progres).
const THRESHOLDS: TierThreshold[] = [
  { label: 'Newcomer', min: 0 },
  { label: 'Rookie', min: 5 },
  { label: 'Advanced', min: 20 },
  { label: 'Pro Tier', min: 40 },
  { label: 'Elite Tier', min: 80 },
];

export const computeTier = (totalWorkouts: number, totalPRs = 0): TierInfo => {
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
  return { label: current.label, level: idx, progress, next: next?.label ?? null };
};
