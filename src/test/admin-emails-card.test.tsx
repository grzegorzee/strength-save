import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

// G-T4: sekcja Maile w panelu admina — pusty stan, błąd z wyjściem (retry),
// wiersze ze statusami i kafle zbiorcze. Mock firestore odcina realne SDK.
const getDocsMock = vi.fn();
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
}));
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AdminEmailsCard } from '@/pages/admin/AdminEmailsCard';

const docSnap = (id: string, data: Record<string, unknown>) => ({ id, data: () => data });
const snapshot = (docs: ReturnType<typeof docSnap>[]) => ({ docs });

const baseRow = {
  uid: 'user-abc-123',
  to: 'trener@example.com',
  type: 'workout',
  subject: 'Trening 2026-08-20, Czwartek (Strength Save)',
  transport: 'ses',
  status: 'sent',
  sentAt: new Date().toISOString(),
  lang: 'pl',
};

const renderCard = () => render(
  <LanguageProvider>
    <AdminEmailsCard />
  </LanguageProvider>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  getDocsMock.mockReset();
});

describe('AdminEmailsCard (G-T4)', () => {
  it('pusty stan: brak wysyłek', async () => {
    getDocsMock.mockResolvedValue(snapshot([]));
    const view = renderCard();
    expect(await view.findByText('Brak wysyłek')).toBeTruthy();
  });

  it('błąd odczytu ma wyjście: komunikat + retry ładuje ponownie', async () => {
    getDocsMock.mockRejectedValueOnce(new Error('permission-denied'));
    getDocsMock.mockResolvedValueOnce(snapshot([]));
    const view = renderCard();
    expect(await view.findByText('Nie udało się wczytać wysyłek')).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: 'Spróbuj ponownie' }));
    expect(await view.findByText('Brak wysyłek')).toBeTruthy();
    expect(getDocsMock).toHaveBeenCalledTimes(2);
  });

  it('wiersz: adresat, temat, transport, status otwarty z licznikiem otwarć', async () => {
    getDocsMock.mockResolvedValue(snapshot([
      docSnap('el1', {
        ...baseRow,
        status: 'delivered',
        deliveredAt: new Date().toISOString(),
        openedAt: new Date().toISOString(),
        openCount: 3,
      }),
    ]));
    const view = renderCard();
    expect(await view.findByText('trener@example.com')).toBeTruthy();
    expect(view.getByText('Trening 2026-08-20, Czwartek (Strength Save)')).toBeTruthy();
    expect(view.getByText('otwarty')).toBeTruthy();
    expect(view.getByText('3 otwarć')).toBeTruthy();
    expect(view.getByText('ses')).toBeTruthy();
  });

  it('complaint wyświetla się jako SPAM, failed jako błąd z komunikatem', async () => {
    getDocsMock.mockResolvedValue(snapshot([
      docSnap('el1', { ...baseRow, status: 'complaint' }),
      docSnap('el2', { ...baseRow, status: 'failed', error: 'no-transport-configured' }),
    ]));
    const view = renderCard();
    expect(await view.findByText('SPAM')).toBeTruthy();
    expect(view.getByText('błąd')).toBeTruthy();
    expect(view.getByText(/no-transport-configured/)).toBeTruthy();
  });

  it('kafle zbiorcze 7 i 30 dni z adnotacją o limicie', async () => {
    getDocsMock.mockResolvedValue(snapshot([
      docSnap('el1', { ...baseRow, status: 'delivered', deliveredAt: new Date().toISOString() }),
    ]));
    const view = renderCard();
    expect(await view.findByText('Ostatnie 7 dni')).toBeTruthy();
    expect(view.getByText('Ostatnie 30 dni')).toBeTruthy();
    expect(view.getAllByText('Dostarczalność').length).toBe(2);
    expect(view.getAllByText('Otwieralność').length).toBe(2);
    expect(view.getByText(/ostatnich 100 wysyłek/)).toBeTruthy();
  });
});
