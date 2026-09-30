import {
  manifestObjectPath,
  verifyManifestEnvelope,
  type LiveUpdateChannel,
  type LiveUpdatePlatform,
  type ManifestVerification,
} from '@/lib/live-update-manifest';
import { isTrainingActive, type LiveUpdateUserState } from '@/lib/live-update-activity';
import {
  bundlesToDelete,
  decideLiveUpdate,
  rolloutBucketFor,
  type BundleRef,
  type LiveUpdateDecision,
} from '@/lib/live-update-policy';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

// Kontroler OTA: jedyne miejsce, które woła natywny plugin. Wszystkie zależności
// wstrzykiwane (testy bez natywnej warstwy). Best-effort: nigdy nie rzuca do UI,
// nie blokuje startu (sprawdzenie po starcie, w tle, z timeoutem).

export interface LiveUpdatePluginApi {
  ready(): Promise<{ currentBundleId: string | null; previousBundleId: string | null; rollback: boolean }>;
  getCurrentBundle(): Promise<{ bundleId: string | null }>;
  getNextBundle(): Promise<{ bundleId: string | null }>;
  getDownloadedBundles(): Promise<{ bundleIds: string[] }>;
  getBlockedBundles(): Promise<{ bundleIds: string[] }>;
  downloadBundle(options: { url: string; bundleId: string; checksum: string; signature: string }): Promise<void>;
  setNextBundle(options: { bundleId: string | null }): Promise<void>;
  deleteBundle(options: { bundleId: string }): Promise<void>;
  reload(): Promise<void>;
}

export interface LiveUpdateStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export interface LiveUpdateControllerDeps {
  platform: LiveUpdatePlatform;
  plugin: LiveUpdatePluginApi;
  nativeInfo: () => Promise<{ version: string; build: string } | null>;
  fetchJson: (url: string) => Promise<unknown>;
  objectUrl: (path: string) => string;
  publicKeyPem: string;
  allowInsecureLocalhost: boolean;
  storage: LiveUpdateStorage;
  loadDrafts: (uid: string) => Promise<ActiveWorkoutDraft[]>;
  currentPath: () => string;
  isPluginAvailable: (name: string) => boolean;
  report: (code: string, detail: string) => void;
  now: () => number;
  randomId: () => string;
  schedule: (fn: () => void, ms: number) => void;
  /** Diagnostyka (konsola natywna: Xcode/logcat); bez danych osobowych. */
  log?: (message: string) => void;
}

export const STARTUP_CHECK_DELAY_MS = 4_000;
export const USER_WAIT_TIMEOUT_MS = 15_000;
export const RESUME_RELOAD_AFTER_MS = 10 * 60 * 1000;
export const MANIFEST_REFRESH_MS = 30 * 60 * 1000;

const KEY = {
  installId: 'ss_live_update_v1:install-id',
  channelOverride: 'ss_live_update_v1:channel-override',
  lastChannel: 'ss_live_update_v1:last-channel',
  lastGood: (version: string, build: string) => `ss_live_update_v1:last-good:${version}:${build}`,
  sequence: (channel: string, platform: string, version: string) => `ss_live_update_v1:sequence:${channel}:${platform}:${version}`,
};

const BUILTIN = '__builtin__';
const REJECTED_BUNDLE = /signature|checksum|index\.html|public key/i;

export type EvaluateTrigger = 'startup' | 'user' | 'resume' | 'background' | 'manual';

export interface EvaluateOutcome {
  ran: boolean;
  decision?: LiveUpdateDecision;
  trainingActive?: boolean;
  error?: string;
}

