// WP-E (X37): tour pierwszego treningu, 3 spotlighty. Warunki pokazania (czysta
// funkcja), kroki, Pomiń zapisuje klucz, drugi render bez toura, Dalej x3 kończy,
// atrybuty data-tour na aktywnej serii karty ćwiczenia.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ExerciseCard } from '@/components/ExerciseCard';
import { FirstWorkoutTour } from '@/components/FirstWorkoutTour';
import {
  FIRST_WORKOUT_TOUR_KEY,
  FIRST_WORKOUT_TOUR_STEPS,
  isFirstWorkoutTourSeen,
  markFirstWorkoutTourSeen,
  shouldShowFirstWorkoutTour,
} from '@/lib/first-workout-tour';
import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'test-uid' }),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ db: {} }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
});

afterEach(() => {
  vi.restoreAllMocks();
});

const baseCtx = { completedCount: 0, seen: false, isResume: false, isAutostart: false, isDesktop: false };

describe('shouldShowFirstWorkoutTour: warunki pokazania', () => {
  it('świeży user, jawny start, telefon: pokazuje', () => {
    expect(shouldShowFirstWorkoutTour(baseCtx)).toBe(true);
  });

  it('nie pokazuje przy ukończonych treningach, po obejrzeniu, w resume, przy autostart ani na desktop', () => {
    expect(shouldShowFirstWorkoutTour({ ...baseCtx, completedCount: 1 })).toBe(false);
    expect(shouldShowFirstWorkoutTour({ ...baseCtx, seen: true })).toBe(false);
    expect(shouldShowFirstWorkoutTour({ ...baseCtx, isResume: true })).toBe(false);
    expect(shouldShowFirstWorkoutTour({ ...baseCtx, isAutostart: true })).toBe(false);
    expect(shouldShowFirstWorkoutTour({ ...baseCtx, isDesktop: true })).toBe(false);
  });

  it('markSeen zapisuje klucz localStorage, a drugi render (seen) nie pokazuje toura', () => {
    expect(isFirstWorkoutTourSeen()).toBe(false);
    markFirstWorkoutTourSeen();
    expect(localStorage.getItem(FIRST_WORKOUT_TOUR_KEY)).toBe('1');
    expect(isFirstWorkoutTourSeen()).toBe(true);
    expect(shouldShowFirstWorkoutTour({ ...baseCtx, seen: isFirstWorkoutTourSeen() })).toBe(false);
  });

  it('kroki jako dane: 3 kroki z celami data-tour i kluczami i18n', () => {
    expect(FIRST_WORKOUT_TOUR_STEPS.map((s) => s.id)).toEqual(['set-inputs', 'set-check', 'finish']);
    expect(FIRST_WORKOUT_TOUR_STEPS.map((s) => s.target)).toEqual([
      '[data-tour="set-inputs"]',
      '[data-tour="set-check"]',
      '[data-tour="finish"]',
    ]);
  });
});

// Cele toura jak w sesji: wiersz aktywnej serii z inputami, checkmark, Zakończ.
const renderTour = (onClose = vi.fn(), targets: { finish?: boolean } = {}) => {
  const view = render(
    <LanguageProvider>
      <div>
        <div data-tour="set-inputs">
          <input aria-label="kg" />
          <input aria-label="powt" />
        </div>
        <button type="button" data-tour="set-check">ok</button>
        {targets.finish !== false && <button type="button" data-tour="finish">Zakończ</button>}
        <FirstWorkoutTour onClose={onClose} />
      </div>
    </LanguageProvider>,
  );
  return { ...view, onClose };
};

