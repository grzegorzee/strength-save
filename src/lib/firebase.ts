import { initializeApp } from "firebase/app";
import { Capacitor } from "@capacitor/core";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  OAuthProvider,
} from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
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
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = (() => {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  return provider;
})();
