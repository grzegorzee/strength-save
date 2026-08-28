// M19 / A-T5: kontrakt OFFLINE dokładnego produkcyjnego dist.
// Online seed używa wyłącznie lokalnych emulatorów Auth+Firestore. Potem cała
// sieć kontekstu jest odcinana: cold reload musi odzyskać auth/profil/plan,
// pokazać konkretne CTA Dashboardu, otworzyć nieogrzany lazy chunk i zapisać
// serię do draftu. Żadne dane nie trafiają na realne konto.
import { createServer } from 'node:http';
import { createConnection } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';

const distDir = join(process.cwd(), 'dist');
const PROJECT_ID = 'fittracker-workouts';
const AUTH_PORT = 9099;
const FIRESTORE_PORT = 8081;
const BASE = '/';
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

const canConnect = (port) => new Promise((resolve) => {
  const socket = createConnection({ host: '127.0.0.1', port });
  const done = (result) => {
    socket.destroy();
    resolve(result);
  };
  socket.setTimeout(300);
  socket.once('connect', () => done(true));
  socket.once('timeout', () => done(false));
  socket.once('error', () => done(false));
});

const waitForEmulators = async (child, logs) => {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Firebase emulators exited (${child.exitCode}):\n${logs.join('').slice(-4000)}`);
    }
    if (await canConnect(AUTH_PORT) && await canConnect(FIRESTORE_PORT)) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Firebase emulators did not become ready:\n${logs.join('').slice(-4000)}`);
};

const startEmulators = async () => {
  if (await canConnect(AUTH_PORT) && await canConnect(FIRESTORE_PORT)) {
    return { child: null, owned: false };
  }
  const javaHomes = [
    process.env.JAVA_HOME,
    '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
    '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  ].filter(Boolean);
  const javaHome = javaHomes.find((candidate) => existsSync(join(candidate, 'bin', 'java')));
  const child = spawn('firebase', [
    'emulators:start', '--only', 'auth,firestore', '--project', PROJECT_ID,
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...(javaHome && { JAVA_HOME: javaHome, PATH: `${join(javaHome, 'bin')}:${process.env.PATH ?? ''}` }),
      FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const logs = [];
  child.on('error', (error) => logs.push(String(error)));
  child.stdout.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr.on('data', (chunk) => logs.push(String(chunk)));
  await waitForEmulators(child, logs);
  return { child, owned: true };
};

const stopEmulators = async ({ child, owned }) => {
  if (!owned || !child || child.exitCode !== null) return;
  child.kill('SIGTERM');
  await Promise.race([
    once(child, 'exit'),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
};

const toFirestoreValue = (value) => {
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (value !== null && typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toFirestoreValue(item)])),
      },
    };
  }
  throw new Error(`Unsupported Firestore seed value: ${String(value)}`);
};

const seedDoc = async (path, data) => {
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, toFirestoreValue(value)]));
  const response = await fetch(
    `http://127.0.0.1:${FIRESTORE_PORT}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok) throw new Error(`Firestore seed failed (${path}): ${response.status} ${await response.text()}`);
};

const createAuthUser = async (email, password) => {
  const response = await fetch(
    `http://127.0.0.1:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  if (!response.ok) throw new Error(`Auth seed failed: ${response.status} ${await response.text()}`);
  const payload = await response.json();
  return payload.localId;
};

