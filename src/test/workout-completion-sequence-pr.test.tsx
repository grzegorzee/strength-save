import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkoutCompletionSequence } from '@/components/WorkoutCompletionSequence';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string, p?: Record<string, unknown>) => p ? `${k}:${JSON.stringify(p)}` : k }),
}));

const base = {
  justCompleted: false,
  summary: { volumeKg: 4200, completedSets: 18, plannedSets: 20, planPct: 90, prevVolumeKg: 4000, volumeDeltaPct: 5, prevDate: null },
  durationSec: 3600,
  fmtTonnage: (kg: number) => `${kg} kg`,
  fmtWeight: (kg: number) => `${kg} kg`,
  fmtDuration: (s: number) => `${s}s`,
  onRate: () => {},
} as const;

describe('PR z deltą', () => {
  it('rekord ciężaru pokazuje przyrost względem oldValue', () => {
    render(
      <WorkoutCompletionSequence
        {...base}
        prs={[{ exerciseId: 'e1', exerciseName: 'Przysiad', type: 'weight', newValue: 105, oldValue: 100 }]}
      />,
    );
    expect(screen.getByText(/\+5 kg/)).toBeTruthy();
  });

  it('pierwszy rekord bez oldValue > 0 nie pokazuje delty', () => {
    render(
      <WorkoutCompletionSequence
        {...base}
        summary={{ ...base.summary, volumeDeltaPct: null }}
        prs={[{ exerciseId: 'e1', exerciseName: 'Przysiad', type: 'reps', newValue: 12, oldValue: 0 }]}
      />,
    );
    expect(screen.queryByText(/\+/)).toBeNull();
  });
});
