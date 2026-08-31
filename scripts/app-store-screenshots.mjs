#!/usr/bin/env node
// English App Store screenshot harness for Strength Save 1.0.
//
// The harness is intentionally isolated from Firebase and uses the same local
// E2E seams as the release test suite. It never reads or mutates a real user's
// workouts. The fictional profile and realistic training history keep PII out
// of store and marketing assets while exercising production UI components.
//
// Output: release/app-store/screenshots/en-US/6.9-inch/*.png (1320x2868 px)
// Usage:  node scripts/app-store-screenshots.mjs

// Apple accepts 1320x2868 portrait screenshots for the iPhone 6.9" display:
// https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/


import { spawn } from 'node:child_process';
import { mkdirSync, openSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'release/app-store/screenshots/en-US/6.9-inch');
const PORT = Number(process.env.SS_SCREENSHOT_PORT || 4179);
const BASE_URL = `http://127.0.0.1:${PORT}/`;
const VIEWPORT = { width: 440, height: 956 };
const DEVICE_SCALE_FACTOR = 3;
const EXPECTED_PIXELS = { width: 1320, height: 2868 };

mkdirSync(OUTPUT_DIR, { recursive: true });

const localISO = (date) => {
  const copy = new Date(date);
  return `${copy.getFullYear()}-${String(copy.getMonth() + 1).padStart(2, '0')}-${String(copy.getDate()).padStart(2, '0')}`;
};

const daysAgo = (count) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - count);
  return localISO(date);
};

const mondayOfWeek = (weeksAgo = 0) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  const sinceMonday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - sinceMonday - weeksAgo * 7);
  return date;
};

const dateFromMonday = (weeksAgo, dayOffset) => {
  const date = mondayOfWeek(weeksAgo);
  date.setDate(date.getDate() + dayOffset);
  return localISO(date);
};

const set = (reps, weight) => ({ reps, weight, completed: true });
const exercise = (exerciseId, name, weight, reps = 8) => ({
  exerciseId,
  name,
  sets: [set(reps, weight), set(reps, weight), set(reps, weight)],
});

const dayDefinitions = [
  {
    dayId: 'day-1',
    dayName: 'Poniedziałek',
    dayFocus: 'Chest / Squat / Mid Back',
    offset: 0,
    exercises: [
      ['ex-1-1', 'Wyciskanie hantli (Lekki skos)', 34, 8],
      ['ex-1-2', 'Przysiad ze sztangą (High Bar)', 102.5, 6],
      ['ex-1-3', 'Wiosłowanie hantlami na ławce (przodem)', 32, 10],
    ],
  },
  {
    dayId: 'day-2',
    dayName: 'Środa',
    dayFocus: 'Wide Back / Hamstrings / Flat Chest',
    offset: 2,
    exercises: [
      ['ex-2-1', 'Wyciskanie sztangi na ławce płaskiej', 82.5, 6],
      ['ex-2-2', 'Martwy Ciąg Rumuński (RDL)', 95, 8],
      ['ex-2-3', 'Ściąganie drążka (Szeroki nachwyt)', 65, 10],
    ],
  },
  {
    dayId: 'day-3',
    dayName: 'Piątek',
    dayFocus: 'Shoulders / Unilateral / Accessories',
    offset: 4,
    exercises: [
      ['ex-3-1', 'Wyciskanie hantli nad głowę (Siedząc)', 26, 8],
      ['ex-3-2', 'Wiosłowanie hantlem jednorącz (Laty)', 36, 10],
      ['ex-3-3', 'Hip Thrust (Wypychanie bioder)', 120, 8],
    ],
  },
];

