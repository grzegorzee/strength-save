import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { HistorySessionRow } from '@/components/history/HistorySessionRow';
import { buildHistoryRowMeta } from '@/lib/history-stats';
import { isBodyweightLoadedExercise } from '@/data/exerciseLibrary';
import type { WorkoutSession } from '@/types';

// F6: Historia — etykiety MC / MC +10 kg i licznik PR dociążenia dla wbudowanych
// ORAZ własnych ćwiczeń bodyweight_loaded (typ z custom_exercises, nie z biblioteki).

vi.mock('@/contexts/UserContext', () => ({ useCurrentUser: () => ({ uid: 'u1' }) }));

beforeEach(() => {
  localStorage.setItem('app-language', 'pl');
});

const CUSTOM = 'Podciąganie na kółkach';
const isLoaded = (name: string) => name === CUSTOM || isBodyweightLoadedExercise(name);

const session = (id: string, date: string, name: string, sets: Array<[number, number]>): WorkoutSession => ({
  id, userId: 'u1', dayId: 'd1', date, completed: true,
  exercises: [{ exerciseId: `ex-${name}`, name, sets: sets.map(([reps, weight]) => ({ reps, weight, completed: true })) }],
});

describe('buildHistoryRowMeta — PR dociążenia (wbudowane i własne)', () => {
  it.each([CUSTOM, 'Podciąganie na drążku'])('%s: MC 8 → +10 kg × 8 = 1 PR, +10 kg × 5 = 0 PR', (name) => {
    const history = [
      session('w1', '2026-10-01', name, [[8, 0]]),
      session('w2', '2026-10-08', name, [[8, 10]]),
      session('w3', '2026-10-15', name, [[5, 12.5]]),
    ];
    const meta = buildHistoryRowMeta(history, isLoaded);
    expect(history.map((w) => meta.get(w.id)?.prCount)).toEqual([0, 1, 0]);
  });

  it('bez predykatu własne ćwiczenie liczy się jak zwykły ciężar (dotychczasowe zachowanie)', () => {
    const history = [session('w1', '2026-10-01', CUSTOM, [[8, 0]]), session('w2', '2026-10-08', CUSTOM, [[8, 10]])];
    expect(buildHistoryRowMeta(history).get('w2')?.prCount).toBe(0);
  });
});

describe('HistorySessionRow — etykiety serii', () => {
  const renderRow = (workout: WorkoutSession, predicate?: (name: string) => boolean) => render(
    <LanguageProvider>
      <UnitProvider>
        <HistorySessionRow
          workout={workout} title="Plecy" meta={undefined} tonnage={0} totalSets={2}
          isSelected={false} isExpanded compareMode={false} surface="low"
          resolveExerciseName={(w, id) => w.exercises.find((e) => e.exerciseId === id)?.name ?? id}
          onOpen={vi.fn()} onToggleCompare={vi.fn()} onToggleExpanded={vi.fn()} onEmail={vi.fn()} onDelete={vi.fn()}
          {...(predicate ? { isBodyweightLoaded: predicate } : {})}
        />
      </UnitProvider>
    </LanguageProvider>,
  );

  it.each([CUSTOM, 'Podciąganie na drążku'])('%s: „8×MC” i „8×MC +10 kg”', (name) => {
    const { container } = renderRow(session('w1', '2026-10-08', name, [[8, 0], [8, 10]]), isLoaded);
    expect(container.textContent).toContain('8×MC');
    expect(container.textContent).toContain('8×MC +10 kg');
    expect(container.textContent).not.toContain('8×10 kg');
  });

  it('zwykłe ćwiczenie z ciężarem bez zmian', () => {
    const { container } = renderRow(session('w1', '2026-10-08', 'Wiosłowanie sztangą', [[8, 60]]), isLoaded);
    expect(container.textContent).toContain('8×60 kg');
  });
});
