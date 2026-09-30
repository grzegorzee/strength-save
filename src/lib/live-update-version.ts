import { Capacitor } from '@capacitor/core';

// Identyfikator pakietu OTA: `<wersja natywna>-ota.<N>`, np. 1.0.1-ota.3.
// N rośnie monotonicznie per wersja natywna (decyzja właściciela 2026-09-30).
// Pakiet aktywuje się wyłącznie na buildach o tej samej wersji natywnej.

export const OTA_BUNDLE_ID_PATTERN = /^((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*))-ota\.([1-9]\d*)$/;

export interface ParsedOtaBundleId {
  nativeVersion: string;
  otaNumber: number;
}

export const parseOtaBundleId = (bundleId: string | null | undefined): ParsedOtaBundleId | null => {
  const match = OTA_BUNDLE_ID_PATTERN.exec(String(bundleId ?? ''));
  if (!match) return null;
  const otaNumber = Number(match[5]);
  if (!Number.isSafeInteger(otaNumber)) return null;
  return { nativeVersion: match[1], otaNumber };
};

export const formatOtaBundleId = (nativeVersion: string, otaNumber: number): string => (
  `${nativeVersion}-ota.${otaNumber}`
);

// Identyfikator OTA wbudowany w ten bundle JS podczas `publish-live-update`.
// Pusty w buildach sklepowych i webowych (bundle wbudowany w binarkę).
export const currentOtaBundleId = (): string | null => {
  const baked = typeof __OTA_ID__ === 'string' ? __OTA_ID__ : '';
  return parseOtaBundleId(baked) ? baked : null;
};

export interface NativeAppInfo {
  version: string;
  build: string;
}

let nativeInfoPromise: Promise<NativeAppInfo | null> | null = null;
let nativeInfoCache: NativeAppInfo | null = null;

/** Wersja i build binarki (CFBundleShortVersionString/CFBundleVersion, versionName/versionCode). */
export const getNativeAppInfo = (): Promise<NativeAppInfo | null> => {
  try {
    if (!Capacitor.isNativePlatform()) return Promise.resolve(null);
  } catch {
    return Promise.resolve(null);
  }
  nativeInfoPromise ??= import('@capacitor/app')
    .then(({ App }) => App.getInfo())
    .then((info) => {
      nativeInfoCache = { version: String(info.version), build: String(info.build) };
      return nativeInfoCache;
    })
    .catch(() => {
      nativeInfoPromise = null;
      return null;
    });
  return nativeInfoPromise;
};

export const getCachedNativeAppInfo = (): NativeAppInfo | null => nativeInfoCache;

/**
 * Etykieta wersji w Profilu: „1.0.1 (153) · aktualizacja 3” (PL) / „1.0.1 (153) · update 3” (EN).
 * Bez aktualizacji OTA: „1.0.1 (153)”. Web (brak natywnej binarki): sama wersja.
 */
export const formatAppVersionLabel = (
  input: { version: string; native: NativeAppInfo | null; otaBundleId: string | null },
  suffix: (otaNumber: number) => string,
): string => {
  if (!input.native) return input.version;
  const base = `${input.native.version} (${input.native.build})`;
  const ota = parseOtaBundleId(input.otaBundleId);
  if (!ota || ota.nativeVersion !== input.native.version) return base;
  return `${base} · ${suffix(ota.otaNumber)}`;
};

/**
 * Wersja do telemetrii client_errors (reguła: string ≤ 32 znaki, bez zmian kontraktu):
 * natywnie „1.0.1-ota.3 (153)” albo „1.0.1 (153)”, na webie „1.0.1”.
 */
export const telemetryAppVersion = (
  input: { version: string; native: NativeAppInfo | null; otaBundleId: string | null },
): string => {
  if (!input.native) return input.version.slice(0, 32);
  const ota = parseOtaBundleId(input.otaBundleId);
  const id = ota && ota.nativeVersion === input.native.version ? input.otaBundleId : input.native.version;
  return `${id} (${input.native.build})`.slice(0, 32);
};

export const __resetNativeAppInfoForTests = (): void => {
  nativeInfoPromise = null;
  nativeInfoCache = null;
};
