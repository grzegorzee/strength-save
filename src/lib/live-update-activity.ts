import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

// Bramka aktywacji OTA: aktualizacja NIGDY nie przeładowuje WebView w trakcie
// treningu. Fail-closed: nieznany użytkownik (auth w toku), błąd odczytu
// IndexedDB albo ekran treningu = trening aktywny.

const LIVE_DRAFT_WINDOW_MS = 12 * 60 * 60 * 1000;

type DraftActivityFields = Pick<
  ActiveWorkoutDraft,
  'completedLocally' | 'finalSyncPending' | 'updatedAt' | 'startedAt' | 'lastActivityAt' | 'healthSyncPending'
>;

export const isDraftBlockingLiveUpdate = (draft: DraftActivityFields, now: number): boolean => {
  // Dane jeszcze nie dotarły do chmury: czekamy, nawet jeśli trening zakończony.
  if (draft.finalSyncPending || draft.healthSyncPending) return true;
  if (draft.completedLocally) return false;
  const lastTouch = Math.max(draft.lastActivityAt ?? 0, draft.updatedAt ?? 0, draft.startedAt ?? 0);
  return now - lastTouch < LIVE_DRAFT_WINDOW_MS;
};

export type LiveUpdateUserState = undefined | null | { uid: string };

export const isTrainingActive = (input: {
  user: LiveUpdateUserState;
  drafts: DraftActivityFields[] | 'error';
  currentPath: string;
  now: number;
}): boolean => {
  if (input.currentPath.startsWith('/workout/')) return true;
  if (input.user === undefined) return true;
  if (input.user === null) return false;
  if (input.drafts === 'error') return true;
  return input.drafts.some((draft) => isDraftBlockingLiveUpdate(draft, input.now));
};

/** Ścieżka HashRoutera (#/workout/...) bez query. */
export const currentHashPath = (): string => {
  if (typeof window === 'undefined') return '/';
  const hash = window.location.hash.replace(/^#/, '');
  return (hash.split('?')[0] || '/');
};
