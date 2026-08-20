// Fala 2 (2026-08-20): wariant NASTĘPNY karty dnia + pasek obciążenia.
// Niezmiennik (zasada 5): stany completed/missed/skipped renderują dokładnie
// te same badge co przed redesignem; NEXT nie wypiera żadnego statusu.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrainingDayCard } from '@/components/TrainingDayCard';
import type { WorkoutSession } from '@/types';
import { formatLocalDate } from '@/lib/utils';

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({ t: (k: string) => k, lang: 'pl' }),
}));

const day = { id: 'd1', dayName: 'Poniedziałek', focus: 'Push', exercises: [{ id: 'e1' }] } as never;

const completedWorkout = (date: string): WorkoutSession =>
  ({ id: 'w1', completed: true, date } as WorkoutSession);

const pastDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return d;
};

describe('TrainingDayCard — wariant NASTĘPNY (fala 2)', () => {
  it('isNext renderuje badge dayplan.badgeNext', () => {
    render(<TrainingDayCard day={day} onClick={() => {}} isNext />);
    expect(screen.getByText('dayplan.badgeNext')).toBeTruthy();
  });

  it('NEXT nie wypiera statusów: ukończony/zaległy/pominięty NIE pokazują badgeNext', () => {
    const cases = [
      { latestWorkout: completedWorkout('2026-01-05'), expected: 'dayplan.badgeCompleted' },
      { trainingDate: pastDate(), expected: 'dayplan.badgeMissed' },
      { skipped: true, expected: 'dayplan.badgeSkipped' },
    ] as const;
    for (const { expected, ...props } of cases) {
      const { unmount } = render(<TrainingDayCard day={day} onClick={() => {}} isNext {...props} />);
      expect(screen.getByText(expected)).toBeTruthy();
      expect(screen.queryByText('dayplan.badgeNext')).toBeNull();
      unmount();
    }
  });

  it('niezmiennik badge: completed dziś = badgeToday, completed wcześniej = badgeCompleted', () => {
    const todayStr = formatLocalDate(new Date());
    const { unmount } = render(
      <TrainingDayCard day={day} onClick={() => {}} latestWorkout={completedWorkout(todayStr)} />,
    );
    expect(screen.getByText('dayplan.badgeToday')).toBeTruthy();
    unmount();
    render(<TrainingDayCard day={day} onClick={() => {}} latestWorkout={completedWorkout('2026-01-05')} />);
    expect(screen.getByText('dayplan.badgeCompleted')).toBeTruthy();
  });

  it('loadPercent undefined = brak paska obciążenia w DOM', () => {
    render(<TrainingDayCard day={day} onClick={() => {}} />);
    expect(screen.queryByLabelText('trainingplan.dayLoadAria')).toBeNull();
  });

  it('loadPercent renderuje pasek z szerokością procentową', () => {
    render(<TrainingDayCard day={day} onClick={() => {}} loadPercent={62} />);
    const track = screen.getByLabelText('trainingplan.dayLoadAria');
    const fill = track.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('62%');
  });
});
