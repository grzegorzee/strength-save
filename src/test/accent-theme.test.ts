// F-T2: kolor przewodni — kontrakt lib: tokeny CSS, persistencja, fallback.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  ACCENTS,
  DEFAULT_ACCENT_ID,
  applyAccent,
  applyStoredAccent,
  getAccentById,
  getCurrentAccent,
  readStoredAccentId,
  storeAccentId,
} from '@/lib/accent-theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.style.cssText = '';
  delete document.documentElement.dataset.accent;
});

describe('accent-theme (F-T2)', () => {
  it('paleta: 8 akcentów, limonka domyślna i pierwsza', () => {
    expect(ACCENTS.length).toBe(8);
    expect(ACCENTS[0].id).toBe(DEFAULT_ACCENT_ID);
    expect(new Set(ACCENTS.map((a) => a.id)).size).toBe(8);
  });

  it('applyAccent ustawia --primary/--primary-light/--ring/--accent i data-accent', () => {
    const cyan = applyAccent('cyan');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--primary')).toBe(cyan.hsl);
    expect(root.style.getPropertyValue('--primary-light')).toBe(cyan.lightHsl);
    expect(root.style.getPropertyValue('--ring')).toBe(cyan.hsl);
    // Audyt akcentu (2026-08-20): --accent (chipy filtrów, badge secondary,
    // nagłówki sekcji text-accent) też podąża za kolorem przewodnim.
    expect(root.style.getPropertyValue('--accent')).toBe(cyan.hsl);
    expect(root.dataset.accent).toBe('cyan');
  });

  it('powrót do limonki zdejmuje nadpisania (czyste tokeny z index.css)', () => {
    applyAccent('cyan');
    applyAccent('lime');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--primary')).toBe('');
    expect(root.style.getPropertyValue('--accent')).toBe('');
    expect(root.style.getPropertyValue('--accent-foreground')).toBe('');
    expect(root.dataset.accent).toBeUndefined();
  });

  it('nieznany id = fallback do limonki (stary profil po usunięciu koloru z palety)', () => {
    expect(getAccentById('vantablack').id).toBe(DEFAULT_ACCENT_ID);
    const applied = applyAccent('vantablack');
    expect(applied.id).toBe(DEFAULT_ACCENT_ID);
  });

  it('persistencja: store/read round-trip + applyStoredAccent na boot', () => {
    storeAccentId('orange');
    expect(readStoredAccentId()).toBe('orange');
    applyStoredAccent();
    expect(document.documentElement.dataset.accent).toBe('orange');
    expect(getCurrentAccent().id).toBe('orange');
  });

  // Rozszerzenie na życzenie właściciela (2026-08-20): dowolny kolor po #.
  it('własny hex: ustawia policzone tokeny HSL i data-accent=custom', () => {
    const applied = applyAccent('#2288ff');
    const root = document.documentElement;
    expect(applied.id).toBe('custom');
    expect(applied.hex).toBe('#2288ff');
    expect(root.dataset.accent).toBe('custom');
    expect(root.style.getPropertyValue('--primary')).toMatch(/^\d+ \d+% \d+%$/);
    expect(root.style.getPropertyValue('--primary-light')).toMatch(/^\d+ \d+% \d+%$/);
  });

  it('ciemny własny kolor dostaje jasny tekst na akcencie; jasny zostaje przy ciemnym', () => {
    applyAccent('#1a2a6c');
    expect(document.documentElement.style.getPropertyValue('--primary-foreground')).toBe('0 0% 98%');
    expect(document.documentElement.style.getPropertyValue('--accent-foreground')).toBe('0 0% 98%');
    applyAccent('#cefc22');
    expect(document.documentElement.style.getPropertyValue('--primary-foreground')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--accent-foreground')).toBe('');
    applyAccent('#ffe066');
    expect(document.documentElement.style.getPropertyValue('--primary-foreground')).toBe('');
  });

  it('własny hex przeżywa persistencję (getCurrentAccent zwraca custom)', () => {
    storeAccentId('#ff0066');
    expect(getCurrentAccent().id).toBe('custom');
    expect(getCurrentAccent().hex).toBe('#ff0066');
    applyStoredAccent();
    expect(document.documentElement.dataset.accent).toBe('custom');
  });

  it('niepoprawny hex = fallback do limonki', () => {
    expect(applyAccent('#12').id).toBe(DEFAULT_ACCENT_ID);
    expect(applyAccent('#gggggg').id).toBe(DEFAULT_ACCENT_ID);
  });

  it('isCustomAccentHex: walidacja #RRGGBB', async () => {
    const { isCustomAccentHex } = await import('@/lib/accent-theme');
    expect(isCustomAccentHex('#a1B2c3')).toBe(true);
    expect(isCustomAccentHex('a1b2c3')).toBe(false);
    expect(isCustomAccentHex('#abc')).toBe(false);
  });

  it('statusowe kolory nietknięte: apply nie rusza fitness-success/warning', () => {
    applyAccent('red');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--fitness-success')).toBe('');
    expect(root.style.getPropertyValue('--fitness-warning')).toBe('');
    expect(root.style.getPropertyValue('--destructive')).toBe('');
  });
});
