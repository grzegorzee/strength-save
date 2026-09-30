// Przewodnik nowego konta (2026-09-30, v2 po zgłoszeniu z iOS 152). Czysta
// logika bez DOM i bez Firebase: warunek startu, etapy, kroki jako dane, stan.
// Render: components/AppTour.tsx; zapis do chmury: app-tour-sync.ts.
//
// NIEZMIENNIK: przewodnik NIGDY nie otwiera ani nie dotyka prawdziwych sesji.
// v1 prowadził przez „dzisiejszy trening” z hero Dashboardu; konto z ukończonym
// dzisiejszym treningiem dostawało PRZYSZŁĄ sesję bez odhaczania i utykało na
// kroku „tapnij ptaszek” (zasada 6). Teraz etap treningowy odbywa się w
// TRENINGU PRÓBNYM (/practice), który nic nie zapisuje, więc działa na każdym
// stanie konta (brak planu, dzień wolny, urlop, przyszły start, trening w toku).
//
// Rozdziały (każdy max 3-4 kroki, jedno zdanie na krok, akcja zamiast czytania):
//   dashboard -> zaproszenie do treningu próbnego (jeden dymek z CTA)
//   practice  -> wpis serii, REALNE odhaczenie, celebracja + przerwa, menu
//                ćwiczenia (zamiana), Zakończ, ekran „co dalej” (w próbie)
//   tabs      -> jeden spotlight na zakładkę (Plan, Historia, Postępy, Profil),
//                tap w zakładkę = przejście; na końcu „gotowe”
//   done      -> koniec (status done/skipped zapisany per konto)
//
// Stan per KONTO: users/{uid}.preferences.appTour (chmura, między urządzeniami)
// + localStorage per uid (offline, postęp, zapis oczekujący na sync).
// Stary klucz urządzenia (X37) "1" = przewodnik widziany (zgodność wstecz).
import type { TranslationKey } from '@/i18n';

/** Legacy X37: klucz urządzenia "tour widziany". Nadal honorowany jako widziany. */
export const FIRST_WORKOUT_TOUR_KEY = 'fittracker_first_workout_tour_v1';
export const APP_TOUR_STORAGE_PREFIX = 'fittracker_app_tour_v2:';
export const PRACTICE_PATH = '/practice';

export type AppTourStage = 'dashboard' | 'practice' | 'tabs' | 'done';
export type AppTourOutcome = 'done' | 'skipped';

/** Kształt w users/{uid}.preferences.appTour (mapa w już dozwolonym `preferences`). */
export interface CloudAppTourState {
  status: AppTourOutcome;
  at: string;
}

export interface LocalAppTourState {
  stage: AppTourStage;
  /** Ostatni krok rozdziału zakładek (wznowienie po przerwaniu). */
  step?: AppTourStepId;
  outcome?: AppTourOutcome;
  /** Zakończenie jeszcze nie potwierdzone w chmurze (offline). */
  pendingSync?: boolean;
  /** Odtworzenie z Profilu: pomija warunek "0 ukończonych treningów". */
  replay?: boolean;
}

export type AppTourStepId =
  | 'welcome'
  | 'set-inputs'
  | 'set-check'
  | 'first-set-done'
  | 'exercise-menu'
  | 'finish'
  | 'send-email'
  | 'show-tabs'
  | 'tab-plan'
  | 'tab-history'
  | 'tab-progress'
  | 'tab-profile'
  | 'tabs-done';

export interface AppTourStep {
  id: AppTourStepId;
  /** Selektor celu spotlightu (atrybut data-tour); pusty = dymek na środku. */
  target: string;
  /** Klucz i18n jednego zdania w dymku. */
  textKey: TranslationKey;
  /** Krótki nagłówek. */
  titleKey?: TranslationKey;
  /** Etykieta głównego przycisku zamiast „Dalej”/„Gotowe”. */
  nextLabelKey?: TranslationKey;
  /** Wycięcie liczone z elementów wewnątrz celu (inputy wiersza serii). */
  highlightInner?: string;
  /** Cel bywa poza ekranem: przewiń przed pomiarem. */
  scrollIntoView?: boolean;
  /**
   * Krok czeka na AKCJĘ usera na celu (tap, realne odhaczenie serii).
   * Brak przycisku "Dalej", w dymku nieklikalna podpowiedź. Pomiń zawsze jest.
   */
  action?: 'tap' | 'complete-set' | 'email-sent';
  /** Krok-akcja z wyjściem „Pomiń ten krok” (np. mail): nie blokuje reszty. */
  stepSkippable?: boolean;
  /** Cel opcjonalny: brak celu = dymek na środku (np. timer wyłączony). */
  optionalTarget?: boolean;
  /** Zdanie, gdy opcjonalnego celu brak. */
  fallbackTextKey?: TranslationKey;
  /** Rozdział (licznik „k z n” liczony w rozdziale). */
  chunk?: 'first-set' | 'after-set' | 'after-workout' | 'tabs';
}

