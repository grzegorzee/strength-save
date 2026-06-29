import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, setE2EAuthScenario } from './helpers';

// Dolny pasek (mobile): Analytics zamiast History; Analytics domyślnie otwiera Weekly.
// Od build 46 (938aadb) nie ma już mobilnego hamburgera/drawera — na mobile nawigacja
// to wyłącznie dolny pasek (5 pozycji), Historia jest dostępna w sidebarze tylko na desktopie.
test.describe('Bottom nav: Analytics replaces History', () => {
  test('mobile tab bar has Analytics, not History', async ({ page }) => {
    await blockFirebase(page);
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/');

    const mobileNav = page.getByRole('navigation', { name: 'Nawigacja mobilna' });
    await expect(mobileNav.getByRole('link', { name: /Analityka/i })).toBeVisible();
    await expect(mobileNav.getByRole('link', { name: /Historia/i })).toHaveCount(0);
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
