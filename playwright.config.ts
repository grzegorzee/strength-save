import { defineConfig } from '@playwright/test';

// Suite e2e:mock — szybkie testy UI bez backendu (VITE_E2E_MODE + blockFirebase).
// Testy emulatorowe (real auth/rules) żyją w e2e/emulator i mają własny config:
// playwright.emulator.config.ts (npm run e2e:emulator).

// Tray zaległości (Runna p.1, spec C2) otwierałby się nad Dashboardem w niemal
// każdym teście (mockowy plan ma zaplanowane dni w przeszłości bez sesji)
// i przez inert Radixa zasłaniał `main`. Seed pamięci odrzuceń pokrywa całe
// okno detekcji (14 dni + tygodnie) — test traya czyści ten klucz u siebie.
const lapseDismissedSeed = (() => {
  const keys: string[] = [];
  const today = new Date();
  for (let back = 0; back <= 21; back += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - back);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    keys.push(iso, `week:${iso}`);
  }
  return JSON.stringify(keys);
})();

export default defineConfig({
  testDir: './e2e',
  outputDir: './tmp/playwright-results',
  testIgnore: '**/emulator/**',
  timeout: 30000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:8080/',
    viewport: { width: 390, height: 844 },
    locale: 'pl-PL',
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
    storageState: {
      cookies: [],
      origins: [{
        origin: 'http://localhost:8080',
        localStorage: [
          { name: 'fittracker_lapse_dismissed_v1', value: lapseDismissedSeed },
          // WP-E (X37): tour pierwszego treningu pokazałby się w każdym specu
          // startującym sesję na 390 px (mock ma 0 ukończonych treningów) i jego
          // panele przechwytywałyby kliki. Seed "widziane"; first-workout-tour.spec
          // czyści klucz u siebie.
          { name: 'fittracker_first_workout_tour_v1', value: '1' },
        ],
      }],
    },
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
    url: 'http://localhost:8080/',
    reuseExistingServer: true,
    timeout: 30000,
    env: {
      VITE_E2E_MODE: 'true',
    },
  },
});
