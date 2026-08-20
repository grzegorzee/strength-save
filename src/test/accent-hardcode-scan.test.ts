import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// T24d (feedback 2026-08-20): guard na hardcode'owana limonke w zrodlach.
// Po audycie akcentu (paleta 11) limonka to TYLKO domyslny akcent z accent-theme;
// kazde nowe uzycie na sztywno (hex, klasa lime-*, surowy triplet HSL) ma byc
// czerwonym testem zamiast zgloszenia od usera. Wzorzec: i18n-hardcoded-scan.

const SKIPPED_DIRS = new Set(['src/test']);

// Pliki, w ktorych limonkowy hex jest POPRAWNY (definicje palety / fallbacki marki).
const HEX_ALLOWLIST = new Set([
  'src/lib/accent-theme.ts', // definicja palety 11 (jedyne zrodlo prawdy)
  'src/pages/Profile.tsx',   // wartosc inputa color pickera dla domyslnego akcentu
  'src/lib/share-utils.ts',  // fallback marki dla accentHex (hex idzie z getCurrentAccent)
]);

// Pliki, w ktorych surowy triplet HSL limonki jest POPRAWNY (tokeny domyslne).
const TRIPLET_ALLOWLIST = new Set([
  'src/index.css',           // domyslne tokeny --primary/--ring/--sidebar (lime default)
  'src/lib/accent-theme.ts', // definicja palety 11
]);

const LIME_HEX = /#(?:cefc22|f4ffc9)/i;
const LIME_CLASS = /\b(?:bg|text|border|ring)-lime-\d/;
const LIME_TRIPLET = /73 97% 56%/;

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// Komentarze nie sa kodem (jak w i18n-hardcoded-scan).
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/(^|[^:'"`\\])\/\/[^'"`]*$/gm, '$1');

const offendersIn = (files: string[], pattern: RegExp) =>
  files.flatMap((p) => {
    const lines = stripComments(readFileSync(p, 'utf8')).split('\n');
    return lines.flatMap((l, i) => (pattern.test(l) ? [`${p}:${i + 1} ${l.trim()}`] : []));
  });

describe('guard akcentu: zero hardcode-owanej limonki w zrodlach (T24d)', () => {
  const files = walk('src')
    .filter((p) => /\.(tsx?|css)$/.test(p))
    .filter((p) => ![...SKIPPED_DIRS].some((dir) => p.startsWith(`${dir}/`)));

  it('hex limonki (#cefc22/#f4ffc9) tylko w plikach z allowlisty', () => {
    expect(offendersIn(files.filter((p) => !HEX_ALLOWLIST.has(p)), LIME_HEX)).toEqual([]);
  });

  it('zero klas tailwind lime-* (bg/text/border/ring)', () => {
    expect(offendersIn(files, LIME_CLASS)).toEqual([]);
  });

  it('surowy triplet HSL limonki (73 97% 56%) tylko w tokenach i palecie', () => {
    expect(offendersIn(files.filter((p) => !TRIPLET_ALLOWLIST.has(p)), LIME_TRIPLET)).toEqual([]);
  });

  it('allowlisty nie zawieraja martwych wpisow (plik musi istniec)', () => {
    const existing = new Set(walk('src'));
    const dead = [...HEX_ALLOWLIST, ...TRIPLET_ALLOWLIST].filter((p) => !existing.has(p));
    expect(dead).toEqual([]);
  });
});
