import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import type { WorkoutSession } from '@/types';

// WP-H (X28): Historia v2 — poziom 1 (chronologia + wtórne kafle cykli +
// PERIOD + Export), poziom 2 (?cycle= — nagłówek, chipsy, tygodnie), Export sheet.
// Fixtury WYŁĄCZNIE z canonical-states (stan history-multi-cycle, zasada 11).

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
  exportFetchResult: [] as unknown[],
}));

vi.mock('@/contexts/UserContext', () => ({
  useCurrentUser: () => ({
    uid: 'u1',
    profile: { displayName: 'QA', preferences: { trainerEmail: 'coach@example.com' } },
    isAdmin: false,
  }),
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
  deleteWorkoutEverywhere: vi.fn(async () => ({ success: true })),
}));
vi.mock('@/components/EmailWorkoutDialog', () => ({
  EmailWorkoutDialog: ({ mode, open }: { mode: string; open: boolean }) => (
    <div data-testid="email-dialog-stub" data-mode={mode} data-open={String(open)} />
  ),
}));
// H3: formaty eksportu delegują do ISTNIEJĄCYCH mechanizmów — mockujemy je
// i asertujemy wywołania z właściwym zbiorem sesji / zakresem.
vi.mock('@/lib/workout-csv-download', () => ({
  fetchWorkoutsForBounds: vi.fn(async () => fixtures.exportFetchResult),
  downloadWorkoutsCsvFile: vi.fn(),
}));
vi.mock('@/lib/pdf-report', () => ({
  buildTrainingReportModel: vi.fn(() => ({
    monthly: [],
    totals: { workoutCount: 0, workoutsWithDuration: 0, totalDurationSec: 0, totalTonnageKg: 0 },
  })),
  generateTrainingReportPdf: vi.fn(async () => new Blob(['pdf'], { type: 'application/pdf' })),
}));
const shareExportMock = vi.hoisted(() => vi.fn(async () => 'shared'));
vi.mock('@/lib/share-export', () => ({ shareOrDownloadFile: shareExportMock }));
// Bug 26 (X30): HistoryExportSheet raportuje porazki share do client_errors —
// modul ciagnie lib/firebase (transitive import, pulapka z CLAUDE.md), mock.
vi.mock('@/lib/global-error-telemetry', () => ({ reportClientErrorWithCurrentUid: vi.fn() }));

import WorkoutHistory from '@/pages/WorkoutHistory';
import { buildCanonicalState } from '@/test/canonical-states';
import { weekNoFor } from '@/lib/history-cycles';
import { fetchWorkoutsForBounds, downloadWorkoutsCsvFile } from '@/lib/workout-csv-download';
import { buildTrainingReportModel, generateTrainingReportPdf } from '@/lib/pdf-report';

// Dzień pinowany fake timerami: czwartek — sesje -1/-2/-3 lądują w bieżącym
// tygodniu cyklu niezależnie od realnego dnia uruchomienia testów.
const TODAY = new Date(2026, 7, 20, 12, 0, 0);
const TODAY_ISO = '2026-08-20';

const state = () => buildCanonicalState('history-multi-cycle', TODAY_ISO);

const renderPage = (entry = '/history') => render(
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

const openCycleDisclosure = () => {
  const trigger = screen.getByTestId('history-cycles-toggle');
  fireEvent.click(trigger);
  return trigger;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(TODAY);
  window.localStorage.clear();
  window.localStorage.setItem('app-language', 'pl');
  global.URL.createObjectURL = vi.fn(() => 'blob:test');
  global.URL.revokeObjectURL = vi.fn();
  const s = state();
  fixtures.workouts = s.workouts;
  fixtures.cycles = s.cycles;
  fixtures.hasMore = false;
  fixtures.exportFetchResult = s.workouts.filter((w) => (w as WorkoutSession).completed);
});

afterEach(() => {
  vi.useRealTimers();
});

const activeCycleOf = () => state().cycles.find((c) => c.status === 'active')!;

