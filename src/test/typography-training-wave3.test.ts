import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const TRAINING_WAVE_3_SURFACES = [
  'src/components/ExerciseProgressionDialog.tsx',
  'src/components/FirstWorkoutTour.tsx',
  'src/components/HybridWeekStrip.tsx',
  'src/components/IntervalTimer.tsx',
  'src/components/PinnedNoteSection.tsx',
  'src/components/PlateCalculatorSheet.tsx',
  'src/components/RestBar.tsx',
  'src/components/SetCountdown.tsx',
  'src/components/WarmupRoutineDialog.tsx',
  'src/components/WorkoutCompletionSequence.tsx',
  'src/components/WorkoutDayNoteSection.tsx',
] as const;

describe('training typography wave 3', () => {
  it('etykiety treningowe nie schodzą poniżej 11 px', () => {
    for (const path of TRAINING_WAVE_3_SURFACES) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(/text-\[(?:8|8\.5|9|9\.5|10|10\.5)px\]/);
    }
  });
});
