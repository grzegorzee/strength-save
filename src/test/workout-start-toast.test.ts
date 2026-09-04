import { describe, expect, it } from 'vitest';
import { formatWorkoutStartedDescription } from '@/lib/workout-start-toast';

describe('formatWorkoutStartedDescription', () => {
  it('nie dopisuje separatora, gdy szybki trening nie ma focusu', () => {
    expect(formatWorkoutStartedDescription('Szybki trening', '')).toBe('Szybki trening');
    expect(formatWorkoutStartedDescription('Szybki trening', '   ')).toBe('Szybki trening');
  });

  it('zachowuje czytelny opis dnia z focusem', () => {
    expect(formatWorkoutStartedDescription('Poniedziałek', 'Klatka')).toBe('Poniedziałek · Klatka');
  });
});
