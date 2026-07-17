// M19: smoke test OFFLINE zbudowanego dist WEBOWEGO (service worker + precache).
// Scenariusz usera: wszedł raz online, potem otwiera apkę w piwnicy siłowni bez
// zasięgu — apka MUSI wystartować z SW cache (#root niepusty).
// Wymaga builda WEB (npm run build): SW jest wyłączony w build:mobile (Capacitor
// trzyma pliki lokalnie i startuje offline z natury).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';

const distDir = join(process.cwd(), 'dist');
const BASE = '/strength-save/';
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

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const origin = `http://127.0.0.1:${port}${BASE}`;

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));

let onlineRendered = false;
let swActive = false;
let offlineRendered = false;

try {
  // 1. Wejście online: rejestracja SW + precache.
  await page.goto(origin, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForFunction(
    () => (document.getElementById('root')?.children.length ?? 0) > 0,
    undefined,
    { timeout: 15_000 },
  );
  onlineRendered = true;

  swActive = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    return registration.active !== null;
  });

  // Daj workboxowi chwilę na dociągnięcie pełnego precache manifestu.
  await page.waitForTimeout(2_000);

  // 2. Zimny start OFFLINE: nowa karta bez sieci, tylko SW cache.
  await context.setOffline(true);
  const offlinePage = await context.newPage();
  offlinePage.on('pageerror', (error) => pageErrors.push(error.stack || error.message));
  await offlinePage.goto(origin, { waitUntil: 'load', timeout: 30_000 });
  await offlinePage.waitForFunction(
    () => (document.getElementById('root')?.children.length ?? 0) > 0,
    undefined,
    { timeout: 15_000 },
  );
  offlineRendered = true;
} catch {
  // Raport niżej.
}

await browser.close();
server.close();

const fatalErrors = pageErrors.filter((error) => !/ERR_INTERNET_DISCONNECTED|Failed to fetch|NetworkError|network error/i.test(error));

if (!onlineRendered || !swActive || !offlineRendered || fatalErrors.length > 0) {
  console.error('Offline smoke test FAILED:');
  if (!onlineRendered) console.error('- pierwszy load online nie wyrenderował #root');
  if (!swActive) console.error('- service worker nieaktywny po load (registerType/disable?)');
  if (!offlineRendered) console.error('- zimny start OFFLINE nie wyrenderował #root (precache niepełny?)');
  fatalErrors.forEach((error) => console.error(`- pageerror: ${error}`));
  process.exit(1);
}

console.log('Offline smoke test passed: SW aktywny, zimny start offline renderuje aplikację.');
