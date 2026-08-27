#!/usr/bin/env node
// Deterministyczny harness screenshotow do review Strava.
//
// Renderuje PRAWDZIWE komponenty produkcyjne, ale zastępuje hooki danych
// anonimowym fixture w wirtualnych modulach Vite. Nie uruchamia Firebase,
// nie loguje użytkownika i nie czyta/zapisuje danych produkcyjnych.
//
// Użycie:
//   node scripts/strava-review-screenshots.mjs

// Wyjście (viewport 390x844, DPR 1):
//   docs/strava-review-2026-08-27/screenshots/*.png

// Skrypt celowo nie jest częścią aplikacji runtime ani standardowej suite E2E.

import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react-swc';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = resolve(ROOT, 'docs/strava-review-2026-08-27/screenshots');
const PORT = 4179;
const BASE_URL = `http://127.0.0.1:${PORT}`;

mkdirSync(OUTPUT_DIR, { recursive: true });

const fixture = {
  id: 'review-activity-1',
  userId: 'strava-review-user',
  stravaId: 12345678901,
  name: 'Poranny bieg regeneracyjny',
  type: 'Run',
  sportType: 'Run',
  date: '2026-08-24',
  startDateLocal: '2026-08-24T07:15:00+02:00',
  distance: 8240,
  movingTime: 2732,
  elapsedTime: 2810,
  averageHeartrate: 146,
  maxHeartrate: 169,
  totalElevationGain: 74,
  averageSpeed: 3.016,
  averageCadence: 168,
  calories: 526,
  kudosCount: 12,
  trainer: false,
  stravaUrl: 'https://www.strava.com/activities/12345678901',
  syncedAt: '2026-08-27T08:00:00.000Z',
};

const virtualEntry = `
  import React from 'react';
  import { createRoot } from 'react-dom/client';
  import { Watch } from 'lucide-react';
  import { LanguageProvider } from '@/contexts/LanguageContext';
  import { ProfileAccordionSection } from '@/components/profile/ProfileAccordionSection';
  import { StravaConnectionCard } from '@/components/StravaConnectionCard';
  import { StravaTab } from '@/components/strava/StravaTab';
  import { StravaActivityCard } from '@/components/StravaActivityCard';
  import { StravaActivityDetail } from '@/components/StravaActivityDetail';
  import '/src/fonts.css';
  import '/src/index.css';

  const activity = ${JSON.stringify(fixture)};
  const screen = new URLSearchParams(window.location.search).get('screen') || 'profile';
  document.documentElement.classList.add('dark');
  document.documentElement.lang = 'pl';
  document.body.style.margin = '0';

  const Shell = ({ eyebrow, title, children }) => (
    <main className="min-h-screen bg-background px-4 pb-8 pt-6 text-foreground">
      <header className="mb-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        <h1 className="mt-1 font-heading text-3xl font-bold tracking-tight">{title}</h1>
      </header>
      {children}
    </main>
  );

  const ProfileScreen = () => (
    <Shell eyebrow="Strength Save" title="Profil">
      <ProfileAccordionSection
        id="devices"
        icon={Watch}
        label="Urządzenia i połączenia"
        open={true}
        onOpenChange={() => undefined}
      >
        <StravaConnectionCard />
      </ProfileAccordionSection>
    </Shell>
  );

  const DataScreen = () => (
    <Shell eyebrow="Analiza" title="Strava">
      <StravaTab />
    </Shell>
  );

  const DetailScreen = () => (
    <Shell eyebrow="Aktywności" title="Strava">
      <StravaActivityCard activity={activity} maxHR={190} />
      <StravaActivityDetail activity={activity} open={true} onOpenChange={() => undefined} />
    </Shell>
  );

  const App = () => (
    <LanguageProvider>
      {screen === 'profile' ? <ProfileScreen /> : screen === 'data' ? <DataScreen /> : <DetailScreen />}
    </LanguageProvider>
  );

  createRoot(document.getElementById('root')).render(<App />);
`;

const virtualStravaHook = `
  const activity = ${JSON.stringify(fixture)};
  export const useStrava = () => {
    const screen = new URLSearchParams(window.location.search).get('screen');
    const connected = screen !== 'profile';
    return {
      activities: connected ? [activity] : [],
      isLoaded: true,
      connection: connected ? {
        connected: true,
        athleteId: 424242,
        athleteName: 'Sportowiec testowy',
        lastSync: '2026-08-27T08:00:00.000Z',
        estimatedMaxHR: 190,
        maxHRManualOverride: true,
      } : { connected: false },
      isSyncing: false,
      error: null,
      connectStrava: async () => undefined,
      syncActivities: async () => ({ ok: true, synced: 0, totalFetched: 1, alreadyExisted: 1, lookbackDays: 30 }),
      saveMaxHR: async (estimatedMaxHR) => ({ ok: true, estimatedMaxHR }),
      disconnectStrava: async () => undefined,
      nextSyncAvailableAt: null,
    };
  };
`;

