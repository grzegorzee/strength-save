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
// X35b: RestSettingsCard → timer-sound → global-error-telemetry ciągnie Firebase Auth (jsdom pada).
vi.mock('@/lib/global-error-telemetry', () => ({ reportClientErrorWithCurrentUid: vi.fn() }));

const firestoreFixture = vi.hoisted(() => ({
  updateDoc: vi.fn(async () => {}),
  DELETE_SENTINEL: '__DELETE_FIELD__',
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  updateDoc: firestoreFixture.updateDoc,
  deleteField: vi.fn(() => firestoreFixture.DELETE_SENTINEL),
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
// WP-I: profil sterowalny per test (sekcja Trener widoczna tylko z trainerEmail).
const userFixture = vi.hoisted(() => ({
  profile: { displayName: 'Tester', email: 'tester@example.com', photoURL: null } as Record<string, unknown>,
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({
    uid: 'u1',
    profile: userFixture.profile,
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
import { RestSettingsCard } from '@/components/RestSettingsCard';
import { loadRestSettings, saveRestSettings } from '@/lib/rest-timer';
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
  userFixture.profile = { displayName: 'Tester', email: 'tester@example.com', photoURL: null };
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

describe('krok 3 + fala 2: sekcje Profilu wg artboardu 1a', () => {
  it('sekcje w kolejności: Osiągnięcia → Trening → Kolor → Subskrypcja → Twoje dane → Aplikacja → Konto i pomoc', () => {
    // Bez grupy Połączenia: web (nie natywnie) i brak canUseStrava w mocku.
    const { container } = renderProfile();
    const labels = Array.from(container.querySelectorAll('h2')).map((h) => h.textContent);
    expect(labels).toEqual([
      'Osiągnięcia', 'Trening', 'Kolor przewodni aplikacji', 'Subskrypcja',
      'Twoje dane', 'Aplikacja', 'Konto i pomoc',
    ]);
  });

  it('TRENING: timer przerwy (z selectem przerwy), dźwięk, jednostki, tryby — w tej kolejności', () => {
    const { container, getByLabelText } = renderProfile();
    const trening = sectionByLabel(container, 'Trening');
    const text = trening.textContent ?? '';
    const order = ['Timer przerwy', 'Dźwięk timera', 'Jednostki', 'Nie na 100%?', 'Urlop / wyjazd']
      .map((l) => text.indexOf(l));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Select domyślnej przerwy żyje w wierszu timera (aria-label bez zmian).
    expect(getByLabelText('Domyślny czas odpoczynku')).toBeTruthy();
    // Dźwięk wyprowadzony z Aplikacji, nie zdublowany.
    const app = sectionByLabel(container, 'Aplikacja');
    expect(app.textContent).not.toContain('Dźwięk timera');
  });

  it('F-T2: sekcja Wygląd — wybór akcentu ustawia tokeny CSS i mirror w profilu', async () => {
    // Plan I: paleta wg wzoru właściciela — cyan zastąpiony przez sky (#29b6f6).
    const { getByTestId } = renderProfile();
    fireEvent.click(getByTestId('accent-sky'));
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('199 92% 56%');
    expect(document.documentElement.dataset.accent).toBe('sky');
    await waitFor(() => expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(
      expect.anything(), { 'preferences.accentColor': 'sky' },
    ));
    // Powrót do limonki zdejmuje nadpisania.
    fireEvent.click(getByTestId('accent-lime'));
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
  });

  it('F-T2b: własny kolor po hex — walidacja i zastosowanie + mirror', async () => {
    const { getByTestId } = renderProfile();
    const input = getByTestId('accent-hex-input') as HTMLInputElement;
    const apply = getByTestId('accent-hex-apply') as HTMLButtonElement;
    fireEvent.change(input, { target: { value: '#12' } });
    expect(apply.disabled).toBe(true);
    fireEvent.change(input, { target: { value: '#1E90FF' } });
    expect(apply.disabled).toBe(false);
    fireEvent.click(apply);
    expect(document.documentElement.dataset.accent).toBe('custom');
    expect(document.documentElement.style.getPropertyValue('--primary')).toMatch(/^\d+ \d+% \d+%$/);
    await waitFor(() => expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(
      expect.anything(), { 'preferences.accentColor': '#1e90ff' },
    ));
  });

  it('F-T1: tap w imię pod zdjęciem otwiera dialog edycji imienia', async () => {
    const { getByTestId, getByLabelText } = renderProfile();
    fireEvent.click(getByTestId('profile-name-edit'));
    await waitFor(() => expect(getByLabelText('Imię')).toBeTruthy());
  });

  it('niezmiennik (zasada #5): wszystkie dotychczasowe wiersze i akcje obecne po redesignie', () => {
    const { container, getByText, getByTestId, getByLabelText } = renderProfile();
    // IDENTITY: imię (dialog), avatar (upload), email (WP-G: domyślnie
    // zamaskowany, pełny po odsłonięciu toggle), chip poziomu.
    expect(getByTestId('profile-name-edit')).toBeTruthy();
    expect(getByLabelText('Zmień zdjęcie profilowe')).toBeTruthy();
    expect(getByText('t•••••@e••••••.com')).toBeTruthy();
    fireEvent.click(getByLabelText('Pokaż lub ukryj adres email'));
    expect(getByText('tester@example.com')).toBeTruthy();
    expect(getByTestId('chip-tier')).toBeTruthy();
    // KAFLE DUMY (fala 2): 4 realne statystyki, renderowane zawsze.
    ['Treningi', 'Seria', 'Tonaż', 'Serie'].forEach((l) => expect(getByText(l)).toBeTruthy());
    // TRENING (karta)
    ['Timer przerwy', 'Dźwięk timera', 'Jednostki', 'Nie na 100%?', 'Urlop / wyjazd']
      .forEach((l) => expect(getByText(l)).toBeTruthy());
    // KOLOR AKCENTU: swatche + custom + hex (testidy e2e).
    ['accent-swatches', 'accent-custom', 'accent-hex-input', 'accent-hex-apply']
      .forEach((id) => expect(getByTestId(id)).toBeTruthy());
    // SUBSKRYPCJA (admin → "Pełny dostęp")
    expect(within(sectionByLabel(container, 'Subskrypcja')).getByText('Pełny dostęp')).toBeTruthy();
    // TWOJE DANE
    const dane = sectionByLabel(container, 'Twoje dane');
    ['Historia', 'Pomiary ciała', 'Postępy', 'Rekordy sprzed aplikacji', 'Kopia i import',
      'Prywatność', 'Ustawienia zaawansowane', 'Admin']
      .forEach((l) => expect(within(dane).getByText(l)).toBeTruthy());
    // APLIKACJA
    ['Powiadomienia', 'Język'].forEach((l) => expect(getByText(l)).toBeTruthy());
    // KONTO I POMOC
    const konto = sectionByLabel(container, 'Konto i pomoc');
    ['Imię i avatar', 'Zmień hasło', 'Centrum pomocy', 'Kontakt', 'O aplikacji']
      .forEach((l) => expect(within(konto).getByText(l)).toBeTruthy());
    // Stopka akcji + wersja
    expect(getByText('Wyloguj')).toBeTruthy();
    expect(getByText('Usuń konto i wszystkie dane')).toBeTruthy();
    expect(getByText('Strength Save 0.0.0-test')).toBeTruthy();
  });
});

// WP-G (plan X29): email w bloku identity domyślnie zamaskowany; toggle oka
// odsłania i zapamiętuje wybór w localStorage `ss-email-visible`.
describe('WP-G: maskowanie emaila w Profilu', () => {
  it('domyślnie maska, pełny adres niewidoczny', () => {
    const { getByText, queryByText } = renderProfile();
    expect(getByText('t•••••@e••••••.com')).toBeTruthy();
    expect(queryByText('tester@example.com')).toBeNull();
  });

  it('klik toggle odsłania adres i zapisuje ss-email-visible=true', () => {
    const { getByText, getByLabelText, queryByText } = renderProfile();
    fireEvent.click(getByLabelText('Pokaż lub ukryj adres email'));
    expect(getByText('tester@example.com')).toBeTruthy();
    expect(queryByText('t•••••@e••••••.com')).toBeNull();
    expect(localStorage.getItem('ss-email-visible')).toBe('true');
  });

  it('ponowny klik maskuje z powrotem i zapisuje false', () => {
    const { getByText, getByLabelText } = renderProfile();
    const toggle = getByLabelText('Pokaż lub ukryj adres email');
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(getByText('t•••••@e••••••.com')).toBeTruthy();
    expect(localStorage.getItem('ss-email-visible')).toBe('false');
  });

  it('persist: ss-email-visible=true w localStorage → pełny adres od pierwszego renderu', () => {
    localStorage.setItem('ss-email-visible', 'true');
    const { getByText } = renderProfile();
    expect(getByText('tester@example.com')).toBeTruthy();
  });
});

// WP-I (plan X29): sekcja Trener — podgląd zapisanego odbiorcy maili
// (imię + zamaskowany adres), zmiana imienia inline, usunięcie obu pól.
describe('WP-I: sekcja Trener w Profilu', () => {
  const withTrainer = (name?: string) => {
    userFixture.profile = {
      displayName: 'Tester', email: 'tester@example.com', photoURL: null,
      preferences: { trainerEmail: 'coach@example.com', ...(name ? { trainerName: name } : {}) },
    };
  };

  it('bez trainerEmail: sekcji nie ma', () => {
    const { container } = renderProfile();
    expect(Array.from(container.querySelectorAll('h2')).map((h) => h.textContent)).not.toContain('Trener');
  });

  it('z trainerEmail + imieniem: imię widoczne, adres ZAMASKOWANY', () => {
    withTrainer('Marek');
    const { container, getByText, queryByText } = renderProfile();
    const sekcja = sectionByLabel(container, 'Trener');
    expect(within(sekcja).getByText('Marek')).toBeTruthy();
    expect(getByText('c••••@e••••••.com')).toBeTruthy();
    expect(queryByText('coach@example.com')).toBeNull();
  });

  it('bez imienia: w wierszu zamaskowany adres', () => {
    withTrainer();
    const { container } = renderProfile();
    const sekcja = sectionByLabel(container, 'Trener');
    expect(within(sekcja).getByText('c••••@e••••••.com')).toBeTruthy();
  });

  it('Zmień imię: inline input + zapis preferences.trainerName', async () => {
    withTrainer('Marek');
    const { container } = renderProfile();
    const sekcja = sectionByLabel(container, 'Trener');
    fireEvent.click(within(sekcja).getByText('Zmień imię'));
    const input = within(sekcja).getByLabelText('Imię trenera') as HTMLInputElement;
    expect(input.value).toBe('Marek');
    fireEvent.change(input, { target: { value: ' Ania ' } });
    fireEvent.click(within(sekcja).getByText('Zapisz'));
    await waitFor(() => expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(
      expect.anything(), { 'preferences.trainerName': 'Ania' },
    ));
  });

  it('Zmień imię na puste = wyczyszczenie pola (deleteField)', async () => {
    withTrainer('Marek');
    const { container } = renderProfile();
    const sekcja = sectionByLabel(container, 'Trener');
    fireEvent.click(within(sekcja).getByText('Zmień imię'));
    fireEvent.change(within(sekcja).getByLabelText('Imię trenera'), { target: { value: '  ' } });
    fireEvent.click(within(sekcja).getByText('Zapisz'));
    await waitFor(() => expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(
      expect.anything(), { 'preferences.trainerName': firestoreFixture.DELETE_SENTINEL },
    ));
  });

  it('Usuń: czyści oba pola deleteField (akcja odwracalna, bez dialogu)', async () => {
    withTrainer('Marek');
    const { container } = renderProfile();
    fireEvent.click(within(sectionByLabel(container, 'Trener')).getByText('Usuń adres trenera'));
    await waitFor(() => expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(
      expect.anything(), {
        'preferences.trainerEmail': firestoreFixture.DELETE_SENTINEL,
        'preferences.trainerName': firestoreFixture.DELETE_SENTINEL,
      },
    ));
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
  // X35b: jedno źródło prawdy o przerwach = preferences.rest (cache
  // fittracker_rest_settings_v1). Sheet i RestSettingsCard czytają loadRestSettings;
  // legacy preferences.restTimerSec nie jest już pisane.
  it('zmiana domyślnej przerwy w sheet → cache RestSettings + preferences.rest (custom) + widoczna w RestSettingsCard', async () => {
    const sheet = renderSheet();
    fireEvent.click(sheet.getByLabelText('Domyślny czas odpoczynku'));
    fireEvent.click(await sheet.findByText('120s'));
    expect(loadRestSettings()).toMatchObject({ workingSeconds: 120, custom: true });
    await waitFor(() => expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(expect.anything(), {
      'preferences.rest': expect.objectContaining({ workingSeconds: 120, custom: true }),
    }));
    expect(firestoreFixture.updateDoc).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ 'preferences.restTimerSec': expect.anything() }));
    sheet.unmount();

    const card = render(<LanguageProvider><RestSettingsCard /></LanguageProvider>);
    expect((card.getByLabelText(/Przerwa między seriami/i) as HTMLInputElement).value).toBe('120');
  });

  it('wartość spoza siatki (75 s z celu atletyka) jest widoczna w Select sheeta, nie znika', () => {
    saveRestSettings({ workingSeconds: 75, betweenExercisesSeconds: 120, warmupSeconds: 45, perExercise: {}, custom: false });
    const sheet = renderSheet();
    expect(sheet.getByLabelText('Domyślny czas odpoczynku').textContent).toContain('75');
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

  // PRO-D T3 + fala 2: pasek postępu poziomu pełnej szerokości pod identity,
  // tekst "N do: {poziom}" w rzędzie chipów (0 treningów → 5 do Rookie).
  it('nagłówek: pasek postępu do następnego poziomu (tier.next != null)', () => {
    const { getByTestId, getByText } = renderProfile();
    expect(getByTestId('tier-progress')).toBeTruthy();
    expect(getByText(/5 do: Rookie/)).toBeTruthy();
  });
});
