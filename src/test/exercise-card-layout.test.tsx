import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ExerciseCard } from '@/components/ExerciseCard';
import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';

// Karta czyta uid tylko do telemetrii — provider ciągnie Firebase, więc mock.
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'test-uid' }),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));

beforeEach(() => {
  localStorage.setItem('app-language', 'pl');
});

const exercise = (over: Partial<Exercise> = {}): Exercise => ({
  id: 'ex-1',
  name: 'Wyciskanie sztangi na ławce płaskiej',
  sets: '3 x 6-8',
  instructions: [{ title: 'Technika', content: 'Łopatki ściągnięte, stopy na podłodze.' }],
  ...over,
});

const workingSet = (over: Partial<SetData> = {}): SetData => ({
  reps: 0,
  weight: 0,
  completed: false,
  ...over,
});

const renderCard = (props: Partial<Parameters<typeof ExerciseCard>[0]> = {}) => {
  const view = render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <ExerciseCard exercise={exercise()} index={1} {...props} />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
  return { ...view, card: view.container.querySelector('.exercise-card') as HTMLElement };
};

/**
 * Pozycja elementu w kolejności dokumentu (indeks w spłaszczonym drzewie karty).
 * Porównywanie tych indeksów = asercja na KOLEJNOŚĆ sekcji, niezależna od zagnieżdżenia.
 */
const domIndex = (card: HTMLElement, el: Element): number => {
  const all = Array.from(card.querySelectorAll('*'));
  const idx = all.indexOf(el);
  if (idx === -1) throw new Error('Element spoza karty');
  return idx;
};

const columnHeader = (card: HTMLElement, label: string): Element => {
  const found = Array.from(card.querySelectorAll('span')).find(
    (s) => s.textContent?.trim() === label && s.className.includes('uppercase'),
  );
  if (!found) throw new Error(`Brak nagłówka kolumny "${label}"`);
  return found;
};

const warmupRowLabel = (card: HTMLElement): Element => {
  const found = Array.from(card.querySelectorAll('span')).find((s) => s.textContent?.trim() === 'W');
  if (!found) throw new Error('Brak wiersza rozgrzewkowego');
  return found;
};

const addSetButton = (card: HTMLElement): HTMLElement =>
  within(card).getByRole('button', { name: /Dodaj serię/i });

