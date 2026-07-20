// X17D Z140.2: PUŁAPKA WYKONAWCZA. AppHeader jest UKRYTY na trasach /workout/*,
// więc w momencie kliknięcia „Zakończ trening" komponent z animacją nie istnieje.
// Gratulacja musi przeżyć nawigację i odpalić się po powrocie na Dashboard.
import { beforeEach, describe, expect, it } from 'vitest';
import {
  consumeCelebration,
  CELEBRATION_STORAGE_KEY,
} from '@/lib/workout-celebration';

beforeEach(() => localStorage.clear());

describe('consumeCelebration (Z140.2)', () => {
  it('pierwsze uruchomienie NIE świętuje istniejącej historii', () => {
    expect(consumeCelebration(42)).toBe(0);
    expect(localStorage.getItem(CELEBRATION_STORAGE_KEY)).toBe('42');
  });

  it('wzrost licznika daje deltę do świętowania', () => {
    consumeCelebration(10);
    expect(consumeCelebration(11)).toBe(1);
  });

  it('gratulacja jest JEDNORAZOWA — drugi odczyt już nie świętuje', () => {
    consumeCelebration(10);
    expect(consumeCelebration(11)).toBe(1);
    expect(consumeCelebration(11)).toBe(0);
  });

  it('przeżywa nawigację: wzrost zapisany przy odmontowanym nagłówku odpala się później', () => {
    consumeCelebration(5);
    // AppHeader ukryty na /workout/* — nikt nie woła consume, licznik rośnie w tle.
    // Po powrocie na Dashboard pierwszy odczyt widzi różnicę.
    expect(consumeCelebration(6)).toBe(1);
  });

  it('skok o więcej niż jeden (sync kilku treningów) zwraca pełną deltę', () => {
    consumeCelebration(3);
    expect(consumeCelebration(7)).toBe(4);
  });

  it('spadek licznika (usunięty trening) nie świętuje i aktualizuje stan', () => {
    consumeCelebration(10);
    expect(consumeCelebration(8)).toBe(0);
    expect(consumeCelebration(9)).toBe(1);
  });

  it('uszkodzony zapis traktowany jak pierwsze uruchomienie', () => {
    localStorage.setItem(CELEBRATION_STORAGE_KEY, 'nie-liczba');
    expect(consumeCelebration(4)).toBe(0);
    expect(consumeCelebration(5)).toBe(1);
  });
});
