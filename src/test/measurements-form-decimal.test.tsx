import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { MeasurementsForm } from '@/components/MeasurementsForm';

// Z178: repro zgłoszenia — "82,4" w pomiarach ciała dawało Number("82,4")=NaN,
// walidacja odrzucała zapis i user nie mógł zapisać pomiaru z przecinkiem.

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

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

describe('MeasurementsForm — przecinek dziesiętny (Z178)', () => {
  it('"82,4" zapisuje się bez błędu walidacji', () => {
    const onSave = renderForm();
    fireEvent.change(screen.getByLabelText(/Waga/i), { target: { value: '82,4' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].weight).toBe(82.4);
  });

  it('nieparsowalne pole nadal blokuje zapis (walidacja, nie NaN w danych)', () => {
    const onSave = renderForm();
    fireEvent.change(screen.getByLabelText(/Waga/i), { target: { value: '82,,4' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });
});
