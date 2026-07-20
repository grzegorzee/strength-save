// X17C Z135.1: silnik przerwy jako czysta logika, zero Reacta.
// Reguła 1 z CLAUDE.md: iOS wstrzymuje JS w WKWebView po zgaszeniu ekranu, więc
// stan MUSI być deadline'em (znacznikiem czasu), nie licznikiem odliczonych ticków.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  startRest,
  adjustRest,
  skipRest,
  remainingSeconds,
  isFinished,
  restProgress,
  resolveRestSeconds,
  loadRestSettings,
  saveRestSettings,
  REST_SETTINGS_STORAGE_KEY,
  type RestTimerState,
} from '@/lib/rest-timer';

const T0 = 1_700_000_000_000;

describe('silnik przerwy — model deadline (Z135.1)', () => {
  it('start ustawia deadline, nie licznik', () => {
    const s = startRest(T0, 90);
    expect(s.deadlineAt).toBe(T0 + 90_000);
    expect(s.totalSeconds).toBe(90);
    expect(remainingSeconds(s, T0)).toBe(90);
  });

  it('powrót z tła po 5 minutach: timer SKOŃCZONY, nie zamrożony', () => {
    const s = startRest(T0, 90);
    const afterBackground = T0 + 5 * 60_000;
    expect(remainingSeconds(s, afterBackground)).toBe(0);
    expect(isFinished(s, afterBackground)).toBe(true);
  });

  it('pozostały czas liczy się z deadline, niezależnie od liczby odczytów', () => {
    const s = startRest(T0, 60);
    expect(remainingSeconds(s, T0 + 10_000)).toBe(50);
    expect(remainingSeconds(s, T0 + 45_000)).toBe(15);
    expect(remainingSeconds(s, T0 + 59_500)).toBe(1);
  });

  it('+15 i -15 przesuwają deadline, total idzie za nimi (pasek postępu)', () => {
    const s = startRest(T0, 90);
    const longer = adjustRest(s, 15, T0 + 10_000);
    expect(longer.deadlineAt).toBe(T0 + 105_000);
    expect(longer.totalSeconds).toBe(105);

    const shorter = adjustRest(longer, -15, T0 + 10_000);
    expect(shorter.deadlineAt).toBe(T0 + 90_000);
  });

  it('skrócenie poniżej teraz kończy przerwę, nie daje ujemnego czasu', () => {
    const s = startRest(T0, 10);
    const shorter = adjustRest(s, -15, T0);
    expect(remainingSeconds(shorter, T0)).toBe(0);
    expect(isFinished(shorter, T0)).toBe(true);
  });

  it('pominięcie kasuje deadline', () => {
    const s = skipRest();
    expect(s.deadlineAt).toBeNull();
    expect(remainingSeconds(s, T0)).toBe(0);
    expect(isFinished(s, T0)).toBe(true);
  });

  it('deadline przeżywa „remount": ten sam stan daje ten sam wynik', () => {
    const s = startRest(T0, 90);
    // Serializacja i odtworzenie (jak przy przeładowaniu komponentu albo apki).
    const revived = JSON.parse(JSON.stringify(s)) as RestTimerState;
    expect(remainingSeconds(revived, T0 + 30_000)).toBe(60);
  });

  it('postęp rośnie od 0 do 1 i nie wychodzi poza zakres', () => {
    const s = startRest(T0, 100);
    expect(restProgress(s, T0)).toBe(0);
    expect(restProgress(s, T0 + 50_000)).toBeCloseTo(0.5, 2);
    expect(restProgress(s, T0 + 100_000)).toBe(1);
    expect(restProgress(s, T0 + 500_000)).toBe(1);
    expect(restProgress(skipRest(), T0)).toBe(1);
  });
});

describe('czasy przerw — rozgrzewka vs robocza vs per ćwiczenie (Z135.2)', () => {
  beforeEach(() => localStorage.clear());

  it('seria robocza i rozgrzewkowa mają OSOBNE domyślne czasy', () => {
    const settings = { workingSeconds: 120, warmupSeconds: 45, betweenExercisesSeconds: 150, perExercise: {} };
    expect(resolveRestSeconds(settings, { isWarmup: false })).toBe(120);
    expect(resolveRestSeconds(settings, { isWarmup: true })).toBe(45);
  });

  it('nadpisanie per ćwiczenie wygrywa z domyślnym czasem serii roboczej', () => {
    const settings = { workingSeconds: 120, warmupSeconds: 45, betweenExercisesSeconds: 150, perExercise: { 'przysiad': 240 } };
    expect(resolveRestSeconds(settings, { isWarmup: false, exerciseKey: 'przysiad' })).toBe(240);
    expect(resolveRestSeconds(settings, { isWarmup: false, exerciseKey: 'wyciskanie' })).toBe(120);
  });

  it('nadpisanie per ćwiczenie NIE dotyczy rozgrzewki', () => {
    const settings = { workingSeconds: 120, warmupSeconds: 45, betweenExercisesSeconds: 150, perExercise: { 'przysiad': 240 } };
    expect(resolveRestSeconds(settings, { isWarmup: true, exerciseKey: 'przysiad' })).toBe(45);
  });

  it('zapis i odczyt ustawień przez localStorage', () => {
    saveRestSettings({ workingSeconds: 150, warmupSeconds: 30, betweenExercisesSeconds: 200, perExercise: { 'martwy ciag': 300 } });
    const loaded = loadRestSettings();
    expect(loaded.workingSeconds).toBe(150);
    expect(loaded.warmupSeconds).toBe(30);
    expect(loaded.perExercise['martwy ciag']).toBe(300);
  });

  it('uszkodzony zapis daje domyślne wartości, nie wywala apki', () => {
    localStorage.setItem(REST_SETTINGS_STORAGE_KEY, '{{{nie-json');
    const loaded = loadRestSettings();
    expect(loaded.workingSeconds).toBeGreaterThan(0);
    expect(loaded.warmupSeconds).toBeGreaterThan(0);
    expect(loaded.perExercise).toEqual({});
  });

  it('migruje stary klucz rest-timer-default na czas serii roboczej', () => {
    localStorage.setItem('rest-timer-default', '180');
    expect(loadRestSettings().workingSeconds).toBe(180);
  });
});
