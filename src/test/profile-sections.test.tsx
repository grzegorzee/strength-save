import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// Krok 3 redesignu Profilu (spec 2026-08-11): reorganizacja sekcji.
// Niezmiennik (zasada #5): żaden wiersz ani akcja Profilu nie znika — zmienia
// się wyłącznie grupowanie, kolejność i etykiety.

// Vite define nie działa w vitest bez wpisu w configu — stub lokalny.
vi.stubGlobal('__APP_VERSION__', '0.0.0-test');

const firestoreFixture = vi.hoisted(() => ({
  updateDoc: vi.fn(async () => {}),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  updateDoc: firestoreFixture.updateDoc,
}));
vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn(async () => {}),
  getDownloadURL: vi.fn(async () => ''),
}));
vi.mock('@/lib/firebase', () => ({ db: {}, storage: {} }));
// Krok 14 Runna p.1: Profil używa useTrainingPlan (tryb "nie na 100%") —
// mock zamiast realnego hooka (częściowy mock firestore nie ma onSnapshot).
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({
    reducedMode: null,
    setReducedMode: vi.fn(async () => ({ success: true })),
    vacation: null,
    setVacation: vi.fn(async () => ({ success: true })),
  }),
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({
    uid: 'u1',
    profile: { displayName: 'Tester', email: 'tester@example.com', photoURL: null },
    isAdmin: true,
  }),
}));
const authFixture = vi.hoisted(() => ({
  resetPassword: vi.fn(async () => true),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
    logoutAfterAccountDeletion: vi.fn(),
    resetPassword: authFixture.resetPassword,
  }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({ workouts: [] }),
}));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/registration-api', () => ({ deleteOwnAccount: vi.fn() }));
vi.mock('@/hooks/useSubscription', () => ({
  useSubscription: () => ({
    isPro: false, tier: 'none', startedAt: null, expiresAt: null, subscription: null,
  }),
  isPaywallPlatform: () => false,
}));
vi.mock('@/hooks/useWorkoutAggregate', () => ({ useWorkoutAggregate: () => null }));
const pushFixture = vi.hoisted(() => ({ permission: 'granted' }));
vi.mock('@/lib/push-notifications', () => ({
  getPushPermission: vi.fn(async () => pushFixture.permission),
}));

import Profile from '@/pages/Profile';
import { WorkoutSettingsSheet } from '@/components/WorkoutSettingsSheet';
import { readWorkoutTimersSetting } from '@/lib/workout-timers-setting';

const renderProfile = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <Profile />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

const sectionByLabel = (container: HTMLElement, label: string): HTMLElement => {
  const h2 = Array.from(container.querySelectorAll('h2')).find((h) => h.textContent === label);
  if (!h2) throw new Error(`brak sekcji "${label}"`);
  return h2.closest('section') as HTMLElement;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  pushFixture.permission = 'granted';
  authFixture.resetPassword.mockClear();
  firestoreFixture.updateDoc.mockClear();
});

const renderSheet = () =>
  render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <WorkoutSettingsSheet open onOpenChange={() => {}} />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

describe('krok 3: reorganizacja sekcji Profilu', () => {
  it('sekcje w kolejności: Trening → Twoje dane → Subskrypcja → Konto → Aplikacja → Pomoc → System', () => {
    const { container } = renderProfile();
    const labels = Array.from(container.querySelectorAll('h2')).map((h) => h.textContent);
    expect(labels).toEqual([
      'Trening', 'Twoje dane', 'Subskrypcja', 'Konto', 'Aplikacja', 'Pomoc', 'System',
    ]);
  });

  it('TRENING: timer przerwy, domyślna przerwa, dźwięk (z Aplikacji), jednostki — w tej kolejności', () => {
    const { container } = renderProfile();
    const trening = sectionByLabel(container, 'Trening');
    const text = trening.textContent ?? '';
    const order = ['Timer przerwy', 'Domyślny czas odpoczynku', 'Dźwięk timera', 'Jednostki']
      .map((l) => text.indexOf(l));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Dźwięk wyprowadzony z Aplikacji, nie zdublowany.
    const app = sectionByLabel(container, 'Aplikacja');
    expect(app.textContent).not.toContain('Dźwięk timera');
  });

  it('niezmiennik: wszystkie dotychczasowe wiersze i akcje obecne', () => {
    const { container, getByText } = renderProfile();
    // TWOJE DANE
    ['Historia', 'Pomiary ciała', 'Osiągnięcia'].forEach((l) => expect(getByText(l)).toBeTruthy());
    // SUBSKRYPCJA (admin → "Pełny dostęp")
    expect(within(sectionByLabel(container, 'Subskrypcja')).getByText('Pełny dostęp')).toBeTruthy();
    // KONTO
    ['Edytuj profil', 'Zmień hasło', 'Prywatność'].forEach((l) => expect(getByText(l)).toBeTruthy());
    // APLIKACJA
    ['Powiadomienia', 'Język'].forEach((l) => expect(getByText(l)).toBeTruthy());
    // POMOC
    const pomoc = sectionByLabel(container, 'Pomoc');
    ['Centrum pomocy', 'Kontakt', 'O aplikacji'].forEach((l) => expect(within(pomoc).getByText(l)).toBeTruthy());
    // SYSTEM: zaawansowane + Admin (tylko admin)
    const system = sectionByLabel(container, 'System');
    expect(within(system).getByText('Ustawienia zaawansowane')).toBeTruthy();
    expect(within(system).getByText('Admin')).toBeTruthy();
    // Stopka akcji
    expect(getByText('Wyloguj')).toBeTruthy();
    expect(getByText('Usuń konto i wszystkie dane')).toBeTruthy();
  });
});

