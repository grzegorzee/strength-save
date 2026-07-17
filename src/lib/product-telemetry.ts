import type { TelemetryEventName } from '@/lib/app-telemetry';

// Z94: telemetria produktowa (kto, kiedy, na jakim ekranie). Liczniki bez treści:
// zamknięta lista nazw (unia TelemetryEventName + whitelist w rules), zero
// clickstreamu i zero danych treningowych. Koszt bez zmian: istniejący bufor+flush.

const SESSION_ACTIVE_KEY_PREFIX = 'fittracker_session_active_v1';

// Whitelist tras -> klucz ekranu. Trasy spoza listy (admin, nieznane) nie są liczone.
const SCREEN_BY_PATH: Array<{ test: (path: string) => boolean; key: TelemetryEventName }> = [
  { test: (p) => p === '/', key: 'screen_dashboard' },
  { test: (p) => p === '/plan' || p === '/plan/edit', key: 'screen_plan' },
  { test: (p) => p === '/analytics', key: 'screen_analytics' },
  { test: (p) => p === '/exercises' || p.startsWith('/exercise/'), key: 'screen_exercises' },
  { test: (p) => p === '/profile', key: 'screen_profile' },
  { test: (p) => p === '/history', key: 'screen_history' },
  { test: (p) => p === '/measurements', key: 'screen_measurements' },
  { test: (p) => p === '/achievements', key: 'screen_achievements' },
  { test: (p) => p === '/cycles' || p.startsWith('/cycles/'), key: 'screen_cycles' },
  { test: (p) => p === '/settings', key: 'screen_settings' },
  { test: (p) => p.startsWith('/workout/'), key: 'screen_workout' },
];

export const screenKeyForPath = (path: string): TelemetryEventName | null => {
  const match = SCREEN_BY_PATH.find((entry) => entry.test(path));
  return match ? match.key : null;
};

export interface SessionActiveStore {
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
}

// session_active: raz dziennie na pierwsze otwarcie. Guard w localStorage
// przeżywa restarty apki (iOS ubija JS w tle) — bez niego licznik by się dublował.
export const shouldTrackSessionActive = (
  userId: string,
  dateKey: string,
  store: SessionActiveStore,
): boolean => {
  const key = `${SESSION_ACTIVE_KEY_PREFIX}_${userId}`;
  if (store.get(key) === dateKey) return false;
  store.set(key, dateKey);
  return true;
};
