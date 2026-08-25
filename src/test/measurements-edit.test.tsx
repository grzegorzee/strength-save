import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { BodyMeasurement } from '@/types';
import { MEASUREMENT_FIELDS } from '@/lib/measurement-stats';
import {
  buildMeasurement,
  buildPhotoWeightMeasurement,
  buildRecordedMeasurement,
} from '@/test/canonical-states';

// WP-M: edycja i usuwanie wpisu pomiaru ciała z listy Historii.
// Kontrakty pod testem:
// - wiersz historii otwiera EditMeasurementDialog zhydrowany wartościami wpisu
//   (data, godzina z recordedAt, wartości w jednostkach UI),
// - zapis woła updateMeasurement z PEŁNYM obrazem wpisu: recordedAt z daty+godziny
//   (bez zmiany godziny = dokładnie oryginalny epoch), wyczyszczone pole = undefined,
// - zdjęcie: bez zmian = oryginalne photoUrl/photoPath w payloadzie; "Usuń zdjęcie"
//   = payload bez pól zdjęcia,
// - usuwanie za ConfirmDialog -> deleteMeasurement,
// - "Pokaż wszystkie" zamiast twardego slice(0,5),
// - gating useHealthConsent: bez zgody wiersze nieklikalne,
// - NIEZMIENNIK: dodawanie pomiaru formularzem działa jak dotąd (addMeasurement).
// PhotoCropDialog zamockowany (interakcje croppera testuje photo-crop.test.tsx).

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

const pageMocks = vi.hoisted(() => ({
  measurements: [] as unknown[],
  healthConsent: true,
  addMeasurement: vi.fn(async (m: Record<string, unknown>) => ({ measurement: { id: 'new', userId: 'u1', ...m } })),
  updateMeasurement: vi.fn(async (id: string, m: Record<string, unknown>) => ({ measurement: { id, userId: 'u1', ...m } })),
  deleteMeasurement: vi.fn(async () => ({ ok: true })),
  toast: vi.fn(),
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', canUseBodyPhotos: true, isAdmin: false }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    measurements: pageMocks.measurements,
    addMeasurement: pageMocks.addMeasurement,
    updateMeasurement: pageMocks.updateMeasurement,
    deleteMeasurement: pageMocks.deleteMeasurement,
    getLatestMeasurement: () => undefined,
  }),
}));
vi.mock('@/hooks/useHealthConsent', () => ({ useHealthConsent: () => pageMocks.healthConsent }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: pageMocks.toast }) }));
vi.mock('@/lib/firebase', () => ({ storage: {}, db: {} }));
vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn(async () => ({})),
  getDownloadURL: vi.fn(async () => 'https://example.test/new-photo.jpg?token=n'),
}));
vi.mock('@/lib/image-compress', () => ({
  compressImage: vi.fn(async (file: Blob) => file),
}));
vi.mock('@/components/MeasurementTrendChart', () => ({ default: () => null }));
vi.mock('@/components/HealthWeightSuggestion', () => ({ HealthWeightSuggestion: () => null }));

import Measurements from '@/pages/Measurements';

// Fixtury przez kanoniczne buildery (zasada 11).
const recordedEntry = buildRecordedMeasurement('2026-08-10', 8); // weight 83.5, waist 88, 08:00
const photoEntry = buildPhotoWeightMeasurement('2026-08-12', 84);
const legacyEntry = buildMeasurement('2026-08-01');

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

const openEdit = (entry: BodyMeasurement) => {
  fireEvent.click(screen.getByTestId(`measurement-row-${entry.id}`));
  return screen.getByRole('dialog', { name: /Edytuj pomiar/ });
};

const lastUpdatePayload = () => pageMocks.updateMeasurement.mock.calls[0][1] as Record<string, unknown>;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
  pageMocks.measurements = [recordedEntry, photoEntry, legacyEntry];
  pageMocks.healthConsent = true;
  pageMocks.addMeasurement.mockClear();
  pageMocks.updateMeasurement.mockClear();
  pageMocks.deleteMeasurement.mockClear();
  pageMocks.toast.mockClear();
});

