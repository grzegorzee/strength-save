// Trening próbny przewodnika: TWARDA izolacja zapisu (niezmiennik, zgłoszenie
// iOS 152). Pełna interakcja (wpis, odhaczenie, przerwa, pominięcie ćwiczenia,
// zakończenie) nie może wywołać ŻADNEJ funkcji Firestore, IndexedDB, powiadomień
// systemowych przerwy/odliczania ani telemetrii treningowej; localStorage bez
// zmian poza stanem przewodnika. Do tego kontrakt importów strony (brak modułów
// zapisu) i adapter WorkoutEffects (prawdziwy trening dalej planuje powiadomienia).
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';

const firestoreCalls: string[] = [];
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return Object.fromEntries(Object.entries(actual).map(([name, value]) => [
    name,
    typeof value === 'function'
      ? (...args: unknown[]) => {
          firestoreCalls.push(`${name}:${JSON.stringify(args[1] ?? null)}`);
          if (name === 'updateDoc' || name === 'setDoc') return Promise.resolve();
          return undefined;
        }
      : value,
  ]));
});
vi.mock('@/lib/firebase', () => ({ db: {}, functions: {}, auth: {} }));

const restNotification = vi.hoisted(() => ({
  armRestEndNotification: vi.fn(),
  cancelRestEndNotification: vi.fn(async () => undefined),
  armSetCountdownNotification: vi.fn(),
  cancelSetCountdownNotification: vi.fn(async () => undefined),
}));
vi.mock('@/lib/rest-notification', () => restNotification);
const telemetry = vi.hoisted(() => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/app-telemetry', () => telemetry);
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
const emailModule = vi.hoisted(() => ({ sendWorkoutEmail: vi.fn(), sendHistoryEmail: vi.fn() }));
vi.mock('@/lib/email-workout', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  ...emailModule,
}));

let tourLocal: string | null = null;
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u-practice', profile: null }),
}));

import PracticeWorkout from '@/pages/PracticeWorkout';

const TOUR_KEY = 'fittracker_app_tour_v2:u-practice';

const snapshotStorage = () => Object.fromEntries(
  Object.keys(localStorage).filter((k) => k !== TOUR_KEY).sort().map((k) => [k, localStorage.getItem(k)]),
);

const renderPractice = () => render(
  <MemoryRouter initialEntries={['/practice']}>
    <LanguageProvider>
      <UnitProvider>
        <Routes>
          <Route path="/practice" element={<PracticeWorkout />} />
          <Route path="/" element={<div data-testid="home" />} />
        </Routes>
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

let idbOpen: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  firestoreCalls.length = 0;
  vi.clearAllMocks();
  idbOpen = vi.fn(() => { throw new Error('IndexedDB w trybie próbnym'); });
  Object.defineProperty(window, 'indexedDB', { value: { open: idbOpen }, configurable: true });
  tourLocal = null;
});

afterEach(() => {
  if (tourLocal) localStorage.removeItem(TOUR_KEY);
});

const checkFirstActiveSet = () => {
  const check = document.querySelector<HTMLButtonElement>('[data-tour="set-check"]');
  expect(check).not.toBeNull();
  fireEvent.click(check!);
};

const runFullPractice = async () => {
  await screen.findByTestId('practice-workout');
  // Dane przykładowe już wpisane: odhaczenie działa bez pisania.
  checkFirstActiveSet();
  await waitFor(() => expect(document.querySelectorAll('[aria-label^="Odznacz"]')).toHaveLength(1));
  // Przerwa ruszyła wizualnie (RestBar zamontowany), bez powiadomienia systemowego.
  expect(screen.getByTestId('rest-bar')).toBeTruthy();
  checkFirstActiveSet();
  await waitFor(() => expect(document.querySelectorAll('[aria-label^="Odznacz"]')).toHaveLength(2));
  // Wpis ręczny w kolejną serię.
  const row = document.querySelector('[data-tour="set-inputs"]')!;
  fireEvent.change(row.querySelectorAll('input')[0], { target: { value: '22.5' } });
  fireEvent.click(screen.getByTestId('practice-finish'));
  fireEvent.click(screen.getByTestId('practice-confirm-finish'));
  await screen.findByTestId('practice-done');
  // Podsumowanie mailem: prawdziwy dialog, wysyłka symulowana.
  fireEvent.click(screen.getByTestId('practice-email'));
  const dialog = await screen.findByTestId('email-workout-dialog');
  fireEvent.change(dialog.querySelector('input')!, { target: { value: 'trener@example.com' } });
  fireEvent.click(screen.getByTestId('email-workout-send'));
  await waitFor(() => expect(screen.queryByTestId('email-workout-dialog')).toBeNull(), { timeout: 3000 });
};

