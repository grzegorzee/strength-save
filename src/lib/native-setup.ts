import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Konfiguracja natywnego UI (iOS/Android). Na web nie robi nic.
 * overlay:false sprawia, że WebView zaczyna się POD status barem — treść nie
 * jest już przykrywana przez zegar/baterię (problem widoczny np. na WorkoutDay).
 * Apka używa ciemnego motywu glassmorphism (#0a0a1a), więc status bar ma jasny
 * tekst (Style.Dark = light content) i ciemne tło.
 */
export async function setupNativeUI(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0a0a1a' });
    }
  } catch (error) {
    console.warn('Native UI setup failed:', error);
  }
}