describe('EditMeasurementDialog — otwarcie i hydracja (WP-M)', () => {
  it('klik w wiersz otwiera dialog z datą, godziną z recordedAt i wartościami wpisu', () => {
    renderPage();
    const dialog = openEdit(recordedEntry);

    expect(within(dialog).getByTestId('measurement-edit-date')).toHaveValue('2026-08-10');
    expect(within(dialog).getByTestId('measurement-edit-time')).toHaveValue('08:00');
    expect(within(dialog).getByTestId('measurement-edit-weight')).toHaveValue('83.5');
    expect(within(dialog).getByTestId('measurement-edit-waist')).toHaveValue('88');
    expect(within(dialog).getByTestId('measurement-edit-chest')).toHaveValue('');
  });

  it('wpis legacy (bez recordedAt): puste pole godziny', () => {
    renderPage();
    const dialog = openEdit(legacyEntry);

    expect(within(dialog).getByTestId('measurement-edit-time')).toHaveValue('');
  });
});

// WP-G (X35a) p.1-2: dialog "latał na boki" (natywne date/time w dwóch kolumnach
// po 152 px rozpychały DialogContent bez overflow-x-hidden), a Radix kładł
// pierwszy focus na polu daty (iOS podnosił picker). Teraz: Sheet od dołu,
// data i godzina w OSOBNYCH wierszach, min-w-0 na komórkach, focus na wadze.
describe('EditMeasurementDialog — arkusz od dołu i focus (WP-G)', () => {
  it('otwiera się jako Sheet od dołu z overflow-x-hidden i overflow-y-auto', () => {
    renderPage();
    const sheet = openEdit(recordedEntry);

    expect(sheet).toHaveAttribute('data-testid', 'measurement-edit-sheet');
    expect(sheet.className).toMatch(/\bbottom-0\b/);
    expect(sheet.className).toMatch(/\boverflow-x-hidden\b/);
    expect(sheet.className).toMatch(/\boverflow-y-auto\b/);
  });

  it('data i godzina w osobnych wierszach na pełną szerokość (żaden przodek w obrębie arkusza nie jest siatką 2-kolumnową)', () => {
    renderPage();
    const sheet = openEdit(recordedEntry);
    const date = within(sheet).getByTestId('measurement-edit-date');
    const time = within(sheet).getByTestId('measurement-edit-time');

    const ancestorsUntilSheet = (el: HTMLElement): HTMLElement[] => {
      const out: HTMLElement[] = [];
      let node = el.parentElement;
      while (node && node !== sheet) { out.push(node); node = node.parentElement; }
      return out;
    };
    for (const input of [date, time]) {
      const twoCol = ancestorsUntilSheet(input).filter((n) => /\bgrid-cols-2\b/.test(n.className));
      expect(twoCol).toHaveLength(0);
    }
    // Osobne wiersze: wspólny rodzic daty i godziny nie jest ich BEZPOŚREDNIM rodzicem.
    const dateRow = date.closest('[data-testid="measurement-edit-date-row"]');
    const timeRow = time.closest('[data-testid="measurement-edit-time-row"]');
    expect(dateRow).not.toBeNull();
    expect(timeRow).not.toBeNull();
    expect(dateRow).not.toBe(timeRow);
    expect(dateRow!.className).toMatch(/\bw-full\b/);
    expect(timeRow!.className).toMatch(/\bw-full\b/);
  });

  it('komórki siatki pól mają min-w-0 (etykieta nie rozpycha kolumny)', () => {
    renderPage();
    const sheet = openEdit(recordedEntry);
    const cells = MEASUREMENT_FIELDS.map((field) => within(sheet).getByTestId(`measurement-edit-${field}`).parentElement!);
    cells.forEach((cell) => expect(cell.className).toMatch(/\bmin-w-0\b/));
    // Etykiety mogą się łamać (bez whitespace-nowrap), więc nie rozpychają komórki.
    const labels = cells.map((cell) => cell.querySelector('label')!);
    labels.forEach((label) => expect(label.className).not.toMatch(/whitespace-nowrap/));
  });

  it('po otwarciu focus ląduje na polu wagi, NIGDY na dacie', async () => {
    renderPage();
    const sheet = openEdit(recordedEntry);
    await waitFor(() => expect(document.activeElement).toBe(within(sheet).getByTestId('measurement-edit-weight')));
    expect(document.activeElement).not.toBe(within(sheet).getByTestId('measurement-edit-date'));
  });

  it('wpis bez wagi (tylko talia): focus na pierwszym wypełnionym polu liczbowym', async () => {
    const waistOnly = { ...buildMeasurement('2026-08-03'), id: 'm-waist-only', weight: undefined, waist: 91 };
    pageMocks.measurements = [waistOnly];
    renderPage();
    const sheet = openEdit(waistOnly as BodyMeasurement);
    await waitFor(() => expect(document.activeElement).toBe(within(sheet).getByTestId('measurement-edit-waist')));
  });

  it('wpis tylko-zdjęcie (bez liczb): focus na polu wagi', async () => {
    const photoOnly = { id: 'm-photo-only', userId: 'u1', date: '2026-08-04', photoUrl: 'https://example.test/p.jpg' } as BodyMeasurement;
    pageMocks.measurements = [photoOnly];
    renderPage();
    const sheet = openEdit(photoOnly);
    await waitFor(() => expect(document.activeElement).toBe(within(sheet).getByTestId('measurement-edit-weight')));
  });
});

