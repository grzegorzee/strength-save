// Przewodnik nowego konta (2026-09-29, przebudowa WP-E X37): warunek startu,
// stan per konto (chmura + localStorage), pętla zapis -> snapshot -> mapper ->
// warunek, komponent (akcje, pauza przy obcym overlayu, Pomiń, brak pułapek),
// cele data-tour na karcie ćwiczenia.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ExerciseCard } from '@/components/ExerciseCard';
import { AppTour } from '@/components/AppTour';
import {
  APP_TOUR_STORAGE_PREFIX,
  DASHBOARD_TOUR_STEPS,
  FIRST_WORKOUT_TOUR_KEY,
  WORKOUT_TOUR_STEPS,
  countCheckedSets,
  readCloudAppTour,
  readLocalAppTour,
  resolveAppTourStage,
  resumeWorkoutStep,
  writeLocalAppTour,
  type AppTourStartContext,
} from '@/lib/first-workout-tour';
import { buildPendingAuthProfile, mapAppUserProfile } from '@/lib/user-profile';
import type { AppUserProfile } from '@/lib/registration-api';
import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';

const updateDocMock = vi.fn();
vi.mock('firebase/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/firestore')>()),
  doc: vi.fn((_db: unknown, ...path: string[]) => ({ path: path.join('/') })),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'test-uid' }),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ db: {} }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  updateDocMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.querySelectorAll('[data-foreign]').forEach((el) => el.remove());
});

/** Przewodnik uzbraja Escape i kliknięcia klatkę po montażu (guard X37 QA). */
const nextFrame = () => act(() => new Promise<void>((resolve) => { window.requestAnimationFrame(() => resolve()); }));

const baseCtx: AppTourStartContext = {
  cloud: null,
  local: null,
  legacySeen: false,
  completedCount: 0,
  isDesktop: false,
};

describe('resolveAppTourStage: kto dostaje przewodnik', () => {
  it('nowe konto (0 ukończonych, brak flag): startuje sam od Dashboardu', () => {
    expect(resolveAppTourStage(baseCtx)).toBe('dashboard');
  });

  it('dane jeszcze się ładują (null): NIE startuje (user z historią nie zobaczy mignięcia)', () => {
    expect(resolveAppTourStage({ ...baseCtx, completedCount: null })).toBeNull();
  });

  it('konto z treningami, flaga w profilu, stary klucz urządzenia, lokalny koniec, desktop: brak', () => {
    expect(resolveAppTourStage({ ...baseCtx, completedCount: 3 })).toBeNull();
    expect(resolveAppTourStage({ ...baseCtx, cloud: { status: 'skipped', at: '2026-09-29' } })).toBeNull();
    expect(resolveAppTourStage({ ...baseCtx, legacySeen: true })).toBeNull();
    expect(resolveAppTourStage({ ...baseCtx, local: { stage: 'done', outcome: 'done' } })).toBeNull();
    expect(resolveAppTourStage({ ...baseCtx, isDesktop: true })).toBeNull();
  });

  it('rozpoczęty przewodnik trwa po pierwszym treningu (etap "co dalej" musi się pokazać)', () => {
    expect(resolveAppTourStage({ ...baseCtx, completedCount: 1, local: { stage: 'workout' } })).toBe('workout');
    expect(resolveAppTourStage({ ...baseCtx, completedCount: 1, local: { stage: 'after-finish' } })).toBe('after-finish');
  });

  it('odtworzenie z Profilu omija warunek treningów, flagę chmury i stary klucz', () => {
    expect(resolveAppTourStage({
      ...baseCtx,
      completedCount: 40,
      cloud: { status: 'done', at: 'x' },
      legacySeen: true,
      local: { stage: 'dashboard', replay: true },
    })).toBe('dashboard');
  });
});

