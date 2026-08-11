import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LANGUAGE, detectLanguage } from '@/i18n';

// Z239: apka domyślnie po angielsku dla świata; polski TYLKO dla polskiego locale.
// Zapisany wybór usera (localStorage/chmura) nadal wygrywa (LanguageContext).

const stubNavigatorLanguage = (value: string) => {
  vi.stubGlobal('navigator', { ...navigator, language: value });
};

describe('domyślny język (Z239)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('DEFAULT_LANGUAGE to en', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
  });

  it('polskie locale dostaje polski', () => {
    stubNavigatorLanguage('pl-PL');
    expect(detectLanguage()).toBe('pl');
  });

  it('angielskie locale dostaje angielski', () => {
    stubNavigatorLanguage('en-GB');
    expect(detectLanguage()).toBe('en');
  });

  it('niewspierane locale (DE/FR/ES) dostaje angielski, nie polski', () => {
    for (const locale of ['de-DE', 'fr-FR', 'es-ES', 'uk-UA']) {
      stubNavigatorLanguage(locale);
      expect(detectLanguage()).toBe('en');
    }
  });
});
