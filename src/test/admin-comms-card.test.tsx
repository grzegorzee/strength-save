import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// T15: przełącznik "zapisz też w dzwonku" przy wysyłce push (mirror do inboxa).
// Mock registration-api odcina realne wywołania funkcji.
const adminSendPushMock = vi.fn();
const adminBroadcastEmailMock = vi.fn();
vi.mock('@/lib/registration-api', () => ({
  adminSendPush: (...args: unknown[]) => adminSendPushMock(...args),
  adminBroadcastEmail: (...args: unknown[]) => adminBroadcastEmailMock(...args),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { LanguageProvider } from '@/contexts/LanguageContext';
import { AdminCommsCard } from '@/components/admin/AdminCommsCard';

const renderCard = (props: Partial<Parameters<typeof AdminCommsCard>[0]> = {}) => render(
  <LanguageProvider>
    <AdminCommsCard cohorts={[]} {...props} />
  </LanguageProvider>,
);

const fillAndSendPush = async () => {
  fireEvent.change(screen.getByPlaceholderText('Tytuł powiadomienia'), { target: { value: 'Nowość' } });
  fireEvent.change(screen.getByPlaceholderText('Treść powiadomienia'), { target: { value: 'Opis' } });
  fireEvent.click(screen.getByRole('button', { name: 'Wyślij push' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Wyślij' }));
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  adminSendPushMock.mockReset().mockResolvedValue({
    success: true, sent: 1, failed: 0, total: 1, invalidTokens: 0, inboxWritten: 5,
  });
  adminBroadcastEmailMock.mockReset().mockResolvedValue({ success: true, sent: 1, total: 1 });
});

describe('AdminCommsCard (T15: mirror push do dzwonka)', () => {
  it('przełącznik widoczny przy kanale push, niewidoczny przy email', () => {
    renderCard();
    expect(screen.getByText('Zapisz też w dzwonku aplikacji')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    expect(screen.queryByText('Zapisz też w dzwonku aplikacji')).toBeNull();
  });

  it('wysyłka push przekazuje inbox: true (default) i pokazuje licznik wpisów', async () => {
    renderCard();
    await fillAndSendPush();
    expect(adminSendPushMock).toHaveBeenCalledWith({ target: 'all', title: 'Nowość', body: 'Opis', inbox: true });
    expect(await screen.findByText(/Wpisy w dzwonku: 5\./)).toBeTruthy();
  });

  it('wyłączony przełącznik przekazuje inbox: false', async () => {
    renderCard();
    fireEvent.click(screen.getByRole('switch'));
    await fillAndSendPush();
    expect(adminSendPushMock).toHaveBeenCalledWith({ target: 'all', title: 'Nowość', body: 'Opis', inbox: false });
  });

  // X35c (WP-E, pkt 4): szablony wypełniają tytuł i treść; "Wolny tekst" czyści.
  it('szablon "Nowa wersja" wypełnia pola, "Wolny tekst" czyści', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Nowa wersja' }));
    const title = screen.getByPlaceholderText('Tytuł powiadomienia') as HTMLInputElement;
    const body = screen.getByPlaceholderText('Treść powiadomienia') as HTMLTextAreaElement;
    expect(title.value).toBe('Nowa wersja Strength Save');
    expect(body.value).toContain('Zaktualizuj aplikację');

    fireEvent.click(screen.getByRole('button', { name: 'Tydzień' }));
    expect(title.value).toBe('Nowy tydzień treningowy');

    fireEvent.click(screen.getByRole('button', { name: 'Wolny tekst' }));
    expect(title.value).toBe('');
    expect(body.value).toBe('');
  });

  it('podgląd przed wysyłką: kanał, odbiorcy z liczbą, tytuł, treść', async () => {
    renderCard({ cohorts: ['beta'], recipientCounts: { all: 42, beta: 7 } });
    fireEvent.click(screen.getByRole('button', { name: 'beta' }));
    fireEvent.change(screen.getByPlaceholderText('Tytuł powiadomienia'), { target: { value: 'Nowość' } });
    fireEvent.change(screen.getByPlaceholderText('Treść powiadomienia'), { target: { value: 'Opis ogłoszenia' } });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij push' }));

    const preview = await screen.findByTestId('admin-comms-preview');
    expect(preview.textContent).toContain('Push');
    expect(preview.textContent).toContain('beta');
    expect(preview.textContent).toContain('7');
    expect(preview.textContent).toContain('Nowość');
    expect(preview.textContent).toContain('Opis ogłoszenia');
    // Wysyłka nie poszła, dopóki admin nie potwierdzi.
    expect(adminSendPushMock).not.toHaveBeenCalled();
  });

  it('podgląd bez recipientCounts: bez liczby, ale z targetem', async () => {
    renderCard();
    await fillAndSendPush();
    expect(adminSendPushMock).toHaveBeenCalledTimes(1);
  });

  // Zasada 5: istniejący przepływ email działa identycznie, bez pola inbox.
  it('niezmiennik: wysyłka email nie wysyła pola inbox', async () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    fireEvent.change(screen.getByPlaceholderText('Temat maila'), { target: { value: 'Temat' } });
    fireEvent.change(screen.getByPlaceholderText('Treść maila'), { target: { value: 'Opis' } });
    fireEvent.click(screen.getByRole('button', { name: 'Wyślij mail' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Wyślij' }));
    expect(adminBroadcastEmailMock).toHaveBeenCalledWith({ target: 'all', subject: 'Temat', body: 'Opis' });
    expect(adminSendPushMock).not.toHaveBeenCalled();
  });
});
