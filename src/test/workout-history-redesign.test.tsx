import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { WorkoutSession } from '@/types';

// Fala 2 (2026-08-20) + WP-H (X28): niezmienniki Historii (wzorzec
// workout-day-view: "stary przepływ nadal ma wszystko"). Po redesignie v2
// "tiles" pełna płaska lista żyje pod ?list=all (miesiące, wyszukiwarka,
// filtry, porównanie, usuwanie), poziom 1 to kafle cykli, a widok cyklu
// (?cycle=) niesie staty live. Mapowanie starych testów → nowa struktura
// w opisach; ŻADEN niezmiennik nie znika.

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
vi.mock('@/components/history/HistoryExportSheet', () => ({
  HistoryExportSheet: ({ open }: { open: boolean }) => (
    <div data-testid="export-sheet-stub" data-open={String(open)} />
  ),
}));

import WorkoutHistory from '@/pages/WorkoutHistory';
import { deleteWorkoutEverywhere } from '@/lib/workout-delete';
import { buildCanonicalState } from '@/test/canonical-states';

const renderPage = (entry = '/history?list=all') => render(
  <MemoryRouter initialEntries={[entry]}>
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

describe('WorkoutHistory — pełna lista (?list=all) bez cykli (niezmiennik starego przepływu)', () => {
  // Fixtury z kanonicznego stanu (zasada 11); overrides przez spread dokumentu
  // (notatka dnia + czas trwania), kształt zapisu bez zmian.
  const base = buildCanonicalState('history-outside-cycles');
  const [w1, w2] = [...base.workouts]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 2);
  const withDuration: WorkoutSession = { ...w1, durationSec: 4320 }; // "1h 12m" (Z80)
  const draftWithNote: WorkoutSession = {
    ...w2, completed: false, durationSec: undefined, completedAt: undefined,
    notes: 'notatka dnia testowa',
  };

  beforeEach(() => {
    fixtures.workouts = [withDuration, draftWithNote];
  });

  it('renderuje listę miesiącami, czas trwania widoczny bez rozwijania, bez kafli cykli', () => {
    renderPage();
    expect(screen.getAllByTestId('history-session-row')).toHaveLength(2);
    expect(screen.getAllByText(/1h 12m/).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('cycle-tile')).not.toBeInTheDocument();
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

  it('Szczegóły z menu ⋯ rozwijają serie i notatkę dnia', async () => {
    renderPage();
    const rows = screen.getAllByTestId('history-session-row');
    // Draft z notatką — drugi wiersz (sortowanie malejąco po dacie).
    const menu = await openRowMenu(rows[1]);
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Szczegóły' }));
    expect(screen.getAllByText('Przysiad ze sztangą').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5×80/).length).toBeGreaterThan(0);
    expect(screen.getByText('notatka dnia testowa')).toBeInTheDocument();
  });

  // Kontrakt Z80: czas trwania widoczny bez rozwijania nawet przy ciasnym
  // wierszu (osobny span shrink-0, truncate zjada tylko lewe segmenty).
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
    expect(navigateSpy).toHaveBeenCalledWith(
      `/workout/${withDuration.dayId}?date=${withDuration.date}&session=${withDuration.id}`,
    );
  });

  it('oba dialogi maila + Export sheet są zamontowane na stałe (Radix: open=false)', () => {
    renderPage();
    const emailStubs = screen.getAllByTestId('email-dialog-stub');
    expect(emailStubs.map((el) => el.dataset.mode).sort()).toEqual(['history', 'workout']);
    expect(screen.getByTestId('export-sheet-stub')).toHaveAttribute('data-open', 'false');
  });

  it('poziom 1: jeden przycisk Export otwiera sheet (zamiast osobnych CSV/mail)', () => {
    renderPage('/history');
    fireEvent.click(screen.getByTestId('history-export'));
    expect(screen.getByTestId('export-sheet-stub')).toHaveAttribute('data-open', 'true');
  });
});

