// F6 (2026-09-29): ćwiczenia z masą ciała i opcjonalnym dociążeniem.
// Sekwencja z zasady 5 CLAUDE.md na podciąganiu: plan → seria bez kg (MC)
// zaliczona → seria +10 kg → wyjście → szybki trening → powrót → dokończenie →
// sync → Historia i PR. Historia legacy (74 kg = masa ciała 74,6) nie może
// zawyżać tonażu ani odbierać realnego PR za dociążenie.
import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  localDaysAgo,
  localToday,
  navigateAndWait,
  readWorkoutDraftDb,
  setE2EMeasurements,
  setE2EPlanMeta,
  setE2EWorkouts,
  skipPreStartWarmupIfShown,
} from './helpers';

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const PULL = 'Podciąganie na drążku';
const ROW = 'Wiosłowanie sztangą';
const LEGACY_DATE = localDaysAgo(7);

type StoredSet = { reps: number; weight: number; completed?: boolean; isWarmup?: boolean };
type StoredWorkout = { id: string; date: string; completed?: boolean; exercises?: Array<{ exerciseId: string; name?: string; sets: StoredSet[] }> };

test.describe('Masa ciała + dociążenie (F6)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => {
      localStorage.setItem('app-language', 'pl');
      localStorage.setItem('fittracker_e2e_cloud_writes', 'true');
    });
    await setE2EPlanMeta(page, {
      startDate: localDaysAgo(14),
      durationWeeks: 10,
      days: [{
        id: 'pull-day', dayName: 'Plecy', weekday: WEEKDAYS[new Date().getDay()], focus: 'Plecy',
        exercises: [
          { id: 'pull-1', name: PULL, sets: '3 x 6-8', instructions: [] },
          { id: 'row-1', name: ROW, sets: '2 x 8', instructions: [] },
        ],
      }],
    });
    // Legacy jak u właściciela: podciąganie zapisane jako 74 kg (masa ciała).
    await setE2EWorkouts(page, [{
      id: 'w-legacy', userId: 'e2e-test-user', dayId: 'pull-day', dayName: 'Plecy', dayFocus: 'Plecy',
      date: LEGACY_DATE, completed: true, durationSec: 3600,
      exercises: [
        { exerciseId: 'pull-1', name: PULL, sets: [{ reps: 8, weight: 74, completed: true }, { reps: 6, weight: 74, completed: true }] },
        { exerciseId: 'row-1', name: ROW, sets: [{ reps: 8, weight: 60, completed: true }, { reps: 8, weight: 60, completed: true }] },
      ],
    }]);
    await setE2EMeasurements(page, [{ id: 'm-1', userId: 'e2e-test-user', date: localDaysAgo(30), weight: 74.6 }]);
  });

  test('sekwencja: MC → +10 kg → szybki trening → powrót → zakończenie → sync → Historia i PR', async ({ page }) => {
    const today = localToday();
    const sessionId = `workout-e2e-test-user-pull-day-${today}`;
    await navigateAndWait(page, '/');
    await clearWorkoutDraftDb(page, 'e2e-test-user');

    // 1. Start treningu z planu. Prefill z historii legacy: 74 kg NIE trafia do +kg.
    await navigateAndWait(page, '/workout/pull-day');
    await page.getByRole('button', { name: /Rozpocznij trening/i }).click();
    await skipPreStartWarmupIfShown(page);
    const cards = page.locator('.exercise-card');
    await expect(cards).toHaveCount(2);
    const pull = cards.first();
    const load1 = pull.getByRole('textbox', { name: `${PULL}, Set 1, Dociążenie w kg (puste = sama masa ciała)` });
    await expect(load1).toBeEnabled({ timeout: 5000 });
    await expect(load1).toHaveValue('');
    await expect(load1).toHaveAttribute('placeholder', 'MC');

    // 2. Seria 1: sama masa ciała (bez kg) — zaliczona.
    await pull.getByRole('spinbutton', { name: `${PULL}, Set 1, Powt.` }).fill('8');
    await pull.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
    await expect(pull.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(1);

    // 3. Seria 2: +10 kg dociążenia.
    await pull.getByRole('textbox', { name: `${PULL}, Set 2, Dociążenie w kg (puste = sama masa ciała)` }).fill('10');
    await pull.getByRole('spinbutton', { name: `${PULL}, Set 2, Powt.` }).fill('8');
    await pull.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
    await expect(pull.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(2);

    // 4. Wyjście i szybki trening obok.
    await navigateAndWait(page, '/');
    await page.getByTestId('quick-workout-start').click();
    await expect(page).toHaveURL(/adhoc-/);
    await page.getByTestId('prestart-skip').click({ timeout: 10_000 });
    await expect(page.getByTestId('prestart-sheet')).toHaveCount(0);
    await page.getByTestId('adhoc-add-exercise').click();
    const picker = page.getByRole('dialog');
    await picker.getByPlaceholder(/Szukaj|Find/).fill('wioslowanie hantlami');
    await picker.getByText('Wiosłowanie hantlami na ławce (przodem)').click();
    await expect(page.getByRole('heading', { name: 'Wiosłowanie hantlami na ławce (przodem)' })).toBeVisible();

    // 5. Powrót do planu: oba ćwiczenia, obie serie podciągania (MC i +10 kg) na miejscu.
    await navigateAndWait(page, '/workout/pull-day');
    await expect(cards).toHaveCount(2);
    const draft = await readWorkoutDraftDb(page, 'e2e-test-user', sessionId) as { exerciseSets?: Record<string, StoredSet[]> } | null;
    expect(Object.keys(draft?.exerciseSets ?? {}).sort()).toEqual(['pull-1', 'row-1']);
    expect(draft!.exerciseSets!['pull-1'].filter((s) => s.completed && !s.isWarmup))
      .toEqual([expect.objectContaining({ reps: 8, weight: 0 }), expect.objectContaining({ reps: 8, weight: 10 })]);
    await expect(pull.getByRole('textbox', { name: `${PULL}, Set 2, Dociążenie w kg (puste = sama masa ciała)` }))
      .toHaveValue('10', { timeout: 5000 });

    // 6. Dokończenie: wiosłowanie + zakończenie. PR za dociążenie (10 kg × 8 ≥ rekord MC × 8).
    const row = cards.nth(1);
    await row.getByRole('textbox', { name: `${ROW}, Set 1, kg` }).fill('60');
    await row.getByRole('spinbutton', { name: `${ROW}, Set 1, Powt.` }).fill('8');
    await row.getByRole('button', { name: 'Zaznacz serię jako zrobioną' }).first().click();
    await page.getByRole('button', { name: 'Zakończ trening' }).click();
    await page.getByRole('button', { name: 'Tak, zakończ' }).click();
    await expect(page.getByText('Nowe rekordy')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(PULL).first()).toBeVisible();

    // 7. Sync: sesja w chmurze (mock) ma dociążenie jako weight, nigdy masę ciała.
    await expect.poll(async () => page.evaluate((id) => {
      const all = JSON.parse(localStorage.getItem('fittracker_e2e_workouts') ?? '[]') as StoredWorkout[];
      const synced = all.find((w) => w.id === id);
      if (!synced?.completed) return null;
      const pullSets = synced.exercises?.find((e) => e.exerciseId === 'pull-1')?.sets ?? [];
      return pullSets.filter((s) => s.completed && !s.isWarmup).slice(0, 2).map((s) => [s.reps, s.weight]);
    }, sessionId), { timeout: 15_000 }).toEqual([[8, 0], [8, 10]]);
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('fittracker_e2e_workouts') ?? '[]') as StoredWorkout[]);
    // Ukończone: legacy + dzisiejszy plan (skorupa szybkiego treningu bez serii nie jest treningiem).
    expect(stored.filter((w) => w.completed).map((w) => w.id).sort()).toEqual([sessionId, 'w-legacy'].sort());
    // Legacy dokument nietknięty (zero przepisań danych usera).
    expect(stored.find((w) => w.id === 'w-legacy')!.exercises![0].sets.map((s) => s.weight)).toEqual([74, 74]);
    await expect.poll(async () => readWorkoutDraftDb(page, 'e2e-test-user', sessionId), { timeout: 10_000 }).toBeNull();

    // 8. Historia: ta sama liczba sesji; tonaż legacy bez masy ciała (960 kg, nie 1996),
    // PR tylko w dzisiejszej sesji.
    await navigateAndWait(page, '/history');
    const rows = page.getByTestId('history-session-row');
    // Niezmiennik: normalizacja nie usuwa ani nie dokłada sesji (wiersz na każdy dokument,
    // także skorupę szybkiego treningu jako szkic — zachowanie sprzed F6).
    await expect(rows).toHaveCount(stored.length);
    const metas = await page.getByTestId('history-session-meta').allInnerTexts();
    const legacyMeta = metas.find((text) => !/PR/.test(text) && /960/.test(text));
    expect(legacyMeta, metas.join(' | ')).toBeDefined();
    expect(metas.join(' ')).not.toMatch(/1\s?996/);
    expect(metas.filter((text) => /\bPR\b/.test(text))).toHaveLength(1);
  });
});
