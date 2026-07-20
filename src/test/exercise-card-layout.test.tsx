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

/** Wiersz serii = najbliższy przodek-grid pola powtórzeń/czasu. */
const rowOf = (input: HTMLElement): HTMLElement => {
  const row = input.closest('div.grid');
  if (!row) throw new Error('Pole nie leży w wierszu serii');
  return row as HTMLElement;
};

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

  describe('Z128.1: hierarchia tabeli serii', () => {
    it('nagłówki kolumn renderują się PRZED wierszem rozgrzewkowym', () => {
      const sets: SetData[] = [
        workingSet({ isWarmup: true, weight: 20, reps: 10 }),
        workingSet({ weight: 60, reps: 8 }),
      ];
      const { card } = renderCard({ savedSets: sets });
      expect(domIndex(card, columnHeader(card, 'Set'))).toBeLessThan(domIndex(card, warmupRowLabel(card)));
    });

    it('rozgrzewka jest w tej samej tabeli co serie robocze, bez osobnego nagłówka sekcji', () => {
      const sets: SetData[] = [
        workingSet({ isWarmup: true, weight: 20, reps: 10 }),
        workingSet({ weight: 60, reps: 8 }),
      ];
      const { card } = renderCard({ savedSets: sets });
      // Badge „Rozgrzewka" znika — rolę oznaczenia przejmuje „W" w kolumnie SET.
      expect(within(card).queryByText('Rozgrzewka')).toBeNull();
      expect(warmupRowLabel(card)).toBeTruthy();
      // Wiersz W i wiersz roboczy 1 mają wspólnego rodzica (jedna tabela).
      const warmupRow = rowOf(within(card).getAllByLabelText(/Powt\./)[0] as HTMLElement);
      const workingRow = rowOf(within(card).getAllByLabelText(/Powt\./)[1] as HTMLElement);
      expect(warmupRow.parentElement).toBe(workingRow.parentElement);
    });

    it('ukończona seria ma wypełnione tło wiersza, nieukończona nie', () => {
      const sets: SetData[] = [
        workingSet({ isWarmup: true }),
        workingSet({ weight: 60, reps: 8, completed: true }),
        workingSet({ weight: 60, reps: 8 }),
      ];
      const { card } = renderCard({ savedSets: sets });
      const repsInputs = within(card).getAllByLabelText(/Powt\./) as HTMLElement[];
      const doneRow = rowOf(repsInputs[1]);
      const pendingRow = rowOf(repsInputs[2]);

      expect(doneRow.className).toContain('bg-primary/[0.06]');
      expect(pendingRow.className).not.toContain('bg-primary/[0.06]');
      // Aktywna (pierwsza nieukończona) zachowuje obrys, ukończona go nie ma.
      expect(pendingRow.className).toContain('ring-2');
      expect(doneRow.className).not.toContain('ring-2');
    });

    it('ukończona seria ma tło także na ścieżce renderTrackedSetRow (duration)', () => {
      const sets: SetData[] = [
        workingSet({ isWarmup: true }),
        workingSet({ durationSec: 60, completed: true }),
        workingSet({ durationSec: 60 }),
      ];
      const { card } = renderCard({ savedSets: sets, trackingType: 'duration' });
      const timeInputs = within(card).getAllByLabelText(/Czas/) as HTMLElement[];
      expect(rowOf(timeInputs[1]).className).toContain('bg-primary/[0.06]');
      expect(rowOf(timeInputs[2]).className).not.toContain('bg-primary/[0.06]');
    });

    it('złoto rozgrzewki jest na OBU ścieżkach renderu serii', () => {
      const legacy = renderCard({ savedSets: [workingSet({ isWarmup: true }), workingSet({ weight: 60, reps: 8 })] });
      const legacyWarmupReps = within(legacy.card).getAllByLabelText(/Powt\./)[0] as HTMLElement;
      expect(legacyWarmupReps.className).toContain('ec-warmup-gold-border');

      const tracked = renderCard({
        savedSets: [workingSet({ isWarmup: true }), workingSet({ durationSec: 60 })],
        trackingType: 'duration',
      });
      const trackedWarmupTime = within(tracked.card).getAllByLabelText(/Czas/)[0] as HTMLElement;
      expect(trackedWarmupTime.className).toContain('ec-warmup-gold-border');
    });
  });

  describe('stan PRZED X17A: to zmieniamy w Z128.2-Z129', () => {
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
