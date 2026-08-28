export const POST_PLAN_GUIDE_VERSION = 1;
export const POST_PLAN_GUIDE_REPLAY_PATH = '/?guide=1';

const storageKey = (uid: string) => `fittracker_post_plan_guide_v${POST_PLAN_GUIDE_VERSION}_${uid}`;

export const isPostPlanGuideSeen = (uid: string): boolean => {
  if (!uid) return false;
  try {
    return window.localStorage.getItem(storageKey(uid)) === 'seen';
  } catch {
    return false;
  }
};

export const markPostPlanGuideSeen = (uid: string): void => {
  if (!uid) return;
  try {
    window.localStorage.setItem(storageKey(uid), 'seen');
  } catch {
    // Przewodnik jest pomocą, nie blokadą. Niedostępny storage nie może
    // zatrzymać użytkownika po utworzeniu planu.
  }
};
