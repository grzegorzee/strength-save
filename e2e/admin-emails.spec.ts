import { expect, test } from '@playwright/test';
import { blockFirebase, expectPageRendered, navigateAndWait, setE2EAuthScenario } from './helpers';

// G-T4: sekcja Maile w panelu admina. Niezmiennik: nowa sekcja nie łamie
// istniejących sekcji panelu. Przy zablokowanym Firestore SDK zwraca pusty
// snapshot z cache — sekcja pokazuje kafle z zerami i pusty stan (stan błędu
// z przyciskiem retry pokrywa deterministycznie test RTL admin-emails-card).

test('sekcja Maile renderuje pusty stan, stare sekcje panelu nietknięte', async ({ page }) => {
  await setE2EAuthScenario(page, 'active-admin');
  await blockFirebase(page);
  await navigateAndWait(page, '/admin');
  await expectPageRendered(page);

  // Niezmiennik: stare sekcje panelu nadal stoją.
  await expect(page.locator('span.text-fitness-warning', { hasText: 'Panel admina' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Wróć do aplikacji' })).toBeVisible();

  // Nowa sekcja Maile: nagłówek, kafle zbiorcze 7/30 dni, pusty stan.
  await expect(page.getByRole('heading', { name: 'Maile' })).toBeVisible();
  await expect(page.getByText('Ostatnie 7 dni')).toBeVisible();
  await expect(page.getByText('Ostatnie 30 dni')).toBeVisible();
  await expect(page.getByText('Brak wysyłek')).toBeVisible();
});
