import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { MeasurementsForm } from '@/components/MeasurementsForm';

// T13a: opcjonalne zdjecie sylwetki w formularzu pomiarow.
// NIEZMIENNIK (zasada 5 CLAUDE.md): bez photosEnabled formularz zachowuje sie
// bajt w bajt jak dzis — zero sekcji zdjecia, identyczny payload w onSave.

const renderForm = (onSave = vi.fn(), photosEnabled?: boolean) => {
  render(
    <LanguageProvider>
      <UnitProvider>
        <MeasurementsForm latestMeasurement={undefined} onSave={onSave} photosEnabled={photosEnabled} />
      </UnitProvider>
    </LanguageProvider>,
  );
  return onSave;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  // jsdom nie ma URL.createObjectURL — stub pod podglad zdjecia.
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

describe('MeasurementsForm — zdjecie sylwetki (T13a)', () => {
  it('NIEZMIENNIK: bez photosEnabled brak sekcji zdjecia, payload jak dzis', () => {
    const onSave = renderForm();

    expect(screen.queryByTestId('measurement-photo-input')).toBeNull();

    fireEvent.change(screen.getByLabelText(/Waga/i), { target: { value: '82,4' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const [measurement, photoFile] = onSave.mock.calls[0];
    expect(measurement.weight).toBe(82.4);
    expect(measurement.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(photoFile).toBeUndefined();
  });

  it('z photosEnabled wybor pliku przekazuje File jako drugi argument onSave', () => {
    const onSave = renderForm(vi.fn(), true);
    const file = new File(['fake-image'], 'sylwetka.jpg', { type: 'image/jpeg' });

    fireEvent.change(screen.getByTestId('measurement-photo-input'), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText(/Waga/i), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].weight).toBe(80);
    expect(onSave.mock.calls[0][1]).toBe(file);
  });

  it('z photosEnabled zapis bez zdjecia nadal dziala (zdjecie tylko DOKLADA)', () => {
    const onSave = renderForm(vi.fn(), true);

    fireEvent.change(screen.getByLabelText(/Waga/i), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].weight).toBe(80);
    expect(onSave.mock.calls[0][1]).toBeUndefined();
  });

  it('usuniecie wybranego zdjecia przed zapisem wraca do zapisu bez fotki', () => {
    const onSave = renderForm(vi.fn(), true);
    const file = new File(['fake-image'], 'sylwetka.jpg', { type: 'image/jpeg' });

    fireEvent.change(screen.getByTestId('measurement-photo-input'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Usuń zdjęcie/i }));
    fireEvent.change(screen.getByLabelText(/Waga/i), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][1]).toBeUndefined();
  });
});
