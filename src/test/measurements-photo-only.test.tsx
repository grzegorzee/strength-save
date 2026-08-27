import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { MeasurementsForm } from '@/components/MeasurementsForm';
import type { BodyMeasurement } from '@/types';

// WP-D D2/D5: wpis tylko-zdjęcie — zdjęcie można zapisać BEZ żadnego pola
// liczbowego (formularz) ORAZ niezależnym przyciskiem "Dodaj zdjęcie" na
// stronie Pomiarów. Zdjęcie jest pełnoprawną treścią pomiaru (before/after).
// PhotoCropDialog zamockowany: auto-potwierdza kadr oryginałem pliku
// (interakcje croppera testuje photo-crop.test.tsx).

vi.mock('@/components/PhotoCropDialog', () => ({
  PhotoCropDialog: ({ open, file, onCropped }: {
    open: boolean;
    file: File | null;
    onCropped: (blob: Blob) => void;
  }) => (
    open && file ? (
      <button type="button" data-testid="mock-crop-confirm" onClick={() => onCropped(file)}>
        crop
      </button>
    ) : null
  ),
}));

// Mocki pod render całej strony Pomiarów (WP-D D5).
const pageMocks = vi.hoisted(() => ({
  measurements: [] as unknown[],
  measurementError: null as string | null,
  retryMeasurements: vi.fn(),
  addMeasurement: vi.fn(async (m: Record<string, unknown>) => ({ measurement: { id: 'new', userId: 'u1', ...m } })),
  toast: vi.fn(),
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', canUseBodyPhotos: true, isAdmin: false }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    measurements: pageMocks.measurements,
    measurementError: pageMocks.measurementError,
    retryMeasurements: pageMocks.retryMeasurements,
    addMeasurement: pageMocks.addMeasurement,
    getLatestMeasurement: () => undefined,
  }),
}));
vi.mock('@/hooks/useHealthConsent', () => ({ useHealthConsent: () => true }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: pageMocks.toast }) }));
vi.mock('@/lib/firebase', () => ({ storage: {}, db: {} }));
vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn(async () => ({})),
  getDownloadURL: vi.fn(async () => 'https://example.test/photo.jpg?token=x'),
}));
vi.mock('@/lib/image-compress', () => ({
  compressImage: vi.fn(async (file: Blob) => file),
}));
vi.mock('@/components/MeasurementTrendChart', () => ({ default: () => null }));
vi.mock('@/components/HealthWeightSuggestion', () => ({ HealthWeightSuggestion: () => null }));

import Measurements from '@/pages/Measurements';

const photoMeasurement = (id: string, date: string): BodyMeasurement => ({
  id,
  userId: 'u1',
  date,
  photoUrl: `https://example.test/${id}.jpg?token=x`,
  photoPath: `body-photos/u1/${id}.jpg`,
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <Measurements />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

const renderForm = (onSave = vi.fn()) => {
  render(
    <LanguageProvider>
      <UnitProvider>
        <MeasurementsForm latestMeasurement={undefined} onSave={onSave} photosEnabled />
      </UnitProvider>
    </LanguageProvider>,
  );
  return onSave;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
  pageMocks.measurements = [];
  pageMocks.measurementError = null;
  pageMocks.retryMeasurements.mockClear();
  pageMocks.addMeasurement.mockClear();
  pageMocks.toast.mockClear();
});

describe('MeasurementsForm — wpis tylko-zdjęcie (WP-D D2)', () => {
  it('zapis z samym zdjęciem (zero pól liczbowych) woła onSave z photo, bez NaN', () => {
    const onSave = renderForm();
    const file = new File(['fake-image'], 'sylwetka.jpg', { type: 'image/jpeg' });

    fireEvent.change(screen.getByTestId('measurement-photo-input'), { target: { files: [file] } });
    fireEvent.click(screen.getByTestId('mock-crop-confirm'));
    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const [measurement, photoFile] = onSave.mock.calls[0];
    expect(measurement.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Żadne pole liczbowe nie jest NaN ani fabrykowane.
    for (const [key, value] of Object.entries(measurement)) {
      if (key === 'date') continue;
      expect(value, `pole ${key}`).toBeUndefined();
    }
    expect(photoFile).toBeInstanceOf(File);
  });

  it('zapis bez zdjęcia i bez pól nadal odrzucony (walidacja z wyjściem)', () => {
    const onSave = renderForm();

    fireEvent.click(screen.getByRole('button', { name: /Zapisz/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});

describe('Measurements — sekcja zdjęć i porównania (WP-D D5)', () => {
  it('bug 40: błąd listenera jest widoczny i ma działającą akcję ponowienia', () => {
    pageMocks.measurementError = 'permission-denied';
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(/Nie udało się wczytać pomiarów/i);
    fireEvent.click(screen.getByRole('button', { name: /Spróbuj ponownie/i }));
    expect(pageMocks.retryMeasurements).toHaveBeenCalledTimes(1);
  });

  it('0 zdjęć: przycisk "Dodaj zdjęcie" + zachęta compareEmpty, bez porównania', () => {
    renderPage();

    expect(screen.getByTestId('measurements-add-photo')).toBeInTheDocument();
    expect(screen.getByText(/Dodaj pierwsze zdjęcie sylwetki/)).toBeInTheDocument();
    expect(screen.queryByTestId('body-photo-compare')).toBeNull();
  });

  it('1 zdjęcie: zachęta "dodaj drugie, aby porównać" widoczna', () => {
    pageMocks.measurements = [photoMeasurement('m1', '2026-08-01')];
    renderPage();

    expect(screen.getByText(/Dodaj drugie, aby zobaczyć porównanie/)).toBeInTheDocument();
  });

  it('2 zdjęcia: BodyPhotoCompare widoczny, zachęty znikają', () => {
    pageMocks.measurements = [
      photoMeasurement('m1', '2026-08-01'),
      photoMeasurement('m2', '2026-08-20'),
    ];
    renderPage();

    expect(screen.getByTestId('body-photo-compare')).toBeInTheDocument();
    expect(screen.queryByText(/Dodaj pierwsze zdjęcie sylwetki/)).toBeNull();
    expect(screen.queryByText(/Dodaj drugie, aby zobaczyć porównanie/)).toBeNull();
  });

  it('bezpośrednia ścieżka: wybór pliku → kadr → zapis wpisu tylko-zdjęcie z dzisiejszą datą', async () => {
    renderPage();
    const file = new File(['fake-image'], 'sylwetka.jpg', { type: 'image/jpeg' });

    fireEvent.change(screen.getByTestId('measurements-add-photo-input'), { target: { files: [file] } });
    fireEvent.click(screen.getByTestId('mock-crop-confirm'));

    await waitFor(() => expect(pageMocks.addMeasurement).toHaveBeenCalledTimes(1));
    const saved = pageMocks.addMeasurement.mock.calls[0][0] as Record<string, unknown>;
    expect(saved.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(saved.photoUrl).toBe('https://example.test/photo.jpg?token=x');
    expect(String(saved.photoPath)).toContain('body-photos/u1/');
    // Zero fabrykowanych pól liczbowych.
    for (const [key, value] of Object.entries(saved)) {
      if (key === 'date' || key === 'photoUrl' || key === 'photoPath') continue;
      expect(value, `pole ${key}`).toBeUndefined();
    }
  });
});
