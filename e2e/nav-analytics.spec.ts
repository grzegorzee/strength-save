import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, setE2EAuthScenario } from './helpers';

// Dolny pasek: Analytics zamiast History; Analytics domyślnie otwiera Weekly;
// History dostępne z menu bocznego.
test.describe('Bottom nav: Analytics replaces History', () => {
  test('mobile tab bar has Analytics, History only in side menu', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/');

    const mobileNav = page.getByRole('navigation', { name: 'Nawigacja mobilna' });
    await expect(mobileNav.getByRole('link', { name: /Analityka/i })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: /Historia/i })).toHaveCount(0);

    // History osiągalne z menu bocznego (hamburger, aria 'Nawigacja główna')
    await page.getByRole('button', { name: 'Nawigacja główna' }).click();
    await expect(page.getByRole('link', { name: 'Historia' }).first()).toBeVisible();
  });

  test('analytics opens on Weekly tab by default', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/analytics');

    await expect(page.getByRole('tab', { name: 'Tygodnie' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Podsumowania tygodniowe')).toBeVisible();

    // Jawny parametr nadal działa
    await navigateAndWait(page, '/analytics?tab=charts');
    await expect(page.getByRole('tab', { name: 'Wykresy' })).toHaveAttribute('aria-selected', 'true');
  });
});
