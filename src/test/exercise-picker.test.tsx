import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ExercisePicker } from '@/components/ExercisePicker';
import type { LibraryExercise } from '@/data/exerciseLibrary';

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ toast: toastMock, useToast: () => ({ toast: toastMock }) }));
const reportErrorMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/global-error-telemetry', () => ({ reportClientErrorWithCurrentUid: reportErrorMock }));

// Ten pakiet sprawdza zachowanie pickera, nie kompletność ~300-elementowej
// biblioteki (ją chronią exercise-i18n-coverage/static i exercise-utils). Pełna
// lista mnożyła każdy render przez setki węzłów i pod coverage blokowała workera
// CI na >70 s. Reprezentatywne ćwiczenia zachowują filtrowanie PL/EN i kategorii.
vi.mock('@/data/exerciseLibrary', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/exerciseLibrary')>();
  const fixtureNames = new Set([
    'Wyciskanie sztangi na ławce płaskiej',
    'Przysiad ze sztangą (High Bar)',
    'Wiosłowanie hantlami na ławce (przodem)',
  ]);
  return {
    ...actual,
    exerciseLibrary: actual.exerciseLibrary.filter((exercise) => fixtureNames.has(exercise.name)),
  };
});

// Kanoniczne nazwy ćwiczeń są PL — testujemy z językiem UI PL (jsdom domyślnie wykrywa EN).
beforeEach(() => {
  localStorage.setItem('app-language', 'pl');
});

const renderPicker = (props: Partial<Parameters<typeof ExercisePicker>[0]> = {}) => {
  const onPick = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <LanguageProvider>
      <ExercisePicker open onOpenChange={onOpenChange} onPick={onPick} {...props} />
    </LanguageProvider>,
  );
  return { onPick, onOpenChange };
};

