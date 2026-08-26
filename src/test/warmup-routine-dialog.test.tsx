import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WarmupRoutineDialog } from '@/components/WarmupRoutineDialog';
import { buildPreStartWarmup } from '@/lib/prestart-warmup';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { UnitProvider } from '@/contexts/UnitContext';
import { translate } from '@/i18n';
import { buildWorkoutDraftSnapshot, type DraftSnapshotContext } from '@/lib/workout-draft-snapshot';
import type { ActiveWorkoutDraft } from '@/lib/workout-draft-db';

// Z162: dialog rozgrzewki jest KONTROLOWANY — stan odhaczeń mieszka w drafcie sesji
// (WorkoutDay), nie w lokalnym useState dialogu. Zamknięcie dialogu nie kasuje postępu.
// X37 WP-B: lista wg szablonu (tętno -> mobilność -> aktywacja) z aktywną
// pozycją i "Dalej"; odliczanie pozycji czasowych TYLKO za flagą intervalTimers.

const flags = vi.hoisted(() => ({ intervalTimers: false }));
vi.mock('@/lib/feature-flags', () => ({
  FEATURE_FLAGS: { get intervalTimers() { return flags.intervalTimers; }, workoutTimers: true },
}));

const noop = () => {};
const chestPlan = () => buildPreStartWarmup({ exerciseName: 'Wyciskanie sztangi na ławce płaskiej', category: 'chest', workingWeightKg: 80 });

