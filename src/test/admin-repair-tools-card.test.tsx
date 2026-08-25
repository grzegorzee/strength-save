import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

// X35b (WP-B): narzędzia naprawcze (merge cykli + czyszczenie duplikatów)
// przeniesione z /settings do panelu admina jako osobna karta. Niezmiennik:
// merge nadal za potwierdzeniem i nadal na koncie zalogowanego admina.

const mergeSpy = vi.hoisted(() => vi.fn(async () => 2));
const cleanupSpy = vi.hoisted(() => vi.fn(async () => ({ deleted: 0 })));
const backfillSpy = vi.hoisted(() => vi.fn(async () => ({ updated: 0, scanned: 0 })));
const toastSpy = vi.hoisted(() => vi.fn());

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, storage: {}, functions: {} }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc: vi.fn(async () => {}) }));
vi.mock('@/lib/global-error-telemetry', () => ({ reportClientErrorWithCurrentUid: vi.fn() }));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'admin-1', profile: {}, isAdmin: true }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    workouts: [{ id: 'w1' }],
    isLoaded: true,
    cleanupEmptyWorkouts: cleanupSpy,
    backfillHistoricalWorkouts: backfillSpy,
  }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ cycles: [], mergeContinuousCycles: mergeSpy }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastSpy }) }));

import { AdminRepairToolsCard } from '@/components/admin/AdminRepairToolsCard';

const renderCard = () => render(<LanguageProvider><AdminRepairToolsCard /></LanguageProvider>);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  mergeSpy.mockClear();
  toastSpy.mockClear();
});

describe('AdminRepairToolsCard (panel admina)', () => {
  it('karta zwinięta: tytuł widoczny, narzędzia schowane', () => {
    renderCard();
    expect(screen.getByText('Narzędzia naprawcze')).toBeTruthy();
    expect(screen.queryByText('Połącz przerwane cykle')).toBeNull();
  });

  it('rozwinięcie pokazuje merge cykli i czyszczenie duplikatów', async () => {
    renderCard();
    fireEvent.click(screen.getByText('Narzędzia naprawcze'));
    expect(await screen.findByText('Połącz przerwane cykle')).toBeTruthy();
    expect(screen.getByText('Wyczyść duplikaty treningów')).toBeTruthy();
  });

  it('merge cykli leci DOPIERO po potwierdzeniu i pokazuje wynik', async () => {
    renderCard();
    fireEvent.click(screen.getByText('Narzędzia naprawcze'));
    fireEvent.click(await screen.findByText('Połącz przerwane cykle'));
    expect(mergeSpy).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(dialog.querySelector('button:last-of-type') as HTMLButtonElement);
    await waitFor(() => expect(mergeSpy).toHaveBeenCalledWith([{ id: 'w1' }]));
    await waitFor(() => expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ title: 'Połączono 2 cykli' })));
  });
});
