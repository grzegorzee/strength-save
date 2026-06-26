import { defineConfig } from '@playwright/test';

// Suite e2e:emulator — krytyczne flows na realnym Auth + Firestore (emulatory).
// Uruchamiane przez `npm run e2e:emulator` (firebase emulators:exec podnosi
// auth:9099 i firestore:8081, patrz firebase.json). Dev server na 8090,
// żeby nie kolidować z mockową suite ani z emulatorem.
export default defineConfig({
  testDir: './e2e/emulator',
  outputDir: './tmp/playwright-emulator-results',
  timeout: 45000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:8090/strength-save/',
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
  ],
  webServer: {
    command: 'npm run dev -- --port 8090 --strictPort',
    url: 'http://localhost:8090/strength-save/',
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      VITE_USE_EMULATORS: 'true',
    },
  },
});
