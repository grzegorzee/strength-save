// Z142: uczciwy czas trwania treningu. durationSec liczony do ostatniej realnej
// aktywności, nie do kliknięcia "Zakończ trening" — user, który zapisał trening
// 48h po wyjściu z siłowni, dostawał czas 48:08:47 (incydent 2026-07-24).
// Jedno źródło prawdy: używane przy finalizacji w workout-sync-engine ORAZ na
// kaflu "Czas" w podsumowaniu WorkoutDay.

/** Przerwa bez akcji dłuższa niż to = sesja porzucona (user zapomniał zakończyć). */
export const ABANDONED_SESSION_THRESHOLD_MS = 60 * 60 * 1000;
/** Bufor na odłożenie sprzętu po ostatniej zarejestrowanej akcji. */
export const SESSION_CLOSEOUT_BUFFER_MS = 3 * 60 * 1000;
/** Skrypt naprawczy traktuje >12h jako pewny outlier; nowych rekordów bez
 * durationSec nie tworzymy. Legacy fallback jest tylko prezentacją i nigdy nie
 * modyfikuje dokumentu użytkownika. */
export const LEGACY_DURATION_OUTLIER_SEC = 12 * 60 * 60;

export const computeLegacyTimestampDurationSec = (input: {
  startedAt: number | undefined;
  completedAt: number | undefined;
}): number | undefined => {
  const { startedAt, completedAt } = input;
  if (!Number.isFinite(startedAt) || !Number.isFinite(completedAt)) return undefined;
  const durationSec = Math.max(0, Math.floor(((completedAt as number) - (startedAt as number)) / 1000));
  return durationSec > LEGACY_DURATION_OUTLIER_SEC ? undefined : durationSec;
};

export const computeEffectiveDurationSec = (input: {
  startedAt: number | undefined;
  finalizedAt: number | undefined;
  lastActivityAt?: number;
}): number | undefined => {
  const { startedAt, finalizedAt, lastActivityAt } = input;
  if (!startedAt || !finalizedAt) return undefined;
  // Stare drafty bez lastActivityAt: zachowanie dotychczasowe (bez regresji).
  const effectiveEnd = lastActivityAt !== undefined
    && finalizedAt - lastActivityAt > ABANDONED_SESSION_THRESHOLD_MS
    ? lastActivityAt + SESSION_CLOSEOUT_BUFFER_MS
    : finalizedAt;
  return Math.max(0, Math.floor((effectiveEnd - startedAt) / 1000));
};
