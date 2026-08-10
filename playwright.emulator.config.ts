import { defineConfig } from '@playwright/test';

// Suite e2e:emulator — krytyczne flows na realnym Auth + Firestore + Functions
// (emulatory). UserContext najpierw wykonuje produkcyjny kontrakt syncUserProfile,
// więc Functions musi działać; brak callable nie jest poprawnym fallbackiem profilu.
// Uruchamiane przez `npm run e2e:emulator` (firebase emulators:exec podnosi
// auth:9099, firestore:8081 i functions:5001, patrz firebase.json). Dev server na 8090,
// żeby nie kolidować z mockową suite ani z emulatorem.
export default defineConfig({
  testDir: './e2e/emulator',
  outputDir: './tmp/playwright-emulator-results',
  timeout: 45000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:8090/',
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
    url: 'http://localhost:8090/',
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      VITE_USE_EMULATORS: 'true',
    },
  },
});
