import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
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
// Z171: removeSet raportuje stale-ref do client_errors — moduł ciągnie Firestore, więc mock.
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));

// Mapa animacji jest dziś pusta (żadne ćwiczenie nie ma pliku) — mock pozwala
// przetestować OBIE gałęzie miniatury: z animacją i bez.
vi.mock('@/lib/exercise-media', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/exercise-media')>();
  return {
    ...actual,
    getExerciseAnimationUrl: (name?: string) =>
      name === 'Ćwiczenie z animacją' ? 'https://example.test/anim.mp4' : null,
    // Z195: miniatura renderuje poster JPEG, nie <video>.
    getExercisePosterUrl: (name?: string) =>
      name === 'Ćwiczenie z animacją' ? 'https://example.test/anim.jpg' : null,
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
      // Z184: sanitizeSets niczego nie fabrykuje — zapis bez W renderuje się bez W.
      expect(within(card).getAllByLabelText(/Czas/)).toHaveLength(2);
      expect(within(card).getByText('1')).toBeTruthy();
      expect(within(card).getByText('2')).toBeTruthy();
    });

    it('odhaczona seria jest odróżnialna od nieodhaczonej (aria-label przełącznika)', () => {
      const sets: SetData[] = [workingSet({ weight: 60, reps: 8, completed: true }), workingSet({ weight: 60, reps: 8 })];
      const { card } = renderCard({ savedSets: sets });
      expect(within(card).getAllByRole('button', { name: /Odznacz/i })).toHaveLength(1);
      expect(within(card).getAllByRole('button', { name: /Odhacz|Zaznacz/i }).length).toBeGreaterThanOrEqual(1);
    });

    it('Z184: draft bez rozgrzewki nie wycieka fabrykatem W do onSetsChange po akcji usera', () => {
      const spy = vi.fn();
      const sets: SetData[] = [
        workingSet({ weight: 60, reps: 8 }),
        workingSet({ weight: 60, reps: 8 }),
      ];
      const { card } = renderCard({ savedSets: sets, onSetsChange: spy });

      // Akcja usera: odhaczenie pierwszej serii roboczej.
      fireEvent.click(within(card).getAllByRole('button', { name: /Odhacz|Zaznacz/i })[0]);

      const emitted = spy.mock.calls.at(-1)?.[1] as SetData[];
      expect(emitted).toHaveLength(2);
      expect(emitted.some(s => s.isWarmup)).toBe(false);
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

    it('z animacją miniatura jest (poster JPEG, zero <video> na liście — Z195) i otwiera podgląd', () => {
      const { card } = renderCard({ savedSets: [workingSet()], exercise: exercise({ name: 'Ćwiczenie z animacją' }) });
      const header = card.querySelector('.exercise-card-header') as HTMLElement;
      const thumb = within(header).getByRole('button', { name: /animacj/i });
      expect(thumb).toBeTruthy();
      const poster = header.querySelector('img') as HTMLImageElement;
      expect(poster).toBeTruthy();
      expect(poster.src).toContain('.jpg');
      expect(header.querySelector('video')).toBeNull();
    });

    it('instrukcje nie renderują się w karcie (idą do menu ⋯)', () => {
      const { card } = renderCard({ savedSets: [workingSet()] });
      expect(within(card).queryByText(/Łopatki ściągnięte/)).toBeNull();
    });

    it('Z196: pola serii mają px-1, a kolumna KG jest szersza niż POWT. (mieści "122.5")', () => {
      const { card } = renderCard({ savedSets: [workingSet({ weight: 122.5, reps: 8 })] });

      // px-1 zamiast dziedziczonego px-3 z bazowego Input (24 px poziomego paddingu
      // zjadało miejsce na trzecią cyfrę z połówką).
      const weightInput = within(card).getAllByLabelText(/Set 1, kg/)[0] as HTMLElement;
      const repsInput = within(card).getAllByLabelText(/Set 1, Powt\./)[0] as HTMLElement;
      expect(weightInput.className).toContain('px-1');
      expect(repsInput.className).toContain('px-1');

      // Kolumny weight_reps: PREV 0.9fr | KG 1.25fr | POWT 0.85fr; nagłówek używa
      // tego samego szablonu gridCols, więc wystarczy sprawdzić wszystkie gridy wierszy.
      const grids = Array.from(card.querySelectorAll('div.grid'));
      const withTemplate = grids.filter((g) => g.className.includes('grid-cols-[26px_minmax(0,0.9fr)_1.25fr_0.85fr_40px_44px]'));
      // Nagłówek + wiersz serii — minimum 2 gridy z nowym szablonem.
      expect(withTemplate.length).toBeGreaterThanOrEqual(2);
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

      // Z191: akcja odpala się klatkę PO zamknięciu menu (rAF) — stąd waitFor.
      fireEvent.click(within(await openMenu(card)).getByRole('menuitem', { name: 'Pomiń' }));
      await vi.waitFor(() => expect(onSkip).toHaveBeenCalledWith('ex-1'));

      fireEvent.click(within(await openMenu(card)).getByRole('menuitem', { name: 'Zamień ćwiczenie' }));
      await vi.waitFor(() => expect(onRequestSwap).toHaveBeenCalledWith('ex-1'));
    });

    it('„Instrukcje" pokazują treść, której nie ma na karcie', async () => {
      const { card } = renderCard({ savedSets: [workingSet()] });
      expect(within(card).queryByText(/Łopatki ściągnięte/)).toBeNull();
      fireEvent.click(within(await openMenu(card)).getByRole('menuitem', { name: 'Instrukcje' }));
      expect(await screen.findByText(/Łopatki ściągnięte/)).toBeTruthy();
    });

    it('Z191: klik "Instrukcje" zamyka menu PRZED otwarciem dialogu (koniec pointer-events lock)', async () => {
      const { card } = renderCard({ savedSets: [workingSet()] });
      fireEvent.click(within(await openMenu(card)).getByRole('menuitem', { name: 'Instrukcje' }));

      // Bezpośrednio po kliknięciu: menu zamknięte, a dialog JESZCZE nie istnieje —
      // otworzy się dopiero w następnej klatce (rAF), gdy warstwa menu zniknęła.
      // Stary kod otwierał dialog synchronicznie, POD żywą modalną warstwą menu,
      // która zostawiała body z pointer-events: none (X martwy, overlay martwy).
      expect(screen.queryByRole('menu')).toBeNull();
      expect(screen.queryByText(/Łopatki ściągnięte/)).toBeNull();

      // Po klatce dialog jest, menu nadal nie ma.
      expect(await screen.findByText(/Łopatki ściągnięte/)).toBeTruthy();
      expect(screen.queryByRole('menu')).toBeNull();
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

    it('usunięcie ODHACZONEJ serii pyta o potwierdzenie, pustej nie (Z171)', () => {
      const onSetsChange = vi.fn();
      const { card } = renderCard({
        savedSets: [workingSet({ isWarmup: true }), workingSet({ weight: 60, reps: 8, completed: true }), workingSet()],
        onSetsChange,
      });
      const removeButtons = within(card).getAllByRole('button', { name: /Usuń serię/i });

      // Pusta seria (ostatnia) — kasuje się od razu.
      fireEvent.click(removeButtons.at(-1) as HTMLElement);
      expect(onSetsChange).toHaveBeenCalledTimes(1);

      // Odhaczona seria — najpierw dialog, dopiero potwierdzenie kasuje.
      onSetsChange.mockClear();
      fireEvent.click(removeButtons[1]);
      expect(onSetsChange).not.toHaveBeenCalled();
      fireEvent.click(screen.getByTestId('remove-set-confirm'));
      expect(onSetsChange).toHaveBeenCalledTimes(1);
    });

    it('Z170: pointer down poza dialogiem potwierdzenia NIE zamyka go', async () => {
      const onSetsChange = vi.fn();
      const { card } = renderCard({
        savedSets: [workingSet({ isWarmup: true }), workingSet({ weight: 60, reps: 8, completed: true })],
        onSetsChange,
      });
      // Otwórz dialog przez X na serii z danymi (odhaczonej — Z171: tylko taka pyta).
      const removeButtons = within(card).getAllByRole('button', { name: /Usuń serię/i });
      fireEvent.click(removeButtons[1]);
      expect(screen.getByRole('button', { name: 'Usuń' })).toBeTruthy();
      // Radix podpina listener outside-dismiss w setTimeout(0) — bez ticka
      // event synchroniczny by go ominął i test nic by nie sprawdzał.
      await new Promise((r) => setTimeout(r, 0));

      // Na siłowni: klawiatura się chowa, dialog zjeżdża, tap ląduje w overlayu.
      // Destrukcyjne potwierdzenie NIE MOŻE zamknąć się od takiego tapnięcia.
      // (Na dotyku Radix domyka dopiero na click po pointerdown — emitujemy oba.)
      fireEvent.pointerDown(document.body, { pointerType: 'touch' });
      fireEvent.click(document.body);
      expect(screen.queryByRole('button', { name: 'Usuń' })).toBeTruthy();
      expect(onSetsChange).not.toHaveBeenCalled();
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

  describe('Z171: usuwanie po referencji + dialog tylko dla realnych danych', () => {
    /** Rodzic kontrolowany: oddaje savedSets z karty z powrotem do niej (round-trip jak draft). */
    const ControlledCard = ({ initialSets, spy }: { initialSets: SetData[]; spy: ReturnType<typeof vi.fn> }) => {
      const [sets, setSets] = useState<SetData[]>(initialSets);
      return (
        <MemoryRouter>
          <LanguageProvider>
            <UnitProvider>
              <ExerciseCard
                exercise={exercise()}
                index={1}
                savedSets={sets}
                onSetsChange={(id, next, notes) => {
                  spy(id, next, notes);
                  setSets(next);
                }}
              />
            </UnitProvider>
          </LanguageProvider>
        </MemoryRouter>
      );
    };

    it('świeża seria z "Dodaj serię" (prefill) kasuje się bez dialogu i znika DOKŁADNIE ona', () => {
      const spy = vi.fn();
      const { container } = render(
        <ControlledCard
          initialSets={[
            workingSet({ isWarmup: true, weight: 20, reps: 10 }),
            workingSet({ weight: 60, reps: 8 }),
            workingSet({ weight: 60, reps: 8 }),
          ]}
          spy={spy}
        />,
      );
      const card = container.querySelector('.exercise-card') as HTMLElement;

      fireEvent.click(within(card).getByRole('button', { name: /Dodaj serię/i }));
      expect(within(card).getAllByLabelText(/Powt\./)).toHaveLength(4);

      // X na świeżej (prefillowanej) serii: BEZ dialogu, natychmiastowe usunięcie.
      const removeButtons = within(card).getAllByRole('button', { name: /Usuń serię/i });
      fireEvent.click(removeButtons.at(-1) as HTMLElement);
      expect(screen.queryByTestId('remove-set-confirm')).toBeNull();

      const lastSets = spy.mock.calls.at(-1)?.[1] as SetData[];
      expect(lastSets).toHaveLength(3);
      expect(lastSets.map((s) => ({ w: s.weight, r: s.reps, warm: !!s.isWarmup }))).toEqual([
        { w: 20, r: 10, warm: true },
        { w: 60, r: 8, warm: false },
        { w: 60, r: 8, warm: false },
      ]);
      expect(within(card).getAllByLabelText(/Powt\./)).toHaveLength(3);
    });

    it('podmiana savedSets między otwarciem dialogu a USUŃ nie kasuje złej serii', () => {
      const spy = vi.fn();
      const ui = (sets: SetData[]) => (
        <MemoryRouter>
          <LanguageProvider>
            <UnitProvider>
              <ExerciseCard exercise={exercise()} index={1} savedSets={sets} onSetsChange={spy} />
            </UnitProvider>
          </LanguageProvider>
        </MemoryRouter>
      );
      const view = render(ui([
        workingSet({ isWarmup: true }),
        workingSet({ weight: 60, reps: 8, completed: true }),
        workingSet({ weight: 62.5, reps: 6 }),
      ]));

      // Dialog na odhaczonej serii nr 1.
      const removeButtons = screen.getAllByRole('button', { name: /Usuń serię/i });
      fireEvent.click(removeButtons[1]);
      expect(screen.getByTestId('remove-set-confirm')).toBeTruthy();

      // Symulacja hydracji draftu: NOWE obiekty + dodatkowa seria na początku roboczych.
      view.rerender(ui([
        workingSet({ isWarmup: true }),
        workingSet({ weight: 100, reps: 1, completed: true }),
        workingSet({ weight: 60, reps: 8, completed: true }),
        workingSet({ weight: 62.5, reps: 6 }),
      ]));

      // Otwarty dialog nie może przeżyć podmiany sets; jeśli przeżył (stary kod),
      // klik USUŃ skasowałby serię pod ZŁYM indeksem.
      const confirm = screen.queryByTestId('remove-set-confirm');
      if (confirm) fireEvent.click(confirm);
      expect(spy).not.toHaveBeenCalled();
      expect(screen.queryByTestId('remove-set-confirm')).toBeNull();
    });

    it('seria z wagą wpisaną w tej sesji pyta o potwierdzenie (dotknięta = realne dane)', () => {
      const onSetsChange = vi.fn();
      const { card } = renderCard({
        savedSets: [workingSet({ isWarmup: true }), workingSet()],
        onSetsChange,
      });
      const weightInput = within(card).getAllByLabelText(/kg$/i).at(-1) as HTMLElement;
      fireEvent.change(weightInput, { target: { value: '80' } });

      onSetsChange.mockClear();
      const removeButtons = within(card).getAllByRole('button', { name: /Usuń serię/i });
      fireEvent.click(removeButtons.at(-1) as HTMLElement);
      expect(screen.getByTestId('remove-set-confirm')).toBeTruthy();
      expect(onSetsChange).not.toHaveBeenCalled();
    });
  });
});
