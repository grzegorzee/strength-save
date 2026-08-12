// Ocena sesji po treningu (Runna pakiet 1, spec A1/A2): kciuk gora/dol + chipsy
// powodow przy kciuku w dol. Modul CZYSTY (bez importu firebase) — doc-guards
// i testy moga go ciagnac bez transitive importu SDK.

import type { WorkoutSessionRating, WorkoutSessionRatingReason } from '@/types';

export const SESSION_RATING_REASONS: readonly WorkoutSessionRatingReason[] = [
  'too_heavy',
  'too_long',
  'weak_day',
];

export interface SessionRatingUpdate {
  sessionRating: WorkoutSessionRating;
  sessionRatingReasons?: WorkoutSessionRatingReason[];
}

const isKnownReason = (value: unknown): value is WorkoutSessionRatingReason =>
  (SESSION_RATING_REASONS as readonly unknown[]).includes(value);

export const sanitizeSessionRatingReasons = (
  reasons: unknown,
): WorkoutSessionRatingReason[] =>
  Array.isArray(reasons) ? [...new Set(reasons.filter(isKnownReason))] : [];

export const buildSessionRatingUpdate = (
  rating: unknown,
  reasons?: unknown,
): SessionRatingUpdate | null => {
  if (rating !== 'up' && rating !== 'down') return null;
  if (rating === 'up') return { sessionRating: 'up' };
  const knownReasons = sanitizeSessionRatingReasons(reasons);
  return {
    sessionRating: 'down',
    ...(knownReasons.length > 0 && { sessionRatingReasons: knownReasons }),
  };
};
