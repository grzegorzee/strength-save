import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { getTrainingRules, type TrainingDay } from '@/data/trainingPlan';
import { buildPreStartWarmup } from '@/lib/prestart-warmup';
import { translate } from '@/i18n';

const fixture = vi.hoisted(() => ({
  plan: [] as TrainingDay[],
  startDate: '2026-09-01',
  overrides: {} as Record<string, string | null>,
  completed: false,
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router-dom')>(),
  useNavigate: () => fixture.navigate,
}));
vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'synthetic-day-plan', profile: { trainingProfile: { level: 'beginner' } }, canUseStrava: false }),
}));
vi.mock('@/hooks/useFirebaseWorkouts', () => ({
  useFirebaseWorkouts: () => ({
    isLoaded: true,
    getTodaysWorkout: () => fixture.completed ? { completed: true, exercises: fixture.plan[0].exercises } : null,
  }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ plan: fixture.plan, scheduleOverrides: fixture.overrides, planStartDate: fixture.startDate }),
}));
vi.mock('@/hooks/useStrava', () => ({
  useStrava: () => ({ activities: [], connection: { connected: false } }),
}));
vi.mock('@/components/StravaActivityCard', () => ({ StravaActivityCard: () => null }));

import DayPlan from '@/pages/DayPlan';

const makeDay = (): TrainingDay => ({
  id: 'day-full-body-b', weekday: 'wednesday', dayName: 'Środa', focus: 'Full Body B',
  exercises: [
    { id: 'custom-001', name: 'Wyciskanie hantli (Lekki skos)', sets: '3 × 6–8', instructions: [] },
    { id: 'custom-002', name: 'Martwy ciąg rumuński z hantlami', sets: '3 × 6–8', instructions: [] },
    { id: 'custom-003', name: 'Ściąganie drążka wyciągu górnego szerokim chwytem', sets: '3 × 8–12', instructions: [] },
    { id: 'custom-004', name: 'Wykroki chodzone', sets: '3 × 6–10', instructions: [] },
    { id: 'generated-id-005', name: 'Wznosy hantli bokiem w pozycji siedzącej', sets: '3 × 12–15', isSuperset: true, supersetGroup: 'opaque-group-id', instructions: [] },
    { id: 'generated-id-006', name: 'Rozpiętki odwrotne na wyciągu w opadzie tułowia', sets: '3 × 12–15', isSuperset: true, supersetGroup: 'opaque-group-id', instructions: [] },
  ],
});