const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const localDate = (date = new Date()) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
);

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relative = urlPath.startsWith(BASE) ? urlPath.slice(BASE.length) : urlPath.replace(/^\//, '');
  const safePath = normalize(relative).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(distDir, safePath === '' ? 'index.html' : safePath);
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime[extname(filePath)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    const body = await readFile(join(distDir, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(body);
  }
});

let emulatorHandle = null;
let browser = null;
let context = null;
let activePage = null;
const pageErrors = [];
const result = {
  onlineDashboard: false,
  swActive: false,
  cachedDashboardOffline: false,
  dashboardCtaOffline: false,
  coldLazyRouteOffline: false,
  draftSavedOffline: false,
};

try {
  emulatorHandle = await startEmulators();
  const email = `offline-smoke-${Date.now()}@e2e.test`;
  const password = 'offline-smoke-password-123';
  const uid = await createAuthUser(email, password);
  const today = localDate();
  const dayId = 'offline-smoke-day';
  const exerciseId = 'offline-smoke-exercise';
  const days = [{
    id: dayId,
    dayName: 'Offline smoke',
    weekday: weekday[new Date().getDay()],
    focus: 'Full body',
    exercises: [{ id: exerciseId, name: 'Przysiad', sets: '3 x 5', instructions: [] }],
  }];
  await seedDoc(`users/${uid}`, {
    uid,
    email,
    displayName: 'Offline Smoke',
    role: 'admin',
    status: 'active',
    onboardingCompleted: true,
    access: { enabled: true },
    registration: { source: 'email' },
    notifications: { welcomeSentAt: new Date().toISOString() },
    consents: {
      termsVersion: '2.0',
      privacyVersion: '2.1',
      healthGranted: true,
      healthVersion: '1.0',
      marketingGranted: false,
      marketingVersion: '1.0',
    },
  });
  await seedDoc(`training_plans/${uid}`, {
    days,
    durationWeeks: 12,
    startDate: today,
    updatedAt: new Date().toISOString(),
  });
  await seedDoc(`plan_cycles/offline-smoke-cycle-${uid}`, {
    userId: uid,
    days,
    durationWeeks: 12,
    startDate: today,
    status: 'active',
    createdAt: new Date().toISOString(),
    stats: { totalWorkouts: 0, totalTonnage: 0, prs: [], completionRate: 0 },
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}/`;
  const emulatorUrl = `${origin}?firebaseEmulator=1`;

  browser = await chromium.launch();
  context = await browser.newContext();
  const page = await context.newPage();
  activePage = page;
  page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
  await page.goto(`${emulatorUrl}#/login`, { waitUntil: 'load', timeout: 30_000 });
  // Redesign logowania (2026-08-20): social-first, email za przyciskiem
  // "Kontynuuj z emailem" zamiast zakładek.
  await page.getByRole('button', { name: /Kontynuuj z emailem|Continue with email/i }).click();
  // Na stronie są dwa pola "Email" (logowanie + waitlista) — bierzemy pierwsze.
  await page.getByPlaceholder('Email').first().fill(email);
  await page.getByPlaceholder(/^(Hasło|Password)$/i).first().fill(password);
  await page.getByRole('button', { name: /Zaloguj przez email|Sign in with email/i }).click();
  await page.getByRole('heading', { name: /Dzisiaj|Today/ }).waitFor({ timeout: 20_000 });
  await page.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).waitFor({ timeout: 15_000 });
  result.onlineDashboard = true;

  result.swActive = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    return Promise.race([
      navigator.serviceWorker.ready.then((registration) => registration.active !== null),
      new Promise((resolve) => setTimeout(() => resolve(false), 15_000)),
    ]);
  });
  await page.waitForTimeout(2_000);

  await context.setOffline(true);
  const offlinePage = await context.newPage();
  activePage = offlinePage;
  offlinePage.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
  await offlinePage.goto(`${emulatorUrl}#/`, { waitUntil: 'load', timeout: 30_000 });
  await offlinePage.getByRole('heading', { name: /Dzisiaj|Today/ }).waitFor({ timeout: 20_000 });
  result.cachedDashboardOffline = true;
  await offlinePage.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).waitFor({ timeout: 10_000 });
  result.dashboardCtaOffline = true;

  // Analytics nie było odwiedzone online — jego lazy chunk musi przyjść z precache.
  // D-T4: /analytics przekierowuje na scalony ekran Postępy (?view=analytics),
  // gdzie AnalyticsEmbedded lazy-loaduje ten sam chunk.
  await offlinePage.goto(`${emulatorUrl}#/analytics`, { waitUntil: 'commit', timeout: 10_000 });
  // Tytuł rootu należy do wspólnego AppHeader poza <main>. Dowodem gotowego
  // ekranu jest widoczne main oraz kontrolka z lazy-loaded AnalyticsEmbedded.
  await offlinePage.getByRole('main').waitFor({ timeout: 15_000 });
  // Zakładka z wnętrza Analytics = dowód, że lazy chunk realnie się załadował.
  await offlinePage.getByRole('tab', { name: /Podsumowanie|Summary/i }).waitFor({ timeout: 15_000 });
  result.coldLazyRouteOffline = true;

  await offlinePage.goto(`${emulatorUrl}#/workout/${dayId}?date=${today}`, { waitUntil: 'commit', timeout: 10_000 });
  await offlinePage.getByRole('button', { name: /Rozpocznij trening|Start workout/i }).click();
  // C-T2: świeży start pokazuje sheet rozgrzewki — bramka pomija (kontrakt startu).
  const preStartSkip = offlinePage.getByTestId('prestart-skip');
  await preStartSkip.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  if (await preStartSkip.isVisible().catch(() => false)) await preStartSkip.click();
  // X38 celowo wycisza toast dla provisional/offline. Przycisk zakończenia jest
  // stabilnym i dostępnym dowodem, że sesja naprawdę przeszła do stanu aktywnego.
  await offlinePage.getByRole('button', { name: /Zakończ trening|Finish workout/i }).waitFor({ timeout: 15_000 });
  const firstCard = offlinePage.locator('.exercise-card').first();
  const setInputs = firstCard.locator('input');
  await setInputs.nth(0).fill('20');
  await setInputs.nth(1).fill('5');
  await firstCard.getByRole('button', { name: /Zaznacz serię jako zrobioną|Mark set as done/i }).first().click();

  result.draftSavedOffline = await offlinePage.evaluate(async ({ expectedUid, expectedExerciseId }) => {
    const records = await new Promise((resolve, reject) => {
      const request = indexedDB.open('strength-save-db', 2);
      request.onsuccess = () => {
        const tx = request.result.transaction('workoutDrafts', 'readonly');
        const getAll = tx.objectStore('workoutDrafts').getAll();
        getAll.onsuccess = () => resolve(getAll.result);
        getAll.onerror = () => reject(getAll.error);
      };
      request.onerror = () => reject(request.error);
    });
    return records.some((draft) => (
      draft.userId === expectedUid
      && draft.exerciseSets?.[expectedExerciseId]?.some((set) => set.completed)
    ));
  }, { expectedUid: uid, expectedExerciseId: exerciseId });
} catch (error) {
  pageErrors.push(error instanceof Error ? (error.stack || error.message) : String(error));
  if (activePage) {
    pageErrors.push(`diagnostic url=${activePage.url()} body=${(await activePage.locator('body').innerText().catch(() => '')).slice(0, 1200)}`);
  }
} finally {
  if (browser) await browser.close();
  if (server.listening) {
    // Service worker potrafi zostawić otwarte połączenie keep-alive mimo
    // zamknięcia browsera. Sam server.close() czeka wtedy bez końca.
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
  if (emulatorHandle) await stopEmulators(emulatorHandle);
}

const fatalErrors = pageErrors.filter((error) => (
  !/ERR_INTERNET_DISCONNECTED|Failed to fetch|NetworkError|network error|ERR_CONNECTION_REFUSED/i.test(error)
));
const failedChecks = Object.entries(result).filter(([, passed]) => !passed).map(([name]) => name);
if (failedChecks.length > 0 || fatalErrors.length > 0) {
  console.error('Offline contract FAILED:');
  failedChecks.forEach((name) => console.error(`- brak dowodu: ${name}`));
  fatalErrors.forEach((error) => console.error(`- error: ${error}`));
  process.exit(1);
}

console.log('Offline contract passed: cached active profile+plan, cold Dashboard CTA, cold lazy route and local draft write.');
