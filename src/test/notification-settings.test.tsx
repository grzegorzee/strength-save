import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// X35c (WP-E): ekran Powiadomień zna WSZYSTKIE typy (6 przełączników) z opisem
// kanału. Brak pola w notificationPrefs = włączone; zapis pod
// users/{uid}.notificationPrefs.<klucz>.

const updateDocMock = vi.fn(async () => undefined);
const state = vi.hoisted(() => ({
  native: false,
  profile: {} as Record<string, unknown>,
  isAdmin: false,
  recipient: false,
}));
const recipientStatus = vi.hoisted(() => vi.fn());

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  updateDoc: (...args: unknown[]) => updateDocMock(...(args as [])),
}));
vi.mock('@/lib/firebase', () => ({ db: {} }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => state.native },
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: state.profile, isAdmin: state.isAdmin }),
}));
vi.mock('@/lib/registration-api', () => ({ subscriptionAlertRecipientStatus: recipientStatus }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/push-notifications', () => ({
  getPushPermission: vi.fn(async () => 'granted'),
  requestPushPermission: vi.fn(async () => true),
  registerPushForUser: vi.fn(async () => ({ status: 'registered' })),
}));

import { LanguageProvider } from '@/contexts/LanguageContext';
import { NotificationSettings } from '@/components/NotificationSettings';
import { NOTIFICATION_PREF_KEYS } from '@/lib/notification-prefs';

const renderSettings = () => render(
  <LanguageProvider>
    <NotificationSettings />
  </LanguageProvider>,
);

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  updateDocMock.mockClear();
  state.native = false;
  state.profile = {};
  state.isAdmin = false;
  state.recipient = false;
  recipientStatus.mockReset().mockImplementation(async () => ({ recipient: state.recipient }));
});