describe('stan lokalny i chmurowy', () => {
  it('localStorage per uid: zapis/odczyt, śmieci = null, konta rozdzielone', () => {
    writeLocalAppTour('u1', { stage: 'workout', step: 'set-check' });
    expect(readLocalAppTour('u1')).toEqual({ stage: 'workout', step: 'set-check' });
    expect(readLocalAppTour('u2')).toBeNull();
    localStorage.setItem(`${APP_TOUR_STORAGE_PREFIX}u3`, '{"stage":"hack","step":"x"}');
    expect(readLocalAppTour('u3')).toBeNull();
    localStorage.setItem(`${APP_TOUR_STORAGE_PREFIX}u4`, 'nie-json');
    expect(readLocalAppTour('u4')).toBeNull();
  });

  it('readCloudAppTour przyjmuje tylko done/skipped', () => {
    expect(readCloudAppTour({ status: 'done', at: '2026-09-29T10:00:00Z' })).toEqual({ status: 'done', at: '2026-09-29T10:00:00Z' });
    expect(readCloudAppTour({ status: 'skipped' })).toEqual({ status: 'skipped', at: '' });
    expect(readCloudAppTour({ status: 'maybe' })).toBeNull();
    expect(readCloudAppTour('done')).toBeNull();
    expect(readCloudAppTour(undefined)).toBeNull();
  });

  it('powrót do treningu: porcja "po serii" wraca od menu, nieznany krok od wpisu', () => {
    expect(resumeWorkoutStep(undefined)).toBe('set-inputs');
    expect(resumeWorkoutStep('set-check')).toBe('set-check');
    expect(resumeWorkoutStep('first-set-done')).toBe('exercise-menu');
    expect(resumeWorkoutStep('finish')).toBe('finish');
    expect(resumeWorkoutStep('nav')).toBe('set-inputs');
  });

  it('countCheckedSets liczy każdą odhaczoną serię (także rozgrzewkową)', () => {
    expect(countCheckedSets({ a: [{ completed: true }, { completed: false }], b: [{ completed: true }] })).toBe(2);
    expect(countCheckedSets({})).toBe(0);
  });
});

describe('pętla zapis -> snapshot -> mapper -> warunek startu (lekcja builda 88)', () => {
  const seed = { userId: 'test-uid', email: 'a@b.c', displayName: 'A', photoURL: '' };

  it('persistAppTourOutcome pisze preferences.appTour (dot-path), a dokument po zapisie wyłącza przewodnik', async () => {
    updateDocMock.mockResolvedValue(undefined);
    const { persistAppTourOutcome } = await import('@/lib/app-tour-sync');
    await expect(persistAppTourOutcome('test-uid', 'skipped')).resolves.toBe(true);
    expect(updateDocMock).toHaveBeenCalledOnce();
    const [ref, patch] = updateDocMock.mock.calls[0] as [{ path: string }, Record<string, unknown>];
    expect(ref.path).toBe('users/test-uid');
    expect(Object.keys(patch)).toEqual(['preferences.appTour']);

    // "Snapshot": dokument z zapisanym polem przechodzi przez produkcyjny mapper.
    const snapshotDoc = { preferences: { unit: 'kg', appTour: patch['preferences.appTour'] } } as unknown as AppUserProfile;
    const profile = mapAppUserProfile('test-uid', snapshotDoc, seed);
    expect(profile.preferences?.appTour?.status).toBe('skipped');
    expect(profile.preferences?.unit).toBe('kg');
    expect(resolveAppTourStage({ ...baseCtx, cloud: profile.preferences?.appTour ?? null })).toBeNull();
  });

  it('mapper odrzuca zły kształt appTour (luźna mapa preferences), reszta preferencji zostaje', () => {
    const profile = mapAppUserProfile('u', { preferences: { unit: 'lbs', appTour: { status: 'hacked' } } } as unknown as AppUserProfile, seed);
    expect(profile.preferences).toEqual({ unit: 'lbs' });
    expect(buildPendingAuthProfile(seed).preferences).toBeUndefined();
  });

  it('offline: zapis do chmury się nie udaje -> false (wywołujący trzyma pendingSync)', async () => {
    updateDocMock.mockRejectedValue(new Error('unavailable'));
    const { persistAppTourOutcome } = await import('@/lib/app-tour-sync');
    await expect(persistAppTourOutcome('test-uid', 'done')).resolves.toBe(false);
  });
});