const virtualUserContext = `
  export const useCurrentUser = () => ({
    uid: 'strava-review-user',
    profile: null,
    isAdmin: false,
    hasAppAccess: true,
    needsEmailVerification: false,
    isSuspended: false,
    canUseStrava: true,
    canUseBodyPhotos: false,
    isNewUser: false,
    profileLoaded: true,
    profileLoadError: null,
    profileSyncBlockReason: null,
    profileSyncPending: false,
    retryProfileSync: async () => undefined,
    mergeConfirmedConsentMirror: () => undefined,
  });
`;

const virtualManualActivities = `
  export const useManualActivities = () => ({
    activities: [], isLoaded: true, error: null,
    addActivity: async () => undefined,
    updateActivity: async () => undefined,
    deleteActivity: async () => undefined,
  });
`;

const virtualWorkouts = `
  export const useFirebaseWorkouts = () => ({
    workouts: [], measurements: [], isLoaded: true,
    measurementError: null, retryMeasurements: () => undefined,
  });
`;

const modules = new Map([
  ['virtual:strava-review-entry.tsx', virtualEntry],
  ['virtual:strava-review-use-strava.ts', virtualStravaHook],
  ['virtual:strava-review-user-context.ts', virtualUserContext],
  ['virtual:strava-review-manual.ts', virtualManualActivities],
  ['virtual:strava-review-workouts.ts', virtualWorkouts],
]);

const mockIds = new Map([
  ['@/hooks/useStrava', 'virtual:strava-review-use-strava.ts'],
  ['@/contexts/UserContext', 'virtual:strava-review-user-context.ts'],
  ['@/hooks/useManualActivities', 'virtual:strava-review-manual.ts'],
  ['@/hooks/useFirebaseWorkouts', 'virtual:strava-review-workouts.ts'],
]);

const resolvedMockIds = [
  ['/src/hooks/useStrava.ts', 'virtual:strava-review-use-strava.ts'],
  ['/src/contexts/UserContext.tsx', 'virtual:strava-review-user-context.ts'],
  ['/src/hooks/useManualActivities.ts', 'virtual:strava-review-manual.ts'],
  ['/src/hooks/useFirebaseWorkouts.ts', 'virtual:strava-review-workouts.ts'],
];

const virtualPlugin = {
  name: 'strava-review-fixtures',
  enforce: 'pre',
  resolveId(source) {
    const mapped = mockIds.get(source)
      ?? resolvedMockIds.find(([suffix]) => source.endsWith(suffix))?.[1]
      ?? (modules.has(source) ? source : null);
    return mapped ? `\0${mapped}` : null;
  },
  load(id) {
    return id.startsWith('\0') ? modules.get(id.slice(1)) ?? null : null;
  },
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (!request.url?.startsWith('/__strava-review__/')) return next();
      const html = `<!doctype html>
        <html class="dark">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
            <title>Strength Save — Strava review</title>
          </head>
          <body><div id="root"></div><script type="module" src="/@id/virtual:strava-review-entry.tsx"></script></body>
        </html>`;
      const transformedHtml = await server.transformIndexHtml(request.url, html);
      response.statusCode = 200;
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(transformedHtml);
    });
  },
};

let server;
let browser;

try {
  server = await createServer({
    configFile: false,
    root: ROOT,
    appType: 'custom',
    plugins: [virtualPlugin, react()],
    resolve: {
      alias: [
        { find: '@/hooks/useStrava', replacement: 'virtual:strava-review-use-strava.ts' },
        { find: '@/contexts/UserContext', replacement: 'virtual:strava-review-user-context.ts' },
        { find: '@/hooks/useManualActivities', replacement: 'virtual:strava-review-manual.ts' },
        { find: '@/hooks/useFirebaseWorkouts', replacement: 'virtual:strava-review-workouts.ts' },
        { find: '@', replacement: resolve(ROOT, 'src') },
      ],
    },
    optimizeDeps: {
      noDiscovery: true,
      include: ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-dom', 'react-dom/client', 'recharts'],
    },
    server: { host: '127.0.0.1', port: PORT, strictPort: true },
  });
  await server.listen();

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => console.error(`[browser] ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') console.error(`[browser] ${message.text()}`);
  });
  page.on('requestfailed', (request) => console.error(`[request] ${request.url()} — ${request.failure()?.errorText ?? 'failed'}`));
  await page.clock.install({ time: new Date('2026-08-27T12:00:00+02:00') });
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });

  const capture = async (screen, file, readyText) => {
    await page.goto(`${BASE_URL}/__strava-review__/?screen=${screen}`, { waitUntil: 'networkidle' });
    await page.getByText(readyText, { exact: false }).first().waitFor({ state: 'visible' });
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
    await page.screenshot({ path: resolve(OUTPUT_DIR, file), fullPage: false });
  };

  await capture('profile', '01-profile-connect.png', 'Urządzenia i połączenia');
  await capture('data', '02-strava-data.png', 'Sportowiec testowy');
  await capture('detail', '03-activity-detail.png', 'View on Strava');

  await context.close();
  console.log(`Strava review screenshots saved in ${OUTPUT_DIR}`);
} finally {
  if (browser) await browser.close();
  if (server) await server.close();
}
