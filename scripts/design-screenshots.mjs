#!/usr/bin/env node
// design-screenshots.mjs — harness weryfikacji designu (fala 2, 2026-08-20).
//
// Startuje dev server w trybie e2e-mock (VITE_E2E_MODE=true, jak playwright.config.ts),
// seeduje realistyczny stan (aktywny plan w trakcie tygodnia + historia + cykl),
// robi screenshoty zadanych tras w viewport 390x844 w 3 akcentach
// (limonka default / amber / sky) i zapisuje PNG do katalogu wyjściowego.
//
// Użycie:
//   node scripts/design-screenshots.mjs
//   node scripts/design-screenshots.mjs --routes=/,/plan,/history,/profile,/workout/day-1
//   node scripts/design-screenshots.mjs --routes=/history --accents=lime,amber,sky,indigo \
//     --out=docs/design-2026-08-20/screens/moja-iteracja
//
// Wyjście: <out>/<trasa>--<akcent>.png (default out: docs/design-2026-08-20/screens/<timestamp>).
// Exit 0 przy sukcesie; serwer spawnowany przez skrypt jest ubijany na końcu.
// Lekcja CLAUDE.md #9: przy zwisie/timeouts najpierw `pkill -f vite` + usuń node_modules/.vite.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, openSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8080;
const BASE_URL = `http://localhost:${PORT}/`;

// ---------- argumenty ----------
const argValue = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const routes = argValue('routes', '/,/plan,/history,/profile')
  .split(',').map((r) => r.trim()).filter(Boolean)
  .map((r) => (r.startsWith('/') ? r : `/${r}`));

const accents = argValue('accents', 'lime,amber,sky')
  .split(',').map((a) => a.trim()).filter(Boolean);

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outDir = resolve(ROOT, argValue('out', join('docs', 'design-2026-08-20', 'screens', timestamp)));
mkdirSync(outDir, { recursive: true });

// ---------- seedy localStorage (przed startem apki, jak e2e/helpers.ts) ----------
const localDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Tray zaległości zasłaniałby Dashboard (ten sam seed co playwright.config.ts).
const lapseDismissedSeed = (() => {
  const keys = [];
  for (let back = 0; back <= 21; back += 1) {
    const iso = localDate(back);
    keys.push(iso, `week:${iso}`);
  }
  return JSON.stringify(keys);
})();

// Aktywny plan w trakcie tygodnia: start 4 tygodnie i 2 dni temu (środek tygodnia 5 z 12).
// Bez pola `days` -> zostaje domyślny plan mockowy trybu e2e (day-1..).
const planMeta = JSON.stringify({ startDate: localDate(30), durationWeeks: 12 });

const session = (id, daysAgo, dayId, dayName, exercises, durationSec) => ({
  id,
  userId: 'e2e-test-user',
  dayId,
  dayName,
  dayFocus: '',
  date: localDate(daysAgo),
  completed: true,
  durationSec,
  exercises,
  // Realny zapis apki podpina sesję pod aktywny cykl — bez tego staty cyklu
  // w Historii (computeCycleStats) liczyłyby 0 mimo widocznych sesji.
  cycleId: 'cycle-shot-1',
});
const ex = (exerciseId, name, weights) => ({
  exerciseId,
  name,
  sets: weights.map((weight) => ({ reps: 8, weight, completed: true })),
});