describe('FirstWorkoutTour: 3 kroki, Dalej i Pomiń', () => {
  it('krok 1 -> Dalej -> krok 2 -> Dalej -> krok 3 -> Gotowe: onClose + klucz seen', async () => {
    const { onClose } = renderTour();
    const step1 = await screen.findByTestId('tour-step-1');
    expect(step1.getAttribute('role')).toBe('dialog');
    // Coachmark zostawia podświetlony input/przycisk interaktywny poza dymkiem,
    // więc nie może deklarować semantyki modala ukrywającej cel przed VoiceOver.
    expect(step1.getAttribute('aria-modal')).toBe('false');
    expect(screen.getByText('Wpisz ciężar i powtórzenia.')).toBeTruthy();
    expect(screen.getByTestId('tour-skip')).toBeTruthy();

    fireEvent.click(screen.getByTestId('tour-next'));
    await screen.findByTestId('tour-step-2');
    expect(screen.getByText(/Odhacz serię tym przyciskiem/)).toBeTruthy();
    expect(screen.getByTestId('tour-next').textContent).toBe('Dalej');

    fireEvent.click(screen.getByTestId('tour-next'));
    await screen.findByTestId('tour-step-3');
    expect(screen.getByText('Tu kończysz trening.')).toBeTruthy();
    expect(screen.getByTestId('tour-next').textContent).toBe('Gotowe');
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('tour-next'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(isFirstWorkoutTourSeen()).toBe(true);
  });

  it('Pomiń na pierwszym kroku zapisuje klucz i zamyka', async () => {
    const { onClose } = renderTour();
    await screen.findByTestId('tour-step-1');
    fireEvent.click(screen.getByTestId('tour-skip'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(localStorage.getItem(FIRST_WORKOUT_TOUR_KEY)).toBe('1');
  });

  it('krok 2: odhaczenie serii (klik w cel) samo przechodzi do kroku 3', async () => {
    renderTour();
    await screen.findByTestId('tour-step-1');
    fireEvent.click(screen.getByTestId('tour-next'));
    await screen.findByTestId('tour-step-2');
    fireEvent.click(screen.getByText('ok'));
    await screen.findByTestId('tour-step-3');
  });

  it('brak celu kroku (np. Zakończ poza DOM) nie zostawia pustego overlayu: tour się zamyka', async () => {
    const { onClose } = renderTour(vi.fn(), { finish: false });
    await screen.findByTestId('tour-step-1');
    fireEvent.click(screen.getByTestId('tour-next'));
    await screen.findByTestId('tour-step-2');
    fireEvent.click(screen.getByTestId('tour-next'));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('overlay: fixed, bez zaznaczania tekstu, nad paskiem przerwy (z-50) i pod toasterem (z-100)', async () => {
    renderTour();
    await screen.findByTestId('tour-step-1');
    const root = screen.getByTestId('first-workout-tour');
    expect(root.className).toContain('fixed');
    expect(root.className).toContain('select-none');
    expect(root.className).toContain('z-[70]');
  });

  it('landscape i 200% font: dymek respektuje boczne safe-area, przewija treść i trzyma CTA 48 px', async () => {
    renderTour();
    const bubble = await screen.findByTestId('tour-step-1');
    const actions = screen.getByTestId('tour-actions');
    const skip = screen.getByTestId('tour-skip');
    const next = screen.getByTestId('tour-next');

    expect(bubble.className).toContain('left-[max(1rem,env(safe-area-inset-left))]');
    expect(bubble.className).toContain('right-[max(1rem,env(safe-area-inset-right))]');
    expect(bubble.className).toMatch(/\boverflow-y-auto\b/);
    expect(bubble.style.maxHeight).toContain('safe-area-inset');
    expect(actions.className).toMatch(/\bsticky\b/);
    expect(skip.className).toMatch(/\bh-12\b/);
    expect(skip.className).toMatch(/\bmin-w-12\b/);
    expect(next.className).toMatch(/\bh-12\b/);
    expect(next.className).toMatch(/\bmin-w-12\b/);
  });

  it('prefers-reduced-motion przewija do celu końca bez smooth animation', async () => {
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

    renderTour();
    await screen.findByTestId('tour-step-1');
    fireEvent.click(screen.getByTestId('tour-next'));
    await screen.findByTestId('tour-step-2');
    fireEvent.click(screen.getByTestId('tour-next'));
    await screen.findByTestId('tour-step-3');

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' });
  });

  it('Escape zamyka tour i zapisuje seen', async () => {
    const { onClose } = renderTour();
    await screen.findByTestId('tour-step-1');
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(isFirstWorkoutTourSeen()).toBe(true);
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

describe('ExerciseCard: atrybuty data-tour tylko na aktywnej serii', () => {
  it('pierwsza NIEukończona seria robocza ma data-tour set-inputs (wiersz) i set-check (checkmark)', () => {
    const { container } = renderCard({
      savedSets: [workingSet({ weight: 60, reps: 8, completed: true }), workingSet(), workingSet()],
    });
    const rows = container.querySelectorAll('[data-tour="set-inputs"]');
    expect(rows).toHaveLength(1);
    expect(rows[0].querySelectorAll('input').length).toBeGreaterThanOrEqual(2);
    const checks = container.querySelectorAll('[data-tour="set-check"]');
    expect(checks).toHaveLength(1);
    expect(checks[0].getAttribute('aria-label')).toBe('Zaznacz serię jako zrobioną (aktywna)');
    // Aktywny wiersz = drugi (pierwszy ukończony): checkmark siedzi w tym samym wierszu.
    expect(rows[0].contains(checks[0])).toBe(true);
  });

  it('ćwiczenie czasowe (nowa ścieżka wiersza) też oznacza aktywną serię', () => {
    const { container } = renderCard({
      exercise: exercise({ name: 'Plank', sets: '3 x 30s' }),
      trackingType: 'duration',
      isBodyweight: true,
      savedSets: [workingSet(), workingSet()],
    });
    expect(container.querySelectorAll('[data-tour="set-inputs"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-tour="set-check"]')).toHaveLength(1);
  });

  it('wszystkie serie ukończone = brak celów toura', () => {
    const { container } = renderCard({
      savedSets: [workingSet({ weight: 60, reps: 8, completed: true })],
    });
    expect(container.querySelectorAll('[data-tour]')).toHaveLength(0);
  });
});

describe('WorkoutDay: montaż toura (kontrakt źródła)', () => {
  it('przycisk Zakończ ma data-tour="finish", tour montowany po jawnym starcie', () => {
    const source = readFileSync('src/pages/WorkoutDay.tsx', 'utf8');
    expect(source).toContain('data-tour="finish"');
    expect(source).toContain('<FirstWorkoutTour');
    expect(source).toContain('shouldShowFirstWorkoutTour({');
  });
});
