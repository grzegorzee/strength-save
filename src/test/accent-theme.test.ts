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

  it('applyAccent ustawia --primary/--primary-light/--ring i data-accent', () => {
    const cyan = applyAccent('cyan');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--primary')).toBe(cyan.hsl);
    expect(root.style.getPropertyValue('--primary-light')).toBe(cyan.lightHsl);
    expect(root.style.getPropertyValue('--ring')).toBe(cyan.hsl);
    expect(root.dataset.accent).toBe('cyan');
  });

  it('powrót do limonki zdejmuje nadpisania (czyste tokeny z index.css)', () => {
    applyAccent('cyan');
    applyAccent('lime');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--primary')).toBe('');
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

  it('statusowe kolory nietknięte: apply nie rusza fitness-success/warning', () => {
    applyAccent('red');
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--fitness-success')).toBe('');
    expect(root.style.getPropertyValue('--fitness-warning')).toBe('');
    expect(root.style.getPropertyValue('--destructive')).toBe('');
  });
});
