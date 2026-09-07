import { expect, test } from '@playwright/test';
import { navigateAndWait, setE2EAuthScenario } from './helpers';

// iOS uses Keyboard.resize=none. This layout proxy keeps the layout viewport
// intact and applies the same inset as the native keyboard plugin.
for (const mode of ['login', 'register'] as const) {
  test(`iOS ${mode}: email fields and submit remain reachable above the keyboard`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await setE2EAuthScenario(page, 'unauthenticated');
    await navigateAndWait(page, `/${mode}`);
    await page.evaluate(() => {
      // Override only the layout platform check; no fake native auth/transport.
      const capacitor = (window as unknown as { Capacitor: { getPlatform: () => string; isNativePlatform: () => boolean } }).Capacitor;
      capacitor.getPlatform = () => 'ios';
      capacitor.isNativePlatform = () => true;
    });
    await page.getByRole('button', { name: 'Kontynuuj z emailem' }).click();
    const email = page.getByPlaceholder('Email', { exact: true }).first();
    await email.fill('keyboard-audit@example.test');
    const password = page.getByPlaceholder('Hasło', { exact: true });
    await password.fill('SyntheticPassword123!');
    if (mode === 'register') await page.getByPlaceholder('Powtórz hasło').fill('SyntheticPassword123!');

    await page.evaluate(() => document.documentElement.style.setProperty('--keyboard-inset', '350px'));
    const submit = page.getByRole('button', {
      name: mode === 'register' ? 'Załóż konto i wyślij kod' : 'Zaloguj przez email', exact: true,
    });
    await submit.scrollIntoViewIfNeeded();
    const bounds = await submit.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844 - 350 + 1);
    await expect(submit).toBeEnabled();

    // Closing the keyboard must preserve entered values and restore the layout.
    await page.evaluate(() => document.documentElement.style.setProperty('--keyboard-inset', '0px'));
    await expect(email).toHaveValue('keyboard-audit@example.test');
    await expect(password).toHaveValue('SyntheticPassword123!');
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport();
  });
}
