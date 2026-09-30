import { Capacitor, CapacitorHttp } from '@capacitor/core';
import publicKeyPem from '../../release/live-updates/public-key.pem?raw';
import { addAppStateListener } from '@/lib/app-lifecycle';
import { reportClientErrorWithCurrentUid } from '@/lib/global-error-telemetry';
import { currentHashPath } from '@/lib/live-update-activity';
import {
  createLiveUpdateController,
  type LiveUpdateController,
  type LiveUpdatePluginApi,
} from '@/lib/live-update-controller';
import { getNativeAppInfo } from '@/lib/live-update-version';

// Wiring OTA dla natywnej apki. Web (app.strengthsave.app) nigdy nie ładuje
// pluginu: aktualizuje się przez PWA/service worker jak dotąd.
//
// Hosting pakietów: domyślny bucket Firebase Storage projektu, publiczny odczyt
// ścieżki live-updates/** (storage.rules), zapis wyłącznie Admin (skrypt
// scripts/publish-live-update.mjs). Pobieranie natywnym stosem HTTP
// (CapacitorHttp, plugin OTA), więc bez CORS WKWebView.

const HTTP_TIMEOUT_MS = 10_000;

const storageBucket = (): string => String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '');

/** URL obiektu: domyślnie Firebase Storage REST (alt=media), albo jawny prefiks (test lokalny). */
export const liveUpdateObjectUrl = (path: string, base = import.meta.env.VITE_LIVE_UPDATE_BASE_URL): string => {
  if (base) return `${base.replace(/\/$/, '')}/${path}`;
  return `https://firebasestorage.googleapis.com/v0/b/${storageBucket()}/o/${encodeURIComponent(path)}?alt=media`;
};

const allowInsecureLocalhost = (): boolean => import.meta.env.VITE_LIVE_UPDATE_ALLOW_INSECURE_LOCALHOST === 'true';

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await CapacitorHttp.get({
    url,
    responseType: 'text',
    connectTimeout: HTTP_TIMEOUT_MS,
    readTimeout: HTTP_TIMEOUT_MS,
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (response.status < 200 || response.status >= 300) throw new Error(`manifest-http-${response.status}`);
  return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
};

const localStore = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // brak storage: OTA działa dalej, tylko bez pamięci między startami
    }
  },
};

let controller: LiveUpdateController | null = null;
let controllerPromise: Promise<LiveUpdateController | null> | null = null;

const loadController = (): Promise<LiveUpdateController | null> => {
  if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('LiveUpdate')) return Promise.resolve(null);
  const platform = Capacitor.getPlatform();
  if (platform !== 'ios' && platform !== 'android') return Promise.resolve(null);
  controllerPromise ??= import('@capawesome/capacitor-live-update')
    .then(({ LiveUpdate }) => {
      controller = createLiveUpdateController({
        platform,
        plugin: LiveUpdate as unknown as LiveUpdatePluginApi,
        nativeInfo: getNativeAppInfo,
        fetchJson,
        objectUrl: (path) => liveUpdateObjectUrl(path),
        publicKeyPem,
        allowInsecureLocalhost: allowInsecureLocalhost(),
        storage: localStore,
        // Dynamiczny import: moduł draftów nie trafia do chunka startowego.
        loadDrafts: async (uid) => (await import('@/lib/workout-draft-db')).workoutDraftDb.listDrafts(uid),
        currentPath: currentHashPath,
        isPluginAvailable: (name) => Capacitor.isPluginAvailable(name),
        report: (code, detail) => reportClientErrorWithCurrentUid({ code, phase: 'other', detail }),
        now: () => Date.now(),
        randomId: () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
        schedule: (fn, ms) => { globalThis.setTimeout(fn, ms); },
        log: (message) => console.info(`[LiveUpdate] ${message}`),
      });
      addAppStateListener((isActive) => {
        if (isActive) controller?.onForeground();
        else controller?.onBackground();
      });
      return controller;
    })
    .catch(() => null);
  return controllerPromise;
};

/** Powłoka aplikacji wyrenderowana bez błędu: zatrzymuje natywny timer rollbacku. */
export const markLiveUpdateReady = (): void => {
  void loadController().then((instance) => instance?.signalReady());
};

/** Znany stan logowania (null = wylogowany) — kanał, telemetria, bramka treningu. */
export const setLiveUpdateUser = (user: { uid: string; isAdmin: boolean } | null): void => {
  void loadController().then((instance) => instance?.setUser(user));
};

export const getLiveUpdateController = (): LiveUpdateController | null => controller;
