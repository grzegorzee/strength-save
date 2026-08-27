import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

// Krok 3 redesignu Profilu (spec 2026-08-11) + X35b (WP-B) + X36 (głosówka
// właściciela po buildzie 124): każda sekcja ustawień to jeden ZWIJANY wiersz
// z chevronem, nowe grupowanie (Trening / Timer i przerwy / Talerze / Trener /
// Urządzenia i połączenia / Powiadomienia / Subskrypcja / Dane / Backup /
// Zgody / Konto). Niezmiennik (zasada #5): żaden wiersz ani akcja nie znika —
// zmienia się grupowanie, kolejność, zwijanie i etykiety.

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
vi.mock('@/lib/firebase', () => ({ db: {}, storage: {}, functions: {} }));
// Krok 14 Runna p.1: Profil używa useTrainingPlan (tryb "nie na 100%") —
// mock zamiast realnego hooka (częściowy mock firestore nie ma onSnapshot).
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({
    plan: [],
    isCustom: false,
    planDurationWeeks: 12,
    planStartDate: null,
    reducedMode: null,
    setReducedMode: vi.fn(async () => ({ success: true })),
    vacation: null,
    setVacation: vi.fn(async () => ({ success: true })),
  }),
}));
// WP-I: profil sterowalny per test (sekcja Trener: pusty stan vs zapisany adres);
// X35b: canUseStrava steruje panelem Strava w sekcji Połączenia.
const userFixture = vi.hoisted(() => ({
  profile: { displayName: 'Tester', email: 'tester@example.com', photoURL: null } as Record<string, unknown>,
  canUseStrava: false,
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({
    uid: 'u1',
    profile: userFixture.profile,
    isAdmin: true,
    canUseStrava: userFixture.canUseStrava,
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
  useFirebaseWorkouts: () => ({
    workouts: [], isLoaded: true, exportData: vi.fn(), importData: vi.fn(),
  }),
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
  registerPushForUser: vi.fn(async () => ({ status: 'registered' })),
  requestPushPermission: vi.fn(async () => true),
}));
// X35b: karty z dawnych Ustawień renderują się NAPRAWDĘ (sekcje mają być
// widoczne), tylko ich hooki sieciowe dostają mocki.
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ cycles: [], isLoaded: true }),
}));
vi.mock('@/hooks/useCustomExercises', () => ({
  useCustomExercises: () => ({ customExercises: [], addCustomExercise: vi.fn() }),
}));
vi.mock('@/hooks/useSyncCenterEntries', () => ({
  useSyncCenterEntries: () => ({ listedEntries: [], attentionEntries: [] }),
}));
vi.mock('@/lib/garmin-api', () => ({
  listLinkedDevices: vi.fn(async () => []),
  unlinkLinkedDevice: vi.fn(async () => ({ revoked: true })),
  reportAppleWatchStatus: vi.fn(async () => ({ linked: false })),
  startGarminPairing: vi.fn(async () => ({ code: '000000', expiresAt: 0 })),
}));
vi.mock('@/lib/watch-bridge', () => ({ getWatchAvailability: vi.fn(async () => null) }));
vi.mock('@/hooks/useStrava', () => ({
  useStrava: () => ({
    connection: { connected: false },
    isSyncing: false,
    error: null,
    connectStrava: vi.fn(),
    syncActivities: vi.fn(),
    saveMaxHR: vi.fn(),
    disconnectStrava: vi.fn(),
    nextSyncAvailableAt: null,
  }),
}));

import Profile from '@/pages/Profile';
import { WorkoutSettingsSheet } from '@/components/WorkoutSettingsSheet';
import { RestSettingsCard } from '@/components/RestSettingsCard';
import { loadRestSettings, saveRestSettings } from '@/lib/rest-timer';
import { readWorkoutTimersSetting } from '@/lib/workout-timers-setting';
import { isWarmupPromptEnabled } from '@/lib/warmup-prompt';
import { shouldOfferPreStartWarmup } from '@/lib/prestart-warmup';

