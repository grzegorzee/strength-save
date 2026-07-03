// Prośba o ocenę w App Store (Z83): natywne in-app review po kamieniach milowych
// ukończonych treningów, nie częściej niż raz na 60 dni. ZERO własnych modali
// "oceń nas" — Apple zakazuje proszenia poza natywnym API.

export const REVIEW_PROMPT_STORAGE_KEY = 'fittracker_review_prompt';

const MILESTONES = [5, 15, 30, 50, 100];
const MIN_INTERVAL_MS = 60 * 24 * 60 * 60 * 1000; // 60 dni

export const shouldRequestReview = (
  completedCount: number,
  lastPromptAt: number | null,
  now: number,
): boolean => {
  if (!MILESTONES.includes(completedCount)) return false;
  if (lastPromptAt !== null && now - lastPromptAt < MIN_INTERVAL_MS) return false;
  return true;
};

export const readLastReviewPromptAt = (): number | null => {
  try {
    const raw = window.localStorage.getItem(REVIEW_PROMPT_STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const markReviewPromptShown = (now: number): void => {
  try {
    window.localStorage.setItem(REVIEW_PROMPT_STORAGE_KEY, String(now));
  } catch {
    // localStorage niedostępny — najwyżej zapytamy ponownie.
  }
};
