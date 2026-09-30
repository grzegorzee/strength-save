/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;
/** Identyfikator pakietu OTA (np. 1.0.1-ota.3) wbudowany przez publish-live-update; pusty w buildzie sklepowym/webowym. */
declare const __OTA_ID__: string;

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FEATURE_WORKOUT_TIMERS?: string;
  readonly VITE_FEATURE_INTERVAL_TIMERS?: string;
  readonly VITE_REVENUECAT_APPLE_API_KEY?: string;
  readonly VITE_REVENUECAT_GOOGLE_API_KEY?: string;
  readonly VITE_LIVE_UPDATE_BASE_URL?: string;
  readonly VITE_LIVE_UPDATE_ALLOW_INSECURE_LOCALHOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
