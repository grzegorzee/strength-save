import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { WorkoutCompletionSequence } from '@/components/WorkoutCompletionSequence';
import type { PRComparison } from '@/lib/pr-utils';

// Bug 31 (X30): timer celebracji resetowany przez inline onDone. Rodzic
// (WorkoutDay) re-renderuje się w oknie celebracji (onSnapshot po lokalnym
// zapisie i acku serwera, autoSaveStatus, currentPageDraft), a inline arrow
// onDone={() => setStage('rating')} w deps efektu AutoAdvance/ConfettiBurst
// czyścił i restartował PEŁNY timeout. Celebracja trwała (ostatni re-render)
// + celebrationMs zamiast celebrationMs, a confetti CSS już wygasło = "zamrożona
// apka". Wzorzec B-T3 (LivePRCelebration): onDoneRef, deps bez onDone.

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'pl' }),
}));

const base = {
  justCompleted: true,
  summary: { volumeKg: 1000, completedSets: 10, plannedSets: 10, planPct: 100, prevVolumeKg: null, volumeDeltaPct: null, prevDate: null },
  durationSec: 1800,
  fmtTonnage: (kg: number) => `${kg}`,
  fmtWeight: (kg: number) => `${kg}`,
  fmtDuration: (s: number) => `${s}`,
  onRate: () => {},
} as const;

const pr: PRComparison = { exerciseId: 'e', exerciseName: 'x', type: 'weight', newValue: 105, oldValue: 100 };

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('bug 31 (X30): re-render rodzica NIE resetuje timera celebracji', () => {
  it('bez PR (AutoAdvance): rerender w oknie celebracji, ocena pojawia się o pierwotnym czasie', () => {
    // celebrationMs=2000 → AutoAdvance min(2000, 1200) = 1200 ms.
    const view = render(<WorkoutCompletionSequence {...base} prs={[]} celebrationMs={2000} />);
    expect(view.getByText('workout.completedTitle')).toBeTruthy();

    act(() => { vi.advanceTimersByTime(800); });
    // Nowa tożsamość prs (inline liczenie w WorkoutDay) = re-render rodzica.
    view.rerender(<WorkoutCompletionSequence {...base} prs={[]} celebrationMs={2000} />);
    act(() => { vi.advanceTimersByTime(500); });

    // 1300 ms > 1200 ms: ocena, a nie celebracja zrestartowana o 800 ms.
    expect(view.queryByText('workout.completedTitle')).toBeNull();
    expect(view.getByText('workout.completion.rateTitle')).toBeTruthy();
  });

  it('z PR (ConfettiBurst): rerender w oknie celebracji, ocena pojawia się o pierwotnym czasie', () => {
    const view = render(<WorkoutCompletionSequence {...base} prs={[pr]} celebrationMs={2000} />);
    expect(view.getByText('workout.completedTitle')).toBeTruthy();

    act(() => { vi.advanceTimersByTime(1500); });
    view.rerender(<WorkoutCompletionSequence {...base} prs={[{ ...pr }]} celebrationMs={2000} />);
    act(() => { vi.advanceTimersByTime(700); });

    // 2200 ms > 2000 ms: ocena, a nie celebracja zrestartowana o 1500 ms.
    expect(view.queryByText('workout.completedTitle')).toBeNull();
    expect(view.getByText('workout.completion.rateTitle')).toBeTruthy();
  });

  it('niezmiennik: bez re-renderu celebracja kończy się po celebrationMs, nie wcześniej', () => {
    const view = render(<WorkoutCompletionSequence {...base} prs={[pr]} celebrationMs={2000} />);
    act(() => { vi.advanceTimersByTime(1900); });
    expect(view.getByText('workout.completedTitle')).toBeTruthy();
    act(() => { vi.advanceTimersByTime(200); });
    expect(view.getByText('workout.completion.rateTitle')).toBeTruthy();
  });
});
