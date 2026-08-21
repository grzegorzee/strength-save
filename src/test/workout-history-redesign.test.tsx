import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { formatLocalDate } from '@/lib/utils';
import type { WorkoutSession } from '@/types';
import type { PlanCycle } from '@/types/cycles';

// Fala 2 (2026-08-20): niezmienniki redesignu Historii (wzorzec workout-day-view:
// "stary przepływ nadal ma wszystko"). Bez cykli = widok miesięczny jak dotąd;
// z cyklami = karty cykli + "Poza cyklami"; menu ⋯ ma KOMPLET akcji wiersza.

const navigateSpy = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateSpy };
});

const fixtures = vi.hoisted(() => ({
  workouts: [] as unknown[],
  cycles: [] as unknown[],
  hasMore: false,
  loadMore: vi.fn(),
  deleteResult: { success: true } as { success: boolean; error?: string },
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({ uid: 'u1', profile: { preferences: {} }, isAdmin: false }),
}));
vi.mock('@/hooks/useWorkoutHistoryPage', () => ({
  useWorkoutHistoryPage: () => ({
    workouts: fixtures.workouts,
    isLoaded: true,
    isLoadingMore: false,
    hasMore: fixtures.hasMore,
    loadMore: fixtures.loadMore,
  }),
}));
vi.mock('@/hooks/useTrainingPlan', () => ({
  useTrainingPlan: () => ({ plan: [] }),
}));
vi.mock('@/hooks/usePlanCycles', () => ({
  usePlanCycles: () => ({ cycles: fixtures.cycles }),
}));
vi.mock('@/hooks/useWorkoutAggregate', () => ({
  useWorkoutAggregate: () => null,
}));
vi.mock('@/lib/workout-read-store', () => ({
  fetchWorkoutRange: vi.fn(async () => []),
}));
vi.mock('@/lib/workout-delete', () => ({
  deleteWorkoutEverywhere: vi.fn(async () => fixtures.deleteResult),
}));
vi.mock('@/components/EmailWorkoutDialog', () => ({
  EmailWorkoutDialog: ({ mode, open }: { mode: string; open: boolean }) => (
    <div data-testid="email-dialog-stub" data-mode={mode} data-open={String(open)} />
  ),
}));
vi.mock('@/components/ExportWorkoutsDialog', () => ({
  ExportWorkoutsDialog: ({ open }: { open: boolean }) => (
    <div data-testid="export-dialog-stub" data-open={String(open)} />
  ),
}));

import WorkoutHistory from '@/pages/WorkoutHistory';
import { deleteWorkoutEverywhere } from '@/lib/workout-delete';
import { buildCanonicalState } from '@/test/canonical-states';

const today = new Date();
const iso = (daysAgo: number) => formatLocalDate(new Date(today.getTime() - daysAgo * 24 * 3600 * 1000));

const workout = (id: string, date: string, overrides: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id,
  userId: 'u1',
  dayId: 'day-1',
  date,
  exercises: [{
    exerciseId: 'ex-1',
    name: 'Przysiad ze sztangą',
    sets: [{ reps: 8, weight: 100, completed: true }],
  }] as WorkoutSession['exercises'],
  completed: true,
  dayName: 'Poniedziałek',
  dayFocus: 'Nogi',
  durationSec: 4320, // "1h 12m" — kontrakt Z80: widoczny bez rozwijania
  ...overrides,
});

const cycle = (id: string, startDate: string, endDate: string, overrides: Partial<PlanCycle> = {}): PlanCycle => ({
  id,
  userId: 'u1',
  days: [],
  durationWeeks: 12,
  startDate,
  endDate,
  status: 'completed',
  createdAt: startDate,
  stats: { totalWorkouts: 3, totalTonnage: 9000, prs: [], completionRate: 88 },
  ...overrides,
});

const renderPage = () => render(
  <MemoryRouter>
    <LanguageProvider>
      <UnitProvider>
        <WorkoutHistory />
      </UnitProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

const openRowMenu = async (row: HTMLElement) => {
  const trigger = within(row).getByTestId('history-row-menu');
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerType: 'mouse' });
  fireEvent.click(trigger);
  return await screen.findByRole('menu');
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  // jsdom wykrywa EN z navigatora — asercje tekstów są po polsku.
  window.localStorage.setItem('app-language', 'pl');
  fixtures.hasMore = false;
  fixtures.deleteResult = { success: true };
  fixtures.cycles = [];
  fixtures.workouts = [];
});