describe('EditMeasurementDialog — zapis (WP-M)', () => {
  it('zmiana wagi: recordedAt DOKŁADNIE oryginalny, wyczyszczona talia = undefined', async () => {
    renderPage();
    const dialog = openEdit(recordedEntry);

    fireEvent.change(within(dialog).getByTestId('measurement-edit-weight'), { target: { value: '90' } });
    fireEvent.change(within(dialog).getByTestId('measurement-edit-waist'), { target: { value: '' } });
    fireEvent.click(within(dialog).getByTestId('measurement-edit-save'));

    await waitFor(() => expect(pageMocks.updateMeasurement).toHaveBeenCalledTimes(1));
    expect(pageMocks.updateMeasurement.mock.calls[0][0]).toBe(recordedEntry.id);
    const payload = lastUpdatePayload();
    expect(payload.date).toBe('2026-08-10');
    expect(payload.weight).toBe(90);
    expect(payload.waist).toBeUndefined();
    expect(payload.recordedAt).toBe(recordedEntry.recordedAt);
    expect(payload.photoUrl).toBeUndefined();
    expect(payload.photoPath).toBeUndefined();
    // Sukces = dialog zamknięty, toast sukcesu.
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Edytuj pomiar/ })).toBeNull());
    expect(pageMocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Pomiary zapisane!' }));
  });

  it('zmiana godziny i daty: recordedAt = nowa data + nowa godzina (lokalnie)', async () => {
    renderPage();
    const dialog = openEdit(recordedEntry);

    fireEvent.change(within(dialog).getByTestId('measurement-edit-date'), { target: { value: '2026-08-11' } });
    fireEvent.change(within(dialog).getByTestId('measurement-edit-time'), { target: { value: '17:45' } });
    fireEvent.click(within(dialog).getByTestId('measurement-edit-save'));

    await waitFor(() => expect(pageMocks.updateMeasurement).toHaveBeenCalledTimes(1));
    const payload = lastUpdatePayload();
    expect(payload.date).toBe('2026-08-11');
    expect(payload.recordedAt).toBe(new Date(2026, 7, 11, 17, 45).getTime());
  });

  it('wpis legacy bez godziny zapisuje się bez recordedAt (nie fabrykujemy zegara)', async () => {
    renderPage();
    const dialog = openEdit(legacyEntry);

    fireEvent.change(within(dialog).getByTestId('measurement-edit-weight'), { target: { value: '81' } });
    fireEvent.click(within(dialog).getByTestId('measurement-edit-save'));

    await waitFor(() => expect(pageMocks.updateMeasurement).toHaveBeenCalledTimes(1));
    expect(lastUpdatePayload().recordedAt).toBeUndefined();
  });

  it('wszystkie pola puste i brak zdjęcia: walidacja z wyjściem, zero zapisu', async () => {
    renderPage();
    const dialog = openEdit(legacyEntry);

    fireEvent.change(within(dialog).getByTestId('measurement-edit-weight'), { target: { value: '' } });
    fireEvent.change(within(dialog).getByTestId('measurement-edit-waist'), { target: { value: '' } });
    fireEvent.click(within(dialog).getByTestId('measurement-edit-save'));

    expect(await within(dialog).findByRole('alert')).toBeInTheDocument();
    expect(pageMocks.updateMeasurement).not.toHaveBeenCalled();
  });

  it('błąd zapisu: komunikat w dialogu, dialog zostaje otwarty (jest wyjście)', async () => {
    pageMocks.updateMeasurement.mockResolvedValueOnce({ measurement: null, error: 'permission-denied' } as never);
    renderPage();
    const dialog = openEdit(recordedEntry);

    fireEvent.click(within(dialog).getByTestId('measurement-edit-save'));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('permission-denied');
    expect(screen.getByRole('dialog', { name: /Edytuj pomiar/ })).toBeInTheDocument();
  });
});

