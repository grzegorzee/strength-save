// X28 WP-A: kompaktowy dialog "Nowe własne ćwiczenie" (bez listy biblioteki).
// Formularz: nazwa (autoFocus) + Selecty kategorii/typu/trackingu + Switch masy ciała.
// Zapis jednym tapem po wpisaniu nazwy (reszta pól ma defaulty).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CreateCustomExerciseDialog } from '@/components/CreateCustomExerciseDialog';
import type { CustomExerciseInput } from '@/hooks/useCustomExercises';

const toastSpy = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

const renderDialog = (props: Partial<Parameters<typeof CreateCustomExerciseDialog>[0]> = {}) => {
  const onOpenChange = vi.fn();
  const onCreate = vi.fn(async (_input: CustomExerciseInput) => undefined as unknown);
  render(
    <LanguageProvider>
      <CreateCustomExerciseDialog open onOpenChange={onOpenChange} onCreate={onCreate} {...props} />
    </LanguageProvider>,
  );
  return { onOpenChange, onCreate };
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  toastSpy.mockReset();
});

describe('CreateCustomExerciseDialog (X28 WP-A)', () => {
  it('renderuje formularz od razu: pola widoczne, Zapisz disabled przy pustej nazwie', () => {
    renderDialog();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)')).toBeInTheDocument();
    expect(screen.getByTestId('custom-exercise-category')).toBeInTheDocument();
    expect(screen.getByTestId('custom-exercise-type')).toBeInTheDocument();
    expect(screen.getByTestId('custom-exercise-tracking')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeDisabled();

    // Zero listy biblioteki w dialogu — to formularz, nie picker.
    expect(screen.queryByText('Wyciskanie sztangi na ławce płaskiej')).toBeNull();
  });

  it('bez nadpisania max-h: DialogContent dziedziczy keyboard-aware max-h z ui/dialog', () => {
    renderDialog();
    const content = screen.getByRole('dialog');
    expect(content.className).not.toContain('max-h-[88vh]');
    expect(content.className).toContain('max-h-[calc(100dvh_-_var(--keyboard-inset');
  });

  it('wpisanie poprawnej nazwy odblokowuje Zapisz', () => {
    renderDialog();
    fireEvent.change(screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)'), {
      target: { value: 'Moje wyciskanie' },
    });
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeEnabled();
  });

  it('nazwa krótsza niż 2 znaki nie odblokowuje Zapisz', () => {
    renderDialog();
    fireEvent.change(screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)'), {
      target: { value: 'A' },
    });
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeDisabled();
  });

  it('submit woła onCreate z pełnym CustomExerciseInput (defaulty: chest, compound, bez BW, standard)', async () => {
    const { onCreate } = renderDialog();
    fireEvent.change(screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)'), {
      target: { value: '  Moje wyciskanie  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate).toHaveBeenCalledWith({
      name: 'Moje wyciskanie',
      category: 'chest',
      isBodyweight: false,
      type: 'compound',
    });
  });

  it('przełącznik masy ciała trafia do inputu zapisu', async () => {
    const { onCreate } = renderDialog();
    fireEvent.change(screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)'), {
      target: { value: 'Podciąganie moje' },
    });
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onCreate.mock.calls[0][0].isBodyweight).toBe(true);
  });

  it('sukces zapisu: toast potwierdzenia + onOpenChange(false)', async () => {
    const { onOpenChange } = renderDialog();
    fireEvent.change(screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)'), {
      target: { value: 'Moje wyciskanie' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ćwiczenie dodane' }));
  });

  it('błąd zapisu (offline): toast destructive, dialog ZOSTAJE otwarty z danymi', async () => {
    const onCreate = vi.fn(async () => { throw new Error('offline'); });
    const { onOpenChange } = renderDialog({ onCreate });
    const nameInput = screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)');
    fireEvent.change(nameInput, { target: { value: 'Moje wyciskanie' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }));

    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    ));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect((nameInput as HTMLInputElement).value).toBe('Moje wyciskanie');
  });

  it('defaultName wypełnia nazwę na starcie', () => {
    renderDialog({ defaultName: 'Z wyszukiwarki' });
    expect((screen.getByPlaceholderText('Nazwa ćwiczenia (min 2 znaki)') as HTMLInputElement).value)
      .toBe('Z wyszukiwarki');
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeEnabled();
  });
});