describe('ExercisePicker (Z69)', () => {
  it('renderuje listę ćwiczeń z biblioteki', () => {
    renderPicker();
    expect(screen.getByText('Wyciskanie sztangi na ławce płaskiej')).toBeTruthy();
    expect(screen.getByText('Przysiad ze sztangą (High Bar)')).toBeTruthy();
  });

  it('filtruje po nazwie PL (bez polskich znaków)', () => {
    renderPicker();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'wioslowanie' } });
    expect(screen.getByText('Wiosłowanie hantlami na ławce (przodem)')).toBeTruthy();
    expect(screen.queryByText('Wyciskanie sztangi na ławce płaskiej')).toBeNull();
  });

  it('filtruje po nazwie EN', () => {
    renderPicker();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'bench press' } });
    expect(screen.getByText('Wyciskanie sztangi na ławce płaskiej')).toBeTruthy();
    expect(screen.queryByText('Przysiad ze sztangą (High Bar)')).toBeNull();
  });

  // 30 s: re-render pelnej biblioteki cwiczen pod coverage na runnerze CI
  // potrafi przekroczyc domyslne 15 s (lokalnie test schodzi w <1 s).
  it('chip kategorii zawęża listę', () => {
    renderPicker();
    // X35a WP-A: 9 kafli (Wszystkie + 8 partii) w siatce 3x3, bez przewijania w bok.
    const grid = screen.getByTestId('picker-category-grid');
    expect(grid.className).toContain('grid-cols-3');
    expect(grid.className).not.toContain('overflow-x');
    expect(grid.querySelectorAll('button[aria-pressed]')).toHaveLength(9);
    expect(screen.getByRole('button', { name: 'Wszystkie' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Plecy' }));
    expect(screen.getByRole('button', { name: 'Plecy' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Wiosłowanie hantlami na ławce (przodem)')).toBeTruthy();
    expect(screen.queryByText('Wyciskanie sztangi na ławce płaskiej')).toBeNull();
  }, 30000);

  it('excludeNames ukrywa pozycję', () => {
    renderPicker({ excludeNames: ['Wyciskanie sztangi na ławce płaskiej'] });
    expect(screen.queryByText('Wyciskanie sztangi na ławce płaskiej')).toBeNull();
    expect(screen.getByText('Przysiad ze sztangą (High Bar)')).toBeTruthy();
  });

  it('tapnięcie pozycji woła onPick z ćwiczeniem i zamyka dialog', () => {
    const { onPick, onOpenChange } = renderPicker();
    fireEvent.click(screen.getByText('Wyciskanie sztangi na ławce płaskiej'));
    expect(onPick).toHaveBeenCalledTimes(1);
    const picked = onPick.mock.calls[0][0] as LibraryExercise;
    expect(picked.name).toBe('Wyciskanie sztangi na ławce płaskiej');
    expect(picked.category).toBe('chest');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renderFooter: tapnięcie zaznacza pozycję, footer dostaje wybór, onPick nie odpala', () => {
    const footer = vi.fn((picked: LibraryExercise) => <p>footer-{picked.name}</p>);
    const { onPick } = renderPicker({ renderFooter: footer });
    fireEvent.click(screen.getByText('Wyciskanie sztangi na ławce płaskiej'));
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByText('footer-Wyciskanie sztangi na ławce płaskiej')).toBeTruthy();
  });

  // X28 WP-A: przy klawiaturze iOS max-h-[88vh] nadpisywało (tailwind-merge)
  // keyboard-aware max-h z ui/dialog i góra dialogu wyjeżdżała poza ekran.
  it('DialogContent bez nadpisania max-h — dziedziczy keyboard-aware z ui/dialog', () => {
    renderPicker();
    const content = screen.getByRole('dialog');
    expect(content.className).not.toContain('max-h-[88vh]');
    expect(content.className).toContain('max-h-[calc(100dvh_-_var(--keyboard-inset');
  });

  it('nie otwiera klawiatury automatycznie, a podczas szukania daje jawne schowanie', () => {
    renderPicker();
    const search = screen.getByPlaceholderText('Szukaj ćwiczenia...');
    expect(search).not.toHaveFocus();

    fireEvent.focus(search);
    expect(screen.getByRole('button', { name: 'Ukryj klawiaturę' })).toBeTruthy();
    expect(screen.getByTestId('picker-category-grid')).toHaveClass('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Ukryj klawiaturę' }));
    expect(search).not.toHaveFocus();
    expect(screen.getByTestId('picker-category-grid')).not.toHaveClass('hidden');
  });

  it('scroll formularza może się skurczyć nad klawiaturą, więc CTA pozostaje osiągalne', () => {
    renderPicker({ onCreateCustomExercise: vi.fn() });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj własne ćwiczenie' }));
    const scroll = screen.getByTestId('exercise-picker-scroll');
    expect(scroll.className).toContain('min-h-0');
    expect(scroll.className).toContain('overflow-y-auto');
    expect(scroll.contains(screen.getByRole('button', { name: 'Zapisz i wybierz' }))).toBe(true);
  });

  // X28 WP-A: przycisk "Dodaj własne" NAD scrollowaną listą ~200 pozycji —
  // widoczny bez scrollowania niezależnie od długości listy.
  it('przycisk "Dodaj własne ćwiczenie" renderuje się POZA scrollowanym kontenerem listy', () => {
    renderPicker({ onCreateCustomExercise: vi.fn() });
    const button = screen.getByRole('button', { name: 'Dodaj własne ćwiczenie' });
    const scroll = screen.getByText('Wyciskanie sztangi na ławce płaskiej').closest('.overflow-y-auto');
    expect(scroll).toBeTruthy();
    expect(scroll!.contains(button)).toBe(false);
  });

  // 30 s: klik wymusza re-render pełnej biblioteki (jak test chipa kategorii wyżej);
  // pod pełnym biegiem suite'u domyślne 15 s potrafi nie wystarczyć.
  it('tapnięcie "Dodaj własne ćwiczenie" otwiera formularz inline (flow pickera bez zmian)', () => {
    renderPicker({ onCreateCustomExercise: vi.fn() });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj własne ćwiczenie' }));
    expect(screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Zapisz i wybierz' })).toBeTruthy();
  }, 30000);

  // Bug 54 (X30): błąd zapisu własnego ćwiczenia był ŁYKANY po cichu (pusty
  // catch): spinner znikał, zero komunikatu, zero śladu w client_errors —
  // naruszenie zasady 6 (stan błędu bez informującego wyjścia). Konwencja
  // jak CreateCustomExerciseDialog: destructive toast + telemetria.
  it('błąd zapisu własnego ćwiczenia: destructive toast + telemetria, formularz zostaje', async () => {
    toastMock.mockClear();
    reportErrorMock.mockClear();
    const onCreate = vi.fn(async () => { throw new Error('permission-denied'); });
    renderPicker({ onCreateCustomExercise: onCreate });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj własne ćwiczenie' }));
    fireEvent.change(screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)'), { target: { value: 'Moje ćwiczenie' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz i wybierz' }));

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' })));
    expect(reportErrorMock).toHaveBeenCalledWith(expect.objectContaining({ code: 'custom-exercise-save' }));
    // Wyjście dla usera: formularz z danymi zostaje (ponów/anuluj), przycisk odblokowany.
    expect((screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)') as HTMLInputElement).value).toBe('Moje ćwiczenie');
    expect((screen.getByRole('button', { name: 'Zapisz i wybierz' }) as HTMLButtonElement).disabled).toBe(false);
  }, 30000);

  it('udany zapis własnego ćwiczenia: bez toastu błędu, picker wybiera ćwiczenie (stary przepływ)', async () => {
    toastMock.mockClear();
    const created = { id: 'c1', name: 'Moje ćwiczenie', category: 'chest', type: 'compound', isBodyweight: false };
    const onCreate = vi.fn(async () => created);
    const { onPick } = renderPicker({ onCreateCustomExercise: onCreate as never });
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj własne ćwiczenie' }));
    fireEvent.change(screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)'), { target: { value: 'Moje ćwiczenie' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz i wybierz' }));

    await waitFor(() => expect(onPick).toHaveBeenCalledWith(created));
    expect(toastMock).not.toHaveBeenCalled();
  }, 30000);

  // Bug 54: Firestore potrafi pozostawić Promise zapisu w stanie pending przy
  // słabym internecie. UI musi odzyskać sterowanie bez ponowienia tego samego
  // zapisu (duplikatu), a późne powodzenie nadal ma wybrać ćwiczenie.
  it('zapis pending: po timeout pokazuje status, ponowne kliknięcie nie duplikuje zapisu, późny sukces kończy flow', async () => {
    vi.useFakeTimers();
    toastMock.mockClear();
    reportErrorMock.mockClear();
    let resolveCreate!: (value: {
      id: string;
      name: string;
      category: 'chest';
      type: 'compound';
      isBodyweight: false;
    }) => void;
    const onCreate = vi.fn(() => new Promise((resolve) => { resolveCreate = resolve; }));

    try {
      const { onPick } = renderPicker({ onCreateCustomExercise: onCreate as never });
      fireEvent.click(screen.getByRole('button', { name: 'Dodaj własne ćwiczenie' }));
      fireEvent.change(screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)'), { target: { value: 'Offline press' } });
      fireEvent.click(screen.getByRole('button', { name: 'Zapisz i wybierz' }));
      expect(onCreate).toHaveBeenCalledTimes(1);

      await act(async () => { await vi.advanceTimersByTimeAsync(8_000); });
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Zapis nadal trwa',
      }));
      const retryButton = screen.getByRole('button', { name: 'Sprawdź zapis' });
      expect(retryButton).not.toBeDisabled();

      fireEvent.click(retryButton);
      expect(onCreate).toHaveBeenCalledTimes(1);

      const created = { id: 'offline-1', name: 'Offline press', category: 'chest' as const, type: 'compound' as const, isBodyweight: false as const };
      await act(async () => { resolveCreate(created); });
      expect(onPick).toHaveBeenCalledWith(created);
    } finally {
      vi.useRealTimers();
    }
  }, 30000);
});
