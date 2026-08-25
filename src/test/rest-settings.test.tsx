// Zgłoszenie usera po treningu 2026-07-20: „możliwość ustawiania domyślnej przerwy
// między seriami w ustawieniach i domyślnej przerwy między ćwiczeniami".
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Z177: RestSettingsCard → timer-sound → global-error-telemetry ciągnie Firebase
// (Auth pada w jsdom) — mock jak w timer-sound.test.ts.
vi.mock('@/lib/global-error-telemetry', () => ({ reportClientErrorWithCurrentUid: vi.fn() }));
// X35b: karta pisze preferences.rest przez persistRestSettings (Firestore) i czyta
// cel planu z profilu — mocki jak w profile-sections.test.tsx.
const updateDoc = vi.hoisted(() => vi.fn(async () => {}));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(() => ({})), updateDoc }));
vi.mock('@/lib/firebase', () => ({ db: {} }));
const userFixture = vi.hoisted(() => ({
  profile: {} as Record<string, unknown>,
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: userFixture.profile, isAdmin: false }),
}));

import { RestSettingsCard } from '@/components/RestSettingsCard';
import { loadRestSettings, saveRestSettings, DEFAULT_REST_SETTINGS, resolveRestSeconds } from '@/lib/rest-timer';
import { loadTimerVolume, saveTimerVolume } from '@/lib/timer-volume';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  userFixture.profile = { displayName: 'Tester' };
});

const renderCard = () => render(
  <LanguageProvider>
    <RestSettingsCard />
  </LanguageProvider>,
);

describe('RestSettingsCard', () => {
  it('pokazuje domyślne czasy przerw', () => {
    renderCard();
    expect((screen.getByLabelText(/Przerwa między seriami/i) as HTMLInputElement).value).toBe('90');
    expect((screen.getByLabelText(/Przerwa między ćwiczeniami/i) as HTMLInputElement).value).toBe('150');
    expect((screen.getByLabelText(/Przerwa po rozgrzewce/i) as HTMLInputElement).value).toBe('45');
  });

  it('zapisuje przerwę między seriami', () => {
    renderCard();
    fireEvent.change(screen.getByLabelText(/Przerwa między seriami/i), { target: { value: '120' } });
    expect(loadRestSettings().workingSeconds).toBe(120);
  });

  it('zapisuje przerwę między ćwiczeniami niezależnie od przerwy między seriami', () => {
    renderCard();
    fireEvent.change(screen.getByLabelText(/Przerwa między ćwiczeniami/i), { target: { value: '240' } });
    const saved = loadRestSettings();
    expect(saved.betweenExercisesSeconds).toBe(240);
    expect(saved.workingSeconds).toBe(DEFAULT_REST_SETTINGS.workingSeconds);
  });

  it('szybkie presety ustawiają czas jednym tapnięciem', () => {
    renderCard();
    fireEvent.click(screen.getByTestId('rest-preset-working-120'));
    expect(loadRestSettings().workingSeconds).toBe(120);
  });

  it('presety zaczynają się od 15 s, nie od minuty (zgłoszenie usera)', () => {
    renderCard();
    fireEvent.click(screen.getByTestId('rest-preset-working-15'));
    expect(loadRestSettings().workingSeconds).toBe(15);
  });

  it('wartość spoza zakresu nie psuje zapisu', () => {
    renderCard();
    fireEvent.change(screen.getByLabelText(/Przerwa między seriami/i), { target: { value: '0' } });
    expect(loadRestSettings().workingSeconds).toBeGreaterThan(0);
  });

  it('czyta zapisane ustawienia przy montowaniu', () => {
    saveRestSettings({ workingSeconds: 111, warmupSeconds: 22, betweenExercisesSeconds: 333, perExercise: {} });
    renderCard();
    expect((screen.getByLabelText(/Przerwa między seriami/i) as HTMLInputElement).value).toBe('111');
    expect((screen.getByLabelText(/Przerwa między ćwiczeniami/i) as HTMLInputElement).value).toBe('333');
  });

  // Z201: regulacja głośności (zgłoszenie usera 2026-08-06: „głośność na full
  // a ledwo co było słychać").
  it('suwak głośności startuje na 100% i zapisuje ułamek do ustawień', () => {
    renderCard();
    const slider = screen.getByTestId('rest-volume-slider') as HTMLInputElement;
    expect(slider.value).toBe('100');

    fireEvent.change(slider, { target: { value: '60' } });
    expect(loadTimerVolume()).toBe(0.6);
    expect(screen.getByText('60%')).toBeTruthy();
  });

  it('puszczenie suwaka odsłuchuje sygnał bez wyjątku (jsdom bez AudioContext)', () => {
    renderCard();
    const slider = screen.getByTestId('rest-volume-slider');
    expect(() => fireEvent.pointerUp(slider)).not.toThrow();
  });

  it('zapisana głośność wraca na suwak przy montowaniu', () => {
    saveTimerVolume(0.4);
    renderCard();
    expect((screen.getByTestId('rest-volume-slider') as HTMLInputElement).value).toBe('40');
  });
});