// Six completed weeks give every history/progress screen meaningful data while
// leaving the current Monday workout ready to start on the Today screen.
const workouts = dayDefinitions.flatMap((day, dayIndex) => (
  Array.from({ length: 6 }, (_, index) => {
    const weeksAgo = index + 1;
    const progression = (5 - index) * 1.25;
    return {
      id: `store-${day.dayId}-w${weeksAgo}`,
      userId: 'e2e-test-user',
      dayId: day.dayId,
      dayName: day.dayName,
      dayFocus: day.dayFocus,
      date: dateFromMonday(weeksAgo, day.offset),
      completed: true,
      durationSec: 3120 + dayIndex * 240 + index * 45,
      cycleId: 'store-cycle-active',
      exercises: day.exercises.map(([id, name, baseWeight, reps]) => (
        exercise(id, name, Math.round((baseWeight - 6.25 + progression) * 4) / 4, reps)
      )),
    };
  })
));

const planDays = [
  {
    id: 'day-1', dayName: 'Poniedziałek', weekday: 'monday',
    focus: 'Chest / Squat / Mid Back',
    exercises: [
      { id: 'ex-1-1', name: 'Wyciskanie hantli (Lekki skos)', sets: '3 x 6-8', instructions: [] },
      { id: 'ex-1-2', name: 'Przysiad ze sztangą (High Bar)', sets: '3 x 6-8', instructions: [] },
      { id: 'ex-1-3', name: 'Wiosłowanie hantlami na ławce (przodem)', sets: '3 x 8-10', instructions: [] },
      { id: 'ex-1-4', name: 'Uginanie nóg na maszynie (Siedząc)', sets: '3 x 10-12', instructions: [] },
    ],
  },
  {
    id: 'day-2', dayName: 'Środa', weekday: 'wednesday',
    focus: 'Wide Back / Hamstrings / Flat Chest',
    exercises: [
      { id: 'ex-2-1', name: 'Wyciskanie sztangi na ławce płaskiej', sets: '3 x 6-8', instructions: [] },
      { id: 'ex-2-2', name: 'Martwy Ciąg Rumuński (RDL)', sets: '3 x 8-10', instructions: [] },
      { id: 'ex-2-3', name: 'Ściąganie drążka (Szeroki nachwyt)', sets: '3 x 8-12', instructions: [] },
      { id: 'ex-2-4', name: 'Wykroki chodzone', sets: '3 x 10', instructions: [] },
    ],
  },
  {
    id: 'day-3', dayName: 'Piątek', weekday: 'friday',
    focus: 'Shoulders / Unilateral / Accessories',
    exercises: [
      { id: 'ex-3-1', name: 'Wyciskanie hantli nad głowę (Siedząc)', sets: '3 x 6-8', instructions: [] },
      { id: 'ex-3-2', name: 'Wiosłowanie hantlem jednorącz (Laty)', sets: '3 x 8-10', instructions: [] },
      { id: 'ex-3-3', name: 'Hip Thrust (Wypychanie bioder)', sets: '3 x 8-10', instructions: [] },
      { id: 'ex-3-4', name: 'Wyprosty nóg na maszynie', sets: '3 x 10-12', instructions: [] },
    ],
  },
];

const planStart = dateFromMonday(8, 0);
const plan = {
  name: 'Strength & Hypertrophy',
  days: planDays,
  startDate: planStart,
  durationWeeks: 12,
  progression: { enabled: true, deloadEveryWeeks: 5 },
};

const cycles = [{
  id: 'store-cycle-active',
  userId: 'e2e-test-user',
  name: 'Strength & Hypertrophy',
  days: planDays,
  durationWeeks: 12,
  startDate: planStart,
  status: 'active',
  createdAt: new Date(mondayOfWeek(8)).toISOString(),
  stats: { totalWorkouts: workouts.length, totalTonnage: 0, prs: [], completionRate: 100 },
}];

const dismissedDates = Array.from({ length: 60 }, (_, count) => {
  const iso = daysAgo(count);
  return [iso, `week:${iso}`];
}).flat();

