import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Z165: panel admina w 100% przez t(). Ten guard zostaje na stałe — każdy nowy
// polski literał w panelu admina wywala test zamiast lądować na ekranie EN.

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('panel admina: zero hardcodowanych polskich stringów', () => {
  it('src/pages/admin + src/components/admin bez polskich znaków poza komentarzami', () => {
    const files = [...walk('src/pages/admin'), ...walk('src/components/admin')].filter((p) => /\.tsx?$/.test(p));
    const offenders = files.flatMap((p) => {
      const lines = stripComments(readFileSync(p, 'utf8')).split('\n');
      return lines.flatMap((l, i) => (/[ąćęłńóśźż]/i.test(l) ? [`${p}:${i + 1} ${l.trim()}`] : []));
    });
    expect(offenders).toEqual([]);
  });
});
