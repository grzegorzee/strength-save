import type { LiveUpdateTarget, ManifestVerification } from '@/lib/live-update-manifest';
import { parseOtaBundleId } from '@/lib/live-update-version';

// Czysta decyzja OTA (bez pluginu, sieci i storage). Kontroler wykonuje skutki.
// Niezmienniki:
//  1. Pakiet aktywuje się tylko na tej samej wersji natywnej i buildzie >= minNativeBuild,
//     gdy wszystkie wymagane pluginy natywne są dostępne.
//  2. Zablokowany (po rollbacku) pakiet nigdy nie wraca jako cel.
//  3. Uszkodzony / niedostępny manifest = brak zmian (poza powrotem na ostatni
//     dobry pakiet po rollbacku).
//  4. Aktywny trening: żadnej aktywacji; „następny” pakiet przypięty do bieżącego.

export type BundleRef = string | null; // null = bundle wbudowany w binarkę

export interface LiveUpdateDecisionInput {
  native: { version: string; build: number };
  manifest: ManifestVerification | { status: 'unavailable' };
  current: BundleRef;
  next: BundleRef;
  downloaded: string[];
  blocked: string[];
  lastGood: BundleRef | undefined;
  rollbackJustHappened: boolean;
  /** Powrót z tła po >= 10 min: bezpieczny moment na przeładowanie do nowego pakietu. */
  resumeAfterLongBackground: boolean;
  isPluginAvailable: (name: string) => boolean;
  rolloutBucket: (bundleId: string) => number;
  trainingActive: boolean;
}

export type DesiredBundle = { kind: 'keep' } | { kind: 'bundle'; bundleId: BundleRef };

export interface LiveUpdateDecision {
  desired: DesiredBundle;
  /** Pakiet do pobrania przed ustawieniem jako następny. */
  download: LiveUpdateTarget | null;
  /** Co ustawić jako „następny” (null = wbudowany), albo 'unchanged'. */
  setNext: BundleRef | 'unchanged';
  /** Przeładować od razu (po automatycznym rollbacku albo po długim tle; nigdy w treningu). */
  reloadNow: boolean;
  /** Kody telemetrii do client_errors. */
  reports: Array<{ code: string; detail: string }>;
  reason: string;
}

export const isBundleCompatible = (
  bundleId: string,
  native: { version: string },
): boolean => parseOtaBundleId(bundleId)?.nativeVersion === native.version;

export const incompatibilityReason = (
  target: LiveUpdateTarget,
  native: { version: string; build: number },
  isPluginAvailable: (name: string) => boolean,
): string | null => {
  if (!isBundleCompatible(target.bundleId, native)) return 'native-version';
  if (native.build < target.minNativeBuild) return `native-build<${target.minNativeBuild}`;
  const missing = target.requiredPlugins.filter((name) => !isPluginAvailable(name));
  if (missing.length) return `missing-plugins:${missing.join(',')}`;
  return null;
};

const usableLocal = (
  bundleId: BundleRef | undefined,
  input: Pick<LiveUpdateDecisionInput, 'downloaded' | 'blocked' | 'native'>,
): BundleRef | undefined => {
  if (bundleId === undefined) return undefined;
  if (bundleId === null) return null;
  if (!input.downloaded.includes(bundleId) || input.blocked.includes(bundleId)) return undefined;
  return isBundleCompatible(bundleId, input.native) ? bundleId : undefined;
};

const resolveDesired = (input: LiveUpdateDecisionInput): {
  desired: DesiredBundle;
  download: LiveUpdateTarget | null;
  reports: LiveUpdateDecision['reports'];
  reason: string;
} => {
  const reports: LiveUpdateDecision['reports'] = [];
  const afterRollback = (): DesiredBundle => {
    const fallback = input.rollbackJustHappened ? usableLocal(input.lastGood, input) : undefined;
    return fallback === undefined ? { kind: 'keep' } : { kind: 'bundle', bundleId: fallback };
  };

  if (input.manifest.status === 'unavailable') {
    return { desired: afterRollback(), download: null, reports, reason: 'manifest-unavailable' };
  }
  if (input.manifest.status === 'invalid') {
    reports.push({ code: 'live-update-manifest-invalid', detail: input.manifest.reason });
    return { desired: afterRollback(), download: null, reports, reason: `manifest-invalid:${input.manifest.reason}` };
  }

  const target = input.manifest.payload.target;
  if (target === null) {
    return { desired: { kind: 'bundle', bundleId: null }, download: null, reports, reason: 'kill-switch-builtin' };
  }
  if (input.blocked.includes(target.bundleId)) {
    return { desired: afterRollback(), download: null, reports, reason: 'target-blocked' };
  }
  const incompatible = incompatibilityReason(target, input.native, input.isPluginAvailable);
  if (incompatible) {
    reports.push({ code: 'live-update-incompatible', detail: `${target.bundleId} ${incompatible}` });
    return { desired: afterRollback(), download: null, reports, reason: `incompatible:${incompatible}` };
  }
  if (target.bundleId !== input.current && input.rolloutBucket(target.bundleId) >= target.rolloutPercent) {
    return { desired: afterRollback(), download: null, reports, reason: 'outside-rollout' };
  }
  const needsDownload = !input.downloaded.includes(target.bundleId);
  return {
    desired: { kind: 'bundle', bundleId: target.bundleId },
    download: needsDownload ? target : null,
    reports,
    reason: needsDownload ? 'download-target' : 'target-ready',
  };
};

export const decideLiveUpdate = (input: LiveUpdateDecisionInput): LiveUpdateDecision => {
  const { desired, download, reports, reason } = resolveDesired(input);

  // Aktywny trening: nic nie może się aktywować. Pobieranie w tle wolno
  // (nie dotyka WebView), ale „następny” zostaje przypięty do bieżącego,
  // na wypadek zimnego startu w trakcie treningu.
  if (input.trainingActive) {
    return {
      desired,
      download,
      setNext: input.next !== input.current ? input.current : 'unchanged',
      reloadNow: false,
      reports,
      reason: `${reason}|training-active`,
    };
  }

  if (desired.kind === 'keep') {
    return { desired, download, setNext: 'unchanged', reloadNow: false, reports, reason };
  }

  const target = desired.bundleId;
  // Pobranie musi się udać, zanim pakiet zostanie „następnym”; kontroler
  // ponawia decyzję po pobraniu.
  if (download) {
    return { desired, download, setNext: 'unchanged', reloadNow: false, reports, reason };
  }
  return {
    desired,
    download: null,
    setNext: input.next !== target ? target : 'unchanged',
    reloadNow: (input.rollbackJustHappened || input.resumeAfterLongBackground) && target !== input.current,
    reports,
    reason,
  };
};

/** Deterministyczny kubełek 0..99 dla stopniowego rolloutu (FNV-1a instalacja+pakiet). */
export const rolloutBucketFor = (installId: string, bundleId: string): number => {
  let hash = 0x811c9dc5;
  const text = `${installId}:${bundleId}`;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 100;
};

/** Lista pakietów do usunięcia z urządzenia (wszystko poza bieżącym, następnym, ostatnim dobrym i celem). */
export const bundlesToDelete = (
  downloaded: string[],
  keep: Array<BundleRef | undefined>,
): string[] => downloaded.filter((bundleId) => !keep.includes(bundleId));
