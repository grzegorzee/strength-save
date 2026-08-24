/// <reference types="@capacitor-firebase/authentication" />
/// <reference types="@capacitor-firebase/app-check" />
/// <reference types="@capacitor-firebase/messaging" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.grzegorzjasionowicz.strengthsave',
  appName: 'Strength Save',
  webDir: 'dist',
  experimental: {
    ios: {
      spm: {
        // App Check i Firebase iOS SDK maja te sama tozsamosc pakietu SwiftPM.
        // Symlink jest oficjalnym obejściem pluginu dla Capacitor CLI 8.4+.
        packageOptions: {
          '@capacitor-firebase/app-check': {
            symlink: true,
          },
        },
      },
    },
  },
  // Apka ma zachowywać się jak apka, nie jak strona: bez pinch-zoomu, który
  // rozjeżdżał layout i ucinał treść po bokach (incydent 2026-07-20).
  zoomEnabled: false,
  // X29 WP-F: jeden kolor startu na WSZYSTKICH warstwach — storyboard
  // (LaunchScreen #0E0E0E) = SplashScreen plugin = tło WKWebView = theme-color
  // (index.html) = --background dark (index.css). Top-level backgroundColor
  // maluje webview PRZED pierwszym paintem — bez czarnej szczeliny
  // UIColor.systemBackground po hide splasha.
  backgroundColor: '#0e0e0e',
  plugins: {
    SplashScreen: {
      // Zgłoszenie 2026-08-13: splash znikał po ~0.5 s i user oglądał czarną
      // szczelinę do wstania weba. Splash z logo zostaje aż React wstanie —
      // chowa go hideNativeSplashWhenReady() (src/lib/native-splash.ts).
      launchAutoHide: false,
      backgroundColor: '#0e0e0e',
      showSpinner: false,
    },
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
    Keyboard: {
      // Z159: ŻADNEJ zmiany globalnego layoutu — resize webview wywróciłby fixed
      // bottom bary WorkoutDay (reguła 5). Klawiaturę kompensują same dialogi
      // przez CSS var --keyboard-inset (keyboard-inset.ts).
      resize: 'none',
    },
  },
};

export default config;
