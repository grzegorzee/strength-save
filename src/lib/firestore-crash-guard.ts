// Po `INTERNAL ASSERTION FAILED` (np. b815 po resume WKWebView) instancja
// Firestore jest martwa do końca życia strony — każda kolejna operacja rzuca.
// Jedyne skuteczne wyjście to pełny reload. Draft treningu przeżywa
// (IndexedDB + fallback localStorage), więc reload jest bezpieczny.
export const RELOAD_GUARD_KEY = 'ss_firestore_crash_reload_at';
const RELOAD_WINDOW_MS = 2 * 60 * 1000;

export const isFirestoreInternalAssertion = (input: unknown): boolean => {
  const message = input instanceof Error ? input.message : typeof input === 'string' ? input : '';
  return message.includes('INTERNAL ASSERTION FAILED');
};

/** true = wolno przeładować (i zapisuje znacznik); anti-loop na wypadek crash-przy-starcie. */
export const shouldAutoReload = (nowMs: number): boolean => {
  try {
    const last = Number(localStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
    if (Number.isFinite(last) && nowMs - last < RELOAD_WINDOW_MS) return false;
    localStorage.setItem(RELOAD_GUARD_KEY, String(nowMs));
    return true;
  } catch {
    return false; // brak localStorage = nie ryzykuj pętli reloadów
  }
};

export const installFirestoreCrashGuard = (reload: () => void): void => {
  const maybeReload = (candidate: unknown) => {
    if (!isFirestoreInternalAssertion(candidate)) return;
    if (!shouldAutoReload(Date.now())) return;
    reload();
  };
  window.addEventListener('unhandledrejection', (event) => maybeReload(event.reason));
  window.addEventListener('error', (event) => maybeReload(event.error ?? event.message));
};