describe('trening próbny: zero zapisów (tryb bez przewodnika)', () => {
  it('pełna interakcja: Firestore, IndexedDB, powiadomienia i telemetria treningowa nietknięte', async () => {
    const before = snapshotStorage();
    renderPractice();
    await runFullPractice();
    expect(firestoreCalls).toEqual([]);
    expect(idbOpen).not.toHaveBeenCalled();
    expect(restNotification.armRestEndNotification).not.toHaveBeenCalled();
    expect(restNotification.armSetCountdownNotification).not.toHaveBeenCalled();
    expect(telemetry.trackTelemetryEvent).not.toHaveBeenCalled();
    // Mail: zero callable emailWorkoutSummary/History, zero zapisu adresu trenera.
    expect(emailModule.sendWorkoutEmail).not.toHaveBeenCalled();
    expect(emailModule.sendHistoryEmail).not.toHaveBeenCalled();
    expect(screen.queryByTestId('save-trainer-name')).toBeNull();
    expect(snapshotStorage()).toEqual(before);
    fireEvent.click(screen.getByTestId('practice-back-home'));
    await screen.findByTestId('home');
    expect(firestoreCalls).toEqual([]);
  });
});

describe('trening próbny w przewodniku: jedyny zapis to stan przewodnika', () => {
  it('przejście próby z przewodnikiem: zero zapisów treningowych, koniec przewodnika tylko preferences.appTour', async () => {
    tourLocal = JSON.stringify({ stage: 'practice' });
    localStorage.setItem(TOUR_KEY, tourLocal);
    const before = snapshotStorage();
    renderPractice();
    await screen.findByTestId('tour-step-set-inputs');
    await runFullPractice();
    fireEvent.click(screen.getByTestId('practice-back-home'));
    await screen.findByTestId('home');
    // Zapis stanu przewodnika leci w tle (leniwy import SDK).
    await waitFor(() => expect(firestoreCalls.some((c) => c.startsWith('updateDoc:'))).toBe(true));
    expect(firestoreCalls.filter((c) => !c.startsWith('doc:'))).toEqual([
      expect.stringMatching(/^updateDoc:\{"preferences\.appTour":\{"status":"done"/),
    ]);
    expect(idbOpen).not.toHaveBeenCalled();
    expect(restNotification.armRestEndNotification).not.toHaveBeenCalled();
    expect(telemetry.trackTelemetryEvent).not.toHaveBeenCalled();
    expect(snapshotStorage()).toEqual(before);
  });
});

describe('kontrakt importów i adaptera', () => {
  it('strona próby nie importuje żadnego modułu zapisu treningu', () => {
    const source = readFileSync('src/pages/PracticeWorkout.tsx', 'utf8');
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    const forbidden = imports.filter((m) => /firebase|firestore|workout-draft|sync|health|watch|garmin|pr-|celebration|workout-save|useFirebase|useTrainingPlan|usePlanCycles|rest-notification|app-telemetry/i.test(m));
    expect(forbidden).toEqual([]);
    expect(source).toContain('<PracticeWorkoutEffects>');
  });

  it('wspólne komponenty sesji robią efekty zewnętrzne WYŁĄCZNIE przez adapter', () => {
    for (const file of ['src/components/ExerciseCard.tsx', 'src/components/RestBar.tsx', 'src/components/SetCountdown.tsx']) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/from '@\/lib\/rest-notification'|from '@\/lib\/app-telemetry'/);
      expect(source, file).toContain('useWorkoutEffects');
    }
  });

  it('prawdziwy trening (domyślny adapter) dalej planuje powiadomienie przerwy i liczy odhaczenie', async () => {
    const { RestBar } = await import('@/components/RestBar');
    render(
      <LanguageProvider>
        <RestBar deadlineAt={Date.now() + 60_000} totalSeconds={60} runId={1} exerciseLabel="x" onSkip={vi.fn()} onAdjust={vi.fn()} onOpenSettings={vi.fn()} />
      </LanguageProvider>,
    );
    expect(restNotification.armRestEndNotification).toHaveBeenCalledOnce();
  });
});

describe('dane przykładowe w jednostce usera', () => {
  it('kg: przykładowe 20 kg wpisane w pierwszej serii', async () => {
    renderPractice();
    await screen.findByTestId('practice-workout');
    const input = document.querySelector('[data-tour="set-inputs"] input') as HTMLInputElement;
    expect(input.value).toBe('20');
  });

  it('lb: okrągłe 45 lb (stan kanonicznie w kg)', async () => {
    localStorage.setItem('unit-system', 'lbs');
    renderPractice();
    await screen.findByTestId('practice-workout');
    const input = document.querySelector('[data-tour="set-inputs"] input') as HTMLInputElement;
    expect(input.value).toBe('45');
  });
});
