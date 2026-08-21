import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// Fala 2 (2026-08-20): straznik systemu tokenow redesignu (bliznak accent-hardcode-scan).
// Pilnuje trzech regul fundamentu (docs/design-2026-08-20/plan/tokens.md):
// 1. zakaz color-mix() — WKWebView < 16.2 (iOS 15.x, 16.0-16.1) ODRZUCA cala deklaracje,
//    element zostaje bez tla/obrysu; zamiennik: hsl(var(--primary) / 0.12),
// 2. zakaz hexow mockupu — mockupy wyraza sie tokenami (surface/primary), nie hexami,
// 3. zakaz arbitrary-value utilities z hexem (bg-[#...]) — domyka luke na KAZDY nowy hex,
// plus kontrakt 5 klas pomocniczych w src/index.css (same tokeny, zero hexow).

const SKIPPED_DIRS = new Set(['src/test']);

// Zastane wyjatki dla arbitrary hex utilities (przed fala 2, poza jej zakresem):
const ARBITRARY_HEX_ALLOWLIST = new Set([
  'src/pages/StravaCallback.tsx',              // #FC4C02 = kolor marki Strava (brand guidelines)
  'src/pages/Settings.tsx',                    // #FC4C02 = przycisk "Connect with Strava"
  'src/components/StravaActivityDetail.tsx',   // #FC4C02/#e04400 = branding Strava
]);

const COLOR_MIX = /color-mix\(/;
// Hexy z mockupow dc.html (pomarancz akcentu + tekst-na-akcencie + neutralne powierzchnie/teksty).
const MOCKUP_HEX = /#(?:ff8b3d|141005|171204|0e0e0e|131313|1c1c1c|262626|f2f1ee|dedcd6|9a9892|8d8b85|767469|b9b7b0|b3b1aa|c9c7c1|8a8880|5c5a55|4a4844|3f3d38|3a3833|171717|151515)/i;
const ARBITRARY_HEX_UTILITY = /\b(?:bg|text|border|ring|from|via|to|fill|stroke|shadow|outline|accent|caret|decoration)-\[#/;

const HELPER_CLASSES = ['eyebrow-mono', 'chip-mono', 'accent-ring', 'accent-wash', 'accent-wash-solid'];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// Komentarze nie sa kodem (jak w accent-hardcode-scan) — opisy tokenow typu
// "#0e0e0e The Void" w index.css nie sa naruszeniem.
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

describe('straznik tokenow redesignu: zero color-mix i hexow mockupu w zrodlach (fala 2)', () => {
  const files = walk('src')
    .filter((p) => /\.(tsx?|css)$/.test(p))
    .filter((p) => ![...SKIPPED_DIRS].some((dir) => p.startsWith(`${dir}/`)));

  it('zero color-mix() — WKWebView < 16.2 odrzuca cala deklaracje (tint przez hsl(var(--primary) / a))', () => {
    expect(offendersIn(files, COLOR_MIX)).toEqual([]);
  });

  it('zero hexow mockupu — powierzchnie i tinty wylacznie przez tokeny surface/primary', () => {
    expect(offendersIn(files, MOCKUP_HEX)).toEqual([]);
  });

  it('zero arbitrary hex utilities (bg-[#...]) poza allowlista brandow', () => {
    expect(
      offendersIn(files.filter((p) => !ARBITRARY_HEX_ALLOWLIST.has(p)), ARBITRARY_HEX_UTILITY),
    ).toEqual([]);
  });

  it('kontrakt klas pomocniczych: 5 klas fali 2 w index.css, w blokach same tokeny', () => {
    const css = readFileSync('src/index.css', 'utf8');
    for (const cls of HELPER_CLASSES) {
      const block = css.match(new RegExp(`\\.${cls}\\s*\\{([^}]*)\\}`));
      expect(block, `brak definicji .${cls} w src/index.css`).not.toBeNull();
      const body = stripComments(block![1]);
      expect(COLOR_MIX.test(body), `.${cls} zawiera color-mix`).toBe(false);
      expect(/#[0-9a-f]{3,8}\b/i.test(body), `.${cls} zawiera hex zamiast tokenu`).toBe(false);
    }
  });

  it('allowlista nie zawiera martwych wpisow (plik musi istniec)', () => {
    const existing = new Set(walk('src'));
    const dead = [...ARBITRARY_HEX_ALLOWLIST].filter((p) => !existing.has(p));
    expect(dead).toEqual([]);
  });
});
