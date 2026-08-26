import { test, expect } from '@playwright/test';
import {
  blockFirebase,
  clearWorkoutDraftDb,
  expectPageRendered,
  localToday,
  navigateAndWait,
  readWorkoutDraftDb,
} from './helpers';

// Z186: bramka sekwencji "kill w trakcie treningu" (incydent z builda 81 — wskrzeszone
// i zdublowane serie po force-quit). Po kill i "Kontynuuj trening" liczba i stan serii
// wracają 1:1: zero wskrzeszeń starszego snapshotu (Z182/Z183), zero fabrykatów W (Z184),
// zero zdublowanych kart po swapie (Z185).

const E2E_UID = 'e2e-test-user';

type DraftShape = {
  exerciseSets?: Record<string, { completed: boolean; isWarmup?: boolean }[]>;
} | null;

test.describe('Sekwencja kill → kontynuuj (Z186)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
  });

  test('serie wracają 1:1 po force-quit: 2xW odhaczone + robocze bez zmian, dokończenie dostępne', async ({ page, browserName }) => {
    const today = localToday();
    await navigateAndWait(page, '/');
    await clearWorkoutDraftDb(page, E2E_UID);

    // Start treningu z planu.
    await navigateAndWait(page, `/workout/day-1?date=${today}&autostart=true`);
    const firstCard = page.locator('.exercise-card').first();
    await firstCard.getByRole('textbox', { name: /Set 1, kg/ }).first().fill('100');

    // Chip "Rozgrzewka" generuje rampę wg sprzętu (X37 WP-B): pierwsze ćwiczenie
    // to hantle, więc 2xW (50% x8 / 75% x3); sztanga dostałaby 4xW.
    await firstCard.getByTestId('warmup-generate').click();
    await expect(firstCard.getByRole('textbox', { name: /Rozgrzewka W, kg/ })).toHaveCount(2);

    // Odhacz 2xW + 2 serie robocze — pierwszy przycisk "Zaznacz" to zawsze
    // pierwsza nieodhaczona seria (W są na górze tabeli).
    for (let i = 0; i < 4; i += 1) {
      await firstCard.getByRole('button', { name: /^Zaznacz serię jako zrobioną/ }).first().click();
    }
    await expect(firstCard.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(4);
    const uncheckedBefore = await firstCard
      .getByRole('button', { name: 'Zaznacz serię jako zrobioną' })
      .count();

    // Zapis draftu jest asynchroniczny — poll aż snapshot PIERWSZEGO ćwiczenia
    // niesie pełny stan (pozostałe karty mają same serie robocze, X38: bez W z prefillu).
    await expect.poll(async () => {
      const draft = (await readWorkoutDraftDb(page, E2E_UID)) as DraftShape;
      const sets = draft?.exerciseSets?.['ex-1-1'] ?? [];
      return {
        warmup: sets.filter((s) => s.isWarmup).length,
        warmupDone: sets.filter((s) => s.isWarmup && s.completed).length,
        workingDone: sets.filter((s) => !s.isWarmup && s.completed).length,
      };
    }, { timeout: 10000 }).toEqual({ warmup: 2, warmupDone: 2, workingDone: 2 });

    // Symulacja zgaszenia ekranu: renderer JS jest zamrożony, a potem wznowiony.
    // Nie oczekujemy pracy timerów w tle — po resume liczy się trwały snapshot.
    // Playwright udostępnia prawdziwy freeze renderera wyłącznie przez Chromium
    // CDP. WebKit nadal przechodzi cały kill/cold restore poniżej; native resume
    // ma osobny test Capacitor appStateChange i ręczną bramkę urządzenia.
    if (browserName === 'chromium') {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Page.setWebLifecycleState', { state: 'frozen' });
      await new Promise(resolve => setTimeout(resolve, 250));
      await cdp.send('Page.setWebLifecycleState', { state: 'active' });
    }
    await expect.poll(async () => {
      const draft = (await readWorkoutDraftDb(page, E2E_UID)) as DraftShape;
      return draft?.exerciseSets?.['ex-1-1']?.filter((set) => set.completed).length ?? 0;
    }).toBe(4);

    // Wyjście z treningu, potem kill (reload = zimny start).
    await navigateAndWait(page, '/');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Powrót: auto-resume X10 (zimny start z żywym draftem wraca do treningu sam)
    // albo ręcznie przez "Kontynuuj trening" na Dashboardzie.
    const autoResumed = await page
      .waitForURL(/#\/workout\/day-1\?/, { timeout: 7000 })
      .then(() => true)
      .catch(() => false);
    if (!autoResumed) {
      await expectPageRendered(page);
      await page.getByRole('button', { name: 'Kontynuuj trening' }).click();
      await expect(page).toHaveURL(/#\/workout\/day-1\?/);
    }

    // Serie 1:1: dokładnie 2 wiersze W (oba odhaczone), robocze bez zmian,
    // zero wskrzeszonych/zdublowanych wierszy.
    const cardAfter = page.locator('.exercise-card').first();
    await expect(page.getByText('Odzyskano niezapisany trening')).toHaveCount(0);
    await expect(cardAfter.getByRole('textbox', { name: /Rozgrzewka W, kg/ })).toHaveCount(2);
    await expect(cardAfter.getByRole('button', { name: 'Odznacz serię' })).toHaveCount(4);
    await expect(cardAfter.getByRole('button', { name: 'Zaznacz serię jako zrobioną' })).toHaveCount(uncheckedBefore);

    // Dokończenie: "Zakończ trening" dostępny (finalny sync w mock e2e nie domknie
    // się — Firestore zablokowany; ścieżkę finalSyncPending pokrywa test Z49).
    await expect(page.getByRole('button', { name: 'Zakończ trening' })).toBeVisible();

    await clearWorkoutDraftDb(page, E2E_UID);
  });
});
