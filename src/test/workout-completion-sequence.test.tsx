import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { WorkoutCompletionSequence } from '@/components/WorkoutCompletionSequence';
import type { CompletionSummary } from '@/lib/workout-completion-summary';

// Runna pakiet 1, krok 2 (spec A1): SEKWENCJA completion — celebracja → ocena
// 1 tapem (pomijalna) → dopiero potem podsumowanie. Stary przepływ (wejście
// w ukończony trening z historii) pokazuje podsumowanie od razu, bez celebracji
// i bez oceny (niezmiennik).

const summary: CompletionSummary = {
  volumeKg: 800,
  completedSets: 10,
  plannedSets: 12,
  planPct: 83,
  prevVolumeKg: 700,
  volumeDeltaPct: 14,
  prevDate: '2026-08-13',
};

const renderSequence = (props: Partial<Parameters<typeof WorkoutCompletionSequence>[0]> = {}) => {
  const onRate = vi.fn();
  render(
    <LanguageProvider>
      <WorkoutCompletionSequence
        justCompleted
        summary={summary}
        durationSec={65}
        fmtTonnage={(kg) => `${kg} kg`}
        fmtWeight={(kg) => `${kg} kg`}
        fmtDuration={(s) => `${s}s`}
        prs={[]}
        onRate={onRate}
        celebrationMs={30}
        {...props}
      >
        <div>PODSUMOWANIE-DZIECI</div>
      </WorkoutCompletionSequence>
    </LanguageProvider>,
  );
  return { onRate };
};

const advanceToRating = async () => {
  await waitFor(() => expect(screen.getByText('Jak było?')).toBeTruthy());
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('WorkoutCompletionSequence', () => {
  it('wejście z historii (justCompleted=false): podsumowanie od razu, zero celebracji i oceny', () => {
    renderSequence({ justCompleted: false });
    expect(screen.getByText('PODSUMOWANIE-DZIECI')).toBeTruthy();
    expect(screen.queryByText('Jak było?')).toBeNull();
    expect(screen.getByText('800 kg')).toBeTruthy();
  });

  it('świeże zakończenie: celebracja, potem ocena, podsumowanie ukryte do decyzji', async () => {
    renderSequence();
    expect(screen.getByText('Trening ukończony!')).toBeTruthy();
    expect(document.querySelectorAll('[data-app-overlay]')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Zamknij okno' })).toBeTruthy();
    expect(screen.queryByText('PODSUMOWANIE-DZIECI')).toBeNull();
    await advanceToRating();
    expect(screen.queryByText('PODSUMOWANIE-DZIECI')).toBeNull();
  });

  it('kciuk w górę: onRate(up) i przejście do podsumowania z podziękowaniem', async () => {
    const { onRate } = renderSequence();
    await advanceToRating();
    fireEvent.click(screen.getByRole('button', { name: 'Dobrze' }));
    expect(onRate).toHaveBeenCalledWith('up', []);
    expect(screen.getByText('PODSUMOWANIE-DZIECI')).toBeTruthy();
    expect(screen.getByText('800 kg')).toBeTruthy();
    expect(screen.getByText(/Dzięki/)).toBeTruthy();
  });

  it('kciuk w dół: chipsy powodów, zapis z wybranymi', async () => {
    const { onRate } = renderSequence();
    await advanceToRating();
    fireEvent.click(screen.getByRole('button', { name: 'Ciężko' }));
    fireEvent.click(screen.getByRole('button', { name: 'Za ciężko' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz ocenę' }));
    expect(onRate).toHaveBeenCalledWith('down', ['too_heavy']);
    expect(screen.getByText('PODSUMOWANIE-DZIECI')).toBeTruthy();
  });

  it('pominięcie oceny: bez onRate, podsumowanie widoczne, bez podziękowania', async () => {
    const { onRate } = renderSequence();
    await advanceToRating();
    fireEvent.click(screen.getByRole('button', { name: 'Pomiń ocenę' }));
    expect(onRate).not.toHaveBeenCalled();
    expect(screen.getByText('PODSUMOWANIE-DZIECI')).toBeTruthy();
    expect(screen.queryByText(/Dzięki/)).toBeNull();
  });

  it('edycja z podsumowania: przycisk "Popraw serie" woła onEditSets (spec A3)', () => {
    const onEditSets = vi.fn();
    renderSequence({ justCompleted: false, onEditSets });
    fireEvent.click(screen.getByRole('button', { name: 'Popraw serie' }));
    expect(onEditSets).toHaveBeenCalledTimes(1);
  });

  it('bez onEditSets (final sync pending) przycisku edycji nie ma', () => {
    renderSequence({ justCompleted: false });
    expect(screen.queryByRole('button', { name: 'Popraw serie' })).toBeNull();
  });

  it('podsumowanie: plan vs wykonanie (staty 10/12 + % planu), delta wolumenu i kafle PR', async () => {
    renderSequence({
      justCompleted: false,
      prs: [{ exerciseId: 'ex-1', exerciseName: 'Wyciskanie', type: 'weight', newValue: 105, oldValue: 100 }],
    });
    // Fala 2: zdanie "10 z 12 zaplanowanych serii" znika — te same dane niosą staty.
    expect(screen.getByText('10/12')).toBeTruthy();
    expect(screen.getByText('83%')).toBeTruthy();
    expect(screen.getByText(/\+14%/)).toBeTruthy();
    expect(screen.getByText(/Nowe rekordy/)).toBeTruthy();
    expect(screen.getByText('Wyciskanie')).toBeTruthy();
    expect(screen.getByText(/105 kg/)).toBeTruthy();
  });

  it('paski porównania: widoczne przy prevVolumeKg, z labelem vs data poprzedniej sesji', () => {
    renderSequence({ justCompleted: false });
    expect(screen.getByText('Dziś')).toBeTruthy();
    expect(screen.getByText('700 kg')).toBeTruthy();
    // prevDate 2026-08-13 → "vs 13 sie" (locale pl, miesiąc krótki).
    expect(screen.getByText(/vs 13/)).toBeTruthy();
  });

  it('pierwszy trening dnia (prevVolumeKg null): bez pasków porównania i bez delty', () => {
    renderSequence({
      justCompleted: false,
      summary: { ...summary, prevVolumeKg: null, volumeDeltaPct: null, prevDate: null },
    });
    expect(screen.queryByText('Dziś')).toBeNull();
    expect(screen.queryByText(/vs /)).toBeNull();
    expect(screen.queryByText(/\+14%/)).toBeNull();
  });
});