describe('NotificationSettings (X35c: wszystkie typy powiadomień)', () => {
  it('renderuje 7 przełączników, wszystkie włączone bez pola notificationPrefs', () => {
    expect(NOTIFICATION_PREF_KEYS).toHaveLength(7);
    renderSettings();
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(NOTIFICATION_PREF_KEYS.length);
    switches.forEach((el) => expect(el.getAttribute('aria-checked')).toBe('true'));
    NOTIFICATION_PREF_KEYS.forEach((key) => {
      expect(screen.getByTestId(`notif-pref-${key}`)).toBeTruthy();
    });
  });

  it('każdy wiersz opisuje kanał (push / e-mail / w aplikacji)', () => {
    renderSettings();
    expect(screen.getByTestId('notif-pref-weeklyDigest').textContent).toContain('E-mail');
    expect(screen.getByTestId('notif-pref-dailyReminder').textContent).toContain('Push');
    expect(screen.getByTestId('notif-pref-prPush').textContent).toContain('W aplikacji');
    expect(screen.getByTestId('notif-pref-announcements').textContent).toContain('Push');
  });

  it('pole false w profilu wyłącza tylko swój przełącznik', () => {
    state.profile = { notificationPrefs: { prPush: false } };
    renderSettings();
    expect(screen.getByLabelText('Nowy rekord').getAttribute('aria-checked')).toBe('false');
    expect(screen.getByLabelText('Poranne przypomnienie o treningu').getAttribute('aria-checked')).toBe('true');
  });

  it('przełączenie zapisuje users/{uid}.notificationPrefs.<klucz>', async () => {
    renderSettings();
    fireEvent.click(screen.getByLabelText('Ogłoszenia od zespołu'));
    await waitFor(() => expect(updateDocMock).toHaveBeenCalledTimes(1));
    expect(updateDocMock).toHaveBeenCalledWith(
      { path: 'users/u1' },
      { 'notificationPrefs.announcements': false },
    );
    expect(screen.getByLabelText('Ogłoszenia od zespołu').getAttribute('aria-checked')).toBe('false');
  });

  // 2026-09-29: osobna zgoda na ogłoszenia e-mail (broadcast admina). Ten sam
  // klucz ustawia one-click unsubscribe z nagłówka List-Unsubscribe.
  it('ogłoszenia e-mail: osobny przełącznik kanału e-mail, zapis notificationPrefs.announcementEmails', async () => {
    renderSettings();
    const row = screen.getByTestId('notif-pref-announcementEmails');
    expect(row.textContent).toContain('Ogłoszenia e-mail od zespołu');
    expect(row.textContent).toContain('E-mail');
    fireEvent.click(screen.getByLabelText('Ogłoszenia e-mail od zespołu'));
    await waitFor(() => expect(updateDocMock).toHaveBeenCalledWith(
      { path: 'users/u1' },
      { 'notificationPrefs.announcementEmails': false },
    ));
  });

  it('wypis z maila (announcementEmails: false) widoczny jako wyłączony przełącznik', () => {
    state.profile = { notificationPrefs: { announcementEmails: false } };
    renderSettings();
    expect(screen.getByLabelText('Ogłoszenia e-mail od zespołu').getAttribute('aria-checked')).toBe('false');
    expect(screen.getByLabelText('Ogłoszenia od zespołu').getAttribute('aria-checked')).toBe('true');
  });

  it('błąd zapisu cofa przełącznik', async () => {
    updateDocMock.mockRejectedValueOnce(new Error('offline'));
    renderSettings();
    fireEvent.click(screen.getByLabelText('Nowy rekord'));
    await waitFor(() => {
      expect(screen.getByLabelText('Nowy rekord').getAttribute('aria-checked')).toBe('true');
    });
  });

  it('web: informacja "push tylko w aplikacji mobilnej", przełączniki nadal dostępne', () => {
    renderSettings();
    expect(screen.getByText(/aplikacji mobilnej/)).toBeTruthy();
    expect(screen.getAllByRole('switch')).toHaveLength(7);
  });

  it('native z udzieloną zgodą: status włączone', async () => {
    state.native = true;
    renderSettings();
    expect(await screen.findByText('Powiadomienia włączone.')).toBeTruthy();
    expect(screen.getByText('Uprawnienia systemowe')).toBeTruthy();
  });

  // 2026-09-30: push o zakupach tylko na konto właściciela (parametr serwera);
  // przełącznik widzi wyłącznie to konto, reszta userów ma dokładnie 7 typów.
  it('zwykły user: brak przełącznika subskrypcji i zero zapytań o status odbiorcy', () => {
    renderSettings();
    expect(screen.queryByTestId('notif-pref-subscriptionAlerts')).toBeNull();
    expect(recipientStatus).not.toHaveBeenCalled();
  });

  it('admin, który nie jest odbiorcą: nadal 7 przełączników', async () => {
    state.isAdmin = true;
    renderSettings();
    await waitFor(() => expect(recipientStatus).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('notif-pref-subscriptionAlerts')).toBeNull();
    expect(screen.getAllByRole('switch')).toHaveLength(7);
  });

  it('konto właściciela: przełącznik domyślnie włączony, zapis notificationPrefs.subscriptionAlerts', async () => {
    state.isAdmin = true;
    state.recipient = true;
    renderSettings();
    const toggle = await screen.findByLabelText('Powiadomienia o subskrypcjach');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('notif-pref-subscriptionAlerts').textContent).toContain('Push');
    fireEvent.click(toggle);
    await waitFor(() => expect(updateDocMock).toHaveBeenCalledWith(
      { path: 'users/u1' },
      { 'notificationPrefs.subscriptionAlerts': false },
    ));
    expect(screen.getByLabelText('Powiadomienia o subskrypcjach').getAttribute('aria-checked')).toBe('false');
  });

  it('konto właściciela z wyłączonym polem: przełącznik wyłączony; błąd statusu = brak przełącznika', async () => {
    state.isAdmin = true;
    state.recipient = true;
    state.profile = { notificationPrefs: { subscriptionAlerts: false } };
    const first = renderSettings();
    expect((await screen.findByLabelText('Powiadomienia o subskrypcjach')).getAttribute('aria-checked')).toBe('false');
    first.unmount();
    recipientStatus.mockRejectedValueOnce(new Error('offline'));
    renderSettings();
    await waitFor(() => expect(recipientStatus).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('notif-pref-subscriptionAlerts')).toBeNull();
  });
});
