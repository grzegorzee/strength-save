// Fala 2 (2026-08-20): niezmienniki redesignu ekranu sesji (plan/session.md, sekcja 5).
// Target box = JEDEN box z kaskadą celu (RZA > cel tygodnia > cel z trendu > progresja),
// mono meta linia bez zmyślonych wartości, licznik done w nagłówku tabeli.
// Sticky REST i tap w korpus paska: src/test/rest-bar.test.tsx (harness właściciela).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { ExerciseCard } from '@/components/ExerciseCard';
import type { Exercise } from '@/data/trainingPlan';
import type { SetData } from '@/types';
import type { WeeklyTarget } from '@/lib/progression-engine';
import type { RzaAdvice } from '@/lib/rza-progression';
import type { NextSetAdvice } from '@/lib/next-set-advice';
import type { ExerciseBest } from '@/lib/pr-utils';

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'test-uid' }),
}));
vi.mock('@/lib/app-telemetry', () => ({ trackTelemetryEvent: vi.fn() }));
vi.mock('@/lib/error-telemetry', () => ({ reportClientError: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ db: {} }));

beforeEach(() => {
  localStorage.setItem('app-language', 'pl');
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

const weekly = (over: Partial<WeeklyTarget> = {}): WeeklyTarget => ({
  exerciseId: 'ex-1',
  exerciseName: 'Wyciskanie sztangi na ławce płaskiej',
  kind: 'progress',
  targetWeight: 62.5,
  targetReps: 8,
  targetSets: 3,
  targetDurationSec: null,
  reasonKey: 'progression.reason.progress',
  ...over,
});

const rza: RzaAdvice = { decision: 'progress', increment: 2.5, nextKg: 92.5, lastKg: 90 };

const nextAdvice: NextSetAdvice = {
  kind: 'progress',
  targetWeight: 82.5,
  targetReps: 6,
  reason: 'Wyciągnąłeś 6 powtórzeń — dołóż 2,5 kg',
  isBodyweight: false,
};

const renderCard = (props: Partial<Parameters<typeof ExerciseCard>[0]> = {}) => {
  const view = render(
    <MemoryRouter>
      <LanguageProvider>
        <UnitProvider>
          <ExerciseCard exercise={exercise()} index={1} {...props} />
        </UnitProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
  return { ...view, card: view.container.querySelector('.exercise-card') as HTMLElement };
};

describe('target box: kaskada celu w jednym boxie (fala 2)', () => {
  it('RZA wygrywa z celem tygodnia i trendem — dokładnie jeden box, wartość z RZA', () => {
    const { card } = renderCard({
      savedSets: [workingSet()],
      rzaAdvice: rza,
      weeklyTarget: weekly(),
      nextAdvice,
    });
    // Wartość RZA (92.5 kg) widoczna, wartości niższych priorytetów nie.
    expect(within(card).getByText(/92\.5/)).toBeTruthy();
    expect(within(card).queryByText(/82\.5/)).toBeNull();
    expect(within(card).getByText(/Dołóż/)).toBeTruthy();
  });

  it('deload tygodnia dostaje etykietę semantyczną (warning), box zostaje na tincie akcentu', () => {
    const { card } = renderCard({
      savedSets: [workingSet()],
      weeklyTarget: weekly({ kind: 'deload', targetWeight: 55, reasonKey: 'progression.reason.deload' }),
    });
    const label = within(card).getByText('Deload');
    expect(label.className).toContain('text-fitness-warning');
  });

  it('brak jakiejkolwiek porady = brak boxa (zero zmyślonych celów)', () => {
    const { card } = renderCard({ savedSets: [workingSet()] });
    expect(within(card).queryByText(/Cel/)).toBeNull();
  });

  it('uzasadnienie celu znika po pierwszej odhaczonej serii (jak dawny blok metadanych)', () => {
    const fresh = renderCard({ savedSets: [workingSet()], nextAdvice });
    expect(within(fresh.card).getByText(/dołóż 2,5 kg/)).toBeTruthy();

    const inProgress = renderCard({
      savedSets: [workingSet({ weight: 80, reps: 6, completed: true }), workingSet()],
      nextAdvice,
    });
    expect(within(inProgress.card).queryByText(/dołóż 2,5 kg/)).toBeNull();
    // Sam cel (wartość) nadal widoczny.
    expect(within(inProgress.card).getByText(/82\.5/)).toBeTruthy();
  });
});

describe('mono meta linia nagłówka (fala 2)', () => {
  it('bez historicalBest linia ma tylko liczbę serii — zero zmyślonych 1RM/Max', () => {
    const { card } = renderCard({ savedSets: [workingSet(), workingSet(), workingSet()] });
    expect(within(card).getByText('3 serii')).toBeTruthy();
    expect(within(card).queryByText(/1RM/)).toBeNull();
    expect(within(card).queryByText(/Max/)).toBeNull();
  });

  it('z historicalBest: estymacja ZAWSZE ze źródłem (B-T2) + fakt Max', () => {
    const best: ExerciseBest = {
      best1RM: 117, best1RMWeight: 100, best1RMReps: 5, maxWeight: 100,
    } as ExerciseBest;
    const { card } = renderCard({ savedSets: [workingSet()], historicalBest: best });
    const meta = within(card).getByText(/1RM/);
    // Naprawa r3 (2026-08-21): etykieta "1RM" (bez "Szac.") i jednostka wagi RAZ —
    // przy pierwszej wartości; źródło i Max gołymi liczbami, żeby cała meta
    // mieściła się w JEDNEJ linii mono na 390 px (sugestia sędziego struktury).
    // Spacje wewnątrz członów to NBSP (łamanie tylko na separatorach) — normalizujemy.
    const metaText = meta.textContent?.replace(/\u00A0/g, ' ') ?? '';
    expect(metaText).toContain('117 kg');
    // Źródło estymacji (100×5) jest częścią linii — nie sama liczba.
    expect(metaText).toContain('100×5');
    expect(metaText).toContain('Max 100');
    expect(metaText.match(/kg/g)).toHaveLength(1);
  });
});

describe('licznik odhaczonych serii w nagłówku tabeli (fala 2)', () => {
  it('pokazuje x/y w ostatniej kolumnie i rośnie z odhaczeniami', () => {
    const { card } = renderCard({
      savedSets: [
        workingSet({ weight: 60, reps: 8, completed: true }),
        workingSet({ weight: 60, reps: 8 }),
        workingSet({ weight: 60, reps: 8 }),
      ],
    });
    expect(within(card).getByText('1/3')).toBeTruthy();
  });

  it('rozgrzewka nie wlicza się do licznika (tylko serie robocze)', () => {
    const { card } = renderCard({
      savedSets: [
        workingSet({ isWarmup: true, weight: 20, reps: 10, completed: true }),
        workingSet({ weight: 60, reps: 8 }),
        workingSet({ weight: 60, reps: 8 }),
      ],
    });
    expect(within(card).getByText('0/2')).toBeTruthy();
  });
});
