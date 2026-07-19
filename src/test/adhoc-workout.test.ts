import { describe, expect, it } from 'vitest';
import { adhocDayFromId, buildAdhocExerciseId, createAdhocDay, isAdhocDayId, parseAdhocDate } from '@/lib/adhoc-workout';
import { translate } from '@/i18n';

const t = (key: string) => translate('pl', key as Parameters<typeof translate>[1]);

describe('createAdhocDay (Z104)', () => {
  it('zwraca TrainingDay z id adhoc-<YYYY-MM-DD>-<ts>, nazwą z i18n i pustymi ćwiczeniami', () => {
    const day = createAdhocDay('2026-07-19', t);
    expect(day.id).toMatch(/^adhoc-2026-07-19-\d+$/);
    expect(day.dayName).toBe(translate('pl', 'adhoc.dayName'));
    expect(day.exercises).toEqual([]);
    expect(day.focus).toBe('');
  });

  it('kolejne wywołania dają unikalne id', () => {
    const a = createAdhocDay('2026-07-19', t);
    const b = createAdhocDay('2026-07-19', t);
    expect(a.id).not.toBe(b.id);
  });

  it('weekday odpowiada dacie', () => {
    expect(createAdhocDay('2026-07-19', t).weekday).toBe('sunday');
    expect(createAdhocDay('2026-07-20', t).weekday).toBe('monday');
  });
});

describe('isAdhocDayId (Z104)', () => {
  it('rozpoznaje id ad-hoc', () => {
    expect(isAdhocDayId('adhoc-2026-07-19-123456')).toBe(true);
  });

  it('nie koliduje z dayId planów (day-N i <startDate>-dN)', () => {
    expect(isAdhocDayId('day-1')).toBe(false);
    expect(isAdhocDayId('2026-07-01-d1')).toBe(false);
    expect(isAdhocDayId('tpl-fbw-d2')).toBe(false);
    expect(isAdhocDayId('')).toBe(false);
  });
});

describe('parseAdhocDate (Z104)', () => {
  it('wyciąga parsowalną datę z id', () => {
    expect(parseAdhocDate('adhoc-2026-07-19-123456')).toBe('2026-07-19');
    expect(parseAdhocDate('day-1')).toBeNull();
  });
});

describe('adhocDayFromId (Z104)', () => {
  it('odtwarza TrainingDay z istniejącego dayId (deep-link, resume)', () => {
    const day = adhocDayFromId('adhoc-2026-07-19-123456', t);
    expect(day).not.toBeNull();
    expect(day!.id).toBe('adhoc-2026-07-19-123456');
    expect(day!.dayName).toBe(translate('pl', 'adhoc.dayName'));
    expect(day!.weekday).toBe('sunday');
    expect(day!.exercises).toEqual([]);
  });

  it('zwraca null dla nie-adhoc id', () => {
    expect(adhocDayFromId('day-1', t)).toBeNull();
  });
});

describe('buildAdhocExerciseId (Z104)', () => {
  it('buduje id ze slugu nazwy', () => {
    expect(buildAdhocExerciseId('Wyciskanie hantli (Lekki skos)', []))
      .toBe('adhoc-ex-wyciskanie-hantli-lekki-skos');
  });

  it('unika kolizji z istniejącymi id (suffiks -2, -3...)', () => {
    const first = buildAdhocExerciseId('Przysiad', []);
    const second = buildAdhocExerciseId('Przysiad', [first]);
    const third = buildAdhocExerciseId('Przysiad', [first, second]);
    expect(second).toBe(`${first}-2`);
    expect(third).toBe(`${first}-3`);
  });

  it('pusta nazwa dostaje fallback', () => {
    expect(buildAdhocExerciseId('', [])).toBe('adhoc-ex-exercise');
  });
});
