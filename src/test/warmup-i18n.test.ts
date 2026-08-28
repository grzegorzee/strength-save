import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { pl } from '@/i18n/locales/pl';
import { en } from '@/i18n/locales/en';
import { buildPreStartWarmup } from '@/lib/prestart-warmup';
import { warmupExercises } from '@/data/warmupStretching';

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
    const forbidden = /jumping|jacks|circles|pose|cat-cow|child|pigeon|face pull|goblet squat|hip airplane|glute bridge|bird dog/i;
    for (const k of nameKeys) expect(pl[k], String(k)).not.toMatch(forbidden);
  });

  it('EN bez polskich znaków', () => {
    for (const k of nameKeys) expect(en[k], String(k)).not.toMatch(/[ąćęłńóśźż]/i);
  });

  it('każda pozycja kanonicznej rozgrzewki ma nazwę i instrukcję w PL oraz EN', () => {
    const items = ['chest', 'legs', 'core'].flatMap((category) => [
      ...buildPreStartWarmup({ exerciseName: 'Test', category, level: 'beginner' }).items,
      ...buildPreStartWarmup({ exerciseName: 'Test', category, level: 'advanced' }).items,
    ]);
    for (const item of items) {
      expect(pl[item.key], `${item.key} PL`).toBeTruthy();
      expect(en[item.key], `${item.key} EN`).toBeTruthy();
      expect(pl[item.instructionKey], `${item.instructionKey} PL`).toBeTruthy();
      expect(en[item.instructionKey], `${item.instructionKey} EN`).toBeTruthy();
    }
  });

  it('każda pozycja eksportowanego katalogu legacy ma instrukcję w PL oraz EN', () => {
    for (const item of warmupExercises) {
      expect('instructionKey' in item, `${item.nameKey} instructionKey`).toBe(true);
      expect(pl[item.nameKey], `${item.nameKey} PL`).toBeTruthy();
      expect(en[item.nameKey], `${item.nameKey} EN`).toBeTruthy();
      expect(pl[item.instructionKey], `${item.instructionKey} PL`).toBeTruthy();
      expect(en[item.instructionKey], `${item.instructionKey} EN`).toBeTruthy();
    }
  });

  it('/day używa tej samej rozgrzewki v3 z opisami, bez legacy warmupExercises', () => {
    const source = readFileSync('src/pages/DayPlan.tsx', 'utf8');
    expect(source).toContain('buildPreStartWarmup');
    expect(source).toContain('instructionKey');
    expect(source).not.toContain('warmupExercises.map');
  });
});
