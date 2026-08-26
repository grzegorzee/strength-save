// WP-C (X37): odliczanie serii na czas (plank, hollow hold, farmer's hold).
//
// Logika czysta, bez Reactu. Zrodlem prawdy jest DEADLINE (Date.now() + cel),
// nie liczba tikow: iOS wstrzymuje JS w WKWebView po zgaszeniu ekranu, wiec po
// powrocie z tla reszta liczy sie z zegara, a sygnal na deadline dostarcza
// system (local notification, rest-notification.ts). Wzorzec jak rest-timer.ts.

export type TrainingLevelKey = 'beginner' | 'intermediate' | 'advanced';

/** Domyslny cel serii czasowej wg poziomu z onboardingu (RESEARCH X37, sekcja 3). */
export const SET_COUNTDOWN_DEFAULT_SEC: Record<TrainingLevelKey, number> = {
  beginner: 30,
  intermediate: 45,
  advanced: 60,
};

/** Poziom nieznany (brak profilu, stara wersja onboardingu) = srodek skali. */
export const SET_COUNTDOWN_FALLBACK_SEC = 45;

const isLevelKey = (level: string): level is TrainingLevelKey =>
  Object.prototype.hasOwnProperty.call(SET_COUNTDOWN_DEFAULT_SEC, level);

export const defaultSetDurationForLevel = (level?: string | null): number => {
  if (!level || !isLevelKey(level)) return SET_COUNTDOWN_FALLBACK_SEC;
  return SET_COUNTDOWN_DEFAULT_SEC[level];
};

export interface SetCountdownTargetInput {
  /** Wartosc wpisana w polu czasu serii (0 / undefined = puste). */
  valueSec?: number;
  /** Cel czasu z silnika progresji (weeklyTarget.targetDurationSec). */
  weeklyTargetSec?: number | null;
  /** Ostatni wynik tej serii roboczej (kolumna POPRZ.). */
  previousSec?: number;
  /** Sekundy z zapisu planu ("3 x 45s" -> 45). */
  planSec?: number | null;
  /** profile.trainingProfile.level z onboardingu. */
  level?: string | null;
}

const positive = (value?: number | null): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

/**
 * Cel odliczania. Kaskada: pole > cel tygodnia > ostatni wynik > plan > poziom.
 * Cel tygodnia przed historia, zeby odliczanie nie klocilo sie z target boxem
 * karty ("Cel tygodnia: 0:35" i odliczanie do 0:35).
 */
export const resolveSetCountdownTarget = (input: SetCountdownTargetInput): number =>
  positive(input.valueSec)
  ?? positive(input.weeklyTargetSec)
  ?? positive(input.previousSec)
  ?? positive(input.planSec)
  ?? defaultSetDurationForLevel(input.level);

export interface SetCountdownRun {
  /** Moment konca odliczania (ms epoch). Jedyne zrodlo prawdy o czasie. */
  deadlineAt: number;
  /** Pelny cel w sekundach (do zapisu durationSec przy dojechaniu do zera). */
  totalSeconds: number;
}

export const createSetCountdown = (targetSec: number, now: number = Date.now()): SetCountdownRun => ({
  deadlineAt: now + targetSec * 1000,
  totalSeconds: targetSec,
});

/** Pozostale sekundy, zaokraglone w gore (0:01 az do samego deadline), nigdy ujemne. */
export const countdownRemaining = (run: SetCountdownRun, now: number = Date.now()): number =>
  Math.max(0, Math.ceil((run.deadlineAt - now) / 1000));

/** Uplyniety czas od startu (stop w trakcie = zapis tej wartosci), w granicach 0..cel. */
export const countdownElapsed = (run: SetCountdownRun, now: number = Date.now()): number => {
  const startedAt = run.deadlineAt - run.totalSeconds * 1000;
  const elapsed = Math.round((now - startedAt) / 1000);
  return Math.min(run.totalSeconds, Math.max(0, elapsed));
};

export const isCountdownFinished = (run: SetCountdownRun, now: number = Date.now()): boolean =>
  now >= run.deadlineAt;

/** Sekundy -> "m:ss" (0 -> "0:00"; formatDurationSec z set-tracking zwraca dla 0 pusty string). */
export const formatCountdown = (sec: number): string => {
  const total = Math.max(0, Math.floor(sec));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