const dialog = (over: Record<string, unknown> = {}) => (
  <LanguageProvider><UnitProvider>
    <WarmupRoutineDialog
      focus="Klatka"
      plan={chestPlan()}
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
    flags.intervalTimers = false;
  });

  it('klik w pozycję woła onToggle z nameKey (klucz i18n pozycji)', () => {
    const onToggle = vi.fn();
    renderDialog({ onToggle });
    fireEvent.click(screen.getByText(translate('pl', 'warmup.v3.armCircles')));
    expect(onToggle).toHaveBeenCalledWith('warmup.v3.armCircles');
  });

  it('odhaczenia przychodzą z propsa i przeżywają cykl zamknij/otwórz', () => {
    const checked = new Set(['warmup.v3.armCircles']);
    const { rerender } = renderDialog({ checked });
    const item = () => screen.getByText(translate('pl', 'warmup.v3.armCircles'));
    expect(item().className).toContain('line-through');

    rerender(dialog({ checked, open: false }));
    rerender(dialog({ checked, open: true }));

    expect(item().className).toContain('line-through');
  });

  // X38 WP-B: dialog opisuje TYLKO fazy; stary klucz stretchingu w drafcie nie zawyża licznika.
  it('licznik liczy pozycje szablonu (9 dla góry); bez sekcji stretchingu i rampy (X38)', () => {
    const checked = new Set(['warmup.v3.armCircles', 'stretch.pigeonPose']);
    renderDialog({ checked });
    expect(screen.getByText(/1\/9/)).toBeTruthy();
    expect(screen.getAllByTestId('warmup-item').length).toBe(9);
    expect(screen.queryByTestId('warmup-stretch-toggle')).toBeNull();
    expect(screen.queryByTestId('warmup-ramp')).toBeNull();
  });

  it('X37: fazy w kolejności tętno -> mobilność -> aktywacja; badge z czasem albo powtórzeniami ("na stronę")', () => {
    renderDialog();
    const phases = ['pulse', 'mobility', 'activation'].map((p) => screen.getByTestId(`warmup-phase-${p}`));
    expect(phases[0].compareDocumentPosition(phases[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(phases[1].compareDocumentPosition(phases[2]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(phases[0].textContent).toContain('Tętno');
    // X38: spokojne cardio 120 s zamiast pajacyków.
    expect(phases[0].textContent).toContain(translate('pl', 'warmup.v3.cardioEasy'));
    expect(phases[0].textContent).toContain('120 s');
    expect(phases[0].textContent).not.toContain('Pajacyki');
    expect(phases[1].textContent).toContain('× 10 na stronę');
    expect(phases[2].textContent).toContain('× 15');
  });

  it('X37: aktywna = pierwsza nieodhaczona; "Dalej" odhacza ją (onToggle z jej kluczem)', () => {
    const onToggle = vi.fn();
    renderDialog({ onToggle, checked: new Set(['warmup.v3.cardioEasy']) });
    const active = document.querySelector('[data-testid="warmup-item"][data-active="true"]');
    expect(active?.textContent).toContain(translate('pl', 'warmup.v3.heelsArmCircles'));
    fireEvent.click(screen.getByTestId('warmup-next'));
    expect(onToggle).toHaveBeenCalledWith('warmup.v3.heelsArmCircles');
  });

  it('X37: wszystko odhaczone = bez "Dalej", komunikat "Rozgrzewka zrobiona", Zakończ zostaje', () => {
    const checked = new Set(chestPlan().items.map((i) => i.key));
    renderDialog({ checked });
    expect(screen.queryByTestId('warmup-next')).toBeNull();
    expect(screen.getByText('Rozgrzewka zrobiona')).toBeTruthy();
    expect(screen.getByTestId('warmup-finish')).toBeTruthy();
  });

  it('X37: bez flagi intervalTimers pozycja czasowa NIE ma odliczania (tylko Dalej)', () => {
    renderDialog();
    expect(screen.queryByTestId('warmup-countdown-start')).toBeNull();
    expect(screen.queryByTestId('warmup-countdown')).toBeNull();
    expect(screen.getByTestId('warmup-next')).toBeTruthy();
  });

  // X38 WP-B: rampa zostaje TYLKO jako chip "Rozgrzewka" w karcie ćwiczenia;
  // dialog nie wspomina o gryfie ani % ciężaru roboczego (sztanga i hantle).
  it('X38: bez sekcji rampy i stretchingu, zero wzmianek o gryfie i % ciężaru roboczego', () => {
    for (const plan of [
      chestPlan(),
      buildPreStartWarmup({ exerciseName: 'Wyciskanie hantli', category: 'chest', workingWeightKg: 30 }),
    ]) {
      const view = renderDialog({ plan });
      const content = document.body.textContent ?? '';
      expect(screen.queryByTestId('warmup-ramp')).toBeNull();
      expect(screen.queryByTestId('warmup-stretch-toggle')).toBeNull();
      expect(content).not.toContain('ciężaru roboczego');
      expect(content).not.toContain('gryf');
      expect(content).not.toContain('stretching');
      view.unmount();
    }
  });
});

describe('WarmupRoutineDialog: odliczanie pozycji czasowej za flagą intervalTimers (X37)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('app-language', 'pl');
    flags.intervalTimers = true;
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    flags.intervalTimers = false;
  });

  it('start odliczania 120 s (cardio) -> po upływie czasu pozycja odhaczona (onToggle), deadline-based', () => {
    const onToggle = vi.fn();
    renderDialog({ onToggle });
    fireEvent.click(screen.getByTestId('warmup-countdown-start'));
    expect(screen.getByTestId('warmup-countdown').textContent).toContain('120s');
    act(() => { vi.advanceTimersByTime(30_000); });
    expect(screen.getByTestId('warmup-countdown').textContent).toContain('90s');
    expect(onToggle).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(91_000); });
    expect(onToggle).toHaveBeenCalledWith('warmup.v3.cardioEasy');
    expect(screen.queryByTestId('warmup-countdown')).toBeNull();
  });

  it('Stop w trakcie = bez odhaczenia; pozycja na powtórzenia nie ma przycisku odliczania', () => {
    const onToggle = vi.fn();
    const { rerender } = renderDialog({ onToggle });
    fireEvent.click(screen.getByTestId('warmup-countdown-start'));
    act(() => { vi.advanceTimersByTime(5_000); });
    fireEvent.click(screen.getByText(translate('pl', 'comp.warmup.stop')));
    expect(screen.queryByTestId('warmup-countdown')).toBeNull();
    expect(onToggle).not.toHaveBeenCalled();
    // Aktywna = krążenia ramion (powtórzenia): bez odliczania.
    rerender(dialog({ onToggle, checked: new Set(['warmup.v3.cardioEasy', 'warmup.v3.heelsArmCircles']) }));
    expect(screen.queryByTestId('warmup-countdown-start')).toBeNull();
    expect(screen.getByTestId('warmup-next')).toBeTruthy();
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
    flags.intervalTimers = false;
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
      warmupChecked: ['warmup.v3.cardioEasy', 'warmup.v3.heelsArmCircles', 'warmup.v3.armCircles'],
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

  it('niezmiennik: legacy draft bez warmupChecked (albo ze starymi kluczami v2) hydratuje się bez błędu i nie gubi ćwiczeń dnia', () => {
    const legacy = draftBase();
    const snapshot = buildWorkoutDraftSnapshot(contextFor(legacy));

    expect(snapshot?.warmupChecked).toBeUndefined();
    expect(snapshot?.version).toBe(3); // brak pola nie udaje zmiany treści
    expect(snapshot?.exerciseSets).toEqual(legacy.exerciseSets);

    const legacyView = render(dialog({ checked: new Set(snapshot?.warmupChecked ?? []) }));
    expect(struckItems()).toBe(0);
    legacyView.unmount();
    // Stare klucze v2 z draftu sprzed X37 i pajacyki sprzed X38 (warmup.v3.jacks):
    // nic nie pasuje, lista czysta, zero wyjątków, licznik od zera.
    render(dialog({ checked: new Set(['warmup.v2.cardio', 'warmup.v2.dynArmCircles', 'warmup.v3.jacks', 'stretch.pigeonPose']) }));
    expect(struckItems()).toBe(0);
    expect(screen.getByText(/0\/9/)).toBeTruthy();
  });
});
