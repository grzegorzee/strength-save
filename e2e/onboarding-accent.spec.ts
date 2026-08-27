// Plan I (2026-08-20): wybór koloru aplikacji w kroku Welcome onboardingu.
// Warunki właściciela: bez osobnego kroku, tylko paleta, LIVE PREVIEW od
// kliknięcia. Niezmiennik (zasada #5): bieg bez dotknięcia kolorów = limonka
// i onboarding działa jak dotąd.
import { test, expect } from '@playwright/test';
import { advanceWizardToStep6, blockFirebase, expectPageRendered, navigateAndWait, setE2EAuthScenario } from './helpers';

// UWAGA: ekran onboardingu (PlanWizard) nie renderuje <main> — helper
// expectPageRendered tu nie działa (wzorzec jak test onboardingu w full-app:
// asercje na realne elementy ekranu). expectPageRendered tylko na Dashboardzie.

const primaryVar = (page: import('@playwright/test').Page) => page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--primary').trim());

test.describe('Onboarding: kolor aplikacji na Welcome (plan I)', () => {
  test.beforeEach(async ({ page }) => {
    await blockFirebase(page);
    await page.addInitScript(() => localStorage.setItem('app-language', 'pl'));
    await setE2EAuthScenario(page, 'new-user');
  });

  test('kropki przy pytaniu o imię: klik indigo przebarwia ekran NATYCHMIAST i kolor trzyma się przez kroki wizarda', async ({ page }) => {
    await navigateAndWait(page, '/');

    // Rząd kropek pod polem imienia (bez osobnego kroku, bez custom hex).
    await expect(page.getByTestId('ob-name-input')).toBeVisible();
    await expect(page.getByTestId('ob-accent-swatches')).toBeVisible();
    await expect(page.getByTestId('ob-accent-lime')).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('ob-accent-swatches').getByRole('radio')).toHaveCount(11);

    // LIVE PREVIEW: klik = natychmiastowa zmiana tokenów + localStorage.
    await page.getByTestId('ob-accent-indigo').click();
    expect(await primaryVar(page)).toBe('235 86% 65%');
    expect(await page.evaluate(() => localStorage.getItem('ss-accent-color'))).toBe('indigo');

    // Kolor trzyma się przez kolejne kroki wizarda aż do podglądu planu.
    await page.getByTestId('consent-terms').click();
    await page.getByTestId('consent-privacy').click();
    await page.getByTestId('consent-health').click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    // X34: 5A (wybór) -> 6/6 (Start planu) -> "Podgląd planu".
    await advanceWizardToStep6(page);
    expect(await primaryVar(page)).toBe('235 86% 65%');
    await page.getByTestId('ob-start-preview').click();
    await expect(page.getByRole('heading', { name: 'Podgląd planu' })).toBeVisible();
    expect(await primaryVar(page)).toBe('235 86% 65%');
  });

  test('NIEZMIENNIK: bieg bez dotknięcia kolorów = limonka, Welcome działa jak dotąd', async ({ page }) => {
    await navigateAndWait(page, '/');
    await expect(page.getByTestId('ob-name-input')).toBeVisible();
    expect(await primaryVar(page)).toBe('73 97% 56%');
    expect(await page.evaluate(() => localStorage.getItem('ss-accent-color'))).toBeNull();

    await page.getByTestId('consent-terms').click();
    await page.getByTestId('consent-privacy').click();
    await page.getByTestId('consent-health').click();
    await page.getByRole('button', { name: 'Dalej', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Następny krok' })).toBeVisible();
    expect(await primaryVar(page)).toBe('73 97% 56%');
  });
});

test.describe('Po onboardingu: Dashboard w wybranym kolorze (plan I)', () => {
  test('stan po dokończeniu onboardingu z indigo: Dashboard przebarwiony od splashu', async ({ page }) => {
    // Onboarding zostawia ss-accent-color w localStorage (+ mirror w profilu);
    // scenariusz active-user symuluje konto tuż po dokończeniu onboardingu.
    await blockFirebase(page);
    await page.addInitScript(() => {
      localStorage.setItem('app-language', 'pl');
      localStorage.setItem('ss-accent-color', 'indigo');
    });
    await setE2EAuthScenario(page, 'active-user');
    await navigateAndWait(page, '/');
    await expectPageRendered(page);
    expect(await primaryVar(page)).toBe('235 86% 65%');
    // Ciemny akcent = jasny tekst na CTA (kontrast per luminancja).
    expect(await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--primary-foreground').trim(),
    )).toBe('0 0% 100%');
  });
});
