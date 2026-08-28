import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
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
  type PaletteThemeV2,
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

// A2 (X70, decyzja właściciela): tap na kartę ZAPISUJE od razu — bez trybu
// preview/cancel/confirm; wyjście z ekranu niczego nie cofa.
describe('PaletteThemePicker: tap zapisuje od razu, bez preview', () => {
  const StatefulPicker = ({ onConfirm = vi.fn() }: { onConfirm?: (palette: PaletteThemeV2) => void }) => {
    const [palette, setPalette] = useState<PaletteThemeV2 | null>(null);
    return (
      <PaletteThemePicker
        currentAccentId="rose"
        currentPalette={palette}
        onConfirm={(next) => { setPalette(next); onConfirm(next); }}
      />
    );
  };
  const renderPicker = (onConfirm?: (palette: PaletteThemeV2) => void) => render(
    <LanguageProvider>
      <StatefulPicker onConfirm={onConfirm} />
    </LanguageProvider>,
  );

  it('tap Forge od razu zapisuje pełny obiekt, legacy accentColor i woła onConfirm; bez przycisków preview', () => {
    const onConfirm = vi.fn();
    selectLegacyAccent('rose');
    renderPicker(onConfirm);

    fireEvent.click(screen.getByRole('radio', { name: /Forge/ }));
    expect(document.documentElement.dataset.palette).toBe('forge');
    expect(readStoredPaletteTheme()?.id).toBe('forge');
    expect(localStorage.getItem('ss-accent-color')).toBe('#ff6b35');
    expect(onConfirm).toHaveBeenCalledWith(PALETTE_THEMES[1]);
    expect(screen.getByTestId('palette-forge-selected')).toBeInTheDocument();
    expect(screen.queryByTestId('palette-preview-actions')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Zastosuj paletę' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Anuluj podgląd' })).toBeNull();
  });

  it('wyjście z ekranu po tapnięciu NICZEGO nie cofa', () => {
    selectLegacyAccent('rose');
    const view = renderPicker();
    fireEvent.click(screen.getByRole('radio', { name: /Glacier/ }));
    expect(document.documentElement.dataset.palette).toBe('glacier');

    view.unmount();

    expect(document.documentElement.dataset.palette).toBe('glacier');
    expect(readStoredPaletteTheme()?.id).toBe('glacier');
  });

  it('radiogroup ma jeden tab stop i obsługuje wybór strzałkami (wybór = zapis)', () => {
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
    expect(readStoredPaletteTheme()?.id).toBe('forge');
  });

  // A3 (X70): aktywna karta ma jawny stan (tekst, nie sama ikona), a Pulse
  // mówi wprost, że to domyślny wygląd Strength Save.
  it('aktywna paleta ma jawny znacznik "Aktywna", a Pulse opisuje domyślny wygląd', () => {
    render(
      <LanguageProvider>
        <PaletteThemePicker currentAccentId="rose" currentPalette={PALETTE_THEMES[0]} onConfirm={vi.fn()} />
      </LanguageProvider>,
    );
    expect(screen.getByTestId('palette-pulse-selected')).toHaveTextContent('Aktywna');
    expect(screen.getByRole('radio', { name: /Pulse/ })).toHaveTextContent('Domyślny wygląd Strength Save.');
    expect(screen.getByRole('radio', { name: /Forge/ })).not.toHaveTextContent('Domyślny wygląd');
    expect(pl['palette.defaultHint']).toBe('Domyślny wygląd Strength Save.');
    expect(en['palette.defaultHint']).toBe('The default Strength Save look.');
    expect(pl['palette.activeBadge']).toBe('Aktywna');
    expect(en['palette.activeBadge']).toBe('Active');
  });
});
