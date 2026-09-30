import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createLiveUpdateController,
  RESUME_RELOAD_AFTER_MS,
  type LiveUpdateControllerDeps,
  type LiveUpdatePluginApi,
} from '@/lib/live-update-controller';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';
import { createTestKeyPair, makePayload, makeTarget, signEnvelope } from './live-update-test-keys';

// Atrapa natywnego pluginu z semantyką z @capawesome/capacitor-live-update 8.4.4:
// „następny” aktywuje się dopiero przy starcie/reload, ready() zwraca flagę rollbacku.
class FakeNativeLiveUpdate implements LiveUpdatePluginApi {
  current: string | null = null;
  next: string | null = null;
  downloaded: string[] = [];
  blocked: string[] = [];
  rollback: { previous: string | null } | null = null;
  downloadError: Error | null = null;
  calls: string[] = [];

  async ready() {
    this.calls.push('ready');
    if (this.rollback) {
      const previous = this.rollback.previous;
      this.rollback = null;
      if (previous) this.blocked.push(previous);
      return { currentBundleId: this.current, previousBundleId: previous, rollback: true };
    }
    return { currentBundleId: this.current, previousBundleId: null, rollback: false };
  }
  async getCurrentBundle() { return { bundleId: this.current }; }
  async getNextBundle() { return { bundleId: this.next }; }
  async getDownloadedBundles() { return { bundleIds: [...this.downloaded] }; }
  async getBlockedBundles() { return { bundleIds: [...this.blocked] }; }
  async downloadBundle(options: { bundleId: string }) {
    this.calls.push(`download:${options.bundleId}`);
    if (this.downloadError) throw this.downloadError;
    this.downloaded.push(options.bundleId);
  }
  async setNextBundle(options: { bundleId: string | null }) {
    this.calls.push(`setNext:${options.bundleId}`);
    this.next = options.bundleId;
  }
  async deleteBundle(options: { bundleId: string }) {
    this.calls.push(`delete:${options.bundleId}`);
    this.downloaded = this.downloaded.filter((id) => id !== options.bundleId);
  }
  async reload() {
    this.calls.push('reload');
    this.current = this.next;
  }
  /** Zimny start: Capacitor czyta serverBasePath = „następny”. */
  coldStart() { this.current = this.next; }
}

const memoryStorage = () => {
  const map = new Map<string, string>();
  return { get: (key: string) => map.get(key) ?? null, set: (key: string, value: string) => { map.set(key, value); }, map };
};