describe('WorkoutHistory — z cyklami (stan kanoniczny history-multi-cycle)', () => {
  const state = buildCanonicalState('history-multi-cycle');
  const activeCycle = state.cycles.find((c) => c.status === 'active')!;
  const sortedDesc = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date));

  beforeEach(() => {
    fixtures.cycles = state.cycles;
    fixtures.workouts = state.workouts;
  });

  it('aktywny cykl bez endDate renderuje zakres z "teraz" zamiast crashować (regresja E-8UE4S)', () => {
    renderPage('/history');
    const activeTile = screen.getAllByTestId('cycle-tile')
      .find((tile) => within(tile).queryByText('Cykl 2'))!;
    expect(activeTile).toBeDefined();
    expect(within(activeTile).getByText(/teraz/)).toBeInTheDocument();
  });

  it('każda sesja osiągalna: kafle na poziomie 1, komplet wierszy w pełnej liście; licznik == suma', () => {
    renderPage('/history');
    // Kafle: aktywny (Cykl 2 — numeracja od najstarszego), przeszły (Cykl 1),
    // "Poza cyklami" dla sesji bez cyklu.
    const tiles = screen.getAllByTestId('cycle-tile');
    expect(tiles).toHaveLength(3);
    expect(screen.getByText(/5 sesji/i)).toBeInTheDocument();

    // NIEZMIENNIK kompletności: pełna lista renderuje KAŻDĄ sesję dokładnie raz.
    fireEvent.click(screen.getByTestId('history-all-sessions-link'));
    expect(screen.getAllByTestId('history-session-row')).toHaveLength(5);
  });

  it('staty widoku cyklu liczone live (buildActiveCyclePreview), FREKWENCJA obecna, PR w akcencie', () => {
    renderPage(`/history?cycle=${activeCycle.id}`);
    const detail = screen.getByTestId('cycle-detail');
    // 2 ukończone sesje w cyklu (draft nie liczy się do statów).
    const sessionsLabel = within(detail).getByText('Sesje');
    expect(sessionsLabel.previousElementSibling).toHaveTextContent('2');
    expect(within(detail).getByText('Frekwencja')).toBeInTheDocument();
    const prLabel = within(detail).getByText('PR');
    expect(prLabel.previousElementSibling?.className).toContain('text-primary');
  });

  it('tryb Porównaj: przycisk włącza tryb, dwa tapnięcia dają kartę porównania, trzecie wypycha najstarsze (FIFO)', () => {
    renderPage();
    // X35a WP-A#5: "Porównaj" to tryb, nie filtr — osobny przycisk POZA zawijanym rzędem chipów.
    const statusChips = screen.getByTestId('history-status-chips');
    expect(statusChips.className).toContain('flex-wrap');
    expect(statusChips.className).not.toContain('overflow-x');
    expect(within(statusChips).queryByRole('button', { name: /^porównaj$/i })).toBeNull();
    const compareToggle = screen.getByTestId('history-compare-toggle');
    expect(compareToggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: /^porównaj$/i }));
    expect(compareToggle).toHaveAttribute('aria-pressed', 'true');
    const rows = screen.getAllByTestId('history-session-row');
    fireEvent.click(rows[0]);
    fireEvent.click(rows[1]);
    expect(screen.getByText('Porównanie dwóch sesji')).toBeInTheDocument();
    expect(screen.getByText(`${sortedDesc[0].date} vs ${sortedDesc[1].date}`)).toBeInTheDocument();
    expect(navigateSpy).not.toHaveBeenCalled(); // w trybie porównania tap nie nawiguje

    fireEvent.click(rows[2]); // FIFO wypycha najstarsze zaznaczenie
    expect(screen.getByText(`${sortedDesc[1].date} vs ${sortedDesc[2].date}`)).toBeInTheDocument();
  });

  it('filtr Drafty zawęża pełną listę i licznik', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Drafty' }));
    expect(screen.getAllByTestId('history-session-row')).toHaveLength(1);
    expect(screen.getAllByText('draft').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1 sesja/i).length).toBeGreaterThan(0);
  });

  it('filtry aktywne ukrywają kafle cykli bez pasujących sesji (poziom 1)', () => {
    renderPage('/history');
    // Draft filtr przez pełną listę nie jest dostępny na poziomie 1 — symulujemy
    // przez wejście do listy, filtr i powrót (stan filtrów jest współdzielony).
    fireEvent.click(screen.getByTestId('history-all-sessions-link'));
    fireEvent.click(screen.getByRole('button', { name: 'Drafty' }));
    fireEvent.click(screen.getByTestId('history-list-back'));
    // Draft żyje w aktywnym cyklu: przeszły cykl i "Poza cyklami" znikają.
    const tiles = screen.getAllByTestId('cycle-tile');
    expect(tiles).toHaveLength(1);
    expect(within(tiles[0]).getByText('Cykl 2')).toBeInTheDocument();
  });

  it('usuwanie: menu → Usuń → dialog → confirm → wiersz znika, porównanie wyczyszczone', async () => {
    renderPage();
    // Zaznacz najnowszą sesję do porównania przez menu (bez trybu).
    const rows = screen.getAllByTestId('history-session-row');
    let menu = await openRowMenu(rows[0]);
    fireEvent.click(within(menu).getByRole('menuitem', { name: /^Porównaj$/ }));
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());

    menu = await openRowMenu(screen.getAllByTestId('history-session-row')[0]);
    fireEvent.click(within(menu).getByTestId('history-delete'));
    expect(await screen.findByTestId('history-delete-dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('history-delete-confirm'));

    await waitFor(() => expect(deleteWorkoutEverywhere).toHaveBeenCalledWith('u1', sortedDesc[0].id));
    await waitFor(() => expect(screen.getAllByTestId('history-session-row')).toHaveLength(4));
    expect(screen.queryByText('Porównanie dwóch sesji')).not.toBeInTheDocument();
  });
});
