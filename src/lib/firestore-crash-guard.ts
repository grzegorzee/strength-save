// Po `INTERNAL ASSERTION FAILED` (np. b815 po resume WKWebView) instancja
// Firestore jest martwa do końca życia strony — każda kolejna operacja rzuca.
// Jedyne skuteczne wyjście to pełny reload. Draft treningu przeżywa
// (IndexedDB + fallback localStorage), więc reload jest bezpieczny.
export const RELOAD_GUARD_KEY = 'ss_firestore_crash_reload_at';
const RELOAD_WINDOW_MS = 2 * 60 * 1000;
const draftPreservers = new Set<() => void>();

export const isFirestoreInternalAssertion = (input: unknown): boolean => {
  const message = input instanceof Error ? input.message : typeof input === 'string' ? input : '';
  return /firestore/i.test(message) && /internal assertion failed/i.test(message);
};

export const registerFirestoreCrashDraftPreserver = (preserve: () => void): (() => void) => {
  draftPreservers.add(preserve);
  return () => draftPreservers.delete(preserve);
};

export const preserveFirestoreCrashDraft = (): void => {
  draftPreservers.forEach((preserve) => {
    try {
      preserve();
    } catch {
      // Jeden uszkodzony preserver nie może zablokować pozostałych ani reloadu.
    }
  });
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

export const installFirestoreCrashGuard = (reload: () => void): (() => void) => {
  const maybeReload = (candidate: unknown) => {
    if (!isFirestoreInternalAssertion(candidate)) return;
    if (!shouldAutoReload(Date.now())) return;
    preserveFirestoreCrashDraft();
    reload();
  };
  const onUnhandledRejection = (event: PromiseRejectionEvent) => maybeReload(event.reason);
  const onError = (event: ErrorEvent) => maybeReload(event.error ?? event.message);
  window.addEventListener('unhandledrejection', onUnhandledRejection);
  window.addEventListener('error', onError);
  return () => {
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
    window.removeEventListener('error', onError);
  };
};
