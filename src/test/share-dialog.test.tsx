// Z198: "Kliknąłem Pobierz i zero reakcji" — po udanym natywnym share przycisk
// pokazuje stan "Zapisano ✓" (Check + hapticSuccess) na ~1.8 s; AbortError
// (zamknięcie sheeta) NIE udaje sukcesu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ShareWorkoutDialog } from '@/components/ShareWorkoutDialog';
import { hapticSuccess } from '@/lib/haptics';
import { generateWorkoutImage, type ShareData } from '@/lib/share-utils';

vi.mock('@/lib/share-utils', () => ({
  generateWorkoutImage: vi.fn(async () => new Blob(['img'], { type: 'image/jpeg' })),
  downscalePhoto: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
}));
const nativeExportMocks = vi.hoisted(() => ({
  writeFile: vi.fn(async () => ({ uri: 'file:///cache/workout.jpg' })),
  readdir: vi.fn(async () => ({ files: [] })),
  deleteFile: vi.fn(async () => undefined),
  share: vi.fn(async () => ({ activityType: 'test' })),
}));
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'UTF8' },
  Filesystem: {
    writeFile: nativeExportMocks.writeFile,
    readdir: nativeExportMocks.readdir,
    deleteFile: nativeExportMocks.deleteFile,
  },
}));
vi.mock('@capacitor/share', () => ({
  Share: { share: nativeExportMocks.share },
}));
vi.mock('@/lib/haptics', () => ({
  hapticSuccess: vi.fn(async () => undefined),
}));

const data: ShareData = {
  dayName: 'Poniedziałek',
  date: '2026-08-03',
  exercises: [{ name: 'Przysiad', sets: '3 x 5' }],
  tonnage: 4200,
  duration: '1:02',
  prs: [],
  streak: 4,
};

beforeEach(() => {
  localStorage.setItem('app-language', 'pl');
  localStorage.removeItem('fittracker_share_template_v1');
  nativeExportMocks.writeFile.mockReset().mockResolvedValue({ uri: 'file:///cache/workout.jpg' });
  nativeExportMocks.readdir.mockReset().mockResolvedValue({ files: [] });
  nativeExportMocks.deleteFile.mockReset().mockResolvedValue(undefined);
  nativeExportMocks.share.mockReset().mockResolvedValue({ activityType: 'test' });
  vi.mocked(hapticSuccess).mockClear();
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const renderDialog = () => render(
  <LanguageProvider>
    <UnitProvider>
      <ShareWorkoutDialog data={data} open onOpenChange={() => {}} />
    </UnitProvider>
  </LanguageProvider>,
);

describe('ShareWorkoutDialog — stan Zapisano (Z198)', () => {
  it('udany share po Pobierz: "Zapisano ✓" + hapticSuccess, potem powrót do "Pobierz"', async () => {
    renderDialog();

    const download = await screen.findByRole('button', { name: /Pobierz/i });
    fireEvent.click(download);

    await waitFor(() => expect(screen.getByText('Zapisano')).toBeTruthy());
    expect(hapticSuccess).toHaveBeenCalledTimes(1);

    // Po ~1.8 s przycisk wraca do "Pobierz".
    await waitFor(() => expect(screen.queryByText('Zapisano')).toBeNull(), { timeout: 3000 });
    expect(screen.getByRole('button', { name: /Pobierz/i })).toBeTruthy();
  });

  it('AbortError (zamknięty sheet) NIE udaje sukcesu: bez "Zapisano", bez haptyki', async () => {
    const abort = new Error('cancelled');
    abort.name = 'AbortError';
    nativeExportMocks.share.mockRejectedValue(abort);
    renderDialog();

    const download = await screen.findByRole('button', { name: /Pobierz/i });
    fireEvent.click(download);

    // Chwila na przetworzenie odrzuconego promise.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText('Zapisano')).toBeNull();
    expect(hapticSuccess).not.toHaveBeenCalled();
  });

  it('udany share po Udostępnij: stan Zapisano na przycisku share', async () => {
    renderDialog();

    const share = await screen.findByRole('button', { name: /Udostępnij/i });
    fireEvent.click(share);

    await waitFor(() => expect(screen.getByText('Zapisano')).toBeTruthy());
  });
});

// Bug 30 (X30): wyścig generacji — starszy, wolniejszy run (np. pierwszy po
// otwarciu, płacący lazy import html2canvas) kończył OSTATNI i cicho
// podmieniał podgląd/blob na obraz niezgodny z zaznaczonymi chipami.
describe('ShareWorkoutDialog — wyścig generacji (bug 30)', () => {
  it('starszy run kończący po nowszym NIE nadpisuje podglądu ani bloba', async () => {
    const gen = vi.mocked(generateWorkoutImage);
    let resolveFirst!: (b: Blob) => void;
    let resolveSecond!: (b: Blob) => void;
    gen.mockClear();
    gen
      .mockImplementationOnce(() => new Promise<Blob>((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise<Blob>((resolve) => { resolveSecond = resolve; }));
    let urlCounter = 0;
    vi.mocked(URL.createObjectURL).mockImplementation(() => `blob:run-${++urlCounter}`);

    renderDialog();
    // Run 1: efekt otwarcia (story). Run 2: klik chipa "Minimal" w trakcie renderu.
    await waitFor(() => expect(gen).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Minimal' }));
    await waitFor(() => expect(gen).toHaveBeenCalledTimes(2));

    // Nowszy run (Minimal) kończy pierwszy — podgląd widoczny.
    resolveSecond(new Blob(['minimal'], { type: 'image/jpeg' }));
    await waitFor(() => expect(screen.getByAltText('Podsumowanie treningu')).toBeTruthy());
    const src = (screen.getByAltText('Podsumowanie treningu') as HTMLImageElement).src;

    // Starszy run dojeżdża później — wynik odrzucony: zero nowego objectURL,
    // podgląd bez zmian.
    resolveFirst(new Blob(['story'], { type: 'image/jpeg' }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect((screen.getByAltText('Podsumowanie treningu') as HTMLImageElement).src).toBe(src);
  });

  it('spinner gaśnie po nowszym runie mimo wiszącego starszego', async () => {
    const gen = vi.mocked(generateWorkoutImage);
    let resolveSecond!: (b: Blob) => void;
    gen.mockClear();
    gen
      .mockImplementationOnce(() => new Promise<Blob>(() => { /* run 1 nigdy nie kończy */ }))
      .mockImplementationOnce(() => new Promise<Blob>((resolve) => { resolveSecond = resolve; }));

    renderDialog();
    await waitFor(() => expect(gen).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Minimal' }));
    await waitFor(() => expect(gen).toHaveBeenCalledTimes(2));

    resolveSecond(new Blob(['minimal'], { type: 'image/jpeg' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Pobierz/i })).toBeTruthy());
  });
});