describe('EditMeasurementDialog — zdjęcie (WP-M)', () => {
  it('zdjęcie bez zmian: payload niesie oryginalne photoUrl/photoPath', async () => {
    renderPage();
    const dialog = openEdit(photoEntry);

    fireEvent.change(within(dialog).getByTestId('measurement-edit-weight'), { target: { value: '83' } });
    fireEvent.click(within(dialog).getByTestId('measurement-edit-save'));

    await waitFor(() => expect(pageMocks.updateMeasurement).toHaveBeenCalledTimes(1));
    const payload = lastUpdatePayload();
    expect(payload.photoUrl).toBe(photoEntry.photoUrl);
    expect(payload.photoPath).toBe(photoEntry.photoPath);
  });

  it('"Usuń zdjęcie": payload bez pól zdjęcia', async () => {
    renderPage();
    const dialog = openEdit(photoEntry);

    fireEvent.click(within(dialog).getByTestId('measurement-edit-photo-remove'));
    fireEvent.click(within(dialog).getByTestId('measurement-edit-save'));

    await waitFor(() => expect(pageMocks.updateMeasurement).toHaveBeenCalledTimes(1));
    const payload = lastUpdatePayload();
    expect(payload.photoUrl).toBeUndefined();
    expect(payload.photoPath).toBeUndefined();
    expect(payload.weight).toBe(84);
  });

  it('"Zmień zdjęcie": nowy upload, payload z nowym photoUrl i nową ścieżką', async () => {
    renderPage();
    const dialog = openEdit(photoEntry);
    const file = new File(['fake-image'], 'sylwetka.jpg', { type: 'image/jpeg' });

    fireEvent.change(within(dialog).getByTestId('measurement-edit-photo-input'), { target: { files: [file] } });
    fireEvent.click(screen.getByTestId('mock-crop-confirm'));
    fireEvent.click(within(dialog).getByTestId('measurement-edit-save'));

    await waitFor(() => expect(pageMocks.updateMeasurement).toHaveBeenCalledTimes(1));
    const payload = lastUpdatePayload();
    expect(payload.photoUrl).toBe('https://example.test/new-photo.jpg?token=n');
    expect(String(payload.photoPath)).toContain('body-photos/u1/2026-08-12-');
    expect(payload.photoPath).not.toBe(photoEntry.photoPath);
  });

  it('błąd uploadu nowego zdjęcia: wpis NIE zmieniony, komunikat w dialogu', async () => {
    const { uploadBytes } = await import('firebase/storage');
    vi.mocked(uploadBytes).mockRejectedValueOnce(new Error('storage/unauthorized'));
    renderPage();
    const dialog = openEdit(photoEntry);
    const file = new File(['fake-image'], 'sylwetka.jpg', { type: 'image/jpeg' });

    fireEvent.change(within(dialog).getByTestId('measurement-edit-photo-input'), { target: { files: [file] } });
    fireEvent.click(screen.getByTestId('mock-crop-confirm'));
    fireEvent.click(within(dialog).getByTestId('measurement-edit-save'));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/Nie udało się wysłać nowego zdjęcia/);
    expect(pageMocks.updateMeasurement).not.toHaveBeenCalled();
  });
});