describe('WP-H H1 — poziom 1: kafle cykli', () => {
  it('domyślnie pokazuje pełną załadowaną chronologię, a cykle dopiero po rozwinięciu', () => {
    renderPage();

    const timeline = screen.getByTestId('history-latest');
    const rows = within(timeline).getAllByTestId('history-session-row');
    expect(rows).toHaveLength(5);
    expect(within(rows[0]).getByText('19.08')).toBeInTheDocument();
    expect(within(rows[1]).getByText('18.08')).toBeInTheDocument();
    expect(within(rows[2]).getByText('17.08')).toBeInTheDocument();
    expect(screen.queryByTestId('cycle-tile')).not.toBeInTheDocument();

    const trigger = screen.getByTestId('history-cycles-toggle');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'history-cycle-list');
    expect(trigger.className).toContain('min-h-11');

    openCycleDisclosure();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('history-cycle-list')).toHaveAttribute('id', 'history-cycle-list');
    expect(screen.getAllByTestId('cycle-tile')).toHaveLength(3);
  });

  it('renderuje kafel aktywnego (tag Aktywny, zakres z "teraz"), przeszłego i "Poza cyklami"', () => {
    renderPage();
    openCycleDisclosure();
    const tiles = screen.getAllByTestId('cycle-tile');
    expect(tiles).toHaveLength(3);

    // Aktywny cykl (Cykl 2 — numeracja od najstarszego).
    const activeTile = tiles.find((tile) => within(tile).queryByText('Cykl 2'))!;
    expect(activeTile).toBeDefined();
    expect(within(activeTile).getByText(/Aktywny · tydz\. \d+/i)).toBeInTheDocument();
    // Regresja E-8UE4S: endDate '' => zakres z "teraz", nie crash.
    expect(within(activeTile).getByText(/teraz/)).toBeInTheDocument();

    // Przeszły cykl z zakresem dat i tagiem liczby tygodni.
    const pastTile = tiles.find((tile) => within(tile).queryByText('Cykl 1'))!;
    expect(pastTile).toBeDefined();
    expect(within(pastTile).getByText('8 tyg.')).toBeInTheDocument();
    expect(within(pastTile).queryByText(/teraz/)).not.toBeInTheDocument();

    // Sesja bez cyklu => kafel "Poza cyklami" (niezmiennik: każda sesja osiągalna).
    const outsideTile = tiles.find((tile) => within(tile).queryByText('Poza cyklami'))!;
    expect(outsideTile).toBeDefined();
  });

  it('nie dubluje wspólnego licznika w treści; przyciski PERIOD i Export obecne', () => {
    renderPage();
    expect(screen.queryByText(/5 sesji/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('history-period')).toBeInTheDocument();
    expect(screen.getByTestId('history-export')).toBeInTheDocument();
    // Poziom 1 bez lupy (design 2a) — wyszukiwarka żyje w pełnej liście.
    expect(screen.queryByPlaceholderText(/Szukaj po dacie/)).not.toBeInTheDocument();
  });

  it('chronologia sesji zachowuje komplet akcji w menu ⋯', async () => {
    renderPage();
    const latest = screen.getByTestId('history-latest');
    const rows = within(latest).getAllByTestId('history-session-row');
    expect(rows).toHaveLength(5);
    // Draft w LATEST ma badge.
    expect(within(latest).getAllByText('draft')).toHaveLength(1);

    // Niezmiennik: komplet akcji wiersza także na poziomie 1.
    const menu = await openRowMenu(rows[0]);
    expect(within(menu).getByRole('menuitem', { name: /Otwórz trening/ })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Szczegóły' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: /Porównaj/ })).toBeInTheDocument();
    expect(within(menu).getByTestId('history-row-email')).toHaveTextContent('Wyślij do trenera');
    expect(within(menu).getByTestId('history-delete')).toHaveTextContent('Usuń');
  });

  it('domyślny ekran pokazuje maksymalnie 5 sesji; pełna lista zachowuje komplet i paginację', () => {
    const extra = {
      ...(fixtures.workouts[0] as WorkoutSession),
      id: 'workout-extra',
      date: '2026-08-14',
    };
    fixtures.workouts = [...fixtures.workouts, extra];
    fixtures.hasMore = true;
    renderPage();

    expect(within(screen.getByTestId('history-latest')).getAllByTestId('history-session-row')).toHaveLength(5);
    expect(screen.queryByRole('button', { name: 'Załaduj więcej' })).toBeNull();

    fireEvent.click(screen.getByTestId('history-all-sessions-link'));
    expect(screen.getAllByTestId('history-session-row')).toHaveLength(6);
    fireEvent.click(screen.getByRole('button', { name: 'Załaduj więcej' }));
    expect(fixtures.loadMore).toHaveBeenCalledTimes(1);
  });

  it('link "Wszystkie sesje" prowadzi do pełnej listy z wyszukiwarką i wszystkimi wierszami', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('history-all-sessions-link'));
    expect(screen.getByPlaceholderText(/Szukaj po dacie/)).toBeInTheDocument();
    // Kompletność: WSZYSTKIE sesje (5) w pełnej liście.
    expect(screen.getAllByTestId('history-session-row')).toHaveLength(5);
  });

  it('tap w kafel otwiera widok cyklu; przycisk PERIOD otwiera kalendarz zakresu', async () => {
    renderPage();
    openCycleDisclosure();
    const tiles = screen.getAllByTestId('cycle-tile');
    const activeTile = tiles.find((tile) => within(tile).queryByText('Cykl 2'))!;
    fireEvent.click(activeTile);
    expect(await screen.findByTestId('cycle-detail')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cykl 2' })).toBeInTheDocument();

    // Powrót i PERIOD.
    fireEvent.click(screen.getByTestId('cycle-back'));
    openCycleDisclosure();
    fireEvent.click(await screen.findByTestId('history-period'));
    expect(await screen.findByTestId('history-period-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('history-period-clear')).toBeInTheDocument();
  });

  it('0 cykli z sesjami ad-hoc: grid pokazuje tylko kafel "Poza cyklami"', () => {
    fixtures.cycles = [];
    renderPage();
    openCycleDisclosure();
    const tiles = screen.getAllByTestId('cycle-tile');
    expect(tiles).toHaveLength(1);
    expect(within(tiles[0]).getByText('Poza cyklami')).toBeInTheDocument();
  });
});

describe('WP-H H2 — poziom 2: widok cyklu (?cycle=)', () => {
  it('nagłówek: nazwa, pill Aktywny, zakres z "teraz" (E-8UE4S), 4 staty', () => {
    const active = activeCycleOf();
    renderPage(`/history?cycle=${active.id}`);
    const detail = screen.getByTestId('cycle-detail');
    expect(within(detail).getByRole('heading', { name: 'Cykl 2' })).toBeInTheDocument();
    expect(within(detail).getByText('Aktywny')).toBeInTheDocument();
    expect(within(detail).getByText(/teraz/)).toBeInTheDocument();
    expect(within(detail).getByText('Sesje')).toBeInTheDocument();
    expect(within(detail).getByText('Tonaż')).toBeInTheDocument();
    expect(within(detail).getByText('PR')).toBeInTheDocument();
    expect(within(detail).getByText('Frekwencja')).toBeInTheDocument();
    // Staty liczone LIVE: 2 ukończone sesje w cyklu.
    const sessionsLabel = within(detail).getByText('Sesje');
    expect(sessionsLabel.previousElementSibling).toHaveTextContent('2');
    // PR-y w akcencie.
    const prLabel = within(detail).getByText('PR');
    expect(prLabel.previousElementSibling?.className).toContain('text-primary');
  });

  it('sesje grupowane tygodniami, bieżący tydzień w akcencie; wiersz ma komplet akcji', async () => {
    const active = activeCycleOf();
    renderPage(`/history?cycle=${active.id}`);
    const detail = screen.getByTestId('cycle-detail');
    const currentWeek = weekNoFor(TODAY_ISO, active);
    const header = within(detail).getByText(`Tydzień ${currentWeek} · bieżący`);
    expect(header.className).toContain('text-primary');
    expect(within(detail).getAllByTestId('history-session-row')).toHaveLength(3);

    const menu = await openRowMenu(within(detail).getAllByTestId('history-session-row')[0]);
    expect(within(menu).getByRole('menuitem', { name: /Otwórz trening/ })).toBeInTheDocument();
    expect(within(menu).getByTestId('history-row-email')).toBeInTheDocument();
    expect(within(menu).getByTestId('history-delete')).toBeInTheDocument();
  });

  it('chipsy filtrów: Drafty zawężają, Najdłuższe najpierw sortuje (bez czasu na końcu)', () => {
    const active = activeCycleOf();
    renderPage(`/history?cycle=${active.id}`);
    const detail = screen.getByTestId('cycle-detail');

    expect(within(detail).getByTestId('cycle-chip-all')).toHaveTextContent('Wszystkie 3');
    fireEvent.click(within(detail).getByTestId('cycle-chip-drafts'));
    expect(within(detail).getAllByTestId('history-session-row')).toHaveLength(1);
    expect(within(detail).getAllByText('draft')).toHaveLength(1);

    fireEvent.click(within(detail).getByTestId('cycle-chip-all'));
    fireEvent.click(within(detail).getByTestId('cycle-chip-longest'));
    const rows = within(detail).getAllByTestId('history-session-row');
    expect(rows).toHaveLength(3);
    // Draft bez durationSec ląduje na końcu.
    expect(within(rows[rows.length - 1]).getByText('draft')).toBeInTheDocument();
  });

  it('menu ⋯ cyklu: Porównaj włącza tryb, Wyślij do trenera otwiera dialog historii', async () => {
    const active = activeCycleOf();
    renderPage(`/history?cycle=${active.id}`);
    fireEvent.pointerDown(screen.getByTestId('cycle-menu'), { button: 0, ctrlKey: false, pointerType: 'mouse' });
    fireEvent.click(screen.getByTestId('cycle-menu'));
    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: /Porównaj/ })).toBeInTheDocument();
    fireEvent.click(within(menu).getByTestId('cycle-menu-email'));
    await waitFor(() => {
      const historyDialog = screen.getAllByTestId('email-dialog-stub')
        .find((el) => el.dataset.mode === 'history');
      expect(historyDialog?.dataset.open).toBe('true');
    });
  });

  it('back wraca do kafli; nieznany ?cycle= renderuje poziom 1', () => {
    const active = activeCycleOf();
    renderPage(`/history?cycle=${active.id}`);
    fireEvent.click(screen.getByTestId('cycle-back'));
    expect(screen.getByTestId('history-period')).toBeInTheDocument();
    expect(screen.queryByTestId('cycle-detail')).not.toBeInTheDocument();
  });

  it('nieznany ?cycle= pokazuje kafle (fallback bez crasha)', () => {
    renderPage('/history?cycle=nie-ma-takiego');
    expect(screen.getByTestId('history-period')).toBeInTheDocument();
    expect(screen.queryByTestId('cycle-detail')).not.toBeInTheDocument();
  });

  it('?cycle=outside: sesje poza cyklami zgrupowane miesiącami', () => {
    renderPage('/history?cycle=outside');
    const detail = screen.getByTestId('cycle-detail');
    expect(within(detail).getByRole('heading', { name: 'Poza cyklami' })).toBeInTheDocument();
    expect(within(detail).getAllByTestId('history-session-row')).toHaveLength(1);
    expect(within(detail).getByText(/Marzec 2026/i)).toBeInTheDocument();
  });
});

