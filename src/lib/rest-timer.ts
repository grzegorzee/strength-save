// Silnik timera przerwy (X17C Z135): czysta logika, zero zależności od Reacta.
//
// REGUŁA 1 z CLAUDE.md: iOS WSTRZYMUJE JavaScript w WKWebView po zgaszeniu ekranu.
// Nic opartego o odliczane ticki nie przetrwa kieszeni. Dlatego stanem jest DEADLINE
// (znacznik czasu), a pozostały czas liczy się zawsze jako `deadline - now`.
// `setInterval` służy WYŁĄCZNIE do animowania paska, gdy apka jest na wierzchu, i
// nigdy nie jest źródłem prawdy o tym, ile czasu zostało.
//
// Sygnał końca przy zgaszonym ekranie dostarcza system (local notification,
// `rest-notification.ts`), nie ten moduł.

export interface RestTimerState {
  /** Epoch ms końca przerwy. `null` = brak aktywnej przerwy (pominięta/zakończona). */
  deadlineAt: number | null;
  /** Pełna długość bieżącej przerwy w sekundach — potrzebna tylko do paska postępu. */
  totalSeconds: number;
}

export const startRest = (nowMs: number, seconds: number): RestTimerState => ({
  deadlineAt: nowMs + seconds * 1000,
  totalSeconds: seconds,
});

export const skipRest = (): RestTimerState => ({ deadlineAt: null, totalSeconds: 0 });

export const remainingSeconds = (state: RestTimerState, nowMs: number): number => {
  if (state.deadlineAt === null) return 0;
  return Math.max(0, Math.ceil((state.deadlineAt - nowMs) / 1000));
};

export const isFinished = (state: RestTimerState, nowMs: number): boolean =>
  remainingSeconds(state, nowMs) === 0;

/**
 * Przesuwa deadline o `deltaSeconds` (+15 / −15). `totalSeconds` idzie za zmianą,
 * żeby pasek postępu nie kłamał po wydłużeniu przerwy.
 */
export const adjustRest = (state: RestTimerState, deltaSeconds: number, nowMs: number): RestTimerState => {
  if (state.deadlineAt === null) return state;
  const nextDeadline = state.deadlineAt + deltaSeconds * 1000;
  // Skrócenie poniżej „teraz" kończy przerwę — nigdy ujemny czas.
  if (nextDeadline <= nowMs) return { deadlineAt: nowMs, totalSeconds: state.totalSeconds };
  return {
    deadlineAt: nextDeadline,
    totalSeconds: Math.max(1, state.totalSeconds + deltaSeconds),
  };
};

/** Postęp przerwy 0..1 (0 = start, 1 = koniec). Brak przerwy = 1 (nic nie odliczamy). */
export const restProgress = (state: RestTimerState, nowMs: number): number => {
  if (state.deadlineAt === null || state.totalSeconds <= 0) return 1;
  const left = (state.deadlineAt - nowMs) / 1000;
  const done = (state.totalSeconds - left) / state.totalSeconds;
  return Math.min(1, Math.max(0, done));
};

// ── Ustawienia czasów przerw (Z135.2) ──

export interface RestSettings {
  /** Domyślna przerwa po serii ROBOCZEJ. */
  workingSeconds: number;
  /** Domyślna przerwa po serii ROZGRZEWKOWEJ — najczęstsza skarga zaawansowanych
   *  na Hevy to jeden czas dla wszystkiego. */
  warmupSeconds: number;
  /** Nadpisanie per ćwiczenie (klucz = kanoniczna nazwa). Wzorzec Strong. */
  perExercise: Record<string, number>;
}

export const REST_SETTINGS_STORAGE_KEY = 'fittracker_rest_settings_v1';
/** Klucz z czasów sprzed X17C — migrowany na `workingSeconds`. */
const LEGACY_DEFAULT_KEY = 'rest-timer-default';

export const DEFAULT_REST_SETTINGS: RestSettings = {
  workingSeconds: 90,
  warmupSeconds: 45,
  perExercise: {},
};

const positiveOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;

export const loadRestSettings = (): RestSettings => {
  try {
    const raw = window.localStorage.getItem(REST_SETTINGS_STORAGE_KEY);
    if (!raw) {
      // Migracja: user mógł mieć ustawiony stary pojedynczy czas.
      const legacy = parseInt(window.localStorage.getItem(LEGACY_DEFAULT_KEY) ?? '', 10);
      return {
        ...DEFAULT_REST_SETTINGS,
        workingSeconds: positiveOr(legacy, DEFAULT_REST_SETTINGS.workingSeconds),
      };
    }
    const parsed = JSON.parse(raw) as Partial<RestSettings>;
    const perExercise = parsed.perExercise && typeof parsed.perExercise === 'object'
      ? Object.fromEntries(
        Object.entries(parsed.perExercise).filter(([, v]) => typeof v === 'number' && v > 0),
      )
      : {};
    return {
      workingSeconds: positiveOr(parsed.workingSeconds, DEFAULT_REST_SETTINGS.workingSeconds),
      warmupSeconds: positiveOr(parsed.warmupSeconds, DEFAULT_REST_SETTINGS.warmupSeconds),
      perExercise,
    };
  } catch {
    return { ...DEFAULT_REST_SETTINGS, perExercise: {} };
  }
};

export const saveRestSettings = (settings: RestSettings): void => {
  try {
    window.localStorage.setItem(REST_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch { /* localStorage niedostępne — ignoruj */ }
};

/**
 * Ile ma trwać przerwa po TEJ serii. Rozgrzewka ma własny czas i NIE podlega
 * nadpisaniu per ćwiczenie — nadpisanie dotyczy pracy, nie rozgrzewki.
 */
export const resolveRestSeconds = (
  settings: RestSettings,
  set: { isWarmup?: boolean; exerciseKey?: string },
): number => {
  if (set.isWarmup) return settings.warmupSeconds;
  const override = set.exerciseKey ? settings.perExercise[set.exerciseKey] : undefined;
  return positiveOr(override, settings.workingSeconds);
};
