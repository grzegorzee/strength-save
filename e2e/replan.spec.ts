import { test, expect } from '@playwright/test';
import { setE2EAuthScenario, setE2ECycles, blockFirebase, advanceWizardToStep5, advanceWizardToStep6 } from './helpers';

// Pełnoekranowy replan (/new-plan) + ekran podsumowania zakończonego cyklu (closeout).

const day = (i: number) => ({
  id: `d${i}`,
  dayName: `Dzień ${i}`,
  focus: 'Push',
  exercises: [{ id: `e${i}`, name: 'Wyciskanie sztangi', sets: '4x8' }],
});

const completedCycle = {
  id: 'e2e-cycle-1',
  userId: 'e2e-user',
  days: [day(1), day(2), day(3), day(4)],
  durationWeeks: 8,
  startDate: '2026-03-02',
  endDate: '2026-04-26',
  status: 'completed',
  createdAt: '2026-03-02T00:00:00.000Z',
  stats: { totalWorkouts: 28, totalTonnage: 45200, prs: [{ exerciseName: 'Przysiad', weight: 120, estimated1RM: 140 }], completionRate: 88, expectedWorkouts: 32 },
};

test.describe('Replan', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-admin');
  });

  test('replan renderuje się pełnoekranowo (bez nagłówka appki)', async ({ page }) => {
    await page.goto('./#/new-plan');
    await page.waitForLoadState('domcontentloaded');
    // Poczekaj na content wizarda (po lazy-load / Suspense). X32: replan startuje
    // od kroku 2 (poziom); X33/X34: krok 5A z dwiema kartami, linkiem biblioteki
    // i jednym CTA "Wybierz start planu" (przerywnik 3,5 s mija sam).
    await expect(page.getByRole('button', { name: /Next step|Następny krok/ })).toBeVisible();
    await expect(page.getByText('02 / 06')).toBeVisible();
    await advanceWizardToStep5(page);
    await expect(page.getByTestId('ob-match-next')).toHaveText(/Choose plan start|Wybierz start planu/);
    await expect(page.getByRole('button', { name: /Plan library|Biblioteka planów/ })).toBeVisible();
    await expect(page.getByTestId('plan-choice-recommended')).toBeVisible();
    await expect(page.getByRole('button', { name: /Start this plan|Zaczynam ten plan/ })).toHaveCount(0);
    // Pełny ekran = brak AppHeader (banner) aplikacji.
    await expect(page.getByRole('banner')).toHaveCount(0);
    expect(await page.locator('text=Coś poszło nie tak').count()).toBe(0);
    await page.screenshot({ path: '/tmp/replan-fullscreen.png' });
  });

  // X34 (c) + X34b: replan 2 -> 6 -> DRUGI chip pierwszego treningu -> podgląd ->
  // zatwierdź. Zapis planu idzie do mirrora e2e (fittracker_e2e_plan): startDate =
  // poniedziałek tygodnia wybranej daty, skippedDates = dni treningowe tego
  // tygodnia sprzed wyboru (Firestore zablokowany, więc cykl nie powstaje i
  // asercja UI kończy się na zniknięciu kreatora).
  test('X34 (c): replan 2-6 -> drugi chip -> podgląd -> Zatwierdź i zacznij (mirror: poniedziałek + skippedDates)', async ({ page }) => {
    await page.goto('./#/new-plan');
    await page.waitForLoadState('domcontentloaded');
    await advanceWizardToStep6(page);
    await expect(page.getByText('06 / 06')).toBeVisible();
    await expect(page.getByTestId('ob-start-cta')).toHaveText(/Zacznij/);
    const chips = page.getByTestId('ob-first-workout-chips').getByRole('button');
    await expect(chips).toHaveCount(8);
    await expect(chips.first()).toHaveAttribute('aria-pressed', 'true');
    const first = (await chips.first().getAttribute('data-date'))!;
    await chips.nth(1).click();
    await expect(chips.nth(1)).toHaveAttribute('aria-pressed', 'true');
    const picked = (await chips.nth(1).getAttribute('data-date'))!;
    expect(picked > first).toBe(true);

    await page.getByTestId('ob-start-preview').click();
    await expect(page.getByRole('heading', { name: 'Podgląd planu' })).toBeVisible();
    await expect(page.getByTestId('plan-preview-choose-other')).toHaveText('Wybierz inny plan');
    const confirm = page.getByTestId('plan-preview-confirm');
    await expect(confirm).toHaveText(/Zatwierdź i zacznij/);
    await confirm.click();
    await expect(page.getByTestId('ob-start-step')).toHaveCount(0);
    await expect(page.getByRole('banner')).toHaveCount(0);

    const mondayOf = (iso: string) => {
      const [y, m, d] = iso.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const dow = date.getDay();
      date.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };
    await expect.poll(async () => page.evaluate(() => {
      const raw = window.localStorage.getItem('fittracker_e2e_plan');
      return raw ? (JSON.parse(raw) as { startDate?: string }).startDate ?? null : null;
    })).toBe(mondayOf(picked));
    const saved = await page.evaluate(() => JSON.parse(window.localStorage.getItem('fittracker_e2e_plan')!) as { startDate?: string; skippedDates?: string[] });
    const skipped = saved.skippedDates ?? [];
    expect(skipped).not.toContain(picked);
    for (const iso of skipped) expect(iso >= mondayOf(picked) && iso < picked).toBe(true);
    // Pierwszy chip w tym samym tygodniu co wybrany = pominięty (nie zaległy).
    if (mondayOf(first) === mondayOf(picked)) expect(skipped).toContain(first);
  });

  // X34 (d): biblioteka -> wybór szablonu spoza kart -> 5A z kartą "Wybrany" -> 6/6
  // z nazwą wybranego szablonu.
  test('X34 (d): biblioteka -> wybór -> 6/6 z nazwą wybranego planu', async ({ page }) => {
    await page.goto('./#/new-plan');
    await page.waitForLoadState('domcontentloaded');
    await advanceWizardToStep5(page);
    const shown = [
      (await page.getByTestId('plan-choice-recommended').getByTestId('plan-choice-name').textContent())?.trim(),
      (await page.getByTestId('plan-choice-alternative').getByTestId('plan-choice-name').textContent())?.trim(),
    ];
    await page.getByRole('button', { name: /Biblioteka planów/ }).click();
    await expect(page.getByTestId('browse-objective-chips')).toBeVisible();
    const headings = page.getByRole('heading', { level: 3 });
    const count = await headings.count();
    let pickedName = '';
    for (let i = 0; i < count; i += 1) {
      const name = (await headings.nth(i).textContent())?.trim() ?? '';
      if (!shown.includes(name)) { pickedName = name; break; }
    }
    expect(pickedName).not.toBe('');
    await page.getByRole('heading', { level: 3, name: pickedName }).click();

    const second = page.getByTestId('plan-choice-alternative');
    await expect(second.getByTestId('plan-choice-badge')).toHaveText('Wybrany');
    await expect(second).toHaveAttribute('aria-pressed', 'true');
    await expect(second.getByTestId('plan-choice-name')).toHaveText(pickedName);
    await page.getByTestId('ob-match-next').click();
    await expect(page.getByTestId('ob-start-step')).toBeVisible();
    await expect(page.getByTestId('ob-plan-name')).toHaveValue(pickedName);
    await expect(page.getByTestId('ob-duration-tiles').getByTestId('ob-weeks-recommended')).toHaveCount(1);
  });

  test('closeout pokazuje podsumowanie zakończonego cyklu', async ({ page }) => {
    await setE2ECycles(page, [completedCycle]);
    await page.goto('./#/new-plan?fromCycle=e2e-cycle-1');
    await page.waitForLoadState('domcontentloaded');
    // Przycisk wyboru nowego planu kończy ekran closeout.
    await expect(page.getByRole('button', { name: /Choose|Wybierz|new plan|nowy plan/i })).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(0);
    // Statystyki muszą pochodzić ze snapshotu cyklu (stats), nie z przeliczenia pustych workouts.
    await expect(page.getByText('28/32')).toBeVisible();
    await expect(page.getByText('88%')).toBeVisible();
    await page.screenshot({ path: '/tmp/replan-closeout.png' });
  });
});
