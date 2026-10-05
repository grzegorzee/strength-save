import { test, expect, type Locator, type Page } from '@playwright/test';
import { installEmulatorAppCheck } from '../app-check';
import {
  addDays, completeWizard, connectClient, dashboardGreeting, loginThroughUi, noonOf, provisionVerifiedProUser,
  readDoc, readPlan, todayIso, weekdayOf,
} from './support';
import { runReminderAt } from './reminder';

// Release e2e 7: plan. Przełożenie dzisiejszego treningu na jutro (dzień wolny)
// z zakładki Plan → Dashboard dziś = dzień wolny, „następny” = jutro;
// pominięcie (odpuszczenie) dnia T+2 → Dashboard w T+2 = dzień wolny, push
// dnia pominiętego nie wychodzi. Stan: training_plans.scheduleOverrides /
// skippedDates (rules), dni planu bez zmian.

test.beforeEach(async ({ page }) => installEmulatorAppCheck(page));

async function planDayCard(page: Page, iso: string): Promise<Locator> {
  const header = page.getByTestId(`plan-day-header-${iso}`);
  await expect(page.locator('[data-testid^="plan-day-header-"]').first()).toBeVisible({ timeout: 15_000 });
  if (!(await header.isVisible().catch(() => false))) {
    await page.getByRole('button', { name: 'Następny tydzień' }).click();
  }
  await expect(header).toBeVisible();
  return header.locator('xpath=ancestor::div[contains(@class, "mb-3")][1]');
}

test('R7: przełożenie na dzień wolny i odpuszczenie dnia → Dashboard dzień wolny, plan i push spójne', async ({ page }) => {
  test.setTimeout(150_000);
  const user = await provisionVerifiedProUser('r7-plan');
  const today = todayIso();
  const tomorrow = addDays(today, 1);
  const skipDate = addDays(today, 2);
  await loginThroughUi(page, user.email);
  await completeWizard(page, {
    weekdays: [weekdayOf(today), weekdayOf(skipDate), weekdayOf(addDays(today, 4))],
    firstWorkout: today,
  });
  const planBefore = await readPlan(user.uid);
  const todayDayId = planBefore.days.find((d) => d.weekday === weekdayOf(today))!.id;
  const client = await connectClient(user.email);
  const token = `release-e2e-fcm-${user.uid}`;
  try {
    await client.call('registerPushToken', { token, deviceId: 'release-e2e' });
  } finally {
    await client.close();
  }
  await expect(page.getByTestId('dashboard-primary-action')).toBeVisible();

  // 1. Przełożenie dzisiejszego treningu na jutro (Plan → Więcej akcji → Przełóż).
  await page.goto('./#/plan');
  const todayCard = await planDayCard(page, today);
  await todayCard.getByRole('button', { name: 'Więcej akcji' }).click();
  await page.getByRole('menuitem', { name: 'Przełóż trening' }).click();
  await expect(page.getByRole('heading', { name: 'Przełóż trening' })).toBeVisible();
  const day = Number(tomorrow.slice(8, 10));
  await page.getByRole('dialog').locator('button').filter({ hasText: new RegExp(`, ${day} `) }).first().click();
  await expect(page.getByRole('heading', { name: 'Przełóż trening' })).toBeHidden();
  await expect.poll(async () => (await readPlan(user.uid)).scheduleOverrides, { timeout: 10_000 })
    .toEqual({ [today]: null, [tomorrow]: todayDayId });
  expect((await readPlan(user.uid)).days).toEqual(planBefore.days);

  // Dashboard dziś: dzień wolny (regeneracja), najbliższy trening = jutro.
  await page.goto('./#/');
  await page.reload();
  await expect(dashboardGreeting(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('recovery-card')).toBeVisible();
  await expect(page.getByTestId('next-session-hero')).toContainText(
    noonOf(tomorrow).toLocaleDateString('pl-PL', { weekday: 'long' }), { ignoreCase: true },
  );
  // Push: dziś nie (przełożone), jutro tak (przełożony trening). Strefa z profilu
  // (TimeZoneSync zapisuje strefę przeglądarki; w CI to UTC), tak jak w R3.
  const tz = String((await readDoc(`users/${user.uid}`))?.timeZone ?? 'Europe/Warsaw');
  expect((await runReminderAt(today, tz)).pushedTokens).not.toContain(token);
  expect((await runReminderAt(tomorrow, tz)).pushedTokens).toContain(token);

  // 2. Odpuszczenie dnia T+2 (Plan → Więcej akcji → Odpuść trening).
  await page.goto('./#/plan');
  const skipCard = await planDayCard(page, skipDate);
  await skipCard.getByRole('button', { name: 'Więcej akcji' }).click();
  await page.getByRole('menuitem', { name: 'Odpuść trening' }).click();
  await expect(page.getByText('Trening odpuszczony. Silnik progresji to uwzględni.').first()).toBeVisible();
  // Kreator wpisuje do skippedDates dni treningowe tygodnia startu sprzed pierwszego
  // treningu (first-workout-schedule), więc baza zależy od dnia tygodnia uruchomienia.
  const skippedBefore = (planBefore.skippedDates as string[] | undefined) ?? [];
  await expect.poll(async () => (await readPlan(user.uid)).skippedDates, { timeout: 10_000 })
    .toEqual([...skippedBefore, skipDate].sort());
  await expect(skipCard).toContainText('Odpuszczone');

  // Dashboard w dniu odpuszczonym: dzień wolny, bez CTA dzisiejszego treningu; push nie wychodzi.
  await page.clock.setFixedTime(noonOf(skipDate));
  await page.goto('./#/');
  await page.reload();
  await expect(dashboardGreeting(page)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId('recovery-card')).toBeVisible();
  await expect(page.getByTestId('next-session-hero')).toContainText(
    noonOf(addDays(today, 4)).toLocaleDateString('pl-PL', { weekday: 'long' }), { ignoreCase: true },
  );
  expect((await runReminderAt(skipDate, tz)).pushedTokens).not.toContain(token);
  expect((await runReminderAt(addDays(today, 4), tz)).pushedTokens).toContain(token);
  expect(await readDoc(`training_plans/${user.uid}`)).toMatchObject({ days: planBefore.days });
});
