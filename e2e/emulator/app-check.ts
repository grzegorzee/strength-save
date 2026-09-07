import type { Page } from '@playwright/test';

// The Functions emulator deliberately decodes emulator App Check tokens without
// validating signatures, but enforceAppCheck still requires a token. Keep this
// fixture confined to localhost Functions; never disable the product's guard.
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
export const EMULATOR_APP_CHECK_TOKEN = [
  encode({ alg: 'none', typ: 'JWT' }),
  encode({ sub: 'emulator-e2e-app', app_id: 'emulator-e2e-app', exp: 4_102_444_800 }),
  'emulator',
].join('.');

export async function installEmulatorAppCheck(page: Page): Promise<void> {
  await page.route('http://127.0.0.1:5001/**', async (route) => {
    await route.continue({ headers: { ...route.request().headers(), 'X-Firebase-AppCheck': EMULATOR_APP_CHECK_TOKEN } });
  });
}

// Dashboard greets by local time; the same main heading must work in every period.
export const dashboardGreeting = (page: Page) => page.getByRole('main').getByRole('heading', {
  level: 1,
  name: /^(?:Dzień dobry|Cześć|Dobry wieczór),/,
});
