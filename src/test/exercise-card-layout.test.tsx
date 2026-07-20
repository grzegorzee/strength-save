import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

// Mapa animacji jest dziś pusta (żadne ćwiczenie nie ma pliku) — mock pozwala
// przetestować OBIE gałęzie miniatury: z animacją i bez.
vi.mock('@/lib/exercise-media', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/exercise-media')>();
  return {
    ...actual,
    getExerciseAnimationUrl: (name?: string) =>
      name === 'Ćwiczenie z animacją' ? 'https://example.test/anim.mp4' : null,
  };
});

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

  describe('Z128.2: odchudzony nagłówek', () => {
    it('bez animacji nie ma miniatury (dziś pusty kwadrat 92×72 z ikoną hantla)', () => {
      const { card } = renderCard({ savedSets: [workingSet()] });
      const header = card.querySelector('.exercise-card-header') as HTMLElement;
      expect(header.querySelector('button[disabled]')).toBeNull();
      expect(header.querySelector('video')).toBeNull();
    });

    it('z animacją miniatura jest i otwiera podgląd', () => {
      const { card } = renderCard({ savedSets: [workingSet()], exercise: exercise({ name: 'Ćwiczenie z animacją' }) });
      const header = card.querySelector('.exercise-card-header') as HTMLElement;
      const thumb = within(header).getByRole('button', { name: /animacj/i });
      expect(thumb).toBeTruthy();
      expect(header.querySelector('video')).toBeTruthy();
    });

    it('instrukcje nie renderują się w karcie (idą do menu ⋯)', () => {
      const { card } = renderCard({ savedSets: [workingSet()] });
      expect(within(card).queryByText(/Łopatki ściągnięte/)).toBeNull();
    });

    it('karta nie używa martwej klasy .exercise-card-divider', () => {
      const { card } = renderCard({ savedSets: [workingSet()], onMetricsChange: vi.fn() });
      expect(card.querySelectorAll('.exercise-card-divider')).toHaveLength(0);
    });

    it('metadane (cel + ostatnia notatka) zostają w nagłówku', () => {
      const { card } = renderCard({ savedSets: [workingSet()], lastNote: 'Bolało prawe ramię' });
      expect(within(card).getByText(/Bolało prawe ramię/)).toBeTruthy();
    });
  });

  describe('Z129.1: przycisk dodania serii', () => {
    it('"Dodaj serię" stoi bezpośrednio pod ostatnim wierszem serii, przed chipami', () => {
      const { card } = renderCard({ savedSets: [workingSet({ weight: 60, reps: 8 })], onMetricsChange: vi.fn() });
      const lastRepsInput = within(card).getAllByLabelText(/Powt\./).at(-1) as HTMLElement;
      const addSet = addSetButton(card);
      const metricsChip = within(card).getByRole('button', { name: 'Metryki' });

      expect(domIndex(card, lastRepsInput)).toBeLessThan(domIndex(card, addSet));
      expect(domIndex(card, addSet)).toBeLessThan(domIndex(card, metricsChip));
      // Pełna szerokość, w tym samym kontenerze co tabela serii.
      expect(addSet.className).toContain('w-full');
      expect(rowOf(lastRepsInput).parentElement).toBe(addSet.parentElement);
    });

    it('przy 10 seriach roboczych przycisk jest nieaktywny i podaje powód', () => {
      const sets: SetData[] = [
        workingSet({ isWarmup: true }),
        ...Array.from({ length: 10 }, () => workingSet({ weight: 60, reps: 8 })),
      ];
      const { card } = renderCard({ savedSets: sets });
      const addSet = addSetButton(card) as HTMLButtonElement;
      expect(addSet.disabled).toBe(true);
      expect(within(card).getByText(/Limit 10 serii/i)).toBeTruthy();
    });

    it('poniżej limitu przycisk jest aktywny i nie pokazuje powodu', () => {
      const { card } = renderCard({ savedSets: [workingSet({ weight: 60, reps: 8 })] });
      expect((addSetButton(card) as HTMLButtonElement).disabled).toBe(false);
      expect(within(card).queryByText(/Limit 10 serii/i)).toBeNull();
    });
  });

  describe('Z129.2: menu ⋯ i pasek chipów', () => {
    const openMenu = async (card: HTMLElement) => {
      const trigger = within(card).getByRole('button', { name: 'Więcej akcji' });
      fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
      fireEvent.click(trigger);
      return await screen.findByRole('menu');
    };

    it('menu zbiera rzadkie akcje ćwiczenia', async () => {
      const { card } = renderCard({
        savedSets: [workingSet()],
        onRequestSwap: vi.fn(),
        onSkip: vi.fn(),
        onPinnedNoteSave: vi.fn(),
      });
      const menu = await openMenu(card);
      for (const label of ['Instrukcje', 'Zamień ćwiczenie', 'Pomiń', 'Notatka', 'Przypnij notatkę']) {
        expect(within(menu).getByText(label)).toBeTruthy();
      }
    });

    it('„Pomiń" i „Zamień ćwiczenie" wołają callbacki z exerciseId', async () => {
      const onSkip = vi.fn();
      const onRequestSwap = vi.fn();
      const { card } = renderCard({ savedSets: [workingSet()], onSkip, onRequestSwap });

      fireEvent.click(within(await openMenu(card)).getByText('Pomiń'));
      expect(onSkip).toHaveBeenCalledWith('ex-1');

      fireEvent.click(within(await openMenu(card)).getByText('Zamień ćwiczenie'));
      expect(onRequestSwap).toHaveBeenCalledWith('ex-1');
    });

    it('„Instrukcje" pokazują treść, której nie ma na karcie', async () => {
      const { card } = renderCard({ savedSets: [workingSet()] });
      expect(within(card).queryByText(/Łopatki ściągnięte/)).toBeNull();
      fireEvent.click(within(await openMenu(card)).getByText('Instrukcje'));
      expect(await screen.findByText(/Łopatki ściągnięte/)).toBeTruthy();
    });

    it('bez callbacków swap/skip menu ich nie pokazuje (widok historyczny)', async () => {
      const { card } = renderCard({ savedSets: [workingSet()] });
      const menu = await openMenu(card);
      expect(within(menu).queryByText('Pomiń')).toBeNull();
      expect(within(menu).queryByText('Zamień ćwiczenie')).toBeNull();
      expect(within(menu).getByText('Instrukcje')).toBeTruthy();
    });

    it('pasek dolny ma trzy chipy z etykietami, bez chipu notatki', () => {
      const { card } = renderCard({
        savedSets: [workingSet({ weight: 60, reps: 8 })],
        onMetricsChange: vi.fn(),
      });
      const chips = within(card).getByTestId('exercise-card-chips');
      expect(within(chips).getByText('Rozgrzewka')).toBeTruthy();
      expect(within(chips).getByText('Talerze')).toBeTruthy();
      expect(within(chips).getByText('Metryki')).toBeTruthy();
      expect(within(chips).queryByText('Notatka')).toBeNull();
      expect(within(chips).getAllByRole('button')).toHaveLength(3);
    });

    it('POPRZ. pokazuje ciężar×powtórzenia z historii, a bez historii „pierwszy raz"', () => {
      const previousSets: SetData[] = [
        workingSet({ isWarmup: true, weight: 20, reps: 10 }),
        workingSet({ weight: 60, reps: 6, completed: true }),
      ];
      const { card } = renderCard({
        savedSets: [workingSet({ isWarmup: true }), workingSet(), workingSet()],
        previousSets,
      });
      // Seria 1 ma historię: format „60×6" (ciężar × powtórzenia).
      expect(within(card).getByText('60×6')).toBeTruthy();
      // Seria 2 historii nie ma — czytelny komunikat zamiast myślnika.
      expect(within(card).getAllByText('pierwszy raz').length).toBeGreaterThanOrEqual(1);
      expect(within(card).queryByText('6×60kg')).toBeNull();
    });

    it('usunięcie serii z danymi pyta o potwierdzenie, pustej nie', () => {
      const onSetsChange = vi.fn();
      const { card } = renderCard({
        savedSets: [workingSet({ isWarmup: true }), workingSet({ weight: 60, reps: 8 }), workingSet()],
        onSetsChange,
      });
      const removeButtons = within(card).getAllByRole('button', { name: /Usuń serię/i });

      // Pusta seria (ostatnia) — kasuje się od razu.
      fireEvent.click(removeButtons.at(-1) as HTMLElement);
      expect(onSetsChange).toHaveBeenCalledTimes(1);

      // Seria z danymi — najpierw dialog, dopiero potwierdzenie kasuje.
      onSetsChange.mockClear();
      fireEvent.click(removeButtons[1]);
      expect(onSetsChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Usuń' }));
      expect(onSetsChange).toHaveBeenCalledTimes(1);
    });

    it('przypięta notatka renderuje się w karcie tylko gdy istnieje', () => {
      const empty = renderCard({ savedSets: [workingSet()], onPinnedNoteSave: vi.fn() });
      expect(within(empty.card).queryByTestId('pinned-note-section')).toBeNull();

      const filled = renderCard({
        savedSets: [workingSet()],
        onPinnedNoteSave: vi.fn(),
        pinnedNote: { note: 'Uchwyt szeroki', updatedAt: 0 } as never,
      });
      expect(within(filled.card).getByTestId('pinned-note-section')).toBeTruthy();
      expect(within(filled.card).getByText('Uchwyt szeroki')).toBeTruthy();
    });
  });
});
