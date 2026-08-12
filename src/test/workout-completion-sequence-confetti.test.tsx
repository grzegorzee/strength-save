import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { WorkoutCompletionSequence } from '@/components/WorkoutCompletionSequence';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('@/components/ConfettiBurst', () => ({
  // Bez wołania onDone: asercje dotyczą renderu W TRAKCIE etapu celebracji.
  ConfettiBurst: () => <div data-testid="confetti" />,
}));

const base = {
  justCompleted: true,
  summary: { volumeKg: 1000, completedSets: 10, plannedSets: 10, planPct: 100, prevVolumeKg: null, volumeDeltaPct: null },
  durationSec: 1800,
  fmtTonnage: (kg: number) => `${kg}`,
  fmtWeight: (kg: number) => `${kg}`,
  fmtDuration: (s: number) => `${s}`,
  onRate: () => {},
} as const;

describe('polityka confetti', () => {
  it('zwykły trening (bez PR): celebracja BEZ confetti', () => {
    const { queryByTestId } = render(<WorkoutCompletionSequence {...base} prs={[]} />);
    expect(queryByTestId('confetti')).toBeNull();
  });
  it('trening z PR: confetti jest', () => {
    const { queryByTestId } = render(
      <WorkoutCompletionSequence {...base} prs={[{ exerciseId: 'e', exerciseName: 'x', type: 'weight', newValue: 105, oldValue: 100 }]} />,
    );
    expect(queryByTestId('confetti')).toBeTruthy();
  });
});
