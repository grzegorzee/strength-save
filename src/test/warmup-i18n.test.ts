import { describe, it, expect } from 'vitest';
import { pl } from '@/i18n/locales/pl';
import { en } from '@/i18n/locales/en';

// Z163: nazwy rozgrzewki i stretchingu bez mieszania języków. Klucze (warmup.*/stretch.*)
// są kanonicznymi identyfikatorami (od Z162 lądują w draftach) — zmieniamy tylko wartości.

const nameKeys = (Object.keys(pl) as Array<keyof typeof pl>).filter(
  k => (String(k).startsWith('warmup.') || String(k).startsWith('stretch.')) && !String(k).includes('.dur.'),
);

describe('nazwy rozgrzewki/stretchingu bez mieszania języków', () => {
  it('lista kluczy nie jest pusta (ochrona przed pustym skanem)', () => {
    expect(nameKeys.length).toBeGreaterThan(10);
  });

  it('PL bez angielskich wtrąceń', () => {
    const forbidden = /jumping|jacks|circles|pose|cat-cow|child|pigeon/i;
    for (const k of nameKeys) expect(pl[k], String(k)).not.toMatch(forbidden);
  });

  it('EN bez polskich znaków', () => {
    for (const k of nameKeys) expect(en[k], String(k)).not.toMatch(/[ąćęłńóśźż]/i);
  });
});
