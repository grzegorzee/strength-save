import { expect, test } from '@playwright/test';
import { blockFirebase, navigateAndWait, setE2EAuthScenario } from './helpers';

test.describe('Handoff po utworzeniu planu', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');
    await page.addInitScript(() => {
      localStorage.removeItem('fittracker_post_plan_guide_v1_e2e-test-user');
    });
  });

  test('plan gotowy jest inline, a jedno CTA prowadzi do treningu albo planu', async ({ page }) => {
    await navigateAndWait(page, '/?welcome=1');

    const guide = page.getByTestId('post-plan-guide');
    await expect(guide).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Twój plan jest gotowy' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Najbliższy trening')).toBeVisible();
    await expect(page.getByText('Trzy miejsca, które warto znać')).toHaveCount(0);

    const primaryAction = guide.getByTestId('post-plan-primary-action');
    await expect(primaryAction).toHaveText(/Rozpocznij pierwszy trening|Zobacz plan/);
    await primaryAction.click();
    await expect(page).toHaveURL(/#\/(workout\/|plan$)/);
    await expect(guide).toHaveCount(0);
  });

  test('landscape zachowuje dostępne Później i jedno CTA', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await navigateAndWait(page, '/?guide=1');

    const guide = page.getByTestId('post-plan-guide');
    await expect(guide).toBeVisible();
    await expect(page.getByRole('button', { name: 'Później' })).toBeVisible();
    await expect(page.getByTestId('post-plan-primary-action')).toBeVisible();
    await expect(guide.getByRole('button')).toHaveCount(2);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
