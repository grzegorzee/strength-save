// Z198: "Kliknąłem Pobierz i zero reakcji" — po udanym natywnym share przycisk
// pokazuje stan "Zapisano ✓" (Check + hapticSuccess) na ~1.8 s; AbortError
// (zamknięcie sheeta) NIE udaje sukcesu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ShareWorkoutDialog } from '@/components/ShareWorkoutDialog';
import { hapticSuccess } from '@/lib/haptics';
import type { ShareData } from '@/lib/share-utils';

vi.mock('@/lib/share-utils', () => ({
  generateWorkoutImage: vi.fn(async () => new Blob(['img'], { type: 'image/jpeg' })),
  downscalePhoto: vi.fn(),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true },
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

const shareMock = vi.fn();

beforeEach(() => {
  localStorage.setItem('app-language', 'pl');
  localStorage.removeItem('fittracker_share_template_v1');
  shareMock.mockReset();
  vi.mocked(hapticSuccess).mockClear();
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:mock'),
    revokeObjectURL: vi.fn(),
  }));
  Object.defineProperty(navigator, 'share', { configurable: true, value: shareMock });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
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
    shareMock.mockResolvedValue(undefined);
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
    shareMock.mockRejectedValue(abort);
    renderDialog();

    const download = await screen.findByRole('button', { name: /Pobierz/i });
    fireEvent.click(download);

    // Chwila na przetworzenie odrzuconego promise.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByText('Zapisano')).toBeNull();
    expect(hapticSuccess).not.toHaveBeenCalled();
  });

  it('udany share po Udostępnij: stan Zapisano na przycisku share', async () => {
    shareMock.mockResolvedValue(undefined);
    renderDialog();

    const share = await screen.findByRole('button', { name: /Udostępnij/i });
    fireEvent.click(share);

    await waitFor(() => expect(screen.getByText('Zapisano')).toBeTruthy());
  });
});