describe('kontroler OTA (sekwencje)', () => {
  let keys: Awaited<ReturnType<typeof createTestKeyPair>>;
  beforeAll(async () => { keys = await createTestKeyPair(); });

  const setup = (options: {
    plugin?: FakeNativeLiveUpdate;
    manifest?: unknown;
    drafts?: Partial<ActiveWorkoutDraft>[];
    path?: string;
    storage?: ReturnType<typeof memoryStorage>;
  } = {}) => {
    const plugin = options.plugin ?? new FakeNativeLiveUpdate();
    const state = {
      manifest: options.manifest as unknown,
      drafts: options.drafts ?? [],
      path: options.path ?? '/',
      now: 1_000_000_000,
      fetchError: false,
    };
    const reports: Array<{ code: string; detail: string }> = [];
    const storage = options.storage ?? memoryStorage();
    const deps: LiveUpdateControllerDeps = {
      platform: 'ios',
      plugin,
      nativeInfo: async () => ({ version: '1.0.1', build: '153' }),
      fetchJson: vi.fn(async () => {
        if (state.fetchError) throw new Error('offline');
        return state.manifest;
      }),
      objectUrl: (path) => `https://example.test/${path}`,
      publicKeyPem: keys.pem,
      allowInsecureLocalhost: false,
      storage,
      loadDrafts: async () => state.drafts as ActiveWorkoutDraft[],
      currentPath: () => state.path,
      isPluginAvailable: () => true,
      report: (code, detail) => reports.push({ code, detail }),
      now: () => state.now,
      randomId: () => 'install-1',
      schedule: () => undefined,
    };
    const controller = createLiveUpdateController(deps);
    return { controller, plugin, state, reports, deps, storage };
  };

  const manifestFor = (bundleId: string | null, sequence: number, extra: Record<string, unknown> = {}) => signEnvelope(
    keys.sign,
    makePayload({
      sequence,
      target: bundleId
        ? makeTarget({ bundleId, otaNumber: Number(bundleId.split('.').pop()), ...extra })
        : null,
    }),
  );

  it('A → publikacja B → pobranie w tle → B aktywny dopiero po restarcie; brak przeładowania w trakcie', async () => {
    const { controller, plugin } = setup({ manifest: await manifestFor('1.0.1-ota.2', 1) });
    await controller.signalReady();
    controller.setUser({ uid: 'u1', isAdmin: false });
    const outcome = await controller.evaluate('startup');
    expect(outcome.decision?.setNext).toBe('1.0.1-ota.2');
    expect(plugin.calls).toEqual(['ready', 'download:1.0.1-ota.2', 'setNext:1.0.1-ota.2']);
    expect(plugin.current).toBeNull();
    plugin.coldStart();
    expect(plugin.current).toBe('1.0.1-ota.2');
  });

  it('zepsuty C: natywny rollback do wbudowanego → kontroler wraca do B i przeładowuje; telemetria', async () => {
    const storage = memoryStorage();
    const plugin = new FakeNativeLiveUpdate();
    // Sesja 1: B działa i zgłasza gotowość (ostatni dobry = B).
    plugin.current = '1.0.1-ota.2';
    plugin.next = '1.0.1-ota.2';
    plugin.downloaded = ['1.0.1-ota.2'];
    const first = setup({ plugin, storage, manifest: await manifestFor('1.0.1-ota.3', 2) });
    await first.controller.signalReady();
    first.controller.setUser({ uid: 'u1', isAdmin: false });
    await first.controller.evaluate('startup');
    expect(plugin.next).toBe('1.0.1-ota.3');
    // Sesja 2: C startuje, nie woła ready() → natywny timer cofa do wbudowanego.
    plugin.coldStart();
    plugin.rollback = { previous: '1.0.1-ota.3' };
    plugin.current = null;
    plugin.next = null;
    plugin.calls = [];
    const second = setup({ plugin, storage, manifest: await manifestFor('1.0.1-ota.3', 2) });
    await second.controller.signalReady();
    second.controller.setUser({ uid: 'u1', isAdmin: false });
    await second.controller.evaluate('startup');
    expect(plugin.blocked).toContain('1.0.1-ota.3');
    expect(plugin.calls).toContain('setNext:1.0.1-ota.2');
    expect(plugin.calls).toContain('reload');
    expect(plugin.calls).not.toContain('download:1.0.1-ota.3');
    expect(plugin.current).toBe('1.0.1-ota.2');
    expect(second.reports).toContainEqual({ code: 'live-update-rollback', detail: '1.0.1-ota.3 -> builtin' });
  });

  it('aktywny trening: nowy pakiet pobrany, ale nieaktywowany; po treningu i długim tle przeładowanie', async () => {
    const plugin = new FakeNativeLiveUpdate();
    const now = 1_000_000_000;
    const liveDraft = { completedLocally: false, finalSyncPending: false, updatedAt: now - 60_000, startedAt: now - 600_000 };
    const { controller, state } = setup({ plugin, manifest: await manifestFor('1.0.1-ota.2', 1), drafts: [liveDraft] });
    await controller.signalReady();
    controller.setUser({ uid: 'u1', isAdmin: false });
    await controller.evaluate('startup');
    expect(plugin.downloaded).toContain('1.0.1-ota.2');
    expect(plugin.next).toBeNull();
    expect(plugin.calls).not.toContain('reload');

    // Koniec treningu (zsynchronizowany), zejście do tła na 11 min, powrót.
    state.drafts = [{ ...liveDraft, completedLocally: true }];
    controller.onBackground();
    await controller.evaluate('background');
    state.now += RESUME_RELOAD_AFTER_MS + 60_000;
    controller.onForeground();
    await vi.waitFor(() => expect(plugin.calls).toContain('reload'));
    expect(plugin.current).toBe('1.0.1-ota.2');
  });

  it('trening zaczęty po ustawieniu „następnego”: zejście do tła przypina bieżący (zimny start nie podmieni kodu)', async () => {
    const plugin = new FakeNativeLiveUpdate();
    const { controller, state } = setup({ plugin, manifest: await manifestFor('1.0.1-ota.2', 1) });
    await controller.signalReady();
    controller.setUser({ uid: 'u1', isAdmin: false });
    await controller.evaluate('startup');
    expect(plugin.next).toBe('1.0.1-ota.2');
    state.path = '/workout/day-1';
    controller.onBackground();
    await vi.waitFor(() => expect(plugin.next).toBeNull());
    plugin.coldStart();
    expect(plugin.current).toBeNull();
  });

  it('uszkodzony manifest: brak jakichkolwiek zmian w pluginie + telemetria', async () => {
    const { controller, plugin, reports } = setup({ manifest: { payload: '{"schema":1}', signature: 'AAAA' } });
    await controller.signalReady();
    controller.setUser({ uid: 'u1', isAdmin: false });
    await controller.evaluate('startup');
    expect(plugin.calls).toEqual(['ready']);
    expect(reports.map((entry) => entry.code)).toEqual(['live-update-manifest-invalid']);
  });

  it('podpis pakietu odrzucony natywnie: telemetria; błąd sieci: cicho', async () => {
    const plugin = new FakeNativeLiveUpdate();
    plugin.downloadError = new Error('Signature verification failed.');
    const first = setup({ plugin, manifest: await manifestFor('1.0.1-ota.2', 1) });
    await first.controller.signalReady();
    first.controller.setUser({ uid: 'u1', isAdmin: false });
    await first.controller.evaluate('startup');
    expect(first.reports.map((entry) => entry.code)).toEqual(['live-update-bundle-rejected']);
    expect(plugin.next).toBeNull();

    const quiet = new FakeNativeLiveUpdate();
    quiet.downloadError = new Error('Bundle could not be downloaded.');
    const second = setup({ plugin: quiet, manifest: await manifestFor('1.0.1-ota.2', 1) });
    await second.controller.signalReady();
    second.controller.setUser({ uid: 'u1', isAdmin: false });
    await second.controller.evaluate('startup');
    expect(second.reports).toEqual([]);
  });

  it('brak sieci: nic się nie zmienia', async () => {
    const { controller, plugin, state } = setup({ manifest: await manifestFor('1.0.1-ota.2', 1) });
    state.fetchError = true;
    await controller.signalReady();
    controller.setUser({ uid: 'u1', isAdmin: false });
    await controller.evaluate('startup');
    expect(plugin.calls).toEqual(['ready']);
  });

  it('ręczny rollback kanałem: nowszy manifest wskazujący starszy pakiet jest przyjmowany', async () => {
    const plugin = new FakeNativeLiveUpdate();
    plugin.current = '1.0.1-ota.3';
    plugin.next = '1.0.1-ota.3';
    plugin.downloaded = ['1.0.1-ota.2', '1.0.1-ota.3'];
    const { controller } = setup({ plugin, manifest: await manifestFor('1.0.1-ota.2', 7) });
    await controller.signalReady();
    controller.setUser({ uid: 'u1', isAdmin: false });
    await controller.evaluate('startup');
    expect(plugin.next).toBe('1.0.1-ota.2');
  });

  it('manifest starszy niż ostatnio widziany (replay) jest odrzucany', async () => {
    const storage = memoryStorage();
    const first = setup({ storage, manifest: await manifestFor('1.0.1-ota.3', 9) });
    await first.controller.signalReady();
    first.controller.setUser({ uid: 'u1', isAdmin: false });
    await first.controller.evaluate('startup');
    const second = setup({ storage, manifest: await manifestFor('1.0.1-ota.2', 8) });
    await second.controller.signalReady();
    second.controller.setUser({ uid: 'u1', isAdmin: false });
    await second.controller.evaluate('startup');
    expect(second.reports).toContainEqual({ code: 'live-update-manifest-invalid', detail: 'stale-sequence' });
  });

  it('kanał: admin i tester (7 dotknięć) → internal, reszta → production', async () => {
    const { controller, deps } = setup({ manifest: await manifestFor('1.0.1-ota.2', 1) });
    controller.setUser({ uid: 'u1', isAdmin: false });
    expect(controller.getChannel()).toBe('production');
    controller.setUser({ uid: 'u1', isAdmin: true });
    expect(controller.getChannel()).toBe('internal');
    controller.setUser({ uid: 'u2', isAdmin: false });
    controller.setTesterChannel(true);
    expect(controller.getChannel()).toBe('internal');
    await controller.signalReady();
    await controller.evaluate('manual');
    expect(vi.mocked(deps.fetchJson)).toHaveBeenLastCalledWith(
      'https://example.test/live-updates/internal/ios/1.0.1/manifest.json',
    );
  });

  it('telemetria sprzed zalogowania czeka na uid (reguła client_errors wymaga auth)', async () => {
    const plugin = new FakeNativeLiveUpdate();
    plugin.rollback = { previous: '1.0.1-ota.3' };
    const { controller, reports } = setup({ plugin, manifest: await manifestFor('1.0.1-ota.2', 1) });
    await controller.signalReady();
    expect(reports).toEqual([]);
    controller.setUser({ uid: 'u1', isAdmin: false });
    expect(reports.map((entry) => entry.code)).toEqual(['live-update-rollback']);
  });
});