describe('EditMeasurementDialog — usuwanie (WP-M)', () => {
  it('Usuń wpis -> ConfirmDialog -> potwierdzenie woła deleteMeasurement i zamyka dialog', async () => {
    renderPage();
    const dialog = openEdit(recordedEntry);

    fireEvent.click(within(dialog).getByTestId('measurement-edit-delete'));
    const confirm = await screen.findByRole('alertdialog');
    expect(pageMocks.deleteMeasurement).not.toHaveBeenCalled();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Usuń wpis' }));

    await waitFor(() => expect(pageMocks.deleteMeasurement).toHaveBeenCalledWith(recordedEntry.id));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /Edytuj pomiar/ })).toBeNull());
    expect(pageMocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Wpis usunięty' }));
  });

  it('anulowanie w ConfirmDialog: zero usunięcia, dialog edycji zostaje', async () => {
    renderPage();
    const dialog = openEdit(recordedEntry);

    fireEvent.click(within(dialog).getByTestId('measurement-edit-delete'));
    const confirm = await screen.findByRole('alertdialog');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Anuluj' }));

    expect(pageMocks.deleteMeasurement).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: /Edytuj pomiar/ })).toBeInTheDocument();
  });
});

describe('Measurements — lista historii (WP-M)', () => {
  it('7 wpisów: 5 widocznych + "Pokaż wszystkie (7)", po kliknięciu 7 i "Pokaż mniej"', () => {
    pageMocks.measurements = [1, 2, 3, 4, 5, 6, 7].map((d) => buildMeasurement(`2026-08-0${d}`));
    renderPage();

    expect(screen.getAllByTestId(/^measurement-row-/)).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż wszystkie (7)' }));
    expect(screen.getAllByTestId(/^measurement-row-/)).toHaveLength(7);
    fireEvent.click(screen.getByRole('button', { name: 'Pokaż mniej' }));
    expect(screen.getAllByTestId(/^measurement-row-/)).toHaveLength(5);
  });

  it('do 5 wpisów: brak przycisku "Pokaż wszystkie"', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /Pokaż wszystkie/ })).toBeNull();
  });

  it('dwa wpisy tego samego dnia: kolejność po recordedAt (późniejszy wyżej), delty rozróżnione', () => {
    const morning = { ...buildRecordedMeasurement('2026-08-10', 7), id: 'm-morning', waist: 90 };
    const evening = { ...buildRecordedMeasurement('2026-08-10', 19), id: 'm-evening', waist: 88 };
    pageMocks.measurements = [morning, evening];
    renderPage();

    const rows = screen.getAllByTestId(/^measurement-row-/);
    expect(rows[0]).toHaveAttribute('data-testid', 'measurement-row-m-evening');
    expect(rows[1]).toHaveAttribute('data-testid', 'measurement-row-m-morning');
    // Wieczorny ma deltę -2 vs poranny; poranny (pierwszy) bez delty.
    expect(within(rows[0]).getByText(/-2/)).toBeInTheDocument();
    expect(within(rows[1]).queryByText(/-2/)).toBeNull();
  });

  it('bez zgody zdrowotnej: wiersz nie otwiera dialogu edycji', () => {
    pageMocks.healthConsent = false;
    renderPage();

    fireEvent.click(screen.getByTestId(`measurement-row-${recordedEntry.id}`));
    expect(screen.queryByRole('dialog', { name: /Edytuj pomiar/ })).toBeNull();
  });
});

describe('Measurements — niezmiennik dodawania (WP-M)', () => {
  it('formularz dodawania nadal woła addMeasurement (zero updateMeasurement)', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/^Waga/), { target: { value: '79,5' } });
    fireEvent.click(screen.getByRole('button', { name: /Zapisz pomiary/ }));

    await waitFor(() => expect(pageMocks.addMeasurement).toHaveBeenCalledTimes(1));
    const saved = pageMocks.addMeasurement.mock.calls[0][0] as Record<string, unknown>;
    expect(saved.weight).toBe(79.5);
    expect(saved.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(pageMocks.updateMeasurement).not.toHaveBeenCalled();
    expect(pageMocks.deleteMeasurement).not.toHaveBeenCalled();
  });
});