describe('WP-H H3 — Export sheet', () => {
  const openSheet = async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('history-export'));
    return await screen.findByTestId('history-export-sheet');
  };

  it('Export otwiera sheet; domyślny zakres = Aktywny cykl; Ten okres disabled bez PERIOD', async () => {
    const sheet = await openSheet();
    expect(within(sheet).getByTestId('export-scope-cycle')).toHaveAttribute('aria-checked', 'true');
    expect(within(sheet).getByTestId('export-scope-period')).toBeDisabled();
    expect(within(sheet).getByTestId('export-format-pdf')).toBeInTheDocument();
    expect(within(sheet).getByTestId('export-format-csv')).toBeInTheDocument();
    // Wiersz "do trenera" z zapamiętanym adresem.
    expect(within(sheet).getByTestId('history-email')).toHaveTextContent('coach@example.com');
  });

  it('CSV: pobiera sesje aktywnego cyklu (WP-D: tryb cycleId) i woła istniejącą ścieżkę CSV', async () => {
    const active = activeCycleOf();
    const sheet = await openSheet();
    fireEvent.click(within(sheet).getByTestId('export-format-csv'));
    await waitFor(() => {
      expect(fetchWorkoutsForBounds).toHaveBeenCalledWith('u1', {
        mode: 'cycle',
        cycleId: active.id,
        fromDate: active.startDate,
        toDate: TODAY_ISO,
      });
      // Bug 26 (X30): drugi argument to opcje z onShareError (telemetria porazek share).
      expect(downloadWorkoutsCsvFile).toHaveBeenCalledWith(
        fixtures.exportFetchResult,
        expect.objectContaining({ onShareError: expect.any(Function) }),
      );
    });
    await waitFor(() => expect(screen.queryByTestId('history-export-sheet')).not.toBeInTheDocument());
  });

  it('zakres Cała historia: bounds od 1970 do dziś', async () => {
    const sheet = await openSheet();
    fireEvent.click(within(sheet).getByTestId('export-scope-all'));
    expect(within(sheet).getByTestId('export-scope-all')).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(sheet).getByTestId('export-format-csv'));
    await waitFor(() => {
      expect(fetchWorkoutsForBounds).toHaveBeenCalledWith('u1', {
        mode: 'dates',
        fromDate: '1970-01-01',
        toDate: TODAY_ISO,
      });
    });
  });

  it('PDF: buduje model z pobranych sesji i generuje raport istniejącym mechanizmem', async () => {
    const sheet = await openSheet();
    fireEvent.click(within(sheet).getByTestId('export-format-pdf'));
    await waitFor(() => {
      expect(buildTrainingReportModel).toHaveBeenCalledWith(fixtures.exportFetchResult, expect.any(Date));
      expect(generateTrainingReportPdf).toHaveBeenCalled();
      expect(shareExportMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: expect.stringMatching(/\.pdf$/), type: 'application/pdf' }),
        expect.objectContaining({ title: expect.any(String), onShareError: expect.any(Function) }),
      );
    });
    await waitFor(() => expect(screen.queryByTestId('history-export-sheet')).not.toBeInTheDocument());
  });

  it('Wyślij do trenera: zamyka sheet i otwiera dialog historii', async () => {
    const sheet = await openSheet();
    fireEvent.click(within(sheet).getByTestId('history-email'));
    await waitFor(() => {
      const historyDialog = screen.getAllByTestId('email-dialog-stub')
        .find((el) => el.dataset.mode === 'history');
      expect(historyDialog?.dataset.open).toBe('true');
    });
    await waitFor(() => expect(screen.queryByTestId('history-export-sheet')).not.toBeInTheDocument());
  });

  it('Anuluj zamyka sheet (wyjście ze stanu, zasada 6)', async () => {
    const sheet = await openSheet();
    fireEvent.click(within(sheet).getByTestId('export-cancel'));
    await waitFor(() => expect(screen.queryByTestId('history-export-sheet')).not.toBeInTheDocument());
  });
});

