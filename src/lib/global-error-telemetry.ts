import { reportClientError } from '@/lib/error-telemetry';

// Z154: czarny ekran analityki nie zostawił ŻADNEGO śladu w client_errors —
// globalne błędy okna i odrzucone promisy nie były raportowane. Best-effort,
// raport tylko gdy uid znany (rules wymagają auth); limit sesyjny egzekwuje
// reportClientError.

let currentUid: string | undefined;
let initialized = false;

export const setGlobalErrorTelemetryUid = (uid: string | undefined): void => {
  currentUid = uid || undefined;
};

export const initGlobalErrorTelemetry = (): void => {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event) => {
    if (!currentUid) return;
    const message = event.error instanceof Error ? event.error.message : event.message;
    const where = event.filename ? ` @${event.filename}:${event.lineno ?? 0}` : '';
    void reportClientError(currentUid, {
      code: 'window-error',
      phase: 'other',
      detail: `${message}${where}`,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (!currentUid) return;
    const reason = (event as PromiseRejectionEvent).reason;
    const detail =
      reason instanceof Error ? `${reason.message} ${reason.stack?.split('\n')[1] ?? ''}`.trim() : String(reason);
    void reportClientError(currentUid, {
      code: 'unhandled-rejection',
      phase: 'other',
      detail,
    });
  });
};

export const __resetGlobalErrorTelemetryForTests = (): void => {
  currentUid = undefined;
};
