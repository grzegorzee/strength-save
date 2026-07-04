import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const assetsDir = join(process.cwd(), 'dist', 'assets');
// Z85: firebase wrócił do JEDNEGO chunka (~720 KB) — split per produkt (Z54)
// tworzył cykl core<->auth i biały ekran na starcie, stąd limit per chunk 800 KB.
// Limit initial: index + firebase + react-vendor. Poprzedni pomiar (1200 KB)
// liczył tylko firebase-core, choć index importował też auth i firestore
// statycznie — realny initial był ~1430 KB już przed Z85.
const maxBytes = 800 * 1024;
const maxInitialBytes = 1500 * 1024;
const initialChunkPrefixes = ['index-', 'firebase-', 'react-vendor-'];

const assets = readdirSync(assetsDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({ name, bytes: statSync(join(assetsDir, name)).size }));

const oversized = assets.filter((asset) => asset.bytes > maxBytes);

if (oversized.length > 0) {
  console.error(`Bundle budget exceeded (${maxBytes} bytes per JavaScript chunk):`);
  oversized.forEach((asset) => console.error(`- ${asset.name}: ${asset.bytes} bytes`));
  process.exit(1);
}

const initialAssets = assets.filter((asset) =>
  initialChunkPrefixes.some((prefix) => asset.name.startsWith(prefix)));
const initialBytes = initialAssets.reduce((sum, asset) => sum + asset.bytes, 0);

if (initialBytes > maxInitialBytes) {
  console.error(`Initial bundle budget exceeded (${maxInitialBytes} bytes total for ${initialChunkPrefixes.join(', ')}):`);
  initialAssets.forEach((asset) => console.error(`- ${asset.name}: ${asset.bytes} bytes`));
  console.error(`Total: ${initialBytes} bytes`);
  process.exit(1);
}

console.log(`Bundle budget passed: no chunk over ${maxBytes} bytes; initial JS ${initialBytes} bytes (limit ${maxInitialBytes}).`);
