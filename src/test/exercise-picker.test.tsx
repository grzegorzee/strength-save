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

  it('chip kategorii zawęża listę', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Plecy' }));
    expect(screen.getByText('Wiosłowanie hantlami na ławce (przodem)')).toBeTruthy();
    expect(screen.queryByText('Wyciskanie sztangi na ławce płaskiej')).toBeNull();
  });

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
});
