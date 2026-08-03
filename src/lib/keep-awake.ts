import { KeepAwake } from '@capacitor-community/keep-awake';
import { Capacitor } from '@capacitor/core';
import { addAppStateListener } from '@/lib/app-lifecycle';
import { reportClientErrorWithCurrentUid } from '@/lib/global-error-telemetry';

/**
 * Blokada wygaszania ekranu na czas aktywnego treningu.
 *
 * POWÓD (test usera 2026-07-20): przy zgaszonym ekranie iOS wstrzymuje JS i sygnał
 * końca przerwy zostaje wyłącznie po stronie powiadomienia systemowego, które w
 * trybie ciszy lub skupienia jest nieme. Przy WŁĄCZONYM ekranie dźwięk działa
 * (potwierdzone przez usera), bo gra go sama apka.
 *
 * To NIE jest naprawa powiadomień — to obejście, które przy okazji jest standardem
 * w kategorii (Strong i Hevy mają taką opcję). Kosztuje baterię, więc user może je
 * wyłączyć, a apka zwalnia blokadę zawsze po wyjściu z treningu.
 */

const KEY = 'fittracker_keep_awake_v1';

export const isKeepAwakeEnabled = (): boolean => {
  try {
    return window.localStorage.getItem(KEY) !== 'false';
  } catch {
    return true;
  }
};

export const setKeepAwakeEnabled = (enabled: boolean): void => {
  try {
    window.localStorage.setItem(KEY, enabled ? 'true' : 'false');
  } catch { /* localStorage niedostępne — zostaje domyślka */ }
};

// Z177: samonaprawa. iOS potrafi zdjąć idle-timer po powrocie z tła, a blokada
// była zakładana raz per sesja — ekran gasł mimo włączonego ustawienia. Moduł
// pamięta, że blokada POWINNA trzymać (held) i ponawia ją przy każdym powrocie
// na pierwszy plan. allowScreenSleep zdejmuje intencję.
let held = false;
let resumeReapplyArmed = false;

const armResumeReapply = (): void => {
  if (resumeReapplyArmed) return;
  resumeReapplyArmed = true;
  addAppStateListener((isActive) => {
    if (isActive && held) void keepScreenAwake();
  });
};

/** Włącz blokadę, o ile user jej nie wyłączył. Fire-and-forget, web = no-op. */
export const keepScreenAwake = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || !isKeepAwakeEnabled()) return;
  armResumeReapply();
  try {
    await KeepAwake.keepAwake();
    held = true;
    // Z177: zaufaj, ale sprawdź — plugin bez wyjątku a blokada nie weszła
    // to dokładnie ta cisza, przez którą ekran gasł na siłowni.
    const check = await KeepAwake.isKeptAwake().catch(() => null);
    if (check && check.isKeptAwake === false) {
      reportClientErrorWithCurrentUid({ code: 'keep-awake-not-applied', phase: 'other' });
    }
  } catch (err) {
    reportClientErrorWithCurrentUid({
      code: 'keep-awake-error',
      phase: 'other',
      detail: err instanceof Error ? err.message : String(err),
    });
  }
};

/**
 * Zwolnij blokadę. Wołane BEZWARUNKOWO przy wyjściu z treningu — także wtedy,
 * gdy user w międzyczasie wyłączył ustawienie, żeby nie zostawić zapalonego
 * ekranu na stałe.
 */
export const allowScreenSleep = async (): Promise<void> => {
  held = false;
  if (!Capacitor.isNativePlatform()) return;
  try {
    await KeepAwake.allowSleep();
  } catch {
    // Nic do zwolnienia.
  }
};
