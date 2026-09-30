/// <reference types="@capacitor-firebase/authentication" />
/// <reference types="@capacitor-firebase/app-check" />
/// <reference types="@capacitor-firebase/messaging" />
/// <reference types="@capawesome/capacitor-live-update" />
import { readFileSync } from 'node:fs';
import type { CapacitorConfig } from '@capacitor/cli';

// Klucz PUBLICZNY OTA (prywatny: ~/FIRMA/_secrets/projekty/strength_save-live-update/,
// nigdy w repo). Jedna linia bez \n: iOS usuwa nagłówki PEM i \n przed base64
// (LiveUpdate.swift verifySignatureForFile), Android tak samo (createPublicKeyFromString).
const liveUpdatePublicKey = readFileSync('release/live-updates/public-key.txt', 'utf8')
  .replace(/\r?\n/g, '')
  .trim();

const config: CapacitorConfig = {
  appId: 'com.grzegorzjasionowicz.strengthsave',
  appName: 'Strength Save',
  webDir: 'dist',
  ios: {
    // Oficjalny wymóg @capacitor/text-zoom na iPadzie. Nie blokujemy preferencji
    // Larger Text przez desktopowy content mode WKWebView.
    preferredContentMode: 'mobile',
  },
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
    SystemBars: {
      // Capacitor 8: StatusBar steruje tylko gora, a Android 15+ wymusza
      // edge-to-edge. SystemBars ustawia jasne ikony rowniez na pasku nawigacji.
      style: 'DARK',
      insetsHandling: 'css',
    },
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
    LiveUpdate: {
      // OTA self-host (docs/LIVE-UPDATES.md): żadnej chmury Capawesome. Bez appId
      // i ze strategią 'none' plugin nie wykonuje własnych zapytań sieciowych;
      // pakiety pobiera kontroler (src/lib/live-update-controller.ts) z naszego bucketu.
      autoUpdateStrategy: 'none',
      // Pakiet, który nie zgłosi gotowości w 20 s, wraca do bundla wbudowanego
      // i zostaje zablokowany na tym urządzeniu.
      readyTimeout: 20000,
      autoBlockRolledBackBundles: true,
      // Kasowaniem steruje kontroler (zostawia ostatni dobry pakiet do powrotu).
      autoDeleteBundles: false,
      // Z kluczem publicznym plugin WYMAGA podpisu ZIP i odrzuca pakiet bez niego.
      publicKey: liveUpdatePublicKey,
      httpTimeout: 60000,
    },
    Keyboard: {
      // Z159: ŻADNEJ zmiany globalnego layoutu — resize webview wywróciłby fixed
      // bottom bary WorkoutDay (reguła 5). Klawiaturę kompensują same dialogi
      // przez CSS var --keyboard-inset (keyboard-inset.ts).
      resize: 'none',
      // Capacitor 8.0.4+: obszar odsłaniany za klawiaturą bierze kolor z DOM,
      // więc natywny arkusz cardio nie dostaje jasnej/czarnej szczeliny przy
      // animacji klawiatury i zachowuje tło aktualnego motywu.
      autoBackdropColor: 'dom',
    },
  },
};

export default config;
