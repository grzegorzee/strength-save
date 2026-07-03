import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const assetsDir = join(process.cwd(), 'dist', 'assets');
// Z54: limit per chunk zszedł z 800 KB na 600 KB (po splicie firebase największy
// chunk to index ~570 KB); dodatkowo limit sumy initial JS (index + firebase-core
// + react-vendor — chunki ładowane przy zimnym starcie).
const maxBytes = 600 * 1024;
const maxInitialBytes = 1200 * 1024;
const initialChunkPrefixes = ['index-', 'firebase-core-', 'react-vendor-'];

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