describe('WorkoutHistory redesign — bez cykli (niezmiennik starego przepływu)', () => {
  beforeEach(() => {
    fixtures.workouts = [
      workout('w1', iso(1)),
      workout('w2', iso(3), { completed: false, notes: 'notatka dnia testowa' }),
    ];
  });

  it('renderuje listę miesiącami, czas trwania widoczny bez rozwijania, bez kart cykli', () => {
    renderPage();
    expect(screen.getAllByTestId('history-session-row')).toHaveLength(2);
    expect(screen.getAllByText(/1h 12m/).length).toBeGreaterThan(0);
    expect(screen.queryByText('Poza cyklami')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Cykl \d/)).not.toBeInTheDocument();
    // Draft ma badge, ukończony nie.
    expect(screen.getAllByText('draft')).toHaveLength(1);
  });

  it('menu ⋯ wiersza ma KOMPLET akcji: Otwórz / Szczegóły / Porównaj / Wyślij do trenera / Usuń', async () => {
    renderPage();
    const row = screen.getAllByTestId('history-session-row')[0];
    const menu = await openRowMenu(row);
    expect(within(menu).getByRole('menuitem', { name: /Otwórz trening/ })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Szczegóły' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /Porównaj/ })).toBeInTheDocument();
    expect(within(menu).getByTestId('history-row-email')).toHaveTextContent('Wyślij do trenera');
    expect(within(menu).getByTestId('history-delete')).toHaveTextContent('Usuń');
  });

  // Naprawa r3 (2026-08-21): Szczegóły przeniesione z osobnego chevrona do menu ⋯
  // (plan history-tab poz. 25) — chevron zawężał środek wiersza i tytuł/meta
  // ucinały się na 390 px.
  it('Szczegóły z menu ⋯ rozwijają serie i notatkę dnia', async () => {
    renderPage();
    const rows = screen.getAllByTestId('history-session-row');
    // w2 (draft z notatką) — drugi wiersz (sortowanie malejąco po dacie).
    const menu = await openRowMenu(rows[1]);
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Szczegóły' }));
    expect(screen.getByText('Przysiad ze sztangą')).toBeInTheDocument();
    expect(screen.getByText(/8×100/)).toBeInTheDocument();
    expect(screen.getByText('notatka dnia testowa')).toBeInTheDocument();
  });

  // Naprawa r3 (kryterium akceptacji sędziego funkcji): czas trwania ma shrink-0 —
  // widoczny bez rozwijania nawet przy ciasnym wierszu (truncate zjada lewe segmenty).
  it('czas trwania w mecie siedzi w osobnym spanie shrink-0 (nie pod truncate)', () => {
    renderPage();
    const duration = screen.getAllByText(/1h 12m/)[0];
    expect(duration.className).toContain('shrink-0');
    expect(duration.className).not.toContain('truncate');
  });

  it('tap w wiersz otwiera trening; ⋯ nie nawiguje', async () => {
    renderPage();
    const row = screen.getAllByTestId('history-session-row')[0];
    await openRowMenu(row);
    expect(navigateSpy).not.toHaveBeenCalled();
    fireEvent.click(row);
    expect(navigateSpy).toHaveBeenCalledWith(`/workout/day-1?date=${iso(1)}&session=w1`);
  });

  it('oba dialogi maila + eksport CSV są zamontowane (Radix: zamykanie przez open=false)', () => {
    renderPage();
    const emailStubs = screen.getAllByTestId('email-dialog-stub');
    expect(emailStubs.map((el) => el.dataset.mode).sort()).toEqual(['history', 'workout']);
    expect(screen.getByTestId('export-dialog-stub')).toBeInTheDocument();
    expect(screen.getByTestId('history-email')).toHaveTextContent('Wyślij do trenera');
    expect(screen.getByTestId('history-export-csv')).toHaveTextContent('Eksport CSV');
  });
});

