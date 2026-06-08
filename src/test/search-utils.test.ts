import { describe, it, expect } from 'vitest';
import { normalizeText, matchesQuery } from '@/lib/search-utils';

describe('normalizeText', () => {
  it('usuwa wielkość liter i polskie diakrytyki', () => {
    expect(normalizeText('Ławce')).toBe('lawce');
    expect(normalizeText('Wyciskanie sztangi')).toBe('wyciskanie sztangi');
    expect(normalizeText('Przysiad ze sztangą')).toBe('przysiad ze sztanga');
    expect(normalizeText('Ćwiczenie ćóęśźżń')).toBe('cwiczenie coeszzn');
  });
});

describe('matchesQuery', () => {
  it('znajduje mimo braku polskich znaków w zapytaniu', () => {
    expect(matchesQuery('lawce', ['Wyciskanie na ławce'])).toBe(true);
    expect(matchesQuery('przysiad', ['Przysiad ze sztangą', 'Squat'])).toBe(true);
  });

  it('dopasowuje po angielskiej nazwie i kategorii', () => {
    expect(matchesQuery('squat', ['Przysiad', 'Barbell Squat', 'Nogi'])).toBe(true);
    expect(matchesQuery('nogi', ['Przysiad', 'Squat', 'Nogi'])).toBe(true);
  });

  it('puste zapytanie pasuje do wszystkiego', () => {
    expect(matchesQuery('', ['cokolwiek'])).toBe(true);
    expect(matchesQuery('  ', ['x'])).toBe(true);
  });

  it('ignoruje pola undefined', () => {
    expect(matchesQuery('xyz', [undefined, 'abc'])).toBe(false);
  });
});
