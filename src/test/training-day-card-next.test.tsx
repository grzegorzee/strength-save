// Fala 2 (2026-08-20): wariant NASTĘPNY karty dnia + pasek obciążenia.
// Niezmiennik (zasada 5): stany completed/missed/skipped renderują dokładnie
// te same badge co przed redesignem; NEXT nie wypiera żadnego statusu.
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
  it('główna treść karty jest semantycznym przyciskiem i zachowuje dotychczasowy onClick', () => {
    const onClick = vi.fn();
    render(<TrainingDayCard day={day} onClick={onClick} />);

    const primaryAction = screen.getByRole('button', { name: /Poniedziałek/i });
    expect(primaryAction.className).toContain('min-h-11');
    primaryAction.focus();
    expect(document.activeElement).toBe(primaryAction);
    fireEvent.click(primaryAction);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('grupuje Przełóż i Odpuść w jednym menu 44x44 bez uruchamiania akcji głównej', () => {
    const onClick = vi.fn();
    const onReschedule = vi.fn();
    const onToggleSkip = vi.fn();
    render(
      <TrainingDayCard
        day={day}
        onClick={onClick}
        onReschedule={onReschedule}
        onToggleSkip={onToggleSkip}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'card.moreActions' });
    expect(trigger.className).toContain('min-h-11');
    expect(trigger.className).toContain('min-w-11');
    expect(screen.getAllByRole('button')).toHaveLength(2);

    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'reschedule.action' }));
    expect(onReschedule).toHaveBeenCalledTimes(1);
    expect(onToggleSkip).not.toHaveBeenCalled();
    expect(onClick).not.toHaveBeenCalled();

    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'skipday.action' }));
    expect(onToggleSkip).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('pominięty dzień udostępnia w tym samym menu odwracalną akcję Przywróć', () => {
    const onClick = vi.fn();
    const onToggleSkip = vi.fn();
    render(
      <TrainingDayCard day={day} onClick={onClick} onToggleSkip={onToggleSkip} skipped />,
    );

    const trigger = screen.getByRole('button', { name: 'card.moreActions' });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('menuitem', { name: 'skipday.restore' }));
    expect(onToggleSkip).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('ukończony dzień bez callbacków nie pokazuje niedostępnego menu działań', () => {
    render(
      <TrainingDayCard
        day={day}
        onClick={() => {}}
        latestWorkout={completedWorkout('2026-01-05')}
      />,
    );

    expect(screen.queryByRole('button', { name: 'card.moreActions' })).toBeNull();
    expect(screen.queryByText('reschedule.action')).toBeNull();
    expect(screen.queryByText('skipday.action')).toBeNull();
  });

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
