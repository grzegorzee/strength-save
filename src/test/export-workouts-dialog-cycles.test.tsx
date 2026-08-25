// WP-D (X35a): dialog eksportu CSV (Ustawienia/Analityka) — zakres "Cykl
// treningowy" ma te same etykiety cykli co sheet Historii, domyślnie aktywny
// cykl (CTA nie startuje jako disabled), filtr widoczności, bounds w trybie
// cycleId. Niezmienniki: tydzień/miesiąc/własny zakres jak dotąd (tryb dates).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { WorkoutSession } from '@/types';
import { buildCanonicalState } from '@/test/canonical-states';

const fetchBoundsMock = vi.hoisted(() => vi.fn<() => Promise<WorkoutSession[]>>());

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn(), useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/workout-csv-download', () => ({
  downloadWorkoutsCsvFile: vi.fn(async () => 'downloaded'),
  fetchWorkoutsForBounds: fetchBoundsMock,
}));
vi.mock('@/lib/global-error-telemetry', () => ({ reportClientErrorWithCurrentUid: vi.fn() }));

import { ExportWorkoutsDialog } from '@/components/ExportWorkoutsDialog';

const TODAY_ISO = '2026-08-20';
const state = () => buildCanonicalState('history-multi-cycle', TODAY_ISO);

const renderDialog = (cycles = state().cycles, workouts = state().workouts) =>
  render(
    <LanguageProvider>
      <ExportWorkoutsDialog open onOpenChange={vi.fn()} uid="u1" cycles={cycles} workouts={workouts} />
    </LanguageProvider>,
  );

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 7, 20, 12, 0, 0));
  localStorage.clear();
  localStorage.setItem('app-language', 'pl');
  fetchBoundsMock.mockReset().mockResolvedValue(state().workouts.filter((w) => w.completed));
});

describe('ExportWorkoutsDialog — cykle (WP-D)', () => {
  it('zakres Cykl: domyślnie aktywny cykl z pełną etykietą, podgląd liczony w trybie cycleId, CTA aktywne', async () => {
    const active = state().cycles.find((c) => c.status === 'active')!;
    renderDialog();
    fireEvent.click(screen.getByTestId('export-range-cycle'));

    const trigger = await screen.findByTestId('export-cycle-select');
    expect(trigger.textContent).toMatch(/Cykl 2 · Mój plan siłowy · .+ → w toku · 2 treningi/);
    await waitFor(() => {
      expect(fetchBoundsMock).toHaveBeenCalledWith('u1', {
        mode: 'cycle', cycleId: active.id, fromDate: active.startDate, toDate: TODAY_ISO,
      });
    });
    await waitFor(() => expect(screen.getByTestId('export-submit')).not.toBeDisabled());
  });

  it('filtr widoczności: cykl techniczny znika z listy; bez widocznych cykli komunikat "Brak cykli"', async () => {
    const cycles = state().cycles.map((c) => (c.status === 'active'
      ? { ...c, technical: true }
      : { ...c, stats: { ...c.stats, totalWorkouts: 0 } }));
    renderDialog(cycles);
    fireEvent.click(screen.getByTestId('export-range-cycle'));
    expect(await screen.findByText('Brak cykli treningowych')).toBeInTheDocument();
    expect(screen.queryByTestId('export-cycle-select')).not.toBeInTheDocument();
  });

  it('niezmiennik: Ostatni tydzień liczy podgląd w trybie dates jak dotąd', async () => {
    renderDialog();
    await waitFor(() => {
      expect(fetchBoundsMock).toHaveBeenCalledWith('u1', {
        mode: 'dates', fromDate: '2026-08-14', toDate: TODAY_ISO,
      });
    });
  });
});