// Historia: bieżący tydzień + poprzednie (progresja ciężarów => realny wygląd, PR-y).
// Daty WYRÓWNANE do dni tygodnia planu (pon/śr) — inaczej frekwencja cyklu
// (computeCycleStats liczy sloty {data}:{dayId}) zawsze wychodziłaby 0%.
const dowNow = new Date().getDay();
const monAgo = (dowNow + 6) % 7; // ostatni poniedziałek (0 = dziś)
const wedAgo = (dowNow + 4) % 7; // ostatnia środa
const workoutsSeed = JSON.stringify([
  session('shot-w1', monAgo, 'day-1', 'Poniedziałek — Góra', [
    ex('ex-1-1', 'Wyciskanie sztangi na ławce płaskiej', [62.5, 62.5, 62.5]),
    ex('ex-1-2', 'Wiosłowanie hantlami na ławce (przodem)', [30, 30, 30]),
  ], 3540),
  session('shot-w2', wedAgo, 'day-2', 'Środa — Dół', [
    ex('ex-2-1', 'Przysiad ze sztangą', [90, 90, 90]),
    ex('ex-2-2', 'Martwy ciąg rumuński', [80, 80, 80]),
  ], 3660),
  session('shot-w3', monAgo + 7, 'day-1', 'Poniedziałek — Góra', [
    ex('ex-1-1', 'Wyciskanie sztangi na ławce płaskiej', [60, 60, 60]),
    ex('ex-1-2', 'Wiosłowanie hantlami na ławce (przodem)', [28, 28, 28]),
  ], 3480),
  session('shot-w4', wedAgo + 7, 'day-2', 'Środa — Dół', [
    ex('ex-2-1', 'Przysiad ze sztangą', [85, 85, 85]),
    ex('ex-2-2', 'Martwy ciąg rumuński', [77.5, 77.5, 77.5]),
  ], 3720),
  session('shot-w5', monAgo + 14, 'day-1', 'Poniedziałek — Góra', [
    ex('ex-1-1', 'Wyciskanie sztangi na ławce płaskiej', [57.5, 57.5, 57.5]),
  ], 3300),
  // Zakończony mini-cykl sprzed aktywnego (karta przeszłego cyklu w Historii).
  { ...session('shot-p1', monAgo + 56, 'day-1', 'Poniedziałek — Góra', [
    ex('ex-1-1', 'Wyciskanie sztangi na ławce płaskiej', [55, 55, 55]),
  ], 3240), cycleId: 'cycle-shot-0' },
  { ...session('shot-p2', monAgo + 54, 'day-2', 'Środa — Dół', [
    ex('ex-2-1', 'Przysiad ze sztangą', [80, 80, 80]),
  ], 3300), cycleId: 'cycle-shot-0' },
  { ...session('shot-p3', monAgo + 49, 'day-1', 'Poniedziałek — Góra', [
    ex('ex-1-1', 'Wyciskanie sztangi na ławce płaskiej', [52.5, 52.5, 52.5]),
  ], 3180), cycleId: 'cycle-shot-0' },
  { ...session('shot-p4', monAgo + 47, 'day-2', 'Środa — Dół', [
    ex('ex-2-1', 'Przysiad ze sztangą', [77.5, 77.5, 77.5]),
  ], 3360), cycleId: 'cycle-shot-0' },
]);

// Aktywny cykl spójny z planem (usePlanCycles czyta fittracker_e2e_cycles).
const cyclesSeed = JSON.stringify([{
  id: 'cycle-shot-1',
  userId: 'e2e-test-user',
  // Dni cyklu = oczekiwane sloty frekwencji (bez nich completionRate zawsze 0%).
  days: [
    { id: 'day-1', dayName: 'Poniedziałek — Góra', weekday: 'monday', focus: '', exercises: [] },
    { id: 'day-2', dayName: 'Środa — Dół', weekday: 'wednesday', focus: '', exercises: [] },
  ],
  durationWeeks: 12,
  startDate: localDate(30),
  endDate: localDate(30 - 12 * 7),
  status: 'active',
  createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  stats: { totalWorkouts: 5, totalTonnage: 0, prs: [], completionRate: 0 },
}, {
  id: 'cycle-shot-0',
  userId: 'e2e-test-user',
  days: [
    { id: 'day-1', dayName: 'Poniedziałek — Góra', weekday: 'monday', focus: '', exercises: [] },
    { id: 'day-2', dayName: 'Środa — Dół', weekday: 'wednesday', focus: '', exercises: [] },
  ],
  durationWeeks: 3,
  startDate: localDate(monAgo + 56),
  endDate: localDate(monAgo + 56 - 20),
  status: 'completed',
  createdAt: new Date(Date.now() - (monAgo + 56) * 86400000).toISOString(),
  stats: { totalWorkouts: 4, totalTonnage: 0, prs: [], completionRate: 67 },
}]);

