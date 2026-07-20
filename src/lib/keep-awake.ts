import { KeepAwake } from '@capacitor-community/keep-awake';
import { Capacitor } from '@capacitor/core';

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

/** Włącz blokadę, o ile user jej nie wyłączył. Fire-and-forget, web = no-op. */
export const keepScreenAwake = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform() || !isKeepAwakeEnabled()) return;
  try {
    await KeepAwake.keepAwake();
  } catch {
    // Plugin niedostępny — ekran gaśnie normalnie, nic się nie psuje.
  }
};

/**
 * Zwolnij blokadę. Wołane BEZWARUNKOWO przy wyjściu z treningu — także wtedy,
 * gdy user w międzyczasie wyłączył ustawienie, żeby nie zostawić zapalonego
 * ekranu na stałe.
 */
export const allowScreenSleep = async (): Promise<void> => {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await KeepAwake.allowSleep();
  } catch {
    // Nic do zwolnienia.
  }
};