const authState = {
  scenario: 'active-user',
  email: 'athlete@strengthsave.app',
  displayName: 'Alex Morgan',
  subscription: { tier: 'yearly', status: 'active', expiresAt: '2027-12-31T00:00:00.000Z' },
  hasWorkouts: true,
  trainingProfile: { level: 'intermediate', objective: 'build_muscle', daysPerWeek: 3 },
};

const screens = [
  {
    order: 1,
    id: 'today',
    route: '/',
    waitFor: '[data-testid="dash-hero"]',
    headline: 'Your training day at a glance',
    caption: 'See the next session, weekly rhythm and quick actions in one place.',
  },
  {
    order: 2,
    id: 'plan',
    route: '/plan',
    waitFor: '[data-testid="plan-manage-trigger"]',
    headline: 'Follow a plan that stays flexible',
    caption: 'Track the current week, move sessions and adapt the plan without losing history.',
  },
  {
    order: 3,
    id: 'workout',
    route: '/workout/day-1?autostart=true',
    waitFor: '[data-testid="finish-workout"]',
    headline: 'Log every set with less friction',
    caption: 'Weights, reps, set types, rest timers and exercise guidance stay together.',
  },
  {
    order: 4,
    id: 'history',
    route: '/history',
    waitFor: '[data-testid="history-latest"]',
    headline: 'A complete workout history',
    caption: 'Review sessions, compare periods and export your training data.',
  },
  {
    order: 5,
    id: 'results',
    route: '/achievements?period=week&offset=-1',
    waitFor: '[data-testid="analytics-summary-scoreboard"]',
    headline: 'Understand each training week',
    caption: 'Completion, tonnage, streaks and personal records make progress easy to read.',
  },
  {
    order: 6,
    id: 'charts',
    route: '/achievements?view=analytics&tab=charts',
    waitFor: '[data-testid="monthly-overview-card"]',
    headline: 'See the trend, not just the number',
    caption: 'Explore monthly load, exercise progression, consistency and body metrics.',
  },
  {
    order: 7,
    id: 'records',
    route: '/achievements?view=records',
    waitFor: '[data-testid="records-scoreboard"]',
    headline: 'Keep every personal record',
    caption: 'See lifetime volume and estimated 1RM records for every exercise.',
  },
  {
    order: 8,
    id: 'badges',
    route: '/achievements?view=records&section=badges',
    waitFor: '[data-testid="progress-view-badges"]',
    headline: 'Celebrate consistency',
    caption: 'Milestones reward workouts, tonnage, streaks and personal bests.',
  },
  {
    order: 9,
    id: 'exercises',
    route: '/exercises',
    waitFor: '[data-testid="exercise-search"]',
    headline: 'Build from a rich exercise library',
    caption: 'Search by muscle group and open clear technique guidance and animations.',
  },
  {
    order: 10,
    id: 'devices',
    route: '/profile',
    waitFor: '[data-testid="profile-section-devices"]',
    headline: 'Train across your devices',
    caption: 'Manage Apple Watch and Garmin access from one profile.',
    prepare: async (page) => {
      const toggle = page.getByTestId('profile-toggle-devices');
      await toggle.scrollIntoViewIfNeeded();
      await toggle.click();
      await page.getByTestId('profile-subsection-devices').waitFor({ state: 'visible' });
      await page.getByTestId('device-settings').waitFor({ state: 'visible' });
      await page.evaluate(() => {
        // The section is close to the end of Profile. Extra off-screen space lets
        // the real card align below the fixed header instead of being trapped at
        // the browser's maximum scroll position; it does not alter card content.
        document.querySelector('main')?.style.setProperty('padding-bottom', '900px');
        const card = document.querySelector('[data-testid="device-settings"]');
        if (!card) return;
        const top = card.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, top - 82), behavior: 'instant' });
      });
    },
  },
];

const startServer = async () => {
  const logPath = join(ROOT, 'build', 'app-store-screenshots-vite.log');
  mkdirSync(dirname(logPath), { recursive: true });
  const logFd = openSync(logPath, 'a');
  const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    env: { ...process.env, VITE_E2E_MODE: 'true' },
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return server;
    } catch { /* server is still starting */ }
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
  }
  throw new Error(`Vite did not start on ${BASE_URL} in 90 seconds. See ${logPath}`);
};

