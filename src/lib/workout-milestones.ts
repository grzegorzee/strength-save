// WP-F (X37, RESEARCH sekcja 5): celebracja ukończenia treningu tylko dla
// rzadkich momentów. Pierwszy trening i kamienie milowe dostają baner
// z konfetti; każde inne zakończenie = dotychczasowa sekwencja bez zmian
// (anti-pattern: spowszedniałe konfetti).

export interface WorkoutMilestone {
  kind: 'first' | 'milestone';
  /** Numer porządkowy ukończonego treningu (1 = pierwszy w życiu). */
  n: number;
}

const MILESTONES = [10, 25, 50, 100, 150, 200, 300, 500];

/** Ostatni świętowany numer treningu na tym urządzeniu (jeden wpis, nie lista). */
export const MILESTONE_CELEBRATED_STORAGE_KEY = 'fittracker_milestone_celebrated_v1';

export const workoutMilestoneFor = (count: number): WorkoutMilestone | null => {
  if (!Number.isInteger(count) || count < 1) return null;
  if (count === 1) return { kind: 'first', n: 1 };
  if (MILESTONES.includes(count)) return { kind: 'milestone', n: count };
  return null;
};

const readCelebrated = (): number | null => {
  try {
    const raw = window.localStorage.getItem(MILESTONE_CELEBRATED_STORAGE_KEY);
    const parsed = raw ? Number(raw) : Number.NaN;
    return Number.isInteger(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/** true = ten kamień był już świętowany (resume, ponowne wejście, retry zapisu). */
export const hasCelebrated = (n: number): boolean => readCelebrated() === n;

export const markCelebrated = (n: number): void => {
  try {
    window.localStorage.setItem(MILESTONE_CELEBRATED_STORAGE_KEY, String(n));
  } catch {
    // localStorage niedostępny: najwyżej celebracja powtórzy się raz.
  }
};
