import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MeasurementsForm } from '@/components/MeasurementsForm';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { formatLocalDate } from '@/lib/utils';

vi.mock('@/components/PhotoCropDialog', () => ({
  PhotoCropDialog: ({ open, file, onCropped }: { open: boolean; file: File | null; onCropped: (file: Blob) => void }) =>
    open && file ? <button type="button" onClick={() => onCropped(file)}>Confirm crop</button> : null,
}));

const renderForm = (onSave: ReturnType<typeof vi.fn>) => render(
  <LanguageProvider><UnitProvider><MeasurementsForm onSave={onSave} photosEnabled /></UnitProvider></LanguageProvider>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  URL.createObjectURL = vi.fn(() => 'blob:measurement-recovery');
  URL.revokeObjectURL = vi.fn();
});

describe('measurement save recovery on slow or failed writes', () => {
  it('keeps the original date and photo through pending → failure → retry, blocking duplicate submits', async () => {
    let settle!: (result: { ok: boolean }) => void;
    const save = vi.fn().mockImplementationOnce(() => new Promise(resolve => { settle = resolve; }))
      .mockResolvedValueOnce({ ok: true });
    renderForm(save);
    const date = screen.getByLabelText('Data');
    fireEvent.change(date, { target: { value: '2025-01-15' } });
    fireEvent.change(screen.getByLabelText(/Waga/), { target: { value: '82,4' } });
    fireEvent.change(screen.getByTestId('measurement-photo-input'), {
      target: { files: [new File(['photo'], 'body.jpg', { type: 'image/jpeg' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm crop' }));
    const submit = screen.getByRole('button', { name: /Zapisz pomiary/ });
    const form = submit.closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(save).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    expect(date).toHaveValue('2025-01-15');
    expect(screen.getByRole('img')).toBeVisible();

    await act(async () => settle({ ok: false }));
    expect(submit).toBeEnabled();
    expect(date).toHaveValue('2025-01-15');
    expect(screen.getByLabelText(/Waga/)).toHaveValue('82,4');
    expect(screen.getByRole('img')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent(/spróbuj ponownie/i);

    fireEvent.click(submit);
    await waitFor(() => expect(date).toHaveValue(formatLocalDate(new Date())));
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1]).toEqual(save.mock.calls[0]);
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('recovers from a rejected save promise without losing input', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('network unavailable')).mockResolvedValueOnce({ ok: true });
    renderForm(save);
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2025-01-15' } });
    fireEvent.change(screen.getByLabelText(/Waga/), { target: { value: '80' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz pomiary/ }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/spróbuj ponownie/i));
    expect(screen.getByLabelText('Data')).toHaveValue('2025-01-15');
    fireEvent.click(screen.getByRole('button', { name: /Zapisz pomiary/ }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  });
});

describe('measurement validation explains how to recover', () => {
  it.each([['pl', 'Waga'], ['en', 'Weight']])('identifies and focuses the invalid field in %s', (language, fieldName) => {
    localStorage.setItem('app-language', language);
    const save = vi.fn();
    renderForm(save);
    const weight = screen.getByLabelText(new RegExp(fieldName));
    fireEvent.change(weight, { target: { value: '82,,4' } });
    fireEvent.submit(weight.closest('form')!);
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(fieldName);
    expect(screen.getByRole('alert')).toHaveTextContent('20');
    expect(screen.getByRole('alert')).toHaveTextContent('500');
    expect(weight).toHaveAttribute('aria-invalid', 'true');
    expect(weight).toHaveFocus();
    expect(weight).toHaveAccessibleDescription(screen.getByRole('alert').textContent!);
    fireEvent.change(weight, { target: { value: '82,4' } });
    expect(weight).not.toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('explains that an empty form needs a measurement or photo', () => {
    renderForm(vi.fn());
    fireEvent.click(screen.getByRole('button', { name: /Zapisz pomiary/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Wpisz co najmniej jeden pomiar lub dodaj zdjęcie/);
    expect(screen.getByLabelText(/Waga/)).toHaveFocus();
  });
});