const renderProfile = (entry = '/profile') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <LanguageProvider>
        <UnitProvider>
          <Profile />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );

// X36: etykieta sekcji zwijanej siedzi w <h2> > <button> > [data-section-label]
// (wartość w wierszu nie jest częścią etykiety); sekcje otwarte (Osiągnięcia)
// mają zwykłe h2.
const headingLabel = (h: HTMLHeadingElement): string =>
  (h.querySelector('[data-section-label]') ?? h).textContent ?? '';
const sectionLabels = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll('h2')).map(headingLabel);
const sectionByLabel = (container: HTMLElement, label: string): HTMLElement => {
  const h2 = Array.from(container.querySelectorAll('h2')).find((h) => headingLabel(h) === label);
  if (!h2) throw new Error(`brak sekcji "${label}"`);
  return h2.closest('section') as HTMLElement;
};
const openSection = (id: string) => {
  fireEvent.click(screen.getByTestId(`profile-toggle-${id}`));
};

const PROFILE_SECTIONS = [
  'Osiągnięcia', 'Kolor przewodni aplikacji', 'Trening', 'Timer i przerwy', 'Kalkulator talerzy',
  'Trener', 'Urządzenia i połączenia', 'Powiadomienia', 'Subskrypcja', 'Twoje dane',
  'Backup i przywracanie', 'Zgody i prywatność', 'Konto i pomoc',
];
// X37: Kolor przewodni znów zawsze rozwinięty (uwaga właściciela po 125).
const COLLAPSIBLE_IDS = [
  'training', 'timer', 'plates', 'trainer', 'devices', 'notifications',
  'subscription', 'data', 'backup', 'consents', 'account',
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  pushFixture.permission = 'granted';
  authFixture.resetPassword.mockClear();
  firestoreFixture.updateDoc.mockClear();
  userFixture.profile = { displayName: 'Tester', email: 'tester@example.com', photoURL: null };
  userFixture.canUseStrava = false;
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

describe('X36: Profil w zwijanych sekcjach (nowe grupowanie)', () => {
  it('sekcje w kolejności: Osiągnięcia → Kolor → Trening → Timer i przerwy → Talerze → Trener → Urządzenia i połączenia → Powiadomienia → Subskrypcja → Dane → Backup → Zgody → Konto', () => {
    const { container } = renderProfile();
    expect(sectionLabels(container)).toEqual(PROFILE_SECTIONS);
  });

  it('każda sekcja ma kotwicę id="profile-<sekcja>" (deep linki ?section=)', () => {
    const { container } = renderProfile();
    ['identity', 'pride', ...COLLAPSIBLE_IDS]
      .forEach((id) => expect(container.querySelector(`#profile-${id}`), id).toBeTruthy());
  });

  it('wszystkie sekcje ustawień domyślnie ZWINIĘTE: jedna linia na sekcję, treść niezamontowana', () => {
    const { container, queryByLabelText, queryByTestId } = renderProfile();
    COLLAPSIBLE_IDS.forEach((id) => {
      expect(screen.getByTestId(`profile-section-${id}`).getAttribute('data-state'), id).toBe('closed');
      expect(screen.getByTestId(`profile-toggle-${id}`), id).toBeTruthy();
    });
    expect(container.querySelectorAll('section[data-state="closed"]')).toHaveLength(COLLAPSIBLE_IDS.length);
    expect(queryByLabelText('Timer przerwy')).toBeNull();
    expect(queryByLabelText('Jednostki: kg')).toBeNull();
    expect(queryByTestId('device-settings')).toBeNull();
    // X37: kolor przewodni widoczny bez rozwijania.
    expect(screen.getByTestId('accent-swatches')).toBeTruthy();
  });

  it('klik wiersza rozwija sekcję, drugi klik zwija (chevron); inne sekcje bez zmian', () => {
    const { queryByLabelText } = renderProfile();
    openSection('training');
    expect(screen.getByTestId('profile-section-training').getAttribute('data-state')).toBe('open');
    expect(queryByLabelText('Jednostki: kg')).toBeTruthy();
    expect(screen.getByTestId('profile-section-timer').getAttribute('data-state')).toBe('closed');
    openSection('training');
    expect(screen.getByTestId('profile-section-training').getAttribute('data-state')).toBe('closed');
    expect(queryByLabelText('Jednostki: kg')).toBeNull();
  });

  it('deep link ?section=notifications ROZWIJA sekcję Powiadomienia i przewija do niej', async () => {
    // setup.ts stubuje scrollIntoView na HTMLElement.prototype — podmieniamy tam.
    const scrollSpy = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollSpy;
    renderProfile('/profile?section=notifications');
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    const target = scrollSpy.mock.instances[0] as HTMLElement;
    expect(target.id).toBe('profile-notifications');
    expect(screen.getByTestId('profile-section-notifications').getAttribute('data-state')).toBe('open');
    expect(screen.getByText(/Powiadomienia push działają w aplikacji mobilnej/)).toBeTruthy();
  });

  it('stare kotwice: ?section=connections i ?section=strava otwierają Urządzenia i połączenia, ?section=rest otwiera Timer i przerwy', async () => {
    const first = renderProfile('/profile?section=connections');
    await waitFor(() => expect(first.getByTestId('device-settings')).toBeTruthy());
    expect(first.getByTestId('profile-section-devices').getAttribute('data-state')).toBe('open');
    first.unmount();

    const second = renderProfile('/profile?section=strava');
    expect(second.getByTestId('profile-section-devices').getAttribute('data-state')).toBe('open');
    second.unmount();

    const third = renderProfile('/profile?section=rest');
    expect(third.getByTestId('profile-section-timer').getAttribute('data-state')).toBe('open');
    expect(await third.findByLabelText('Przerwa między seriami')).toBeTruthy();
  });

  it('TRENING: jednostki, nie wygaszaj ekranu, proponuj rozgrzewkę, tryby, w tej kolejności; wiersz pokazuje jednostkę', () => {
    const { container, queryByLabelText } = renderProfile();
    expect(screen.getByTestId('profile-toggle-training').textContent).toContain('KG');
    openSection('training');
    const trening = sectionByLabel(container, 'Trening');
    const text = trening.textContent ?? '';
    // X37 WP-B: przełącznik rozgrzewki między "Nie wygaszaj ekranu" a "Nie na 100%?".
    const order = ['Jednostki', 'Nie wygaszaj ekranu podczas treningu', 'Proponuj rozgrzewkę przed treningiem', 'Nie na 100%?', 'Urlop / wyjazd']
      .map((l) => text.indexOf(l));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Timer i dźwięk przeszły do sekcji "Timer i przerwy".
    expect(within(trening).queryByLabelText('Timer przerwy')).toBeNull();
    expect(within(trening).queryByLabelText('Dźwięk timera')).toBeNull();
    // Stary Select "Domyślny czas odpoczynku" zniknął z Profilu (RestSettingsCard go zastępuje).
    expect(queryByLabelText('Domyślny czas odpoczynku')).toBeNull();
  });

  it('TRENING: przełącznik "Nie wygaszaj ekranu" pisze fittracker_keep_awake_v1 (ten sam klucz co keep-awake.ts)', () => {
    renderProfile();
    openSection('training');
    const toggle = screen.getByTestId('profile-keep-awake');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(localStorage.getItem('fittracker_keep_awake_v1')).toBe('false');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  // X37 WP-B: przełącznik "Proponuj rozgrzewkę przed treningiem" pisze cache
  // fittracker_warmup_prompt_v1 (ten sam klucz, który czyta start treningu) i
  // mirror preferences.warmupPrompt; domyślnie włączony.
  it('TRENING: przełącznik "Proponuj rozgrzewkę" domyślnie ON; wyłączenie = cache false + preferences.warmupPrompt false', async () => {
    renderProfile();
    openSection('training');
    const toggle = screen.getByTestId('profile-warmup-prompt');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('Proponuj rozgrzewkę przed treningiem')).toBe(toggle);
    fireEvent.click(toggle);
    expect(localStorage.getItem('fittracker_warmup_prompt_v1')).toBe('false');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    await waitFor(() => expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(
      expect.anything(), { 'preferences.warmupPrompt': false },
    ));
    fireEvent.click(toggle);
    expect(localStorage.getItem('fittracker_warmup_prompt_v1')).toBe('true');
    await waitFor(() => expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(
      expect.anything(), { 'preferences.warmupPrompt': true },
    ));
  });

  it('sekwencja (zasada #5): wyłącz w Profilu -> start treningu nie proponuje arkusza; cache off z innego urządzenia = przełącznik OFF', () => {
    const { unmount } = renderProfile();
    openSection('training');
    fireEvent.click(screen.getByTestId('profile-warmup-prompt'));
    // Ta sama decyzja, którą podejmuje przycisk "Rozpocznij trening" (WorkoutDay).
    const startCtx = { alreadyStarted: false, hasDraftContent: false, autostart: false, viewingPast: false };
    expect(shouldOfferPreStartWarmup({ ...startCtx, warmupPrompt: isWarmupPromptEnabled() })).toBe(false);
    unmount();

    // Kierunek odwrotny: cache z PreferenceSync (chmura false) -> Profil pokazuje OFF.
    const again = renderProfile();
    openSection('training');
    expect(again.getByTestId('profile-warmup-prompt').getAttribute('aria-checked')).toBe('false');
  });

  it('TIMER I PRZERWY: wiersz pokazuje bieżącą przerwę; w środku timer, dźwięk i RestSettingsCard BEZ przełącznika wygaszania', async () => {
    const { container, findByLabelText, queryByLabelText, queryByTestId } = renderProfile();
    expect(screen.getByTestId('profile-toggle-timer').textContent).toContain('Między seriami: 90 s');
    expect(queryByLabelText('Przerwa między seriami')).toBeNull();
    openSection('timer');
    const sekcja = sectionByLabel(container, 'Timer i przerwy');
    expect(within(sekcja).getByLabelText('Timer przerwy')).toBeTruthy();
    expect(within(sekcja).getByLabelText('Dźwięk timera')).toBeTruthy();
    expect(await findByLabelText('Przerwa między seriami')).toBeTruthy();
    expect(queryByTestId('rest-keep-awake')).toBeNull();
    expect(within(sekcja).queryByText('Nie wygaszaj ekranu podczas treningu')).toBeNull();
  });

  it('TIMER I PRZERWY: wyłączony timer = wiersz "Wyłączony" zamiast przerwy', () => {
    renderProfile();
    openSection('timer');
    fireEvent.click(screen.getByLabelText('Timer przerwy'));
    expect(screen.getByTestId('profile-toggle-timer').textContent).toContain('Wyłączony');
    expect(screen.getByTestId('profile-toggle-timer').textContent).not.toContain('Między seriami');
  });

  it('URZĄDZENIA I POŁĄCZENIA: zegarek/Garmin i Strava w JEDNEJ sekcji; bez flagi Strava sam panel urządzeń, bez skrótu "Garmin i zegarek"', () => {
    const first = renderProfile();
    openSection('devices');
    const devices = sectionByLabel(first.container, 'Urządzenia i połączenia');
    expect(within(devices).getByTestId('device-settings')).toBeTruthy();
    expect(first.queryByTestId('strava-connection-card')).toBeNull();
    expect(first.queryByText('Garmin i zegarek')).toBeNull();
    expect(first.queryByText('Połączenia')).toBeNull();
    first.unmount();

    userFixture.canUseStrava = true;
    const second = renderProfile();
    openSection('devices');
    const devices2 = sectionByLabel(second.container, 'Urządzenia i połączenia');
    const card = within(devices2).getByTestId('strava-connection-card');
    expect(within(card).getByText('Połącz ze Stravą')).toBeTruthy();
    expect(within(devices2).getByTestId('device-settings')).toBeTruthy();
  });

  it('POWIADOMIENIA: sekcja niżej niż Trener i Urządzenia (nie są najważniejsze); po rozwinięciu karta bez zdublowanego tytułu', () => {
    const { container } = renderProfile();
    const labels = sectionLabels(container);
    expect(labels.indexOf('Powiadomienia')).toBeGreaterThan(labels.indexOf('Trener'));
    expect(labels.indexOf('Powiadomienia')).toBeGreaterThan(labels.indexOf('Urządzenia i połączenia'));
    openSection('notifications');
    const notif = sectionByLabel(container, 'Powiadomienia');
    expect(within(notif).getByText(/Powiadomienia push działają w aplikacji mobilnej/)).toBeTruthy();
    // Tytuł tylko w wierszu sekcji (h2), nie w karcie.
    expect(within(notif).getAllByText('Powiadomienia')).toHaveLength(1);
  });

  it('F-T2: sekcja Kolor przewodni (zawsze rozwinięta) — wybór akcentu ustawia tokeny CSS i mirror w profilu', async () => {
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

  it('F-T1: tap w imię pod zdjęciem otwiera dialog edycji imienia (jedyne wejście, bez duplikatu w Koncie)', async () => {
    const { getByTestId, getByLabelText, queryByText } = renderProfile();
    expect(queryByText('Imię i avatar')).toBeNull();
    fireEvent.click(getByTestId('profile-name-edit'));
    await waitFor(() => expect(getByLabelText('Imię')).toBeTruthy());
  });

  it('niezmiennik (zasada #5): wszystkie dotychczasowe wiersze i akcje obecne po rozwinięciu sekcji', () => {
    const { container, getByText, getByTestId, getByLabelText, queryByText } = renderProfile();
    COLLAPSIBLE_IDS.forEach(openSection);
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
    // TRENING + TIMER (dawna karta Trening + Przerwy)
    ['Jednostki', 'Nie wygaszaj ekranu podczas treningu', 'Proponuj rozgrzewkę przed treningiem', 'Nie na 100%?', 'Urlop / wyjazd']
      .forEach((l) => expect(within(sectionByLabel(container, 'Trening')).getByText(l)).toBeTruthy());
    const timer = sectionByLabel(container, 'Timer i przerwy');
    ['Timer przerwy', 'Dźwięk timera'].forEach((l) => expect(within(timer).getByLabelText(l)).toBeTruthy());
    expect(within(timer).getByLabelText('Przerwa między seriami')).toBeTruthy();
    // KOLOR AKCENTU: swatche + custom + hex (testidy e2e).
    ['accent-swatches', 'accent-custom', 'accent-hex-input', 'accent-hex-apply']
      .forEach((id) => expect(getByTestId(id)).toBeTruthy());
    // KALKULATOR TALERZY: inwentarz (bez własnego nagłówka w karcie).
    expect(within(sectionByLabel(container, 'Kalkulator talerzy')).getByLabelText('Sztuk 25')).toBeTruthy();
    // SUBSKRYPCJA (admin → "Pełny dostęp" w wierszu i w środku)
    expect(within(sectionByLabel(container, 'Subskrypcja')).getAllByText('Pełny dostęp').length).toBeGreaterThanOrEqual(1);
    // TWOJE DANE: dojścia; BACKUP i ZGODY jako własne sekcje.
    const dane = sectionByLabel(container, 'Twoje dane');
    ['Historia', 'Pomiary ciała', 'Postępy', 'Rekordy sprzed aplikacji', 'Admin']
      .forEach((l) => expect(within(dane).getByText(l)).toBeTruthy());
    const backup = sectionByLabel(container, 'Backup i przywracanie');
    ['Eksportuj kopię', 'Importuj kopię'].forEach((l) => expect(within(backup).getByText(l)).toBeTruthy());
    expect(within(sectionByLabel(container, 'Zgody i prywatność')).getByTestId('consent-marketing-toggle')).toBeTruthy();
    // "Ustawienia zaawansowane" nie istnieją — nie ma dokąd prowadzić.
    expect(queryByText('Ustawienia zaawansowane')).toBeNull();
    // KONTO I POMOC: język przeszedł tu z sekcji Aplikacja.
    const konto = sectionByLabel(container, 'Konto i pomoc');
    ['Język', 'Zmień hasło', 'Centrum pomocy', 'Zgłoś błąd', 'Kontakt', 'O aplikacji']
      .forEach((l) => expect(within(konto).getByText(l)).toBeTruthy());
    // X37: wiersz "Konto i pomoc" bez wartości języka ("Polski" myliło właściciela).
    expect(getByTestId('profile-toggle-account').textContent).not.toContain('Polski');
    // Stopka akcji + wersja
    expect(getByText('Wyloguj')).toBeTruthy();
    expect(getByText('Usuń konto i wszystkie dane')).toBeTruthy();
    expect(getByText('Strength Save 0.0.0-test')).toBeTruthy();
  });

  it('KONTO I POMOC: „Zgłoś błąd” otwiera prosty formularz w aplikacji', () => {
    const { container } = renderProfile();
    openSection('account');
    fireEvent.click(within(sectionByLabel(container, 'Konto i pomoc')).getByText('Zgłoś błąd'));
    expect(screen.getByRole('dialog', { name: 'Zgłoś błąd' })).toBeTruthy();
    expect(screen.getByLabelText('Co się stało?')).toBeTruthy();
  });

  it('narzędzia naprawcze NIE są w Profilu (przeniesione do /admin)', () => {
    const { queryByText } = renderProfile();
    COLLAPSIBLE_IDS.forEach(openSection);
    expect(queryByText('Narzędzia naprawcze')).toBeNull();
    expect(queryByText('Reset planu')).toBeNull();
  });

  it('O aplikacji pokazuje lokalizowaną informację o prawach autorskich', async () => {
    const { getByText } = renderProfile();
    openSection('account');
    fireEvent.click(getByText('O aplikacji'));
    await waitFor(() => expect(getByText('© 2026 Strength Save. Wszystkie prawa zastrzeżone.')).toBeTruthy());
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

// WP-I (plan X29) + X35b + X36: sekcja Trener zwijana — wiersz pokazuje imię /
// zamaskowany adres / "Nie ustawiono"; w środku pusty stan z formularzem
// "Dodaj trenera" (imię + e-mail z walidacją) albo zapisany adres (zmiana
// imienia inline, usunięcie).
describe('WP-I + X35b + X36: sekcja Trener w Profilu', () => {
  const withTrainer = (name?: string) => {
    userFixture.profile = {
      displayName: 'Tester', email: 'tester@example.com', photoURL: null,
      preferences: { trainerEmail: 'coach@example.com', ...(name ? { trainerName: name } : {}) },
    };
  };
  const openTrainer = (container: HTMLElement) => {
    openSection('trainer');
    return sectionByLabel(container, 'Trener');
  };

  it('bez trainerEmail: wiersz "Nie ustawiono", po rozwinięciu pusty stan z akcją "Dodaj trenera"', () => {
    const { container, getByTestId } = renderProfile();
    expect(getByTestId('profile-toggle-trainer').textContent).toContain('Nie ustawiono');
    const sekcja = openTrainer(container);
    expect(getByTestId('trainer-empty')).toBeTruthy();
    expect(within(sekcja).getByText('Dodaj trenera')).toBeTruthy();
    expect(within(sekcja).queryByText('Usuń adres trenera')).toBeNull();
  });

  it('Dodaj trenera: niepoprawny e-mail = błąd walidacji, zero zapisu', () => {
    const { container, getByTestId } = renderProfile();
    const sekcja = openTrainer(container);
    fireEvent.click(within(sekcja).getByText('Dodaj trenera'));
    expect(getByTestId('trainer-add-form')).toBeTruthy();
    fireEvent.change(within(sekcja).getByLabelText('E-mail trenera'), { target: { value: 'nie-mail' } });
    fireEvent.click(within(sekcja).getByText('Zapisz'));
    expect(within(sekcja).getByRole('alert').textContent).toContain('Podaj poprawny adres e-mail');
    expect(firestoreFixture.updateDoc).not.toHaveBeenCalled();
  });

  it('Dodaj trenera: poprawny e-mail + imię → zapis preferences.trainerEmail (znormalizowany) i trainerName', async () => {
    const { container } = renderProfile();
    const sekcja = openTrainer(container);
    fireEvent.click(within(sekcja).getByText('Dodaj trenera'));
    fireEvent.change(within(sekcja).getByLabelText('Imię trenera'), { target: { value: ' Marek ' } });
    fireEvent.change(within(sekcja).getByLabelText('E-mail trenera'), { target: { value: ' Coach@Example.com ' } });
    fireEvent.click(within(sekcja).getByText('Zapisz'));
    await waitFor(() => expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(
      expect.anything(), { 'preferences.trainerEmail': 'coach@example.com', 'preferences.trainerName': 'Marek' },
    ));
    // Formularz zamknięty; do przyjścia snapshotu profilu widać pusty stan.
    expect(within(sekcja).queryByTestId('trainer-add-form')).toBeNull();
  });

  it('Dodaj trenera bez imienia → trainerName czyszczony (deleteField), jak w dialogu maila', async () => {
    const { container } = renderProfile();
    const sekcja = openTrainer(container);
    fireEvent.click(within(sekcja).getByText('Dodaj trenera'));
    fireEvent.change(within(sekcja).getByLabelText('E-mail trenera'), { target: { value: 'coach@example.com' } });
    fireEvent.click(within(sekcja).getByText('Zapisz'));
    await waitFor(() => expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(
      expect.anything(), { 'preferences.trainerEmail': 'coach@example.com', 'preferences.trainerName': firestoreFixture.DELETE_SENTINEL },
    ));
  });

  it('Anuluj w formularzu wraca do pustego stanu bez zapisu', () => {
    const { container, getByTestId, queryByTestId } = renderProfile();
    const sekcja = openTrainer(container);
    fireEvent.click(within(sekcja).getByText('Dodaj trenera'));
    fireEvent.click(within(sekcja).getByText('Anuluj'));
    expect(queryByTestId('trainer-add-form')).toBeNull();
    expect(getByTestId('trainer-empty')).toBeTruthy();
    expect(firestoreFixture.updateDoc).not.toHaveBeenCalled();
  });

  it('z trainerEmail + imieniem: imię w wierszu i w środku, adres ZAMASKOWANY, bez pustego stanu', () => {
    withTrainer('Marek');
    const { container, getByTestId, getByText, queryByText, queryByTestId } = renderProfile();
    expect(getByTestId('profile-toggle-trainer').textContent).toContain('Marek');
    const sekcja = openTrainer(container);
    expect(within(sekcja).getAllByText('Marek').length).toBeGreaterThanOrEqual(2);
    expect(getByText('c••••@e••••••.com')).toBeTruthy();
    expect(queryByText('coach@example.com')).toBeNull();
    expect(queryByTestId('trainer-empty')).toBeNull();
  });

  it('bez imienia: zamaskowany adres w wierszu sekcji i w środku', () => {
    withTrainer();
    const { container, getByTestId } = renderProfile();
    expect(getByTestId('profile-toggle-trainer').textContent).toContain('c••••@e••••••.com');
    const sekcja = openTrainer(container);
    expect(within(sekcja).getAllByText('c••••@e••••••.com').length).toBeGreaterThanOrEqual(2);
  });

  it('Zmień imię: inline input + zapis preferences.trainerName', async () => {
    withTrainer('Marek');
    const { container } = renderProfile();
    const sekcja = openTrainer(container);
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
    const sekcja = openTrainer(container);
    fireEvent.click(within(sekcja).getByText('Zmień imię'));
    fireEvent.change(within(sekcja).getByLabelText('Imię trenera'), { target: { value: '  ' } });
    fireEvent.click(within(sekcja).getByText('Zapisz'));
    await waitFor(() => expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(
      expect.anything(), { 'preferences.trainerName': firestoreFixture.DELETE_SENTINEL },
    ));
  });

  it('Usuń: czyści oba pola deleteField, a po zniknięciu adresu z profilu wraca pusty stan', async () => {
    withTrainer('Marek');
    const { container, rerender, getByTestId } = renderProfile();
    const sekcja = openTrainer(container);
    fireEvent.click(within(sekcja).getByText('Usuń adres trenera'));
    await waitFor(() => expect(firestoreFixture.updateDoc).toHaveBeenCalledWith(
      expect.anything(), {
        'preferences.trainerEmail': firestoreFixture.DELETE_SENTINEL,
        'preferences.trainerName': firestoreFixture.DELETE_SENTINEL,
      },
    ));
    // Snapshot profilu bez adresu → sekcja zostaje (otwarta), pokazuje pusty stan.
    userFixture.profile = { displayName: 'Tester', email: 'tester@example.com', photoURL: null };
    rerender(
      <MemoryRouter>
        <LanguageProvider>
          <UnitProvider>
            <Profile />
          </UnitProvider>
        </LanguageProvider>
      </MemoryRouter>,
    );
    expect(getByTestId('trainer-empty')).toBeTruthy();
    expect(getByTestId('profile-toggle-trainer').textContent).toContain('Nie ustawiono');
  });
});

describe('krok 5: potwierdzenie resetu hasła', () => {
  it('klik "Zmień hasło" (sekcja Konto i pomoc) otwiera dialog, mail leci DOPIERO po potwierdzeniu', async () => {
    const { getByText, findByText } = renderProfile();
    openSection('account');
    fireEvent.click(getByText('Zmień hasło'));
    // Sam klik w wiersz nie wysyła maila.
    expect(authFixture.resetPassword).not.toHaveBeenCalled();
    expect(await findByText(/Wyślemy link resetu na tester@example\.com/)).toBeTruthy();
    fireEvent.click(getByText('Wyślij'));
    await waitFor(() => expect(authFixture.resetPassword).toHaveBeenCalledWith('tester@example.com'));
  });

  it('anulowanie dialogu nie wysyła maila', async () => {
    const { getByText, findByText, queryByText } = renderProfile();
    openSection('account');
    fireEvent.click(getByText('Zmień hasło'));
    expect(await findByText(/Wyślemy link resetu/)).toBeTruthy();
    fireEvent.click(getByText('Anuluj'));
    await waitFor(() => expect(queryByText(/Wyślemy link resetu/)).toBeNull());
    expect(authFixture.resetPassword).not.toHaveBeenCalled();
  });
});

// Krok 6 (spec 2026-08-11): skrót w treningu pisze i czyta TE SAME klucze co
// Profil (localStorage + preferences.* w Firestore) — test SEKWENCJI obu kierunków.
// X35b: Select domyślnej przerwy zniknął z Profilu (RestSettingsCard; scalenie
// magazynów przerw = WP-C), więc test sprawdza tylko zapis z arkusza.
// X36: przełączniki timera i dźwięku żyją w sekcji "Timer i przerwy".
describe('krok 6: WorkoutSettingsSheet ↔ Profil (te same klucze zapisu)', () => {
  // X35b: jedno źródło prawdy o przerwach = preferences.rest (cache
  // fittracker_rest_settings_v1). Sheet i RestSettingsCard czytają loadRestSettings;
  // legacy preferences.restTimerSec nie jest już pisane.
  it('zmiana domyślnej przerwy w sheet → cache RestSettings + preferences.rest (custom) + widoczna w RestSettingsCard i wierszu Timer i przerwy w Profilu', async () => {
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
    card.unmount();

    // WP-B → X36: zwinięty wiersz sekcji Timer i przerwy czyta ten sam cache.
    const profil = renderProfile();
    expect(profil.getByTestId('profile-toggle-timer').textContent).toContain('Między seriami: 120 s');
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
    openSection('timer');
    expect(profil.getByLabelText('Dźwięk timera').getAttribute('aria-checked')).toBe('false');
  });

  it('wyłączenie dźwięku w Profilu → widoczne w sheet (kierunek odwrotny)', () => {
    const profil = renderProfile();
    openSection('timer');
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
    expect(profil.getByTestId('profile-toggle-timer').textContent).toContain('Wyłączony');
    openSection('timer');
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
