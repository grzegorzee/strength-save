// Przewodnik nowego konta (2026-09-29, przebudowa WP-E X37). Czysta logika bez
// DOM i bez Firebase: warunek startu, etapy, kroki jako dane, stan lokalny.
// Render: components/FirstWorkoutTour.tsx; zapis do chmury: app-tour-sync.ts.
//
// Etapy (jeden przewodnik, prowadzony AKCJĄ, nie ścianą tekstu):
//   dashboard    -> gdzie co jest (pasek zakładek) + spotlight na start treningu
//   workout      -> pierwsza seria: inputy, REALNE odhaczenie, celebracja + przerwa,
//                   menu ćwiczenia (zamiana), Zakończ
//   after-finish -> karta "co dalej" w podsumowaniu pierwszego treningu
//   done         -> koniec (status done/skipped zapisany per konto)
//
// Stan per KONTO: users/{uid}.preferences.appTour (chmura, między urządzeniami)
// + localStorage per uid (offline, postęp etapów, zapis oczekujący na sync).
// Stary klucz urządzenia (X37) "1" = przewodnik widziany (zgodność wstecz).
import type { TranslationKey } from '@/i18n';

/** Legacy X37: klucz urządzenia "tour widziany". Nadal honorowany jako widziany. */
export const FIRST_WORKOUT_TOUR_KEY = 'fittracker_first_workout_tour_v1';
export const APP_TOUR_STORAGE_PREFIX = 'fittracker_app_tour_v2:';

export type AppTourStage = 'dashboard' | 'workout' | 'after-finish' | 'done';
export type AppTourOutcome = 'done' | 'skipped';

/** Kształt w users/{uid}.preferences.appTour (mapa w już dozwolonym `preferences`). */
export interface CloudAppTourState {
  status: AppTourOutcome;
  at: string;
}

export interface LocalAppTourState {
  stage: AppTourStage;
  /** Ostatni krok etapu workout (powrót do treningu w połowie przewodnika). */
  step?: AppTourStepId;
  outcome?: AppTourOutcome;
  /** Zakończenie jeszcze nie potwierdzone w chmurze (offline). */
  pendingSync?: boolean;
  /** Odtworzenie z Profilu: pomija warunek "0 ukończonych treningów". */
  replay?: boolean;
}

export type AppTourStepId =
  | 'nav'
  | 'start'
  | 'workout-start'
  | 'set-inputs'
  | 'set-check'
  | 'first-set-done'
  | 'exercise-menu'
  | 'finish';

export interface AppTourStep {
  id: AppTourStepId;
  /** Selektor celu spotlightu (atrybut data-tour). */
  target: string;
  /** Klucz i18n jednego zdania w dymku. */
  textKey: TranslationKey;
  /** Krótki nagłówek (tylko kroki "wow"). */
  titleKey?: TranslationKey;
  /** Wycięcie liczone z elementów wewnątrz celu (inputy wiersza serii). */
  highlightInner?: string;
  /** Cel bywa poza ekranem: przewiń przed pomiarem. */
  scrollIntoView?: boolean;
  /**
   * Krok czeka na AKCJĘ usera na celu (tap Start, realne odhaczenie serii).
   * Brak przycisku "Dalej"; cel zostaje klikalny. Pomiń zawsze jest.
   */
  action?: 'tap' | 'complete-set';
  /** Cel opcjonalny: brak celu = dymek bez wycięcia (np. timer wyłączony). */
  optionalTarget?: boolean;
  /** Cel widoczny, ale nieklikalny (legenda paska zakładek). */
  blockTarget?: boolean;
  /** Legenda zakładek w dymku zamiast zdania. */
  legend?: boolean;
  /** Zdanie, gdy opcjonalnego celu brak (np. timer przerwy wyłączony). */
  fallbackTextKey?: TranslationKey;
  /** Porcja kroków (wskaźnik postępu liczony w porcji, max 3 kroki). */
  chunk?: 'first-set' | 'after-set';
}

export const DASHBOARD_TOUR_STEPS: readonly AppTourStep[] = [
  {
    id: 'nav',
    target: '[data-tour="main-nav"]',
    textKey: 'tour.app.nav',
    titleKey: 'tour.app.navTitle',
    blockTarget: true,
    legend: true,
  },
  {
    id: 'start',
    target: '[data-tour="start-workout"]',
    textKey: 'tour.app.start',
    action: 'tap',
  },
];

/** Trening jeszcze nie wystartował: jeden krok-akcja na pasku startu. */
export const WORKOUT_START_STEPS: readonly AppTourStep[] = [
  {
    id: 'workout-start',
    target: '[data-tour="workout-start"]',
    textKey: 'tour.app.workoutStart',
    action: 'tap',
  },
];

/**
 * Sesja trwa: porcja "pierwsza seria" (wpis, REALNE odhaczenie) i porcja po
 * odhaczeniu (celebracja + przerwa, menu ćwiczenia, Zakończ). Każda porcja
 * max 3 kroki (Chameleon: 3-4 kroki = 72-74% ukończeń, 7+ = 16%).
 */