export const DASHBOARD_TOUR_STEPS: readonly AppTourStep[] = [
  {
    id: 'welcome',
    target: '',
    titleKey: 'tour.app.welcomeTitle',
    textKey: 'tour.app.welcome',
    nextLabelKey: 'tour.app.tryPractice',
  },
];

/**
 * Trening próbny: trzy porcje (pierwsza seria, po serii, po treningu), każda
 * max 3 kroki (limit rozdziału: 4).
 */
export const PRACTICE_TOUR_STEPS: readonly AppTourStep[] = [
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
    action: 'tap',
    chunk: 'after-set',
  },
  {
    // Podsumowanie mailem do trenera: w próbie wysyłka SYMULOWANA przez adapter.
    id: 'send-email',
    target: '[data-tour="practice-email"]',
    textKey: 'tour.app.emailStep',
    action: 'email-sent',
    stepSkippable: true,
    chunk: 'after-workout',
  },
  {
    id: 'show-tabs',
    target: '[data-tour="practice-show-tabs"]',
    textKey: 'tour.app.showTabs',
    action: 'tap',
    chunk: 'after-workout',
  },
];

/** Przegląd zakładek: tap w podświetloną zakładkę przenosi dalej. */
export const TABS_TOUR_STEPS: readonly AppTourStep[] = [
  { id: 'tab-plan', target: '[data-tour="nav-plan"]', textKey: 'tour.tabs.plan', action: 'tap', chunk: 'tabs' },
  { id: 'tab-history', target: '[data-tour="nav-history"]', textKey: 'tour.tabs.history', action: 'tap', chunk: 'tabs' },
  { id: 'tab-progress', target: '[data-tour="nav-progress"]', textKey: 'tour.tabs.progress', action: 'tap', chunk: 'tabs' },
  { id: 'tab-profile', target: '[data-tour="nav-profile"]', textKey: 'tour.tabs.profile', action: 'tap', chunk: 'tabs' },
  { id: 'tabs-done', target: '', titleKey: 'tour.tabs.doneTitle', textKey: 'tour.tabs.done' },
];

const localKey = (uid: string) => `${APP_TOUR_STORAGE_PREFIX}${uid}`;

const STAGES: readonly AppTourStage[] = ['dashboard', 'practice', 'tabs', 'done'];
/** Etapy v1 (build 152) prowadziły przez prawdziwą sesję: restart od początku. */
const LEGACY_STAGES = new Set(['workout', 'after-finish']);
const STEP_IDS = new Set<string>(
  [...DASHBOARD_TOUR_STEPS, ...PRACTICE_TOUR_STEPS, ...TABS_TOUR_STEPS].map((s) => s.id),
);

export const readLocalAppTour = (uid: string): LocalAppTourState | null => {
  if (!uid) return null;
  try {
    const raw = window.localStorage.getItem(localKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Record<keyof LocalAppTourState, unknown>> | null;
    if (!parsed) return null;
    const replay = parsed.replay === true ? { replay: true } : {};
    if (LEGACY_STAGES.has(parsed.stage as string)) return { stage: 'dashboard', ...replay };
    if (!STAGES.includes(parsed.stage as AppTourStage)) return null;
    return {
      stage: parsed.stage as AppTourStage,
      ...(typeof parsed.step === 'string' && STEP_IDS.has(parsed.step) ? { step: parsed.step as AppTourStepId } : {}),
      ...(parsed.outcome === 'done' || parsed.outcome === 'skipped' ? { outcome: parsed.outcome } : {}),
      ...(parsed.pendingSync === true ? { pendingSync: true } : {}),
      ...replay,
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
 * starego klucza). Replay z Profilu omija warunek treningów i flagi.
 * Rozpoczęty przewodnik (etap practice/tabs) trwa do końca.
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

/** Liczba odhaczonych serii (także rozgrzewkowych): wyzwalacz kroku "complete-set". */
export const countCheckedSets = (exerciseSets: Record<string, ReadonlyArray<{ completed?: boolean }>>): number =>
  Object.values(exerciseSets).reduce((sum, sets) => sum + sets.filter((s) => s.completed).length, 0);
