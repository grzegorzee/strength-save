import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

// G-T4: sekcja Maile w panelu admina — pusty stan, błąd z wyjściem (retry),
// wiersze ze statusami i kafle zbiorcze. Mock firestore odcina realne SDK.
const getDocsMock = vi.fn();
const getDocMock = vi.fn();
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
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
  getDocMock.mockReset();
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
    // T22b: etykieta statusu występuje też jako chip filtra (button) — badge wiersza to span.
    expect(view.getAllByText('otwarty').some((el) => el.tagName === 'SPAN')).toBe(true);
    expect(view.getByText('3 otwarć')).toBeTruthy();
    expect(view.getByText('ses')).toBeTruthy();
  });

  it('complaint wyświetla się jako SPAM, failed jako błąd z komunikatem', async () => {
    getDocsMock.mockResolvedValue(snapshot([
      docSnap('el1', { ...baseRow, status: 'complaint' }),
      docSnap('el2', { ...baseRow, status: 'failed', error: 'no-transport-configured' }),
    ]));
    const view = renderCard();
    await view.findByText(/no-transport-configured/);
    // T22b: etykiety statusów są też chipami filtra (button) — badge wiersza to span.
    expect(view.getAllByText('SPAM').some((el) => el.tagName === 'SPAN')).toBe(true);
    expect(view.getAllByText('błąd').some((el) => el.tagName === 'SPAN')).toBe(true);
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

  // T21c: etykiety wszystkich typów maili — znane po polsku, nieznane surowo.
  it('typ weekly_digest ma etykietę, nieznany typ renderuje surowy string', async () => {
    getDocsMock.mockResolvedValue(snapshot([
      docSnap('el1', { ...baseRow, type: 'weekly_digest' }),
      docSnap('el2', { ...baseRow, type: 'nowy_nieznany_typ' }),
    ]));
    const view = renderCard();
    expect(await view.findByText('raport tygodnia')).toBeTruthy();
    expect(view.getByText('nowy_nieznany_typ')).toBeTruthy();
  });

  // T21c: podgląd treści maila z podkolekcji content/body.
  it('klik Pokaż treść otwiera dialog z iframe (sandbox, srcDoc)', async () => {
    getDocsMock.mockResolvedValue(snapshot([docSnap('el1', baseRow)]));
    getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ html: '<p>Trening HTML</p>', truncated: false }) });
    const view = renderCard();
    fireEvent.click(await view.findByRole('button', { name: 'Pokaż treść' }));
    expect(await view.findByTitle(baseRow.subject)).toBeTruthy();
    const iframe = view.getByTitle(baseRow.subject) as HTMLIFrameElement;
    expect(iframe.getAttribute('srcdoc')).toBe('<p>Trening HTML</p>');
    expect(iframe.getAttribute('sandbox')).toBe('');
    expect(getDocMock).toHaveBeenCalledTimes(1);
  });

  it('brak dokumentu treści = komunikat o niedostępności (wpisy sprzed T21a)', async () => {
    getDocsMock.mockResolvedValue(snapshot([docSnap('el1', baseRow)]));
    getDocMock.mockResolvedValue({ exists: () => false, data: () => undefined });
    const view = renderCard();
    fireEvent.click(await view.findByRole('button', { name: 'Pokaż treść' }));
    expect(await view.findByText(/Treść niedostępna/)).toBeTruthy();
  });

  // T22b: filtry client-side — chip statusu zawęża listę, kafle bez zmian.
  it('chip odbity zostawia tylko odbite, kafle liczone z pełnej listy', async () => {
    getDocsMock.mockResolvedValue(snapshot([
      docSnap('el1', { ...baseRow, subject: 'Mail A' }),
      docSnap('el2', { ...baseRow, subject: 'Mail B', status: 'bounced' }),
    ]));
    const view = renderCard();
    expect(await view.findByText('Mail A')).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: 'odbity' }));
    expect(view.queryByText('Mail A')).toBeNull();
    expect(view.getByText('Mail B')).toBeTruthy();
    // Kafel "Wysłane" (7 i 30 dni) dalej liczy z pełnych rows: 2 wysyłki.
    expect(view.getAllByText('2').length).toBeGreaterThanOrEqual(2);
    // Wyjście z filtra zawsze widoczne: chip "wszystkie" przywraca listę.
    fireEvent.click(view.getByRole('button', { name: 'wszystkie' }));
    expect(view.getByText('Mail A')).toBeTruthy();
  });

  it('szukajka zawęża po adresie/temacie, pusty wynik ma komunikat', async () => {
    getDocsMock.mockResolvedValue(snapshot([
      docSnap('el1', { ...baseRow, subject: 'Mail A' }),
      docSnap('el2', { ...baseRow, subject: 'Mail B' }),
    ]));
    const view = renderCard();
    await view.findByText('Mail A');
    const input = view.getByPlaceholderText('Szukaj: adres, temat, uid, typ');
    fireEvent.change(input, { target: { value: 'mail b' } });
    expect(view.queryByText('Mail A')).toBeNull();
    expect(view.getByText('Mail B')).toBeTruthy();
    fireEvent.change(input, { target: { value: 'nie-ma-takiego' } });
    expect(view.getByText('Brak wyników dla filtra')).toBeTruthy();
  });
});