// WP-D (X35a): zamiast jednego "Aktywny cykl" lista cykli (widoczne z danymi),
// domyślnie aktywny; zakres liczony po cycleId (tryb 'cycle' w bounds).
describe('WP-D (X35a) — lista cykli w Export sheecie', () => {
  const openSheet = async () => {
    renderPage();
    fireEvent.click(screen.getByTestId('history-export'));
    return await screen.findByTestId('history-export-sheet');
  };

  it('chip Cykl rozwija wiersze cykli: aktywny (Cykl 2) domyślnie zaznaczony, licznik z sesji, przeszły ze stats', async () => {
    const sheet = await openSheet();
    const active = activeCycleOf();
    const past = state().cycles.find((c) => c.status === 'completed')!;
    const list = within(sheet).getByTestId('export-cycle-list');
    const rows = within(list).getAllByRole('radio');
    expect(rows).toHaveLength(2);
    // Najnowszy pierwszy; numeracja od najstarszego (jak kafle).
    expect(rows[0]).toHaveAttribute('data-testid', `export-cycle-${active.id}`);
    expect(rows[0]).toHaveAttribute('aria-checked', 'true');
    expect(rows[0].textContent).toMatch(/Cykl 2 · Mój plan siłowy/);
    // Aktywny: 2 ukończone sesje z cycleId (draft nie liczy się), "w toku" zamiast daty końca.
    expect(rows[0].textContent).toMatch(/2 treningi/);
    expect(rows[0].textContent).toMatch(/w toku/);
    // Przeszły (sprzed zapisu odpowiedzi: bez nazwy planu): stats.totalWorkouts = 8.
    expect(rows[1]).toHaveAttribute('data-testid', `export-cycle-${past.id}`);
    expect(rows[1].textContent).toMatch(/Cykl 1/);
    expect(rows[1].textContent).toMatch(/8 treningów/);
    // Tytuł sheeta = numer wybranego cyklu.
    expect(within(sheet).getByText('Cykl 2')).toBeInTheDocument();
  });

  it('wybór przeszłego cyklu: CSV idzie z bounds cycleId TEGO cyklu (daty cyklu, nie aktywnego)', async () => {
    const sheet = await openSheet();
    const past = state().cycles.find((c) => c.status === 'completed')!;
    fireEvent.click(within(sheet).getByTestId(`export-cycle-${past.id}`));
    expect(within(sheet).getByTestId(`export-cycle-${past.id}`)).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(sheet).getByTestId('export-format-csv'));
    await waitFor(() => {
      expect(fetchWorkoutsForBounds).toHaveBeenCalledWith('u1', {
        mode: 'cycle',
        cycleId: past.id,
        fromDate: past.startDate,
        toDate: past.endDate,
      });
    });
  });

  it('lista cykli ukryta poza zakresem Cykl; niezmiennik: Cała historia bez zmian (tryb dates)', async () => {
    const sheet = await openSheet();
    fireEvent.click(within(sheet).getByTestId('export-scope-all'));
    expect(within(sheet).queryByTestId('export-cycle-list')).not.toBeInTheDocument();
    fireEvent.click(within(sheet).getByTestId('export-format-csv'));
    await waitFor(() => {
      expect(fetchWorkoutsForBounds).toHaveBeenCalledWith('u1', {
        mode: 'dates',
        fromDate: '1970-01-01',
        toDate: TODAY_ISO,
      });
    });
  });

  it('bez widocznych cykli z danymi: chip Cykl disabled, domyślnie Cała historia', async () => {
    // Cykl techniczny i pusty completed (stats 0) nie są "widoczne z danymi".
    const s = state();
    fixtures.cycles = s.cycles.map((c) => (c.status === 'active'
      ? { ...c, technical: true }
      : { ...c, stats: { ...c.stats, totalWorkouts: 0 } }));
    const sheet = await openSheet();
    expect(within(sheet).getByTestId('export-scope-cycle')).toBeDisabled();
    expect(within(sheet).getByTestId('export-scope-all')).toHaveAttribute('aria-checked', 'true');
    expect(within(sheet).queryByTestId('export-cycle-list')).not.toBeInTheDocument();
  });
});
