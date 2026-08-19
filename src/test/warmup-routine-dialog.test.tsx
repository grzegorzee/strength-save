import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WarmupRoutineDialog } from '@/components/WarmupRoutineDialog';
import { buildPreStartWarmup } from '@/lib/prestart-warmup';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { translate } from '@/i18n';
import { buildWorkoutDraftSnapshot, type DraftSnapshotContext } from '@/lib/workout-draft-snapshot';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

// Z162: dialog rozgrzewki jest KONTROLOWANY — stan odhaczeń mieszka w drafcie sesji
// (WorkoutDay), nie w lokalnym useState dialogu. Zamknięcie dialogu nie kasuje postępu.

const noop = () => {};

const dialog = (over: Record<string, unknown> = {}) => (
  <LanguageProvider><UnitProvider>
    <WarmupRoutineDialog
      focus="Klatka"
      plan={buildPreStartWarmup({ exerciseName: 'Wyciskanie sztangi na ławce płaskiej', category: 'chest', workingWeightKg: 80 })}
      open
      onOpenChange={noop}
      checked={new Set<string>()}
      onToggle={noop}
      {...over}
    />
  </UnitProvider></LanguageProvider>
);

const renderDialog = (over: Record<string, unknown> = {}) => render(dialog(over));

describe('WarmupRoutineDialog (kontrolowany)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
  });

  it('klik w pozycję woła onToggle z nameKey (C-T2: klucz i18n pozycji)', () => {
    const onToggle = vi.fn();
    renderDialog({ onToggle });
    fireEvent.click(screen.getByText(translate('pl', 'warmup.v2.dynArmCircles')));
    expect(onToggle).toHaveBeenCalledWith('warmup.v2.dynArmCircles');
  });

  it('odhaczenia przychodzą z propsa i przeżywają cykl zamknij/otwórz', () => {
    const checked = new Set(['warmup.v2.dynArmCircles']);
    const { rerender } = renderDialog({ checked });
    const item = () => screen.getByText(translate('pl', 'warmup.v2.dynArmCircles'));
    expect(item().className).toContain('line-through');

    rerender(dialog({ checked, open: false }));
    rerender(dialog({ checked, open: true }));

    expect(item().className).toContain('line-through');
  });

  it('C-T2: licznik liczy pozycje domyślne (cardio+dynamiczne), stretching zwinięty', () => {
    // Klucz stretchingu nie zawyża licznika; stretching wymaga jawnego rozwinięcia.
    const checked = new Set(['warmup.v2.dynArmCircles', 'stretch.pigeonPose']);
    renderDialog({ checked });
    expect(screen.getByText(/1\/4/)).toBeTruthy();
    expect(screen.queryByText(translate('pl', 'comp.warmup.stretching'))).toBeNull();
    fireEvent.click(screen.getByTestId('warmup-stretch-toggle'));
    expect(screen.getAllByTestId('warmup-item').length).toBeGreaterThan(4);
  });

  it('C-T2: sztanga dostaje gryf w rampie, copy mówi o % ciężaru roboczego', () => {
    renderDialog({});
    const ramp = screen.getByTestId('warmup-ramp');
    expect(ramp.textContent).toContain(translate('pl', 'warmup.v2.rampTitle'));
    expect(ramp.textContent).toContain('ciężaru roboczego');
    expect(ramp.textContent).toContain(translate('pl', 'warmup.v2.rampBar'));
    expect(ramp.textContent).not.toContain('1RM');
  });

  it('C-T2: hantle bez pustego gryfu (start od lekkiego ciężaru)', () => {
    renderDialog({
      plan: buildPreStartWarmup({ exerciseName: 'Wyciskanie hantli', category: 'chest', workingWeightKg: 30 }),
    });
    const ramp = screen.getByTestId('warmup-ramp');
    expect(ramp.textContent).toContain(translate('pl', 'warmup.v2.rampLight'));
    expect(ramp.textContent).not.toContain(translate('pl', 'warmup.v2.rampBar'));
  });
});

