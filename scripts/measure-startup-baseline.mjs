import { chromium } from '@playwright/test';

const baseURL = process.argv[2] ?? 'http://127.0.0.1:4173/';
const samples = Number(process.argv[3] ?? 5);
const dashboard = (page) => page.locator('h1').filter({ hasText: /dashboard/i }).first();

const measureNavigation = async (page, navigate) => {
  const startedAt = performance.now();
  await navigate();
  await dashboard(page).waitFor({ state: 'visible' });
  const elapsedMs = Math.round(performance.now() - startedAt);
  const report = await page.evaluate(() => {
    try {
      const raw = sessionStorage.getItem('strength-save:last-startup-report');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  return { elapsedMs, report };
};

const contextOptions = {
  viewport: { width: 390, height: 844 },
  locale: 'pl-PL',
  serviceWorkers: 'allow',
};

const browser = await chromium.launch();
const results = {
  environment: 'Playwright Chromium, mobile viewport 390x844; web/E2E simulation, not a physical phone',
  warm: [],
  cold: [],
  offline: [],
  weakNetwork: [],
};

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

for (let index = 0; index < samples; index += 1) {
  const context = await browser.newContext(contextOptions);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { effectiveType: '2g' },
    });
  });
  const page = await context.newPage();
  await page.route('**/*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });
  results.weakNetwork.push(await measureNavigation(page, () => page.goto(baseURL)));
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
