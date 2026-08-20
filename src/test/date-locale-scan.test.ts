import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// T18-3: guard regresyjny i18n dat (feedback 2026-08-20: "20 sie 2026" na ekranie EN).
// Dwie reguły:
// (A) każde .toLocaleDateString / .toLocaleTimeString / .toLocaleString w src/
//     musi dostać locale z dateLocale(lang) albo z parametru `locale` (helpery,
//     do których caller przekazuje locale) — inaczej format idzie za SYSTEMEM,
//     nie za językiem apki.
// (B) goły <input type="date"> renderuje wartość w formacie systemu
//     (iOS/WKWebView ignoruje atrybut lang), więc natywny input daty wolno
//     renderować wyłącznie przez wrapper LocalizedDateInput.

const SKIPPED_DIRS = new Set(['src/test']);

// Reguła A: pliki z celowo stałym locale. Każdy wpis z uzasadnieniem.
const LOCALE_ALLOWLIST = new Set([
  'src/components/ui/chart.tsx', // Z178: tooltip liczbowy celowo zawsze 'en-US', niezależnie od urządzenia
]);

// Reguła B: jedyne pliki, którym wolno renderować natywny <input type="date">.
const DATE_INPUT_ALLOWLIST = new Set([
  'src/components/LocalizedDateInput.tsx', // wrapper — jedyny właściciel natywnego inputa (T18-1)
  'src/components/PlanWizard.tsx', // do zdjęcia przy T2 (przebudowa kroku daty startu onboardingu)
]);

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

// Komentarze nie są kodem — wycinamy je, ale ZACHOWUJEMY liczbę linii,
// żeby raportowane numery linii zgadzały się z plikiem źródłowym.
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ''))
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/(^|[^:'"`\\])\/\/[^'"`]*$/gm, '$1');

const sourceFiles = () =>
  walk('src')
    .filter((p) => /\.tsx?$/.test(p))
    .filter((p) => ![...SKIPPED_DIRS].some((dir) => p.startsWith(`${dir}/`)));

const lineOf = (src: string, index: number) => src.slice(0, index).split('\n').length;

describe('guard i18n dat: locale zawsze z dateLocale(lang), daty przez LocalizedDateInput (T18)', () => {
  it('reguła A: toLocale*String bez dateLocale(lang) ani parametru locale = błąd', () => {
    const files = sourceFiles().filter((p) => !LOCALE_ALLOWLIST.has(p));
    // Celowo (Date|Time)?String — NIE łapie toLocaleLowerCase/UpperCase.
    const call = /\.toLocale(?:Date|Time)?String\(\s*/g;

    const offenders = files.flatMap((p) => {
      const src = stripComments(readFileSync(p, 'utf8'));
      const found: string[] = [];
      for (let m = call.exec(src); m !== null; m = call.exec(src)) {
        const rest = src.slice(m.index + m[0].length);
        // OK: dateLocale(lang) albo identyfikator `locale` (parametr helpera).
        if (/^(dateLocale\(|locale\b)/.test(rest)) continue;
        found.push(`${p}:${lineOf(src, m.index)}`);
      }
      return found;
    });

    expect(offenders).toEqual([]);
  });

  it('reguła B: natywny <input type="date"> tylko w LocalizedDateInput (+ allowlista)', () => {
    const files = sourceFiles().filter((p) => !DATE_INPUT_ALLOWLIST.has(p));
    const literal = /type="date"/g;

    const offenders = files.flatMap((p) => {
      const src = stripComments(readFileSync(p, 'utf8'));
      const found: string[] = [];
      for (let m = literal.exec(src); m !== null; m = literal.exec(src)) {
        found.push(`${p}:${lineOf(src, m.index)}`);
      }
      return found;
    });

    expect(offenders).toEqual([]);
  });

  it('allowlisty nie zawierają martwych wpisów (plik musi istnieć)', () => {
    const existing = new Set(walk('src'));
    const dead = [...LOCALE_ALLOWLIST, ...DATE_INPUT_ALLOWLIST].filter((p) => !existing.has(p));
    expect(dead).toEqual([]);
  });
});
