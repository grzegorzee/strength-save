import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ExercisePicker } from '@/components/ExercisePicker';
import type { LibraryExercise } from '@/data/exerciseLibrary';

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
    fireEvent.click(screen.getByRole('button', { name: 'Plecy' }));
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
});
