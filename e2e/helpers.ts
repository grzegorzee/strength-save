import { Page, expect } from '@playwright/test';

export const blockFirebase = async (page: Page) => {
  await page.route('**/firestore.googleapis.com/**', (route) => route.abort());
  await page.route('**/identitytoolkit.googleapis.com/**', (route) => route.abort());
  await page.route('**/securetoken.googleapis.com/**', (route) => route.abort());
  await page.route('**/googleapis.com/identitytoolkit/**', (route) => route.abort());
};

export const navigateAndWait = async (page: Page, path: string) => {
  await page.goto(`/#${path}`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
};

export const expectPageRendered = async (page: Page) => {
  const body = await page.locator('body').innerHTML();
  expect(body.length).toBeGreaterThan(100);
  const hasError = await page.locator('text=Something went wrong').count();
  const hasErrorPl = await page.locator('text=Coś poszło nie tak').count();
  expect(hasError + hasErrorPl).toBe(0);
};