describe('useAppTour: koniec zapisuje lokalnie NAJPIERW, chmura w tle, ponowienie po offline', () => {
  it('finish(skipped) offline zostawia pendingSync i ponawia przy następnym montażu', async () => {
    const { useAppTour } = await import('@/hooks/useAppTour');
    updateDocMock.mockRejectedValue(new Error('offline'));
    const Probe = ({ count }: { count: number | null }) => {
      const tour = useAppTour(count);
      return (
        <div>
          <span data-testid="stage">{tour.stage ?? 'none'}</span>
          <button type="button" onClick={() => tour.finish('skipped')}>skip</button>
        </div>
      );
    };
    const first = render(<Probe count={0} />);
    expect(screen.getByTestId('stage').textContent).toBe('dashboard');
    fireEvent.click(screen.getByText('skip'));
    expect(screen.getByTestId('stage').textContent).toBe('none');
    await waitFor(() => expect(updateDocMock).toHaveBeenCalledTimes(1));
    expect(readLocalAppTour('test-uid')).toEqual({ stage: 'done', outcome: 'skipped', pendingSync: true });
    first.unmount();

    updateDocMock.mockResolvedValue(undefined);
    render(<Probe count={0} />);
    expect(screen.getByTestId('stage').textContent).toBe('none');
    await waitFor(() => expect(updateDocMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(readLocalAppTour('test-uid')).toEqual({ stage: 'done', outcome: 'skipped' }));
  });

  it('stary klucz urządzenia X37 "1" = widziany (zgodność wstecz)', async () => {
    const { useAppTour } = await import('@/hooks/useAppTour');
    localStorage.setItem(FIRST_WORKOUT_TOUR_KEY, '1');
    const Probe = () => <span data-testid="stage">{useAppTour(0).stage ?? 'none'}</span>;
    render(<Probe />);
    expect(screen.getByTestId('stage').textContent).toBe('none');
  });

  it('replay z Profilu: startAppTourReplay uruchamia etap Dashboard mimo historii', async () => {
    const { useAppTour, startAppTourReplay } = await import('@/hooks/useAppTour');
    localStorage.setItem(FIRST_WORKOUT_TOUR_KEY, '1');
    startAppTourReplay('test-uid');
    const Probe = () => <span data-testid="stage">{useAppTour(12).stage ?? 'none'}</span>;
    render(<Probe />);
    expect(screen.getByTestId('stage').textContent).toBe('dashboard');
  });
});

// Cele jak w sesji: wiersz aktywnej serii z inputami, checkmark, pasek przerwy, menu, Zakończ.
const Targets = ({ rest = true }: { rest?: boolean }) => (
  <div>
    <div data-tour="set-inputs">
      <input aria-label="kg" />
      <input aria-label="powt" />
    </div>
    <button type="button" data-tour="set-check">ok</button>
    {rest && <div data-tour="rest-bar">przerwa</div>}
    <button type="button" data-tour="exercise-menu">menu</button>
    <button type="button" data-tour="finish">Zakończ</button>
  </div>
);

const renderWorkoutTour = (props: Partial<Parameters<typeof AppTour>[0]> = {}, targets: { rest?: boolean } = {}) => {
  const handlers = { onComplete: vi.fn(), onSkip: vi.fn(), onFirstSet: vi.fn(), onStepChange: vi.fn() };
  const view = render(
    <LanguageProvider>
      <Targets {...targets} />
      <AppTour steps={WORKOUT_TOUR_STEPS} checkedSets={0} {...handlers} {...props} />
    </LanguageProvider>,
  );
  const rerenderSets = (checkedSets: number) => view.rerender(
    <LanguageProvider>
      <Targets {...targets} />
      <AppTour steps={WORKOUT_TOUR_STEPS} {...handlers} {...props} checkedSets={checkedSets} />
    </LanguageProvider>,
  );
  return { ...view, ...handlers, rerenderSets };
};

describe('AppTour: pierwsza seria prowadzona akcją', () => {
  it('wpis -> Dalej -> krok odhaczenia BEZ "Dalej" czeka na realne odhaczenie -> celebracja -> menu -> Zakończ -> Gotowe', async () => {
    const { onComplete, onFirstSet, rerenderSets } = renderWorkoutTour();
    const step1 = await screen.findByTestId('tour-step-set-inputs');
    expect(step1.getAttribute('role')).toBe('dialog');
    expect(step1.getAttribute('aria-modal')).toBe('false');
    expect(screen.getByText('Tu wpisujesz ciężar i powtórzenia.')).toBeTruthy();
    fireEvent.click(screen.getByTestId('tour-next'));

    await screen.findByTestId('tour-step-set-check');
    expect(screen.getByText('Skończysz serię? Tapnij podświetlony ptaszek.')).toBeTruthy();
    // Krok-akcja: nie ma "Dalej", jest Pomiń i podpowiedź.
    expect(screen.queryByTestId('tour-next')).toBeNull();
    expect(screen.getByTestId('tour-skip')).toBeTruthy();
    expect(screen.getByTestId('tour-action-hint').textContent).toBe('Czekam na odhaczenie');
    // Sam klik w cel bez zmiany stanu serii NIE zalicza kroku.
    fireEvent.click(screen.getByText('ok'));
    expect(screen.getByTestId('tour-step-set-check')).toBeTruthy();
    expect(onFirstSet).not.toHaveBeenCalled();

    rerenderSets(1);
    await screen.findByTestId('tour-step-first-set-done');
    expect(onFirstSet).toHaveBeenCalledOnce();
    expect(screen.getByTestId('tour-celebration').textContent).toContain('Pierwsza seria zaliczona!');
    expect(screen.getByText(/możesz zgasić ekran/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('tour-next'));

    await screen.findByTestId('tour-step-exercise-menu');
    expect(screen.getByText(/zamienisz ćwiczenie/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('tour-next'));
    await screen.findByTestId('tour-step-finish');
    expect(screen.getByTestId('tour-next').textContent).toBe('Gotowe');
    fireEvent.click(screen.getByTestId('tour-next'));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('first-workout-tour')).toBeNull();
  });

  it('odhaczenie już w kroku wpisu (user działa, nie czyta) też daje celebrację', async () => {
    const { onFirstSet, rerenderSets } = renderWorkoutTour();
    await screen.findByTestId('tour-step-set-inputs');
    rerenderSets(1);
    await screen.findByTestId('tour-step-first-set-done');
    expect(onFirstSet).toHaveBeenCalledOnce();
  });

  it('wskaźnik postępu liczony w porcji (max 3 kroki), nie w całym przewodniku', async () => {
    const { rerenderSets } = renderWorkoutTour();
    await screen.findByTestId('tour-step-set-inputs');
    expect(screen.getByTestId('tour-progress').children).toHaveLength(2);
    rerenderSets(1);
    await screen.findByTestId('tour-step-first-set-done');
    expect(screen.getByTestId('tour-progress').children).toHaveLength(3);
  });

  it('timer wyłączony (brak paska przerwy): celebracja bez wycięcia, zdanie bez obietnicy powiadomienia', async () => {
    const { rerenderSets } = renderWorkoutTour({}, { rest: false });
    await screen.findByTestId('tour-step-set-inputs');
    rerenderSets(1);
    await screen.findByTestId('tour-step-first-set-done', {}, { timeout: 3000 });
    expect(screen.getByText('Tak odhaczasz każdą serię. Wynik zapisuje się sam.')).toBeTruthy();
    expect(screen.queryByText(/zgasić ekran/)).toBeNull();
  });

  it('Pomiń na dowolnym kroku: onSkip raz, overlay znika od razu (zero pułapki)', async () => {
    const { onSkip } = renderWorkoutTour({ initialStepId: 'set-check' });
    await screen.findByTestId('tour-step-set-check');
    fireEvent.click(screen.getByTestId('tour-skip'));
    expect(onSkip).toHaveBeenCalledOnce();
    expect(screen.queryByTestId('first-workout-tour')).toBeNull();
  });

  it('Escape z dispatchu montażu jest ignorowany (X37: Escape zamykający rozgrzewkę), po klatce = Pomiń', async () => {
    const { onSkip } = renderWorkoutTour();
    // Ten sam tick co montaż: zdarzenie nie należy do przewodnika.
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(onSkip).not.toHaveBeenCalled();
    await screen.findByTestId('tour-step-set-inputs');
    await nextFrame();
    act(() => { fireEvent.keyDown(document, { key: 'Escape' }); });
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('obcy overlay (dialog/menu/celebracja) CHOWA przewodnik bez zużycia, zamknięcie go przywraca', async () => {
    const { onSkip, onComplete } = renderWorkoutTour();
    await screen.findByTestId('tour-step-set-inputs');
    const foreign = document.createElement('div');
    foreign.setAttribute('role', 'dialog');
    foreign.setAttribute('data-state', 'open');
    foreign.setAttribute('data-foreign', '');
    document.body.appendChild(foreign);
    await waitFor(() => expect(screen.queryByTestId('first-workout-tour')).toBeNull());
    foreign.remove();
    await screen.findByTestId('tour-step-set-inputs');
    expect(onSkip).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('brak celu kroku (np. Zakończ poza DOM): nic nie renderuje zamiast pustego przyciemnienia', async () => {
    render(
      <LanguageProvider>
        <AppTour steps={WORKOUT_TOUR_STEPS} initialStepId="finish" onComplete={vi.fn()} onSkip={vi.fn()} />
      </LanguageProvider>,
    );
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByTestId('first-workout-tour')).toBeNull();
  });

  it('overlay: fixed, bez zaznaczania tekstu, z-[70], dymek z safe-area, przewijany, akcje sticky, cele dotyku 48 px', async () => {
    renderWorkoutTour();
    const bubble = await screen.findByTestId('tour-step-set-inputs');
    const root = screen.getByTestId('first-workout-tour');
    expect(root.className).toContain('fixed');
    expect(root.className).toContain('select-none');
    expect(root.className).toContain('z-[70]');
    expect(bubble.className).toContain('left-[max(1rem,env(safe-area-inset-left))]');
    expect(bubble.className).toContain('right-[max(1rem,env(safe-area-inset-right))]');
    expect(bubble.className).toMatch(/\boverflow-y-auto\b/);
    expect(bubble.style.maxHeight).toContain('safe-area-inset');
    expect(screen.getByTestId('tour-actions').className).toMatch(/\bsticky\b/);
    expect(screen.getByTestId('tour-skip').className).toMatch(/\bmin-h-12\b/);
    expect(screen.getByTestId('tour-next').className).toMatch(/\bmin-h-12\b/);
  });

  it('prefers-reduced-motion: przewinięcie do Zakończ bez smooth, bez animacji celebracji', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const scrollIntoView = vi.spyOn(window.HTMLElement.prototype, 'scrollIntoView');
    const { rerenderSets } = renderWorkoutTour();
    await screen.findByTestId('tour-step-set-inputs');
    rerenderSets(1);
    const celebration = await screen.findByTestId('tour-celebration');
    expect(celebration.innerHTML).not.toContain('tour-check-pop');
    fireEvent.click(screen.getByTestId('tour-next'));
    await screen.findByTestId('tour-step-exercise-menu');
    fireEvent.click(screen.getByTestId('tour-next'));
    await screen.findByTestId('tour-step-finish');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
  });
});

describe('AppTour: Dashboard (legenda zakładek + start jako akcja)', () => {
  const renderDash = () => {
    const onAction = vi.fn();
    const onComplete = vi.fn();
    const onSkip = vi.fn();
    const navClick = vi.fn();
    render(
      <LanguageProvider>
        <nav data-tour="main-nav"><button type="button" onClick={navClick}>Plan</button></nav>
        <button type="button" data-tour="start-workout">Rozpocznij</button>
        <AppTour steps={DASHBOARD_TOUR_STEPS} onAction={onAction} onComplete={onComplete} onSkip={onSkip} />
      </LanguageProvider>,
    );
    return { onAction, onComplete, onSkip, navClick };
  };

  it('legenda czterech zakładek, pasek zablokowany na czas kroku; potem tap w prawdziwy start = akcja', async () => {
    const { onAction, onComplete } = renderDash();
    await screen.findByTestId('tour-step-nav');
    const legend = screen.getByTestId('tour-legend');
    expect(legend.querySelectorAll('li')).toHaveLength(4);
    expect(legend.textContent).toContain('Plan: Twój tydzień treningów');
    expect(legend.textContent).toContain('Historia');
    expect(legend.textContent).toContain('Postępy');
    expect(legend.textContent).toContain('Profil');
    expect(screen.getByTestId('tour-target-block')).toBeTruthy();
    fireEvent.click(screen.getByTestId('tour-next'));

    await screen.findByTestId('tour-step-start');
    expect(screen.queryByTestId('tour-next')).toBeNull();
    await nextFrame();
    fireEvent.click(screen.getByText('Rozpocznij'));
    expect(onAction).toHaveBeenCalledWith('start');
    expect(onComplete).toHaveBeenCalledOnce();
  });
});

const exercise = (over: Partial<Exercise> = {}): Exercise => ({
  id: 'ex-1',
  name: 'Wyciskanie sztangi na ławce płaskiej',
  sets: '3 x 6-8',
  instructions: [],
  ...over,
});

const workingSet = (over: Partial<SetData> = {}): SetData => ({
  reps: 0,
  weight: 0,
  completed: false,
  ...over,
});

const renderCard = (props: Partial<Parameters<typeof ExerciseCard>[0]> = {}) => render(
  <MemoryRouter>
    <LanguageProvider>
      <UnitProvider>
        <ExerciseCard exercise={exercise()} index={1} isEditable {...props} />
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

describe('ExerciseCard: cele data-tour', () => {
  it('pierwsza NIEukończona seria robocza ma set-inputs (wiersz) i set-check (checkmark); menu ma exercise-menu', () => {
    const { container } = renderCard({
      savedSets: [workingSet({ weight: 60, reps: 8, completed: true }), workingSet(), workingSet()],
    });
    const rows = container.querySelectorAll('[data-tour="set-inputs"]');
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelectorAll('input').length).toBeGreaterThanOrEqual(2);
    const checks = container.querySelectorAll('[data-tour="set-check"]');
    expect(checks).toHaveLength(1);
    expect(checks[0].getAttribute('aria-label')).toBe('Zaznacz serię jako zrobioną (aktywna)');
    expect(rows[0].contains(checks[0])).toBe(true);
    expect(container.querySelectorAll('[data-tour="exercise-menu"]')).toHaveLength(1);
  });

  it('ćwiczenie czasowe też oznacza aktywną serię', () => {
    const { container } = renderCard({
      exercise: exercise({ name: 'Plank', sets: '3 x 30s' }),
      trackingType: 'duration',
      isBodyweight: true,
      savedSets: [workingSet(), workingSet()],
    });
    expect(container.querySelectorAll('[data-tour="set-inputs"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-tour="set-check"]')).toHaveLength(1);
  });

  it('wszystkie serie ukończone = brak celów serii', () => {
    const { container } = renderCard({
      savedSets: [workingSet({ weight: 60, reps: 8, completed: true })],
    });
    expect(container.querySelectorAll('[data-tour^="set-"]')).toHaveLength(0);
  });
});

describe('Kontrakt źródeł: cele i montaż', () => {
  it('WorkoutDay: Zakończ i start mają cele, przewodnik czeka na arkusz i dialog rozgrzewki, karta "co dalej"', () => {
    const source = readFileSync('src/pages/WorkoutDay.tsx', 'utf8');
    expect(source).toContain('data-tour="finish"');
    expect(source).toContain('data-tour="workout-start"');
    expect(source).toMatch(/workoutTourEligible && isWorkoutStarted && !preStartOpen && !showWarmup && !warmupQueued/);
    expect(source).toContain('<FirstWorkoutNextSteps');
  });

  it('pasek zakładek, pasek przerwy i CTA startu mają cele', () => {
    expect(readFileSync('src/components/AppNavigation.tsx', 'utf8')).toContain('data-tour="main-nav"');
    expect(readFileSync('src/components/RestBar.tsx', 'utf8')).toContain('data-tour="rest-bar"');
    expect(readFileSync('src/pages/Dashboard.tsx', 'utf8')).toContain('data-tour="start-workout"');
  });
});
