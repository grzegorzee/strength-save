import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const assetsDir = join(process.cwd(), 'dist', 'assets');
const maxBytes = 800 * 1024;
const oversized = readdirSync(assetsDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => ({ name, bytes: statSync(join(assetsDir, name)).size }))
  .filter((asset) => asset.bytes > maxBytes);

if (oversized.length > 0) {
  console.error(`Bundle budget exceeded (${maxBytes} bytes per JavaScript chunk):`);
  oversized.forEach((asset) => console.error(`- ${asset.name}: ${asset.bytes} bytes`));
  process.exit(1);
}

console.log(`Bundle budget passed: no JavaScript chunk exceeds ${maxBytes} bytes.`);
