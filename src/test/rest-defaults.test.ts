// X35b: przerwy domyślne wg celu planu (decyzja właściciela 2026-08-25:
// peak_strength 180 s, build_muscle 120 s, fat_loss 60 s MAX, athletic 75 s).
import { beforeEach, describe, expect, it } from 'vitest';
import { isRecommendedRest, restDefaultsForObjective, restSettingsAfterCycleStart } from '@/lib/rest-defaults';
import { DEFAULT_REST_SETTINGS, hasStoredRestSettings, loadRestSettings, normalizeRestSettings, saveRestSettings } from '@/lib/rest-timer';

describe('restDefaultsForObjective', () => {
  it.each([
    ['peak_strength', 180, 240, 90],
    ['build_muscle', 120, 180, 60],
    ['fat_loss', 60, 90, 30],
    ['athletic', 75, 120, 45],
  ])('%s: robocza %i s, między ćwiczeniami %i s, po rozgrzewce %i s', (objective, working, between, warmup) => {
    expect(restDefaultsForObjective(objective)).toEqual({
      workingSeconds: working,
      betweenExercisesSeconds: between,
      warmupSeconds: warmup,
    });
  });

  it('redukcja: przerwa robocza nigdy powyżej 60 s (maksimum z decyzji właściciela)', () => {
    expect(restDefaultsForObjective('fat_loss').workingSeconds).toBeLessThanOrEqual(60);
  });

  it('nieznany / brak celu = dotychczasowe domyślne 90 / 150 / 45', () => {
    for (const objective of [undefined, null, '', 'unknown']) {
      expect(restDefaultsForObjective(objective)).toEqual({
        workingSeconds: DEFAULT_REST_SETTINGS.workingSeconds,
        betweenExercisesSeconds: DEFAULT_REST_SETTINGS.betweenExercisesSeconds,
        warmupSeconds: DEFAULT_REST_SETTINGS.warmupSeconds,
      });
    }
  });

  it('zwraca kopię (mutacja wyniku nie psuje tabeli)', () => {
    const a = restDefaultsForObjective('fat_loss');
    a.workingSeconds = 999;
    expect(restDefaultsForObjective('fat_loss').workingSeconds).toBe(60);
  });
});

describe('restSettingsAfterCycleStart', () => {
  it('brak ustawień (świeży user) = polecane dla celu, custom false', () => {
    expect(restSettingsAfterCycleStart(undefined, 'fat_loss')).toEqual({
      workingSeconds: 60, betweenExercisesSeconds: 90, warmupSeconds: 30, perExercise: {}, custom: false,
    });
  });

  it('ustawienia polecane (custom false) = nadpisane nowym celem, nadpisania per ćwiczenie zostają', () => {
    const current = { workingSeconds: 60, betweenExercisesSeconds: 90, warmupSeconds: 30, perExercise: { przysiad: 200 }, custom: false };
    expect(restSettingsAfterCycleStart(current, 'peak_strength')).toEqual({
      workingSeconds: 180, betweenExercisesSeconds: 240, warmupSeconds: 90, perExercise: { przysiad: 200 }, custom: false,
    });
  });

  it('user ustawił własne (custom true) = null, nic nie ruszamy', () => {
    const current = { workingSeconds: 100, betweenExercisesSeconds: 200, warmupSeconds: 50, perExercise: {}, custom: true };
    expect(restSettingsAfterCycleStart(current, 'fat_loss')).toBeNull();
  });
});

describe('isRecommendedRest', () => {
  it('równe polecanym = true, jedna różnica = false', () => {
    const rec = { ...restDefaultsForObjective('build_muscle'), perExercise: {} };
    expect(isRecommendedRest(rec, 'build_muscle')).toBe(true);
    expect(isRecommendedRest({ ...rec, warmupSeconds: 61 }, 'build_muscle')).toBe(false);
  });
});

describe('RestSettings.custom w cache localStorage', () => {
  beforeEach(() => localStorage.clear());

  it('normalizeRestSettings: custom tylko przy jawnym true, śmieci spadają na domyślne', () => {
    expect(normalizeRestSettings({ workingSeconds: -5, custom: 'yes' })).toEqual({ ...DEFAULT_REST_SETTINGS, custom: false });
    expect(normalizeRestSettings({ workingSeconds: 75, custom: true }).custom).toBe(true);
    expect(normalizeRestSettings(null)).toEqual({ ...DEFAULT_REST_SETTINGS, custom: false });
  });

  it('custom przeżywa zapis i odczyt z cache', () => {
    saveRestSettings({ ...DEFAULT_REST_SETTINGS, workingSeconds: 100, custom: true });
    expect(loadRestSettings()).toMatchObject({ workingSeconds: 100, custom: true });
  });

  it('hasStoredRestSettings: false na czystym urządzeniu, true po zapisie v1 albo przy starym kluczu', () => {
    expect(hasStoredRestSettings()).toBe(false);
    localStorage.setItem('rest-timer-default', '120');
    expect(hasStoredRestSettings()).toBe(true);
    localStorage.clear();
    saveRestSettings(DEFAULT_REST_SETTINGS);
    expect(hasStoredRestSettings()).toBe(true);
  });
});
