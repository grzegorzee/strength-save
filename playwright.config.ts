import { defineConfig } from '@playwright/test';

// Suite e2e:mock — szybkie testy UI bez backendu (VITE_E2E_MODE + blockFirebase).
// Testy emulatorowe (real auth/rules) żyją w e2e/emulator i mają własny config:
// playwright.emulator.config.ts (npm run e2e:emulator).
export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/emulator/**',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:8080/strength-save/',
    viewport: { width: 390, height: 844 },
    locale: 'pl-PL',
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080/strength-save/',
    reuseExistingServer: true,
    timeout: 30000,
    env: {
      VITE_E2E_MODE: 'true',
    },
  },
});
