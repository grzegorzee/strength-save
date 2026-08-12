import { describe, expect, it } from 'vitest';
import { buildSessionRatingUpdate } from '@/lib/workout-session-rating';
import { sanitizeWorkoutDoc } from '@/lib/firestore-doc-guards';

// Runna pakiet 1, krok 1 (spec A1/A2): ocena sesji po treningu (kciuk + chipsy).
// Warstwa danych: builder payloadu zapisu + przejście pola przez hydrację
// (sanitizeWorkoutDoc mapuje pole-po-polu — lekcja builda 88: nowe pole bez
// wpisu w mapperze znika z UI i z silnika progresji).

describe('buildSessionRatingUpdate', () => {
  it('kciuk gora daje sam sessionRating, bez powodow', () => {
    expect(buildSessionRatingUpdate('up')).toEqual({ sessionRating: 'up' });
  });

  it('kciuk gora ignoruje podane powody (chipsy sa tylko dla kciuka w dol)', () => {
    expect(buildSessionRatingUpdate('up', ['too_heavy'])).toEqual({ sessionRating: 'up' });
  });

  it('kciuk dol zachowuje tylko znane powody, bez duplikatow', () => {
    expect(buildSessionRatingUpdate('down', ['too_heavy', 'nonsense', 'too_long', 'too_heavy']))
      .toEqual({ sessionRating: 'down', sessionRatingReasons: ['too_heavy', 'too_long'] });
  });

  it('kciuk dol bez powodow daje sam sessionRating', () => {
    expect(buildSessionRatingUpdate('down')).toEqual({ sessionRating: 'down' });
    expect(buildSessionRatingUpdate('down', ['nonsense'])).toEqual({ sessionRating: 'down' });
  });

  it('nieznana ocena daje null (brak zapisu)', () => {
    expect(buildSessionRatingUpdate('meh')).toBeNull();
    expect(buildSessionRatingUpdate(undefined)).toBeNull();
    expect(buildSessionRatingUpdate(1)).toBeNull();
  });
});

describe('sanitizeWorkoutDoc: ocena sesji', () => {
  const baseDoc = () => ({
    userId: 'u1',
    dayId: 'day-1',
    date: '2026-08-12',
    completed: true,
    exercises: [{ exerciseId: 'ex-1', sets: [{ reps: 8, weight: 100, completed: true }] }],
  });

  it('zachowuje sessionRating i sessionRatingReasons przy hydracji', () => {
    const workout = sanitizeWorkoutDoc('w1', {
      ...baseDoc(),
      sessionRating: 'down',
      sessionRatingReasons: ['too_heavy', 'weak_day'],
    });
    expect(workout?.sessionRating).toBe('down');
    expect(workout?.sessionRatingReasons).toEqual(['too_heavy', 'weak_day']);
  });

  it('odrzuca nieznana wartosc oceny i nieznane powody', () => {
    const workout = sanitizeWorkoutDoc('w1', {
      ...baseDoc(),
      sessionRating: 'meh',
      sessionRatingReasons: ['too_heavy', 42, 'hacked'],
    });
    expect(workout?.sessionRating).toBeUndefined();
    expect(workout?.sessionRatingReasons).toEqual(['too_heavy']);
  });

  it('dokument bez oceny hydratuje sie jak dzis (niezmiennik)', () => {
    const workout = sanitizeWorkoutDoc('w1', baseDoc());
    expect(workout).not.toBeNull();
    expect(workout?.sessionRating).toBeUndefined();
    expect(workout?.sessionRatingReasons).toBeUndefined();
  });
});
