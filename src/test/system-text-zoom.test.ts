import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  applyPreferredTextZoom,
  installSystemTextZoom,
  type TextZoomAdapter,
} from '@/lib/system-text-zoom';

const adapter = (preferred: number): TextZoomAdapter => ({
  getPreferred: vi.fn(async () => ({ value: preferred })),
  set: vi.fn(async () => undefined),
});

describe('systemowy rozmiar tekstu w natywnym WebView', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-text-scale');
    document.documentElement.style.removeProperty('--app-text-scale');
    document.head.querySelector('meta[name="viewport"]')?.remove();
    const viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    document.head.appendChild(viewport);
  });

  it('iOS stosuje preferowaną skalę przez text-size-adjust bez zmniejszania jej do 100%', async () => {
    const textZoom = adapter(2);

    const result = await applyPreferredTextZoom({ platform: 'ios', textZoom });

    expect(result).toEqual({ applied: true, value: 2, bucket: '200' });
    expect(textZoom.set).not.toHaveBeenCalled();
    expect(document.documentElement.style.getPropertyValue('--app-text-scale')).toBe('200%');
    expect(document.documentElement.dataset.textScale).toBe('200');
  });

  it('Android przekazuje ustawienie systemowe do WebView przez oficjalny plugin', async () => {
    const textZoom = adapter(1.5);

    const result = await applyPreferredTextZoom({ platform: 'android', textZoom });

    expect(result).toEqual({ applied: true, value: 1.5, bucket: '150' });
    expect(textZoom.set).toHaveBeenCalledWith({ value: 1.5 });
    expect(document.documentElement.dataset.textScale).toBe('150');
  });

  it('stary przepływ native zachowuje blokadę pinch zoom i steruje tylko tekstem', async () => {
    const textZoom = adapter(1.5);

    await applyPreferredTextZoom({ platform: 'ios', textZoom });
    const viewport = document.head.querySelector<HTMLMetaElement>('meta[name="viewport"]');

    expect(viewport?.content).toContain('maximum-scale=1.0');
    expect(viewport?.content).toContain('user-scalable=no');
    expect(document.documentElement.style.getPropertyValue('--app-text-scale')).toBe('150%');
  });

  it('publiczny web przywraca zoom 200%, ale nie udaje natywnej preferencji', async () => {
    const textZoom = adapter(2);

    const result = await applyPreferredTextZoom({ platform: 'web', textZoom });
    const viewport = document.head.querySelector<HTMLMetaElement>('meta[name="viewport"]');

    expect(result).toEqual({ applied: false, value: 1, bucket: '100' });
    expect(textZoom.getPreferred).not.toHaveBeenCalled();
    expect(textZoom.set).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.textScale).toBeUndefined();
    expect(viewport?.content).toContain('width=device-width');
    expect(viewport?.content).toContain('viewport-fit=cover');
    expect(viewport?.content).not.toContain('maximum-scale');
    expect(viewport?.content).not.toContain('user-scalable');
  });

  it('odrzuca uszkodzoną wartość zamiast rozbić layout albo zmniejszyć tekst', async () => {
    const textZoom = adapter(Number.NaN);

    const result = await applyPreferredTextZoom({ platform: 'ios', textZoom });

    expect(result).toEqual({ applied: false, value: 1, bucket: '100' });
    expect(document.documentElement.dataset.textScale).toBeUndefined();
  });

  it('odświeża preferencję po powrocie z tła i pozwala odpiąć listener', async () => {
    const sync = vi.fn(async () => undefined);
    const state = { onChange: undefined as ((isActive: boolean) => void) | undefined };
    const remove = vi.fn();

    const uninstall = installSystemTextZoom({
      sync,
      addStateListener: (callback) => {
        state.onChange = callback;
        return remove;
      },
    });

    expect(sync).toHaveBeenCalledTimes(1);
    state.onChange?.(false);
    expect(sync).toHaveBeenCalledTimes(1);
    state.onChange?.(true);
    expect(sync).toHaveBeenCalledTimes(2);
    uninstall();
    expect(remove).toHaveBeenCalledOnce();
  });

  it('ma oficjalny plugin Capacitor 8 oraz wymagany tryb mobile na iPadzie', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    const config = readFileSync('capacitor.config.ts', 'utf8');

    expect(pkg.dependencies?.['@capacitor/text-zoom']).toBe('^8.0.1');
    expect(config).toContain("preferredContentMode: 'mobile'");
  });
});
