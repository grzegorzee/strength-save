import { test, expect } from '@playwright/test';
import { blockFirebase, navigateAndWait, expectPageRendered } from './helpers';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

// OTA dotyczy wyłącznie natywnej apki: web nie ładuje pluginu, nie pyta o manifest
// i pokazuje samą wersję (bez buildu natywnego i numeru aktualizacji).
test.describe('Live updates: web bez zmian', () => {
  test('web nie ładuje pluginu OTA ani manifestów; Profil pokazuje samą wersję', async ({ page }) => {
    const otaRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      // Plugin natywny albo manifest/pakiet z bucketu (klucz publiczny w bundlu to nie żądanie OTA).
      if (/capacitor-live-update|live-updates%2F|\/live-updates\/(internal|production|bundles)\//.test(url)) otaRequests.push(url);
    });
    await blockFirebase(page);
    await navigateAndWait(page, '/profile');
    await expectPageRendered(page);
    await expect(page.getByText(`Strength Save ${version}`, { exact: true })).toBeVisible();
    await expect(page.getByText(/aktualizacja \d|update \d/i)).toHaveCount(0);
    expect(otaRequests).toEqual([]);
  });
});