// ---------- dev server ----------
const isServerUp = async () => {
  try {
    const res = await fetch(BASE_URL, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
};

let devServer = null;
const startServer = async () => {
  if (await isServerUp()) {
    console.log(`[harness] Reużywam działający serwer na ${BASE_URL} (upewnij się, że ma VITE_E2E_MODE=true i nie jest zwietrzały).`);
    return;
  }
  const logPath = join(outDir, 'dev-server.log');
  const logFd = openSync(logPath, 'a');
  console.log(`[harness] Startuję dev server (VITE_E2E_MODE=true), log: ${logPath}`);
  devServer = spawn('npm', ['run', 'dev'], {
    cwd: ROOT,
    env: { ...process.env, VITE_E2E_MODE: 'true' },
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (await isServerUp()) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Dev server nie wstał w 90 s. Lekcja CLAUDE.md #9: pkill -f vite && rm -rf node_modules/.vite, potem spróbuj ponownie.');
};

const stopServer = () => {
  if (!devServer) return;
  try {
    process.kill(-devServer.pid, 'SIGTERM');
    setTimeout(() => { try { process.kill(-devServer.pid, 'SIGKILL'); } catch { /* już nie żyje */ } }, 2000).unref();
  } catch { /* już nie żyje */ }
};

// ---------- screenshoty ----------
const routeSlug = (route) => (route === '/' ? 'home' : route.replace(/^\//, '').replace(/[/?=&]/g, '_'));

const run = async () => {
  await startServer();
  const browser = await chromium.launch();
  try {
    for (const accent of accents) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        locale: 'pl-PL',
      });
      // Bez backendu — jak blockFirebase w e2e/helpers.ts.
      for (const pattern of [
        '**/firestore.googleapis.com/**',
        '**/identitytoolkit.googleapis.com/**',
        '**/securetoken.googleapis.com/**',
        '**/googleapis.com/identitytoolkit/**',
      ]) {
        await context.route(pattern, (r) => r.abort());
      }
      // Seedy PRZED startem apki (akcent czytany przy boot z ss-accent-color).
      await context.addInitScript(({ accentId, lapse, plan, workouts, cycles }) => {
        localStorage.setItem('ss-accent-color', accentId);
        localStorage.setItem('fittracker_lapse_dismissed_v1', lapse);
        localStorage.setItem('fittracker_e2e_plan', plan);
        localStorage.setItem('fittracker_e2e_workouts', workouts);
        localStorage.setItem('fittracker_e2e_cycles', cycles);
      }, { accentId: accent, lapse: lapseDismissedSeed, plan: planMeta, workouts: workoutsSeed, cycles: cyclesSeed });

      const page = await context.newPage();
      for (const route of routes) {
        const url = `${BASE_URL}#${route}`;
        await page.goto(url);
        await page.waitForLoadState('domcontentloaded');
        await page.locator('#root > *').first().waitFor({ state: 'attached', timeout: 15000 });
        await page.evaluate(() => document.fonts?.ready);
        await page.waitForTimeout(900); // animacje wejścia + lazy chunki
        const file = join(outDir, `${routeSlug(route)}--${accent}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`[harness] ${accent} ${route} -> ${file}`);
      }
      await context.close();
    }
  } finally {
    await browser.close();
    stopServer();
  }
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ timestamp, routes, accents, baseUrl: BASE_URL }, null, 2));
  console.log(`[harness] Gotowe: ${outDir}`);
};

process.on('SIGINT', () => { stopServer(); process.exit(130); });

run().catch((err) => {
  console.error('[harness] Błąd:', err.message);
  stopServer();
  process.exit(1);
});
