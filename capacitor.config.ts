/// <reference types="@capacitor-firebase/authentication" />
/// <reference types="@capacitor-firebase/messaging" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grzegorzjasionowicz.strengthsave',
  appName: 'StrengthSave',
  webDir: 'dist',
  // Apka ma zachowywać się jak apka, nie jak strona: bez pinch-zoomu, który
  // rozjeżdżał layout i ucinał treść po bokach (incydent 2026-07-20).
  zoomEnabled: false,
  plugins: {
    FirebaseAuthentication: {
      // Native tworzy tylko credential; logowanie do Firebase robi JS SDK
      // (signInWithCredential), żeby stan auth był spójny z resztą apki (Firestore).
      skipNativeAuth: true,
      providers: ['google.com', 'apple.com'],
    },
    FirebaseMessaging: {
      // Z146: bez 'alert' — w foregroundzie prezentację przejmuje w całości
      // kontrolowany toast (PushRegistrar), znika podwójny banner. W tle
      // systemowy banner działa normalnie (presentationOptions dotyczy foregroundu).
      presentationOptions: ['badge', 'sound'],
    },
  },
};

export default config;
