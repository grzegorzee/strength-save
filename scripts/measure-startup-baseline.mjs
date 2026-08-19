import { chromium } from '@playwright/test';

const baseURL = process.argv[2] ?? 'http://127.0.0.1:4173/';
const samples = Number(process.argv[3] ?? 5);
const dashboard = (page) => page.locator('h1').filter({ hasText: /dashboard/i }).first();

const measureNavigation = async (page, navigate) => {
  const startedAt = performance.now();
  await navigate();
  await dashboard(page).waitFor({ state: 'visible' });
  return Math.round(performance.now() - startedAt);
};

const contextOptions = {
  viewport: { width: 390, height: 844 },
  locale: 'pl-PL',
  serviceWorkers: 'allow',
};

const browser = await chromium.launch();
const results = { environment: 'Playwright Chromium, mobile viewport 390x844', warm: [], cold: [], offline: [] };

const warmContext = await browser.newContext(contextOptions);
const warmPage = await warmContext.newPage();
await warmPage.goto(baseURL);
await dashboard(warmPage).waitFor({ state: 'visible' });
for (let index = 0; index < samples; index += 1) {
  results.warm.push(await measureNavigation(warmPage, () => warmPage.reload()));
}
await warmContext.close();

for (let index = 0; index < samples; index += 1) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  results.cold.push(await measureNavigation(page, () => page.goto(baseURL)));
  await context.close();
}

for (let index = 0; index < samples; index += 1) {
  const context = await browser.newContext(contextOptions);
  const seedPage = await context.newPage();
  await seedPage.goto(baseURL);
  await dashboard(seedPage).waitFor({ state: 'visible' });
  await seedPage.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await seedPage.reload();
  await dashboard(seedPage).waitFor({ state: 'visible' });
  await seedPage.close();
  await context.setOffline(true);
  const offlinePage = await context.newPage();
  results.offline.push(await measureNavigation(offlinePage, () => offlinePage.goto(baseURL)));
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
