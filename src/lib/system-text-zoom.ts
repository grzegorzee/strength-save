import { Capacitor } from '@capacitor/core';
import { TextZoom } from '@capacitor/text-zoom';
import { addAppStateListener } from '@/lib/app-lifecycle';

type NativePlatform = 'ios' | 'android' | 'web';
type TextScaleBucket = '100' | '150' | '200';

export type TextZoomAdapter = {
  getPreferred: () => Promise<{ value: number }>;
  set: (options: { value: number }) => Promise<void>;
};

type ApplyPreferredTextZoomOptions = {
  platform: NativePlatform;
  textZoom: TextZoomAdapter;
  root?: HTMLElement;
};

type TextZoomResult = {
  applied: boolean;
  value: number;
  bucket: TextScaleBucket;
};

const scaleBucket = (value: number): TextScaleBucket => {
  if (value >= 1.75) return '200';
  if (value >= 1.25) return '150';
  return '100';
};

const validPreferredScale = (value: number): boolean => (
  Number.isFinite(value) && value >= 0.8 && value <= 4
);

const enableWebViewportZoom = (root: HTMLElement): void => {
  const viewport = root.ownerDocument?.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!viewport) return;
  const content = viewport.content
    .split(',')
    .map((part) => part.trim())
    .filter((part) => !/^(maximum-scale|user-scalable)\s*=/i.test(part));
  viewport.content = content.join(', ');
};

/**
 * Stosuje ustawienie dostępności systemu bez dodawania kolejnej decyzji do UI.
 * Android ma natywne WebSettings.textZoom. iOS udostępnia z pluginu preferowaną
 * skalę UIFont, którą przekazujemy do mechanizmu tekstowego WKWebView. Nie
 * wymuszamy 100% i nie skalujemy odstępów całej aplikacji przez root font-size.
 */
export const applyPreferredTextZoom = async ({
  platform,
  textZoom,
  root = document.documentElement,
}: ApplyPreferredTextZoomOptions): Promise<TextZoomResult> => {
  if (platform === 'web') {
    // Natywne WebView zachowuje projektowy `zoomEnabled: false`, lecz ten sam
    // index.html jest publikowany jako web. Przeglądarka musi tam pozwalać na
    // powiększenie tekstu zamiast dziedziczyć ograniczenie natywnego shellu.
    enableWebViewportZoom(root);
    return { applied: false, value: 1, bucket: '100' };
  }

  try {
    const { value } = await textZoom.getPreferred();
    if (!validPreferredScale(value)) {
      return { applied: false, value: 1, bucket: '100' };
    }

    const bucket = scaleBucket(value);
    root.dataset.textScale = bucket;

    if (platform === 'android') {
      await textZoom.set({ value });
    } else {
      const percentage = `${Math.round(value * 100)}%`;
      root.style.setProperty('--app-text-scale', percentage);
    }

    return { applied: true, value, bucket };
  } catch {
    // Plugin nie może blokować uruchomienia aplikacji. Zachowujemy poprzednią
    // skutecznie zastosowaną skalę i ponawiamy przy następnym resume.
    return { applied: false, value: 1, bucket: '100' };
  }
};

export const syncSystemTextZoom = (): Promise<TextZoomResult> => applyPreferredTextZoom({
  platform: Capacitor.getPlatform() as NativePlatform,
  textZoom: TextZoom,
});

type InstallSystemTextZoomOptions = {
  sync?: () => Promise<unknown>;
  addStateListener?: (callback: (isActive: boolean) => void) => () => void;
};

/** Uruchamia synchronizację na cold start oraz po każdym foreground resume. */
export const installSystemTextZoom = ({
  sync = syncSystemTextZoom,
  addStateListener = addAppStateListener,
}: InstallSystemTextZoomOptions = {}): (() => void) => {
  void sync();
  return addStateListener((isActive) => {
    if (isActive) void sync();
  });
};