// Reguła 5 CLAUDE.md: sekwencja, nie pojedynczy ekran. Stan przechodzi przez realny
// builder snapshotu draftu (ten sam kod, który zapisuje WorkoutDay).
describe('sekwencja rozgrzewki: odhacz → wyjdź → wróć → nowa sesja (Z162)', () => {
  const draftBase = (over: Partial<ActiveWorkoutDraft> = {}): ActiveWorkoutDraft => ({
    sessionId: 's1',
    userId: 'u1',
    dayId: 'd1',
    date: '2026-07-28',
    cycleId: null,
    sessionOrigin: 'remote',
    remoteSessionId: 's1',
    exerciseSets: { 'ex-1': [{ reps: 8, weight: 60, completed: true }] },
    exerciseNotes: {},
    exerciseMetrics: {},
    dayNotes: '',
    skippedExercises: [],
    startedAt: 1000,
    updatedAt: 2000,
    lastFirebaseSyncAt: null,
    dirty: true,
    completedLocally: false,
    finalSyncPending: false,
    version: 3,
    ...over,
  });

  const contextFor = (draft: ActiveWorkoutDraft | null, warmupChecked?: string[]): DraftSnapshotContext => ({
    userId: 'u1',
    sessionId: draft?.sessionId ?? 's2',
    dayId: 'd1',
    date: '2026-07-28',
    previousDraft: draft,
    exerciseSets: draft?.exerciseSets ?? {},
    exerciseNotes: {},
    exerciseMetrics: {},
    dayNotes: '',
    skippedExercises: [],
    ...(warmupChecked !== undefined && { warmupChecked }),
    dayNames: {},
    cloudMeta: null,
    now: 3000,
  });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
  });

  // Radix renderuje treść dialogu w portalu (poza container z render()).
  const struckItems = () => document.body.querySelectorAll('.line-through').length;

  it('odhaczenia z draftu wracają na ekran, a nowa sesja startuje z czystą rozgrzewką', () => {
    // 1. Start treningu: draft bez odhaczeń → dialog czysty.
    const start = draftBase();
    const first = render(dialog({ checked: new Set(start.warmupChecked ?? []) }));
    expect(struckItems()).toBe(0);
    first.unmount();

    // 2. Odhaczenie 3 pozycji przechodzi przez builder snapshotu (jak saveDraftSnapshot).
    const afterToggles = buildWorkoutDraftSnapshot(contextFor(start), {
      warmupChecked: ['warmup.v2.dynArmCircles', 'warmup.v2.dynPushups', 'warmup.v2.cardio'],
    });
    expect(afterToggles?.warmupChecked).toHaveLength(3);
    expect(afterToggles?.version).toBe(4); // zmiana treści = bump wersji

    // 3. Wyjście z ekranu i powrót: hydratacja z draftu → odhaczenia SĄ.
    const back = render(dialog({ checked: new Set(afterToggles?.warmupChecked ?? []) }));
    expect(struckItems()).toBe(3);
    back.unmount();

    // 4. Zakończenie treningu → nowa sesja (brak poprzedniego draftu) → rozgrzewka czysta.
    const nextSession = buildWorkoutDraftSnapshot(contextFor(null));
    expect(nextSession?.warmupChecked).toBeUndefined();
    render(dialog({ checked: new Set(nextSession?.warmupChecked ?? []) }));
    expect(struckItems()).toBe(0);
  });

  it('niezmiennik: legacy draft bez warmupChecked hydratuje się bez błędu i nie gubi ćwiczeń dnia', () => {
    const legacy = draftBase();
    const snapshot = buildWorkoutDraftSnapshot(contextFor(legacy));

    expect(snapshot?.warmupChecked).toBeUndefined();
    expect(snapshot?.version).toBe(3); // brak pola nie udaje zmiany treści
    expect(snapshot?.exerciseSets).toEqual(legacy.exerciseSets);

    render(dialog({ checked: new Set(snapshot?.warmupChecked ?? []) }));
    expect(struckItems()).toBe(0);
  });
});