export const WORKOUT_TOUR_STEPS: readonly AppTourStep[] = [
  {
    id: 'set-inputs',
    target: '[data-tour="set-inputs"]',
    textKey: 'tour.first.step1',
    highlightInner: 'input',
    chunk: 'first-set',
  },
  {
    id: 'set-check',
    target: '[data-tour="set-check"]',
    textKey: 'tour.first.step2',
    action: 'complete-set',
    chunk: 'first-set',
  },
  {
    id: 'first-set-done',
    target: '[data-tour="rest-bar"]',
    textKey: 'tour.app.restRunning',
    fallbackTextKey: 'tour.app.firstSetNoRest',
    titleKey: 'tour.app.firstSetTitle',
    optionalTarget: true,
    chunk: 'after-set',
  },
  {
    id: 'exercise-menu',
    target: '[data-tour="exercise-menu"]',
    textKey: 'tour.app.exerciseMenu',
    chunk: 'after-set',
  },
  {
    id: 'finish',
    target: '[data-tour="finish"]',
    textKey: 'tour.first.step3',
    scrollIntoView: true,
    chunk: 'after-set',
  },
];

const localKey = (uid: string) => `${APP_TOUR_STORAGE_PREFIX}${uid}`;

const STAGES: readonly AppTourStage[] = ['dashboard', 'workout', 'after-finish', 'done'];
const STEP_IDS = new Set<string>([...DASHBOARD_TOUR_STEPS, ...WORKOUT_START_STEPS, ...WORKOUT_TOUR_STEPS].map((s) => s.id));

export const readLocalAppTour = (uid: string): LocalAppTourState | null => {
  if (!uid) return null;
  try {
    const raw = window.localStorage.getItem(localKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalAppTourState> | null;
    if (!parsed || !STAGES.includes(parsed.stage as AppTourStage)) return null;
    return {
      stage: parsed.stage as AppTourStage,
      ...(parsed.step && STEP_IDS.has(parsed.step) ? { step: parsed.step } : {}),
      ...(parsed.outcome === 'done' || parsed.outcome === 'skipped' ? { outcome: parsed.outcome } : {}),
      ...(parsed.pendingSync === true ? { pendingSync: true } : {}),
      ...(parsed.replay === true ? { replay: true } : {}),
    };
  } catch {
    return null;
  }
};

export const writeLocalAppTour = (uid: string, state: LocalAppTourState): void => {
  if (!uid) return;
  try {
    window.localStorage.setItem(localKey(uid), JSON.stringify(state));
  } catch {
    // brak localStorage (tryb prywatny): stan żyje do końca sesji w pamięci komponentu
  }
};

export const isLegacyTourSeen = (): boolean => {
  try {
    return window.localStorage.getItem(FIRST_WORKOUT_TOUR_KEY) === '1';
  } catch {
    return false;
  }
};

/** Walidacja pola z chmury (preferences to luźna mapa). */
export const readCloudAppTour = (value: unknown): CloudAppTourState | null => {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.status !== 'done' && v.status !== 'skipped') return null;
  return { status: v.status, at: typeof v.at === 'string' ? v.at : '' };
};

/** Przewodnik zakończony (lub pominięty) na tym koncie albo urządzeniu. */
export const isAppTourFinished = (cloud: CloudAppTourState | null, local: LocalAppTourState | null): boolean =>
  !!cloud || local?.stage === 'done' || isLegacyTourSeen();

/** Desktop md+ ma sidebar i inny układ: spotlighty projektowane pod telefon. */
export const isDesktopViewport = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(min-width: 768px)').matches;
};

export interface AppTourStartContext {
  cloud: CloudAppTourState | null;
  local: LocalAppTourState | null;
  legacySeen: boolean;
  /** Ukończone treningi; null = jeszcze nie wiadomo (dane się ładują): NIE startuj. */
  completedCount: number | null;
  isDesktop: boolean;
}

/**
 * Aktywny etap przewodnika albo null. Startuje sam dla nowego konta (zero
 * ukończonych treningów, brak flagi w profilu, brak lokalnego końca, brak
 * starego klucza). Odtworzenie z Profilu (replay) omija warunek treningów.
 * Rozpoczęty przewodnik (local stage != done) trwa mimo pierwszego treningu,
 * żeby etap "co dalej" zdążył się pokazać.
 */
export const resolveAppTourStage = (ctx: AppTourStartContext): AppTourStage | null => {
  if (ctx.isDesktop) return null;
  const local = ctx.local;
  if (local?.replay && local.stage !== 'done') return local.stage;
  if (ctx.cloud || ctx.legacySeen || local?.stage === 'done') return null;
  if (local && local.stage !== 'dashboard') return local.stage;
  if (ctx.completedCount === null || ctx.completedCount > 0) return null;
  return 'dashboard';
};

/**
 * Krok, od którego wznowić porcję po powrocie do treningu. Porcja "po serii"
 * wraca od menu (celebracja jest jednorazowa, pasek przerwy mógł zniknąć).
 */
export const resumeWorkoutStep = (remembered: AppTourStepId | undefined): AppTourStepId => {
  if (remembered === 'first-set-done') return 'exercise-menu';
  if (remembered && WORKOUT_TOUR_STEPS.some((s) => s.id === remembered)) return remembered;
  return 'set-inputs';
};

/** Liczba odhaczonych serii (także rozgrzewkowych): wyzwalacz kroku "complete-set". */
export const countCheckedSets = (exerciseSets: Record<string, ReadonlyArray<{ completed?: boolean }>>): number =>
  Object.values(exerciseSets).reduce((sum, sets) => sum + sets.filter((s) => s.completed).length, 0);