export const createLiveUpdateController = (deps: LiveUpdateControllerDeps) => {
  let readyState: { rollback: boolean; previousBundleId: string | null; currentBundleId: string | null } | null = null;
  let rollbackPending = false;
  let user: LiveUpdateUserState = undefined;
  let isAdmin = false;
  let inFlight: Promise<EvaluateOutcome> | null = null;
  let backgroundAt: number | null = null;
  let lastManifest: { key: string; at: number; result: ManifestVerification } | null = null;
  let startupEvaluated = false;
  const queuedReports: Array<{ code: string; detail: string }> = [];

  const report = (code: string, detail: string) => {
    // client_errors wymaga zalogowanego usera: raporty sprzed logowania czekają.
    if (user && typeof user === 'object') deps.report(code, detail);
    else queuedReports.push({ code, detail });
  };

  const flushReports = () => {
    if (!user || typeof user !== 'object') return;
    while (queuedReports.length) {
      const next = queuedReports.shift()!;
      deps.report(next.code, next.detail);
    }
  };

  const installId = (): string => {
    const existing = deps.storage.get(KEY.installId);
    if (existing) return existing;
    const created = deps.randomId();
    deps.storage.set(KEY.installId, created);
    return created;
  };

  const channel = (): LiveUpdateChannel => {
    if (deps.storage.get(KEY.channelOverride) === 'internal') return 'internal';
    if (user && typeof user === 'object') return isAdmin ? 'internal' : 'production';
    // Przed rozpoznaniem usera: ostatni znany kanał tego urządzenia.
    return deps.storage.get(KEY.lastChannel) === 'internal' ? 'internal' : 'production';
  };

  const readLastGood = (version: string, build: string): BundleRef | undefined => {
    const raw = deps.storage.get(KEY.lastGood(version, build));
    if (raw === null) return undefined;
    return raw === BUILTIN ? null : raw;
  };

  const loadManifest = async (
    ch: LiveUpdateChannel,
    native: { version: string },
    force: boolean,
  ): Promise<ManifestVerification | { status: 'unavailable' }> => {
    const cacheKey = `${ch}:${deps.platform}:${native.version}`;
    const sequenceKey = KEY.sequence(ch, deps.platform, native.version);
    const now = deps.now();
    if (!force && lastManifest?.key === cacheKey && now - lastManifest.at < MANIFEST_REFRESH_MS) {
      return lastManifest.result;
    }
    let envelope: unknown;
    try {
      envelope = await deps.fetchJson(deps.objectUrl(manifestObjectPath(ch, deps.platform, native.version)));
    } catch {
      return { status: 'unavailable' };
    }
    const minSequence = Number(deps.storage.get(sequenceKey) ?? '0') || 0;
    const result = await verifyManifestEnvelope(envelope, deps.publicKeyPem, {
      channel: ch,
      platform: deps.platform,
      nativeVersion: native.version,
      minSequence,
      allowInsecureLocalhost: deps.allowInsecureLocalhost,
    });
    if (result.status === 'ok') deps.storage.set(sequenceKey, String(result.payload.sequence));
    lastManifest = { key: cacheKey, at: now, result };
    return result;
  };

  const readTrainingActive = async (): Promise<boolean> => {
    let drafts: ActiveWorkoutDraft[] | 'error' = [];
    if (user && typeof user === 'object') {
      try {
        drafts = await deps.loadDrafts(user.uid);
      } catch {
        drafts = 'error';
      }
    }
    return isTrainingActive({ user, drafts, currentPath: deps.currentPath(), now: deps.now() });
  };

  const run = async (trigger: EvaluateTrigger, resumeAfterLongBackground: boolean): Promise<EvaluateOutcome> => {
    const nativeRaw = await deps.nativeInfo();
    if (!nativeRaw) return { ran: false, error: 'no-native-info' };
    const build = Number(nativeRaw.build);
    if (!Number.isSafeInteger(build)) return { ran: false, error: 'native-build' };
    const native = { version: nativeRaw.version, build };

    const [current, next, downloaded, blocked] = await Promise.all([
      deps.plugin.getCurrentBundle().then((r) => r.bundleId ?? null),
      deps.plugin.getNextBundle().then((r) => r.bundleId ?? null),
      deps.plugin.getDownloadedBundles().then((r) => r.bundleIds ?? []),
      deps.plugin.getBlockedBundles().then((r) => r.bundleIds ?? []).catch(() => [] as string[]),
    ]);
    const trainingActive = await readTrainingActive();
    const manifest = trigger === 'background'
      ? (lastManifest?.result ?? { status: 'unavailable' as const })
      : await loadManifest(channel(), native, trigger === 'manual');
    const id = installId();
    const decide = (downloadedNow: string[]) => decideLiveUpdate({
      native,
      manifest,
      current,
      next,
      downloaded: downloadedNow,
      blocked,
      lastGood: readLastGood(native.version, nativeRaw.build),
      rollbackJustHappened: rollbackPending,
      resumeAfterLongBackground,
      isPluginAvailable: deps.isPluginAvailable,
      rolloutBucket: (bundleId) => rolloutBucketFor(id, bundleId),
      trainingActive,
    });

    let decision = decide(downloaded);
    decision.reports.forEach((entry) => report(entry.code, entry.detail));
    let downloadedNow = downloaded;
    if (decision.download && trigger !== 'background') {
      const target = decision.download;
      try {
        await deps.plugin.downloadBundle({
          url: target.url,
          bundleId: target.bundleId,
          checksum: target.sha256,
          signature: target.signature,
        });
        downloadedNow = [...downloaded, target.bundleId];
        decision = decide(downloadedNow);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Sieć (timeout, przerwane pobieranie) = cicho, ponowimy przy następnym
        // wznowieniu. Odrzucenie treści (podpis/checksum) = alarm w telemetrii.
        if (REJECTED_BUNDLE.test(message)) report('live-update-bundle-rejected', `${target.bundleId} ${message}`);
        return { ran: true, decision, trainingActive, error: message };
      }
    }

    if (decision.setNext !== 'unchanged') {
      await deps.plugin.setNextBundle({ bundleId: decision.setNext });
    }
    if (!trainingActive && trigger !== 'background') {
      rollbackPending = false;
      const keep: Array<BundleRef | undefined> = [
        current,
        decision.setNext === 'unchanged' ? next : decision.setNext,
        readLastGood(native.version, nativeRaw.build),
        decision.desired.kind === 'bundle' ? decision.desired.bundleId : undefined,
      ];
      for (const bundleId of bundlesToDelete(downloadedNow, keep)) {
        await deps.plugin.deleteBundle({ bundleId }).catch(() => undefined);
      }
    }
    deps.log?.(`${trigger} current=${current ?? 'builtin'} next=${next ?? 'builtin'} -> setNext=${decision.setNext ?? 'builtin'} download=${decision.download?.bundleId ?? '-'} reload=${decision.reloadNow} training=${trainingActive} reason=${decision.reason}`);
    if (decision.reloadNow) {
      await deps.plugin.reload();
    }
    return { ran: true, decision, trainingActive };
  };

  const evaluate = (trigger: EvaluateTrigger, resumeAfterLongBackground = false): Promise<EvaluateOutcome> => {
    if (inFlight) return inFlight;
    inFlight = run(trigger, resumeAfterLongBackground)
      .catch((error: unknown) => ({ ran: false, error: error instanceof Error ? error.message : String(error) }))
      .finally(() => { inFlight = null; });
    return inFlight;
  };

  const startupEvaluate = () => {
    if (startupEvaluated || !readyState) return;
    startupEvaluated = true;
    void evaluate('startup');
  };

  return {
    /** Wywołać, gdy powłoka aplikacji wyrenderowała się bez błędu (zatrzymuje natywny rollback). */
    async signalReady(): Promise<void> {
      if (readyState) return;
      try {
        const result = await deps.plugin.ready();
        readyState = result;
        deps.log?.(`ready current=${result.currentBundleId ?? 'builtin'} previous=${result.previousBundleId ?? '-'} rollback=${result.rollback}`);
        const nativeRaw = await deps.nativeInfo();
        if (result.rollback) {
          rollbackPending = true;
          report('live-update-rollback', `${result.previousBundleId ?? 'builtin'} -> ${result.currentBundleId ?? 'builtin'}`);
        } else if (nativeRaw) {
          deps.storage.set(KEY.lastGood(nativeRaw.version, nativeRaw.build), result.currentBundleId ?? BUILTIN);
        }
      } catch {
        return;
      }
      if (user !== undefined) deps.schedule(startupEvaluate, STARTUP_CHECK_DELAY_MS);
      else deps.schedule(startupEvaluate, USER_WAIT_TIMEOUT_MS);
    },

    setUser(next: { uid: string; isAdmin: boolean } | null): void {
      const known = user !== undefined;
      user = next ? { uid: next.uid } : null;
      isAdmin = !!next?.isAdmin;
      if (next) deps.storage.set(KEY.lastChannel, channel());
      flushReports();
      if (!known && readyState) deps.schedule(startupEvaluate, STARTUP_CHECK_DELAY_MS);
    },

    onBackground(): void {
      backgroundAt = deps.now();
      if (readyState) void evaluate('background');
    },

    onForeground(): void {
      const away = backgroundAt === null ? 0 : deps.now() - backgroundAt;
      backgroundAt = null;
      if (readyState) void evaluate('resume', away >= RESUME_RELOAD_AFTER_MS);
    },

    evaluate,

    getChannel: channel,

    setTesterChannel(enabled: boolean): void {
      deps.storage.set(KEY.channelOverride, enabled ? 'internal' : 'production');
      lastManifest = null;
    },

    isTesterChannel(): boolean {
      return deps.storage.get(KEY.channelOverride) === 'internal';
    },
  };
};

export type LiveUpdateController = ReturnType<typeof createLiveUpdateController>;