describe('krok 4: stan w wierszu Powiadomienia (getPushPermission)', () => {
  it('zgoda granted → "Włączone"', async () => {
    pushFixture.permission = 'granted';
    const { findByText } = renderProfile();
    expect(await findByText('Włączone')).toBeTruthy();
  });

  it.each(['prompt', 'denied', 'unsupported'])('zgoda %s → "Wyłączone"', async (permission) => {
    pushFixture.permission = permission;
    const { findByText } = renderProfile();
    expect(await findByText('Wyłączone')).toBeTruthy();
  });
});

describe('krok 5: potwierdzenie resetu hasła', () => {
  it('klik "Zmień hasło" otwiera dialog, mail leci DOPIERO po potwierdzeniu', async () => {
    const { getByText, findByText } = renderProfile();
    fireEvent.click(getByText('Zmień hasło'));
    // Sam klik w wiersz nie wysyła maila.
    expect(authFixture.resetPassword).not.toHaveBeenCalled();
    expect(await findByText(/Wyślemy link resetu na tester@example\.com/)).toBeTruthy();
    fireEvent.click(getByText('Wyślij'));
    await waitFor(() => expect(authFixture.resetPassword).toHaveBeenCalledWith('tester@example.com'));
  });

  it('anulowanie dialogu nie wysyła maila', async () => {
    const { getByText, findByText, queryByText } = renderProfile();
    fireEvent.click(getByText('Zmień hasło'));
    expect(await findByText(/Wyślemy link resetu/)).toBeTruthy();
    fireEvent.click(getByText('Anuluj'));
    await waitFor(() => expect(queryByText(/Wyślemy link resetu/)).toBeNull());
    expect(authFixture.resetPassword).not.toHaveBeenCalled();
  });
});

// Krok 6 (spec 2026-08-11): skrót w treningu pisze i czyta TE SAME klucze co
// Profil (localStorage + preferences.* w Firestore) — test SEKWENCJI obu kierunków.
describe('krok 6: WorkoutSettingsSheet ↔ Profil (te same klucze zapisu)', () => {
  it('zmiana domyślnej przerwy w sheet → localStorage + preferences.restTimerSec + widoczna w Profilu', async () => {
    const sheet = renderSheet();
    fireEvent.click(sheet.getByLabelText('Domyślny czas odpoczynku'));
    fireEvent.click(await sheet.findByText('120s'));
    expect(localStorage.getItem('rest-timer-default')).toBe('120');
    expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(expect.anything(), { 'preferences.restTimerSec': 120 });
    sheet.unmount();

    const profil = renderProfile();
    expect(profil.getByLabelText('Domyślny czas odpoczynku').textContent).toContain('120');
  });

  it('wyłączenie dźwięku w sheet → localStorage + preferences.timerSound + widoczne w Profilu', () => {
    const sheet = renderSheet();
    fireEvent.click(sheet.getByLabelText('Dźwięk timera'));
    expect(localStorage.getItem('timer-sound-enabled')).toBe('false');
    expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(expect.anything(), { 'preferences.timerSound': false });
    sheet.unmount();

    const profil = renderProfile();
    expect(profil.getByLabelText('Dźwięk timera').getAttribute('aria-checked')).toBe('false');
  });

  it('wyłączenie dźwięku w Profilu → widoczne w sheet (kierunek odwrotny)', () => {
    const profil = renderProfile();
    fireEvent.click(profil.getByLabelText('Dźwięk timera'));
    expect(localStorage.getItem('timer-sound-enabled')).toBe('false');
    profil.unmount();

    const sheet = renderSheet();
    expect(sheet.getByLabelText('Dźwięk timera').getAttribute('aria-checked')).toBe('false');
  });

  it('wyłączenie timera w sheet → ten sam klucz co Profil + widoczne w Profilu', () => {
    const sheet = renderSheet();
    fireEvent.click(sheet.getByLabelText('Timer przerwy'));
    expect(readWorkoutTimersSetting()).toBe(false);
    sheet.unmount();

    const profil = renderProfile();
    expect(profil.getByLabelText('Timer przerwy').getAttribute('aria-checked')).toBe('false');
  });

  // PRO-D T3: pasek postępu poziomu pod chipami nagłówka.
  it('nagłówek: pasek postępu do następnego poziomu (tier.next != null)', () => {
    const { getByTestId, getByText } = renderProfile();
    expect(getByTestId('tier-progress')).toBeTruthy();
    expect(getByText(/Następny poziom:/)).toBeTruthy();
  });
});