describe('ExerciseCard — układ karty (charakteryzacja przed X17A)', () => {
  describe('niezmienniki: zostają po przebudowie układu', () => {
    it('weight_reps: renderuje WSZYSTKIE serie robocze i rozgrzewkowe', () => {
      const sets: SetData[] = [
        workingSet({ isWarmup: true, weight: 20, reps: 10 }),
        workingSet({ weight: 60, reps: 8, completed: true }),
        workingSet({ weight: 60, reps: 7 }),
        workingSet({ weight: 60, reps: 6 }),
      ];
      const { card } = renderCard({ savedSets: sets });

      // 3 serie robocze numerowane 1..3 + jedna rozgrzewkowa "W".
      expect(within(card).getByText('1')).toBeTruthy();
      expect(within(card).getByText('2')).toBeTruthy();
      expect(within(card).getByText('3')).toBeTruthy();
      expect(warmupRowLabel(card)).toBeTruthy();
      // Cztery pola powtórzeń = cztery wiersze (rozgrzewka + 3 robocze).
      expect(within(card).getAllByLabelText(/Powt\./)).toHaveLength(4);
    });

    it('duration (renderTrackedSetRow, Z105): renderuje wszystkie serie i kolumnę czasu', () => {
      const sets: SetData[] = [
        workingSet({ durationSec: 60, completed: true }),
        workingSet({ durationSec: 60 }),
      ];
      const { card } = renderCard({ savedSets: sets, trackingType: 'duration', exercise: exercise({ sets: '2 x 60s' }) });

      expect(columnHeader(card, 'Czas')).toBeTruthy();
      // sanitizeSets dokłada wiersz rozgrzewki, gdy w zapisie go nie ma → 1 W + 2 robocze.
      expect(within(card).getAllByLabelText(/Czas/)).toHaveLength(3);
      expect(warmupRowLabel(card)).toBeTruthy();
      expect(within(card).getByText('1')).toBeTruthy();
      expect(within(card).getByText('2')).toBeTruthy();
    });

    it('odhaczona seria jest odróżnialna od nieodhaczonej (aria-label przełącznika)', () => {
      const sets: SetData[] = [workingSet({ weight: 60, reps: 8, completed: true }), workingSet({ weight: 60, reps: 8 })];
      const { card } = renderCard({ savedSets: sets });
      expect(within(card).getAllByRole('button', { name: /Odznacz/i })).toHaveLength(1);
      expect(within(card).getAllByRole('button', { name: /Odhacz|Zaznacz/i }).length).toBeGreaterThanOrEqual(1);
    });

    it('nagłówek karty jest pierwszy w karcie', () => {
      const { card } = renderCard({ savedSets: [workingSet({ weight: 60, reps: 8 })] });
      const header = card.querySelector('.exercise-card-header') as HTMLElement;
      expect(header).toBeTruthy();
      expect(domIndex(card, header)).toBeLessThan(domIndex(card, columnHeader(card, 'Set')));
    });

    it('przycisk "Dodaj serię" istnieje w trybie edycji i znika bez edycji', () => {
      const { card } = renderCard({ savedSets: [workingSet()] });
      expect(addSetButton(card)).toBeTruthy();

      const readonly = renderCard({ savedSets: [workingSet()], isEditable: false });
      expect(within(readonly.card).queryByRole('button', { name: /Dodaj serię/i })).toBeNull();
    });
  });

  describe('stan PRZED X17A: to zmieniamy w Z128-Z129', () => {
    it('Z128.1: wiersz rozgrzewkowy renderuje się PRZED nagłówkami kolumn (do odwrócenia)', () => {
      const sets: SetData[] = [
        workingSet({ isWarmup: true, weight: 20, reps: 10 }),
        workingSet({ weight: 60, reps: 8 }),
      ];
      const { card } = renderCard({ savedSets: sets });
      expect(domIndex(card, warmupRowLabel(card))).toBeLessThan(domIndex(card, columnHeader(card, 'Set')));
    });

    it('Z128.2: miniatura rysuje się także BEZ animacji (pusty kwadrat — do usunięcia)', () => {
      const { card } = renderCard({ savedSets: [workingSet()] });
      const header = card.querySelector('.exercise-card-header') as HTMLElement;
      // Ćwiczenie bez animacji: przycisk miniatury i tak jest w DOM (disabled).
      const thumb = header.querySelector('button[disabled]');
      expect(thumb).toBeTruthy();
    });

    it('Z128.2: instrukcje renderują się na stałe w karcie (do przeniesienia w menu ⋯)', () => {
      const { card } = renderCard({ savedSets: [workingSet()] });
      expect(within(card).getByText(/Łopatki ściągnięte/)).toBeTruthy();
    });

    it('Z129.1: "Dodaj serię" jest w stopce PO chipach, nie pod wierszami serii (do przeniesienia)', () => {
      const { card } = renderCard({ savedSets: [workingSet({ weight: 60, reps: 8 })], onMetricsChange: vi.fn() });
      const metricsChip = within(card).getByRole('button', { name: 'Metryki' });
      // Dziś: przycisk i chipy są w jednym rzędzie stopki, poniżej całej tabeli serii.
      expect(domIndex(card, addSetButton(card))).toBeLessThan(domIndex(card, metricsChip));
      const lastRepsInput = within(card).getAllByLabelText(/Powt\./).at(-1) as HTMLElement;
      expect(domIndex(card, lastRepsInput)).toBeLessThan(domIndex(card, addSetButton(card)));
    });
  });
});