// X35b: jedno źródło prawdy (preferences.rest) + polecane wg celu planu.
describe('RestSettingsCard: preferences.rest + polecane dla planu (X35b)', () => {
  it('ręczna zmiana pisze preferences.rest z custom: true (cache + chmura)', async () => {
    renderCard();
    fireEvent.click(screen.getByTestId('rest-preset-working-120'));
    expect(loadRestSettings()).toMatchObject({ workingSeconds: 120, custom: true });
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      'preferences.rest': expect.objectContaining({ workingSeconds: 120, custom: true, perExercise: {} }),
    }));
  });

  it('bez celu planu w profilu: brak wiersza "polecane" i przycisku przywracania', () => {
    renderCard();
    expect(screen.queryByTestId('rest-recommended-hint')).toBeNull();
    expect(screen.queryByTestId('rest-restore-recommended')).toBeNull();
    expect(screen.getByTestId('rest-current-working').textContent).toBe('1:30');
  });

  it('cel redukcja + wartości domyślne 90 s: pokazuje "Polecane dla Twojego planu: 60 s" i przywraca 60/90/30', async () => {
    userFixture.profile = { displayName: 'Tester', trainingProfile: { objective: 'fat_loss' } };
    renderCard();
    expect(screen.getByTestId('rest-recommended-hint').textContent).toBe('Polecane dla Twojego planu: 60 s');
    fireEvent.click(screen.getByTestId('rest-restore-recommended'));
    expect(loadRestSettings()).toMatchObject({
      workingSeconds: 60, betweenExercisesSeconds: 90, warmupSeconds: 30, custom: false,
    });
    expect((screen.getByLabelText(/Przerwa między seriami/i) as HTMLInputElement).value).toBe('60');
    expect(screen.getByTestId('rest-recommended-hint').textContent).toBe('Używasz polecanych czasów dla Twojego planu.');
    expect(screen.queryByTestId('rest-restore-recommended')).toBeNull();
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith(expect.anything(), {
      'preferences.rest': expect.objectContaining({ workingSeconds: 60, custom: false }),
    }));
  });

  it('custom true przy wartościach równych polecanym: badge "Własne" + przycisk czyści flagę', () => {
    userFixture.profile = { displayName: 'Tester', trainingProfile: { objective: 'peak_strength' } };
    saveRestSettings({ workingSeconds: 180, betweenExercisesSeconds: 240, warmupSeconds: 90, perExercise: { przysiad: 300 }, custom: true });
    renderCard();
    expect(screen.getByText('Własne')).toBeTruthy();
    fireEvent.click(screen.getByTestId('rest-restore-recommended'));
    const saved = loadRestSettings();
    expect(saved.custom).toBe(false);
    // Nadpisania per ćwiczenie to osobna decyzja usera — zostają.
    expect(saved.perExercise).toEqual({ przysiad: 300 });
    expect(screen.queryByText('Własne')).toBeNull();
  });
});

describe('resolveRestSeconds — przerwa między ćwiczeniami', () => {
  it('po ukończeniu ćwiczenia bierze czas „między ćwiczeniami", nie „między seriami"', () => {
    const settings = { workingSeconds: 90, warmupSeconds: 45, betweenExercisesSeconds: 180, perExercise: {} };
    expect(resolveRestSeconds(settings, { exerciseFinished: true })).toBe(180);
    expect(resolveRestSeconds(settings, { exerciseFinished: false })).toBe(90);
  });

  it('nadpisanie per ćwiczenie NIE dotyczy przerwy między ćwiczeniami', () => {
    const settings = { workingSeconds: 90, warmupSeconds: 45, betweenExercisesSeconds: 180, perExercise: { przysiad: 300 } };
    expect(resolveRestSeconds(settings, { exerciseFinished: true, exerciseKey: 'przysiad' })).toBe(180);
    expect(resolveRestSeconds(settings, { exerciseFinished: false, exerciseKey: 'przysiad' })).toBe(300);
  });
});
