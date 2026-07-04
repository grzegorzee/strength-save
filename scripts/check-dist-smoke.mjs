// Smoke test zbudowanego dist: serwuje pliki statycznie, otwiera w Chromium
// i sprawdza, że apka faktycznie startuje (#root niepusty, zero błędów JS).
// Powstał po incydencie Z85: cykliczne chunki firebase dawały TDZ ReferenceError
// na starcie i biały ekran na iOS (TestFlight build 50) oraz prod web —
// wszystkie testy i typecheck były zielone, bo błąd istniał tylko w produkcyjnym bundlu.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';

const distDir = join(process.cwd(), 'dist');
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
};

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(distDir, safePath === '/' ? 'index.html' : safePath);
  try {
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime[extname(filePath)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    // SPA fallback na index.html (jak serwer produkcyjny)
    const body = await readFile(join(distDir, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(body);
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

const browser = await chromium.launch();
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.stack || error.message));

let rootRendered = false;
try {
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForFunction(
    () => (document.getElementById('root')?.children.length ?? 0) > 0,
    undefined,
    { timeout: 15_000 },
  );
  rootRendered = true;
} catch {
  // rootRendered zostaje false — raport niżej
}

await browser.close();
server.close();

if (!rootRendered || pageErrors.length > 0) {
  console.error('Dist smoke test FAILED:');
  if (!rootRendered) console.error('- #root pusty po 15 s (biały ekran)');
  pageErrors.forEach((error) => console.error(`- pageerror: ${error}`));
  process.exit(1);
}

console.log('Dist smoke test passed: #root wyrenderowany, zero błędów JS na starcie.');
