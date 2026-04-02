import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:8080/strength-save/',
    viewport: { width: 390, height: 844 },
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
    command: 'npm run dev',
    url: 'http://localhost:8080/strength-save/',
    reuseExistingServer: true,
    timeout: 30000,
    env: {
      VITE_E2E_MODE: 'true',
    },
  },
});
