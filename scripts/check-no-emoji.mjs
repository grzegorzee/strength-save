// Bramka: zero emoji w chrome UI. Whitelist: treść kopiowana do schowka.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = ['src/components', 'src/pages', 'src/i18n', 'src/lib/share-utils.ts'];
const WHITELIST = new Set(['src/pages/Analytics.tsx']); // copy do schowka = treść, nie chrome
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

const files = [];
const walk = (p) => {
  const st = statSync(p);
  if (st.isDirectory()) return readdirSync(p).forEach((f) => walk(join(p, f)));
  if (/\.(tsx?|ts)$/.test(p) && !/\.test\./.test(p)) files.push(p);
};
ROOTS.forEach(walk);

// Komentarze nie są chrome UI (ten sam wzorzec co guard i18n w src/test/i18n-hardcoded-scan.test.ts).
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/(^|[^:'"`\\])\/\/[^'"`]*$/gm, '$1');

const offenders = [];
for (const f of files) {
  if (WHITELIST.has(f.replaceAll('\\', '/'))) continue;
  stripComments(readFileSync(f, 'utf8')).split('\n').forEach((line, i) => {
    if (EMOJI.test(line)) offenders.push(`${f}:${i + 1}: ${line.trim().slice(0, 80)}`);
  });
}
if (offenders.length) {
  console.error(`Emoji w chrome UI (${offenders.length}):\n` + offenders.join('\n'));
  process.exit(1);
}
console.log(`check:no-emoji OK (${files.length} plików)`);