describe('WorkoutHistory redesign — z cyklami', () => {
  // WP-G (dogfooding G1): aktywny cykl pochodzi z kanonicznego stanu, czyli
  // z produkcyjnego ksztaltu zapisu usePlanCycles (endDate '' az do
  // archiwizacji) zamiast recznego fixture'a.
  const canonicalActiveCycle = buildCanonicalState('active-plan').cycles
    .find((c) => c.status === 'active')!;
  const pastStart = iso(240);
  const pastEnd = iso(160);

  beforeEach(() => {
    fixtures.cycles = [
      canonicalActiveCycle,
      cycle('c-past', pastStart, pastEnd),
    ];
    fixtures.workouts = [
      workout('a1', iso(1), { cycleId: canonicalActiveCycle.id }),
      workout('a2', iso(8), { cycleId: canonicalActiveCycle.id }),
      workout('p1', iso(200), { cycleId: 'c-past' }),
      workout('out', iso(400)), // poza zakresem obu cykli
    ];
  });

  it('aktywny cykl bez endDate renderuje zakres z "teraz" zamiast crashować (regresja E-8UE4S)', () => {
    renderPage();
    const activeCard = screen.getByText('Cykl 2').closest('section')!;
    expect(within(activeCard).getByText(/teraz/)).toBeInTheDocument();
  });

  it('sesje trafiają do kart cykli, sesja bez cyklu do "Poza cyklami"; licznik == suma wierszy', () => {
    renderPage();
    // Karty: aktywny (Cykl 2 — numeracja od najstarszego) i przeszły (Cykl 1).
    const activeCard = screen.getByText('Cykl 2').closest('section')!;
    expect(within(activeCard).getByText('Aktywny')).toBeInTheDocument();
    expect(within(activeCard).getAllByTestId('history-session-row')).toHaveLength(2);

    // Przeszły cykl zwinięty: nagłówek + staty, bez wierszy.
    const pastCard = screen.getByText('Cykl 1').closest('section')!;
    expect(within(pastCard).queryAllByTestId('history-session-row')).toHaveLength(0);
    // Rozwinięcie pokazuje sesje z załadowanego okna.
    fireEvent.click(within(pastCard).getByText('Cykl 1'));
    expect(within(pastCard).getAllByTestId('history-session-row')).toHaveLength(1);

    // Sekcja "Poza cyklami" z sesją niedopasowaną.
    expect(screen.getByText('Poza cyklami')).toBeInTheDocument();

    // NIEZMIENNIK: wszystkie przefiltrowane sesje wyrenderowane dokładnie raz.
    expect(screen.getAllByTestId('history-session-row')).toHaveLength(4);
    expect(screen.getByText(/4 sesje/i)).toBeInTheDocument();
  });

  it('staty karty aktywnego cyklu liczone live (buildActiveCyclePreview), FREKWENCJA = completionRate', () => {
    renderPage();
    const activeCard = screen.getByText('Cykl 2').closest('section')!;
    // 2 ukończone sesje w cyklu; brak dni planu => frekwencja 0%.
    const sessionsLabel = within(activeCard).getByText('Sesje');
    expect(sessionsLabel.previousElementSibling).toHaveTextContent('2');
    const attendanceLabel = within(activeCard).getByText('Frekwencja');
    expect(attendanceLabel.previousElementSibling).toHaveTextContent('0%');
    // PR-y w akcencie (klasa text-primary na wartości).
    const prLabel = within(activeCard).getByText('PR');
    expect(prLabel.previousElementSibling?.className).toContain('text-primary');
  });

  it('tryb Porównaj: chip włącza tryb, dwa tapnięcia dają kartę porównania, trzecie wypycha najstarsze (FIFO)', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^porównaj$/i }));
    const rows = screen.getAllByTestId('history-session-row');
    fireEvent.click(rows[0]); // a1
    fireEvent.click(rows[1]); // a2
    expect(screen.getByText('Porównanie dwóch sesji')).toBeInTheDocument();
    expect(screen.getByText(`${iso(1)} vs ${iso(8)}`)).toBeInTheDocument();
    expect(navigateSpy).not.toHaveBeenCalled(); // w trybie porównania tap nie nawiguje

    fireEvent.click(rows[2]); // out/poza — FIFO wypycha a1
    expect(screen.getByText(`${iso(8)} vs ${iso(400)}`)).toBeInTheDocument();
  });

  it('filtr Drafty zawęża listę i ukrywa karty cykli bez pasujących sesji', () => {
    fixtures.workouts = [
      ...fixtures.workouts,
      workout('d1', iso(2), { cycleId: 'c-active', completed: false }),
    ];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Drafty' }));
    expect(screen.getAllByTestId('history-session-row')).toHaveLength(1);
    // "1 sesja" pojawia się w liczniku i w meta tygodnia karty cyklu.
    expect(screen.getAllByText(/1 sesja/i).length).toBeGreaterThan(0);
    // Przeszły cykl bez draftów jest ukryty w całości.
    expect(screen.queryByText('Cykl 1')).not.toBeInTheDocument();
  });

  it('usuwanie: menu → Usuń → dialog → confirm → wiersz znika, porównanie wyczyszczone', async () => {
    renderPage();
    // Zaznacz a1 do porównania przez menu (drugie wejście, bez trybu).
    const rows = screen.getAllByTestId('history-session-row');
    let menu = await openRowMenu(rows[0]);
    fireEvent.click(within(menu).getByRole('menuitem', { name: /^Porównaj$/ }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    menu = await openRowMenu(screen.getAllByTestId('history-session-row')[0]);
    fireEvent.click(within(menu).getByTestId('history-delete'));
    expect(await screen.findByTestId('history-delete-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('history-delete-confirm'));

    await waitFor(() => expect(deleteWorkoutEverywhere).toHaveBeenCalledWith('u1', 'a1'));
    // Widoczne wiersze: a1+a2 (aktywny cykl) + out (poza cyklami); p1 w zwiniętej karcie.
    // Po usunięciu a1 zostają 2.
    await waitFor(() => expect(screen.getAllByTestId('history-session-row')).toHaveLength(2));
    expect(screen.queryByText('Porównanie dwóch sesji')).not.toBeInTheDocument();
  });
});
