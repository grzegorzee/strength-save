import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { PaletteThemePicker } from '@/components/PaletteThemePicker';
import {
  PALETTE_THEMES,
  applyPaletteTheme,
  applyStoredAccent,
  clearStoredPaletteTheme,
  isPaletteThemeV2,
  readStoredPaletteTheme,
  selectLegacyAccent,
  storePaletteTheme,
} from '@/lib/palette-theme';
import { pl } from '@/i18n/locales/pl';
import { en } from '@/i18n/locales/en';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  document.documentElement.style.cssText = '';
  delete document.documentElement.dataset.accent;
  delete document.documentElement.dataset.palette;
});

describe('PaletteThemeV2: addytywna migracja i runtime', () => {
  const luminance = (hex: string): number => {
    const values = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
      .map((channel) => channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
  };
  const contrast = (a: string, b: string): number => {
    const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (lighter + 0.05) / (darker + 0.05);
  };

  it('ma trzy wersjonowane presety z trzema odrębnymi rolami', () => {
    expect(PALETTE_THEMES).toEqual([
      { version: 2, id: 'pulse', source: 'preset', primary: '#c6ff00', supportA: '#22d3ee', supportB: '#a78bfa' },
      { version: 2, id: 'forge', source: 'preset', primary: '#ff6b35', supportA: '#fbbf24', supportB: '#fb7185' },
      { version: 2, id: 'glacier', source: 'preset', primary: '#38bdf8', supportA: '#818cf8', supportB: '#2dd4bf' },
    ]);
    for (const palette of PALETTE_THEMES) {
      expect(new Set([palette.primary, palette.supportA, palette.supportB]).size).toBe(3);
      expect(isPaletteThemeV2(palette)).toBe(true);
    }
  });

  it('opisuje motywy literalnymi kolorami zamiast marketingowymi cechami', () => {
    expect([
      pl['palette.pulse.description'],
      pl['palette.forge.description'],
      pl['palette.glacier.description'],
    ]).toEqual([
      'Limonka, cyjan i fiolet.',
      'Pomarańcz, bursztyn i róż.',
      'Błękit, indygo i turkus.',
    ]);
    expect([
      en['palette.pulse.description'],
      en['palette.forge.description'],
      en['palette.glacier.description'],
    ]).toEqual([
      'Lime, cyan, and violet.',
      'Orange, amber, and rose.',
      'Sky blue, indigo, and teal.',
    ]);
  });

  it('każda rola ma bezpieczny kontrast tekstu i granicy na ciemnym UI', () => {
    for (const palette of PALETTE_THEMES) {
      for (const hex of [palette.primary, palette.supportA, palette.supportB]) {
        expect(contrast(hex, '#000000'), `${palette.id} ${hex} tekst`).toBeGreaterThanOrEqual(4.5);
        expect(contrast(hex, '#0a0a0a'), `${palette.id} ${hex} non-text`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('pełna paleta przeżywa cold start i nie dotyka kolorów statusowych', () => {
    const root = document.documentElement;
    storePaletteTheme(PALETTE_THEMES[1]);
    applyStoredAccent();

    expect(readStoredPaletteTheme()?.id).toBe('forge');
    expect(localStorage.getItem('ss-accent-color')).toBe('#ff6b35');
    expect(root.dataset.palette).toBe('forge');
    expect(root.style.getPropertyValue('--primary')).not.toBe('');
    expect(root.style.getPropertyValue('--palette-support-a')).not.toBe('');
    expect(root.style.getPropertyValue('--palette-support-b')).not.toBe('');
    expect(root.style.getPropertyValue('--chart-1')).toBe(root.style.getPropertyValue('--palette-primary'));
    expect(root.style.getPropertyValue('--chart-2')).toBe(root.style.getPropertyValue('--palette-support-a'));
    expect(root.style.getPropertyValue('--chart-3')).toBe(root.style.getPropertyValue('--palette-support-b'));
    expect(root.style.getPropertyValue('--fitness-success')).toBe('');
    expect(root.style.getPropertyValue('--fitness-warning')).toBe('');
    expect(root.style.getPropertyValue('--destructive')).toBe('');
    expect(root.style.getPropertyValue('--secondary')).toBe('');
    expect(root.style.getPropertyValue('--background')).toBe('');
  });

  it('wybór legacy po palecie usuwa wyłącznie runtime/cache V2 i zachowuje stary wygląd', () => {
    storePaletteTheme(PALETTE_THEMES[2]);
    applyPaletteTheme(PALETTE_THEMES[2]);
    selectLegacyAccent('rose');

    expect(readStoredPaletteTheme()).toBeNull();
    expect(localStorage.getItem('ss-accent-color')).toBe('rose');
    expect(document.documentElement.dataset.accent).toBe('rose');
    expect(document.documentElement.dataset.palette).toBeUndefined();
    expect(document.documentElement.style.getPropertyValue('--palette-support-a')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--chart-1')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--chart-2')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--chart-3')).toBe('');
  });

  it('nie ufa niepełnym ani nieprawidłowym obiektom z chmury/cache', () => {
    expect(isPaletteThemeV2({ version: 1, id: 'pulse' })).toBe(false);
    expect(isPaletteThemeV2({
      version: 2, id: 'pulse', source: 'avatar', primary: '#c6ff00', supportA: '#22d3ee', supportB: '#a78bfa',
    })).toBe(false);
    expect(isPaletteThemeV2({
      version: 2, id: 'pulse', source: 'preset', primary: '#bad', supportA: '#22d3ee', supportB: '#a78bfa',
    })).toBe(false);
    expect(isPaletteThemeV2({
      version: 2, id: 'pulse', source: 'preset', primary: '#ffffff', supportA: '#22d3ee', supportB: '#a78bfa',
    })).toBe(false);
    localStorage.setItem('ss-palette-theme-v2', '{broken');
    expect(readStoredPaletteTheme()).toBeNull();
    clearStoredPaletteTheme();
  });
});

describe('PaletteThemePicker: preview nie zapisuje, anulowanie przywraca', () => {
  const renderPicker = (onConfirm = vi.fn()) => render(
    <LanguageProvider>
      <PaletteThemePicker currentAccentId="rose" currentPalette={null} onConfirm={onConfirm} />
    </LanguageProvider>,
  );

  it('preview Forge nie mutuje storage, ma niekolorowy marker i można go anulować', () => {
    selectLegacyAccent('rose');
    renderPicker();

    expect(screen.getByRole('radio', { name: /Pulse/ })).toHaveClass('border-muted-foreground');
    fireEvent.click(screen.getByRole('radio', { name: /Forge/ }));
    expect(document.documentElement.dataset.palette).toBe('forge');
    expect(readStoredPaletteTheme()).toBeNull();
    expect(screen.getByTestId('palette-forge-selected')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Forge/ })).toHaveClass('min-h-12');

    fireEvent.click(screen.getByRole('button', { name: 'Anuluj podgląd' }));
    expect(document.documentElement.dataset.palette).toBeUndefined();
    expect(document.documentElement.dataset.accent).toBe('rose');
    expect(readStoredPaletteTheme()).toBeNull();
  });

  it('dopiero potwierdzenie zapisuje pełny obiekt i legacy accentColor', () => {
    const onConfirm = vi.fn();
    renderPicker(onConfirm);

    fireEvent.click(screen.getByRole('radio', { name: /Pulse/ }));
    expect(readStoredPaletteTheme()).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Zastosuj paletę' }));

    expect(readStoredPaletteTheme()?.id).toBe('pulse');
    expect(localStorage.getItem('ss-accent-color')).toBe('#c6ff00');
    expect(onConfirm).toHaveBeenCalledWith(PALETTE_THEMES[0]);
  });

  it('radiogroup ma jeden tab stop i obsługuje wybór strzałkami', () => {
    renderPicker();
    const pulse = screen.getByRole('radio', { name: /Pulse/ });
    const forge = screen.getByRole('radio', { name: /Forge/ });
    const glacier = screen.getByRole('radio', { name: /Glacier/ });

    expect(pulse).toHaveAttribute('tabindex', '0');
    expect(forge).toHaveAttribute('tabindex', '-1');
    expect(glacier).toHaveAttribute('tabindex', '-1');
    pulse.focus();
    fireEvent.keyDown(pulse, { key: 'ArrowRight' });
    expect(forge).toHaveFocus();
    expect(forge).toHaveAttribute('aria-checked', 'true');
  });

  it('wyjście z ekranu podczas preview przywraca zatwierdzony wcześniej wygląd', () => {
    selectLegacyAccent('rose');
    const view = renderPicker();
    fireEvent.click(screen.getByRole('radio', { name: /Glacier/ }));
    expect(document.documentElement.dataset.palette).toBe('glacier');

    view.unmount();

    expect(document.documentElement.dataset.palette).toBeUndefined();
    expect(document.documentElement.dataset.accent).toBe('rose');
  });

  it('zewnętrzny wybór legacy podczas preview staje się nową bazą dla anulowania i unmount', () => {
    selectLegacyAccent('rose');
    const view = render(
      <LanguageProvider>
        <PaletteThemePicker currentAccentId="rose" currentPalette={null} onConfirm={vi.fn()} />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('radio', { name: /Forge/ }));
    expect(document.documentElement.dataset.palette).toBe('forge');

    selectLegacyAccent('sky');
    view.rerender(
      <LanguageProvider>
        <PaletteThemePicker currentAccentId="sky" currentPalette={null} onConfirm={vi.fn()} />
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj podgląd' }));

    expect(document.documentElement.dataset.palette).toBeUndefined();
    expect(document.documentElement.dataset.accent).toBe('sky');

    fireEvent.click(screen.getByRole('radio', { name: /Glacier/ }));
    view.unmount();

    expect(document.documentElement.dataset.palette).toBeUndefined();
    expect(document.documentElement.dataset.accent).toBe('sky');
  });
});
