import { initializeApp } from "firebase/app";
import { Capacitor } from "@capacitor/core";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  initializeAuth,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { shouldUseFirebaseEmulators } from "@/lib/firebase-emulator-runtime";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
// Persistent cache (IndexedDB): zimny start offline serwuje plan/treningi/profil
// z cache, a zapisy (setDoc/updateDoc) czekają w kolejce mutacji do odzyskania sieci.
// Transakcje (runTransaction) nadal wymagają sieci — offline łapie je istniejący
// fallback provisional/sync-queue w WorkoutDay. Gdy IndexedDB niedostępne,
// SDK sam spada do cache w pamięci (tylko warning w konsoli).
export const db = initializeFirestore(app, {
  // Native force quit może zostawić stary renderer WebView żywy o kilka sekund
  // dłużej niż Activity. Tryb single-tab traci wtedy wyłączny lock IndexedDB i
  // spada do pustego cache w pamięci przy natychmiastowym cold launchu.
  // Multi-tab przejmuje lease bez odrzucania trwałego cache profilu i planu.
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
export const storage = getStorage(app);
// initializeAuth z jawną konfiguracją zamiast getAuth.
// Native (Capacitor/WKWebView, capacitor://localhost):
//   - getAuth auto-detekcja wiesza inicjalizację → onAuthStateChanged nigdy nie strzela.
//   - popupRedirectResolver tworzy cross-origin iframe (firebaseapp.com), który również
//     wiesza Auth w WebView — pomijamy go (signInWithPopup i tak nie działa w WebView,
//     na natywnej platformie używamy logowania e-mail/hasłem).
// Web: pełna konfiguracja z resolverem, żeby Google signInWithPopup działał.
export const auth = Capacitor.isNativePlatform()
  ? initializeAuth(app, {
      persistence: [browserLocalPersistence],
    })
  : initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
export const functions = getFunctions(app, "us-central1");

// App Check dla WEBA (reCAPTCHA Enterprise): rejestracja nowych kont wymaga
// tokenu App Check z atestowanej aplikacji (canCreateUserProfile w functions).
// Native ma własny App Check (App Attest/Play Integrity, native-callable.ts) —
// tu inicjalizujemy wyłącznie przeglądarkowy provider. Init nie może blokować
// startu: offline/e2e/brak klucza = apka działa jak dotąd (token po prostu
// nie zostanie dołączony, a callable odpowie jak dla braku atestacji).
const appCheckSiteKey = import.meta.env.VITE_APPCHECK_RECAPTCHA_SITE_KEY;

// Bug 35 (X30): pierwsze syncUserProfile na webie wyścigało się z powyższym
// asynchronicznym initem (SDK functions zwraca brak tokenu, dopóki komponent
// app-check nie jest zarejestrowany) — nowe konto dostawało permission-denied.
// Chronione callables (protected-callable.ts) czekają na appCheckReady; własny
// limit czasu gwarantuje, że zablokowany skrypt reCAPTCHA (adblock, sieć
// korporacyjna) nie wstrzymuje logowania w nieskończoność.
const APP_CHECK_READY_TIMEOUT_MS = 4000;
let resolveAppCheckReady: () => void = () => undefined;
export const appCheckReady: Promise<void> = new Promise((resolve) => {
  resolveAppCheckReady = resolve;
});

if (
  !Capacitor.isNativePlatform()
  && import.meta.env.VITE_E2E_MODE !== "true"
  && import.meta.env.VITE_USE_EMULATORS !== "true"
  && typeof window !== "undefined"
  && appCheckSiteKey
) {
  const readyFallback = setTimeout(resolveAppCheckReady, APP_CHECK_READY_TIMEOUT_MS);
  import("firebase/app-check")
    .then(({ initializeAppCheck, ReCaptchaEnterpriseProvider }) => {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
    })
    .catch(() => {
      // Brak sieci / zablokowany skrypt reCAPTCHA: świadomie cicho — patrz komentarz wyżej.
    })
    .finally(() => {
      clearTimeout(readyFallback);
      resolveAppCheckReady();
    });
} else {
  // Native (własny App Check w native-callable) / e2e / emulatory / brak klucza:
  // nie ma na co czekać.
  resolveAppCheckReady();
}

// e2e:emulator — podłącz SDK do lokalnych emulatorów zamiast produkcji.
// Porty zgodne z firebase.json (firestore na 8081, bo 8080 zajmuje vite dev server).
const runtimeHostname = typeof window === "undefined" ? "" : window.location.hostname;
const runtimeSearch = typeof window === "undefined" ? "" : window.location.search;
if (shouldUseFirebaseEmulators(
  import.meta.env.VITE_USE_EMULATORS === "true",
  runtimeHostname,
  runtimeSearch,
  Capacitor.isNativePlatform(),
)) {
  connectFirestoreEmulator(db, "127.0.0.1", 8081);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export const googleProvider = new GoogleAuthProvider();
export const appleProvider = (() => {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return provider;
})();
