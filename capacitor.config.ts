/// <reference types="@capacitor-firebase/authentication" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grzegorzjasionowicz.strengthsave',
  appName: 'StrengthSave',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      // Native tworzy tylko credential; logowanie do Firebase robi JS SDK
      // (signInWithCredential), żeby stan auth był spójny z resztą apki (Firestore).
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
};

export default config;
