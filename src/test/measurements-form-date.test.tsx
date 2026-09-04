import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { MeasurementsForm } from '@/components/MeasurementsForm';
import { addCalendarDays, formatLocalDate } from '@/lib/utils';

// Data pomiaru przy DODAWANIU (migracja starych metryk z innych apek).
// NIEZMIENNIK (zasada 5): domyślna data = dziś i payload dla dzisiejszego
// wpisu jest bajt w bajt jak przed zmianą (bez recordedAt: hook wpisuje
// Date.now()). Data wsteczna trafia do onSave, przyszła blokuje zapis.

const renderForm = (onSave = vi.fn()) => {
  render(
    <LanguageProvider>
      <UnitProvider>
        <MeasurementsForm latestMeasurement={undefined} onSave={onSave} />
      </UnitProvider>
    </LanguageProvider>,
  );
  return onSave;
};

const today = () => formatLocalDate(new Date());
const dateInput = () => screen.getByLabelText(/^Data$/i) as HTMLInputElement;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('MeasurementsForm — data pomiaru', () => {
  it('pole daty: natywny input type=date, domyślnie dziś, max = dziś', () => {
    renderForm();
    const input = dateInput();
    expect(input.type).toBe('date');
    expect(input.value).toBe(today());
    expect(input.max).toBe(today());
  });

  it('NIEZMIENNIK: bez zmiany daty payload = dziś, bez recordedAt (hook wpisuje zegar)', () => {
    const onSave = renderForm();
    fireEvent.change(screen.getByLabelText(/Waga/i), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const [measurement] = onSave.mock.calls[0];
    expect(measurement.date).toBe(today());
    expect(measurement.weight).toBe(80);
    expect('recordedAt' in measurement).toBe(false);
  });

  it('data wsteczna trafia do onSave, a recordedAt leży w tym samym dniu', () => {
    const onSave = renderForm();
    fireEvent.change(dateInput(), { target: { value: '2025-01-15' } });
    fireEvent.change(screen.getByLabelText(/Waga/i), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(onSave).toHaveBeenCalledTimes(1);
    const [measurement] = onSave.mock.calls[0];
    expect(measurement.date).toBe('2025-01-15');
    expect(typeof measurement.recordedAt).toBe('number');
    expect(formatLocalDate(new Date(measurement.recordedAt))).toBe('2025-01-15');
  });

  it('data z przyszłości blokuje zapis z komunikatem', () => {
    const onSave = renderForm();
    fireEvent.change(dateInput(), { target: { value: addCalendarDays(today(), 1) } });
    fireEvent.change(screen.getByLabelText(/Waga/i), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(screen.getByRole('alert').textContent).toBe('Data pomiaru nie może być z przyszłości.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('pusta data blokuje zapis z komunikatem', () => {
    const onSave = renderForm();
    fireEvent.change(dateInput(), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Waga/i), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(screen.getByRole('alert').textContent).toBe('Podaj poprawną datę pomiaru.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('po zapisie data wraca do dziś (kolejny wpis nie dziedziczy wstecznej daty)', () => {
    const onSave = renderForm();
    fireEvent.change(dateInput(), { target: { value: '2025-01-15' } });
    fireEvent.change(screen.getByLabelText(/Waga/i), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(dateInput().value).toBe(today());
  });

  it('błąd pola liczbowego nadal daje ogólny komunikat (nie komunikat daty)', () => {
    const onSave = renderForm();
    fireEvent.change(screen.getByLabelText(/Waga/i), { target: { value: '82,,4' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(screen.getByRole('alert').textContent).toBe('Nie udało się zapisać pomiarów.');
    expect(onSave).not.toHaveBeenCalled();
  });
});
