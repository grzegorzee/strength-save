import { existsSync } from 'node:fs';
import { webkit } from '@playwright/test';

const executablePath = webkit.executablePath();

if (!existsSync(executablePath)) {
  console.error(`Precondition failed: Playwright WebKit executable is missing: ${executablePath}`);
  console.error('Install the pinned browser with: npx playwright install webkit');
  process.exit(1);
}

console.log(`Playwright WebKit preflight passed: ${executablePath}`);
