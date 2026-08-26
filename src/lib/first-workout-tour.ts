// WP-E (X37): tour pierwszego treningu, 3 spotlighty (RESEARCH sekcja 1:
// 3 kroki = 72% ukończeń, 7 kroków = 16%; jeden tip naraz, w momencie akcji,
// zawsze "Pomiń"). Pokazany raz na urządzeniu (localStorage) i tylko gdy user
// nie ma jeszcze ukończonego treningu. Czysta logika bez DOM: warunki
// pokazania i kroki jako dane; render w components/FirstWorkoutTour.tsx.
import type { TranslationKey } from '@/i18n';

export const FIRST_WORKOUT_TOUR_KEY = 'fittracker_first_workout_tour_v1';

export type FirstWorkoutTourStepId = 'set-inputs' | 'set-check' | 'finish';

export interface FirstWorkoutTourStep {
  id: FirstWorkoutTourStepId;
  /** Selektor celu spotlightu (atrybut data-tour w ExerciseCard / WorkoutDay). */
  target: string;
  /** Klucz i18n jednego zdania w dymku. */
  textKey: TranslationKey;
  /** Wycięcie liczone z elementów wewnątrz celu (inputy wiersza serii), nie z całego wiersza. */
  highlightInner?: string;
  /** Cel bywa poza ekranem (przycisk Zakończ na dole): przewiń przed pomiarem. */
  scrollIntoView?: boolean;
}

export const FIRST_WORKOUT_TOUR_STEPS: readonly FirstWorkoutTourStep[] = [
  {
    id: 'set-inputs',
    target: '[data-tour="set-inputs"]',
    textKey: 'tour.first.step1',
    highlightInner: 'input',
  },
  {
    id: 'set-check',
    target: '[data-tour="set-check"]',
    textKey: 'tour.first.step2',
  },
  {
    id: 'finish',
    target: '[data-tour="finish"]',
    textKey: 'tour.first.step3',
    scrollIntoView: true,
  },
];

export const isFirstWorkoutTourSeen = (): boolean => {
  try {
    return window.localStorage.getItem(FIRST_WORKOUT_TOUR_KEY) === '1';
  } catch {
    return false;
  }
};

export const markFirstWorkoutTourSeen = (): void => {
  try {
    window.localStorage.setItem(FIRST_WORKOUT_TOUR_KEY, '1');
  } catch {
    // brak localStorage (tryb prywatny): tour pokaże się ponownie, nic groźnego
  }
};

/** Desktop md+ ma sidebar i inny układ: spotlighty projektowane pod telefon. */
export const isDesktopViewport = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(min-width: 768px)').matches;
};

export interface FirstWorkoutTourContext {
  /** Ukończone treningi usera (agregat all-time albo okno recent). */
  completedCount: number;
  seen: boolean;
  /** Wznowienie sesji (draft z treścią / sesja istniejąca w chmurze). */
  isResume: boolean;
  /** ?autostart=true (Watch/Garmin/Dashboard): start bez przycisku. */
  isAutostart: boolean;
  isDesktop: boolean;
}

/**
 * Tour WYŁĄCZNIE przy świeżym, jawnym starcie pierwszego treningu na telefonie.
 * Resume i autostart nie dostają toura (ten sam kontrakt co shouldOfferPreStartWarmup).
 */
export const shouldShowFirstWorkoutTour = (ctx: FirstWorkoutTourContext): boolean =>
  ctx.completedCount === 0 && !ctx.seen && !ctx.isResume && !ctx.isAutostart && !ctx.isDesktop;