const stopServer = (server) => {
  if (!server?.pid) return;
  try { process.kill(-server.pid, 'SIGTERM'); } catch { /* already stopped */ }
};

const seedContext = async (context) => {
  await context.addInitScript((seed) => {
    localStorage.setItem('app-language', 'en');
    localStorage.setItem('ss-theme-owner-v1', 'e2e-test-user');
    localStorage.setItem('ss-accent-color', 'lime');
    localStorage.setItem('fittracker_e2e_auth_state', JSON.stringify(seed.authState));
    localStorage.setItem('fittracker_e2e_plan', JSON.stringify(seed.plan));
    localStorage.setItem('fittracker_e2e_workouts', JSON.stringify(seed.workouts));
    localStorage.setItem('fittracker_e2e_cycles', JSON.stringify(seed.cycles));
    localStorage.setItem('fittracker_lapse_dismissed_v1', JSON.stringify(seed.dismissedDates));
    localStorage.setItem('fittracker_first_workout_tour_v1', '1');
    localStorage.setItem('fittracker_nextstep_dismissed', '1');
  }, { authState, plan, workouts, cycles, dismissedDates });

  for (const pattern of [
    '**/firestore.googleapis.com/**',
    '**/identitytoolkit.googleapis.com/**',
    '**/securetoken.googleapis.com/**',
    '**/googleapis.com/identitytoolkit/**',
  ]) {
    await context.route(pattern, (route) => route.abort());
  }
};

const capture = async (browser, screen) => {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    locale: 'en-US',
    colorScheme: 'dark',
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'reduce',
  });
  await seedContext(context);
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const value = message.text();
    if (value === 'Failed to load resource: net::ERR_FAILED') return;
    if (value.includes('@firebase/firestore:') && value.includes('Could not reach Cloud Firestore backend')) return;
    runtimeErrors.push(value);
  });

  try {
    await page.goto(`${BASE_URL}#${screen.route}`, { waitUntil: 'domcontentloaded' });
    await page.locator('#root > *').first().waitFor({ state: 'attached', timeout: 20_000 });
    await page.locator(screen.waitFor).first().waitFor({ state: 'visible', timeout: 20_000 });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(700);
    if (screen.prepare) {
      await screen.prepare(page);
      await page.waitForTimeout(400);
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) throw new Error(`${screen.id}: horizontal overflow ${overflow}px`);
    if (runtimeErrors.length > 0) throw new Error(`${screen.id}: runtime errors: ${runtimeErrors.join(' | ')}`);

    const path = join(OUTPUT_DIR, `${String(screen.order).padStart(2, '0')}-${screen.id}.png`);
    await page.screenshot({ path, fullPage: false, animations: 'disabled' });
    console.log(`[store] ${screen.id} -> ${path}`);
  } finally {
    await context.close();
  }
};

const run = async () => {
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    for (const screen of screens) await capture(browser, screen);
  } finally {
    await browser.close();
    stopServer(server);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    locale: 'en-US',
    deviceClass: 'iPhone 6.9-inch display',
    width: EXPECTED_PIXELS.width,
    height: EXPECTED_PIXELS.height,
    format: 'PNG, opaque',
    source: 'deterministic fictional E2E profile; Firebase blocked; no real user data',
    appleSpecification: 'https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/',
    screens: screens.map(({ order, id, headline, caption }) => ({
      order,
      id,
      file: `${String(order).padStart(2, '0')}-${id}.png`,
      headline,
      caption,
    })),
  };
  writeFileSync(join(OUTPUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`[store] Complete: ${OUTPUT_DIR}`);
};

process.on('SIGINT', () => process.exit(130));
run().catch((error) => {
  console.error(`[store] ${error.stack || error.message}`);
  process.exit(1);
});