function renderDay(lang: 'pl' | 'en' = 'pl') {
  localStorage.setItem('app-language', lang);
  return render(<MemoryRouter><LanguageProvider><DayPlan /></LanguageProvider></MemoryRouter>);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 9, 5, 53));
  localStorage.clear();
  fixture.plan = [makeDay()];
  fixture.startDate = '2026-09-01';
  fixture.overrides = {};
  fixture.completed = false;
  fixture.navigate.mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('DayPlan — czytelny podgląd całego treningu', () => {
  it('pokazuje focus i datę raz, bez konkurującego powitania i weekday badge', () => {
    renderDay();
    expect(screen.getAllByRole('heading', { name: 'Full Body B' })).toHaveLength(1);
    expect(screen.queryByText(/Dzień dobry|Dobry wieczór/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Środa$/i)).not.toBeInTheDocument();
    const date = screen.getByText(/9 września 2026/i);
    expect(date).toHaveTextContent(/środa/i);
  });

  it('NIEZMIENNIK: własna nazwa dnia pozostaje w jednym nagłówku razem z focusem', () => {
    fixture.plan[0].dayName = 'Mój spokojny trening';
    renderDay();
    const title = screen.getByRole('heading', { name: /Mój spokojny trening/ });
    expect(title).toHaveTextContent('Full Body B');
    expect(screen.getAllByText(/Mój spokojny trening/)).toHaveLength(1);
  });

  it('zostawia wszystkie pełne nazwy i serie w liście, bez ellipsis także dla superserii', () => {
    renderDay();
    const list = screen.getByRole('list', { name: translate('pl', 'dayplan.todaysExercises') });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(6);
    fixture.plan[0].exercises.forEach((exercise, index) => {
      expect(rows[index]).toHaveTextContent(exercise.name);
      expect(rows[index]).toHaveTextContent(exercise.sets);
      expect(rows[index].querySelector('.truncate, .line-clamp-1, .line-clamp-2')).toBeNull();
    });
  });

  it('numeruje superserię 5A/5B według grupy i kolejności, niezależnie od UUID ćwiczeń', () => {
    renderDay();
    expect(screen.getByText('5A')).toBeInTheDocument();
    expect(screen.getByText('5B')).toBeInTheDocument();
    expect(screen.queryByText('6B')).not.toBeInTheDocument();
  });

  it('rozróżnia kolejną grupę i nie zgaduje pary dla osieroconej flagi superset', () => {
    fixture.plan[0].exercises.push(
      { id: 'other-one', name: 'Ćwiczenie grupy drugiej', sets: '2 × 10', isSuperset: true, supersetGroup: 'second-group', instructions: [] },
      { id: 'other-two', name: 'Drugie ćwiczenie grupy drugiej', sets: '2 × 12', isSuperset: true, supersetGroup: 'second-group', instructions: [] },
      { id: 'orphan', name: 'Samodzielne ćwiczenie', sets: '2 × 8', isSuperset: true, instructions: [] },
    );
    renderDay();
    expect(screen.getByText('7A')).toBeInTheDocument();
    expect(screen.getByText('7B')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('szczegółowe zasady są domyślnie zwinięte; user może je otworzyć i zamknąć', () => {
    renderDay();
    const rules = getTrainingRules('pl');
    expect(screen.queryByText(rules.weight)).not.toBeInTheDocument();
    const tips = screen.getByRole('button', { name: /Wskazówki/ });
    expect(tips).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(tips);
    expect(screen.getByText(rules.weight)).toBeVisible();
    expect(screen.getByText(rules.restMain)).toBeVisible();
    expect(screen.getByText(rules.supersets)).toBeVisible();
    fireEvent.click(tips);
    expect(screen.queryByText(rules.weight)).not.toBeInTheDocument();
  });

  it('NIEZMIENNIK: start prowadzi do dzisiejszej sesji z autostart, instrukcja nadal otwiera ćwiczenie', () => {
    renderDay();
    const starts = screen.getAllByRole('button', { name: translate('pl', 'dayplan.startWorkout') });
    expect(starts).toHaveLength(1);
    fireEvent.click(starts[0]);
    expect(fixture.navigate).toHaveBeenLastCalledWith('/workout/day-full-body-b?date=2026-09-09&autostart=true');
    fireEvent.click(screen.getAllByRole('button', { name: translate('pl', 'card.details') })[0]);
    expect(fixture.navigate).toHaveBeenLastCalledWith(expect.stringMatching(/^\/exercise\//));
  });

  it.each(['pl', 'en'] as const)('NIEZMIENNIK %s: rozgrzewka v3 z instrukcjami pozostaje dostępna, lista ćwiczeń nie znika', (lang) => {
    renderDay(lang);
    const warmup = screen.getByRole('button', { name: translate(lang, 'dayplan.warmup') });
    fireEvent.click(warmup);
    expect(warmup).toHaveAttribute('aria-expanded', 'true');
    const section = screen.getByTestId('dayplan-warmup-v3');
    const items = buildPreStartWarmup({ exerciseName: fixture.plan[0].exercises[0].name, category: 'chest', level: 'beginner' }).items;
    for (const item of items) {
      expect(within(section).getByText(translate(lang, item.key))).toBeInTheDocument();
      expect(within(section).getByText(translate(lang, item.instructionKey))).toBeInTheDocument();
    }
    expect(within(screen.getByRole('list', { name: translate(lang, 'dayplan.todaysExercises') })).getAllByRole('listitem')).toHaveLength(6);
    fireEvent.click(warmup);
    expect(screen.queryByTestId('dayplan-warmup-v3')).not.toBeInTheDocument();
  });

  it('NIEZMIENNIK: ukończona sesja zostawia podsumowanie i wejście do szczegółów, bez nowego startu', () => {
    fixture.completed = true;
    renderDay();
    expect(screen.getByText(translate('pl', 'dayplan.workoutDoneTitle'))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: translate('pl', 'dayplan.startWorkout') })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: translate('pl', 'dayplan.viewWorkoutDetails') }));
    expect(fixture.navigate).toHaveBeenLastCalledWith('/workout/day-full-body-b?date=2026-09-09');
  });
});
